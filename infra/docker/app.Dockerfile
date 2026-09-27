# Imagem de deploy (contexto: raiz do repo): a api serve o build do web na mesma porta.

# 1) Build do front
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
ENV VITE_API_URL=/api \
    VITE_USE_MOCK=false
RUN npm run build

# 2) Build da api
FROM node:24-alpine AS api
WORKDIR /api
COPY api/package*.json ./
RUN npm ci
COPY api/ ./
RUN npm run build && npm prune --omit=dev

# 3) Imagem final
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
# Anuncia o IP público no log: a conta não permite ec2:DescribeNetworkInterfaces (ver scripts/url.sh).
CMD ["sh", "-c", "echo \"task-public-ip=$(wget -qO- -T 5 https://checkip.amazonaws.com)\"; exec node dist/main"]
