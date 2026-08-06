import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Analytics',
  path: '/dashboard/analytics',
  noIndex: true,
});

export default function AnalyticsLayout({ children }) {
  return children;
}
