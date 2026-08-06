'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import BillingPanel from '@/components/dashboard/BillingPanel';

export default function BillingPage() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      showToast('Subscription updated successfully', 'success');
      window.history.replaceState({}, '', '/dashboard/billing');
    } else if (billing === 'cancelled') {
      showToast('Checkout cancelled', 'info');
      window.history.replaceState({}, '', '/dashboard/billing');
    }
  }, []);

  return (
    <DashboardShell
      title="Billing"
      subtitle="Plans, usage, invoices, promo codes, and team seats"
      toast={toast}
    >
      <BillingPanel onToast={showToast} />
    </DashboardShell>
  );
}
