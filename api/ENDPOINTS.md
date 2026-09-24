# Enpoints disponíveis

## Autenticação e Perfil (/auth e /profile)

- POST /auth/register - Cria o usuário.
- POST /auth/login - Retorna o JWT Token.
- POST /auth/forgot-password - Gera um token de redefinição e manda por e-mail (não revela se o e-mail existe ou não).
- POST /auth/reset-password - Troca a senha a partir do token recebido por e-mail.
- GET /auth/me - Pega os dados do usuário logado (era `/profile` no plano original).
- PUT /auth/me - Altera os dados do usuário logado (era `/profile`).
- GET /companie - Pega os dados da empresa (razão social/CNPJ vêm do `.env`, já embutidos na resposta de `/auth/me`)

## Configurações da usina (/plants) (cassano)

> Implementado como `/plants/me` (não `/companie`) para bater com o que o front já chama em `web/src/api/http.ts`. É uma linha única por instância/banco — sem `#companie_id`, já que a empresa agora é fixa por deploy (via `.env`).

- GET /plants/me - Pega os dados técnicos da usina (fonte, potência, submercado, CO2, disponibilidade, áreas/subáreas monitoradas, canais e frequência de notificação).
- PUT /plants/me - Atualiza esses dados (o que recalibra o motor de alertas).

## Trechos para RAG (/trechos) (cassano)

- POST /trechos - Cria um trecho (`normaId`, `artigo?`, `ordem?`, `texto`, `vetor?`). Usado pelo pipeline de extração pra popular a base vetorial.
- GET /trechos?normaId=uuid - Lista os trechos de uma norma, em ordem.
- GET /trechos/:id - Busca um trecho pelo id.
- POST /trechos/search - Busca por similaridade (`vetor`, `limit?`). Sem a extensão pgvector no Postgres do docker-compose, a comparação é feita em memória (cosseno) — trocar por `vector <-> vector` se a extensão for habilitada.
- DELETE /trechos/:id - Remove um trecho.

## Usuários (/user)

- POST /user - Cria o usuário (`name`, `email`, `isActive` opcional). 409 se o e-mail já existir.
- GET /user - Lista os usuários.
- GET /user/:id - Busca um usuário pelo id (uuid).
- PUT /user/:id - Atualiza o usuário. Todos os campos são opcionais.
- DELETE /user/:id - Remove o usuário (soft delete). Retorna 204.

## Normas / Feed de Resumos (/norms) (cassano)

> Implementado como `/norms` (não `/feed`), pra bater com `web/src/api/http.ts`.

- POST/GET/GET:id/PUT/DELETE /norms - CRUD completo. `GET /norms?source=aneel` filtra por fonte.
- GET /norms/:id/pdf - Gera e baixa um PDF de verdade do resumo (via `pdfkit`).

## Motor de Alertas (/alerts) (cassano)

- GET /alerts - Lista os alertas da empresa logada (ordem cronológica).
- POST /alerts/check - **Cruza `limites` × `configuracoes` de verdade** (o "Motor de Alertas: Cruza Lei x Perfil" do diagrama) e cria um alerta pra cada regra descumprida (sem duplicar se já existe um alerta não lido pro mesmo limite). Dispara e-mail pros usuários se `channels.email` estiver ligado no perfil da usina. O front chama isso logo depois de `PUT /plants/me`.
- PATCH /alerts/:id/read - Marca o alerta como lido (para apagar a bolinha de notificação no front). O front chama ao abrir um alerta na Central de Alertas.

Tipos de alerta (`tipo` na resposta, junto com `normId` e `lido`):

- `limite_excedido` - um `limite` extraído de uma norma não é cumprido pelos dados da usina.
- `norma_nova` - a ingestão trouxe uma norma cuja área/subárea (do classificador) está entre as `areas`/`subareas` monitoradas em `/plants/me`. Sem subárea marcada, casa só pela área; sem área marcada, não gera alerta. A comparação ignora acento e maiúsculas.

E-mail: com `frequency = "Imediato"` o e-mail sai na hora. Com `"Resumo diário"` ou `"Resumo semanal"`, os alertas ficam para o cron (`AlertDigestService`: todo dia às 8h / segunda às 8h, horário de Brasília), que manda um e-mail só com os alertas do período.

> `parametro` em `limites` precisa bater com um campo numérico de `configuracoes` (`capacityMw`, `co2` ou `availability`) pro motor saber o que comparar — é uma convenção, não uma FK.

## Copiloto RAG (/chat) (cassano)

- POST /chat - Cria uma nova sessão de conversa.
- GET /chat - Lista as conversas do usuário logado (mais recente primeiro).
- GET /chat/:sessionId/messages - Carrega as mensagens de um chat específico.
- POST /chat/:sessionId/message - Salva a pergunta, gera a resposta e salva a resposta, devolve pro front.

> Com `AI_SERVICE_URL` no `.env`, a pergunta vai para o microsserviço Python de RAG: `POST {AI_SERVICE_URL}/ask` com `{ "question": "...", "perfil": { ...mesmo formato de GET /plants/me } }`, esperando `{ "answer": "texto (markdown simples: **negrito** e listas com -)", "citations": [{ "label": "REN 1.000/2021, art. 5º", "excerpt": "trecho literal", "normId": "uuid?" }] }`. A API converte `answer` em HTML escapado (o LLM lê texto externo e não pode injetar HTML no front).
>
> Sem `AI_SERVICE_URL`, ou se o serviço falhar, a resposta é a busca por palavra-chave nos `trechos` (`TrechoService.searchByText`, ignorando acentos).

