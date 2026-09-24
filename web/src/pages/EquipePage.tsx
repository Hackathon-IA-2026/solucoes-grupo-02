import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { TELA } from '../components/AppShell';
import { Button, CAMPO, Field, PageHead, Panel, PanelTitle, ROTULO, cx } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { InviteResult, TeamMember } from '../types';

const TAG = 'rounded-sm px-[7px] py-0.5 text-[11.5px] font-bold';

function iniciais(nome: string) {
  return (
    nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function EquipePage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: api.getMe, initialData: user ?? undefined });
  const ehAdmin = me?.isAdmin ?? false;

  const { data: membros = [], isLoading } = useQuery({ queryKey: ['team'], queryFn: api.listTeam, enabled: ehAdmin });
  const [form, setForm] = useState({ name: '', email: '', role: '', isAdmin: false });
  const [convite, setConvite] = useState<InviteResult | null>(null);

  const recarregar = () => qc.invalidateQueries({ queryKey: ['team'] });
  const erro = (e: unknown) => toast(e instanceof Error ? e.message : 'Não foi possível concluir.');

  const convidar = useMutation({
    mutationFn: () => api.inviteMember({ ...form, role: form.role || undefined }),
    onSuccess: (r) => {
      setConvite(r);
      setForm({ name: '', email: '', role: '', isAdmin: false });
      recarregar();
      toast(`Convite enviado para ${r.membro.email}.`);
    },
    onError: erro,
  });

  const novoLink = useMutation({
    mutationFn: (id: string) => api.renewInvite(id),
    onSuccess: (r) => {
      setConvite(r);
      toast(`Novo link gerado para ${r.membro.name}. O anterior deixou de valer.`);
    },
    onError: erro,
  });

  const alterarAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) => api.setMemberAdmin(id, isAdmin),
    onSuccess: (m) => {
      recarregar();
      toast(m.isAdmin ? `${m.name} agora é administrador.` : `${m.name} deixou de ser administrador.`);
    },
    onError: erro,
  });

  const remover = useMutation({
    mutationFn: (m: TeamMember) => api.removeMember(m.id),
    onSuccess: (_, m) => {
      recarregar();
      toast(`${m.name} foi removido da empresa.`);
    },
    onError: erro,
  });

  async function copiar(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copiado.');
    } catch {
      toast('Não foi possível copiar — selecione o link e copie manualmente.');
    }
  }

  if (!ehAdmin) {
    return (
      <section className={TELA}>
        <PageHead titulo="Equipe" texto="Quem da sua empresa acessa o Energy Start." />
        <Panel>
          <p className="text-sm text-ink-2">Apenas administradores da empresa gerenciam a equipe. Peça a um deles para convidar alguém.</p>
        </Panel>
      </section>
    );
  }

  return (
    <section className={TELA}>
      <PageHead
        titulo="Equipe"
        texto={`Quem da ${me?.company || 'sua empresa'} acessa o Energy Start. Todos veem a mesma usina, os mesmos alertas e recebem os mesmos avisos; administradores também convidam e removem pessoas.`}
      />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel>
          <PanelTitle titulo="Membros" hint={isLoading ? 'Carregando…' : `${membros.length} pessoa${membros.length === 1 ? '' : 's'} com acesso`} />
          <ul className="mt-2.5">
            {membros.map((m) => {
              const voce = m.id === me?.id;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line py-[13px] last:border-b-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">{iniciais(m.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <b className="text-[14.2px] font-semibold">{m.name}</b>
                      {voce && <span className="text-[12.4px] text-ink-3">(você)</span>}
                      {m.isAdmin && <span className={cx(TAG, 'bg-brand-soft text-brand')}>Admin</span>}
                      {m.convitePendente && <span className={cx(TAG, 'bg-warn-soft text-warn')}>Convite pendente</span>}
                    </span>
                    <span className="mt-[2px] block truncate text-[13px] text-ink-2">
                      {m.email}
                      {m.role && ` · ${m.role}`}
                    </span>
                  </span>
                  {!voce && (
                    <span className="flex flex-wrap gap-1.5">
                      {m.convitePendente && (
                        <Button variante="ghost" tamanho="sm" onClick={() => novoLink.mutate(m.id)} disabled={novoLink.isPending}>
                          Novo link
                        </Button>
                      )}
                      <Button
                        variante="ghost"
                        tamanho="sm"
                        onClick={() => alterarAdmin.mutate({ id: m.id, isAdmin: !m.isAdmin })}
                        disabled={alterarAdmin.isPending}
                      >
                        {m.isAdmin ? 'Remover admin' : 'Tornar admin'}
                      </Button>
                      <Button
                        variante="ghost"
                        tamanho="sm"
                        className="!text-danger"
                        onClick={() => window.confirm(`Remover ${m.name} da empresa? A pessoa perde o acesso na hora.`) && remover.mutate(m)}
                        disabled={remover.isPending}
                      >
                        Remover
                      </Button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <div>
          <Panel className="mb-[18px]">
            <PanelTitle titulo="Convidar pessoa" hint="Ela recebe um link por e-mail para criar a senha. O link vale por 7 dias." />
            <div className="mt-3">
              <Field label="Nome" id="conv-nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Field
                label="E-mail corporativo"
                id="conv-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Field label="Cargo (opcional)" id="conv-cargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <label className="mt-[18px] flex items-start gap-[9px] text-[13.4px] leading-snug text-ink-2">
                <input
                  type="checkbox"
                  className="mt-[3px] shrink-0"
                  checked={form.isAdmin}
                  onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                />
                <span>Administrador — também pode convidar e remover pessoas.</span>
              </label>
              <Button
                className="mt-5"
                onClick={() => (form.name.trim() && form.email.trim() ? convidar.mutate() : toast('Informe nome e e-mail.'))}
                disabled={convidar.isPending}
              >
                {convidar.isPending ? 'Enviando…' : 'Enviar convite'}
              </Button>
            </div>
          </Panel>

          {convite && (
            <Panel>
              <PanelTitle titulo={`Link de convite de ${convite.membro.name}`} hint="Se o e-mail não chegar, envie este link direto para a pessoa." />
              <label className="mt-3 block">
                <span className={ROTULO}>Link</span>
                <input className={cx(CAMPO, 'text-[13px]')} value={convite.linkConvite} readOnly onFocus={(e) => e.target.select()} />
              </label>
              <Button variante="ghost" tamanho="sm" className="mt-3" onClick={() => copiar(convite.linkConvite)}>
                Copiar link
              </Button>
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
