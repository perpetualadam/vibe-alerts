import { getSubscriptionTrialDays } from '@/lib/stripe/trial';

export default function TrustBadges({ className = '' }) {
  const trialDays = getSubscriptionTrialDays();
  const badges = [
    ...(trialDays > 0 ? [{ label: `${trialDays}-day free trial`, highlight: true }] : []),
    { label: 'Cancel anytime' },
    { label: 'No server setup' },
    { label: 'Works with any website' },
  ];

  return (
    <ul className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {badges.map((badge) => (
        <li
          key={badge.label}
          className={
            badge.highlight
              ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25'
              : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-vibe-muted ring-1 ring-vibe-border'
          }
        >
          {badge.highlight && <span className="mr-1.5" aria-hidden="true">✓</span>}
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
