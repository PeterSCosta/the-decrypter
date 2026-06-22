# Deploy — The Decrypter (Dokploy)

App **Vite estática** servida por **nginx**. Mesmo padrão do Logic Lab, mas o
runtime é nginx (não Node), porque aqui é só HTML/JS/CSS + os JSONs em
`public/data/`.

Domínio alvo: **arromba.thelogiclab.com.br**

## Build local (testar a imagem)

```bash
docker build -t the-decrypter --build-arg VITE_W3W_API_KEY=SUA_CHAVE .
docker run --rm -p 8080:80 the-decrypter   # abre http://localhost:8080
```

## Opção A — Dokploy build pelo Dockerfile (mais simples)

1. Dokploy → **Create Application** → fonte = este repositório, branch `main`.
2. Build type = **Dockerfile** (raiz do repo).
3. **Build args**: `VITE_W3W_API_KEY` = sua chave do what3words (opcional — sem
   ela o what3words só não resolve; o resto funciona).
4. **Domains**: adicione `arromba.thelogiclab.com.br`, **Container Port = 80**,
   HTTPS/Let's Encrypt ligado.
5. Deploy. Pushes na `main` podem ser auto-deployados (webhook do Dokploy).

## Opção B — Imagem no Docker Hub + Compose (igual ao Logic Lab) — recomendada

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), a cada
push na `main`: (1) builda e publica `petercosta/the-decrypter:latest`, e **só
então** (2) dispara o Dokploy pela API (`POST /api/compose.deploy`). Como o trigger
é o **último passo**, o deploy **espera a imagem nova** — não dá mais a corrida de
deployar o `latest` antigo.

Secrets do GitHub necessários: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`,
`DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID` e (opcional) `VITE_W3W_API_KEY`.

No Dokploy:
1. **Create → Docker Compose**, apontando para
   [`docker-compose.yml`](docker-compose.yml) (usa a rede externa
   `logiclabnetwork`, a mesma do Logic Lab).
2. **Domains**: `arromba.thelogiclab.com.br` → serviço `the-decrypter`, porta 80.
3. **Desligue o "Auto Deploy"** — quem deploya é a Action (depois do push da imagem).
   Pegue o **API key** (Settings) e o **`composeId`** (URL do serviço) → coloque nos
   secrets do GitHub acima.
4. Deploy. A partir daí, todo push na `main` faz build → push → deploy na ordem certa.

## Senha de acesso (opcional)

Como o app é estático, a senha é exigida **no nginx** (HTTP Basic Auth), não no
JavaScript. Defina as env vars do container — vazias = sem senha:

| Variável | Exemplo |
|---|---|
| `BASIC_AUTH_USER` | `arromba` |
| `BASIC_AUTH_PASSWORD` | `umaSenhaForte` |

No Dokploy, adicione essas duas em **Environment** da aplicação/serviço. O
entrypoint gera o `.htpasswd` no start; quem não tiver a senha recebe `401` e
não baixa nem o HTML. Funciona com HTTPS (o Dokploy já provê via Let's Encrypt),
então a senha trafega protegida.

Teste local:

```bash
docker run --rm -p 8080:80 \
  -e BASIC_AUTH_USER=arromba -e BASIC_AUTH_PASSWORD=segredo the-decrypter
```

> Alternativa: dá pra usar o Basic Auth do **Traefik/Dokploy** no nível do
> domínio (middleware `basicauth`), sem mexer no container. As duas abordagens
> são equivalentes; a do nginx já vem pronta aqui.

## Notas

- `VITE_W3W_API_KEY` é embutida no bundle (inerente a app front-end). Use uma
  chave com restrição de domínio quando possível.
- As consultas (BrasilAPI, Nominatim, what3words) saem **do navegador do
  usuário** direto para as APIs — o nginx só serve os arquivos estáticos, não
  faz proxy. Não há backend.
- CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda lint +
  typecheck + testes + build em cada push/PR.
