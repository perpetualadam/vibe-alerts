import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPageMetadata({
  title: 'Sign In',
  path: '/login',
  noIndex: true,
});

export default function LoginLayout({ children }) {
  return children;
}
