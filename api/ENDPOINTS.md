# Enpoints disponíveis

> **Cadastro por empresa.** Cada empresa tem seus usuários, sua configuração de usina (`/plants/me`) e seus alertas (`/alerts`); todas as rotas autenticadas enxergam só a empresa de quem está logado. Normas, trechos, limites e notícias são globais. O token JWT carrega só o `id`: empresa e permissão (`isAdmin`) são relidas do banco a cada requisição, então quem é removido ou rebaixado perde o acesso na hora.

## Autenticação e Perfil (/auth e /profile)

- POST /auth/register - Cadastra a **empresa** e o primeiro usuário, que vira admin dela: `name`, `email`, `password`, `role?` (cargo), `companyName`, `cnpj` (com ou sem máscara; os dígitos verificadores são conferidos). 409 se o CNPJ ou o e-mail já tiverem conta. Os demais usuários entram por convite (`POST /user`).
- POST /auth/login - Retorna o JWT Token.
- POST /auth/forgot-password - Gera um token de redefinição e manda por e-mail (não revela se o e-mail existe ou não).
- POST /auth/reset-password - Troca a senha a partir do token recebido por e-mail. Serve também para o link de convite (o convidado define a senha por aqui).
- GET /auth/me - Pega os dados do usuário logado, com `isAdmin`, `company` (razão social) e `cnpj` da empresa dele.
- PUT /auth/me - Altera os dados do usuário logado (era `/profile`).

## Configurações da usina (/plants) (cassano)

> Uma configuração por empresa (criada no cadastro). `me` é a usina da empresa de quem está logado.

- GET /plants/me - Pega os dados técnicos da usina (fonte, potência, submercado, CO2, disponibilidade, áreas/subáreas monitoradas, `cegs` e `cnpjs`, canais e frequência de notificação).
- PUT /plants/me - Atualiza esses dados (o que recalibra o motor de alertas). `cegs` são os códigos das usinas na ANEEL (ex.: `EOL.CV.RN.007663-4.01`) e `cnpjs` os das SPEs donas delas; é por eles, e pelo CNPJ da empresa, que um ato individual chega à empresa. A API guarda o CEG sem dígito e versão (`EOL.CV.RN.007663`, o formato que o pipeline extrai do DOU) e o CNPJ só com dígitos; CEG ou CNPJ inválido responde 400.
- GET /plants/me/usinas-aneel?cnpjs= - Usinas em que o CNPJ da empresa, das SPEs salvas e dos `cnpjs` informados (separados por vírgula, para SPEs ainda não salvas) tem participação, segundo o cadastro de agentes de geração dos dados abertos da ANEEL: `[{ ceg, codigoCeg, nome, tipo, fase, cnpj, agente, participacaoPct }]`. A API baixa o CSV (~4,5 MB) na primeira consulta e guarda por um dia; sem acesso à ANEEL, responde 503.

## Trechos para RAG (/trechos) (cassano)

- POST /trechos - Cria um trecho (`normaId`, `artigo?`, `ordem?`, `texto`, `vetor?`). Usado pelo pipeline de extração pra popular a base vetorial.
- GET /trechos?normaId=uuid - Lista os trechos de uma norma, em ordem.
- GET /trechos/:id - Busca um trecho pelo id.
- POST /trechos/search - Busca por similaridade (`vetor`, `limit?`), devolvendo `similaridade`. Sem a extensão pgvector, a comparação é feita num índice em memória (`IndiceVetorial`), carregado na primeira busca e descartado a cada ingestão.
- DELETE /trechos/:id - Remove um trecho.

## Equipe da empresa (/user) — só admins

Todas respondem 403 para quem não é admin e 404 para usuário de outra empresa. A resposta de um membro é `{ id, name, email, role, isAdmin, convitePendente, desde }`, nunca a entidade.

- GET /user - Lista os membros da empresa.
- POST /user - Convida alguém (`name`, `email`, `role?`, `isAdmin?`). Manda um e-mail com o link para criar a senha (vale 7 dias) e devolve `{ membro, linkConvite }` — o front mostra o link para copiar quando não há SMTP. 409 se o e-mail já tiver conta.
- POST /user/:id/convite - Gera um link novo para quem ainda não aceitou (o anterior deixa de valer).
- PATCH /user/:id - `{ isAdmin }`: promove ou rebaixa. 400 se for deixar a empresa sem admin.
- DELETE /user/:id - Remove o usuário da empresa (definitivo). 400 se for a própria conta. Retorna 204.

## Normas / Feed de Resumos (/norms) (cassano)

> Implementado como `/norms` (não `/feed`), pra bater com `web/src/api/http.ts`.

