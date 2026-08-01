import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';

export default function MarketingShell({ children }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
