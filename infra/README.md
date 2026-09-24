# Deploy na AWS (hackathon)

Uma URL pública servindo o web e a api, com Postgres persistente:

```
Navegador ──http://IP──▶ Task Fargate (IP público)
                           ├─ api      NestJS + build do web   (/ = web, /api/* = api)
                           └─ postgres localhost:5432 ──▶ disco EFS (dados sobrevivem a reinícios)
```

Sem load balancer e sem RDS, porque não estão liberados no ambiente. Tudo é criado pela stack CDK em
[lib/app-stack.ts](lib/app-stack.ts) (comentada linha a linha). A imagem é gerada por
[docker/app.Dockerfile](docker/app.Dockerfile).

## Testar a imagem localmente (sem AWS, sem custo)

Na raiz do repo:

```bash
docker build -f infra/docker/app.Dockerfile -t g02-app .
docker network create g02 && \
docker run -d --rm --name g02-db  --network g02 -e POSTGRES_USER=app -e POSTGRES_DB=app -e POSTGRES_PASSWORD=teste postgres:16-alpine && \
docker run -d --rm --name g02-app --network g02 -p 8080:80 \
  -e DB_HOST=g02-db -e DB_USER=app -e DB_NAME=app -e DB_PASSWORD=teste -e JWT_SECRET=x -e DB_SYNCHRONIZE=true g02-app
# abrir http://localhost:8080 — depois: docker rm -f g02-app g02-db && docker network rm g02
```

E validar a stack (gera o template CloudFormation em `cdk.out/`, não precisa de conta):

```bash
cd infra && npm ci && npx cdk synth
```

## Sexta: primeiro deploy na conta do hackathon

Anote no fim deste arquivo tudo o que for diferente do esperado.

1. **Preparar o terminal** (Code Editor do workshop), na raiz do repo:
   ```bash
   export AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1
   ```
2. **Reconhecimento**: `infra/scripts/discover.sh`
   - Escolha uma VPC e **duas subnets públicas** (`MapPublicIpOnLaunch = True`, AZs diferentes).
   - Preencha `vpcId`, `publicSubnetIds` e `availabilityZones` em [cdk.json](cdk.json), com as AZs na mesma ordem das subnets.
   - Se `CDKToolkit` não existir: `cd infra && npx cdk bootstrap`.
   - Se o Docker não estiver disponível no Code Editor, **pare e avise o time**. É preciso outro jeito de gerar a imagem (CodeBuild).
3. **Segredos** (uma vez só): `infra/scripts/setup-secrets.sh`
4. **Deploy**: `infra/scripts/deploy.sh`. O primeiro leva de 10 a 15 min.
5. **Abrir**: `infra/scripts/url.sh`. Crie um usuário e navegue.
6. **Testar a persistência**: reinicie a task e confira que o usuário continua existindo:
   ```bash
   aws ecs update-service --cluster <ClusterName> --service <ServiceName> --force-new-deployment
   ```
7. **Cronometrar um redeploy**: mude um texto no web e rode `deploy.sh` de novo.

## Quando der errado

| Sintoma | Onde olhar |
|---|---|
| `cdk deploy` falha | Console → CloudFormation → stack `Grupo02App` → aba **Events**. O **primeiro** `FAILED` (de baixo para cima) é a causa. |
| `AccessDenied` / `not authorized to perform X` | A mensagem diz qual role e qual ação. Anote e pergunte aos organizadores se não for contornável. |
| Stack em `ROLLBACK_COMPLETE` | Não dá para atualizar: `npx cdk destroy` e deploy de novo. O disco EFS fica (RETAIN). |
| Deploy "trava" em `CREATE_IN_PROGRESS` no Service | A task não está subindo: `scripts/status.sh` e `scripts/logs.sh` |
| Task sobe e morre em loop | `scripts/status.sh` (motivo) → `scripts/logs.sh api` ou `scripts/logs.sh postgres` |
| `CannotPullContainerError` | Sem acesso à internet: subnet não é pública ou a task ficou sem IP público |
| `ResourceInitializationError` com `efs` / `mount` | Security group do EFS ou permissão de EFS no task role |
| `ResourceInitializationError` com `ssm` / `secrets` | Faltou `setup-secrets.sh` ou o execution role não lê o parâmetro |
| Navegador fica carregando até dar timeout | Security group da porta 80 ou IP errado (ele muda a cada task: `scripts/url.sh`) |
| Página abre, mas login dá erro | `scripts/logs.sh api` (erro de banco? `DB_*`/senha) |
| `password authentication failed` | O parâmetro `/grupo02/db-password` foi trocado depois que o banco foi criado |
| Qualquer coisa estranha | `echo $AWS_REGION` tem que ser `us-east-1` |

Outros scripts: `scripts/shell.sh` abre um terminal na api, e `scripts/shell.sh postgres` abre um `psql`
(precisam do Session Manager plugin).

## Anotações da sexta

- VPC / subnets usadas:
- Modelo do Bedrock que funcionou (prefixo `us.` ou `global.`):
- Tempo do primeiro deploy / de um redeploy:
- Problemas encontrados e como resolvemos:
