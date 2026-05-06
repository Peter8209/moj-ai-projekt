import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cleanFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Používateľ nie je prihlásený.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const projectId = String(formData.get('projectId') || '');
    const file = formData.get('file');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Chýba projectId.' },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Chýba súbor.' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const isAllowed =
      allowedTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx') ||
      file.name.toLowerCase().endsWith('.txt');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Povolené sú iba PDF, DOC, DOCX a TXT dokumenty.' },
        { status: 400 }
      );
    }

    const fileName = cleanFileName(file.name);
    const filePath = `${user.id}/${projectId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('zedpera-documents')
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: documentRow, error: insertError } = await supabase
      .from('zedpera_documents')
      .insert({
        user_id: user.id,
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        status: 'uploaded',
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      document: documentRow,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri uploade dokumentu.',
      },
      { status: 500 }
    );
  }
}