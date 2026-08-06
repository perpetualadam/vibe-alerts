'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import AiLeadIntelligence from '@/components/dashboard/AiLeadIntelligence';

export default function AiLeadIntelligencePage() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <DashboardShell
      title="AI Lead Intelligence"
      subtitle="Summaries, category, priority, spam, sentiment, and intent"
      toast={toast}
    >
      <AiLeadIntelligence onToast={showToast} />
    </DashboardShell>
  );
}
