import type { ReactNode } from 'react';
import { Brandmark } from '../components/Brandmark';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="grid min-h-screen md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--navy)_0%,#123A6B_62%,#17477F_100%)] px-[26px] py-8 text-white md:px-14 md:pb-11 md:pt-14">
        <svg viewBox="0 0 520 520" aria-hidden="true" className="pointer-events-none absolute -bottom-[120px] -right-20 w-[520px] opacity-[.16] [&_circle]:fill-none [&_circle]:stroke-white [&_circle]:stroke-[1.5]">
          <circle cx="300" cy="230" r="150" />
          <circle cx="300" cy="230" r="215" />
          <circle cx="170" cy="360" r="95" />
        </svg>

        <Brandmark />

        <div className="relative max-w-[30ch] py-10 md:py-0">
          <h1 className="text-[30px] font-extrabold text-white md:text-[clamp(32px,4vw,46px)]">
            O que mudou na regulação hoje, antes que vire multa.
          </h1>
          <p className="mt-4 max-w-[34ch] text-base text-[#C3D6EF]">
            Um radar único sobre ANEEL, CCEE e Diário Oficial, cruzado com o perfil da sua operação.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-7 border-t border-white/[.22] pt-5">
          {[
            { n: '142', t: 'normas lidas nos últimos 7 dias' },
            { n: '3 min', t: 'do ato publicado ao seu alerta' },
            { n: '100%', t: 'respostas com fonte rastreável' },
          ].map((f) => (
            <div key={f.n} className="min-w-[120px]">
              <b className="block font-display text-2xl font-bold tabular-nums">{f.n}</b>
              <small className="mt-0.5 block text-[12.5px] leading-snug text-[#AEC5E3]">{f.t}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center bg-surface px-8 py-10">
        <div className="w-full max-w-[372px]">{children}</div>
      </div>
    </section>
  );
}
