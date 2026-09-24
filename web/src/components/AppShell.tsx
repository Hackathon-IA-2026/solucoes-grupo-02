import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, MODO_MOCK } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Brandmark } from './Brandmark';

const ITENS = [
  { to: '/painel', rotulo: 'Painel', icone: <><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></> },
  { to: '/alertas', rotulo: 'Alertas', icone: <><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.5 20a2 2 0 0 0 3 0" /></> },
  { to: '/resumos', rotulo: 'Resumos', icone: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></> },
  { to: '/noticias', rotulo: 'Notícias', icone: <><rect x="3" y="4" width="14" height="16" rx="1" /><path d="M17 8h3v11a1 1 0 0 1-1 1h-2" /><path d="M7 8h6M7 11h6M7 14h4" /></> },
  { to: '/copiloto', rotulo: 'Copiloto', icone: <><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 7V4" /><path d="M9 12h.01M15 12h.01M9.5 16h5" /></> },
  { to: '/perfil', rotulo: 'Perfil', icone: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></> },
];

const LINK =
  'relative flex flex-1 flex-col items-center justify-center gap-[3px] rounded-md px-0.5 py-[7px] text-center text-[10.5px] font-medium text-[#B9CDE6] no-underline transition-colors hover:bg-white/[.07] hover:text-white aria-[current=page]:bg-white/[.13] aria-[current=page]:text-white aria-[current=page]:shadow-[inset_0_3px_0_var(--accent)] md:w-full md:flex-none md:flex-row md:items-center md:justify-start md:gap-[11px] md:px-3 md:py-2.5 md:text-left md:text-[14.5px] md:aria-[current=page]:shadow-[inset_3px_0_0_var(--accent)]';

const ICONE_BOTAO =
  'relative grid h-9 w-9 place-items-center rounded-md border border-line hover:bg-surface-2';

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: usina } = useQuery({ queryKey: ['plant'], queryFn: api.getPlant });
  const { data: alertas } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts });
  const naoLidos = alertas?.filter((a) => !a.lido).length ?? 0;

  return (
    <div className="grid min-h-screen md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="fixed inset-x-0 bottom-0 z-40 flex flex-row items-center gap-0 border-t border-white/[.12] bg-navy px-2.5 py-2 text-white md:sticky md:inset-x-auto md:top-0 md:h-screen md:flex-col md:items-stretch md:gap-[26px] md:border-t-0 md:px-4 md:py-[22px]">
        <Brandmark className="hidden md:flex [&>div]:text-[19px] [&>svg]:h-8 [&>svg]:w-8" />

        <nav className="flex w-full flex-row gap-0 md:flex-col md:gap-0.5">
          {ITENS.map((i) => (
            <NavLink key={i.to} to={i.to} className={LINK}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]">
                {i.icone}
              </svg>
              {i.rotulo}
              {i.to === '/alertas' && naoLidos ? (
                <span className="absolute right-[calc(50%-20px)] top-0.5 rounded-full bg-accent px-[5px] text-[10px] font-bold tabular-nums text-accent-on md:static md:ml-auto md:px-[7px] md:py-px md:text-[11.5px]">
                  {naoLidos}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-white/[.14] pt-3.5 text-[11.5px] leading-relaxed text-[#84A0C2] md:block">
          Grupo 2 — Hackathon IA 2026
          <br />
          {MODO_MOCK ? 'Dados locais (mock)' : 'Conectado à API'}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3.5 border-b border-line bg-surface px-4 py-[11px] md:px-7 md:py-3.5">
          <div className="flex items-center gap-2.5 rounded-full border border-line-strong py-1.5 pl-2.5 pr-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-ok" />
            <strong className="text-sm font-semibold">{usina?.name ?? 'Carregando…'}</strong>
            <span className="text-[13px] text-ink-3">{usina ? `${usina.kind} · ${usina.capacityMw} MW · ${usina.submarket}` : ''}</span>
          </div>

          <div className="relative min-w-[160px] max-w-[380px] flex-1">
            <svg viewBox="0 0 24 24" className="absolute left-[11px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 fill-none stroke-ink-3 stroke-2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              aria-label="Buscar norma"
              placeholder="Buscar norma, artigo ou tema"
              className="w-full rounded-md border border-line bg-surface-2 py-[9px] pl-[34px] pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {MODO_MOCK && <span className="rounded-full border border-dashed border-line-strong px-[9px] py-[3px] text-[11.5px] text-ink-2">dados fictícios</span>}
            <button className={ICONE_BOTAO} aria-label="Alertas" onClick={() => navigate('/alertas')}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-ink-2 stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                <path d="M10.5 20a2 2 0 0 0 3 0" />
              </svg>
              {naoLidos ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-danger px-1 text-[10.5px] font-bold tabular-nums text-white">
                  {naoLidos}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => navigate('/perfil')}
              aria-label="Abrir perfil"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand text-[13.5px] font-bold text-white"
            >
              {user?.initials ?? 'ES'}
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}

export const TELA = 'w-full max-w-[1240px] px-4 pb-24 pt-[18px] md:px-7 md:pb-[60px] md:pt-[26px]';
