export async function POST(req: Request) {
  const { addon } = await req.json();

  return Response.json({
    ok: true,
    message: `Addon ${addon} aktivovaný`
  });
}