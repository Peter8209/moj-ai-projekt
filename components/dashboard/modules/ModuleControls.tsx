"use client";

import type { ReactNode } from "react";

type Option = {
  value: string;
  label: string;
};

export function ModuleControlGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function ModuleSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#070b18] px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-400/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModuleDateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#070b18] px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-400/60"
      />
    </label>
  );
}
