import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Extract the Supabase Auth access token from Authorization header or cookies
  let accessToken: string | null = null;

  // Try Authorization: Bearer <token> header first
  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    accessToken = bearerMatch[1];
  }

  // Fallback to cookie extraction (sb-<ref>-auth-token) if no Bearer header
  if (!accessToken) {
    const cookieHeader = req.headers.cookie || '';
    const sessionMatch = cookieHeader.match(/sb-[a-z0-9-]+-auth-token=([^;]+)/i);

    if (!sessionMatch) {
      return res.status(401).json({ error: 'Unauthorized: no session found' });
    }

    let cookieAccessToken: string;
    try {
      // Try to decode as JSON array first (Supabase v2 cookie format)
      const decoded = decodeURIComponent(sessionMatch[1]);
      const parsed = JSON.parse(decoded);
      cookieAccessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token || decoded;
    } catch {
      // If not JSON, use the raw value (base64 JWT)
      cookieAccessToken = decodeURIComponent(sessionMatch[1]);
    }

    if (!cookieAccessToken) {
      return res.status(401).json({ error: 'Unauthorized: invalid session' });
    }

    accessToken = cookieAccessToken;
  }

  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized: no session found' });
  }

  // 2. Create a Supabase client scoped to THIS user's session.
  //    Uses the publishable key (anon) but overrides with the user's real access token.
  //    This ensures the RPC runs AS the authenticated user, not as service-role.
  //    The RPC itself checks auth.uid() and private.is_admin().
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  // 3. Verify the user is actually authenticated (don't trust the token blindly)
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
  }

  // 4. Validate the pendingId parameter is a UUID
  const { pendingId } = req.body;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pendingId || typeof pendingId !== 'string' || !uuidRegex.test(pendingId)) {
    return res.status(400).json({ error: 'Invalid pending request ID' });
  }

  // 5. Call the atomic promotion RPC as the authenticated user.
  //    The database function verifies auth.uid() and private.is_admin() internally.
  //    If the user isn't an admin, the RPC will raise an exception.
  try {
    // 1. Authorize: fetch the specific pending request BEFORE promotion.
    // The user-scoped client (supabaseUser) ensures we don't expose
    // references for rows the caller isn't authorized to see/promote.
    const { data: pendingRow, error: lookupErr } = await supabaseUser
      .from('pending_service_requests')
      .select('customer_ref')
      .eq('id', pendingId)
      .maybeSingle();

    if (lookupErr) {
      console.error('Pending lookup error:', lookupErr);
      return res.status(500).json({ error: 'Failed to verify pending request.' });
    }
    if (!pendingRow) {
      return res.status(404).json({ error: 'Pending request not found.' });
    }

    const customerRef = pendingRow.customer_ref || null;

    // 2. Call the atomic promotion RPC (authorization verified inside RPC
    // via auth.uid() + private.is_admin()); do not weaken it.
    const { data: newRequestId, error: rpcErr } = await supabaseUser.rpc(
      'promote_pending_service_request',
      { p_pending_id: pendingId }
    );

    if (rpcErr) {
      // Map specific RPC errors to appropriate HTTP codes
      const msg = rpcErr.message || 'Promotion failed';
      if (msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('admin role required')) {
        return res.status(403).json({ error: 'Forbidden: admin role required' });
      }
      if (msg.includes('not found') || msg.includes('no longer pending')) {
        return res.status(400).json({ error: msg });
      }
      console.error('Promotion RPC error:', rpcErr);
      return res.status(500).json({ error: 'Promotion failed' });
    }

    // 6. Promotion succeeded. Return serviceRequestId and the preserved
    // customer_ref that was read from the pending row before promotion.
    return res.status(200).json({ success: true, serviceRequestId: newRequestId, customerRef });
  } catch (e: any) {
    console.error('Promotion error:', e);
    return res.status(500).json({ error: 'Promotion failed' });
  }
}
