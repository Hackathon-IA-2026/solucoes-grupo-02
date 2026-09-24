import type { ReactNode } from 'react';

export function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className="rounded-full border border-line-strong px-[11px] py-[5px] text-[13px] text-ink-2 transition-colors hover:border-brand hover:text-brand aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white"
    >
      {children}
    </button>
  );
}
