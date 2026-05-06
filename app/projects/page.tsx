'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Search,
  Trash2,
  User,
} from 'lucide-react';

import ProfileForm from '@/components/ProfileForm';
import { createClient } from '@/lib/supabase/client';

type SavedProfile = {
  // =========================
  // ZÁKLADNÉ ID
  // =========================
  id: string;

  // =========================
  // ZÁKLADNÉ ÚDAJE PROFILU
  // =========================
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;

  // =========================
  // AKADEMICKÝ OBSAH
  // =========================
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;

  // =========================
  // MANAŽÉRSKE / PRAKTICKÉ POLIA
  // =========================
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;

  // =========================
  // KĽÚČOVÉ SLOVÁ
  // =========================
  keywordsList?: string[];
  keywords?: string[];

  // =========================
  // DÁTUMY
  // savedAt používa frontend
  // created_at / updated_at prichádzajú zo Supabase
  // =========================
  savedAt?: string;
  created_at?: string;
  updated_at?: string;

  // =========================
  // SCHÉMA PROFILU
  // =========================
  schema?: {
    typeKey?: string;
    label?: string;
    description?: string;
    recommendedLength?: string;
    citationOptions?: string[];
    structure?: string[];
    requiredSections?: string[];
    fields?: {
      key: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      rows?: number;
    }[];
    aiInstruction?: string;
  };

  // =========================
  // SUPABASE RAW FIELDS / FALLBACK
  // =========================
  full_profile?: any;

  work_language?: string;
  research_questions?: string;
  practical_part?: string;
  scientific_contribution?: string;
  business_problem?: string;
  business_goal?: string;
  case_study?: string;
  sources_requirement?: string;
  keywords_list?: string[];
};

export default function ProjectsPage() {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SavedProfile | null>(
    null
  );

  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(
    null
  );
  const [profileFormOpen, setProfileFormOpen] = useState(false);

  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

const loadProfiles = async () => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('zedpera_profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('SUPABASE LOAD PROFILES ERROR:', error);
      loadProfilesFromLocalStorage();
      return;
    }

    const supabaseProfiles: SavedProfile[] = (data || []).map((row: any) => {
      const full = row.full_profile || {};

      return {
        ...full,

        id: row.id || full.id || crypto.randomUUID(),

        title: row.title || full.title || 'Bez názvu',
        type: row.type || full.type,
        level: row.level || full.level,
        topic: row.topic || full.topic,
        field: row.field || full.field,
        supervisor: row.supervisor || full.supervisor,
        citation: row.citation || full.citation,
        language: row.language || full.language,

        workLanguage:
          row.work_language || full.workLanguage || full.work_language,

        annotation: row.annotation || full.annotation,
        goal: row.goal || full.goal,
        problem: row.problem || full.problem,
        methodology: row.methodology || full.methodology,
        hypotheses: row.hypotheses || full.hypotheses,

        researchQuestions:
          row.research_questions ||
          full.researchQuestions ||
          full.research_questions,

        practicalPart:
          row.practical_part || full.practicalPart || full.practical_part,

        scientificContribution:
          row.scientific_contribution ||
          full.scientificContribution ||
          full.scientific_contribution,

        businessProblem:
          row.business_problem || full.businessProblem || full.business_problem,

        businessGoal:
          row.business_goal || full.businessGoal || full.business_goal,

        implementation: row.implementation || full.implementation,

        caseStudy:
          row.case_study || full.caseStudy || full.case_study,

        reflection: row.reflection || full.reflection,

        sourcesRequirement:
          row.sources_requirement ||
          full.sourcesRequirement ||
          full.sources_requirement,

        keywordsList:
          row.keywords_list ||
          full.keywordsList ||
          full.keywords ||
          [],

        keywords:
          row.keywords_list ||
          full.keywords ||
          full.keywordsList ||
          [],

        schema: row.schema || full.schema,

        savedAt:
          row.updated_at ||
          row.created_at ||
          full.savedAt ||
          new Date().toISOString(),

        created_at: row.created_at,
        updated_at: row.updated_at,
        full_profile: row.full_profile,
      };
    });

    setProfiles(supabaseProfiles);

    localStorage.setItem('profiles_full', JSON.stringify(supabaseProfiles));

    const activeRaw = localStorage.getItem('active_profile');
    const active = activeRaw ? JSON.parse(activeRaw) : null;

    if (active?.id) {
      const found = supabaseProfiles.find(
        (profile) => profile.id === active.id
      );

      if (found) {
        localStorage.setItem('active_profile', JSON.stringify(found));
      }
    }
  } catch (error) {
    console.error('LOAD PROFILES ERROR:', error);
    loadProfilesFromLocalStorage();
  }
};

