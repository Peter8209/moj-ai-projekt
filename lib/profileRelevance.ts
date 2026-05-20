export type ProfileRelevanceInput = {
  profileTitle?: string;
  profileTopic?: string;
  profileGoal?: string;
  profileProblem?: string;
  profileMethodology?: string;
  profileHypotheses?: string;
  profileResearchQuestions?: string;
  attachmentText?: string;
  attachmentName?: string;
};

export type ProfileRelevanceResult = {
  score: number;
  related: boolean;
  warning?: string;
  matchedKeywords: string[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(value: string): string[] {
  const stopwords = new Set([
    'a',
    'aj',
    'ale',
    'alebo',
    'ako',
    'je',
    'sú',
    'som',
    'si',
    'sa',
    'do',
    'na',
    'v',
    'vo',
    'z',
    'zo',
    'pre',
    'pri',
    'pod',
    'nad',
    'ktorý',
    'ktorá',
    'ktoré',
    'the',
    'and',
    'or',
    'of',
    'to',
    'in',
    'for',
  ]);

  return normalizeText(value)
    .split(' ')
    .filter((word) => word.length >= 4 && !stopwords.has(word));
}

export function checkAttachmentProfileRelevance(
  input: ProfileRelevanceInput,
): ProfileRelevanceResult {
  const profileText = [
    input.profileTitle,
    input.profileTopic,
    input.profileGoal,
    input.profileProblem,
    input.profileMethodology,
    input.profileHypotheses,
    input.profileResearchQuestions,
  ]
    .filter(Boolean)
    .join(' ');

  const attachmentText = [
    input.attachmentName,
    input.attachmentText,
  ]
    .filter(Boolean)
    .join(' ');

  if (!profileText.trim() || !attachmentText.trim()) {
    return {
      score: 0,
      related: true,
      matchedKeywords: [],
      warning:
        'Súlad prílohy s profilom práce nebolo možné úplne vyhodnotiť, pretože chýba profil alebo extrahovaný text prílohy.',
    };
  }

  const profileKeywords = Array.from(new Set(extractKeywords(profileText)));
  const normalizedAttachment = normalizeText(attachmentText);

  const matchedKeywords = profileKeywords.filter((keyword) =>
    normalizedAttachment.includes(keyword),
  );

  const score =
    profileKeywords.length === 0
      ? 0
      : Math.round((matchedKeywords.length / profileKeywords.length) * 100);

  const related = score >= 15 || matchedKeywords.length >= 3;

  return {
    score,
    related,
    matchedKeywords,
    warning: related
      ? undefined
      : `Nahratá príloha pravdepodobne nesúvisí s aktívnym profilom práce. Zhoda s profilom je iba ${score} %.`,
  };
}