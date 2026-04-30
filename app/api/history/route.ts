import { NextRequest } from 'next/server';

// ================= MOCK DB =================
let historyStore: any[] = [];

// ================= GET =================
export async function GET(req: NextRequest) {
  try {
    return Response.json({
      ok: true,
      data: historyStore,
    });
  } catch (err) {
    return Response.json(
      { error: 'LOAD_FAILED' },
      { status: 500 }
    );
  }
}

// ================= POST =================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const record = {
      id: crypto.randomUUID(),
      type: body.type || 'chat',
      input: body.input || '',
      output: body.output || '',
      created_at: Date.now(),
    };

    historyStore.push(record);

    return Response.json({
      ok: true,
      data: record,
    });

  } catch (err: any) {
    return Response.json(
      { error: 'SAVE_FAILED' },
      { status: 500 }
    );
  }
}

// ================= DELETE =================
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  historyStore = historyStore.filter(x => x.id !== id);

  return Response.json({ ok: true });
}