import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { Chip, PageHead, Panel } from '../components/ui';
import type { Escopo } from '../types';

export function NoticiasPage() {
  const [escopo, setEscopo] = useState<Escopo>('minhas');
  const { data: noticias = [], isLoading } = useQuery({ queryKey: ['noticias', escopo], queryFn: () => api.listNoticias(undefined, escopo) });

  return (
    <section className={TELA}>
      <PageHead
        titulo="Notícias do setor"
        texto="Normas e leis não saem todo dia — aqui entram notícias do seu setor pra manter o time atualizado diariamente."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Chip ativo={escopo === 'minhas'} onClick={() => setEscopo(escopo === 'minhas' ? 'todas' : 'minhas')}>
          Só minhas áreas
        </Chip>
        <span className="text-[12.8px] text-ink-3">Fontes: ABSOLAR, ABEEólica, PV Magazine Brasil, MegaWhat, ANEEL e MME.</span>
      </div>

      {isLoading && <p className="text-sm text-ink-2">Carregando notícias…</p>}
      {!isLoading && noticias.length === 0 && (
        <p className="text-sm text-ink-2">
          {escopo === 'minhas'
            ? 'Nenhuma notícia das áreas que a sua empresa monitora ainda. Desmarque "Só minhas áreas" ou ajuste as áreas na Central de Alertas.'
            : 'Nenhuma notícia coletada ainda.'}
        </p>
      )}

      <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {noticias.map((n) => (
          <Panel key={n.id} className="flex flex-col">
            {n.imageUrl && (
              <img
                src={n.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                className="mb-3.5 h-[140px] w-full rounded-md object-cover"
              />
            )}
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <span className="font-semibold text-ink-2">{n.source}</span>
              {n.date && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{n.date}</span>
                </>
              )}
              {(n.setores?.length ? n.setores : n.setor ? [n.setor] : []).map((s) => (
                <span key={s} className="rounded-full border border-line px-2 py-px text-[11.5px] text-ink-2">
                  {s}
                </span>
              ))}
            </div>
            <h3 className="font-display text-[15px] font-semibold leading-snug">{n.title}</h3>
            <p className="mt-1.5 flex-1 text-[13.6px] text-ink-2">{n.summary}</p>
            {n.url && (
              <a href={n.url} target="_blank" rel="noreferrer" className="mt-3 text-[13px] font-medium text-brand hover:underline">
                Ler notícia completa
              </a>
            )}
          </Panel>
        ))}
      </div>
    </section>
  );
}
