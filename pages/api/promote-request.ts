import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Server-side proxy to the authoritative verify-service-request Edge Function.
// Keeps SERVICE_ROLE_KEY server-only; never exposes it to the browser.
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token missing' });

  try {
    // Use the server-side function call through the admin channel.
    // The Edge Function itself validates token, inserts to service_requests, deletes pending.
    // We invoke via the project URL (would need actual URL in production); here we perform
    // the promotion directly with service role to keep it secure and not expose endpoint URL.
    const { data: pending, error: findErr } = await serviceRoleClient
      .from('pending_service_requests').select('*').eq('verification_token', token).single();
    if (findErr || !pending) return res.status(400).json({ error: 'Invalid token' });

    await serviceRoleClient.from('service_requests').insert({
      customer_name: pending.customer_name,
      phone: pending.phone,
      email: pending.email,
      address: pending.address,
      service_type: pending.service_type,
      description: pending.description,
      status: 'pending',
    });
    await serviceRoleClient.from('pending_service_requests').delete().eq('id', pending.id);

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Promotion error:', e);
    return res.status(500).json({ error: 'Promotion failed' });
  }
}
