import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { Button, Chip, ImpactBadge, PageHead, SrcBadge, cx } from '../components/ui';
import type { Escopo } from '../types';
import { useToast } from '../hooks/useToast';

export function SummariesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [escopo, setEscopo] = useState<Escopo>('minhas');
  const { data: normas = [], isLoading } = useQuery({ queryKey: ['norms', 'todas', escopo], queryFn: () => api.listNorms('todas', escopo) });
  const [ativa, setAtiva] = useState<string | null>(params.get('norma'));

  useEffect(() => {
    if (!ativa && normas.length) setAtiva(normas[0].id);
  }, [normas, ativa]);

  const { data: avulsa } = useQuery({
    queryKey: ['norm', ativa],
    queryFn: () => api.getNorm(ativa!),
    enabled: Boolean(ativa) && !isLoading && !normas.some((n) => n.id === ativa),
  });
  const norma = normas.find((n) => n.id === ativa) ?? avulsa;

  const baixarPdf = useMutation({
    mutationFn: (id: string) => api.getNormPdf(id),
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Não foi possível baixar o PDF.'),
  });

  return (
    <section className={TELA}>
      <PageHead
        titulo="Resumos das normas"
        texto="Cada publicação vira um resumo curto, com o trecho de origem preservado e link para o documento oficial."
      />
      <div className="-mt-2 mb-4">
        <Chip ativo={escopo === 'minhas'} onClick={() => setEscopo(escopo === 'minhas' ? 'todas' : 'minhas')}>
          Só minhas áreas
        </Chip>
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.4fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-surface lg:max-h-[74vh] lg:overflow-y-auto" role="listbox" aria-label="Normas resumidas">
          {!isLoading && normas.length === 0 && (
            <p className="px-4 py-5 text-sm text-ink-2">
              {escopo === 'minhas'
                ? 'Nenhuma norma nas áreas que a sua empresa monitora. Ajuste as áreas na Central de Alertas ou desmarque "Só minhas áreas".'
                : 'Nenhuma norma resumida ainda.'}
            </p>
          )}
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

              {norma.lead && (
                <>
                  <h4 className="mt-[22px] text-[13px] font-bold text-ink-2">Resumo</h4>
                  <p className="mt-[9px] max-w-[72ch] text-[14.4px]">{norma.lead}</p>
                </>
              )}

              {norma.changes.length > 0 && (
                <>
                  <h4 className="mt-[22px] text-[13px] font-bold text-ink-2">O que muda</h4>
                  <ul className="mt-[9px] list-disc pl-5">
                    {norma.changes.map((m, i) => (
                      <li key={`${i}-${m}`} className="mt-1.5 max-w-[72ch] text-[14.4px]">
                        {m}
                        {norma.changeSources?.[i] && (
                          <blockquote className="mt-1 border-l-2 border-line-strong pl-2.5 text-[12.8px] italic text-ink-3">
                            “{norma.changeSources[i]}”
                          </blockquote>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {norma.why && (
                <>
                  <h4 className="mt-[22px] text-[13px] font-bold text-ink-2">Por que importa para a sua operação</h4>
                  <p className="mt-3 max-w-[72ch] rounded-r-sm border-l-[3px] border-accent bg-surface-2 px-[15px] py-[13px] text-sm">{norma.why}</p>
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-2.5 border-t border-line pt-[18px]">
                <Button onClick={() => navigate(`/copiloto?q=${encodeURIComponent(`${norma.title} — o que eu preciso fazer e até quando?`)}&norma=${norma.id}`)}>
                  Perguntar ao copiloto
                </Button>
                <Button variante="ghost" onClick={() => (norma.url ? window.open(norma.url, '_blank') : toast('O documento oficial abriria em nova aba.'))}>
                  Abrir documento original
                </Button>
                <Button variante="ghost" onClick={() => baixarPdf.mutate(norma.id)} disabled={baixarPdf.isPending}>
                  {baixarPdf.isPending ? 'Gerando PDF…' : 'Baixar resumo em PDF'}
                </Button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
