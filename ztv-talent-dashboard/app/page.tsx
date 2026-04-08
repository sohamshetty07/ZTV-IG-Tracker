import { getDashboardData, getLastSyncDate } from '@/lib/googleSheets';
import DashboardClient from '@/components/DashboardClient';
import { Suspense } from 'react';

export const revalidate = 120; 

export default async function Page() {
  const rawData = await getDashboardData();
  const actors = rawData as any[]; 

  // NEW: Fetch the actual scraper timestamp
  const lastSync = await getLastSyncDate();

  return (
    // Suspense ensures Vercel doesn't crash when reading dynamic URL parameters
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black text-neutral-500">Loading intelligence...</div>}>
      {/* Pass the new prop into the client */}
      <DashboardClient initialActors={actors} lastSync={lastSync} />
    </Suspense>
  );
}