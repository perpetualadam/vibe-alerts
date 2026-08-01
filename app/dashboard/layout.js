import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Dashboard',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardLayout({ children }) {
  return children;
}
