import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, MODO_MOCK } from '../services/api';
import { TELA } from '../components/AppShell';
import { Button, Chip, ImpactBadge, LimitBar, Panel, PanelTitle, SrcBadge, TagImpacto, cx, fmt } from '../components/ui';
import { diasAte } from '../utils/format';
import type { Escopo, Source } from '../types';

const FILTROS: Array<{ id: Source | 'todas'; rotulo: string }> = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'aneel', rotulo: 'ANEEL' },
  { id: 'ccee', rotulo: 'CCEE' },
  { id: 'dou', rotulo: 'DOU' },
];

const BARRA: Record<string, string> = { alto: 'bg-danger', medio: 'bg-accent', baixo: 'bg-brand' };

export function DashboardPage() {
  const [filtro, setFiltro] = useState<Source | 'todas'>('todas');
  const [escopo, setEscopo] = useState<Escopo>('minhas');
  const navigate = useNavigate();
  const { data: usina } = useQuery({ queryKey: ['plant'], queryFn: api.getPlant });
  const { data: normas = [], isLoading } = useQuery({ queryKey: ['norms', filtro, escopo], queryFn: () => api.listNorms(filtro, escopo) });
  const { data: todas = [] } = useQuery({ queryKey: ['norms', 'todas', escopo], queryFn: () => api.listNorms('todas', escopo) });
  const { data: alertas = [] } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts });

  // Norma sem data de publicação (dados do mock) conta como recente.
  const recentes = todas.filter((n) => !n.publishedAt || diasAte(n.publishedAt) >= -7);
  const prazosDaSemana = todas.filter((n) => n.deadlineAt && diasAte(n.deadlineAt) >= 0 && diasAte(n.deadlineAt) <= 7).length;
  const naoLidos = alertas.filter((a) => !a.lido).length;
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const destaque = todas.find((n) => n.impact === 'alto') ?? todas[0];
  const margemCo2 = usina ? (1 - usina.co2 / usina.co2Limit) * 100 : 0;

  return (
    <section className={TELA}>
      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-lg bg-navy px-[26px] pb-[22px] pt-[26px] text-white">
          <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute -right-[30px] -top-[30px] w-[210px] opacity-10">
            <path d="M58 8 26 56h18l-8 36 38-52H56z" fill="#fff" />
          </svg>

          <p className="text-[13px] font-medium text-[#9FBCDE]">{hoje.charAt(0).toUpperCase() + hoje.slice(1)}</p>
          <h2 className="mt-2 max-w-[22ch] text-[clamp(22px,2.4vw,30px)] font-extrabold text-white">
            {recentes.length} publicações dos últimos 7 dias tocam a <em className="not-italic text-accent">{usina?.name.replace('Usina ', '') ?? 'sua usina'}</em>.
          </h2>

          {destaque && (
            <div className="mt-5 rounded-md border border-white/[.16] bg-white/[.08] px-4 py-[15px]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-white/[.18] px-2 py-[3px] text-[11.5px] font-semibold text-white">{destaque.sourceLabel}</span>
                <TagImpacto impact={destaque.impact} />
                <span className="text-[12.5px] font-semibold text-accent">{destaque.deadline}</span>
              </div>
              <h3 className="text-base font-semibold leading-snug text-white">{destaque.title}</h3>
              <p className="mt-1.5 text-[13.8px] text-[#C4D8F0]">{destaque.lead}</p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <Button tamanho="sm" onClick={() => navigate(`/resumos?norma=${destaque.id}`)}>
                  Ver resumo
                </Button>
                <Button
                  tamanho="sm"
                  variante="ghostOnNavy"
                  onClick={() => navigate(`/copiloto?q=${encodeURIComponent(`${destaque.title} — o que preciso fazer e até quando?`)}`)}
                >
                  Perguntar ao copiloto
                </Button>
              </div>
            </div>
          )}
        </div>

        <Panel>
          <PanelTitle titulo="Sua operação frente aos limites" hint="Cruzamento automático entre o perfil declarado e as regras em vigor." />
          {usina && (
            <>
              <LimitBar
                titulo="Potência instalada"
                valor={fmt(usina.capacityMw)}
                unidade="MW"
                pct={(usina.capacityMw / usina.capacityLimitMw) * 100}
                tickPct={100}
                estado={usina.capacityMw > usina.capacityLimitMw ? 'bad' : 'ok'}
                nota={`Limite do enquadramento declarado: ${fmt(usina.capacityLimitMw)} MW`}
              />
              <LimitBar
                titulo="Emissão específica"
                valor={fmt(usina.co2, 2)}
                unidade="tCO₂/MWh"
                pct={(usina.co2 / usina.co2Limit) * 100}
                tickPct={100}
                estado={usina.co2 > usina.co2Limit ? 'bad' : margemCo2 < 12 ? 'warn' : 'ok'}
                nota={`Teto da faixa atual: ${fmt(usina.co2Limit, 2)} tCO₂/MWh — margem de ${fmt(margemCo2)}%`}
              />
              <LimitBar
                titulo="Disponibilidade anual"
                valor={fmt(usina.availability, 1)}
                unidade="%"
                pct={usina.availability}
                tickPct={usina.availabilityMin}
                nota={`Mínimo contratado: ${fmt(usina.availabilityMin)}%`}
              />
            </>
          )}
          <Button variante="ghost" tamanho="sm" className="mt-[18px] w-full" onClick={() => navigate('/alertas')}>
            Ajustar dados da operação
          </Button>
        </Panel>
      </div>

      <div className="mt-[18px] grid border-y border-line md:grid-cols-3">
        {[
          { n: recentes.length, t: 'normas lidas em 7 dias' },
          { n: naoLidos, t: 'alertas aguardando ação' },
          { n: prazosDaSemana, t: 'prazos vencem nos próximos 7 dias' },
        ].map((s, i) => (
          <div key={s.t} className={cx('px-[18px] py-3.5', i > 0 && 'border-t border-line md:border-l md:border-t-0')}>
            <b className="block font-display text-2xl font-bold tabular-nums">{s.n}</b>
            <span className="text-[13px] text-ink-2">{s.t}</span>
          </div>
        ))}
      </div>

      <div className="mb-3 mt-[30px] flex flex-wrap items-baseline justify-between gap-3.5">
        <h2 className="text-lg font-bold">Radar regulatório</h2>
        <div className="flex flex-wrap gap-1.5">
          <Chip ativo={escopo === 'minhas'} onClick={() => setEscopo(escopo === 'minhas' ? 'todas' : 'minhas')}>
            Só minhas áreas
          </Chip>
          <span className="mx-1 w-px self-stretch bg-line-strong" aria-hidden="true" />
          {FILTROS.map((f) => (
            <button
              key={f.id}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className="rounded-full border border-line-strong px-[11px] py-[5px] text-[13px] text-ink-2 transition-colors hover:border-brand hover:text-brand aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white"
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {isLoading && <div className="px-5 py-[26px] text-sm text-ink-2">Carregando o radar…</div>}
        {!isLoading && normas.length === 0 && (
          <div className="px-5 py-[26px] text-sm text-ink-2">
            {escopo === 'minhas'
              ? 'Nenhuma publicação dessa fonte nas áreas que a sua empresa monitora. Desmarque "Só minhas áreas" para ver o restante do radar.'
              : 'Nenhuma publicação dessa fonte. Amplie o filtro para ver o restante do radar.'}
          </div>
        )}
        {normas.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(`/resumos?norma=${n.id}`)}
            className="grid w-full grid-cols-[4px_minmax(0,1fr)_auto] border-b border-line text-left transition-colors last:border-b-0 hover:bg-surface-2"
          >
            <span className={BARRA[n.impact]} />
            <span className="min-w-0 px-[18px] py-[15px]">
              <span className="mb-1.5 flex flex-wrap items-center gap-2">
                <SrcBadge source={n.source} label={n.sourceLabel} />
                <ImpactBadge impact={n.impact} />
              </span>
              <span className="block font-display text-[15px] font-semibold leading-snug">{n.title}</span>
              <span className="mt-1 block max-w-[78ch] text-[13.6px] text-ink-2">{n.lead}</span>
            </span>
            <span className="flex flex-col justify-center gap-1 whitespace-nowrap px-[18px] py-[15px] text-right text-[12.8px] text-ink-3">
              <span className="tabular-nums">{n.date}</span>
              <span>ver resumo</span>
            </span>
          </button>
        ))}
      </div>

      {MODO_MOCK && (
        <p className="mt-[34px] max-w-[70ch] text-[12.3px] text-ink-3">
          Rodando com dados locais. Normas, números e alertas são fictícios — troque VITE_USE_MOCK para false quando a API estiver no ar.
        </p>
      )}
    </section>
  );
}
