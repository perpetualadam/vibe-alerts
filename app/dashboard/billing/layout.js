import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Billing',
  path: '/dashboard/billing',
  noIndex: true,
});

export default function BillingLayout({ children }) {
  return children;
}
