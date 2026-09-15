const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'mailinator.com', 'temp-mail.org', 'guerrillamail.com',
  'maildrop.cc', 'yopmail.com', 'throwawaymail.com', 'fakeinbox.com',
  'tempinbox.com', 'spam4.me', 'emailondeck.com', 'getnada.com',
]);
export function isDisposableEmail(email: string): boolean {
  try {
    const domain = email.split('@')[1].toLowerCase();
    return DISPOSABLE_DOMAINS.has(domain);
  } catch { return false; }
}
