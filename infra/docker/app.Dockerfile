# Imagem de deploy: o build do web vai para dentro da api, que serve os dois na mesma porta.
# O contexto do build é a raiz do repo (ver infra/lib/app-stack.ts), por isso os caminhos web/ e api/.
# Para testar localmente, a partir da raiz:  docker build -f infra/docker/app.Dockerfile -t app .

# 1) Build do front. A API fica em /api na mesma origem, então não há CORS.
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
ENV VITE_API_URL=/api \
    VITE_USE_MOCK=false
RUN npm run build

# 2) Build da api e remoção das dependências de desenvolvimento.
FROM node:24-alpine AS api
WORKDIR /api
COPY api/package*.json ./
RUN npm ci
COPY api/ ./
RUN npm run build && npm prune --omit=dev

# 3) Imagem final: só o necessário para rodar.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80 \
    WEB_DIST_DIR=/app/web
COPY --from=api /api/package.json ./
COPY --from=api /api/node_modules ./node_modules
COPY --from=api /api/dist ./dist
COPY --from=web /web/dist ./web
EXPOSE 80
# Anuncia o IP público da task no log (CloudWatch): na conta do hackathon, o participante não pode
# consultar a interface de rede (ec2:DescribeNetworkInterfaces), então o scripts/url.sh lê o IP daqui.
CMD ["sh", "-c", "echo \"task-public-ip=$(wget -qO- -T 5 https://checkip.amazonaws.com)\"; exec node dist/main"]
