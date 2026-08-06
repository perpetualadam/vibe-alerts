/**
 * Web Push / VAPID configuration from env.
 */

/**
 * @returns {{
 *   publicKey: string,
 *   privateKey: string,
 *   subject: string,
 *   configured: boolean,
 * }}
 */
export function getVapidConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    '';
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    'mailto:support@vibe-alerts.com';

  const subjectUri = subject.startsWith('mailto:') ? subject : `mailto:${subject}`;

  return {
    publicKey,
    privateKey,
    subject: subjectUri,
    configured: Boolean(publicKey && privateKey),
  };
}

export function isWebPushConfigured() {
  return getVapidConfig().configured;
}
