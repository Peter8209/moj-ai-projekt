'use client';

type TranslationLoadingOverlayProps = {
  visible: boolean;
  progress: number;
  languageLabel?: string;
};

export default function TranslationLoadingOverlay({
  visible,
  progress,
  languageLabel,
}: TranslationLoadingOverlayProps) {
  if (!visible) return null;

  const safeProgress = Math.min(100, Math.max(0, Math.round(progress || 0)));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-slate-950 p-8 text-center shadow-2xl shadow-black/50">
        <div className="mx-auto mb-6 flex h-36 w-36 items-center justify-center">
          <div className="relative h-32 w-32">
            <svg
              className="h-32 w-32 -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="10"
              />

              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#translationGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-300 ease-out"
              />

              <defs>
                <linearGradient
                  id="translationGradient"
                  x1="0"
                  y1="0"
                  x2="120"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <div>
                <div className="text-3xl font-black text-white">
                  {safeProgress}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-black text-white">
          Prekladám rozhranie...
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Prosím počkaj, systém postupne prekladá všetky texty rozhrania.
        </p>

        {languageLabel ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-violet-100">
            Cieľový jazyk: {languageLabel}
          </p>
        ) : null}

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}