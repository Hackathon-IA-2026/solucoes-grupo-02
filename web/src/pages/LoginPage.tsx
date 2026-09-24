import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, MODO_MOCK } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button, Field } from '../components/ui';
import { AuthLayout } from './AuthLayout';
import { login } from '../services/auth/auth.services';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [enviando, setEnviando] = useState(false);
    const { entrar } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    async function submeter() {
        setEnviando(true);
        try {
            const sessao = await login(email, senha);

            entrar(sessao);
            toast(`Bem-vinda, ${sessao.user.name.split(' ')[0]}.`);
            navigate('/painel');
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Não foi possível entrar.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <AuthLayout>
            <h2 className="text-[26px] font-bold">Entrar</h2>
            <p className="mt-2 text-[14.5px] text-ink-2">Use o e-mail cadastrado pela sua empresa.</p>

            <Field
                label="E-mail corporativo"
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <Field
                label="Senha"
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submeter()}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-[7px] text-[13.5px] text-ink-2">
                    <input type="checkbox" defaultChecked /> Manter conectado
                </label>
                <Link to="/recuperar-senha" className="text-[13px] font-medium text-brand no-underline hover:underline">
                    Esqueci minha senha
                </Link>
            </div>

            <Button bloco className="mt-5" onClick={submeter} disabled={enviando}>
                {enviando ? 'Entrando…' : 'Entrar'}
            </Button>

            {MODO_MOCK && (
                <p className="mt-[22px] rounded-r-sm border-l-[3px] border-accent bg-surface-2 px-[13px] py-[11px] text-[13px] text-ink-2">
                    Rodando com dados locais. Qualquer e-mail e senha abrem o sistema.
                </p>
            )}

            <p className="mt-[26px] text-center text-sm text-ink-2">
                Ainda não tem conta?{' '}
                <Link to="/cadastro" className="font-medium text-brand no-underline hover:underline">
                    Cadastre sua empresa
                </Link>
            </p>
        </AuthLayout>
    );
}
