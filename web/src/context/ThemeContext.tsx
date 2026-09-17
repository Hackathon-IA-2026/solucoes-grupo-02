import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'light' | 'dark' | 'auto';
export type Destaque = 'ambar' | 'turquesa' | 'coral' | 'violeta';

interface Ctx {
  tema: Tema;
  destaque: Destaque;
  setTema: (t: Tema) => void;
  setDestaque: (d: Destaque) => void;
}

const ThemeCtx = createContext<Ctx>(null!);

function ler<T>(chave: string, padrao: T): T {
  try {
    return (localStorage.getItem(chave) as T) ?? padrao;
  } catch {
    return padrao;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => ler('es-tema', 'auto'));
  const [destaque, setDestaque] = useState<Destaque>(() => ler('es-cor', 'ambar'));

  useEffect(() => {
    const el = document.documentElement;
    if (tema === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', tema);
    try {
      localStorage.setItem('es-tema', tema);
    } catch {}
  }, [tema]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', destaque);
    try {
      localStorage.setItem('es-cor', destaque);
    } catch {}
  }, [destaque]);

  return <ThemeCtx.Provider value={{ tema, destaque, setTema, setDestaque }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
