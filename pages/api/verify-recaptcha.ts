import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
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
    const { data: rows } = await supabase.from('rate_limits').select('*').eq('ip', ip.trim()).gte('reset_at', now.toISOString()).limit(1);
    if (rows && rows.length > 0) {
      const row = rows[0];
      if (row.count >= 5) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
      }
      await supabase.from('rate_limits').update({ count: row.count + 1 }).eq('id', row.id);
    } else {
      await supabase.from('rate_limits').insert({ ip: ip.trim(), count: 1, reset_at: new Date(Date.now() + 3600000).toISOString() });
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
    // Generate a server-side application verification_token for the pending request.
    // This is NOT the reCAPTCHA token. It is a separate, single-use application token
    // used by verify-service-request to promote the row to service_requests.
    const verificationToken = crypto.randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from('pending_service_requests')
      .insert({
        customer_name: String(formData.customer_name || '').trim(),
        phone: String(formData.phone || '').trim(),
        email: String(formData.email || '').trim(),
        address: String(formData.address || '').trim(),
        service_type: String(formData.service_type || '').trim(),
        description: String(formData.description || '').trim(),
        whatsapp_confirmed: false,
        verification_token: verificationToken,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to create pending request:', insertError);
      return res.status(500).json({ error: 'Failed to create request.' });
    }

    // reCAPTCHA token is NOT stored. verification_token is the application token.
    return res.status(200).json({ success: true, score: data.score, pendingId: inserted.id });
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
}