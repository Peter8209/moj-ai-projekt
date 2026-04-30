'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ================= TYPES =================
type Project = {
  id: number;
  title: string;
  topic: string;
  type: string;
  progress: number;
  language: string;
};

// ================= PAGE =================
export default function ProjectsPage() {

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // ================= LOAD PROJECTS =================
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        setLoading(false);
      });
  }, []);

  // ================= CREATE PROJECT =================
  const createProject = async () => {

    const res = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Nová práca',
        topic: '',
        type: 'Seminárka',
        language: 'SK'
      })
    });

    const data = await res.json();

    setProjects(prev => [...prev, data.project]);
  };

  // ================= OPEN PROJECT =================
  const openProject = (project: Project) => {
    localStorage.setItem('active_project', JSON.stringify(project));

    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* ================= HEADER ================= */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">Moje práce</h1>
          <p className="text-gray-400 text-sm">
            Spravuj všetky svoje seminárky, bakalárky a diplomovky
          </p>
        </div>

        <button
          onClick={createProject}
          className="bg-violet-600 px-4 py-2 rounded-xl font-bold"
        >
          + Nová práca
        </button>
      </div>

      {/* ================= LOADING ================= */}
      {loading && <p>Načítavam...</p>}

      {/* ================= EMPTY ================= */}
      {!loading && projects.length === 0 && (
        <div className="text-center mt-20 text-gray-400">
          <p>Zatiaľ nemáš žiadnu prácu</p>

          <button
            onClick={createProject}
            className="mt-4 bg-violet-600 px-4 py-2 rounded-xl"
          >
            Vytvoriť prvú prácu
          </button>
        </div>
      )}

      {/* ================= PROJECTS ================= */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {projects.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >

            {/* HEADER */}
            <div className="flex justify-between text-xs text-gray-400">
              <span>{p.type}</span>
              <span>{p.language}</span>
            </div>

            {/* TITLE */}
            <h3 className="mt-3 text-xl font-black">
              {p.title}
            </h3>

            <p className="text-gray-400 text-sm mt-1">
              {p.topic || "Bez témy"}
            </p>

            {/* PROGRESS */}
            <div className="mt-5 h-2 bg-white/10 rounded-full">
              <div
                className="h-2 bg-violet-500 rounded-full"
                style={{ width: `${p.progress}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 mt-1">
              Progress: {p.progress}%
            </p>

            {/* ACTIONS */}
            <div className="mt-5 flex gap-2">

              <button
                onClick={() => openProject(p)}
                className="flex-1 bg-white/10 py-2 rounded-xl font-bold"
              >
                Otvoriť
              </button>

              <button
                onClick={() => deleteProject(p.id, setProjects)}
                className="bg-red-600 px-3 rounded-xl"
              >
                X
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

// ================= DELETE =================
async function deleteProject(id: number, setProjects: any) {

  await fetch('/api/projects', {
    method: 'DELETE',
    body: JSON.stringify({ id })
  });

  setProjects((prev: any[]) => prev.filter(p => p.id !== id));
}