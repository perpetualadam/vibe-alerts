import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Notifications',
  path: '/dashboard/notifications',
  noIndex: true,
});

export default function NotificationsLayout({ children }) {
  return children;
}
