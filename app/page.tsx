'use client';

import { useChat } from '@ai-sdk/react';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  History,
  Home,
  Languages,
  Library,
  Mail,
  Mic,
  Paperclip,
  Plus,
  Presentation,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  Video,
  Wand2,
} from 'lucide-react';

type Mode = 'write' | 'sources' | 'supervisor' | 'defense' | 'audit' | 'translate' | 'analysis' | 'planning' | 'email';
type View = 'dashboard' | 'chat' | 'projects' | 'profile' | 'sources' | 'pricing' | 'video' | 'history' | 'settings';

const featureCards: Array<{ mode: Mode; title: string; subtitle: string; icon: any; badge?: string }> = [
  { mode: 'write', title: 'AI písanie práce', subtitle: 'Seminárka, bakalárka, diplomovka po kapitolách.', icon: FileText, badge: 'Core' },
  { mode: 'sources', title: 'Automatické zdroje', subtitle: 'Semantic Scholar, odporúčaná literatúra, citácie.', icon: Library },
  { mode: 'supervisor', title: 'AI vedúci práce', subtitle: 'Fastbot kritizuje kapitoly a pýta sa ako školiteľ.', icon: GraduationCap, badge: '+50 €' },
  { mode: 'audit', title: 'Kontrola kvality', subtitle: 'Logika, metodika, argumentácia, duplicity, skóre.', icon: FileCheck2, badge: '+50 €' },
  { mode: 'defense', title: 'Obhajoba', subtitle: 'Otázky komisie, tréning odpovedí, prezentácia.', icon: Presentation, badge: '+60 €' },
  { mode: 'translate', title: 'Preklad zdrojov', subtitle: 'SK, CZ, EN, DE, PL, HU + akademický štýl.', icon: Languages },
  { mode: 'analysis', title: 'Analýza dát', subtitle: 'Dotazníky, grafy, interpretácia praktickej časti.', icon: BarChart3, badge: 'Fáza 2' },
  { mode: 'planning', title: 'Deadline plán', subtitle: 'AI plán práce, termíny, kontrolné míľniky.', icon: CalendarDays, badge: 'Fáza 4' },
  { mode: 'email', title: 'Automatické emaily', subtitle: 'Onboarding, potvrdenia, pripomienky, podpora.', icon: Mail },
];

const projects = [
  { title: 'Diplomová práca', topic: 'AI v logistike', type: 'Diplomovka', progress: 62, language: 'SK' },
  { title: 'Seminárna práca', topic: 'Kybernetická bezpečnosť', type: 'Seminárka', progress: 28, language: 'CZ' },
  { title: 'Bakalárska práca', topic: 'Automatizácia výroby', type: 'Bakalárka', progress: 44, language: 'DE' },
];

const profileFields = [
  'Typ práce',
  'Názov práce',
  'Téma',
  'Odbor štúdia',
  'Meno vedúceho',
  'Citačný štýl',
  'Jazyk',
  'Anotácia',
  'Cieľ práce',
  'Osnova',
  'Hypotézy / výskumné otázky',
  'Metodológia',
  'Kľúčové slová',
  'Počet kapitol',
  'Počet citácií',
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-violet-500/25">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <div>
        <div className="text-xl font-black tracking-tight text-white">ZEDPERA</div>
        <div className="text-xs text-slate-400">AI vedúci práce 24/7</div>
      </div>
    </div>
  );
}

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
      {children}
    </span>
  );
}

function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: Array<[View, string, any]> = [
    ['dashboard', 'Dashboard', Home],
    ['chat', 'AI Chat', Bot],
    ['projects', 'Moje práce', BookOpen],
    ['profile', 'Profil práce', User],
    ['sources', 'Zdroje', Library],
    ['pricing', 'Balíčky', CreditCard],
    ['video', 'Video návod', Video],
    ['history', 'História', History],
    ['settings', 'Nastavenia', Settings],
  ];

  return (
    <aside className="w-72 shrink-0 border-r border-white/10 bg-[#020617]/95 p-5">
      <Logo />
      <button onClick={() => setView('profile')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 font-black text-white shadow-lg shadow-violet-900/30">
        <Plus size={18} /> Nová práca
      </button>

      <nav className="mt-6 space-y-2">
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition ${view === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon size={19} /> {label}
          </button>
        ))}
      </nav>

      <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 font-black text-emerald-100">
          <ShieldCheck size={18} /> Aktívny plán
        </div>
        <p className="mt-2 text-sm text-emerald-100/80">Mesačný plán 40 € + doplnky podľa objednávky.</p>
      </div>
    </aside>
  );
}

