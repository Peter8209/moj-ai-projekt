export async function GET() {
  return Response.json({
    data: {
      email: 'user@email.com',
      currency: 'EUR',
      aiMode: 'auto',
      notifications: true,
    }
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  // 👉 tu uložíš do DB

  return Response.json({ ok: true });
}