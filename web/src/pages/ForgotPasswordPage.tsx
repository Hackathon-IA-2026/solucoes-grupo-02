import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, MODO_MOCK } from '../services/api';
import { useToast } from '../hooks/useToast';
import { BackButton, Button, Field, cx } from '../components/ui';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const convite = params.get('convite') === '1';
    const [passo, setPasso] = useState(token ? 3 : 1);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [senha2, setSenha2] = useState('');
    const [falta, setFalta] = useState(0);
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (falta <= 0) return;
        const t = window.setTimeout(() => setFalta((f) => f - 1), 1000);
        return () => window.clearTimeout(t);
    }, [falta]);

    const regras = { len: senha.length >= 10, num: /[0-9]/.test(senha), sym: /[^A-Za-z0-9]/.test(senha) };

    const REGRA =
        'mt-[5px] flex items-center gap-2 before:grid before:h-[15px] before:w-[15px] before:shrink-0 before:place-items-center before:rounded-full before:border-[1.5px] before:text-[9px] before:leading-none';
    const REGRA_OK = "text-ok before:border-ok before:bg-ok before:text-white before:content-['✓']";
    const REGRA_OFF = "before:border-line-strong before:content-['']";

    async function enviarLink() {
        await api.forgotPassword(email);
        setPasso(2);
        setFalta(45);
    }

    async function salvarSenha() {
        if (!regras.len || !regras.num || !regras.sym) return toast('A senha ainda não cumpre as três regras.');
        if (senha !== senha2) return toast('As senhas estão diferentes.');
        if (!token && !MODO_MOCK) return toast('Abra o link que chegou no seu e-mail para criar a senha.');
        try {
            await api.resetPassword(token ?? '', senha);
        } catch (e) {
            return toast(e instanceof Error ? e.message : 'Não foi possível salvar a senha.');
        }
        toast(convite ? 'Senha criada. Entre com seu e-mail e a nova senha.' : 'Senha redefinida. Entre com a nova senha.');
        navigate('/entrar');
    }

    return (
        <AuthLayout>
            <BackButton onClick={() => navigate('/entrar')} />

            {passo === 1 && (
                <div>
                    <h2 className="text-[26px] font-bold">Recuperar senha</h2>
                    <p className="mt-2 text-[14.5px] text-ink-2">Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.</p>
                    <Field label="E-mail corporativo" id="rec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Button bloco className="mt-5" onClick={enviarLink}>
                        Enviar link
                    </Button>
                </div>
            )}

            {passo === 2 && (
                <div>
                    <div className="text-center">
                        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-[25px] w-[25px] fill-none stroke-brand stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
                            >
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="m3.5 7 8.5 6 8.5-6" />
                            </svg>
                        </div>
                        <h2 className="text-[22px] font-bold">Link enviado</h2>
                        <p className="mx-auto mt-2.5 max-w-[36ch] text-sm text-ink-2">
                            Se existir conta para <span className="font-semibold text-ink">{email || 'esse e-mail'}</span>, o link chega em alguns
                            minutos. Confira também a caixa de spam.
                        </p>
                        <p className="mt-5 text-[13.4px] text-ink-3">
                            {falta > 0 ? (
                                `Reenviar link em ${falta}s`
                            ) : (
                                <button
                                    className="font-semibold text-brand hover:underline"
                                    onClick={() => {
                                        void api.forgotPassword(email);
                                        setFalta(45);
                                        toast('Link reenviado.');
                                    }}
                                >
                                    Reenviar link
                                </button>
                            )}
                        </p>
                    </div>
                    {MODO_MOCK ? (
                        <Button bloco className="mt-[22px]" onClick={() => setPasso(3)}>
                            Já recebi o link
                        </Button>
                    ) : (
                        <p className="mt-[22px] text-center text-[13.4px] text-ink-2">Abra o link do e-mail para criar a senha nova.</p>
                    )}
                </div>
            )}

            {passo === 3 && (
                <div>
                    <h2 className="text-[26px] font-bold">{convite ? 'Criar sua senha' : 'Criar senha nova'}</h2>
                    <p className="mt-2 text-[14.5px] text-ink-2">
                        {convite
                            ? 'Você foi convidado para a conta da sua empresa no Energy Start. Defina a senha para entrar.'
                            : 'A senha anterior deixa de valer assim que você salvar.'}
                    </p>

                    <Field
                        label="Nova senha"
                        id="nova-senha"
                        type="password"
                        autoComplete="new-password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                    >
                        <ul className="mt-[11px] text-[12.8px] text-ink-3">
                            <li className={cx(REGRA, regras.len ? REGRA_OK : REGRA_OFF)}>Pelo menos 10 caracteres</li>
                            <li className={cx(REGRA, regras.num ? REGRA_OK : REGRA_OFF)}>Pelo menos um número</li>
                            <li className={cx(REGRA, regras.sym ? REGRA_OK : REGRA_OFF)}>Pelo menos um símbolo</li>
                        </ul>
                    </Field>

                    <Field
                        label="Repita a nova senha"
                        id="nova-senha-2"
                        type="password"
                        autoComplete="new-password"
                        value={senha2}
                        onChange={(e) => setSenha2(e.target.value)}
                    >
                        {senha2 && (
                            <p className={cx('mt-1.5 text-[12.4px]', senha2 === senha ? 'text-ok' : 'text-danger')}>
                                {senha2 === senha ? 'As senhas conferem.' : 'As senhas estão diferentes.'}
                            </p>
                        )}
                    </Field>

                    <Button bloco className="mt-5" onClick={salvarSenha}>
                        {convite ? 'Criar senha e continuar' : 'Salvar nova senha'}
                    </Button>
                </div>
            )}
        </AuthLayout>
    );
}
