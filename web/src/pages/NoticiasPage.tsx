import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { PageHead, Panel } from '../components/ui';

export function NoticiasPage() {
  const { data: noticias = [], isLoading } = useQuery({ queryKey: ['noticias'], queryFn: () => api.listNoticias() });

  return (
    <section className={TELA}>
      <PageHead
        titulo="Notícias do setor"
        texto="Normas e leis não saem todo dia — aqui entram notícias do seu setor pra manter o time atualizado diariamente."
      />

      {isLoading && <p className="text-sm text-ink-2">Carregando notícias…</p>}
      {!isLoading && noticias.length === 0 && <p className="text-sm text-ink-2">Nenhuma notícia publicada ainda.</p>}

      <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {noticias.map((n) => (
          <Panel key={n.id} className="flex flex-col">
            {n.imageUrl && <img src={n.imageUrl} alt="" className="mb-3.5 h-[140px] w-full rounded-md object-cover" />}
            <div className="mb-1.5 flex items-center gap-2 text-xs text-ink-3">
              <span className="font-semibold text-ink-2">{n.source}</span>
              {n.date && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{n.date}</span>
                </>
              )}
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
