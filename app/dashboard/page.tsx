import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6 text-white">
          Načítavam menu aplikácie...
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}