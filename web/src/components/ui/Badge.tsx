import type { Impact, Source } from '../../types';
import { cx } from '../../utils/cx';

const SRC_COR: Record<Source, string> = {
  aneel: 'border-brand text-brand',
  ccee: 'border-ok text-ok',
  dou: 'border-ink-2 text-ink-2',
};

export function SrcBadge({ source, label }: { source: Source; label: string }) {
  return <span className={cx('rounded-sm border px-[7px] py-0.5 text-[11.5px] font-bold', SRC_COR[source])}>{label}</span>;
}

const IMPACTO_COR: Record<Impact, string> = {
  alto: 'bg-danger-soft text-danger',
  medio: 'bg-warn-soft text-warn',
  baixo: 'bg-brand-soft text-brand',
};

export function ImpactBadge({ impact }: { impact: Impact }) {
  return <span className={cx('rounded-sm px-2 py-0.5 text-[11.5px] font-bold', IMPACTO_COR[impact])}>Impacto {impact}</span>;
}

const TAG_COR: Record<Impact, string> = {
  alto: 'bg-danger text-white',
  medio: 'bg-accent text-accent-on',
  baixo: 'bg-white/[.16] text-[#D7E5F6]',
};

export function TagImpacto({ impact }: { impact: Impact }) {
  return <span className={cx('rounded-sm px-2 py-[3px] text-[11.5px] font-semibold', TAG_COR[impact])}>Impacto {impact}</span>;
}
