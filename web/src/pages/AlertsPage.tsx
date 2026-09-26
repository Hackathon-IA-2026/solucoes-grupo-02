import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { Button, CAMPO, Chip, LinkButton, PageHead, Panel, PanelTitle, ROTULO, SwitchRow, cx, fmt } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { normalizarCeg } from '../utils/ceg';
import { cnpjValido, mascararCnpj } from '../utils/cnpj';
import type { Alert, Plant, Taxonomia } from '../types';

const FREQUENCIAS = ['Imediato', 'Resumo diário', 'Resumo semanal'];
const SUBMERCADOS = ['Nordeste', 'Sudeste/Centro-Oeste', 'Sul', 'Norte'];
const AMBIENTES = ['Livre (ACL)', 'Regulado (ACR)', 'Ambos'];

const SEV: Record<string, string> = { alto: 'bg-danger', medio: 'bg-accent', baixo: 'bg-brand' };

// A tela só oferece o que o classificador conhece (GET /plants/taxonomia). Áreas e subáreas de
// versões antigas da tela (Hidrelétrica, Tarifas e encargos...) nunca casariam com uma norma:
// saem do formulário e, no próximo "Salvar", do banco.
function somenteDaTaxonomia(plant: Plant, taxonomia: Taxonomia): Plant {
  const subareas = Object.values(taxonomia).flat();
  return { ...plant, areas: plant.areas.filter((a) => a in taxonomia), subareas: plant.subareas.filter((s) => subareas.includes(s)) };
}

