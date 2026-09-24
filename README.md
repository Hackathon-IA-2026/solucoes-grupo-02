# Energy Start

> Inteligência regulatória para a transição energética. O Energy Start lê diariamente as publicações da ANEEL, do MME e do CNPE no Diário Oficial da União, resume o que mudou, cruza as regras novas com o perfil da usina e avisa a empresa quando algo afeta a sua operação.

Grupo 2 — Hackathon IA 2026.

## Como funciona

```
ai/ (Python)                    api/ (NestJS)                          web/ (React)
coleta do DOU ──▶ classificador ──▶ resumidor ──POST /interno/ingestao──▶ normas, trechos, limites ──▶ painel, resumos
                  (área/subárea)    (mudanças,                            motor de alertas ──────────▶ central de alertas
                                     prazos)                              (norma nova na área,          + e-mail
                                                                           limite × perfil da usina)
                                    RAG (/ask) ◀──── copiloto ◀───────────────────────────────────── chat com citações
```

- **Ingestão** ([ai/](ai/)): coleta as publicações do dia no DOU, classifica cada uma por área e subárea (Solar, Eólica, Armazenamento…) e extrai, com trechos conferidos contra o texto original, o que mudou, os prazos e quem é afetado.
- **API** ([api/](api/)): recebe esse resultado, guarda as normas quebradas em trechos por artigo e dispara os alertas: norma nova numa área que a usina monitora, ou limite regulatório que os dados da usina não cumprem. Os e-mails saem na hora ou em resumo diário ou semanal, conforme o perfil. Os endpoints estão em [api/ENDPOINTS.md](api/ENDPOINTS.md).
- **Web** ([web/](web/)): painel, resumos (com PDF e link para o documento original), central de alertas, notícias e o copiloto.

## Tecnologias utilizadas

- Linguagens: TypeScript e Python
- Frameworks: NestJS + TypeORM (API), React + Vite + Tailwind CSS (web), pandas (pipeline)
- Banco de dados: PostgreSQL 16
- APIs / serviços externos: Diário Oficial da União (in.gov.br) e modelos de linguagem via API da NVIDIA
- Deploy: AWS Fargate via CDK ([infra/](infra/))

## Como rodar o projeto

```bash
git clone git@github.com:Hackathon-IA-2026/solucoes-grupo-02.git
cd solucoes-grupo-02
cp .env.example .env          # preencha DB_*, JWT_SECRET e INTERNAL_API_KEY

docker compose up             # Postgres + API (http://localhost:3333) + web (http://localhost:5173) + serviço de IA
```

Sem Docker, rode cada parte:

```bash
cd api && npm install && npm run start:dev    # precisa de um Postgres no DB_HOST/DB_PORT do .env
cd web && npm install && npm run dev          # VITE_USE_MOCK=true roda o front sem backend
cd ai  && pip install -r requirements.txt && python main.py
```

Testes da API: `cd api && npx jest`.

### Variáveis de ambiente principais

| Variável | Para quê |
| --- | --- |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Postgres |
| `JWT_SECRET` | login |
| `INTERNAL_API_KEY` | chave que o serviço Python manda em `x-internal-key` para gravar normas (`POST /interno/ingestao`) |
| `AI_SERVICE_URL` | opcional: URL do serviço de RAG do copiloto; sem ela, o copiloto busca por palavra-chave |
| `SMTP_*` | opcional: sem SMTP, os e-mails de alerta e de senha só aparecem no log |
| `WEB_URL` | link do front usado nos e-mails |

## Pré-requisitos

- Docker e Docker Compose, **ou** Node 24, Python 3.10+ e PostgreSQL 16
- Uma chave da API da NVIDIA para os modelos do pipeline em `ai/`

## Licença

Este projeto está sob a licença MIT — veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
