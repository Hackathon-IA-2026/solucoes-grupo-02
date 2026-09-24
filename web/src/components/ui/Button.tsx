import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

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
