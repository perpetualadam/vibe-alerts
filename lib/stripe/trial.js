/** @returns {number} Trial length in days, or 0 when trials are disabled. */
export function getSubscriptionTrialDays() {
  const raw =
    process.env.STRIPE_TRIAL_PERIOD_DAYS?.trim() ??
    process.env.NEXT_PUBLIC_SUBSCRIPTION_TRIAL_DAYS?.trim() ??
    '14';
  const days = parseInt(raw, 10);
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.min(days, 730);
}

/** @returns {string | null} e.g. "14-day free trial" */
export function getSubscriptionTrialLabel() {
  const days = getSubscriptionTrialDays();
  if (days <= 0) return null;
  return `${days}-day free trial`;
}
