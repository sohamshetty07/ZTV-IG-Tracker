import { getDashboardData } from '@/lib/googleSheets';
import DashboardClient from '@/components/DashboardClient';

// Revalidate cache every hour
export const revalidate = 3600; 

export default async function Page() {
  const rawData = await getDashboardData();
  const actors = rawData as any[]; 

  return <DashboardClient initialActors={actors} />;
}