export function AlertsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['plant'], queryFn: api.getPlant });
  const { data: alertas = [] } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts });
  const { data: taxonomia } = useQuery({ queryKey: ['taxonomia'], queryFn: api.getTaxonomia, staleTime: Infinity });
  const [form, setForm] = useState<Plant | null>(null);

  useEffect(() => {
    if (data && taxonomia && !form) setForm(somenteDaTaxonomia(data, taxonomia));
  }, [data, taxonomia, form]);

  const salvar = useMutation({
    mutationFn: async (p: Partial<Plant>) => {
      const usinaAtualizada = await api.updatePlant(p);
      const novosAlertas = await api.checkAlerts(); // recruza a lei x o perfil que acabou de mudar
      return { usinaAtualizada, novosAlertas };
    },
    onSuccess: ({ usinaAtualizada, novosAlertas }) => {
      qc.setQueryData(['plant'], usinaAtualizada);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast(
        novosAlertas.length > 0
          ? `Configuração salva. ${novosAlertas.length} novo(s) alerta(s) — a operação saiu do limite em algum ponto.`
          : `Configuração salva. Alertas ativos para ${usinaAtualizada.areas.length} áreas.`,
      );
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Não foi possível salvar.'),
  });

  // Sugere os CEGs pelo cadastro de agentes de geração da ANEEL (CNPJ da empresa + SPEs do formulário).
  const buscarUsinas = useMutation({
    mutationFn: (cnpjs: string[]) => api.listUsinasAneel(cnpjs),
    onSuccess: (usinas) => {
      if (usinas.length === 0) toast('Nenhuma usina na ANEEL com o CNPJ da empresa ou das SPEs informadas. Inclua o CNPJ de uma SPE e busque de novo.');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Não foi possível consultar a ANEEL.'),
  });
  const [novoId, setNovoId] = useState('');

  const marcarLido = useMutation({
    mutationFn: (id: string) => api.markAlertRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  // Abrir o alerta marca como lido (apaga o contador do menu) e leva ao resumo da norma de origem.
  const abrir = (a: Alert) => {
    if (!a.lido) marcarLido.mutate(a.id);
    if (a.normId) navigate(`/resumos?norma=${a.normId}`);
  };

  if (!form || !taxonomia) return <section className={TELA}>Carregando…</section>;

  const alterna = (campo: 'areas' | 'subareas' | 'cegs' | 'cnpjs', valor: string) =>
    setForm({ ...form, [campo]: form[campo].includes(valor) ? form[campo].filter((v) => v !== valor) : [...form[campo], valor] });

  // Desmarcar uma área leva junto as subáreas dela.
  const alternaArea = (area: string) => {
    const marcada = form.areas.includes(area);
    setForm({
      ...form,
      areas: marcada ? form.areas.filter((a) => a !== area) : [...form.areas, area],
      subareas: marcada ? form.subareas.filter((s) => !taxonomia[area].includes(s)) : form.subareas,
    });
  };

  // Só dígitos e pontuação = CNPJ de uma SPE; o resto tem que ser um CEG.
  const adicionarId = () => {
    const texto = novoId.trim();
    if (/^[\d.\-/\s]+$/.test(texto)) {
      const cnpj = texto.replace(/\D/g, '');
      if (!cnpjValido(cnpj)) return toast('Confira o CNPJ — os dígitos verificadores não batem.');
      if (!form.cnpjs.includes(cnpj)) alterna('cnpjs', cnpj);
    } else {
      const ceg = normalizarCeg(texto);
      if (!ceg) return toast('Não reconheci o CEG. O formato é como EOL.CV.RN.007663-4.01.');
      if (!form.cegs.includes(ceg)) alterna('cegs', ceg);
    }
    setNovoId('');
  };
  const nomeDaUsina = (ceg: string) => buscarUsinas.data?.find((u) => u.ceg === ceg)?.nome;

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
            <PanelTitle
              titulo="Áreas monitoradas"
              hint="Selecione as fontes que a sua empresa opera. Por enquanto, o radar de normas cobre estas três."
            />
            <div className="mt-3 flex flex-wrap gap-[7px]">
              {Object.keys(taxonomia).map((a) => (
                <Chip key={a} ativo={form.areas.includes(a)} onClick={() => alternaArea(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mb-[22px]">
            <PanelTitle titulo="Subáreas" hint="Recortam cada área para o que afeta o seu time. Área sem subárea marcada vale inteira." />
            {form.areas.length === 0 && <p className="mt-3 text-[13px] text-ink-2">Marque uma área para escolher as subáreas dela.</p>}
            {Object.keys(taxonomia)
              .filter((a) => form.areas.includes(a))
              .map((a) => (
                <div key={a} className="mt-3">
                  <span className={ROTULO}>{a}</span>
                  <div className="flex flex-wrap gap-[7px]">
                    {taxonomia[a].map((s) => (
                      <Chip key={s} ativo={form.subareas.includes(s)} onClick={() => alterna('subareas', s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="mb-[22px]">
            <PanelTitle
              titulo="Suas usinas na ANEEL"
              hint="Despachos que liberam, transferem ou multam uma usina chegam só para a empresa citada. O CNPJ da empresa já conta; inclua os CEGs das usinas e os CNPJs das SPEs donas delas."
            />
            <div className="mt-3 flex gap-2">
              <input
                className={cx(CAMPO, 'tabular-nums')}
                placeholder="CEG (EOL.CV.RN.007663-4.01) ou CNPJ de uma SPE"
                value={novoId}
                onChange={(e) => setNovoId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarId()}
              />
              <Button variante="ghost" tamanho="sm" onClick={adicionarId} disabled={!novoId.trim()}>
                Adicionar
              </Button>
            </div>
            {form.cegs.length + form.cnpjs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-[7px]">
                {form.cegs.map((c) => (
                  <Chip key={c} ativo onClick={() => alterna('cegs', c)}>
                    {nomeDaUsina(c) ? `${nomeDaUsina(c)} · ${c}` : c} ×
                  </Chip>
                ))}
                {form.cnpjs.map((c) => (
                  <Chip key={c} ativo onClick={() => alterna('cnpjs', c)}>
                    SPE {mascararCnpj(c)} ×
                  </Chip>
                ))}
              </div>
            )}
            <div className="mt-3">
              <LinkButton onClick={() => buscarUsinas.mutate(form.cnpjs)} disabled={buscarUsinas.isPending}>
                {buscarUsinas.isPending ? 'Consultando a ANEEL…' : 'Buscar as usinas da empresa no cadastro da ANEEL'}
              </LinkButton>
              {!!buscarUsinas.data?.length && (
                <div className="mt-2.5 flex flex-wrap gap-[7px]">
                  {buscarUsinas.data.map((u) => (
                    <Chip key={u.ceg} ativo={form.cegs.includes(u.ceg)} onClick={() => alterna('cegs', u.ceg)}>
                      {u.nome} · {u.tipo} · {u.fase}
                    </Chip>
                  ))}
                </div>
              )}
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
            <PanelTitle titulo="Alertas disparados" hint="Abra um alerta para marcá-lo como lido" />
            <div className="mt-2.5">
              {alertas.length === 0 && <p className="py-[13px] text-[13px] text-ink-2">Nenhum alerta por enquanto.</p>}
              {alertas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => abrir(a)}
                  className="flex w-full gap-3 border-b border-line py-[13px] text-left transition-colors last:border-b-0 hover:bg-surface-2"
                >
                  <span className={cx('w-[3px] shrink-0 rounded-sm', SEV[a.severity], a.lido && 'opacity-40')} />
                  <span className="block">
                    <span className={cx('block text-[14.2px] leading-snug', a.lido ? 'font-medium text-ink-2' : 'font-semibold')}>{a.title}</span>
                    <span className="mt-[3px] block text-[13px] text-ink-2">{a.message}</span>
                    <time className="mt-[5px] block text-xs text-ink-3">
                      {a.at}
                      {!a.lido && ' · novo'}
                    </time>
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