const loadProfilesFromLocalStorage = () => {
  try {
    const raw = localStorage.getItem('profiles_full');
    const parsed = raw ? JSON.parse(raw) : [];

    if (Array.isArray(parsed)) {
      const normalized: SavedProfile[] = parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          ...item,
          id:
            item.id ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Date.now().toString()),
          title: item.title || 'Bez názvu',
          savedAt: item.savedAt || new Date().toISOString(),
        }));

      setProfiles(normalized);
    } else {
      setProfiles([]);
    }
  } catch {
    setProfiles([]);
  }
};

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...profiles]
      .sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return dateB - dateA;
      })
      .filter((profile) => {
        if (!q) return true;

        return [
          profile.title,
          profile.topic,
          profile.field,
          profile.supervisor,
          profile.schema?.label,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [profiles, search]);

  const openProfile = (profile: SavedProfile) => {
    setSelectedProfile(profile);
    localStorage.setItem('active_profile', JSON.stringify(profile));
  };

const openEditProfile = (profile: SavedProfile) => {
  setEditingProfile(profile);
  setProfileFormOpen(true);
};

const deleteProfile = async (id: string) => {
    const confirmDelete = window.confirm(
      'Naozaj chceš odstrániť túto prácu zo zoznamu?'
    );

    if (!confirmDelete) return;

const handleProfileSaved = (updatedProfile: SavedProfile) => {
  const nextProfiles = profiles.some((profile) => profile.id === updatedProfile.id)
    ? profiles.map((profile) =>
        profile.id === updatedProfile.id ? updatedProfile : profile
      )
    : [updatedProfile, ...profiles];

  setProfiles(nextProfiles);
  setSelectedProfile(updatedProfile);
  setEditingProfile(null);
  setProfileFormOpen(false);

  localStorage.setItem('profiles_full', JSON.stringify(nextProfiles));
  localStorage.setItem('profile', JSON.stringify(updatedProfile));
  localStorage.setItem('active_profile', JSON.stringify(updatedProfile));

  void loadProfiles();
};

    const next = profiles.filter((profile) => profile.id !== id);

    setProfiles(next);
    localStorage.setItem('profiles_full', JSON.stringify(next));

try {
  const supabase = createClient();

  const { error } = await supabase
    .from('zedpera_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('SUPABASE DELETE PROFILE ERROR:', error);
    alert(`Profil sa odstránil lokálne, ale nie zo Supabase: ${error.message}`);
  }
} catch (error) {
  console.error('DELETE PROFILE ERROR:', error);
}

    const activeRaw = localStorage.getItem('active_profile');

    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);

        if (active?.id === id) {
          localStorage.removeItem('active_profile');
        }
      } catch {
        localStorage.removeItem('active_profile');
      }
    }

const editModal = profileFormOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#070a16] p-6 shadow-2xl">
      <ProfileForm
        initialProfile={editingProfile as any}
        onSave={(updatedProfile) => handleProfileSaved(updatedProfile as any)}
        onClose={() => {
          setProfileFormOpen(false);
          setEditingProfile(null);
        }}
      />
    </div>
  </div>
);


    if (selectedProfile?.id === id) {
      setSelectedProfile(null);
    }
  };

if (selectedProfile) {
  return (
    <>
      <ProjectDetail
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onDelete={() => deleteProfile(selectedProfile.id)}
        onEdit={() => openEditProfile(selectedProfile)}
      />

     
    </>
  );
}

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">
              <BookOpen className="h-4 w-4" />
              ZEDPERA
            </div>

            <h1 className="text-4xl font-black tracking-tight">
              Moje práce
            </h1>

            <p className="mt-2 text-slate-400">
              Tu sa automaticky ukladajú všetky profily prác podľa názvu a
              dátumu uloženia.
            </p>
          </div>

          <div className="relative w-full md:w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hľadať podľa názvu, odboru, vedúceho..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </div>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-violet-300" />

            <h2 className="text-2xl font-black">Zatiaľ nemáš uložené práce</h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Choď do sekcie Profil práce alebo klikni na Nová práca. Po
              vyplnení a kliknutí na Uložiť profil sa práca automaticky zobrazí
              v tomto zozname.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <article
                key={profile.id}
                className="group rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition hover:border-violet-400/50 hover:bg-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() => openProfile(profile)}
                  className="block w-full text-left"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                      <FileText className="h-5 w-5" />
                    </div>

                    <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs font-bold text-violet-200">
                      {profile.schema?.label || formatWorkType(profile.type)}
                    </span>
                  </div>

                  <h2 className="line-clamp-2 text-xl font-black text-white">
                    {profile.title || 'Bez názvu'}
                  </h2>

                  <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <span>{formatDate(profile.savedAt)}</span>
                    </div>

                    {profile.field && (
                      <div className="flex items-center gap-2">
                        <Library className="h-4 w-4 text-slate-500" />
                        <span className="line-clamp-1">{profile.field}</span>
                      </div>
                    )}

                    {profile.supervisor && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="line-clamp-1">
                          {profile.supervisor}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
  <button
    type="button"
    onClick={() => openProfile(profile)}
    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
  >
    Otvoriť profil
  </button>

  <button
    type="button"
    onClick={() => openEditProfile(profile)}
    className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-100 transition hover:bg-violet-500/20"
  >
    Upraviť
  </button>

  <button
    type="button"
    onClick={() => deleteProfile(profile.id)}
    className="rounded-xl bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
    aria-label="Odstrániť prácu"
  >
    <Trash2 className="h-5 w-5" />
  </button>
</div>
              </article>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}

