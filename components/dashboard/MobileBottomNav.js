'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    match: (path) => path === '/dashboard',
    icon: HomeIcon,
  },
  {
    href: '/dashboard/setup',
    label: 'Setup',
    match: (path) => path.startsWith('/dashboard/setup'),
    icon: SetupIcon,
  },
  {
    href: '/dashboard/notifications',
    label: 'Alerts',
    match: (path) => path.startsWith('/dashboard/notifications'),
    icon: BellIcon,
  },
  {
    href: '/dashboard/analytics',
    label: 'Stats',
    match: (path) => path.startsWith('/dashboard/analytics'),
    icon: ChartIcon,
  },
];

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function SetupIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.75"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 3.5 1.5 5 2 6H4c.5-1 2-2.5 2-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
      <path
        d="M10 19a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19h16M7 16V9M12 16V5M17 16v-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity={active ? 1 : 0.9}
      />
    </svg>
  );
}

/**
 * Thumb-friendly bottom tab bar for phones; hidden from md and up.
 */
export default function MobileBottomNav() {
  const pathname = usePathname() || '/dashboard';

  return (
    <nav
      aria-label="Mobile dashboard"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-vibe-border bg-vibe-bg/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 max-w-lg mx-auto">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-vibe-accent' : 'text-vibe-muted hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