function Header({ view }: { view: View }) {
  const title = {
    dashboard: 'Dashboard',
    chat: 'AI Chat',
    projects: 'Moje práce',
    profile: 'Profil práce',
    sources: 'Zdroje',
    pricing: 'Balíčky a doplnky',
    video: 'Video návod',
    history: 'História',
    settings: 'Nastavenia',
  }[view];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#020617]/80 px-7 py-4 backdrop-blur-xl">
      <div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <p className="text-sm text-slate-400">Jednoduchšie ako Kontexta: používateľ vždy vidí ďalší správny krok.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white hover:bg-white/10">Podpora</button>
        <button className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-200"><Bell size={19} /></button>
      </div>
    </header>
  );
}

function Dashboard({ setView, setMode }: { setView: (v: View) => void; setMode: (m: Mode) => void }) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-600/30 via-slate-900 to-cyan-500/10 p-8 shadow-2xl shadow-violet-950/30">
        <div className="max-w-4xl">
          <Pill active>AI nástroj pre študentov</Pill>
          <h2 className="mt-5 text-4xl font-black leading-tight text-white">Zisti, čo je zlé na tvojej diplomovke skôr než vedúci.</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Nahraj kapitolu, získaj konkrétny feedback, oprav chyby a priprav sa na obhajobu bez zbytočného chaosu.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => setView('profile')} className="rounded-2xl bg-white px-6 py-3 font-black text-slate-950">Vytvoriť novú prácu</button>
            <button onClick={() => { setMode('supervisor'); setView('chat'); }} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-black text-white hover:bg-white/15">Skontrolovať kapitolu</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.mode} onClick={() => { setMode(card.mode); setView('chat'); }} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/[0.07]">
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-200"><Icon size={24} /></div>
                {card.badge && <Pill active>{card.badge}</Pill>}
              </div>
              <h3 className="text-lg font-black text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.subtitle}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-bold text-violet-200">Otvoriť <ChevronRight size={16} /></div>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-3xl font-black text-white">4</div><div className="text-sm text-slate-400">aktívne práce</div></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-3xl font-black text-white">18</div><div className="text-sm text-slate-400">nahratých zdrojov</div></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-3xl font-black text-white">72%</div><div className="text-sm text-slate-400">priemerné skóre kvality</div></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-3xl font-black text-white">12</div><div className="text-sm text-slate-400">dní do deadline</div></div>
      </section>
    </div>
  );
}