## Health

- GET /health - Confirma que a API e o banco estão no ar (pública, para o deploy). `{ "status": "ok" }` ou 503.

## Rotas internas (/interno)

Chamadas pelo serviço Python, nunca pelo front. Sem JWT: exigem o header `x-internal-key` igual ao `INTERNAL_API_KEY` do `.env` (sem a variável, respondem 503).

> No deploy da AWS a API fica sob `/api` (ex.: `/api/interno/ingestao`); no docker-compose é direto (`http://api:3000/interno/ingestao`).

### POST /interno/ingestao

Recebe o DataFrame final do pipeline (`coletar_df` em `ai/models/summarizer.py`) e grava, numa transação por norma: `normas`, `extracoes`, `limites` e `trechos`. Depois cria os alertas (`norma_nova` e `limite_excedido`) e dispara o e-mail conforme a frequência. Responde **200**.

Do lado do Python, basta:

```python
import json, os, requests
corpo = {"normas": json.loads(df_final.to_json(orient="records", force_ascii=False))}
requests.post(f"{API_URL}/interno/ingestao", json=corpo, headers={"x-internal-key": os.environ["INTERNAL_API_KEY"]}, timeout=120)
```

(`to_json` em vez de `to_dict` porque converte o `NaN` do pandas em `null` — `NaN` não é JSON válido.)

Colunas lidas de cada linha (as demais são ignoradas; todas opcionais, menos `titulo` e `texto` ou `link`):

| Coluna | Vira |
| --- | --- |
| `titulo` | `code` ("Despacho nº 2.345/2026", usando `tipo` + número do título) |
| `titulo_curto` | manchete do card; sem ela, usa a 1ª frase de `resumo` |
| `data` (`DD/MM/AAAA` ou ISO), `orgao`, `tipo`, `link` | `publishedAt`, `orgao`, `tipo`, `url` (a fonte `aneel`/`ccee`/`dou` sai do domínio do link, ou de `fonte`) |
| `texto` | `textoCompleto`, `hash` (sha256, usado junto com o `link` para ignorar duplicadas) e os `trechos` (quebrados por artigo) |
| `area`, `subarea` (listas do classificador, ex.: `["Solar > Geração distribuída"]`) | usados pelo alerta `norma_nova` |
| `relevancia` (0–3) | `impact`: 3 = alto, 2 = médio, resto = baixo |
| `resumo` | `lead` e `extracoes.resumo` (ignorado se começar com "ERRO") |
| `mudancas` (`o_que_mudou`, `antes`, `depois`) | `changes` ("o que muda") |
| `prazos` (`data`, `descricao`) | `deadline` / `deadlineAt`: o próximo prazo ainda não vencido |
| `acao_necessaria`, `quem_e_afetado` | `why` ("por que importa") |
| `limites` (`parametro`, `operador`, `valor`, `unidade?`, `artigo?`, `trecho?`, `vigencia?`) | `limites` — `parametro` = `capacityMw`, `co2` ou `availability`; `operador` = `>`, `<`, `>=`, `<=` ou `=` |
| `trechos` (`artigo?`, `texto`, `vetor?`) | `trechos` com embedding; sem essa coluna, a API quebra o `texto` por artigo, sem vetor |
| `modelo`, `tokens_gastos` | `extracoes` |

Resposta: `{ "recebidas": 3, "criadas": 2, "duplicadas": 0, "rejeitadas": [{ "indice": 2, "motivo": "sem \"titulo\"" }], "alertas": 2 }`.

### Planejadas (ainda não implementadas)

- POST /interno/coleta/normas Roda o coletor de normas
- POST /interno/coleta/dou?data= Baixa e filtra o DOU de uma data
- POST /interno/extracao/{norma_id} Roda o extrator de uma norma
- POST /interno/alertas/recalcular Recalcula os alertas de todas as usinas
- PATCH /interno/limites/{id} Marca um limite como aprovado_manual
- GET /interno/execucoes Histórico de coletas e erros

# Tabelas da aplicação

- user (id, nome, email, senha, token_reset_password, #companie_id)
- normas (id, titulo, orgao, tipo, numero, data, area, subarea, link, fonte oficial, situacao, hash, texto completo, coletado em) (lomenha)
- configuracoes (id, #companie_id, nome, fonte, modalidade, potencia(kW), data de protocolo, distribuidaora, tem armazenamento, participacao do maior titular%, nível de CO2) (cassano)
- materias_dou (id da matérias, data, seção, tipo de ato, orgao, titulo, ementa, texto, decisao do filtro e motivo, subarea, norma relacionada ) (lomenha)
- extracoes ( id, norma_id, hash do texto usado, modelo, resumo, tokens gastos, data) (lomenha)
- limites (id, norma_id, extracao_id, parâmetro, operador, valor, unidade, valor em kW, valor máximo, condições, vigência, artigo, trecho literal, status) (roberto)
- alertas (id, usina_id, limite_id ou norma_id, tipo, severidade, valor da usina, valor do limite, distância (%), mensagem, lido, criado em) (roberto)
- trechos (id, norma_id, artigo, ordem, texto, vetor) (cassano)
- noticias (id, titulo, resumo, fonte, url, image_url, setor, publicado_em) (cassano)
- chat_sessions (id, user_id, titulo) (cassano)
- chat_mensagens (id, session_id, autor, texto, citacoes) (cassano)
