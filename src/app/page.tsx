'use client';

import { useState } from 'react';
import { Dashboard, ReferralPage, Header } from '@/components';

type Tab = 'race' | 'referral';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('race');

  return (
    <div className="h-screen bg-cfl-bg flex flex-col overflow-hidden">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'race' ? <Dashboard /> : <ReferralPage />}
      </div>
    </div>
  );
}
