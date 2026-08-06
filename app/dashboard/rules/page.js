'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import AutomationRulesPanel from '@/components/dashboard/AutomationRulesPanel';

export default function AutomationRulesPage() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <DashboardShell
      title="Automation rules"
      subtitle="Route, enrich, or ignore leads with if/then rules"
      toast={toast}
      maxWidthClass="max-w-5xl"
    >
      <AutomationRulesPanel onToast={showToast} />
    </DashboardShell>
  );
}
