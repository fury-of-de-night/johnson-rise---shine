import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'crypto';
import { isDisposableEmail } from '@/lib/disposable-blocklist';
import { generateSecureCustomerRef } from '@/lib/security';

// Server-side: use service role key for trusted INSERT into pending_service_requests.
// The anon role has no table INSERT privilege, so the publishable key cannot insert.
// This key is never exposed to the browser — it exists only in server env vars.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, formData } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token missing' });
  }
  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'Form data missing' });
  }

  const xForwarded = req.headers['x-forwarded-for'];
  const ip = (typeof xForwarded === 'string' ? xForwarded.split(',')[0] : req.socket?.remoteAddress) || 'unknown';

  try {
    const now = new Date();
    const { data: rows } = await supabaseAdmin.from('rate_limits').select('*').eq('ip', ip.trim()).gte('reset_at', now.toISOString()).limit(1);
    if (rows && rows.length > 0) {
      const row = rows[0];
      if (row.count >= 5) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
      }
      await supabaseAdmin.from('rate_limits').update({ count: row.count + 1 }).eq('id', row.id);
    } else {
      await supabaseAdmin.from('rate_limits').insert({ ip: ip.trim(), count: 1, reset_at: new Date(Date.now() + 3600000).toISOString() });
    }
  } catch (e) {
    console.error('Rate limit DB error:', e);
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
  const params = new URLSearchParams({
    secret,
    response: token,
  });

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (!data.success) {
      console.warn('reCAPTCHA verification failed', data);
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // v3 returns 0.0-1.0 score; reject null/absent/missing/non-number scores explicitly.
    if (data.score == null || typeof data.score !== 'number' || data.score < 0.5) {
      console.warn('reCAPTCHA score below threshold', data.score);
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // Authoritative server-side disposable email check (before any DB insert)
    const emailRaw = String(formData.email || '').trim();
    if (isDisposableEmail(emailRaw)) {
      console.warn('Disposable email blocked server-side:', emailRaw);
      return res.status(400).json({ error: 'Disposable email not allowed.' });
    }

    // Generate customer reference and perform atomic registry + pending insert
    const verificationToken = randomUUID();
    const tokenHash = createHash('sha256').update(verificationToken).digest('hex');

    // Retry loop: collision (registry PK conflict) must roll back the whole
    // transaction, so generate a new reference and retry up to 5 attempts.
    const MAX_ATTEMPTS = 5;
    let pendingId: string | null = null;
    let customerRef: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      customerRef = generateSecureCustomerRef();

      const { data: rpcPendingId, error: rpcError } = await supabaseAdmin.rpc(
        'create_pending_service_request',
        {
          p_customer_ref: customerRef,
          p_customer_name: String(formData.customer_name || '').trim(),
          p_phone: String(formData.phone || '').trim(),
          p_email: String(formData.email || '').trim(),
          p_address: String(formData.address || '').trim(),
          p_service_type: String(formData.service_type || '').trim(),
          p_description: String(formData.description || '').trim(),
          p_whatsapp_confirmed: formData.whatsapp_confirmed === true,
          p_verification_token_hash: tokenHash,
          p_verification_expires_at: new Date(Date.now() + 3600000).toISOString(),
        }
      );

      if (!rpcError && rpcPendingId) {
        pendingId = rpcPendingId;
        break;
      }

      // Only treat registry-PK collision as retryable; other DB errors fail immediately.
      if (rpcError && rpcError.message.includes('Customer reference collision')) {
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(409).json({ error: 'Unable to generate a unique reference. Please try again.' });
      }

      console.error('Atomic pending creation RPC failed (non-collision):', rpcError);
      return res.status(500).json({ error: 'Failed to create request.' });
    }

    if (!pendingId || !customerRef) {
      return res.status(500).json({ error: 'Failed to create request.' });
    }

    // The registry is created automatically by the RPC (atomic). Return the reference to the customer.
    return res.status(200).json({ success: true, score: data.score, pendingId, customerRef });
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
}