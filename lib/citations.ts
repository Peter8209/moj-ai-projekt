export type CitationStyle =
  | 'APA7'
  | 'APA_7'
  | 'APA 7'
  | 'ISO690'
  | 'ISO_690'
  | 'ISO 690'
  | 'STN_ISO_690'
  | 'STN ISO 690'
  | 'CHICAGO'
  | 'Chicago'
  | string;

export function normalizeCitationStyle(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) return 'STN_ISO_690';

  if (raw.includes('apa')) return 'APA_7';

  if (raw.includes('stn') && raw.includes('iso')) return 'STN_ISO_690';

  if (raw.includes('iso')) return 'ISO_690';

  if (raw.includes('chicago')) return 'CHICAGO';

  return 'STN_ISO_690';
}

export function getCitationInstruction(style?: string | null): string {
  const normalized = normalizeCitationStyle(style);

  switch (normalized) {
    case 'APA_7':
      return `
Použi citačný štýl APA 7.

Pravidlá:
- Citácie v texte uvádzaj vo formáte: (Autor, rok).
- Pri priamej citácii použi: (Autor, rok, s. číslo).
- Bibliografia musí byť vo formáte: Autor, A. A. (Rok). Názov diela. Vydavateľstvo.
- Nepoužívaj číselné citácie typu [1].
- Nepoužívaj poznámky pod čiarou ako v Chicago štýle.
- Ak údaj o autorovi, roku, vydavateľovi, DOI alebo URL nie je dostupný, napíš: údaj je potrebné overiť.
`.trim();

    case 'ISO_690':
      return `
Použi citačný štýl ISO 690.

Pravidlá:
- Citácie v texte uvádzaj číselne vo formáte [1], [2], [3].
- Bibliografia musí byť zoradená podľa poradia výskytu v texte.
- Formát knihy: PRIEZVISKO, Meno. Názov diela. Miesto vydania: Vydavateľstvo, rok.
- Formát online zdroja: PRIEZVISKO, Meno. Názov [online]. Rok [cit. dátum]. Dostupné na: URL.
- Nepoužívaj APA citácie typu (Autor, rok).
- Nepoužívaj Chicago poznámky pod čiarou.
- Ak údaj chýba, napíš: údaj je potrebné overiť.
`.trim();

    case 'STN_ISO_690':
      return `
Použi citačný štýl STN ISO 690 podľa slovenského akademického prostredia.

Pravidlá:
- Citácie v texte uvádzaj najčastejšie číselne vo formáte [1], [2], [3], ak používateľ neurčil inú školskú metodiku.
- Bibliografia musí byť v slovenskom formáte podľa STN ISO 690.
- Formát knihy: PRIEZVISKO, Meno. Názov diela. Miesto vydania: Vydavateľstvo, rok. ISBN.
- Formát článku: PRIEZVISKO, Meno. Názov článku. Názov časopisu. Rok, ročník, číslo, strany.
- Formát online zdroja: PRIEZVISKO, Meno. Názov [online]. Rok [cit. dátum]. Dostupné na: URL.
- Nepoužívaj APA citácie typu (Autor, rok), ak používateľ vyslovene nezvolil APA.
- Ak údaj chýba, napíš: údaj je potrebné overiť.
`.trim();

    case 'CHICAGO':
      return `
Použi citačný štýl Chicago.

Pravidlá:
- Citácie uvádzaj ako poznámky pod čiarou alebo poznámkové odkazy.
- Pri prvej citácii použi plný bibliografický údaj.
- V texte môžeš použiť označenie poznámky, napríklad: ¹
- Príklad poznámky: 1. Ján Novák, Názov knihy (Bratislava: Vydavateľstvo, 2022), 45.
- Bibliografia má byť detailná.
- Nepoužívaj APA citácie typu (Autor, rok).
- Nepoužívaj číselné citácie typu [1], ak ide o poznámkový Chicago štýl.
- Ak údaj chýba, napíš: údaj je potrebné overiť.
`.trim();

    default:
      return getCitationInstruction('STN_ISO_690');
  }
}

export function getCitationLabel(style?: string | null): string {
  const normalized = normalizeCitationStyle(style);

  switch (normalized) {
    case 'APA_7':
      return 'APA 7';
    case 'ISO_690':
      return 'ISO 690';
    case 'STN_ISO_690':
      return 'STN ISO 690';
    case 'CHICAGO':
      return 'Chicago';
    default:
      return 'STN ISO 690';
  }
}