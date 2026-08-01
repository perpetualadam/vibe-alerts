/**
 * Build the Supabase password-reset redirect URL (PKCE callback).
 * @param {string} appOrigin - e.g. https://vibe-alerts.com or http://localhost:3000
 */
export function buildPasswordResetRedirectUrl(appOrigin) {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/auth/callback?next=${encodeURIComponent('/login/reset-password')}`;
}
