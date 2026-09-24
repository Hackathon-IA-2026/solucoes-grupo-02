import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { BackButton, Button, Field, LinkButton } from '../components/ui';
import { AuthLayout } from './AuthLayout';
import { cnpjValido, mascararCnpj } from '../utils/cnpj';

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
  const [form, setForm] = useState({ companyName: '', cnpj: '', name: '', email: '', password: '', role: '' });
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

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function criarConta() {
    if (!form.companyName.trim()) return toast('Informe a razão social da empresa.');
    if (!cnpjValido(form.cnpj)) return toast('Confira o CNPJ — os dígitos verificadores não batem.');
    if (!form.name.trim() || !form.email.trim() || !form.password) return toast('Preencha nome, e-mail e senha.');
    if (!termos) {
      toast('Aceite os termos de uso para criar a conta.');
      return;
    }
    setEnviando(true);
    try {
      entrar(await api.register(form));
      setPasso(2);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <BackButton onClick={() => navigate('/entrar')} />

      {passo === 1 && (
        <div>
          <h2 className="text-[26px] font-bold">Cadastrar empresa</h2>
          <p className="mt-2 text-[14.5px] text-ink-2">
            Você será o administrador da conta da empresa e poderá convidar sua equipe depois. Se a empresa já usa o Energy Start, peça um convite a um
            administrador dela.
          </p>

          <Field label="Razão social" id="cad-empresa" placeholder="Serra do Vento Energia S.A." value={form.companyName} onChange={set('companyName')} />
          <Field
            label="CNPJ"
            id="cad-cnpj"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            className="tabular-nums"
            value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: mascararCnpj(e.target.value) }))}
          >
            {form.cnpj.length === 18 && !cnpjValido(form.cnpj) && <p className="mt-1.5 text-[12.4px] text-danger">CNPJ inválido.</p>}
          </Field>

          <h3 className="mt-[26px] text-[15.5px] font-bold">Seus dados de acesso</h3>
          <Field label="Nome completo" id="cad-nome" placeholder="Mariana Coelho" value={form.name} onChange={set('name')} />
          <Field label="E-mail corporativo" id="cad-email" type="email" placeholder="voce@suaempresa.com.br" value={form.email} onChange={set('email')} />
          <Field label="Seu cargo" id="cad-cargo" placeholder="Coordenação regulatória" value={form.role} onChange={set('role')} />
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
                <i key={i} className={`h-1 flex-1 rounded-full ${form.password && nivel >= i ? COR_FORCA[nivel] : 'bg-line'}`} />
              ))}
            </div>
            <p className="mt-1.5 text-[12.4px] text-ink-3">{rotuloForca}</p>
          </Field>

          <label className="mt-[18px] flex items-start gap-[9px] text-[13px] leading-snug text-ink-2">
            <input type="checkbox" className="mt-[3px] shrink-0" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
            <span>Li e aceito os termos de uso e a política de privacidade do Energy Start.</span>
          </label>

          <Button bloco className="mt-5" onClick={criarConta} disabled={enviando}>
            {enviando ? 'Cadastrando…' : 'Cadastrar empresa'}
          </Button>
          <p className="mt-[26px] text-center text-sm text-ink-2">
            Já tem conta? <LinkButton onClick={() => navigate('/entrar')}>Entrar</LinkButton>
          </p>
        </div>
      )}

      {passo === 2 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2">
              <svg viewBox="0 0 24 24" className="h-[25px] w-[25px] fill-none stroke-brand stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold">Empresa cadastrada</h2>
            <p className="mx-auto mt-2.5 max-w-[38ch] text-sm text-ink-2">
              A conta da <span className="font-semibold text-ink">{form.companyName}</span> está pronta e você é o administrador. Configure os alertas da
              usina e, quando quiser, convide sua equipe em Perfil › Equipe.
            </p>
          </div>
          <Button
            bloco
            className="mt-[22px]"
            onClick={() => {
              navigate('/alertas');
            }}
          >
            Configurar alertas
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
