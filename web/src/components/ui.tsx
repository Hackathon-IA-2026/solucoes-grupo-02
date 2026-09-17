import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import type { Impact, Source } from '../types';

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ---------- botões ---------- */

type Variante = 'accent' | 'ghost' | 'ghostOnNavy' | 'navy';

const BOTAO_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-semibold transition-[filter,background-color] disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTES: Record<Variante, string> = {
  accent: 'bg-accent text-accent-on hover:brightness-95',
  ghost: 'border-line-strong bg-transparent text-ink hover:bg-surface-2',
  ghostOnNavy: 'border-white/35 bg-transparent text-white hover:bg-white/10',
  navy: 'bg-navy text-white hover:brightness-95',
};

export function Button({
  variante = 'accent',
  tamanho = 'md',
  bloco,
  className,
  ...rest
}: { variante?: Variante; tamanho?: 'md' | 'sm'; bloco?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        BOTAO_BASE,
        VARIANTES[variante],
        tamanho === 'sm' ? 'px-3 py-[7px] text-[13.5px]' : 'px-[18px] py-[11px] text-[14.5px]',
        bloco && 'w-full py-[13px]',
        className,
      )}
      {...rest}
    />
  );
}

export function LinkButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cx('text-[13px] font-medium text-brand hover:underline', className)} {...rest} />;
}

/* ---------- campos ---------- */

export const CAMPO =
  'w-full rounded-md border border-line-strong bg-surface px-[13px] py-[11px] transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20';

export const ROTULO = 'mb-1.5 block text-[13px] font-semibold text-ink-2';

export function Field({
  label,
  id,
  children,
  className,
  ...rest
}: { label: string; id: string; children?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mt-[18px] first:mt-0">
      <label className={ROTULO} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={cx(CAMPO, className)} {...rest} />
      {children}
    </div>
  );
}

export function SelectField({
  label,
  id,
  children,
  ...rest
}: { label: string; id: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mt-[18px] first:mt-0">
      <label className={ROTULO} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={CAMPO} {...rest}>
        {children}
      </select>
    </div>
  );
}

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

export function Switch({ ativo, onToggle, label }: { ativo: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={label}
      onClick={onToggle}
      className="relative h-6 w-[42px] shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,.3)] after:transition-transform after:content-[''] aria-pressed:bg-ok aria-pressed:after:translate-x-[18px]"
    />
  );
}

export function SwitchRow({
  titulo,
  detalhe,
  ativo,
  onToggle,
}: {
  titulo: string;
  detalhe: string;
  ativo: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line py-3 last:border-b-0">
      <div>
        <div className="text-sm font-medium">{titulo}</div>
        <div className="text-[12.8px] text-ink-3">{detalhe}</div>
      </div>
      <Switch ativo={ativo} onToggle={onToggle} label={titulo} />
    </div>
  );
}

/* ---------- painéis e cabeçalhos ---------- */

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-line bg-surface p-5', className)}>{children}</div>;
}

export function PanelTitle({ titulo, hint }: { titulo: string; hint?: string }) {
  return (
    <>
      <h3 className="text-[15.5px] font-bold">{titulo}</h3>
      {hint && <p className="mt-[3px] text-[12.8px] text-ink-3">{hint}</p>}
    </>
  );
}

export function PageHead({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-[27px] font-bold">{titulo}</h1>
      <p className="mt-1.5 max-w-[66ch] text-[14.5px] text-ink-2">{texto}</p>
    </div>
  );
}

/* ---------- selos ---------- */

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

/* ---------- barra de limite ---------- */

const TRILHA: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'bg-brand',
  warn: 'bg-warn',
  bad: 'bg-danger',
};

export function LimitBar({
  titulo,
  valor,
  unidade,
  pct,
  tickPct,
  nota,
  estado = 'ok',
}: {
  titulo: string;
  valor: string;
  unidade?: string;
  pct: number;
  tickPct: number;
  nota: string;
  estado?: 'ok' | 'warn' | 'bad';
}) {
  return (
    <div className="mt-[18px]">
      <div className="flex items-baseline justify-between gap-2.5 text-[13.5px]">
        <span className="text-ink-2">{titulo}</span>
        <b className="font-semibold tabular-nums">{valor}{unidade ? ` ${unidade}` : ''}</b>
      </div>
      <div className="relative mt-[7px] h-[7px] rounded-full bg-surface-2">
        <i className={cx('absolute inset-y-0 left-0 block rounded-full', TRILHA[estado])} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        <span className="absolute -top-1 h-[15px] w-0.5 rounded-sm bg-ink opacity-55" style={{ left: `calc(${Math.min(100, tickPct)}% - 1px)` }} />
      </div>
      <small className="mt-1.5 block text-xs text-ink-3">{nota}</small>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3.5 inline-flex items-center gap-1.5 py-1 text-[13px] font-medium text-ink-2 hover:text-brand">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      Voltar para entrar
    </button>
  );
}

export const fmt = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
