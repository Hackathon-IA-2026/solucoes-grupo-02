import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { Button, PageHead, cx } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Citation } from '../types';

interface Mensagem {
  id: string;
  autor: 'user' | 'bot';
  html: string;
  citations?: Citation[];
}

const SUGESTOES = ['Quais prazos vencem este mês?', 'O que muda no meu faturamento?', 'Preciso protocolar alguma coisa?'];
const RESPOSTA_HTML = '[&_p+p]:mt-[9px] [&_ul]:mt-[9px] [&_ul]:list-disc [&_ul]:pl-[19px] [&_li]:mt-1';

const SAUDACAO: Mensagem = {
  id: 'saudacao',
  autor: 'bot',
  html: '<p>Pergunte sobre uma norma, prazo ou obrigação. Posso responder direto ou apontar o artigo que sustenta a resposta.</p>',
};

export function CopilotPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const logRef = useRef<HTMLDivElement>(null);
  const perguntaInicial = params.get('q');

  const { data: sessoes = [] } = useQuery({ queryKey: ['chat-sessions'], queryFn: api.listChatSessions });
  const { data: mensagensSalvas = [] } = useQuery({
    queryKey: ['chat-messages', sessaoId],
    queryFn: () => api.listChatMessages(sessaoId!),
    enabled: !!sessaoId,
  });

  const enviarMutation = useMutation({
    mutationFn: async (pergunta: string) => {
      let sid = sessaoId;
      if (!sid) {
        const nova = await api.createChatSession();
        sid = nova.id;
        setSessaoId(sid);
      }
      await api.sendChatMessage(sid, pergunta);
      return sid;
    },
    onSuccess: async (sid) => {
      await qc.invalidateQueries({ queryKey: ['chat-messages', sid] });
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      setPendente([]);
    },
    onError: (e) => {
      toast(e instanceof Error ? e.message : 'O copiloto não respondeu.');
      setPendente([]);
    },
  });

  const mensagens: Mensagem[] =
    mensagensSalvas.length > 0
      ? mensagensSalvas.map((m) => ({ id: m.id, autor: m.autor, html: m.texto, citations: m.citacoes }))
      : sessaoId
        ? []
        : [SAUDACAO];

  const mensagensExibidas = [...mensagens, ...pendente];

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [mensagensExibidas.length, enviarMutation.isPending]);

  useEffect(() => {
    if (!perguntaInicial) return;
    setParams({}, { replace: true });
    void perguntar(perguntaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaInicial]);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || enviarMutation.isPending) return;
    setPendente((p) => [...p, { id: `local-${Date.now()}`, autor: 'user', html: limpa }]);
    enviarMutation.mutate(limpa);
  }

  function enviar() {
    void perguntar(texto);
    setTexto('');
  }

  return (
    <section className={TELA}>
      <PageHead titulo="Copiloto regulatório" texto="Pergunte em linguagem comum. A resposta vem com o artigo que a sustenta — e o link para conferir." />

      <div className="grid items-start gap-[18px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <div className="order-2 rounded-lg border border-line bg-surface p-3.5 lg:order-1">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-ink-2">Conversas</h3>
            <button onClick={() => setSessaoId(null)} className="text-[12.5px] font-semibold text-brand hover:underline">
              + Nova
            </button>
          </div>
          {sessoes.length === 0 && <p className="text-[12.8px] text-ink-3">Sem conversas ainda.</p>}
          {sessoes.map((s) => (
            <button
              key={s.id}
              aria-current={s.id === sessaoId}
              onClick={() => setSessaoId(s.id)}
              className="block w-full rounded-md px-2.5 py-[9px] text-left text-[13.4px] text-ink-2 hover:bg-surface-2 aria-[current=true]:bg-surface-2 aria-[current=true]:font-semibold aria-[current=true]:text-ink"
            >
              {s.titulo}
            </button>
          ))}
        </div>

        <div className="order-1 flex min-h-[440px] flex-col rounded-lg border border-line bg-surface lg:order-2 lg:h-[74vh] lg:min-h-[520px]">
          <div ref={logRef} className="flex max-h-[52vh] flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-[22px] lg:max-h-none">
            {mensagensExibidas.map((m) => (
              <div key={m.id} className={cx('flex max-w-[min(100%,760px)] gap-[11px]', m.autor === 'user' && 'flex-row-reverse self-end')}>
                <div
                  className={cx(
                    'grid h-[29px] w-[29px] shrink-0 place-items-center rounded-md text-[11.5px] font-bold',
                    m.autor === 'user' ? 'bg-brand text-white' : 'bg-navy text-accent',
                  )}
                >
                  {m.autor === 'user' ? user?.initials ?? 'EU' : 'ES'}
                </div>
                <div className={cx('rounded-md px-[15px] py-[13px] text-[14.4px]', m.autor === 'user' ? 'bg-navy text-white' : 'bg-surface-2')}>
                  {m.autor === 'user' ? <p>{m.html}</p> : <div className={RESPOSTA_HTML} dangerouslySetInnerHTML={{ __html: m.html }} />}

                  {m.citations?.length ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-[7px] border-t border-line-strong pt-[11px]">
                        {m.citations.map((c) => (
                          <button
                            key={c.label}
                            onClick={() => setAbertas((a) => ({ ...a, [`${m.id}-${c.label}`]: !a[`${m.id}-${c.label}`] }))}
                            className="rounded-full border border-brand bg-surface px-[9px] py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      {m.citations
                        .filter((c) => abertas[`${m.id}-${c.label}`])
                        .map((c) => (
                          <div
                            key={c.label}
                            className="mt-[11px] rounded-md border border-dashed border-line-strong px-[13px] py-[11px] text-[13.2px] text-ink-2"
                          >
                            <b className="mb-1 block text-[12.8px] text-ink">{c.label}</b>
                            {c.excerpt}
                            {c.url && (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[12.8px] font-semibold text-brand hover:underline">
                                Abrir documento original ↗
                              </a>
                            )}
                          </div>
                        ))}
                    </>
                  ) : null}
                </div>
              </div>
            ))}

            {enviarMutation.isPending && (
              <div className="flex gap-[11px]">
                <div className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-md bg-navy text-[11.5px] font-bold text-accent">ES</div>
                <div className="rounded-md bg-surface-2">
                  <div className="flex gap-1 p-[15px]">
                    {[0, 0.18, 0.36].map((d) => (
                      <i key={d} className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-3" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-[7px] px-6 pb-3">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => perguntar(s)}
                className="rounded-full border border-line-strong px-3 py-[7px] text-[13px] text-ink-2 hover:border-brand hover:text-brand"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2.5 border-t border-line px-[18px] py-3.5">
            <button
              aria-label="Anexar documento"
              onClick={() => toast('Anexo disponível na versão completa.')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-ink-2 stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />
              </svg>
            </button>
            <textarea
              rows={1}
              placeholder="Pergunte sobre uma norma, prazo ou obrigação"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-md border border-line-strong bg-surface px-[13px] py-[11px] focus:border-brand focus:outline-none"
            />
            <Button onClick={enviar} disabled={enviarMutation.isPending}>
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
