import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '../types';
import { TOKEN_KEY } from '../api/http';

const USER_KEY = 'es-user';

interface Ctx {
  user: User | null;
  entrar: (s: Session) => void;
  sair: () => void;
}

const AuthCtx = createContext<Ctx>(null!);

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

  const valor = useMemo<Ctx>(
    () => ({
      user,
      entrar: (s) => {
        setUser(s.user);
        try {
          localStorage.setItem(TOKEN_KEY, s.token);
          localStorage.setItem(USER_KEY, JSON.stringify(s.user));
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

export const useAuth = () => useContext(AuthCtx);
