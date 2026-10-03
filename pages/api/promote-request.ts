import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Extract the Supabase Auth access token from cookies
  const cookieHeader = req.headers.cookie || '';
  // Supabase stores auth as sb-<ref>-auth-token; the value is a JSON-encoded
  // array [access_token, refresh_token] or a base64 blob depending on version.
  const sessionMatch = cookieHeader.match(/sb-[a-z0-9-]+-auth-token=([^;]+)/i);

  if (!sessionMatch) {
    return res.status(401).json({ error: 'Unauthorized: no session found' });
  }

  let accessToken: string;
  try {
    // Try to decode as JSON array first (Supabase v2 cookie format)
    const decoded = decodeURIComponent(sessionMatch[1]);
    const parsed = JSON.parse(decoded);
    accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token || decoded;
  } catch {
    // If not JSON, use the raw value (base64 JWT)
    accessToken = decodeURIComponent(sessionMatch[1]);
  }

  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized: invalid session' });
  }

  // 2. Create a Supabase client scoped to THIS user's session.
  //    Uses the publishable key (anon) but overrides with the user's real access token.
  //    This ensures the RPC runs AS the authenticated user, not as service-role.
  //    The RPC itself checks auth.uid() and private.is_admin().
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

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

    // 6. Return only the new service request ID — no tokens, no customer secrets
    return res.status(200).json({ success: true, serviceRequestId: newRequestId });
  } catch (e: any) {
    console.error('Promotion error:', e);
    return res.status(500).json({ error: 'Promotion failed' });
  }
}
