import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { TELA } from '../components/AppShell';
import { Button, ImpactBadge, PageHead, SrcBadge, cx } from '../components/ui';
import { useToast } from '../context/ToastContext';

export function SummariesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: normas = [] } = useQuery({ queryKey: ['norms', 'todas'], queryFn: () => api.listNorms('todas') });
  const [ativa, setAtiva] = useState<string | null>(params.get('norma'));

  useEffect(() => {
    if (!ativa && normas.length) setAtiva(normas[0].id);
  }, [normas, ativa]);

  const norma = normas.find((n) => n.id === ativa);

  return (
    <section className={TELA}>
      <PageHead
        titulo="Resumos das normas"
        texto="Cada publicação vira um resumo curto, com o trecho de origem preservado e link para o documento oficial."
      />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.4fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-surface lg:max-h-[74vh] lg:overflow-y-auto" role="listbox" aria-label="Normas resumidas">
          {normas.map((n) => (
            <button
              key={n.id}
              role="option"
              aria-selected={n.id === ativa}
              onClick={() => setAtiva(n.id)}
              className={cx(
                'block w-full border-b border-l-[3px] border-line px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-surface-2',
                n.id === ativa ? 'border-l-accent bg-surface-2' : 'border-l-transparent',
              )}
            >
              <span className="text-[12.4px] tabular-nums text-ink-3">{n.code}</span>
              <span className="mt-[3px] block font-display text-[14.3px] font-semibold leading-snug">{n.title}</span>
              <span className="mt-[7px] flex flex-wrap items-center gap-[7px]">
                <SrcBadge source={n.source} label={n.sourceLabel} />
                <ImpactBadge impact={n.impact} />
                <span className="text-xs tabular-nums text-ink-3">{n.date}</span>
              </span>
            </button>
          ))}
        </div>

        <article className="rounded-lg border border-line bg-surface p-5 md:px-7 md:py-[26px]">
          {!norma && <p className="text-ink-2">Selecione uma norma na lista ao lado.</p>}
          {norma && (
            <>
              <p className="text-[13px] tabular-nums text-ink-3">{norma.code}</p>
              <h2 className="mt-1.5 max-w-[32ch] text-[23px] font-bold">{norma.title}</h2>

              <div className="mt-3 flex flex-wrap items-center gap-[9px] border-b border-line pb-4">
                <SrcBadge source={norma.source} label={norma.sourceLabel} />
                <ImpactBadge impact={norma.impact} />
                <span className="text-[13px] text-ink-2">{norma.deadline}</span>
              </div>

              <h4 className="mt-[22px] text-[13px] font-bold text-ink-2">O que muda</h4>
              <ul className="mt-[9px] list-disc pl-5">
                {norma.changes.map((m) => (
                  <li key={m} className="mt-1.5 max-w-[72ch] text-[14.4px]">
                    {m}
                  </li>
                ))}
              </ul>

              <h4 className="mt-[22px] text-[13px] font-bold text-ink-2">Por que importa para a sua operação</h4>
              <p className="mt-3 max-w-[72ch] rounded-r-sm border-l-[3px] border-accent bg-surface-2 px-[15px] py-[13px] text-sm">{norma.why}</p>

              <div className="mt-6 flex flex-wrap gap-2.5 border-t border-line pt-[18px]">
                <Button onClick={() => navigate(`/copiloto?q=${encodeURIComponent(`${norma.title} — o que eu preciso fazer e até quando?`)}`)}>
                  Perguntar ao copiloto
                </Button>
                <Button variante="ghost" onClick={() => (norma.url ? window.open(norma.url, '_blank') : toast('O documento oficial abriria em nova aba.'))}>
                  Abrir documento original
                </Button>
                <Button variante="ghost" onClick={() => toast('Resumo baixado em PDF.')}>
                  Baixar resumo em PDF
                </Button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