function Chat({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {

  const [agent, setAgent] = useState<string>('auto');

  const modeName = useMemo(() => ({
    write: 'AI písanie práce',
    sources: 'Automatické zdroje',
    supervisor: 'AI vedúci práce',
    defense: 'Obhajoba',
    audit: 'Kontrola kvality',
    translate: 'Preklad',
    analysis: 'Analýza dát',
    planning: 'Deadline plán',
    email: 'Automatické emaily'
  }[mode]), [mode]);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { mode, agent }
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">

      {/* ================= CHAT ================= */}
      <section className="flex min-h-[calc(100vh-150px)] flex-col rounded-[2rem] border border-white/10 bg-white/[0.035]">

        {/* HEADER */}
        <div className="border-b border-white/10 p-5">
          <h2 className="text-2xl font-black text-white">{modeName}</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {featureCards.slice(0, 6).map((f) => (
              <button
                key={f.mode}
                onClick={() => setMode(f.mode)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  mode === f.mode
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>

        {/* CHAT BODY */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          <div className="max-w-3xl rounded-3xl bg-white/10 p-5 text-slate-200">
            <b>ZEDPERA:</b>
            <p className="mt-2 text-sm text-slate-300">
              Multi-AI systém aktívny (OpenAI / Claude / Gemini / Grok / Mistral / Cohere / Perplexity)
            </p>
          </div>

          {mode === 'supervisor' && (
            <div className="max-w-4xl rounded-3xl border border-violet-400/20 bg-violet-500/10 p-5">
              <h3 className="font-black text-white mb-3">AI vedúci proces</h3>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-black/20 p-3 rounded-xl">❌ Chyby</div>
                <div className="bg-black/20 p-3 rounded-xl">✏️ Návrhy</div>
                <div className="bg-black/20 p-3 rounded-xl">📊 Skóre</div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="max-w-4xl rounded-3xl bg-white/5 p-4 text-slate-200">
              <b>{m.role}:</b> {m.content}
            </div>
          ))}
        </div>

        {/* INPUT */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">

          {/* AGENT SELECTOR */}
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {[
              ['auto', 'Auto'],
              ['openai', 'GPT'],
              ['claude', 'Claude'],
              ['gemini', 'Gemini'],
              ['grok', 'Grok'],
              ['mistral', 'Mistral'],
              ['cohere', 'Cohere'],
              ['perplexity', 'Search'],
              ['fastbot', 'Vedúci']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAgent(key)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  agent === key
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Napíš zadanie alebo vlož text..."
              className="flex-1 bg-transparent border border-white/10 px-3 py-2 rounded-xl text-white"
            />

            <button type="submit" className="bg-violet-600 px-4 py-2 rounded-xl">
              Odoslať
            </button>
          </div>
        </form>
      </section>

      {/* ================= SIDEBAR ================= */}
      <aside className="space-y-4">

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black text-white">Aktívny projekt</h3>
          <p className="text-sm text-slate-400 mt-1">
            Diplomová práca: AI v logistike
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black text-white">Kroky</h3>
          <ol className="mt-3 text-sm text-slate-300 space-y-2">
            <li>1. Vyplň profil</li>
            <li>2. Nahraj zdroje</li>
            <li>3. Generuj text</li>
            <li>4. AI vedúci</li>
            <li>5. Obhajoba</li>
          </ol>
        </div>

      </aside>
    </div>
  );
}

function Projects() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <div key={p.title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><div className="flex justify-between"><Pill>{p.type}</Pill><Pill>{p.language}</Pill></div><h3 className="mt-4 text-xl font-black text-white">{p.title}</h3><p className="mt-1 text-slate-400">{p.topic}</p><div className="mt-5 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${p.progress}%` }} /></div><button className="mt-5 w-full rounded-2xl bg-white/10 py-3 font-bold text-white">Otvoriť</button></div>)}</div>;
}

function Sources() {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-black text-white">Semantic Scholar zdroje</h2><p className="mt-2 text-slate-400">Vyhľadávanie štúdií podľa témy, abstraktu, kľúčových slov a metodológie.</p><div className="mt-6 flex gap-3"><input className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Zadaj tému alebo kľúčové slová..." /><button className="rounded-2xl bg-violet-600 px-5 font-black text-white">Vyhľadať</button></div><div className="mt-6 grid gap-3"><div className="rounded-2xl bg-white/5 p-4"><b>Výsledky sa zobrazia tu</b><p className="text-sm text-slate-400">Názov, autori, rok, abstrakt, tlačidlo „Použiť v práci“.</p></div></div></div>;
}

function Pricing() {
  const plans = [['Mesačný', '40 €'], ['3 mesiace', '70 €'], ['Ročný', '240 €']];
  const addons = [['AI vedúci práce', '50 €'], ['Kontrola kvality', '50 €'], ['Obhajoba + prezentácia', '60 €'], ['Kontrola plagiátorstva', '12 €'], ['Akademický pracovník + mentoring', 'presmerovanie']];
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3">{plans.map(([name, price]) => <div key={name} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h3 className="text-xl font-black text-white">{name}</h3><div className="mt-3 text-4xl font-black text-white">{price}</div><button className="mt-5 w-full rounded-2xl bg-violet-600 py-3 font-black text-white">Vybrať</button></div>)}</div><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h3 className="text-xl font-black text-white">Doplnkové služby</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{addons.map(([name, price]) => <div key={name} className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><span>{name}</span><b>{price}</b></div>)}</div></div></div>;
}

function VideoGuide() {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-black text-white">Video návod</h2><p className="mt-2 text-slate-400">Po platbe sa používateľ dostane sem. Jedno krátke video: vytvor prácu → nahraj zdroje → generuj → skontroluj → obhajuj.</p><div className="mt-6 grid aspect-video place-items-center rounded-3xl border border-white/10 bg-black/30"><Video size={54} className="text-violet-200" /></div></div>;
}

function HistoryView() { return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-black text-white">História práce</h2><p className="mt-2 text-slate-400">Tu bude história generovaní, auditov, otázok na obhajobu, použitých zdrojov a objednaných doplnkov.</p></div>; }
function SettingsView() { return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-black text-white">Nastavenia</h2><p className="mt-2 text-slate-400">Platby, emaily, mena EUR/CZK, notifikácie, pripojenia služieb a používateľský účet.</p></div>; }

export default function Page() {
  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.25),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.12),_transparent_35%),#020617] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar view={view} setView={setView} />
        <main className="min-w-0 flex-1">
          <Header view={view} />
          <div className="p-7">
            {view === 'dashboard' && <Dashboard setView={setView} setMode={setMode} />}
            {view === 'chat' && <Chat mode={mode} setMode={setMode} />}
            {view === 'projects' && <Projects />}
            {view === 'profile' && <Profile />}
            {view === 'sources' && <Sources />}
            {view === 'pricing' && <Pricing />}
            {view === 'video' && <VideoGuide />}
            {view === 'history' && <HistoryView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}
