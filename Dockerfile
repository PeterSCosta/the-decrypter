# syntax=docker/dockerfile:1.7
# The Decrypter é uma SPA Vite (estática) → build com Node, serve com nginx.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Lockfile + workspace (este traz onlyBuiltDependencies p/ esbuild/biome/tailwind-oxide)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# URL do backend embutida no bundle em build time (var VITE_*). Default: produção.
ARG VITE_API_BASE_URL=https://apiarromba.thelogiclab.com.br
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm build

# ---- runtime ----
FROM nginx:1.27-alpine AS runner
# htpasswd (apache2-utils) p/ a senha de acesso opcional via Basic Auth.
RUN apk add --no-cache apache2-utils
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-basic-auth.sh /docker-entrypoint.d/40-basic-auth.sh
RUN chmod +x /docker-entrypoint.d/40-basic-auth.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# nginx já é o CMD padrão da imagem base (roda /docker-entrypoint.d/* antes)
