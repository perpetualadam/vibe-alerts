import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Integration Wizard',
  path: '/dashboard/setup',
  noIndex: true,
});

export default function SetupLayout({ children }) {
  return children;
}
