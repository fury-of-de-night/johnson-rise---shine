import type { SupabaseClient } from '@supabase/supabase-js';

// Existing schema only. Conditional updates prevent lost increments on a shared row.
// A database unique constraint/RPC is still needed to serialize first-row creation.
export async function consumeRequestLimit(client: SupabaseClient, ip: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = new Date().toISOString();
    const { data: rows, error } = await client.from('rate_limits').select('id,count').eq('ip', ip).gte('reset_at', now);
    if (error) throw new Error('RATE_LIMIT_UNAVAILABLE');
    const count = (rows || []).reduce((total, row) => total + row.count, 0);
    if (count >= 5) return false;
    if (!rows?.length) {
      const { error: insertError } = await client.from('rate_limits').insert({ ip, count: 1, reset_at: new Date(Date.now() + 3600000).toISOString() });
      if (insertError) throw new Error('RATE_LIMIT_UNAVAILABLE');
      return true;
    }
    // Reject ambiguous duplicate active rows rather than silently weaken protection.
    if (rows.length !== 1) throw new Error('RATE_LIMIT_UNAVAILABLE');
    const row = rows[0];
    const { data: updated, error: updateError } = await client.from('rate_limits')
      .update({ count: row.count + 1 }).eq('id', row.id).eq('count', row.count).select('id');
    if (updateError) throw new Error('RATE_LIMIT_UNAVAILABLE');
    if (updated?.length === 1) return true;
  }
  throw new Error('RATE_LIMIT_UNAVAILABLE');
}
