export function buildPrompt({
  mode,
  project,
  profile,
  message,
}: any) {

  switch (mode) {

    case 'supervisor':
      return `
Si AI vedúci práce.

Analyzuj kapitolu:
- nájdi chyby
- navrhni zlepšenia
- daj skóre 0–100

Téma: ${profile?.tema}
Text:
${message}
`;

    case 'write':
      return `
Napíš akademický text.

Téma: ${profile?.tema}
Štýl: ${profile?.style}

${message}
`;

    case 'sources':
      return `
Nájdi relevantné vedecké zdroje.

Téma: ${profile?.tema}

${message}
`;

    default:
      return message;
  }
}