- POST/GET/GET:id/PUT/DELETE /norms - CRUD completo. `GET /norms?source=aneel` filtra por fonte.
- GET /norms - O feed da empresa: os atos gerais das áreas/subáreas que ela monitora (com `escopo=todas`, ou sem área marcada, todos os gerais) e os atos individuais que citam a empresa (CNPJ da empresa ou de uma SPE, pela raiz, ou CEG de uma usina dela). Ato individual de outra empresa nunca aparece.
- GET /norms/:id/pdf - Gera e baixa um PDF de verdade do resumo (via `pdfkit`).

## Motor de Alertas (/alerts) (cassano)

- GET /alerts - Lista os alertas da empresa logada (ordem cronológica).
- POST /alerts/check - **Cruza `limites` × `configuracoes` de verdade** (o "Motor de Alertas: Cruza Lei x Perfil" do diagrama) e cria um alerta pra cada regra descumprida (sem duplicar se já existe um alerta não lido pro mesmo limite). Dispara e-mail pros usuários se `channels.email` estiver ligado no perfil da usina. O front chama isso logo depois de `PUT /plants/me`.
- PATCH /alerts/:id/read - Marca o alerta como lido (para apagar a bolinha de notificação no front). O front chama ao abrir um alerta na Central de Alertas.

Tipos de alerta (`tipo` na resposta, junto com `normId` e `lido`):

- `limite_excedido` - um `limite` extraído de uma norma não é cumprido pelos dados da usina.
- `norma_nova` - a ingestão trouxe um ato geral cuja área/subárea (do classificador) está entre as `areas`/`subareas` monitoradas em `/plants/me`. Sem subárea marcada, casa só pela área; sem área marcada, não gera alerta. A comparação ignora acento e maiúsculas.
- `ato_da_empresa` - a ingestão trouxe uma publicação que cita a empresa: o CNPJ dela ou de uma SPE em `cnpjs` (pela raiz: matriz e filiais) ou o CEG de uma usina em `cegs`. Vale mesmo fora das áreas monitoradas. É o único jeito de um ato individual (despacho que libera, transfere ou multa uma usina) gerar alerta.

E-mail: com `frequency = "Imediato"` o e-mail sai na hora. Com `"Resumo diário"` ou `"Resumo semanal"`, os alertas ficam para o cron (`AlertDigestService`: todo dia às 8h / segunda às 8h, horário de Brasília), que manda um e-mail só com os alertas do período.

> `parametro` em `limites` precisa bater com um campo numérico de `configuracoes` (`capacityMw`, `co2` ou `availability`) pro motor saber o que comparar — é uma convenção, não uma FK.

## Copiloto RAG (/chat) (cassano)

- POST /chat - Cria uma nova sessão de conversa.
- GET /chat - Lista as conversas do usuário logado (mais recente primeiro).
- GET /chat/:sessionId/messages - Carrega as mensagens de um chat específico.
- POST /chat/:sessionId/message - Salva a pergunta, gera a resposta e salva a resposta, devolve pro front.

> Com `AI_SERVICE_URL` no `.env`, a pergunta vai para o copiloto (`ai/servidor.py` + `ai/models/copiloto.py`): `POST {AI_SERVICE_URL}/ask` com o header `x-internal-key` e `{ "question": "...", "perfil": { ...GET /plants/me }, "historico": [{ "role": "user"|"assistant", "content": "..." }] }` (as 6 últimas mensagens da conversa), esperando `{ "answer": "texto com [n]", "citations": [{ "label": "[1] Lei nº 14.300/2022, Art. 26", "excerpt": "trecho", "normId": "uuid?", "url": "link oficial" }] }`. A API converte `answer` em HTML escapado (o LLM lê texto externo e não pode injetar HTML no front) e só repassa links `http(s)`.
>
> Fluxo do copiloto (uma busca só):
> 1. vetoriza a pergunta (`nvidia/nemotron-3-embed-1b`, 1024 dimensões) e chama `POST /interno/trechos/busca`: normas canônicas e novidades juntas, mais os trechos das normas e artigos citados na pergunta ("art. 26 da Lei 14.300");
> 2. ranqueia: similaridade × (1 + 0,20 × recência da novidade, que zera em 1 ano) + bônus da norma (0,20) e do artigo (0,25) citados; se uma novidade cita uma canônica, traz 2 trechos dela junto;
> 3. manda ao LLM (`google/gemma-4-31b-it`) os trechos com similaridade ≥ 0,40; se nenhum passa, ou se o LLM julga que nenhum responde (`SEM_RESPOSTA`), busca no DOU (expressões entre aspas, Seção 1, órgãos de energia), lê as publicações e repete o processo;
> 4. a resposta cita cada afirmação com [n]; `citations` traz só as fontes usadas, com trecho e link.
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
| `abrangencia` (`"geral"` ou `"individual"`, do classificador) | `abrangencia`; sem ela, `geral`. Ato individual só vai para a empresa citada |
| `cnpjs`, `cegs` (listas, de `ai/functions/identificadores.py`) | `cnpjs` (só dígitos, válidos) e `cegs` (sem dígito e versão); sem as colunas, a API tira do `texto` |
| `relevancia` (0–3) | `impact`: 3 = alto, 2 = médio, resto = baixo |
| `resumo` | `lead` e `extracoes.resumo` (ignorado se começar com "ERRO") |
| `mudancas` (`o_que_mudou`, `antes`, `depois`) | `changes` ("o que muda") |
| `prazos` (`data`, `descricao`) | `deadline` / `deadlineAt`: o próximo prazo ainda não vencido |
| `acao_necessaria`, `quem_e_afetado` | `why` ("por que importa") |
| `limites` (`parametro`, `operador`, `valor`, `unidade?`, `artigo?`, `trecho?`, `vigencia?`) | `limites` — `parametro` = `capacityMw`, `co2` ou `availability`; `operador` = `>`, `<`, `>=`, `<=` ou `=` |
| `trechos` (`artigo?`, `texto`, `vetor?`) | `trechos` com embedding; sem essa coluna, a API quebra o `texto` por artigo, sem vetor |
| `modelo`, `tokens_gastos` | `extracoes` |

