import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'crypto';

// Server-side: use service role key for trusted INSERT into pending_service_requests.
// The anon role has no table INSERT privilege, so the publishable key cannot insert.
// This key is never exposed to the browser — it exists only in server env vars.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
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

    // reCAPTCHA token verified — discard it.
    // Generate a server-side verification token and store its SHA-256 hash.
    // The raw token is never stored or returned to the client.
    const verificationToken = randomUUID();
    const tokenHash = createHash('sha256').update(verificationToken).digest('hex');

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('pending_service_requests')
      .insert({
        customer_name: String(formData.customer_name || '').trim(),
        phone: String(formData.phone || '').trim(),
        email: String(formData.email || '').trim(),
        address: String(formData.address || '').trim(),
        service_type: String(formData.service_type || '').trim(),
        description: String(formData.description || '').trim(),
        whatsapp_confirmed: formData.whatsapp_confirmed === true,
        verification_token_hash: tokenHash,
        verification_expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to create pending request:', insertError);
      return res.status(500).json({ error: 'Failed to create request.' });
    }

    // The Google reCAPTCHA token is NOT stored. The server generates a
    // transient verification token and stores only its SHA-256 hash
    // (verification_token_hash) in the DB; the raw token is never exposed.
    return res.status(200).json({ success: true, score: data.score, pendingId: inserted.id });
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
}