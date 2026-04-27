export async function POST(req: Request) {
  const { messages, agent, mode } = await req.json();

  switch (agent) {

    case 'openai':
      return Response.json({ reply: 'OpenAI odpoveď' });

    case 'claude':
      return Response.json({ reply: 'Claude odpoveď' });

    case 'gemini':
      return Response.json({ reply: 'Gemini odpoveď' });

    case 'grok':
      return Response.json({ reply: 'Grok odpoveď' });

    case 'mistral':
      return Response.json({ reply: 'Mistral odpoveď' });

    case 'cohere':
      return Response.json({ reply: 'Cohere odpoveď' });

    case 'perplexity':
      return Response.json({ reply: 'Perplexity odpoveď' });

    case 'fastbot':
      return Response.json({ reply: 'AI vedúci (Fastbot)' });

    case 'auto':
      return Response.json({ reply: 'Auto AI vybrala model' });

    default:
      return Response.json({ reply: 'Default AI' });
  }
}