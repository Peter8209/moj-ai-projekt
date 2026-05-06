import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Používateľ nie je prihlásený.' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('zedpera_projects')
    .select(`
      id,
      title,
      work_type,
      work_language,
      citation,
      field,
      supervisor,
      profile,
      created_at,
      updated_at,
      zedpera_documents (
        id,
        file_name,
        file_type,
        file_size,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    projects: data || [],
  });
}