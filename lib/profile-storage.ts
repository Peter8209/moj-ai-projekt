export type SavedProfile = {
  id?: string;
  user_id?: string;

  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  supervisor?: string;

  language?: string;
  workLanguage?: string;
  interfaceLanguage?: string;

  citation?: string;
  citationStyle?: string;

  annotation?: string;
  goal?: string;
  problem?: string;
  researchProblem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  sourcesRequirement?: string;

  schema?: {
    structure?: string;
    requiredSections?: string;
    recommendedLength?: string;
    aiInstruction?: string;
  };

  updatedAt?: string;
  savedAt?: string;
};

export function normalizeProfile(raw: any): SavedProfile {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return {
    id: raw.id || raw.profile_id || raw.uuid,
    user_id: raw.user_id,

    title: raw.title || raw.name || raw.nazovPrace || '',
    topic: raw.topic || raw.tema || '',
    type: raw.type || raw.workType || raw.typPrace || '',
    level: raw.level || raw.studyLevel || '',
    field: raw.field || raw.odbor || '',
    supervisor: raw.supervisor || raw.veduci || '',

    language: raw.language || raw.interfaceLanguage || raw.jazykRozhrania || 'sk',
    workLanguage: raw.workLanguage || raw.work_language || raw.jazykPrace || raw.language || 'sk',
    interfaceLanguage: raw.interfaceLanguage || raw.language || 'sk',

    citation:
      raw.citation ||
      raw.citationStyle ||
      raw.citation_style ||
      raw.citovanie ||
      'STN ISO 690',

    citationStyle:
      raw.citationStyle ||
      raw.citation ||
      raw.citation_style ||
      raw.citovanie ||
      'STN ISO 690',

    annotation: raw.annotation || raw.anotacia || '',
    goal: raw.goal || raw.ciel || raw.cielPrace || '',
    problem: raw.problem || raw.vyskumProblem || '',
    researchProblem: raw.researchProblem || raw.problem || raw.vyskumProblem || '',
    methodology: raw.methodology || raw.metodologia || '',
    hypotheses: raw.hypotheses || raw.hypotezy || '',
    researchQuestions: raw.researchQuestions || raw.vyskumneOtazky || '',
    practicalPart: raw.practicalPart || raw.praktickaCast || '',
    scientificContribution: raw.scientificContribution || raw.odbornyPrinos || '',
    sourcesRequirement: raw.sourcesRequirement || raw.poziadavkyNaZdroje || '',

    schema: raw.schema || {
      structure: raw.structure || '',
      requiredSections: raw.requiredSections || '',
      recommendedLength: raw.recommendedLength || '',
      aiInstruction: raw.aiInstruction || '',
    },

    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    savedAt: raw.savedAt || raw.saved_at || new Date().toISOString(),
  };
}

export function getProfileText(profile: SavedProfile): string {
  const p = normalizeProfile(profile);

  return `
AKTUÁLNY PROFIL PRÁCE:

Názov práce: ${p.title || 'neuvedené'}
Téma práce: ${p.topic || 'neuvedené'}
Typ práce: ${p.type || 'neuvedené'}
Stupeň štúdia: ${p.level || 'neuvedené'}
Odbor: ${p.field || 'neuvedené'}
Vedúci práce: ${p.supervisor || 'neuvedené'}

Jazyk rozhrania: ${p.interfaceLanguage || p.language || 'sk'}
Jazyk práce: ${p.workLanguage || p.language || 'sk'}
Citačný štýl: ${p.citationStyle || p.citation || 'STN ISO 690'}

Anotácia:
${p.annotation || 'neuvedené'}

Cieľ práce:
${p.goal || 'neuvedené'}

Výskumný problém:
${p.researchProblem || p.problem || 'neuvedené'}

Metodológia:
${p.methodology || 'neuvedené'}

Hypotézy:
${p.hypotheses || 'neuvedené'}

Výskumné otázky:
${p.researchQuestions || 'neuvedené'}

Praktická časť:
${p.practicalPart || 'neuvedené'}

Odborný prínos:
${p.scientificContribution || 'neuvedené'}

Požiadavky na zdroje:
${p.sourcesRequirement || 'neuvedené'}

Štruktúra práce:
${p.schema?.structure || 'neuvedené'}

Povinné sekcie:
${p.schema?.requiredSections || 'neuvedené'}

Odporúčaný rozsah:
${p.schema?.recommendedLength || 'neuvedené'}

Dodatočné AI inštrukcie:
${p.schema?.aiInstruction || 'neuvedené'}
`.trim();
}

export function readActiveProfileFromLocalStorage(): SavedProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const activeProfileRaw = localStorage.getItem('active_profile');
    if (activeProfileRaw) {
      return normalizeProfile(JSON.parse(activeProfileRaw));
    }

    const profileRaw = localStorage.getItem('profile');
    if (profileRaw) {
      return normalizeProfile(JSON.parse(profileRaw));
    }

    const profilesRaw = localStorage.getItem('profiles_full');
    if (profilesRaw) {
      const profiles = JSON.parse(profilesRaw);
      if (Array.isArray(profiles) && profiles.length > 0) {
        const latest = profiles
          .map(normalizeProfile)
          .sort((a, b) => {
            const da = new Date(a.updatedAt || a.savedAt || 0).getTime();
            const db = new Date(b.updatedAt || b.savedAt || 0).getTime();
            return db - da;
          })[0];

        return latest;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveActiveProfileToLocalStorage(profile: SavedProfile) {
  if (typeof window === 'undefined') return;

  const normalized = normalizeProfile(profile);
  const now = new Date().toISOString();

  const finalProfile = {
    ...normalized,
    updatedAt: now,
    savedAt: normalized.savedAt || now,
  };

  localStorage.setItem('active_profile', JSON.stringify(finalProfile));
  localStorage.setItem('profile', JSON.stringify(finalProfile));

  try {
    const profilesRaw = localStorage.getItem('profiles_full');
    const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];

    const list = Array.isArray(profiles) ? profiles : [];

    const withoutOld = list.filter((item: any) => {
      const itemId = item?.id || item?.profile_id;
      if (finalProfile.id && itemId) return itemId !== finalProfile.id;

      return (
        String(item?.title || '') !== String(finalProfile.title || '') ||
        String(item?.topic || '') !== String(finalProfile.topic || '')
      );
    });

    localStorage.setItem(
      'profiles_full',
      JSON.stringify([finalProfile, ...withoutOld]),
    );
  } catch {
    localStorage.setItem('profiles_full', JSON.stringify([finalProfile]));
  }

  window.dispatchEvent(
    new CustomEvent('zedpera-profile-updated', {
      detail: finalProfile,
    }),
  );
}