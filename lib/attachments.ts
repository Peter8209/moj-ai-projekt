export type PreparedAttachment = {
  id: string;
  name: string;
  type?: string;
  size?: number;
  text?: string;
  compressed?: boolean;
};

export function cleanAttachmentName(name?: string | null): string {
  const raw = String(name || '').trim();

  if (!raw) return 'Príloha';

  return raw
    .replace(/^C:\\fakepath\\/i, '')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAttachmentClientMessage(files: PreparedAttachment[]): string {
  if (!files.length) return '';

  const names = files.map((file) => `- ${cleanAttachmentName(file.name)}`).join('\n');

  return `
Nahrané prílohy:
${names}
`.trim();
}

export function getAttachmentPromptText(files: PreparedAttachment[]): string {
  if (!files.length) {
    return `
Používateľ nenahral žiadne prílohy. Generuj výstup podľa aktuálneho profilu práce.
`.trim();
  }

  const content = files
    .map((file, index) => {
      const name = cleanAttachmentName(file.name);
      const text = String(file.text || '').trim();

      if (!text) {
        return `
PRÍLOHA ${index + 1}: ${name}
Stav: Z prílohy sa nepodarilo extrahovať text. Použi iba názov prílohy a upozorni, že obsah je potrebné overiť.
`.trim();
      }

      return `
PRÍLOHA ${index + 1}: ${name}

EXTRAHOVANÝ TEXT:
${text}
`.trim();
    })
    .join('\n\n---\n\n');

  return `
Používateľ nahral prílohy. Pri odpovedi čerpaj najmä z ich obsahu, ale zároveň rešpektuj aktuálny profil práce.

${content}
`.trim();
}

export function isAttachmentRelatedToProfile(args: {
  profileTitle?: string;
  profileTopic?: string;
  attachmentName?: string;
  attachmentText?: string;
}) {
  const profileWords = `${args.profileTitle || ''} ${args.profileTopic || ''}`
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  const attachmentContent = `${args.attachmentName || ''} ${args.attachmentText || ''}`.toLowerCase();

  if (profileWords.length === 0) return true;

  const matches = profileWords.filter((word) => attachmentContent.includes(word));

  return matches.length > 0;
}

export function getAttachmentRelevanceWarning(args: {
  profileTitle?: string;
  profileTopic?: string;
  files: PreparedAttachment[];
}) {
  const unrelated = args.files.filter((file) => {
    return !isAttachmentRelatedToProfile({
      profileTitle: args.profileTitle,
      profileTopic: args.profileTopic,
      attachmentName: file.name,
      attachmentText: file.text,
    });
  });

  if (!unrelated.length) return '';

  return `
Upozornenie: Niektoré nahrané prílohy nemusia súvisieť s aktívnym profilom práce:
${unrelated.map((file) => `- ${cleanAttachmentName(file.name)}`).join('\n')}

Pred použitím týchto príloh odporúčame overiť, či patria k aktuálnej práci.
`.trim();
}