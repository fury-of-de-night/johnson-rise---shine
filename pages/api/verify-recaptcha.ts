import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'crypto';
import { isDisposableEmail } from '@/lib/disposable-blocklist';
import { generateSecureCustomerRef } from '@/lib/security';
import { requestSchema } from '@/lib/request-validation';
import { consumeRequestLimit } from '@/lib/rate-limit';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fail = (status: number, code: string, error: string) => res.status(status).json({ code, error });
  const { token, formData: rawForm } = req.body || {};
  if (typeof token !== 'string' || !token || token.length > 8192) {
    return fail(400, 'CAPTCHA_INVALID', 'Please complete reCAPTCHA verification.');
  }
  const parsed = requestSchema.safeParse(rawForm);
  if (!parsed.success) return fail(400, 'VALIDATION_FAILED', 'Please check your contact details, services, date and consent.');
  const formData = parsed.data;
  if (isDisposableEmail(formData.email)) return fail(400, 'VALIDATION_FAILED', 'Disposable email not allowed.');

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!url || !key || !secret) return fail(503, 'CONFIGURATION_ERROR', 'Requests are temporarily unavailable. Please contact us on WhatsApp.');
  let supabaseAdmin;
  try { supabaseAdmin = createClient(url, key); }
  catch { return fail(503, 'CONFIGURATION_ERROR', 'Requests are temporarily unavailable. Please contact us on WhatsApp.'); }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
  const params = new URLSearchParams({
    secret,
    response: token,
  });

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) return fail(503, 'CAPTCHA_UNAVAILABLE', 'Verification is temporarily unavailable. Please try later.');
    const data = await response.json();

    if (!data.success) {
      return fail(400, 'CAPTCHA_INVALID', 'reCAPTCHA verification failed. Please try again.');
    }

    // v3 returns 0.0-1.0 score; reject null/absent/missing/non-number scores explicitly.
    if (data.action !== 'submit' || typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0.5) {
      return fail(400, 'CAPTCHA_INVALID', 'reCAPTCHA verification failed. Please try again.');
    }

    // Vercel overwrites x-vercel-forwarded-for. Never trust arbitrary forwarded headers.
    const ip = process.env.VERCEL === '1'
      ? req.headers['x-vercel-forwarded-for']
      : req.socket?.remoteAddress;
    if (typeof ip !== 'string' || !ip.trim()) return fail(503, 'RATE_LIMIT_UNAVAILABLE', 'Requests are temporarily unavailable.');
    try {
      if (!await consumeRequestLimit(supabaseAdmin, ip.trim())) return fail(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
    } catch {
      console.error('Request limiter unavailable');
      return fail(503, 'RATE_LIMIT_UNAVAILABLE', 'Requests are temporarily unavailable. Please try later.');
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
        return fail(409, 'REFERENCE_CONFLICT', 'Unable to generate a reference. Please try again.');
      }

      console.error('Pending creation failed', { code: rpcError?.code });
      return fail(500, 'REQUEST_SAVE_FAILED', 'We could not save your request. Please contact us on WhatsApp.');
    }

    if (!pendingId || !customerRef) {
      return fail(500, 'REQUEST_SAVE_FAILED', 'We could not save your request. Please contact us on WhatsApp.');
    }

    // The registry is created automatically by the RPC (atomic). Return the reference to the customer.
    return res.status(200).json({ success: true, score: data.score, pendingId, customerRef });
  } catch (error) {
    console.error('Request processing failed');
    return fail(503, 'REQUEST_UNAVAILABLE', 'We could not confirm your request. Please contact us before submitting again.');
  }
}