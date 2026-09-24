import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

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
