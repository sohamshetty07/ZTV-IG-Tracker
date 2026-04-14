import { getMacroData, getMacroLastSyncDate } from '@/lib/googleSheets';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { Suspense } from 'react';

// Revalidate every 60 seconds to protect the Google Sheets API
export const revalidate = 60; 

export default async function NetworkPage() {
  const rawData = await getMacroData();
  const macroData = rawData as any[]; 
  
  // NEW: Fetch the specific Macro sync date
  const lastSync = await getMacroLastSyncDate(); 

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black text-neutral-500 font-bold">Loading Network Intelligence...</div>}>
      <MacroDashboardClient initialData={macroData} lastSync={lastSync} />
    </Suspense>
  );
}