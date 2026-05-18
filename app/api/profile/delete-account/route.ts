import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Používateľ nie je prihlásený.' },
      { status: 401 }
    );
  }

  const userId = user.id;

  const { data: documents } = await admin
    .from('user_documents')
    .select('file_path')
    .eq('user_id', userId);

  const filePaths =
    documents
      ?.map((doc) => doc.file_path)
      .filter((path): path is string => Boolean(path)) || [];

  if (filePaths.length > 0) {
    await admin.storage.from('documents').remove(filePaths);
  }

  await admin.from('user_documents').delete().eq('user_id', userId);
  await admin.from('orders').update({ user_id: null }).eq('user_id', userId);
  await admin.from('user_profiles').delete().eq('id', userId);

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return NextResponse.json(
      { ok: false, error: deleteUserError.message },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    message: 'Účet, profil a dokumenty boli odstránené.',
  });
}