'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import IntegrationWizard from '@/components/dashboard/setup/IntegrationWizard';

export default function SetupWizardPage() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <DashboardShell
      title="Integration Wizard"
      subtitle="Connect your website in a few guided steps"
      toast={toast}
    >
      <p className="text-sm text-vibe-muted max-w-2xl">
        Choose your platform, copy credentials, follow tailored instructions, then test the
        connection before marking setup complete.
      </p>
      <IntegrationWizard onToast={showToast} />
    </DashboardShell>
  );
}
