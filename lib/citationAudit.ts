export type CitationStyle =
  | 'APA'
  | 'Chicago'
  | 'ISO 690'
  | 'MLA'
  | 'Harvard'
  | 'Vancouver'
  | string;

export type CitationAuditResult = {
  expectedStyle: string;
  detectedStyles: string[];
  hasMismatch: boolean;
  warnings: string[];
};

function hasApaPattern(text: string): boolean {
  const apaAuthorYear = /\(([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+,\s?\d{4}[a-z]?)\)/;
  const apaMultipleAuthors = /\(([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+ et al\.,\s?\d{4})\)/i;
  const apaNarrative = /[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+ \(\d{4}[a-z]?\)/;

  return (
    apaAuthorYear.test(text) ||
    apaMultipleAuthors.test(text) ||
    apaNarrative.test(text)
  );
}

function hasChicagoFootnotePattern(text: string): boolean {
  const footnoteNumbers = /(?:\s|^)\d+\.\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^.\n]+,\s[^.\n]+/;
  const ibidPattern = /\bIbid\.|\bibid\./;
  const notesBibliography = /Bibliography|Bibliografia|Poznámky pod čiarou|footnote/i;

  return (
    footnoteNumbers.test(text) ||
    ibidPattern.test(text) ||
    notesBibliography.test(text)
  );
}

function hasIso690Pattern(text: string): boolean {
  const isoUpperAuthor = /[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{2,},\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/;
  const onlineAccess = /Dostupné na internete|Available from|ISBN|ISSN/i;

  return isoUpperAuthor.test(text) || onlineAccess.test(text);
}

function normalizeStyle(style: string | undefined | null): string {
  if (!style) return 'neuvedená';

  const lowered = style.toLowerCase();

  if (lowered.includes('apa')) return 'APA';
  if (lowered.includes('chicago')) return 'Chicago';
  if (lowered.includes('iso')) return 'ISO 690';
  if (lowered.includes('mla')) return 'MLA';
  if (lowered.includes('harvard')) return 'Harvard';
  if (lowered.includes('vancouver')) return 'Vancouver';

  return style;
}

export function auditCitationStyle(
  text: string,
  expectedStyleRaw: string | undefined | null,
): CitationAuditResult {
  const expectedStyle = normalizeStyle(expectedStyleRaw);
  const detectedStyles: string[] = [];
  const warnings: string[] = [];

  if (!text.trim()) {
    return {
      expectedStyle,
      detectedStyles,
      hasMismatch: false,
      warnings: ['Text neobsahuje dostatok údajov na kontrolu citačnej normy.'],
    };
  }

  if (hasApaPattern(text)) detectedStyles.push('APA');
  if (hasChicagoFootnotePattern(text)) detectedStyles.push('Chicago');
  if (hasIso690Pattern(text)) detectedStyles.push('ISO 690');

  const uniqueDetected = Array.from(new Set(detectedStyles));

  const hasMismatch =
    expectedStyle !== 'neuvedená' &&
    uniqueDetected.length > 0 &&
    !uniqueDetected.includes(expectedStyle);

  if (hasMismatch) {
    warnings.push(
      `V profile práce je nastavená citačná norma ${expectedStyle}, ale v texte boli rozpoznané znaky citačného štýlu ${uniqueDetected.join(
        ', ',
      )}.`,
    );
  }

  if (expectedStyle === 'Chicago' && uniqueDetected.includes('APA')) {
    warnings.push(
      'Text pravdepodobne používa APA citácie typu autor – rok v zátvorke, čo nie je v súlade s nastavenou citačnou normou Chicago.',
    );
  }

  if (expectedStyle === 'APA' && uniqueDetected.includes('Chicago')) {
    warnings.push(
      'Text pravdepodobne používa poznámkový alebo bibliografický štýl typický pre Chicago, hoci v profile je nastavená norma APA.',
    );
  }

  if (uniqueDetected.length === 0) {
    warnings.push(
      'V texte sa nepodarilo spoľahlivo rozpoznať citačný štýl. Odporúča sa manuálna kontrola citácií a zoznamu literatúry.',
    );
  }

  return {
    expectedStyle,
    detectedStyles: uniqueDetected,
    hasMismatch,
    warnings,
  };
}