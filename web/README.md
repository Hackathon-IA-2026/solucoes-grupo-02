# Energy Start — Web

Front-end do Energy Start (Hackathon IA 2026, Grupo 2).
React + TypeScript + Vite + Tailwind CSS.

## Rodar

```bash
cp .env.example .env
npm install
npm run dev     # http://localhost:5173
```

Sem backend no ar, o app roda inteiro com dados locais (`VITE_USE_MOCK=true`).
Qualquer e-mail e senha entram.

## Ligar no backend

```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3333
```

`src/api/index.ts` escolhe entre `mock.ts` e `http.ts`; as duas implementam a
mesma interface `Api` (`src/types.ts`). Se a API cair durante o pitch, volte a
variável para `true`.

## Contrato que o backend precisa expor

| Método | Rota | Resposta |
|---|---|---|
| POST | `/auth/login` | `{ token, user }` |
| POST | `/auth/register` | `{ token, user }` |
| POST | `/auth/forgot-password` | `204` |
| POST | `/auth/reset-password` | `204` |
| GET | `/norms?source=aneel\|ccee\|dou` | `Norm[]` |
| GET | `/norms/:id` | `Norm` |
| GET | `/plants/me` | `Plant` |
| PUT | `/plants/me` | `Plant` |
| GET | `/alerts` | `Alert[]` |
| POST | `/copilot/ask` | `{ answer, citations[] }` |

`answer` volta como HTML curto (`<p>`, `<ul>`, `<b>`), montado pelo prompt do
copiloto no backend. Se preferir Markdown, troque o `dangerouslySetInnerHTML`
em `CopilotPage`.

## Tailwind

`tailwind.config.js` mapeia os tokens do produto para nomes de utilitário:
`bg-surface`, `text-ink-2`, `border-line`, `bg-accent`, `text-accent-on`, etc.
Cada um aponta para uma CSS custom property definida em `src/styles/tokens.css`.

É por isso que tema claro/escuro e as quatro cores de destaque continuam
funcionando sem um único `dark:` no JSX: o `ThemeProvider` troca
`data-theme` e `data-accent` no `<html>`, as variáveis mudam e todos os
utilitários acompanham.

Consequência prática: modificador de opacidade não funciona nessas cores
(`bg-surface/50` não gera nada), porque o valor é um `var()` e não canais RGB.
Onde precisa de transparência, o código usa `white/10`, `black/20` ou um
`rgba()` arbitrário.

Padrões repetidos viraram componentes em `src/components/ui.tsx` — `Button`,
`Field`, `Chip`, `Switch`, `Panel`, `SrcBadge`, `ImpactBadge`, `LimitBar` — em
vez de `@apply`. Para classes compartilhadas fora de componente existem as
constantes `CAMPO` e `ROTULO`.

Breakpoints estão em 880px (`md`) e 1080px (`lg`), iguais aos do protótipo.

## Estrutura

```
src/
  api/          mock.ts | http.ts | index.ts (a troca)
  components/   AppShell, Brandmark, ui.tsx
  context/      Auth, Theme (claro/escuro + cor), Toast
  pages/        Login, Register, ForgotPassword, Dashboard, Alerts, Summaries, Copilot, Profile
  styles/       tokens.css — variáveis e camada base
  types.ts      contrato compartilhado com o backend
```

`VITE_HASH_ROUTER=true` troca o BrowserRouter por HashRouter. Serve para gerar
uma build de arquivo único para demonstração; no desenvolvimento normal ignore.
