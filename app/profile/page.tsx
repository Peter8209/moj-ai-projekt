'use client';

import ClientAccountProfile from './ClientAccountProfile';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <ClientAccountProfile />
    </main>
  );
}