Colunas extras aceitas: `canonica: true` marca a norma-base do copiloto (fica fora do radar de novidades e não gera alerta de "norma nova"); `somente_atualizar: true` nunca cria norma — se não achar a existente (pelo hash do texto ou pelo link), rejeita a linha com "norma não encontrada para atualizar" (é o que o `ai/reclassificar.py` usa). Norma que já existe só tem `abrangencia`, `cnpjs` e `cegs` atualizados (rodar de novo um dia já coletado corrige as normas antigas), a não ser que chegue com `trechos` vetorizados: aí os trechos dela também são trocados (`reindexadas`).

Resposta: `{ "recebidas": 3, "criadas": 2, "duplicadas": 0, "reindexadas": 0, "rejeitadas": [{ "indice": 2, "motivo": "sem \"titulo\"" }], "alertas": 2 }`.

### GET /interno/normas

As novidades já gravadas (sem as canônicas), com o texto: `[{ id, titulo, link, texto, abrangencia }]`. Usada pelo `ai/reclassificar.py` para classificar de novo em ato geral ou individual.

### GET /interno/clientes/identificadores

Raízes de CNPJ (8 dígitos) e CEGs de todos os clientes: `{ "raizesCnpj": ["18565382"], "cegs": ["EOL.CV.RN.007663"] }`. O `main.py` usa para descartar, antes do resumidor, os atos individuais que não citam nenhum cliente.

### POST /interno/trechos/busca

Busca vetorial do copiloto: `{ "vetor": [...], "limite?": 20, "numeros?": ["14300"], "artigos?": ["26"], "somenteReferencias?": false }`. Devolve os trechos mais parecidos (canônicas e novidades juntas) e, se `numeros` vier, os mais parecidos de cada norma citada e os dos `artigos` citados, cada um com `similaridade` e a norma (`id`, `code`, `title`, `numero`, `url`, `source`, `publishedAt`, `canonica`).

### Planejadas (ainda não implementadas)

- POST /interno/coleta/normas Roda o coletor de normas
- POST /interno/coleta/dou?data= Baixa e filtra o DOU de uma data
- POST /interno/extracao/{norma_id} Roda o extrator de uma norma
- POST /interno/alertas/recalcular Recalcula os alertas de todas as usinas
- PATCH /interno/limites/{id} Marca um limite como aprovado_manual
- GET /interno/execucoes Histórico de coletas e erros

# Tabelas da aplicação

- empresas (id, razao_social, cnpj)
- user (id, nome, email, senha, cargo, #company_id, is_admin, convite_pendente, token_reset_password)
- normas (id, titulo, orgao, tipo, numero, data, area, subarea, abrangencia, cnpjs, cegs, link, fonte oficial, situacao, hash, texto completo, coletado em) (lomenha)
- configuracoes (id, #companie_id, nome, fonte, modalidade, potencia(kW), data de protocolo, distribuidaora, tem armazenamento, participacao do maior titular%, nível de CO2, cegs, cnpjs) (cassano)
- materias_dou (id da matérias, data, seção, tipo de ato, orgao, titulo, ementa, texto, decisao do filtro e motivo, subarea, norma relacionada ) (lomenha)
- extracoes ( id, norma_id, hash do texto usado, modelo, resumo, tokens gastos, data) (lomenha)
- limites (id, norma_id, extracao_id, parâmetro, operador, valor, unidade, valor em kW, valor máximo, condições, vigência, artigo, trecho literal, status) (roberto)
- alertas (id, usina_id, limite_id ou norma_id, tipo, severidade, valor da usina, valor do limite, distância (%), mensagem, lido, criado em) (roberto)
- trechos (id, norma_id, artigo, ordem, texto, vetor) (cassano)
- noticias (id, titulo, resumo, fonte, url, image_url, setor, publicado_em) (cassano)
- chat_sessions (id, user_id, titulo) (cassano)
- chat_mensagens (id, session_id, autor, texto, citacoes) (cassano)
