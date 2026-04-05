import { getDashboardData } from '@/lib/googleSheets';
import DashboardClient from '@/components/DashboardClient';
import { Suspense } from 'react';

export const revalidate = 3600; 

export default async function Page() {
  const rawData = await getDashboardData();
  const actors = rawData as any[]; 

  return (
    // Suspense ensures Vercel doesn't crash when reading dynamic URL parameters
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black text-neutral-500">Loading intelligence...</div>}>
      <DashboardClient initialActors={actors} />
    </Suspense>
  );
}