import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

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
