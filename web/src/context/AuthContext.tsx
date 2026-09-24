import { createContext, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '../types';
import { TOKEN_KEY } from '../services/api/api';

const USER_KEY = 'es-user';

export interface AuthCtxValue {
  user: User | null;
  entrar: (s: Session) => void;
  atualizarUsuario: (u: User) => void;
  sair: () => void;
}

export const AuthCtx = createContext<AuthCtxValue>(null!);

function guardado(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(guardado);

  const valor = useMemo<AuthCtxValue>(
    () => ({
      user,
      entrar: (s) => {
        setUser(s.user);
        try {
          localStorage.setItem(TOKEN_KEY, s.token);
          localStorage.setItem(USER_KEY, JSON.stringify(s.user));
        } catch {}
      },
      atualizarUsuario: (u) => {
        setUser(u);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } catch {}
      },
      sair: () => {
        setUser(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch {}
      },
    }),
    [user],
  );

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}
