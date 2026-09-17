import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { TELA } from '../components/AppShell';
import { Button, CAMPO, Chip, PageHead, Panel, PanelTitle, ROTULO, SwitchRow, cx, fmt } from '../components/ui';
import { useToast } from '../context/ToastContext';
import type { Plant } from '../types';

const AREAS = ['Eólica', 'Solar', 'Hidrelétrica', 'Biomassa', 'Térmica', 'Transmissão', 'Armazenamento'];
const SUBAREAS = ['Outorga e autorização', 'Tarifas e encargos', 'Conexão e acesso', 'Geração distribuída', 'Leilões', 'Licenciamento ambiental', 'Medição e faturamento'];
const FREQUENCIAS = ['Imediato', 'Resumo diário', 'Resumo semanal'];
const SUBMERCADOS = ['Nordeste', 'Sudeste/Centro-Oeste', 'Sul', 'Norte'];
const AMBIENTES = ['Livre (ACL)', 'Regulado (ACR)', 'Ambos'];

const SEV: Record<string, string> = { alto: 'bg-danger', medio: 'bg-accent', baixo: 'bg-brand' };

export function AlertsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['plant'], queryFn: api.getPlant });
  const { data: alertas = [] } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts });
  const [form, setForm] = useState<Plant | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const salvar = useMutation({
    mutationFn: (p: Partial<Plant>) => api.updatePlant(p),
    onSuccess: (p) => {
      qc.setQueryData(['plant'], p);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast(`Configuração salva. Alertas ativos para ${p.areas.length} áreas.`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Não foi possível salvar.'),
  });

  if (!form) return <section className={TELA}>Carregando…</section>;

  const alterna = (campo: 'areas' | 'subareas', valor: string) =>
    setForm({ ...form, [campo]: form[campo].includes(valor) ? form[campo].filter((v) => v !== valor) : [...form[campo], valor] });

  const problemas: string[] = [];
  const oks: string[] = [];
  if (form.capacityMw > form.capacityLimitMw)
    problemas.push(`Potência de ${fmt(form.capacityMw)} MW ultrapassa o limite de ${fmt(form.capacityLimitMw)} MW do enquadramento declarado.`);
  else oks.push(`Potência de ${fmt(form.capacityMw)} MW — margem de ${fmt(form.capacityLimitMw - form.capacityMw)} MW até o limite do enquadramento.`);

  const margem = (1 - form.co2 / form.co2Limit) * 100;
  if (form.co2 > form.co2Limit) problemas.push(`Emissão de ${fmt(form.co2, 2)} tCO₂/MWh acima do teto de ${fmt(form.co2Limit, 2)} da faixa atual.`);
  else if (margem < 12) oks.push(`Emissão de ${fmt(form.co2, 2)} tCO₂/MWh — a ${fmt(margem)}% do teto da faixa.`);
  else oks.push(`Emissão de ${fmt(form.co2, 2)} tCO₂/MWh, confortável frente ao teto de ${fmt(form.co2Limit, 2)}.`);

  const fora = problemas.length > 0;

  return (
    <section className={TELA}>
      <PageHead
        titulo="Central de alertas"
        texto="Escolha o que monitorar e descreva a operação. O motor cruza cada norma publicada com esse perfil e avisa quando algo sai do limite."
      />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel>
          <div className="mb-[22px]">
            <PanelTitle titulo="Áreas monitoradas" hint="Selecione as fontes de geração que a sua empresa opera." />
            <div className="mt-3 flex flex-wrap gap-[7px]">
              {AREAS.map((a) => (
                <Chip key={a} ativo={form.areas.includes(a)} onClick={() => alterna('areas', a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mb-[22px]">
            <PanelTitle titulo="Subáreas" hint="Recorta o volume de publicações para o que realmente afeta o seu time." />
            <div className="mt-3 flex flex-wrap gap-[7px]">
              {SUBAREAS.map((s) => (
                <Chip key={s} ativo={form.subareas.includes(s)} onClick={() => alterna('subareas', s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mb-[22px]">
            <PanelTitle titulo="Dados da operação" hint="É com esses números que o alerta deixa de ser genérico." />
            <div className="mt-3 grid gap-3.5 md:grid-cols-2">
              <label>
                <span className={ROTULO}>Potência instalada (MW)</span>
                <input className={cx(CAMPO, 'tabular-nums')} type="number" min={0} step={1} value={form.capacityMw} onChange={(e) => setForm({ ...form, capacityMw: Number(e.target.value) })} />
              </label>
              <label>
                <span className={ROTULO}>Emissão específica (tCO₂/MWh)</span>
                <input className={cx(CAMPO, 'tabular-nums')} type="number" min={0} step={0.01} value={form.co2} onChange={(e) => setForm({ ...form, co2: Number(e.target.value) })} />
              </label>
              <label>
                <span className={ROTULO}>Submercado</span>
                <select className={CAMPO} value={form.submarket} onChange={(e) => setForm({ ...form, submarket: e.target.value })}>
                  {SUBMERCADOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={ROTULO}>Ambiente de contratação</span>
                <select className={CAMPO} value={form.contractEnv} onChange={(e) => setForm({ ...form, contractEnv: e.target.value })}>
                  {AMBIENTES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={cx('mt-4 rounded-md border px-4 py-3.5', fora ? 'border-danger/35 bg-danger-soft' : 'border-ok/35 bg-ok-soft')}>
              <div className={cx('flex items-center gap-[9px] text-[14.5px] font-bold', fora ? 'text-danger' : 'text-ok')}>
                {fora ? 'Fora do limite — um alerta será disparado' : 'Dentro dos limites vigentes'}
              </div>
              <ul className="mt-[9px] list-disc pl-[18px] text-[13.5px] text-ink-2">
                {[...problemas, ...oks].map((t) => (
                  <li key={t} className="mt-[3px]">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button onClick={() => salvar.mutate(form)} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar configuração'}
          </Button>
        </Panel>

        <div>
          <Panel className="mb-[18px]">
            <PanelTitle titulo="Como você quer ser avisado" hint="Vale para todas as áreas selecionadas." />
            <div className="mt-2">
              <SwitchRow
                titulo="E-mail"
                detalhe="Para o endereço da conta"
                ativo={form.channels.email}
                onToggle={() => setForm({ ...form, channels: { ...form.channels, email: !form.channels.email } })}
              />
              <SwitchRow
                titulo="Notificação no celular"
                detalhe="Apenas impacto alto"
                ativo={form.channels.push}
                onToggle={() => setForm({ ...form, channels: { ...form.channels, push: !form.channels.push } })}
              />
              <SwitchRow
                titulo="Resumo em PDF"
                detalhe="Anexo ao e-mail semanal"
                ativo={form.channels.pdf}
                onToggle={() => setForm({ ...form, channels: { ...form.channels, pdf: !form.channels.pdf } })}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-[7px]">
              {FREQUENCIAS.map((f) => (
                <Chip key={f} ativo={form.frequency === f} onClick={() => setForm({ ...form, frequency: f })}>
                  {f}
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle titulo="Alertas disparados" hint="Últimos 7 dias" />
            <div className="mt-2.5">
              {alertas.map((a) => (
                <div key={a.id} className="flex gap-3 border-b border-line py-[13px] last:border-b-0">
                  <span className={cx('w-[3px] shrink-0 rounded-sm', SEV[a.severity])} />
                  <div>
                    <h4 className="text-[14.2px] font-semibold leading-snug">{a.title}</h4>
                    <p className="mt-[3px] text-[13px] text-ink-2">{a.message}</p>
                    <time className="mt-[5px] block text-xs text-ink-3">{a.at}</time>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
