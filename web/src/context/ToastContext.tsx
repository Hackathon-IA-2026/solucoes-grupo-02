import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();

  const mostrar = useCallback((texto: string) => {
    setMsg(texto);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-[26px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-navy px-[18px] py-[11px] text-sm font-medium text-white shadow-pop transition-[opacity,transform] ${
          msg ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}
