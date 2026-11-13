import type { SupabaseClient } from '@supabase/supabase-js';

export type RateLimitReason = 'READ_FAILED' | 'INSERT_FAILED' | 'UPDATE_FAILED' | 'DUPLICATE_ACTIVE_ROWS' | 'UPDATE_CONFLICT' | 'INVALID_COUNTER';

export class RateLimitError extends Error {
  constructor(public readonly reason: RateLimitReason, public readonly databaseCode?: string) {
    super('RATE_LIMIT_UNAVAILABLE');
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'RateLimitError';
  }
}

// Never include database messages, details, request headers, keys or IPs in diagnostics.
export function rateLimitDiagnostic(error: unknown) {
  if (!(error instanceof RateLimitError)) return { reason: 'UNEXPECTED_FAILURE' };
  const code = error.databaseCode;
  return {
    reason: error.reason,
    ...(typeof code === 'string' && /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(code) ? { databaseCode: code } : {}),
  };
}

// Existing schema only. Conditional updates prevent lost increments on a shared row.
// A database unique constraint/RPC is still needed to serialize first-row creation.
export async function consumeRequestLimit(client: SupabaseClient, ip: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = new Date().toISOString();
    let result;
    try { result = await client.from('rate_limits').select('id,count').eq('ip', ip).gte('reset_at', now); }
    catch { throw new RateLimitError('READ_FAILED'); }
    const { data: rows, error } = result;
    if (error) throw new RateLimitError('READ_FAILED', error.code);
    if (!Array.isArray(rows) || rows.some(row => !Number.isInteger(row.count) || row.count < 0)) {
      throw new RateLimitError('INVALID_COUNTER');
    }
    const count = (rows || []).reduce((total, row) => total + row.count, 0);
    if (count >= 5) return false;
    if (!rows?.length) {
      let inserted;
      try { inserted = await client.from('rate_limits').insert({ ip, count: 1, reset_at: new Date(Date.now() + 3600000).toISOString() }); }
      catch { throw new RateLimitError('INSERT_FAILED'); }
      if (inserted.error) throw new RateLimitError('INSERT_FAILED', inserted.error.code);
      return true;
    }
    // Reject ambiguous duplicate active rows rather than silently weaken protection.
    if (rows.length !== 1) throw new RateLimitError('DUPLICATE_ACTIVE_ROWS');
    const row = rows[0];
    let resultUpdate;
    try {
      resultUpdate = await client.from('rate_limits').update({ count: row.count + 1 })
        .eq('id', row.id).eq('count', row.count).select('id');
    } catch { throw new RateLimitError('UPDATE_FAILED'); }
    const { data: updated, error: updateError } = resultUpdate;
    if (updateError) throw new RateLimitError('UPDATE_FAILED', updateError.code);
    if (updated?.length === 1) return true;
  }
  throw new RateLimitError('UPDATE_CONFLICT');
}
