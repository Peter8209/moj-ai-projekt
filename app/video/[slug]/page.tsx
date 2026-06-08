import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OldVideoManualRedirectPage({
  params,
}: PageProps) {
  await params;

  redirect('/videos');
}