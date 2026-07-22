import { redirect } from 'next/navigation';

import DashboardClient from './DashboardClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user?.id
  ) {
    redirect(
      '/login?next=%2Fdashboard',
    );
  }

  /*
   * Dashboard nerozhoduje o balíku podľa URL,
   * localStorage ani podľa e-mailu vo frontende.
   *
   * FREE / platený / ADMIN stav načíta
   * DashboardClient zo serverového endpointu:
   *
   * /api/entitlements/me
   */
  return <DashboardClient />;
}
