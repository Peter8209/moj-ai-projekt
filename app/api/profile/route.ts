type Profile = {
  id: string;

  // ===============================
  // 📘 ZÁKLAD
  // ===============================
  workType: "seminar" | "bachelor" | "master";
  title: string;
  topic: string;
  field: string;

  // ===============================
  // 🌍 JAZYK + CITÁCIE
  // ===============================
  language: "SK" | "CZ" | "EN" | "DE" | "PL" | "HU";
  citationStyle: "APA" | "ISO" | "MLA" | "HARVARD";

  // ===============================
  // 🎓 VEDÚCI
  // ===============================
  supervisor: string;

  // ===============================
  // 📄 OBSAH
  // ===============================
  annotation: string;
  goal: string;
  outline: string;

  hypotheses: string;
  methodology: string;

  keywords: string;
  chapters: number;

  // ===============================
  // ⚙️ META
  // ===============================
  createdAt: string;
  updatedAt: string;
};

// =====================================================
// 🧠 MOCK DB (zatím)
// =====================================================
let PROFILE: Profile | null = null;

// =====================================================
// 📥 GET – načítanie profilu
// =====================================================
export async function GET() {
  return Response.json({
    ok: true,
    profile: PROFILE,
    exists: !!PROFILE,
  });
}

// =====================================================
// 📤 POST – vytvorenie / update
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      workType,
      title,
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
    // ❗ VALIDÁCIA (NAJDÔLEŽITEJŠIA ČASŤ)
    // =====================================================

    if (!workType) {
      return Response.json({ error: "WORK_TYPE_REQUIRED" }, { status: 400 });
    }

    if (!title || title.length < 5) {
      return Response.json({ error: "INVALID_TITLE" }, { status: 400 });
    }

    if (!topic || topic.length < 5) {
      return Response.json({ error: "INVALID_TOPIC" }, { status: 400 });
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

    if (!chapters || chapters < 1 || chapters > 30) {
      return Response.json({ error: "INVALID_CHAPTERS" }, { status: 400 });
    }

    // =====================================================
    // 🧠 CREATE / UPDATE PROFILE
    // =====================================================
    const now = new Date().toISOString();

    const newProfile: Profile = {
      id: PROFILE?.id || crypto.randomUUID(),

      workType,
      title,
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

      createdAt: PROFILE?.createdAt || now,
      updatedAt: now,
    };

    PROFILE = newProfile;

    // =====================================================
    // 🎯 RESPONSE
    // =====================================================
    return Response.json({
      ok: true,
      message: PROFILE ? "PROFILE_UPDATED" : "PROFILE_CREATED",
      profile: newProfile,
    });

  } catch (err: any) {
    console.error("PROFILE ERROR:", err);

    return Response.json(
      {
        error: "PROFILE_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}