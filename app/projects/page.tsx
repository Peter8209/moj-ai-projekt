'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  GripVertical,
  Home,
  Library,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';

import ProfileForm from '@/components/ProfileForm';
import { createClient } from '@/lib/supabase/client';

type SavedProfile = {
  id: string;

  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;

  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;

  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;

  keywordsList?: string[];
  keywords?: string[];

  savedAt?: string;
  created_at?: string;
  updated_at?: string;

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

type DropPosition = 'before' | 'after';

const PROJECT_ORDER_KEY = 'zedpera_projects_order';

export default function ProjectsPage() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SavedProfile | null>(
    null,
  );

  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(
    null,
  );

  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [draggedProfileId, setDraggedProfileId] = useState<string | null>(null);
  const [dragOverProfileId, setDragOverProfileId] = useState<string | null>(
    null,
  );
  const [dropPosition, setDropPosition] = useState<DropPosition>('before');

  useEffect(() => {
    loadActiveProfile();
    loadProfiles();
  }, []);

  const goToMenu = () => {
    router.push('/dashboard');
  };

  const openNewProfile = () => {
    setSelectedProfile(null);
    setEditingProfile(null);
    setProfileFormOpen(true);
  };

  const loadActiveProfile = () => {
    try {
      const activeRaw = localStorage.getItem('active_profile');
      const active = activeRaw ? JSON.parse(activeRaw) : null;

      if (active?.id) {
        setActiveProfileId(active.id);
      }
    } catch {
      setActiveProfileId(null);
    }
  };

  const getSavedOrder = () => {
    try {
      const raw = localStorage.getItem(PROJECT_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  };

  const applySavedOrder = (items: SavedProfile[]) => {
    const savedOrder = getSavedOrder();

    if (savedOrder.length === 0) {
      return [...items].sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;

        return dateB - dateA;
      });
    }

    const orderIndex = new Map<string, number>();

    savedOrder.forEach((id, index) => {
      orderIndex.set(id, index);
    });

    return [...items].sort((a, b) => {
      const indexA = orderIndex.has(a.id)
        ? Number(orderIndex.get(a.id))
        : Number.MAX_SAFE_INTEGER;

      const indexB = orderIndex.has(b.id)
        ? Number(orderIndex.get(b.id))
        : Number.MAX_SAFE_INTEGER;

      if (indexA !== indexB) {
        return indexA - indexB;
      }

      const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;

      return dateB - dateA;
    });
  };

  const saveProfilesLocally = (items: SavedProfile[]) => {
    localStorage.setItem('profiles_full', JSON.stringify(items));
    localStorage.setItem(
      PROJECT_ORDER_KEY,
      JSON.stringify(items.map((item) => item.id)),
    );
  };

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

          id:
            row.id ||
            full.id ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Date.now().toString()),

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
            row.business_problem ||
            full.businessProblem ||
            full.business_problem,

          businessGoal:
            row.business_goal || full.businessGoal || full.business_goal,

          implementation: row.implementation || full.implementation,

          caseStudy: row.case_study || full.caseStudy || full.case_study,

          reflection: row.reflection || full.reflection,

          sourcesRequirement:
            row.sources_requirement ||
            full.sourcesRequirement ||
            full.sources_requirement,

          keywordsList:
            row.keywords_list || full.keywordsList || full.keywords || [],

          keywords:
            row.keywords_list || full.keywords || full.keywordsList || [],

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

      const orderedProfiles = applySavedOrder(supabaseProfiles);

      setProfiles(orderedProfiles);
      saveProfilesLocally(orderedProfiles);

      const activeRaw = localStorage.getItem('active_profile');
      const active = activeRaw ? JSON.parse(activeRaw) : null;

      if (active?.id) {
        const found = orderedProfiles.find(
          (profile) => profile.id === active.id,
        );

        if (found) {
          localStorage.setItem('active_profile', JSON.stringify(found));
          localStorage.setItem('profile', JSON.stringify(found));
          setActiveProfileId(found.id);
        } else {
          setActiveProfileId(null);
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

        const orderedProfiles = applySavedOrder(normalized);

        setProfiles(orderedProfiles);
        saveProfilesLocally(orderedProfiles);

        const activeRaw = localStorage.getItem('active_profile');
        const active = activeRaw ? JSON.parse(activeRaw) : null;

        if (active?.id) {
          setActiveProfileId(active.id);
        }
      } else {
        setProfiles([]);
      }
    } catch {
      setProfiles([]);
    }
  };

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return profiles.filter((profile) => {
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

  const selectProfileForGeneration = (profile: SavedProfile) => {
    localStorage.setItem('active_profile', JSON.stringify(profile));
    localStorage.setItem('profile', JSON.stringify(profile));
    setActiveProfileId(profile.id);
  };

  const openProfile = (profile: SavedProfile) => {
    setSelectedProfile(profile);
  };

  const closeProfile = () => {
    setSelectedProfile(null);
  };

  const openEditProfile = (profile: SavedProfile) => {
    setEditingProfile(profile);
    setProfileFormOpen(true);

    localStorage.setItem('active_profile', JSON.stringify(profile));
    localStorage.setItem('profile', JSON.stringify(profile));
    setActiveProfileId(profile.id);
  };

  const closeEditProfile = () => {
    setProfileFormOpen(false);
    setEditingProfile(null);
  };

  const handleProfileSaved = (updatedProfile: SavedProfile) => {
    const normalizedProfile: SavedProfile = {
      ...updatedProfile,
      id:
        updatedProfile.id ||
        editingProfile?.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString()),
      title: updatedProfile.title || 'Bez názvu',
      savedAt:
        updatedProfile.savedAt ||
        updatedProfile.updated_at ||
        new Date().toISOString(),
    };

    const nextProfiles = profiles.some(
      (profile) => profile.id === normalizedProfile.id,
    )
      ? profiles.map((profile) =>
          profile.id === normalizedProfile.id ? normalizedProfile : profile,
        )
      : [normalizedProfile, ...profiles];

    setProfiles(nextProfiles);
    setSelectedProfile(normalizedProfile);
    setEditingProfile(null);
    setProfileFormOpen(false);
    setActiveProfileId(normalizedProfile.id);

    saveProfilesLocally(nextProfiles);
    localStorage.setItem('profile', JSON.stringify(normalizedProfile));
    localStorage.setItem('active_profile', JSON.stringify(normalizedProfile));

    void loadProfiles();
  };

  const deleteProfile = async (id: string) => {
    const confirmDelete = window.confirm(
      'Naozaj chceš odstrániť túto prácu zo zoznamu?',
    );

    if (!confirmDelete) return;

    const next = profiles.filter((profile) => profile.id !== id);

    setProfiles(next);
    saveProfilesLocally(next);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('zedpera_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('SUPABASE DELETE PROFILE ERROR:', error);
        alert(
          `Profil sa odstránil lokálne, ale nie zo Supabase: ${error.message}`,
        );
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
          localStorage.removeItem('profile');
          setActiveProfileId(null);
        }
      } catch {
        localStorage.removeItem('active_profile');
        localStorage.removeItem('profile');
        setActiveProfileId(null);
      }
    }

    if (selectedProfile?.id === id) {
      setSelectedProfile(null);
    }

    if (editingProfile?.id === id) {
      setEditingProfile(null);
      setProfileFormOpen(false);
    }
  };

  const moveProfile = (
    dragId: string,
    targetId: string,
    position: DropPosition,
  ) => {
    if (dragId === targetId) return;

    setProfiles((current) => {
      const oldIndex = current.findIndex((item) => item.id === dragId);
      const targetIndex = current.findIndex((item) => item.id === targetId);

      if (oldIndex === -1 || targetIndex === -1) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);

      const updatedTargetIndex = next.findIndex((item) => item.id === targetId);

      if (updatedTargetIndex === -1) {
        return current;
      }

      const insertIndex =
        position === 'before' ? updatedTargetIndex : updatedTargetIndex + 1;

      next.splice(insertIndex, 0, moved);

      saveProfilesLocally(next);

      return next;
    });
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    profileId: string,
  ) => {
    setDraggedProfileId(profileId);
    setDragOverProfileId(null);
    setDropPosition('before');

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', profileId);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    profileId: string,
  ) => {
    event.preventDefault();

    if (!draggedProfileId || draggedProfileId === profileId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const middleY = rect.top + rect.height / 2;

    setDragOverProfileId(profileId);
    setDropPosition(mouseY < middleY ? 'before' : 'after');
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    targetProfileId: string,
  ) => {
    event.preventDefault();

    const dragId =
      draggedProfileId || event.dataTransfer.getData('text/plain') || '';

    if (dragId) {
      moveProfile(dragId, targetProfileId, dropPosition);
    }

    setDraggedProfileId(null);
    setDragOverProfileId(null);
    setDropPosition('before');
  };

  const handleDragEnd = () => {
    setDraggedProfileId(null);
    setDragOverProfileId(null);
    setDropPosition('before');
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#020617] text-white">
      <div className="mx-auto min-h-full max-w-7xl px-4 pb-32 pt-4 md:px-8 md:pb-40 md:pt-6">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={goToMenu}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black text-white transition hover:border-violet-400/50 hover:bg-white/[0.14]"
            >
              <Home className="h-5 w-5" />
              Menu
            </button>

            <button
              type="button"
              onClick={openNewProfile}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-violet-950/30 transition hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Nová práca
            </button>
          </div>

          <div className="relative w-full xl:w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hľadať podľa názvu, odboru, vedúceho..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </div>
        </div>

        {draggedProfileId && (
          <div className="sticky top-3 z-30 mb-5 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-5 py-4 text-sm font-black text-violet-100 shadow-2xl shadow-violet-950/30 backdrop-blur">
            Presúvaš kartu. Nájdi miesto a pusti ju na fialový pás „Pusti sem“.
          </div>
        )}

        {filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-violet-300" />

            <h2 className="text-2xl font-black">Zatiaľ nemáš uložené práce</h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Klikni na tlačidlo Nová práca. Po vyplnení a uložení sa práca
              automaticky zobrazí v tomto zozname.
            </p>

            <button
              type="button"
              onClick={openNewProfile}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 font-black text-white transition hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Nová práca
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => {
              const isActive = activeProfileId === profile.id;
              const isDragging = draggedProfileId === profile.id;
              const isDragOver = dragOverProfileId === profile.id;

              return (
                <div key={profile.id} className="relative">
                  {isDragOver && dropPosition === 'before' && (
                    <DropIndicator text="Pusti sem – karta sa vloží pred túto prácu" />
                  )}

                  <article
                    onDragOver={(event) => handleDragOver(event, profile.id)}
                    onDrop={(event) => handleDrop(event, profile.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative rounded-3xl border p-5 transition duration-200 ${
                      isActive
                        ? 'border-emerald-400/50 bg-emerald-500/[0.055]'
                        : 'border-white/10 bg-white/[0.045] hover:border-violet-400/50 hover:bg-white/[0.07]'
                    } ${
                      isDragging
                        ? 'scale-[0.97] border-violet-400 bg-violet-500/10 opacity-45 ring-4 ring-violet-400/30'
                        : ''
                    } ${
                      isDragOver
                        ? 'scale-[1.01] border-violet-300 bg-violet-500/[0.12] shadow-2xl shadow-violet-950/40 ring-4 ring-violet-400/40'
                        : ''
                    }`}
                  >
                    {isDragOver && (
                      <div className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-dashed border-violet-300/70" />
                    )}

                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) =>
                          handleDragStart(event, profile.id)
                        }
                        onDragEnd={handleDragEnd}
                        className={`inline-flex cursor-grab items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition active:cursor-grabbing ${
                          isDragging
                            ? 'border-violet-300 bg-violet-600 text-white'
                            : 'border-violet-400/40 bg-violet-500/15 text-violet-100 hover:border-violet-300 hover:bg-violet-500/25'
                        }`}
                        aria-label="Presunúť kartu"
                      >
                        <GripVertical className="h-4 w-4" />
                        Presuň kartu
                      </button>

                      {isActive && (
                        <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-200">
                          Aktívna
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openProfile(profile)}
                      className="block w-full text-left"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-200'
                              : 'bg-violet-500/15 text-violet-200'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-violet-600/20 text-violet-200'
                          }`}
                        >
                          {isActive
                            ? 'Vybratá práca'
                            : profile.schema?.label ||
                              formatWorkType(profile.type)}
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
                            <span className="line-clamp-1">
                              {profile.field}
                            </span>
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

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => selectProfileForGeneration(profile)}
                        className={`rounded-xl px-4 py-2 text-sm font-black text-white transition ${
                          isActive
                            ? 'bg-emerald-600 hover:bg-emerald-500'
                            : 'bg-violet-600 hover:bg-violet-500'
                        }`}
                      >
                        {isActive
                          ? 'Táto práca je vybratá'
                          : 'Vybrať na generovanie'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openProfile(profile)}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.1]"
                      >
                        Otvoriť
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
                        className="ml-auto rounded-xl bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                        aria-label="Odstrániť prácu"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </article>

                  {isDragOver && dropPosition === 'after' && (
                    <DropIndicator text="Pusti sem – karta sa vloží za túto prácu" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-[#020617] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                  Detail práce
                </div>

                <h2 className="text-2xl font-black text-white">
                  {selectedProfile.title || 'Bez názvu'}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Tu môžeš prácu otvoriť, upraviť alebo vybrať na generovanie
                  textu.
                </p>
              </div>

              <button
                type="button"
                onClick={closeProfile}
                className="rounded-2xl bg-red-500/90 p-3 text-white transition hover:bg-red-400"
                aria-label="Zavrieť profil"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto">
              <ProjectDetail
                profile={selectedProfile}
                activeProfileId={activeProfileId}
                onBack={closeProfile}
                onDelete={() => deleteProfile(selectedProfile.id)}
                onEdit={() => openEditProfile(selectedProfile)}
                onSelect={() => selectProfileForGeneration(selectedProfile)}
              />
            </div>
          </div>
        </div>
      )}

      {profileFormOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
            <ProfileForm
              initialProfile={editingProfile as any}
              onSave={(updatedProfile) =>
                handleProfileSaved(updatedProfile as any)
              }
              onClose={closeEditProfile}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function DropIndicator({ text }: { text: string }) {
  return (
    <div className="my-3 flex items-center gap-3 rounded-2xl border border-violet-300/60 bg-violet-600/25 px-4 py-3 text-sm font-black text-violet-50 shadow-2xl shadow-violet-950/40 ring-2 ring-violet-400/30">
      <div className="h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_22px_rgba(221,214,254,0.9)]" />
      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300" />
      <span className="shrink-0">{text}</span>
      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300" />
      <div className="h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_22px_rgba(221,214,254,0.9)]" />
    </div>
  );
}

function ProjectDetail({
  profile,
  activeProfileId,
  onBack,
  onDelete,
  onEdit,
  onSelect,
}: {
  profile: SavedProfile;
  activeProfileId: string | null;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
}) {
  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  const isActive = activeProfileId === profile.id;

  return (
    <div className="bg-[#020617] text-white">
      <div className="px-6 py-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-bold text-slate-200 transition hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-5 w-5" />
            Zavrieť detail
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSelect}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-black text-white transition ${
                isActive
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-violet-600 hover:bg-violet-500'
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {isActive ? 'Táto práca je vybratá' : 'Vybrať na generovanie'}
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 font-bold text-violet-100 transition hover:bg-violet-500/20"
            >
              <FileText className="h-5 w-5" />
              Upraviť
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
            >
              <Trash2 className="h-5 w-5" />
              Odstrániť
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div
                className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                  isActive
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-violet-400/30 bg-violet-500/10 text-violet-200'
                }`}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Práca vybratá na generovanie
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Detail práce
                  </>
                )}
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
            <InfoCard
              label="Typ práce"
              value={profile.schema?.label || profile.type}
            />
            <InfoCard label="Odbornosť" value={profile.level} />
            <InfoCard label="Jazyk rozhrania" value={profile.language} />
            <InfoCard label="Jazyk práce" value={profile.workLanguage} />
            <InfoCard label="Citovanie" value={profile.citation} />
            <InfoCard label="Odbor / predmet / oblasť" value={profile.field} />
            <InfoCard
              label="Vedúci práce / školiteľ"
              value={profile.supervisor}
            />
            <InfoCard label="Téma" value={profile.topic} />
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <LongCard label="Anotácia" value={profile.annotation} />
            <LongCard label="Cieľ práce" value={profile.goal} />
            <LongCard label="Výskumný problém" value={profile.problem} />
            <LongCard label="Metodológia" value={profile.methodology} />
            <LongCard label="Hypotézy" value={profile.hypotheses} />
            <LongCard
              label="Výskumné otázky"
              value={profile.researchQuestions}
            />
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
    </div>
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