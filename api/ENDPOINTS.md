# Enpoints disponíveis

## Autenticação e Perfil (/auth e /profile)

- POST /auth/register - Cria o usuário.
- POST /auth/login - Retorna o JWT Token.
- GET /profile - Pega os dados do usuário
- PUT /profile - Altera os dados do usuário
- GET /companie - Pega os dados da empresa
- PUT /companie - Atualiza os dados técnicos (setor, capacidade, CO2) para recalibrar a IA.

## Usuários (/user)

- POST /user - Cria o usuário (`name`, `email`, `isActive` opcional). 409 se o e-mail já existir.
- GET /user - Lista os usuários.
- GET /user/:id - Busca um usuário pelo id (uuid).
- PUT /user/:id - Atualiza o usuário. Todos os campos são opcionais.
- DELETE /user/:id - Remove o usuário (soft delete). Retorna 204.

## Feed de Resumos (/feed)

- GET /feed - Lista os resumos diários das normativas (com paginação). Pode receber filtros: ?source=ANEEL.

## Motor de Alertas (/alerts)

- GET /alerts - Lista os alertas da empresa logada (ordem cronológica).

<!-- - GET /alertas/{id} - Detalhe com trecho da norma, artigo e link -->

- PATCH /alerts/:id/read - Marca o alerta como lido (para apagar a bolinha de notificação no front).

## Copiloto RAG (/chat)

- POST /chat - Cria uma nova sessão de conversa.
- GET /chat - Lista o histórico de conversas antigas.
- GET /chat/:sessionId/messages - Carrega as mensagens de um chat específico.
- POST /chat/:sessionId/message - (O Endpoint mais complexo) Recebe a pergunta do usuário. O NestJS pega essa pergunta, envia via requisição HTTP interna para o seu Microsserviço em Python, espera a resposta do RAG, salva no banco e devolve para o frontend.

## Rotas internas (se der tempo)

Disparam as etapas pesadas do pipeline. Protegidas por uma chave própria e nunca expostas no front.

- POST /interno/coleta/normas Roda o coletor de normas
- POST /interno/coleta/dou?data= Baixa e filtra o DOU de uma data
- POST /interno/extracao/{norma_id} Roda o extrator de uma norma
- POST /interno/alertas/recalcular Recalcula os alertas de todas as usinas
- PATCH /interno/limites/{id} Marca um limite como aprovado_manual
- GET /interno/execucoes Histórico de coletas e erros
- GET /health Confirma que a API e o banco estão no ar (pública, para o deploy)

# Tabelas da aplicação

- user (id, nome, email, senha, token_reset_password, #companie_id)
- normas (id, titulo, orgao, tipo, numero, data, area, subarea, link, fonte oficial, situacao, hash, texto completo, coletado em) (lomenha)
- configuracoes (id, #companie_id, nome, fonte, modalidade, potencia(kW), data de protocolo, distribuidaora, tem armazenamento, participacao do maior titular%, nível de CO2) (cassano)
- materias_dou (id da matérias, data, seção, tipo de ato, orgao, titulo, ementa, texto, decisao do filtro e motivo, subarea, norma relacionada ) (lomenha)
- extracoes ( id, norma_id, hash do texto usado, modelo, resumo, tokens gastos, data) (lomenha)
- limites (id, norma_id, extracao_id, parâmetro, operador, valor, unidade, valor em kW, valor máximo, condições, vigência, artigo, trecho literal, status) (roberto)
- alertas (id, usina_id, limite_id ou norma_id, tipo, severidade, valor da usina, valor do limite, distância (%), mensagem, lido, criado em) (roberto)
- trechos (id, norma_id, artigo, ordem, texto, vetor) (cassano)
