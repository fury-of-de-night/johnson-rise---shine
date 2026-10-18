/**
 * /src/lib/security.ts - Johnson Rise & Shine (Guyana)
 * CSRF, XSS sanitize, and per-IP rate limit (5/hr).
 */

import crypto from 'crypto';

/** In-memory IP rate-limit store (production: Redis / Supabase). */
const rateStore = new Map<string, { count: number; reset: number }>();

/** Generate a random CSRF token (64 hex chars). */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Validate CSRF token matches expected value (constant-time compare). */
export function validateCsrfToken(token: string, expected: string): boolean {
  if (!token || !expected || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Basic HTML/XSS sanitize: escape < > " ' & and strip script/style tags. */
export function sanitizeXss(input: string): string {
  if (typeof input !== 'string') return '';
  let s = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // Strip dangerous tags
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  return s;
}

/** Generate a new 10-character 36-character uppercase alphanumeric customer reference (14 chars total with JRS- prefix). */
export function generateSecureCustomerRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = '';
  for (let i = 0; i < 10; i++) {
    // crypto.randomInt is unbiased in Node 18+; avoids modulo bias
    const val = crypto.randomInt(chars.length);
    ref += chars[val];
  }
  return 'JRS-' + ref;
}
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxReq = 5;
  const existing = rateStore.get(ip);
  if (!existing || now > existing.reset) {
    rateStore.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (existing.count >= maxReq) return false;
  existing.count += 1;
  rateStore.set(ip, existing);
  return true;
}
