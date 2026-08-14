# Deploy com Dokploy + GitHub Actions — guia rápido

Guia enxuto pra subir uma aplicação no **Dokploy** e automatizar o deploy via **GitHub Actions**.

---

## O que é o Dokploy

PaaS open-source que roda na **sua própria VPS** (tipo um Heroku/Vercel self-hosted).
Por baixo é **Docker + Traefik** (reverse proxy com **HTTPS automático** via Let's Encrypt).

Você sobe pela UI:

- **Applications** — a partir de um `Dockerfile`, **Nixpacks** (autodetecta a stack) ou **Docker Compose**;
- **Databases** gerenciados (Postgres, Redis, MySQL, Mongo);
- **domínios** com SSL automático, **variáveis de ambiente** por app, **logs** e métricas.

---

## Pré-requisitos

- Uma **VPS** (Ubuntu 22.04+, ~2 GB RAM já roda bem) com IP público.
- Um **domínio** apontando pra essa VPS (registro DNS tipo `A`).
- Uma conta num **registry** de imagens: Docker Hub ou GitHub Container Registry (GHCR).

---

## 1) Instalar o Dokploy

Na VPS:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Abra o painel em `http://SEU_IP:3000` e crie o usuário admin.

> Deixe as portas **80** e **443** liberadas no firewall — o Traefik usa elas pro SSL.

---

## 2) Criar o app

1. **Create Project** → dentro dele, **Create Service → Application** (ou **Compose**).
2. **Source**: conecte o **GitHub** (via GitHub App) ou informe o repositório + branch (`main`).
3. **Build Type**: `Dockerfile`, `Nixpacks` ou `Docker Compose`.
4. **Environment**: defina as variáveis no painel (ficam **fora** da imagem).
5. **Domains**: adicione o host (ex.: `app.seudominio.com`), confirme o DNS apontando pro IP
   e ligue **HTTPS** — o certificado é emitido sozinho.
6. **Deploy**: rode um build manual pra validar.

---

## 3) Automatizar o deploy

### Modelo A — Simples (o Dokploy faz tudo)

Ligue **Auto Deploy** na aplicação. A cada `push` na branch, o GitHub dispara um webhook
e o Dokploy **rebuilda na própria VPS**. Zero CI. Ideal pra projetos pequenos / front.

### Modelo B — Organizado (GitHub Actions → registry → Dokploy)  ⭐ recomendado

O CI **testa**, **builda a imagem** e **publica no registry**; depois aciona o **webhook de
deploy** do Dokploy, que só faz `pull` + restart.

Vantagens: roda lint/testes **antes** de subir, não consome CPU da VPS pra buildar,
funciona com imagem privada e permite **rollback** por tag.

**Configuração:**

1. No **Dokploy**: configure o serviço pra usar a **imagem** do registry
   (ex.: `usuario/meu-app:latest`) em vez de buildar do código, e
   **DESLIGUE o Auto Deploy** (importante — veja a nota abaixo).
2. Gere um **API token** em *Profile/Settings → API Keys*. A API fica documentada
   em `https://SEU_PAINEL/swagger`.
3. Pegue o **ID do serviço** (`composeId` pra Compose; `applicationId` pra Application) —
   aparece na URL do painel ao abrir o serviço, ou via `GET /api/project.all`.
4. No **GitHub**, em *Settings → Secrets and variables → Actions*, crie:
   - `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
   - `DOKPLOY_URL` (ex.: `https://painel.seudominio.com`)
   - `DOKPLOY_TOKEN` (a API key)
   - `DOKPLOY_COMPOSE_ID` (ou `DOKPLOY_APP_ID`)

> ⚠️ **Desligue o Auto Deploy no Dokploy quando usar este modelo.** Se ele ficar
> ligado, o Dokploy dispara o próprio build assim que detecta o `push` — **antes** de
> a imagem nova existir no registry — e você acaba com deploy duplicado / fora de ordem.
> No modelo B, o **único** gatilho deve ser a chamada de API feita pelo CI no fim do
> pipeline (depois do `push` da imagem).

**`.github/workflows/deploy.yml`:**

```yaml
name: deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1) qualidade antes de subir (ajuste pra sua stack)
      - run: npm ci && npm run lint && npm test && npm run build

      # 2) builda e publica a imagem
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/meu-app:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/meu-app:${{ github.sha }}

      # 3) dispara o deploy no Dokploy via API (composeId + token)
      - name: Deploy no Dokploy
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_TOKEN: ${{ secrets.DOKPLOY_TOKEN }}
          DOKPLOY_COMPOSE_ID: ${{ secrets.DOKPLOY_COMPOSE_ID }}
        run: |
          curl -fsS -X POST "$DOKPLOY_URL/api/compose.deploy" \
            -H "x-api-key: $DOKPLOY_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"composeId\":\"$DOKPLOY_COMPOSE_ID\"}"
```

> **Application** (em vez de Compose): use `POST /api/application.deploy` com o corpo
> `{"applicationId":"..."}`. A forma exata (endpoint e header de auth) está no
> `https://SEU_PAINEL/swagger`.

> **GHCR** em vez do Docker Hub: troque o `login-action` para `registry: ghcr.io`,
> use `username: ${{ github.actor }}` e `password: ${{ secrets.GITHUB_TOKEN }}`,
> e as tags `ghcr.io/usuario/meu-app:...`.

---

## Dicas que evitam dor de cabeça

- **Auto Deploy x CI:** escolha **um** gatilho. No modelo B (CI → API), **desligue o
  Auto Deploy** no Dokploy — senão ele builda no `push`, antes de a imagem nova existir,
  e briga com o deploy disparado pela API.
- **Segredos** ficam no painel do Dokploy (env por app) e nos *GitHub Secrets* —
  **nunca** na imagem nem no repositório.
- **Docker Compose com rede compartilhada:** se vários stacks usam a mesma rede externa,
  dê **nomes de serviço únicos** (`meuapp-db`, não `postgres`); senão o DNS interno do
  Docker colide entre os projetos.
- **Cloudflare na frente:**
  - o proxy (nuvem **laranja**) só cobre **portas HTTP/HTTPS padrão** (80, 443, 8443…),
    **não** portas custom (ex.: 5055, 8082) — pra essas, use nuvem cinza ou um subdomínio
    na 443;
  - **erro 526** = o certificado da origem ainda não foi emitido. Deixe a nuvem **cinza**
    até o Let's Encrypt validar (desafio ACME na porta 80) e depois volte pra laranja.
- **Rollback:** como a imagem é tagueada com `:${{ github.sha }}`, dá pra voltar pra um
  deploy anterior só trocando a tag no Dokploy.
- **Banco:** prefira o **database gerenciado** do Dokploy (backup/volume) a subir o Postgres
  junto no mesmo compose do app.

---

## Checklist

- [ ] VPS com Dokploy instalado, portas 80/443 abertas
- [ ] DNS do domínio apontando pro IP
- [ ] App criado (Dockerfile/Nixpacks/Compose) + env vars no painel
- [ ] Domínio + HTTPS ligados
- [ ] **Auto Deploy desligado** no Dokploy (modelo B)
- [ ] Serviço apontando pra imagem do registry; `composeId`/`applicationId` em mãos
- [ ] Secrets no GitHub (`DOCKERHUB_*`, `DOKPLOY_URL`, `DOKPLOY_TOKEN`, `DOKPLOY_COMPOSE_ID`)
- [ ] `deploy.yml` no repo
- [ ] `push` na `main` → CI builda, publica e dispara o deploy via API ✅
