import { cx } from '../../utils/cx';

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
        <b className="font-semibold tabular-nums">
          {valor}
          {unidade ? ` ${unidade}` : ''}
        </b>
      </div>
      <div className="relative mt-[7px] h-[7px] rounded-full bg-surface-2">
        <i className={cx('absolute inset-y-0 left-0 block rounded-full', TRILHA[estado])} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        <span className="absolute -top-1 h-[15px] w-0.5 rounded-sm bg-ink opacity-55" style={{ left: `calc(${Math.min(100, tickPct)}% - 1px)` }} />
      </div>
      <small className="mt-1.5 block text-xs text-ink-3">{nota}</small>
    </div>
  );
}
