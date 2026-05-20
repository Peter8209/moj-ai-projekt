export function cleanAuditOutput(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  const forbiddenPatterns = [
    /^AI audit kvality[:\-\s]*/gim,
    /^Audit kvality[:\-\s]*/gim,
    /^Interná inštrukcia[:\-\s].*$/gim,
    /^Systémová inštrukcia[:\-\s].*$/gim,
    /^Model má.*$/gim,
    /^Výstup nebude.*$/gim,
    /^Použi aktuálny profil.*$/gim,
    /^Tento výstup bol vygenerovaný.*$/gim,
    /^Na základe profilu práce.*$/gim,
    /^Ako AI.*$/gim,
    /^Som AI.*$/gim,
    /klient nemá vidieť/gi,
    /kozmetické úpravy/gi,
    /interné pravidlá/gi,
  ];

  forbiddenPatterns.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  return text;
}