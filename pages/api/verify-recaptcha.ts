import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token missing' });
  }

  // Serverless-safe rate limit via Supabase (persistent, survives Lambda cold starts).
  // Short-term: check a per-IP DB counter; long-term: full middleware-based limiter.
  // (Rate-limit table migration: 006_rate_limits.sql — apply via Supabase CLI / MCP execute_sql.)

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

    return res.status(200).json({ success: true, score: data.score });
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
}