function ProjectDetail({
  profile,
  onBack,
  onDelete,
  onEdit,
}: {
  profile: SavedProfile;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
  <button
    type="button"
    onClick={onBack}
    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-bold text-slate-200 transition hover:bg-white/[0.1]"
  >
    <ArrowLeft className="h-5 w-5" />
    Späť na moje práce
  </button>

  <div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 font-bold text-violet-100 transition hover:bg-violet-500/20"
    >
      <FileText className="h-5 w-5" />
      Upraviť profil
    </button>

    <button
      type="button"
      onClick={onDelete}
      className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
    >
      <Trash2 className="h-5 w-5" />
      Odstrániť prácu
    </button>
  </div>
</div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">
                <FileText className="h-4 w-4" />
                Detail profilu práce
              </div>

              <h1 className="max-w-4xl text-4xl font-black tracking-tight">
                {profile.title || 'Bez názvu'}
              </h1>

              <p className="mt-3 text-slate-400">
                Uložené: {formatDate(profile.savedAt)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#111525] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Typ práce
              </p>

              <p className="mt-2 text-xl font-black">
                {profile.schema?.label || formatWorkType(profile.type)}
              </p>

              {profile.schema?.recommendedLength && (
                <p className="mt-1 text-sm text-slate-400">
                  {profile.schema.recommendedLength}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard label="Názov práce" value={profile.title} />
            <InfoCard label="Typ práce" value={profile.schema?.label || profile.type} />
            <InfoCard label="Odbornosť" value={profile.level} />
            <InfoCard label="Jazyk rozhrania" value={profile.language} />
            <InfoCard label="Jazyk práce" value={profile.workLanguage} />
            <InfoCard label="Citovanie" value={profile.citation} />
            <InfoCard label="Odbor / predmet / oblasť" value={profile.field} />
            <InfoCard label="Vedúci práce / školiteľ" value={profile.supervisor} />
            <InfoCard label="Téma" value={profile.topic} />
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <LongCard label="Anotácia" value={profile.annotation} />
            <LongCard label="Cieľ práce" value={profile.goal} />
            <LongCard label="Výskumný problém" value={profile.problem} />
            <LongCard label="Metodológia" value={profile.methodology} />
            <LongCard label="Hypotézy" value={profile.hypotheses} />
            <LongCard label="Výskumné otázky" value={profile.researchQuestions} />
            <LongCard label="Praktická časť" value={profile.practicalPart} />
            <LongCard
              label="Vedecký / odborný prínos"
              value={profile.scientificContribution}
            />
            <LongCard
              label="Firemný / manažérsky problém"
              value={profile.businessProblem}
            />
            <LongCard label="Manažérsky cieľ" value={profile.businessGoal} />
            <LongCard label="Implementácia" value={profile.implementation} />
            <LongCard label="Prípadová štúdia" value={profile.caseStudy} />
            <LongCard label="Reflexia" value={profile.reflection} />
            <LongCard
              label="Požiadavky na zdroje"
              value={profile.sourcesRequirement}
            />
          </div>

          {keywords.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5">
              <h2 className="mb-4 text-xl font-black">Kľúčové slová</h2>

              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={`${keyword}-${index}`}
                    className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.schema?.structure && profile.schema.structure.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5">
              <h2 className="mb-4 text-xl font-black">Štruktúra práce</h2>

              <ol className="space-y-3">
                {profile.schema.structure.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex gap-3 text-sm text-slate-300"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200">
                      {index + 1}
                    </span>

                    <span className="pt-1">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {profile.schema?.requiredSections &&
            profile.schema.requiredSections.length > 0 && (
              <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5">
                <h2 className="mb-4 text-xl font-black">Povinné časti</h2>

                <div className="flex flex-wrap gap-2">
                  {profile.schema.requiredSections.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111525] p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-white">
        {value || 'Nevyplnené'}
      </p>
    </div>
  );
}

function LongCard({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111525] p-5">
      <p className="mb-3 text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
        {value}
      </p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Bez dátumu';

  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatWorkType(type?: string) {
  if (!type) return 'Neurčený typ';

  const map: Record<string, string> = {
    seminar: 'Seminárna práca',
    essay: 'Esej',
    maturita: 'Maturitná práca',
    bachelor: 'Bakalárska práca',
    master: 'Diplomová práca',
    graduate: 'Absolventská práca',
    rigorous: 'Rigorózna práca',
    dissertation: 'Dizertačná práca',
    habilitation: 'Habilitačná práca',
    mba: 'MBA práca',
    dba: 'DBA práca',
    attestation: 'Atestačná práca',
    msc: 'MSc. práca',
  };

  return map[type] || type;
}