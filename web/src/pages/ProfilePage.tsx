import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TELA } from '../components/AppShell';
import { Button, CAMPO, PageHead, Panel, PanelTitle, ROTULO, SwitchRow, cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme, type Destaque, type Tema } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const TEMAS: Array<{ id: Tema; rotulo: string }> = [
  { id: 'light', rotulo: 'Claro' },
  { id: 'dark', rotulo: 'Escuro' },
  { id: 'auto', rotulo: 'Sistema' },
];

const CORES: Array<{ id: Destaque; hex: string; rotulo: string }> = [
  { id: 'ambar', hex: '#EFA134', rotulo: 'Âmbar' },
  { id: 'turquesa', hex: '#17968A', rotulo: 'Turquesa' },
  { id: 'coral', hex: '#DD6047', rotulo: 'Coral' },
  { id: 'violeta', hex: '#6A5AE0', rotulo: 'Violeta' },
];

export function ProfilePage() {
  const { user, sair } = useAuth();
  const { tema, destaque, setTema, setDestaque } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    role: user?.role ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    company: user?.company ?? '',
    cnpj: user?.cnpj ?? '',
  });
  const [duasEtapas, setDuasEtapas] = useState(true);
  const [relatorio, setRelatorio] = useState(false);

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });

  return (
    <section className={TELA}>
      <PageHead titulo="Perfil" texto="Seus dados, a aparência do sistema e para onde vão os avisos." />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel>
          <div className="mb-[22px] flex items-center gap-4">
            <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-brand font-display text-[22px] font-bold text-white">
              {user?.initials ?? 'ES'}
            </div>
            <div>
              <h3 className="text-lg font-bold">{form.name}</h3>
              <p className="mt-[3px] text-[12.8px] text-ink-3">
                {form.role} · {form.company}
              </p>
            </div>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2">
            <label>
              <span className={ROTULO}>Nome</span>
              <input className={CAMPO} value={form.name} onChange={set('name')} />
            </label>
            <label>
              <span className={ROTULO}>Cargo</span>
              <input className={CAMPO} value={form.role} onChange={set('role')} />
            </label>
            <label>
              <span className={ROTULO}>E-mail</span>
              <input className={CAMPO} value={form.email} onChange={set('email')} />
            </label>
            <label>
              <span className={ROTULO}>Telefone</span>
              <input className={cx(CAMPO, 'tabular-nums')} value={form.phone} onChange={set('phone')} />
            </label>
          </div>

          <h3 className="mt-[26px] text-[15.5px] font-bold">Empresa</h3>
          <div className="mt-3 grid gap-3.5 md:grid-cols-2">
            <label>
              <span className={ROTULO}>Razão social</span>
              <input className={CAMPO} value={form.company} onChange={set('company')} />
            </label>
            <label>
              <span className={ROTULO}>CNPJ</span>
              <input className={cx(CAMPO, 'tabular-nums')} value={form.cnpj} onChange={set('cnpj')} />
            </label>
          </div>

          <Button className="mt-6" onClick={() => toast('Alterações salvas.')}>
            Salvar alterações
          </Button>
        </Panel>

        <div>
          <Panel className="mb-[18px]">
            <PanelTitle titulo="Aparência" hint="Vale só para este dispositivo." />

            <div className="mt-3.5">
              <div className="mb-2 text-[13px] font-semibold text-ink-2">Tema</div>
              <div className="inline-flex overflow-hidden rounded-md border border-line-strong">
                {TEMAS.map((t) => (
                  <button
                    key={t.id}
                    aria-pressed={tema === t.id}
                    onClick={() => setTema(t.id)}
                    className="border-r border-line-strong px-[15px] py-2 text-[13.5px] text-ink-2 last:border-r-0 aria-pressed:bg-navy aria-pressed:text-white"
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[13px] font-semibold text-ink-2">Cor de destaque</div>
              <div className="mt-3 flex gap-2.5">
                {CORES.map((c) => (
                  <button
                    key={c.id}
                    aria-pressed={destaque === c.id}
                    aria-label={c.rotulo}
                    onClick={() => setDestaque(c.id)}
                    style={{ background: c.hex }}
                    className="h-[38px] w-[38px] rounded-md border-2 border-transparent aria-pressed:border-ink aria-pressed:shadow-[inset_0_0_0_3px_var(--paper)]"
                  />
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelTitle titulo="Conta" />
            <div className="mt-2">
              <SwitchRow titulo="Verificação em duas etapas" detalhe="Código por aplicativo" ativo={duasEtapas} onToggle={() => setDuasEtapas((v) => !v)} />
              <SwitchRow titulo="Relatório mensal para a diretoria" detalhe="Enviado no dia 1º" ativo={relatorio} onToggle={() => setRelatorio((v) => !v)} />
            </div>
            <Button
              variante="ghost"
              tamanho="sm"
              className="mt-4"
              onClick={() => {
                sair();
                navigate('/entrar');
              }}
            >
              Sair da conta
            </Button>
          </Panel>
        </div>
      </div>
    </section>
  );
}
