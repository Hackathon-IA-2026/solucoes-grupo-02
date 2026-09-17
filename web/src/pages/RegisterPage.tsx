import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, MODO_MOCK } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BackButton, Button, CAMPO, Field, LinkButton, ROTULO, SelectField, cx } from '../components/ui';
import { AuthLayout } from './AuthLayout';

const FONTES = ['Eólica', 'Solar', 'Hidrelétrica', 'Biomassa', 'Térmica', 'Transmissão', 'Mais de uma fonte'];

function forca(senha: string) {
  if (!senha) return 0;
  let s = 0;
  if (senha.length >= 10) s++;
  if (/[0-9]/.test(senha) && /[a-zA-Z]/.test(senha)) s++;
  if (/[^A-Za-z0-9]/.test(senha)) s++;
  return senha.length < 8 ? 1 : s;
}

const COR_FORCA = ['bg-line', 'bg-danger', 'bg-warn', 'bg-ok'];

export function RegisterPage() {
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', cnpj: '', role: '', kind: FONTES[0] });
  const [termos, setTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { entrar } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const nivel = useMemo(() => forca(form.password), [form.password]);
  const rotuloForca = !form.password
    ? 'Misture letras, números e um símbolo.'
    : nivel <= 1
      ? 'Senha fraca — alongue para 10 caracteres.'
      : nivel === 2
        ? 'Senha razoável — um símbolo deixa ela forte.'
        : 'Senha forte.';

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function criarConta() {
    if (!termos) {
      toast('Aceite os termos de uso para criar a conta.');
      return;
    }
    setEnviando(true);
    try {
      entrar(await api.register(form));
      setPasso(3);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setEnviando(false);
    }
  }

  const bolinha = (n: number) =>
    cx(
      'grid h-[21px] w-[21px] place-items-center rounded-full border text-[11.5px] font-bold',
      passo > n ? 'border-ok bg-ok text-white' : passo === n ? 'border-navy bg-navy text-white' : 'border-line-strong bg-surface-2 text-ink-3',
    );

  return (
    <AuthLayout>
      <BackButton onClick={() => navigate('/entrar')} />

      {passo < 3 && (
        <>
          <h2 className="text-[26px] font-bold">Criar conta</h2>
          <p className="mt-2 text-[14.5px] text-ink-2">Primeiro seus dados, depois os da empresa.</p>
          <ol className="mb-0.5 mt-[18px] flex items-center gap-[9px]">
            <li className={cx('flex items-center gap-[7px] text-[13px] font-medium', passo === 1 ? 'text-ink' : 'text-ink-3')}>
              <span className={bolinha(1)}>1</span> Seus dados
            </li>
            <span className="block h-px w-5 bg-line-strong" />
            <li className={cx('flex items-center gap-[7px] text-[13px] font-medium', passo === 2 ? 'text-ink' : 'text-ink-3')}>
              <span className={bolinha(2)}>2</span> Empresa
            </li>
          </ol>
        </>
      )}

      {passo === 1 && (
        <div>
          <Field label="Nome completo" id="cad-nome" placeholder="Mariana Coelho" value={form.name} onChange={set('name')} />
          <Field label="E-mail corporativo" id="cad-email" type="email" placeholder="voce@suaempresa.com.br" value={form.email} onChange={set('email')} />
          <Field
            label="Senha"
            id="cad-senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo de 10 caracteres"
            value={form.password}
            onChange={set('password')}
          >
            <div className="mt-[9px] flex gap-1">
              {[1, 2, 3].map((i) => (
                <i key={i} className={cx('h-1 flex-1 rounded-full', form.password && nivel >= i ? COR_FORCA[nivel] : 'bg-line')} />
              ))}
            </div>
            <p className="mt-1.5 text-[12.4px] text-ink-3">{rotuloForca}</p>
          </Field>
          <Button bloco className="mt-5" onClick={() => setPasso(2)}>
            Continuar
          </Button>
        </div>
      )}

      {passo === 2 && (
        <div>
          <Field label="Razão social" id="cad-razao" placeholder="Serra do Vento Energia S.A." value={form.company} onChange={set('company')} />
          <div className="mt-4 grid gap-3.5 md:grid-cols-2">
            <div>
              <label className={ROTULO} htmlFor="cad-cnpj">CNPJ</label>
              <input className={cx(CAMPO, 'tabular-nums')} id="cad-cnpj" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={set('cnpj')} />
            </div>
            <div>
              <label className={ROTULO} htmlFor="cad-cargo">Seu cargo</label>
              <input className={CAMPO} id="cad-cargo" placeholder="Coordenação regulatória" value={form.role} onChange={set('role')} />
            </div>
          </div>
          <SelectField label="Fonte principal de geração" id="cad-area" value={form.kind} onChange={set('kind')}>
            {FONTES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </SelectField>

          <label className="mt-[18px] flex items-start gap-[9px] text-[13px] leading-snug text-ink-2">
            <input type="checkbox" className="mt-[3px] shrink-0" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
            <span>Li e aceito os termos de uso e a política de privacidade do Energy Start.</span>
          </label>

          <Button bloco className="mt-5" onClick={criarConta} disabled={enviando}>
            {enviando ? 'Criando…' : 'Criar conta'}
          </Button>
          <p className="mt-[26px] text-center text-sm text-ink-2">
            <LinkButton onClick={() => setPasso(1)}>Voltar para seus dados</LinkButton>
          </p>
        </div>
      )}

      {passo === 3 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2">
              <svg viewBox="0 0 24 24" className="h-[25px] w-[25px] fill-none stroke-brand stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold">Confirme seu e-mail</h2>
            <p className="mx-auto mt-2.5 max-w-[36ch] text-sm text-ink-2">
              Enviamos um link de confirmação para <span className="font-semibold text-ink">{form.email || 'seu e-mail'}</span>. Ele vale por 24 horas.
            </p>
          </div>
          <Button
            bloco
            className="mt-[22px]"
            onClick={() => {
              toast('Conta criada. Configure seus alertas para começar.');
              navigate('/alertas');
            }}
          >
            Ir para o painel
          </Button>
          {MODO_MOCK && (
            <p className="mt-[22px] rounded-r-sm border-l-[3px] border-accent bg-surface-2 px-[13px] py-[11px] text-[13px] text-ink-2">
              Com dados locais a confirmação já está feita — o botão abre o sistema direto.
            </p>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
