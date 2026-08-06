'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import AdminMonitoringPanel from '@/components/dashboard/AdminMonitoringPanel';

export default function AdminMonitoringPage() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <DashboardShell
      title="Admin monitoring"
      subtitle="Health, retries, dead letters, and uptime"
      toast={toast}
      maxWidthClass="max-w-6xl"
    >
      <AdminMonitoringPanel onToast={showToast} />
    </DashboardShell>
  );
}
