type Project = {
  id: string;

  title: string;
  type: "seminar" | "bachelor" | "master";

  topic: string;
  field: string;

  language: "SK" | "CZ" | "EN" | "DE" | "PL" | "HU";
  citationStyle: string;

  supervisor: string;

  annotation: string;
  goal: string;
  outline: string;

  hypotheses: string;
  methodology: string;

  keywords: string;
  chapters: number;

  createdAt: string;
};

// =====================================================
// 🧠 MOCK DB (nahradíš DB neskôr)
// =====================================================
let PROJECTS: Project[] = [];

// =====================================================
// 📥 GET – ZOZNAM PROJEKTOV
// =====================================================
export async function GET() {
  return Response.json({
    ok: true,
    count: PROJECTS.length,
    projects: PROJECTS,
  });
}

// =====================================================
// 📤 POST – VYTVORENIE PROJEKTU
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      type,
      topic,
      field,
      language,
      citationStyle,
      supervisor,
      annotation,
      goal,
      outline,
      hypotheses,
      methodology,
      keywords,
      chapters,
    } = body;

    // =====================================================
    // ❗ VALIDÁCIA (KRITICKÁ)
    // =====================================================
    if (!title || title.length < 5) {
      return Response.json({ error: "INVALID_TITLE" }, { status: 400 });
    }

    if (!topic) {
      return Response.json({ error: "TOPIC_REQUIRED" }, { status: 400 });
    }

    if (!language) {
      return Response.json({ error: "LANGUAGE_REQUIRED" }, { status: 400 });
    }

    if (!citationStyle) {
      return Response.json({ error: "CITATION_REQUIRED" }, { status: 400 });
    }

    if (!goal || goal.length < 10) {
      return Response.json({ error: "GOAL_REQUIRED" }, { status: 400 });
    }

    if (!methodology) {
      return Response.json({ error: "METHODOLOGY_REQUIRED" }, { status: 400 });
    }

    if (!chapters || chapters < 1) {
      return Response.json({ error: "INVALID_CHAPTERS" }, { status: 400 });
    }

    // =====================================================
    // 🧠 CREATE PROJECT
    // =====================================================
    const newProject: Project = {
      id: crypto.randomUUID(),

      title,
      type: type || "bachelor",

      topic,
      field: field || "",

      language,
      citationStyle,

      supervisor: supervisor || "",

      annotation: annotation || "",
      goal,
      outline: outline || "",

      hypotheses: hypotheses || "",
      methodology,

      keywords: keywords || "",
      chapters,

      createdAt: new Date().toISOString(),
    };

    PROJECTS.push(newProject);

    // =====================================================
    // 🚀 RESPONSE
    // =====================================================
    return Response.json({
      ok: true,
      message: "PROJECT_CREATED",
      project: newProject,
    });

  } catch (err: any) {
    console.error("PROJECT ERROR:", err);

    return Response.json(
      {
        error: "PROJECT_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}