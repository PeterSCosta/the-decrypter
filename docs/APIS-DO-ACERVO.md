<!-- Verificação multiagente (11 agentes) das fontes da Cola, 17/08/2026, com os
     endpoints CHAMADOS. Eu reconferi na mão TSE, CNAE, FIPE, Anatel e COD_LOG
     antes de mexer nos selos; o que não reconferi está marcado abaixo e NÃO
     virou mudança de selo. -->

# Veredito das 10 fontes investigadas — aba Cola

Li o `sources.ts` real (`/Users/peter/Repos/the-decrypter/src/features/reference/sources.ts`, 320 linhas), então a coluna "selo hoje" abaixo é o que está no arquivo, não suposição.

## 1. O veredito

| Fonte | Selo hoje | Selo sugerido | Tem API? | Dá para implementar? | Esforço | Valor |
|---|---|---|---|---|---|---|
| **tse** | consulta-manual | **aberta** | Sim, oficial — JSON estático, `Access-Control-Allow-Origin: *` | Sim, só no front | 2–4 h | **alto** |
| **fipe** | consulta-manual | **aberta** | Sim, não oficial (API interna do site, sem docs) | Sim, só no front — **não** pelo backend | ~meio dia | médio |
| **cnae** | consulta-manual | **aberta** | Sim, oficial (IBGE `servicodados`) | Sim, só no front | poucas horas | baixo |
| **cbmsc** | consulta-manual | **aberta** (dado embarcado) | Não — mas o dado existe em ato oficial | Sim, extração já feita e validada | ~2 h | médio |
| **portal-covid-blumenau** | consulta-manual | **aberta** (dado embarcado) | Sim, não oficial (WP REST, CORS liberado) | Sim | ~30 min | médio |
| **cid10** | consulta-manual | **adiada** | Não — só arquivo (DATASUS ZIP) | Sim, mas sob demanda | ~2 h | baixo |
| **siatu-vm** | adiada | **consulta-manual** | Não — e a premissa da ficha está errada | Não pelo caminho honesto | LAI, semanas | médio |
| **oktoberfest** | consulta-manual | **consulta-manual** (nota nova) | Sim, WP REST — mas responde outra pergunta | Parcial (só descobrir o PDF) | 1–2 h opcional | médio |
| **anatel-fique-ligado** | consulta-manual | **consulta-manual** (ficha inteira errada) | Não — base marcada como restrita pela Anatel | Não | 20 min só de conserto | baixo |
| **hathitrust** | consulta-manual | **consulta-manual** (confirmado) | Sim, mas só metadados | Não vale | — | baixo |
| **cod-log-blumenau** *(fonte nova)* | não existe | **aberta** | Sim (ArcGIS do geoportal, CORS reflete Origin) | Sim | ~2 h | médio-alto |

Placar: **5 selos sobem para `aberta`** (4 fichas existentes + 1 nova), **1 desce de `adiada` para `consulta-manual`**, **1 sobe de `consulta-manual` para `adiada`**, **3 ficam onde estão** — dois deles com a nota reescrita porque o texto atual mente.

## 2. O que implementar, em ordem

Sobre o atalho dos gateways que o projeto já consome: **só o CNAE cai num deles** (IBGE `servicodados`, mesmo padrão de host aberto). **A FIPE não cai na BrasilAPI** — `/api/fipe/preco/v1/{codigo}`, justamente a busca reversa que interessa, devolve HTTP 500 em 100% das tentativas (5/5, com cache-bust). Não é instabilidade: o WAF da FIPE bloqueia os IPs da Vercel e o fallback deles para o parallelum não cobre busca por código. Não adianta esperar conserto.

1. **Anatel — conserto de ficha (20 min).** Urgente e sem código: a URL da Cola está morta (ver §5). Primeiro porque é o único item que hoje manda a equipe para um lugar que não existe.
2. **TSE (2–4 h) — maior valor da lista.** Um GET de 78 KB devolve os 281 candidatos a vereador de Itajaí com a votação exata, direto do navegador. O que despistava era o caminho: todo mundo tenta `dados-simplificados/…-r.json` (agregado nacional, 404 por município); o certo é `dados/…-u.json`.
3. **CNAE (2–3 h) — quase de graça.** `fetch` direto, zero backend, zero chave. Aceita lote com ids separados por `|`.
4. **COD_LOG de Blumenau (2 h) — ficha nova.** É o achado colateral da investigação do SIATU e vale mais que ela: 3.848 ruas, código de 1 a 4570, 74% com exatamente 4 dígitos, cada uma com nome, bairro e CEP. `7 DE SETEMBRO = 998`, `15 DE NOVEMBRO = 744`, `ITAJAI = 494`. É literalmente o "número secreto por rua" que a ficha do VM dizia querer.
5. **CBMSC (1–2 h) — metade já está pronta.** O JSON dos 295 municípios foi extraído e validado (295/295, zero duplicata) e está em `/private/tmp/claude-501/-Users-peter-Repos-the-logic-lab-app/4c0f2f88-ae14-4c90-a8ce-66a65c9d7c22/scratchpad/cbmsc-batalhoes-2024.json`. Falta copiar para `src/data/`, normalizar a chave e ligar na busca.
6. **Portal COVID (30 min).** 15 strings, ~1 KB. É o melhor retorno por minuto da lista.
7. **FIPE (~meio dia).** ~80 linhas no front, 2 a 4 requisições por código consultado, com debounce e cache por código.
8. **Oktoberfest (1–2 h, opcional).** Só as legendas de 2024 e 2025, **rotuladas por edição**.
9. **CID-10 (~2 h, sob demanda).** Fazer no dia em que uma prova pedir.
10. **HathiTrust — não implementar.** Detalhe em §3.

## 3. As mudanças de selo, uma a uma

### 3.1 `tse`: consulta-manual → **aberta**

**Fato:** `https://resultados.tse.jus.br/oficial/ele2024/619/dados/sc/sc80470-c0011-e000619-u.json` responde 200 com 78.326 bytes e `Access-Control-Allow-Origin: *` no próprio arquivo de dados (testado com header `Origin`). Licença confirmada no CKAN do TSE: `license_title: Creative Commons Attribution`. Busca reversa executada de verdade: Itajaí/Vereador → 234 votações indexadas, `1986 → RENATA NARCIZO`.

**Recomendo manter a `url` no SIG Eleição** (é o link humano, e o teste `sources.test.ts:112` o trava) e pôr a API na nota.

> **Nota nova:** "A bancada consulta direto: os resultados oficiais são JSON estático com CORS liberado — `resultados.tse.jus.br/oficial/ele2024/619/dados/sc/sc81612-c0013-e000619-u.json` (repare no `dados/` e no sufixo `-u`; o caminho `dados-simplificados/…-r` só traz agregado nacional e dá 404 por município). Cobre 2024; ciclos anteriores só pelo portal de dados abertos, em ZIP nacional de ~46 MB. Em Itajaí/Vereador 2024, 41 das 281 votações se repetem entre candidatos — mostre todos os empates, não finja resposta única."

### 3.2 `fipe`: consulta-manual → **aberta**

**Fato:** a nota atual argumenta contra **embarcar** o dataset, e nisso está certíssima — mas isso não é argumento contra **consultar ao vivo**, que já vem carimbada com "agosto de 2026". CORS confirmado com `fetch` real em navegador na origem `https://example.com`: HTTP 200, corpo lido. `access-control-allow-origin: *`, e com corpo `form-urlencoded` a requisição é simples e nem tem preflight (o OPTIONS de lá responde 404 — com JSON o navegador barra).

> **Nota nova:** "A bancada consulta a FIPE ao vivo, do navegador: `ConsultarAnoModeloPeloCodigoFipe` resolve o código de 6 dígitos e `ConsultarValorComTodosParametros` devolve modelo e preço. Mande o corpo como form-urlencoded (com JSON o preflight barra) e varra tipo 1/2/3, porque o tipo não está no código. Código inexistente volta HTTP 200 com `{\"erro\":\"nadaencontrado\"}`. Não embarcamos: a resposta já vem com o mês de referência. É API interna e sem contrato — se a FIPE mexer no site, trate como fonte fora e mostre o link da consulta manual. A rota é o navegador do usuário, não o backend: o WAF da FIPE bloqueia IP de datacenter (foi o que derrubou a BrasilAPI), e forjar cabeçalho para escapar dele seria driblar barreira posta de propósito."

### 3.3 `cnae`: consulta-manual → **aberta**

**Fato:** `GET /api/v2/cnae/subclasses/6201501` → 200 com hierarquia completa (subclasse → classe → grupo → divisão → seção) mais `observacoes`. `Access-Control-Allow-Origin: *` na coleção e no item; preflight OPTIONS 204. Latência 0,22–0,26 s.

> **Nota nova:** "A bancada resolve pela API do IBGE (`servicodados.ibge.gov.br/api/v2/cnae/subclasses/{7 dígitos}`), sem chave e direto do navegador; vários códigos numa chamada só, separados por `|`. Duas armadilhas: `00.00-0/00` é SUBCLASSE (7 dígitos) — mandar isso em `/classes` devolve `[]` silenciosamente (5 dígitos é classe); e código inexistente devolve HTTP 200 com `[]`, não 404. A API não tem busca por texto: atividade → código só com o dataset embarcado."

### 3.4 `cbmsc`: consulta-manual → **aberta** (embarcado)

**Fato:** a nota atual ("São imagens, não dados") acerta sobre a página de mapas — são só PNG, sem GeoJSON/shapefile/KML — e erra na conclusão. A tabela município→batalhão existe em texto no Apêndice 1 da Portaria nº 1/CBMSC de 11/01/2024, e foi extraída inteira: 295/295 municípios, zero duplicata. Ato oficial não tem direito autoral (Lei 9.610/98, art. 8º, IV). O portal de dados abertos de SC tem a organização `cbmsc` cadastrada desde 2019 e **vazia** (`package_count: 0`) — a API respondeu que não há dataset, não é que não achamos.

> **Nota nova:** "295 municípios embarcados: a tabela município → batalhão sai do Apêndice 1 da Portaria nº 1/CBMSC de 11/01/2024 (ato oficial, sem direito autoral). A página de mapas continua sendo só imagem — o que virou dado foi a portaria. Data-base jan/2024, 15 batalhões: em 2026 foram ativados o 16º BBM (Jaraguá do Sul) e o 17º BBM (Araranguá), então ~20 municípios do norte e do extremo sul mudaram de número e aqui ainda aparecem no 7º, 9º e 4º. Atenção ao que a prova pede: isto é BBM (batalhão), não RBM (região) — hoje são 5 regiões e 17 batalhões."

**Não confirmado:** (a) a portaria de articulação de 2026 não foi encontrada publicada — o delta do 16º/17º só sai conferindo os PNG de 2026 a olho; (b) o mapeamento BBM → RBM atual não foi confirmado em fonte confiável (a Wikipédia lista 3 RBM e está desatualizada); (c) **se a GIA-23 usava RBM e não BBM, esta implementação não resolve a prova** — vale decidir isso antes de codar.

### 3.5 `portal-covid-blumenau`: consulta-manual → **aberta** (embarcado)

**Fato:** a nota atual está errada — o portal **não** saiu do ar. `https://blumenau.sc.gov.br/coronavirus/` responde 200 hoje, WordPress 5.4.1 congelado (último post 02/06/2021), com REST API aberta e CORS refletindo a Origin (preflight OPTIONS 200). Nada de burlar nada: é o endpoint padrão do WP, anunciado no próprio `<head>`.

> **Nota nova:** "Os 6 rótulos de sintoma (coriza, tosse, dor de cabeça, febre, dor de garganta, dificuldade para respirar) e os 9 cuidados estão embarcados. O portal não saiu do ar: está congelado em `blumenau.sc.gov.br/coronavirus/` e ainda tem REST API do WordPress aberta e com CORS. Mas o domínio antigo `coronavirusblumenau.sc.gov.br` já morreu (o certificado não cobre mais o nome) e a pilha é WP 5.4.1 sobre IIS 7.5 e PHP 7.4 — por isso o dado está aqui dentro e o link fica só como procedência. Detalhe: os rótulos estão queimados no pixel do PNG (`alt_text` e `caption` vêm vazios); o que bate são o texto da página e o slug do arquivo."

### 3.6 `cid10`: consulta-manual → **adiada**

**Fato:** o que trava mudou de natureza. Não é mais acesso — o arquivo oficial está na mão, baixado (306.066 bytes, HTTP 200), conferido (14.496 códigos pt-BR) e com licença compatível. O que trava agora é prioridade. Confirmado que **não existe API de CID-10 em português**: DATASUS não tem endpoint; a API de Dados Abertos do MS tem 87 endpoints e nenhum de CID (swagger baixado e lido); BrasilAPI 404; a da OMS exige OAuth2 (401 + `invalid_client` confirmados) e só tem inglês e francês, o que a mata para gincana.

> **Nota nova:** "Não existe API de CID-10 em português — nem no DATASUS, nem na API de Dados Abertos do Ministério (87 endpoints, nenhum de CID), nem na BrasilAPI (404). A da OMS existe mas exige OAuth e só tem inglês e francês. O que existe é o arquivo oficial: `CID10CSV.zip` do DATASUS, 306 KB, com 14.496 códigos em pt-BR — 163 KB gzipados depois de virar JSON. O acesso está resolvido; falta prioridade, porque nenhuma prova do acervo usou CID-10. Sob demanda, ~2 h. A base é a versão 2008: não tem U07.1 (COVID)."

### 3.7 `siatu-vm`: adiada → **consulta-manual**

**Fato — e este é o mais grave da lista, porque a premissa da ficha está errada.** O art. 230, I da LC 632/2007 manda calcular o valor venal pelo valor do m² segundo **Zona Fiscal × Setor de Cálculo** (Anexo II, 49 linhas, de R$ 337,26 a R$ 2,70). **Não existe "o VM da Rua X"** — e o VM é dinheiro, não "um número estável de ~4 dígitos". O geoportal tem a coluna `VLR_PGV` e ela está zerada: `max=min=sum=0` sobre 9.372 registros; `VLR_PGV IS NOT NULL` dá 8.808, `VLR_PGV>0` dá 0. Supressão deliberada, não falha de consulta.

Além disso a nota atual erra em CORS: o SIATU manda `Access-Control-Allow-Origin: *` — só que duplicado, e o fluxo é WebForms com `__VIEWSTATE` (3.328 chars) + `__EVENTVALIDATION` + postback de UpdatePanel. Sem captcha e sem login, mas o único caminho automático é replicar sessão ASP.NET, ou seja: raspagem. Regra de ouro fecha a porta. **`adiada` promete algo que a LAI não entrega do jeito que a ficha pede** — por isso desce para `consulta-manual`.

> **Nota nova:** "A premissa antiga estava errada: o VM de Blumenau não é por rua. O art. 230, I da LC 632/2007 manda usar o valor do m² por Zona Fiscal × Setor de Cálculo (Anexo II, 49 linhas, de R$ 337,26 a R$ 2,70) — quem sabe em que par a rua cai é o cadastro, e o geoportal publica a coluna `VLR_PGV` zerada nos 9.372 eixos. O SIATU não tem captcha nem login e até manda `Access-Control-Allow-Origin: *` (duplicado, o que o navegador rejeita), mas é WebForms com `__VIEWSTATE` e postback: o único caminho automático seria raspar sessão, e isso não se faz. Fica manual. Se for pedir por dados abertos/LAI, peça a coisa certa: o de-para logradouro → zona fiscal + setor; com o Anexo II, que já é público, você monta o VM por rua sozinho. E o 'número secreto por rua' que esta ficha queria existe, aberto: é o COD_LOG."

**Não confirmado:** que a tela de detalhe do SIATU exibe o VM do imóvel. Não havia número de cadastro válido para testar; as ocorrências de "VM"/"Metro" no HTML são falso positivo (lixo base64 do VIEWSTATE e a classe CSS `MetropolisBlue` do DevExpress).

### 3.8 `oktoberfest`: **mantém consulta-manual**, nota reescrita

**Fato:** existe API (WP REST, CORS liberado — testado com dois Origins diferentes, ambos ecoados), com um tipo de post `atracao` de 169 registros. Parece a solução e não é: `atracao` é a programação de palco (shows, desfiles), com `acf` vazio em todos, e `programacao` está zerado. O par nº→nome só existe desenhado no mapa das páginas centrais do PDF.

O achado que decide: **a numeração muda a cada edição.** Rest. Bierhaus é 1 em 2024 e 2 em 2025; Oktobershop 3→4; Espaço Mãe 5→7 (entraram "Táxi" e "Casa do Salmão" e empurraram a lista). Dataset fixo daria resposta errada com cara de certa. E **não existe guia anterior a 2024** — varri o CDX do Wayback do domínio inteiro desde 2010: só os PDFs de 2024 e 2025.

> **Nota nova:** "A numeração muda a cada edição — o Rest. Bierhaus é 1 em 2024 e 2 em 2025, porque entrou um 'Táxi' na frente. Dataset fixo dá resposta errada com cara de certa: se embarcar, embarque por ano e mostre o ano na tela. E não existe guia anterior a 2024, nem na midiateca nem no Wayback: para prova de 2017–2023 o guia daquele ano é irrecuperável. O nome do PDF muda todo ano, mas é descobrível: `/wp-json/wp/v2/media?search=guia&mime_type=application/pdf&orderby=date&order=desc` devolve sempre o mais recente. O tipo `atracao` da API é a programação de palco, não o mapa."

(A nota nova continua contendo "2025", como o teste `sources.test.ts:126` exige.)

### 3.9 `anatel-fique-ligado`: **mantém consulta-manual**, mas a ficha inteira precisa mudar

O selo está certo (não há captcha nem login barrando o painel público), e isso esconde que o resto está errado. Detalhe em §5, porque é link morto.

> **Nota nova:** "O Fique Ligado foi desativado: a URL antiga responde 302 para um painel Qlik de contagem de orelhões por município — não há mais busca por número de orelhão, nem à mão. O cadastro que traria número da linha e coordenada (base SGMU) é marcado como 'Possui Restrição: Sim' no inventário da própria Anatel e não é publicado; no diretório de dados abertos só sobrou o glossário em PDF. Sem API e sem arquivo: se a prova depender de um orelhão específico, o caminho é pedir por LAI. A ficha serve para reconhecer a forma do número e não perder tempo procurando um serviço que não existe mais."

Também é preciso reescrever o campo `use`, que hoje promete "número de orelhão → onde ele fica (e o contrário)" — capacidade que morreu.

### 3.10 `hathitrust`: **mantém consulta-manual** — agora com o porquê

O selo e a nota estavam certos; faltava saber por quê. A Bib API é aberta, sem chave, CORS `*` — mas devolve só ficha bibliográfica (título, ISBN/OCLC/LCCN, htid, link do scan). **Nenhum campo de página.** A API que tem `htd:seqmap`/`htd:pnum` é a Data API, fechada por dois motivos somados: chave OAuth institucional com aprovação manual (credencial pessoal, inviável em ferramenta aberta) e `babel.hathitrust.org` respondendo 403 `cf-mitigated: challenge`.

Registro um quase-achado que desabou, para ninguém repetir: a EF API do HTRC (`data.htrc.illinois.edu/ef-api`) é aberta e tem dados por página. No primeiro volume o número impresso aparecia entre os tokens do cabeçalho e o deslocamento saiu limpo (seq = impressa + 22, explicando 89,9%). Nos dois volumes seguintes: 21,4% e 11,7%. Livro antigo não tem cabeçalho corrido, e o que sobra são datas e legendas de figura. **Não serve** — daria resposta errada com cara de certa. Pior: nesse mesmo volume a EF diz "Infinite series" (173 p.) na ficha e entrega 576 páginas com cabeçalho de outro livro.

> **Nota nova:** "A Bib API (`catalog.hathitrust.org/api/volumes/…`) é aberta, sem chave e com CORS, mas só dá metadados: título, ISBN/OCLC e o htid — nenhum campo de página. A paginação scan → página impressa está na Data API, que exige chave OAuth institucional, e o `babel.hathitrust.org` hoje devolve desafio Cloudflare a cliente automatizado. Abrir o scan e conferir a página continua sendo o caminho, e isso funciona em navegador. O elefante do logo (hathi) é a pista visual."

### 3.11 Ficha nova sugerida: `cod-log-blumenau` → **aberta**

> **name:** "Código de logradouro de Blumenau (COD_LOG)"
> **indexes:** "Código de 1 a 4 dígitos → rua, bairro e CEP em Blumenau (e o contrário)."
> **use:** "Número arbitrário e estável de ~4 dígitos ligado a uma rua — o 'número secreto por rua' de Blumenau."
> **url:** `https://geo.blumenau.sc.gov.br`
> **note:** "3.848 ruas embarcadas do serviço Rol_de_ruas do geoportal (ArcGIS público, sem chave): 7 DE SETEMBRO = 998, 15 DE NOVEMBRO = 744, ITAJAI = 494. 2.854 delas (74%) têm exatamente 4 dígitos. Dado da Prefeitura de Blumenau/SEPLAN, sem licença declarada — registre a data da coleta."

**Armadilha da coleta:** `maxRecordCount=1000` e a paginação por `resultOffset` **não funciona junto com `groupByFieldsForStatistics`** (o offset é ignorado e devolve a mesma página — isso produziu uma contagem falsa de "1000 ruas" antes de paginar os registros crus e achar as 3.848 reais).

## 4. O que embarcar em vez de consultar

O projeto prefere embarcado, e aqui embarcado é quase sempre a resposta certa: sem rede, sem backend, sem chave, resposta instantânea numa gincana às 23h com internet ruim.

| Dado | Tamanho | Estado | Por que embarcar |
|---|---|---|---|
| CBMSC — 295 municípios → batalhão | 7 KB (2,3 KB gzip) | **JSON pronto e validado** | Não há API nenhuma; o dado é ato oficial, sem copyright |
| Portal COVID — 6 sintomas + 9 cuidados | ~1 KB | Texto extraído | Fonte verificadamente frágil (pilha inteira fora de suporte) |
| COD_LOG — 3.848 ruas de Blumenau | ~35 KB gzip | Coleta paginada, ~10 chamadas | Offline e instantâneo; a API é aberta mas a bancada não deveria depender de rede |
| Anexo II da LC 632 — 49 linhas ZF×Setor | <1 KB | Extraído do PDF | É lei, sem direito autoral; complementa o pedido de LAI do SIATU |
| Oktoberfest — legendas 2024 e 2025 | ~2 KB | Extraído dos PDFs | **Duas tabelas separadas e rotuladas por ano**, nunca uma só |
| CID-10 — 14.496 códigos pt-BR | 1,0 MB cru / **163 KB gzip** | ZIP baixado e conferido | Não existe API em português. Cabe: a bancada já serve `words-pt.txt` com 2,7 MB |
| CNAE — 1.332 subclasses (fase 2) | 102 KB cru / **21 KB gzip** | Só se quiser busca reversa | A API do IBGE **não tem busca por texto**; atividade → código só embarcado |
| TSE — recorte SC do `mun-*-cm.json` | poucos KB | A coletar | Nome do município → código TSE, sem o qual não se monta a URL |
| TSE — 2016 e 2020 de SC | dezenas de KB | Script de build | Os ZIP nacionais têm 46–58 MB e o TSE parou de publicar recorte por UF (404) — filtragem é trabalho de build, não de runtime |

**O que NÃO embarcar:** a FIPE. A nota atual acerta em cheio — muda todo mês e nasceria desatualizada dentro da imagem. Consulta ao vivo resolve isso sozinha, porque a resposta vem carimbada com o mês de referência.

## 5. Links mortos e fontes que sumiram — urgente

**1. `anatel-fique-ligado` — o produto acabou.** A URL que a Cola aponta hoje (`sources.ts:210`) responde:

```
HTTP/2 302
location: https://informacoes.anatel.gov.br/paineis/acompanhamento-e-controle/orelhoes
```

O painel novo mostra contagem por município/prestadora, não mapa pesquisável por número. **A ficha vende uma capacidade que morreu.** Trocar `url` para o painel novo, `urlLabel` para `informacoes.anatel.gov.br`, e reescrever `use` e `note`.

> **Isto quebra teste:** `sources.test.ts:129-133` exige que a URL case com `/^https:\/\/sistemas\.anatel\.gov\.br\/fiqueligado/` — ou seja, o teste hoje **trava um link morto no lugar**. Tem de mudar junto.

**2. `coronavirusblumenau.sc.gov.br` — domínio morto.** O certificado TLS não cobre mais o nome (curl erro 60). Ainda aparece no Google. A ficha atual aponta para a raiz `blumenau.sc.gov.br`, que vive, mas o caminho útil é `/coronavirus/`.

**3. BrasilAPI FIPE — parcialmente quebrada.** `/api/fipe/preco/v1/{codigo}` e `/api/fipe/tabelas/v1` devolvem HTTP 500 permanente (código deles lido: `services/fipe/http.js` e `price.js` — o WAF da FIPE bloqueia IPs da Vercel e o fallback para o parallelum não cobre busca por código). `/api/fipe/marcas/v1/{tipo}` e `/api/fipe/veiculos/v1/{tipo}/{marca}` seguem vivos. **Se algo no backend já chamar `/preco`, está quebrado hoje.**

**4. `babel.hathitrust.org`** — passou a devolver 403 `cf-mitigated: challenge` para cliente automatizado. Navegador humano continua funcionando.

**5. Geoportal de Blumenau — `VLR_PGV` suprimido.** Não é link morto, é dado publicado em branco: coluna existe em 3 camadas, 100% zerada. E a página de download da SEPLAN está 404.

**6. Falsos negativos / positivos que custam tempo:**
- **TSE:** `dados-simplificados/…-r.json` dá 404 no nível de município — é o padrão errado que aparece nas buscas. Ciclos 2018, 2020 e 2022 também dão 404 no CDN (só o ciclo corrente fica lá), e os recortes por UF nos dados abertos foram descontinuados (testei `_SC` de 2016 e 2020: 404).
- **Anatel:** `TUP.geojson` devolve **HTTP 200 com o corpo do WAF** ("esta operação no sistema foi bloqueada", com código de bloqueio). Status 200 ali não é sucesso. E **WebFetch não funciona no domínio da Anatel** — Cloudflare devolve 403 em todo path; as evidências vieram de `curl`.
- **`cid10.ia.br/api/*`** → 404 (o site é só HTML). **`dados.gov.br/api/publico/…`** → 401 `www-authenticate: Bearer` (chave gratuita e legítima, mas exige criar conta no gov.br — não criei em nome de terceiro).

**7. Manutenção que acompanha as mudanças acima** (não é link morto, mas vai quebrar se ignorado):
- `SOURCE_STATUS_HINT.aberta` (`sources.ts:66`) diz "dado embarcado ou pelo backend". **Três das novas abertas (TSE, CNAE, FIPE) consultam direto do navegador, sem backend.** A legenda precisa incluir isso.
- O cabeçalho do módulo (`sources.ts:17-20`) afirma "Base sem CORS (SIATU) fica `adiada`". As duas metades ficaram falsas: o SIATU **manda** header de CORS (duplicado), e ele sai de `adiada`.
- Testes que travam decisões revogadas: `sources.test.ts:78` (TSE agrupado como consulta-manual), `:166` (TSE consulta-manual), `:158-164` (SIATU `adiada` com CORS/VIEWSTATE/LAI na nota), `:179-183` (`tse` e `fipe` na lista de "nenhuma base com gate aparece como aberta"). Todos precisam ser reescritos **com a justificativa no comentário**, no mesmo estilo do bloco do Cidade Iluminada (`:137-150`) — para ninguém reler o histórico e concluir que a regra de ouro foi afrouxada. Ela não foi: nenhuma das mudanças acima envolve captcha, login ou raspagem.

---

## Fichas brutas (uma por fonte)

### `fipe` — sim-nao-oficial

- **endpoint:** Oficial (interno, sem docs), 3 passos em POST form-urlencoded:
1. https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia  (mês vigente; 1ª posição)
2. https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModeloPeloCodigoFipe  (É AQUI que o código de 6 dígitos + DV entra)
3. https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros  (tipoConsulta=codigo → nome do modelo + preço)

Alternativas testadas:
- BrasilAPI https://brasilapi.com.br/api/fipe/preco/v1/{codigo} → QUEBRADO (500 constante, ver observação)
- BrasilAPI /api/fipe/marcas/v1/{tipo} e /api/fipe/veiculos/v1/{tipo}/{marca} → funcionam, mas NÃO fazem código→modelo
- https://parallelum.com.br/fipe/api/v1 e /v2 → funcionam sem chave, mas só no sentido marca→modelo→ano→código (não tem busca reversa por código)
- **chamada:** `curl -X POST "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Referer: https://veiculos.fipe.org.br/" \
  -d "codigoTabelaReferencia=336&codigoTipoVeiculo=1&anoModelo=2014&codigoTipoCombustivel=5&tipoVeiculo=carro&modeloCodigoExterno=001267-0&tipoConsulta=codigo"

# passo anterior, que resolve o código sozinho (varra codigoTipoVeiculo 1=carro, 2=moto, 3=caminhão):
curl -X POST "https://veiculos.fipe.org.`
- **resposta obtida:** SIM, código FIPE de 6 dígitos com DV é consultável direto. Resposta real obtida em 17/08/2026:

001267-0 (carro) →
{"Valor":"R$ 32.430,00","Marca":"Fiat","Modelo":"Palio 1.0 ECONOMY Fire Flex 8V 4p","AnoModelo":2014,"Combustivel":"Flex","CodigoFipe":"001267-0","MesReferencia":"agosto de 2026 ","Autenticacao":"qlkr1vgw55sw","TipoVeiculo":1,"SiglaCombustivel":"F","DataConsulta":"segunda-feira, 17 de agosto de 2026 16:05"}

811106-5 (moto) →
{"Valor":"R$ 19.285,00","Marca":"HONDA","Modelo":"BIZ 125 EX/ 125 EX FLEX","AnoModelo":32000,"Combustivel":"Gasolina","CodigoFipe":"811106-5","MesReferencia":"agosto de 2026 ","Autenticacao":"kmfyzywhj4q","TipoVeiculo":2,"SiglaCombustivel":"G"}

Passo 2 isolado (001267-0):
[{"Label":"2014 Flex","Value":"2014-5"},{"Label":"2013 Flex","Value":"2013-5"},{"La
- CORS: permite-navegador · chave: Nenhuma. Sem cadastro, sem token, sem captcha, sem login — POST anônimo responde. A FIPE não publica cota; parallelum (se um dia servir de reserva) limita 500 req/dia sem token (header x-ratelimit-limit: 500 conferido).
- licença: Zona cinzenta honesta. A FIPE é fundação privada e a tabela é de consulta pública gratuita, mas NÃO é dado aberto: não há licença declarada nem termo autorizando uso programático, e a compilação é propriedade intelectual da FIPE. A API usada é interna do site (sem documentação pública). Consulta ao vivo, uma de cada vez, disparada por um humano resolvendo prova, espelha exatamente o que a pessoa faria à mão — isso é defensável. Baixar a tabela inteira, espelhar ou redistribuir NÃO é. Note que a própria FIPE roda WAF Cloudflare que bloqueia IP de datacenter (o WebFetch daqui tomou 403 na home): é sinal explícito de que acesso automatizado em massa não é bem-vindo. Respeite isso.
- **selo sugerido: aberta** · esforço: Baixo — meio dia. Um módulo no front (~80 linhas, zero backend, zero chave): cachear a tabela de referência (1 chamada por sessão), varrer os 3 tipos de veículo no ConsultarAnoModeloPeloCodigoFipe até um responder, e chamar ConsultarValorComTodosParametros com o par ano-combustível. São 2 a 4 requisições por código consultado. Some debounce no input e cache por código no cliente. Não precisa mexer no the-decrypter-api. · valor: medio
- nota: O selo atual ('consulta-manual') está errado, e a justificativa que está no note também. Dá para consultar programaticamente, DO NAVEGADOR, sem chave e sem backend — testei de verdade.

O que mudou a conclusão: a nota atual diz que o dado "muda todo mês e o JSON seria commitado dentro da imagem". Isso é um argumento contra EMBARCAR o dataset, e continua certíssimo — mas não contra consultar ao vivo. Consulta ao vivo não tem esse problema: a resposta já vem carimbada com "agosto de 2026".

Sobre CORS, que é o ponto decisivo: a API da FIPE devolve `access-control-allow-origin: *`, e se você mandar o corpo como `application/x-www-form-urlencoded` a chamada vira "requisição simples" e o navegador nem faz preflight (o que importa, porque o OPTIONS de preflight lá responde 404 — se você mandar JSON, o navegador barra). Confirmei rodando fetch de verdade num navegador na origem https://example.com: HTTP 200 e corpo lido. Ou seja: form-urlencoded sim, JSON não.

Sobre a pista da BrasilAPI: metade dela está morta. /api/fipe/marcas/v1/{tipo} e /api/fipe/veiculos/v1/{tipo}/{marca} funcionam ao vivo (conferi x-vercel-cache: MISS), mas /api/fipe/preco/v1/{codigo} — justamente a busca reversa que interessa — devolve 500 em 100% das tentativas, e /api/fipe/tabelas/v1 também. Não é instabilidade passageira: li o código deles (services/fipe/http.js e price.js). O WAF da FIPE bloqueia os IPs da Vercel, então a BrasilAPI criou um fallback para o parallelum; só que o parallelum não tem busca por código FIPE, então o fallback cobre marcas/modelos/anos e deixa a consulta por código descoberta. Enquanto o bloqueio existir, /preco fica quebrado. Não adianta esperar.

Sobre o parallelum: funciona bem, sem chave, com CORS liberado (v1 e v2) — mas só no sentido marca → modelo → ano → valor, e o código FIPE aparece como RESULTADO, nunca como entrada. Para o nosso uso (código da prova → nome do carro) ele só serviria varrendo a base inteira, o que é justamente o que não se faz. Serve como reserva para preencher combos, não para a busca reversa.

Uma recomendação de arquitetura que contraria o padrão do projeto: NÃO passe pelo backend .NET aqui. O the-decrypter-api roda em VPS (IP de datacenter) e cairia no mesmo WAF que derrubou a BrasilAPI; para contornar seria preciso forjar User-Agent/Referer/Origin de navegador, que é exatamente o que a BrasilAPI faz — e isso já é driblar uma barreira que a fonte levantou de propósito. Pelo navegador do próprio usuário não há nada a forjar: a requisição é legítima, uma por vez, com uma pessoa atrás. Essa é a rota limpa, e por sorte é também a mais confiável.

Detalhes que vão morder na implementação: (1) o tipo do veículo não está no código, então varra 1=carro, 2=moto, 3=caminhão — exatamente um responde; (2) código inexistente devolve HTTP 200 com {"codigo":"0","erro":"nadaencontrado"}, não 404; (3) o sufixo do ano é o combustível (5=Flex, 1=Gasolina), e AnoModelo 32000 significa "zero km"; (4) MesReferencia e Marca vêm com espaço sobrando no fim, dê trim antes de usar como índice de letra.

Última ressalva: é API interna e sem contrato. Pode mudar de forma sem aviso. Trate falha como "fonte fora" e mostre o link da consulta manual como saída — não deixe a aba quebrada quando a FIPE mexer no site.

### `cnae` — sim-oficial

- **endpoint:** https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/{id7} — e irmãos /secoes, /divisoes, /grupos, /classes/{id5}, todos com e sem {id}. Aceita vários ids separados por "|". Sem busca textual.
- **chamada:** `curl -s "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/4711302|5611201|8412400"

# no navegador, direto, sem backend:
fetch("https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/6201501").then(r => r.json())

# classe (5 dígitos, formato 62.01-5):
curl -s "https://servicodados.ibge.gov.br/api/v2/cnae/classes/62015"`
- **resposta obtida:** GET /api/v2/cnae/subclasses/6201501 → HTTP 200:
{"id":"6201501","descricao":"DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA","classe":{"id":"62015","descricao":"DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA","grupo":{"id":"620","descricao":"ATIVIDADES DOS SERVIÇOS DE TECNOLOGIA DA INFORMAÇÃO","divisao":{"id":"62","descricao":"ATIVIDADES DOS SERVIÇOS DE TECNOLOGIA DA INFORMAÇÃO","secao":{"id":"J","descricao":"INFORMAÇÃO E COMUNICAÇÃO"}}},"observacoes":["Esta classe compreende - o desenvolvimento de sistemas..."]}}

Lote de 3 códigos de gincana (resposta real, formatada):
47.11-3/02 -> COMÉRCIO VAREJISTA DE MERCADORIAS EM GERAL, COM PREDOMINÂNCIA DE PRODUTOS ALIMENTÍCIOS - SUPERMERCADOS
56.11-2/01 -> RESTAURANTES E SIMILARES
84.12-4/00 -> REGULAÇÃO DAS ATIVIDADES DE SAÚD
- CORS: permite-navegador · chave: Nenhuma. Sem chave, sem cadastro, sem token. A doc oficial não declara cota nem rate limit, e 3 chamadas seguidas passaram sem throttle. Mesmo assim, ritmo educado e cache local continuam valendo.
- licença: Dado público oficial do IBGE/CONCLA (classificação estatística nacional, publicada como dado aberto). Ressalva honesta: nem a página de docs da API (servicodados.ibge.gov.br/api/docs/) nem a da CNAE trazem texto de licença, atribuição ou termos — não há declaração explícita para citar. Não é o caso de inventar uma. Na prática é reutilizável; recomendo creditar "IBGE / CONCLA — CNAE 2.x" na aba, como já se faz com as outras fontes.
- **selo sugerido: aberta** · esforço: Baixo — algumas horas. É a fonte mais barata do catálogo até agora: fetch direto do navegador, zero backend, zero chave, zero credencial nova. O trabalho todo é: (1) normalizar a entrada tirando pontuação (`.` `-` `/`); (2) ramificar por comprimento — 7 dígitos vai em /subclasses, 5 em /classes, 3 em /grupos, 2 em /divisoes, letra em /secoes; (3) tratar `[]` como "não encontrado" (ver armadilha na observação); (4) reformatar o id de volta para 00.00-0/00 na exibição. Opcional, +1h: embarcar o dataset enxuto (id+descrição das 1332 subclasses = 102 KB cru, 21 KB gzip — medido) para ter busca reversa por texto e funcionar offline, já que a API NÃO tem busca textual. · valor: baixo
- nota: A API oficial existe, funciona e é aberta de verdade — o selo "consulta-manual" estava errado por falta de teste, não por impedimento.

O que eu confirmei chamando de fato:
- Endpoint responde 200 com JSON hierárquico completo (subclasse → classe → grupo → divisão → seção), e ainda traz "observacoes" com o texto do que a atividade compreende e NÃO compreende.
- CORS liberado de verdade: `Access-Control-Allow-Origin: *` tanto na coleção quanto no item, e o preflight OPTIONS responde 204 com `Access-Control-Allow-Methods: GET, POST, OPTIONS`. Ou seja: o front chama direto, NÃO precisa passar pelo backend .NET. (O padrão de proxy do the-decrypter-api existe e está pronto — BrasilAPI, what3words, Nominatim, OpenFoodFacts, Traccar — mas aqui ele seria peso morto.)
- Lote funciona: ids separados por "|" numa chamada só devolvem um array. Ótimo para uma prova com vários códigos.

DUAS ARMADILHAS que vão morder quem implementar:
1. O formato 00.00-0/00 da nossa ficha é SUBCLASSE (7 dígitos), não classe. Mandar os 7 dígitos em /classes/6201501 devolve `[]` — silenciosamente. 5 dígitos (62.01-5) é que é classe.
2. Id inexistente ou malformado NÃO dá 404: devolve HTTP 200 com `[]`. Testei com 9999999. Então o código tem de tratar array vazio como "não encontrado", senão a bancada mostra resultado em branco em vez de erro — exatamente o tipo de coisa que faz perder tempo no meio de uma prova.

O que a API não faz: busca por texto. Testei `?search=padaria` — o parâmetro é ignorado (devolve os mesmos 3,6 MB da coleção inteira). Então código→atividade é resolvido pela API; atividade→código só embarcando o dataset enxuto (21 KB gzip) localmente.

Sobre o valor: mantenho "baixo" com honestidade — a nota do catálogo diz que há só menções no acervo e nenhuma prova resolvida por CNAE, e nada no que testei muda esse histórico. O que mudou foi o custo, que caiu para quase zero. Vale implementar não porque a fonte promete muito, mas porque agora ela sai quase de graça e o código pontuado 00.00-0/00 é visualmente autodenunciante numa prova — quem vê reconhece na hora e a bancada responde em 0,25 s. Sugiro subir para "aberta" e deixar o dataset embarcado como fase 2, sob demanda.

Nenhuma regra do projeto foi tocada: não há captcha, não há login, não houve raspagem — é a API pública documentada pelo próprio IBGE.

### `cid10` — so-dados-abertos-em-arquivo

- **endpoint:** http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip (arquivo oficial, 306.066 bytes). Não existe endpoint de consulta. Espelho de reforço em JSON/FHIR: https://fhir.saude.go.gov.br/r4/reds-go/CodeSystem-BRCID10.json (3,5 MB, 14.230 conceitos pt-BR). API da OMS (só EN/FR): https://id.who.int/icd/release/10/2019/A00.0 + token em https://icdaccessmanagement.who.int/connect/token
- **chamada:** `curl -s -o CID10CSV.zip -w "%{http_code} %{size_download}\n" "http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip" && unzip -o CID10CSV.zip && python3 -c "import csv;r=list(csv.DictReader(open('CID-10-SUBCATEGORIAS.CSV',encoding='latin-1'),delimiter=';'));print(len(r));print(r[0]['SUBCAT'],r[0]['DESCRICAO'])"`
- **resposta obtida:** DOWNLOAD: HTTP/1.1 200 OK · Content-Type: application/zip · Content-Length: 306066 · Last-Modified: Mon, 13 Oct 2014 22:05:10 GMT (sem cabeçalho Access-Control-Allow-Origin, testado com Origin:).

CONTEÚDO REAL (descompactado e lido): CID-10-SUBCATEGORIAS.CSV = 12.451 linhas, colunas [SUBCAT;CLASSIF;RESTRSEXO;CAUSAOBITO;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS]; CID-10-CATEGORIAS.CSV = 2.045 linhas; GRUPOS = 275; CAPITULOS = 22. Amostra literal:
  A000 ; Cólera devida a Vibrio cholerae 01, biótipo cholerae
  A001 ; Cólera devida a Vibrio cholerae 01, biótipo El Tor
  A009 ; Cólera não especificada
  A010 ; Febre tifóide
Buscas de teste: A000 -> "Cólera devida a Vibrio cholerae 01, biótipo cholerae"; G409 -> "Epilepsia, não especificada"; S720 -> "Fratura do colo do fêmur"; M545 -> "Dor lombar 
- CORS: nao-se-aplica · chave: Para o caminho recomendado (arquivo oficial do DATASUS embarcado): NENHUMA chave, nenhum cadastro, download anônimo — confirmado. Para a API da OMS (que não serve aqui): exige conta em icd.who.int/icdapi e OAuth2 client_credentials (client id + secret, token válido ~1h). Não criei essa conta — criar cadastro em terceiro é decisão do dono, não minha. A OMS ainda oferece a API em contêiner Docker local (`-e acceptLicense=true`), que dispensa chave, mas só depois de aceitar a licença — de novo, decisão do dono.
- licença: A CID-10 é da OMS; a tradução pt-BR é do CBCD (Centro Brasileiro de Classificação de Doenças, USP), e o DATASUS publica as tabelas eletrônicas explicitamente para uso em aplicações — a própria página diz que o CBCD as disponibiliza "estimulando, assim, a utilização da mesma" e que servem "para utilização em aplicações, formação de bases de dados". O Portal de Dados Abertos do SUS adota CC BY-ND 3.0. Leitura honesta: pode baixar, embarcar e consultar dando crédito a DATASUS/CBCD; o "ND" pede que não se publique uma versão adulterada passando por CID oficial (normalizar acentuação/formato para busca interna é uso, não republicação de obra derivada). Nada de captcha, login ou raspagem envolvido — é download público direto.
- **selo sugerido: adiada** · esforço: ~2 h. O arquivo já está baixado e conferido (/private/tmp/.../scratchpad/cid10). Falta: script de build CSV latin-1 -> JSON compacto [["A000","Cólera devida a..."],...], gravar em public/data/cid10.json (1,0 MB cru / 163 KB gzip — menor que streets.json 1,0 MB e words-pt.txt 2,7 MB que a bancada já serve), e uma aba/consulta que aceite "A00.0", "A000" e busca por texto. Zero backend, zero chave, zero rede em tempo de execução. · valor: baixo
- nota: A verdade, testada: NÃO existe API de CID-10 em português. Nenhuma. O DATASUS não tem endpoint de consulta — só arquivos. A API de Dados Abertos do Ministério (apidadosabertos.saude.gov.br) tem 87 endpoints e nenhum é de CID (baixei e li o swagger.json). A BrasilAPI devolve 404 (há um pedido aberto desde 2021 justamente porque "não existe uma api pública boa para isso"). A API da OMS existe e até cobre CID-10, mas morre em dois pontos: exige cadastro/OAuth2 (confirmei o 401 e o invalid_client) e, decisivo, a CID-10 dela só tem inglês e francês — a documentação diz que apenas a versão 2008 tem duas línguas, e português não está entre elas. Para prova de gincana, o que importa é o nome em pt-BR (é dele que saem letras, iniciais e contagem), então a OMS não resolve nem via backend.

O que existe de verdade é melhor do que uma API: o arquivo oficial. Baixei o CID10CSV.ZIP do DATASUS (306 KB, HTTP 200) e ele traz 14.496 códigos com descrição em português — 12.451 subcategorias de quatro caracteres (A00.0) e 2.045 categorias de três (A00), mais grupos e capítulos. Virando JSON enxuto dá 1,0 MB, 163 KB comprimido: cabe folgado na bancada, que já serve arquivos maiores (words-pt.txt tem 2,7 MB). Como confirmação cruzada, o CodeSystem BRCID10 do Ministério da Saúde (espelhado em fhir.saude.go.gov.br) devolveu 3,5 MB de JSON com 14.230 conceitos pt-BR e bate com o CSV.

Sobre CORS: nem o DATASUS nem o espelho FHIR mandam Access-Control-Allow-Origin (testei com cabeçalho Origin), então chamada direta do navegador em tempo real está fora. Mas isso é irrelevante, porque a resposta certa aqui não é chamar ninguém: é embarcar o dado, como já foi feito com ruas e CEP. Sem rede, sem backend, sem chave, resposta instantânea e offline. Por isso marquei o CORS como "não se aplica" — se um dia se quisesse a OMS, aí sim precisaria do backend .NET.

Duas ressalvas honestas. Primeira: a base do DATASUS é a versão 2008 (arquivos de 2007, zip de 2014) — verifiquei que NÃO tem U07.1, o código de COVID-19, nem nada em U07. Para enigma de gincana isso não atrapalha; para qualquer coisa clínica, atrapalharia. Segunda: mantive o selo fora de "aberta" porque nada está implementado e não há o que consultar programaticamente hoje — e troquei "consulta-manual" por "adiada" porque o que trava não é mais o acesso (o arquivo está na mão, conferido e com licença compatível), é só a prioridade. A anotação original acertou o juízo e errou o motivo: continua valendo que nenhuma prova do acervo usou CID-10 e que o dataset custa 163 KB por zero prova resolvida — é trabalho de duas horas, para fazer no dia em que uma prova pedir. Enquanto isso, a consulta no site do DATASUS resolve na mão sem problema nenhum.

### `tse` — sim-oficial

- **endpoint:** https://resultados.tse.jus.br/oficial/ele<CICLO>/<CD_ELEICAO>/dados/<uf>/<uf><cdMunicipioTSE>-c<cargo:4d>-e<cdEleicao:6d>-u.json

Auxiliares (mesmo host, mesmo CORS):
- Eleições/ciclos disponíveis: https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
- Municípios (nome → código TSE + código IBGE): https://resultados.tse.jus.br/oficial/ele2024/619/config/mun-e000619-cm.json (518 KB, o recorte de SC dá poucos KB)

Cargos: 11=Prefeito, 13=Vereador (municipais); 1=Presidente, 3=Governador, 5=Senador, 6=Dep. Federal, 7=Dep. Estadual.
- **chamada:** `curl "https://resultados.tse.jus.br/oficial/ele2024/619/dados/sc/sc81612-c0013-e000619-u.json"
# Itajaí (81612), Vereador (c0013), Eleição Municipal 2024 1º turno (e000619)

# e a prova de CORS, com Origin de navegador:
curl -I -H "Origin: https://decrypter.local" \
  "https://resultados.tse.jus.br/oficial/ele2024/619/dados/sc/sc81612-c0013-e000619-u.json"`
- **resposta obtida:** Trecho REAL de https://resultados.tse.jus.br/oficial/ele2024/619/dados/sc/sc80470-c0011-e000619-u.json (Blumenau, Prefeito, 2024):

{"ele":"619","t":"1","f":"o","tpabr":"mu","cdabr":"80470","dg":"06/10/2024","hg":"19:06:43",
 "carg":[{"cd":"11","nmn":"Prefeito","agr":[{"nm":"PROTEGER E SERVIR","tvtn":"95075",
   "par":[{"n":"22","sg":"PL","cand":[{"n":"22","sqcand":"240001982125",
     "nm":"EGIDIO MACIEL FERRARI","nmu":"DELEGADO EGIDIO","dt":"18/09/1981",
     "st":"Eleito","vap":"95075","pvap":"51,40"}]}]},
  {"nm":"Blumenau de um jeito NOVO","par":[{"n":"30","sg":"NOVO","cand":[{
     "nm":"ODAIR TRAMONTIN","nmu":"ODAIR TRAMONTIN","st":"Não eleito",
     "vap":"55968","pvap":"30,26"}]}]}]}]}

Cabeçalhos REAIS da mesma resposta (com Origin de navegador):
  HTTP/1.1 200 OK
  Content-Type:
- CORS: permite-navegador · chave: Nenhuma. Sem cadastro, sem token, sem cota documentada. São arquivos JSON estáticos servidos por CDN — o mesmo que o site oficial de divulgação consome. Só convém educação básica: cachear no cliente (o arquivo de Itajaí/Vereador tem 78 KB e nunca mais muda depois da totalização).
- licença: Creative Commons Attribution (CC-BY) — é o campo license_title que o próprio portal de dados abertos do TSE devolve no package_show do conjunto "Resultados - 2024". Dado público oficial, uso livre com atribuição ao TSE. Não há cláusula que impeça consulta programática; ao contrário, o portal existe justamente para isso. Nada aqui envolve burlar captcha ou login — os arquivos são públicos e anônimos.
- **selo sugerido: aberta** · esforço: Baixo — cerca de 2 a 4 horas, só no front, sem tocar no backend.

O que precisa: (1) embarcar o recorte de SC do mun-*-cm.json (nome do município → código TSE, poucos KB); (2) um fetch + a travessia carg→agr→par→cand para montar o índice votação→candidato; (3) cache em memória/localStorage. Não há paginação, autenticação nem rate limit a tratar.

Custo extra se quiser 2020/2016: um script offline de pré-processamento (baixar o ZIP nacional, filtrar SC, gerar um JSON enxuto). Isso é mais meio dia, e é trabalho de build, não de runtime. · valor: alto
- nota: O selo estava errado: existe, sim, API — e das boas. O que despistou é o nome do arquivo. Todo mundo tenta `dados-simplificados/.../-r.json` (que é o padrão que aparece nas buscas e só traz o agregado do país) e leva 404 no nível de município. O caminho certo para votação por candidato é `dados/` com sufixo `-u.json`. Foi só trocar isso e o dado apareceu inteiro.

Para o uso da Cola (número de 4-5 dígitos → candidato → letra do nome), é uma requisição pontual: um GET de 78 KB devolve os 281 candidatos a vereador de Itajaí com a votação exata. Nada de arquivo gigante, nada de backend — o `Access-Control-Allow-Origin: *` está no próprio arquivo de dados, verificado com header Origin.

Duas ressalvas honestas:

1) COBERTURA HISTÓRICA. O CDN de resultados só guarda o ciclo corrente. Testei 2020 (ele2020/426), 2018 e 2022 no nível de município: todos 404. Ou seja, hoje a consulta ao vivo cobre 2024 (e cobrirá 2026 quando houver). Se a prova pedir eleição antiga, o caminho é o portal de dados abertos — a API CKAN funciona (`dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2020`), mas os arquivos são ZIP nacionais de 46 a 58 MB por ano, e o TSE deixou de publicar o recorte por UF (testei _SC de 2016 e 2020: 404). Pesado demais para o navegador, mas perfeito para um script de build que filtra SC e embarca um JSON de poucas dezenas de KB. Recomendo embarcar 2016 e 2020 de SC assim, se a GIA usar esses anos.

2) AMBIGUIDADE. Em Itajaí/Vereador 2024, 41 das 281 votações se repetem entre candidatos (887, 738, 483, 449...). São quase todas votações baixas; os números altos são únicos. Vale a UI mostrar todos os empates em vez de fingir resposta única.

Sobre a pista do divulgacandcontas: testei e ele responde (200), mas é cadastro de candidatura — nome, número, partido, bens, processos. NÃO tem votação, e não devolve cabeçalho CORS. Serve no máximo como fonte auxiliar de nome↔número, e aí sim precisaria passar pelo backend. Para o caso de uso desta ficha, é o endpoint errado.

### `anatel-fique-ligado` — so-dados-abertos-em-arquivo

- **endpoint:** Não existe API REST/JSON da Anatel para orelhões. O que existe e funciona é um servidor de ARQUIVOS de dados abertos: https://www.anatel.gov.br/dadosabertos/PDA/<Base>/<arquivo> (confirmados: .../PDA/Bases_Publicadas/Inventario_de_Bases_de_Dados.csv, .../PDA/TUP/Glossario.pdf, .../PDA/PBLE/PBLE.csv). O antigo https://sistemas.anatel.gov.br/fiqueligado/ NÃO existe mais: responde 302 para o painel Qlik https://informacoes.anatel.gov.br/paineis/acompanhamento-e-controle/orelhoes. API do dados.gov.br: https://dados.gov.br/api/publico/conjuntos-dados/<slug> (401, exige Bearer).
- **chamada:** `curl -sS "https://www.anatel.gov.br/dadosabertos/PDA/Bases_Publicadas/Inventario_de_Bases_de_Dados.csv" -o inv.csv && iconv -f WINDOWS-1252 -t UTF-8 inv.csv | sed -n '27p'

# prova de que o Fique Ligado morreu:
curl -sS -D - -o /dev/null "https://sistemas.anatel.gov.br/fiqueligado/" | grep -iE "^HTTP|^location"

# NOTA: WebFetch é bloqueado pelo Cloudflare da Anatel (403 em todo path). Usei curl.`
- **resposta obtida:** 1) O Fique Ligado está morto (resposta real):
HTTP/2 302
location: https://informacoes.anatel.gov.br/paineis/acompanhamento-e-controle/orelhoes

2) Inventário oficial de bases da Anatel, linha 26 (verbatim, download real de 53.396 bytes):
26;Sistema de Gestão de Metas de Universalização;Base de dados do Sistema de Gestão de Metas de Universalização - SGMU - da Agência Nacional de Telecomunicações;COUN;Sim;https://dados.gov.br/dataset/gestao-de-metas-de-universalizacao;;Mensal;Não se aplica;Sim
   -> a última coluna é "Possui Restrição" = Sim. Das 128 bases, 101 são "Não" e 26 são "Sim"; a do orelhão é uma das restritas.

3) Glossário oficial do TUP (texto extraído do PDF real, 92.892 bytes, .../PDA/TUP/Glossario.pdf):
"TELEFONE DE USO PÚBLICO (ORELHÃO) ... Mantenedor: Gerência de Controle 
- CORS: precisa-backend · chave: O servidor de arquivos (www.anatel.gov.br/dadosabertos/...) NÃO pede chave nenhuma — baixa anônimo, testado. A API do dados.gov.br PEDE: devolve 401 com "www-authenticate: Bearer", e a chave sai de cadastro no gov.br (é chave legítima e gratuita, não é burla — mas exige criar conta, coisa que eu não faço sem você). O Qlik da Anatel (dados.anatel.gov.br/qap) tem a API de gestão atrás de login de formulário. Cota: não documentada no servidor de arquivos; são downloads estáticos atrás de Cloudflare, então vale não martelar.
- licença: Dados abertos governamentais federais (Lei de Acesso à Informação / Decreto 8.777 de dados abertos). O que a Anatel publica em /dadosabertos é livre para usar e redistribuir com atribuição — o PBLE.csv de 26 MB baixou anônimo sem termo de aceite. MAS a base do orelhão não está nesse regime: a própria Anatel marca a SGMU como "Possui Restrição: Sim" no inventário oficial, o que significa que o microdado (que inclui o NÚMERO da linha telefônica) não é publicado, só agregado no painel. Então não há licença permissiva para embarcar o dado de orelhão — não porque proíbam, mas porque não existe arquivo público para embarcar.
- **selo sugerido: consulta-manual** · esforço: Para o que a ficha promete (número → endereço): esforço infinito, porque não há fonte. Não é caro, é impossível pelo caminho honesto. Para consertar a ficha (URL nova + texto novo + tirar a promessa que não se cumpre): ~20 min, só edição em sources.ts. Se um dia você quiser as ESTAÇÕES (não os orelhões), aí sim: ~2-4h no backend .NET, um proxy igual ao do BrasilAPI/Nominatim baixando CSV da Anatel e servindo filtrado por município — mas antes é preciso obter a chave do dados.gov.br para descobrir a URL exata do arquivo. · valor: baixo
- nota: Peter, a notícia principal não é sobre API: **o Fique Ligado deixou de existir**. A URL que está na Cola hoje responde 302 e joga num painel Qlik chamado "Orelhões". A ficha promete "número de orelhão → onde ele fica (e o contrário)" e essa consulta não existe mais em lugar nenhum público — nem à mão. O painel novo mostra contagem de orelhões por município/prestadora, não um mapa pesquisável por número. Ou seja, a ficha está vendendo uma capacidade que morreu.

O dado que você quer existe e está documentado: o glossário oficial do TUP (que baixei, PDF real) lista exatamente "Numero: Número da linha telefônica instalada no TUP" e "Est_geom: Campo contendo a geometria do TUP". É o casamento perfeito para a prova. Só que o arquivo correspondente não é publicado: caí em 404 em nove variações de nome, e o inventário oficial da Anatel marca a base mantenedora (SGMU/COUN) como "Possui Restrição: Sim" — 26 das 128 bases têm essa marca, e a do orelhão é uma delas. Faz sentido: é um cadastro com número de linha e coordenada.

Os três caminhos que sobram, e por que descartei cada um:
1. API do dados.gov.br — devolve 401 "www-authenticate: Bearer". A chave é gratuita e legítima, mas exige criar conta no gov.br, e eu não crio conta no seu nome. Se você quiser, cria e me passa; aí eu descubro a URL exata do recurso em minutos.
2. Qlik do painel — a API de gestão (/qap/qrs/) redireciona para internal_forms_authentication, ou seja, login. Regra de ouro do projeto: não se burla login. O websocket do engine até aceita handshake anônimo (recebi 101), mas puxar hipercubo de dashboard é exatamente "raspar o que a fonte não oferece". Não vou por aí e recomendo que você também não vá.
3. Raspar o antigo formulário ASP do SGMU — mesma objeção, e a página já não entrega a lista.

Duas armadilhas técnicas que valem para qualquer investigação futura na Anatel, anota aí: (a) **WebFetch não funciona no domínio da Anatel** — o Cloudflare deles devolve 403 em todo path, para todo prompt; tive que usar curl, e por isso as evidências acima são de curl. (b) **HTTP 200 não quer dizer sucesso**: pedir um .geojson devolve 200 com o HTML do WAF ("esta operação no sistema foi bloqueada", com código de bloqueio). Se alguém automatizar sondagem de arquivo lá, tem que checar o corpo, não o status.

O que fazer com a ficha: mantenho o selo **consulta-manual** (o mesmo que já está lá), porque não há captcha nem login barrando o painel público — um humano ainda consegue abrir e filtrar por município. Mas o selo estar certo esconde que o resto da ficha está errado. Recomendo, na mesma edição: trocar a url para https://informacoes.anatel.gov.br/paineis/acompanhamento-e-controle/orelhoes, trocar o urlLabel para informacoes.anatel.gov.br, e reescrever o campo `use`, que hoje mente. Sugestão de nota: "O Fique Ligado foi desativado e virou painel de contagem por município — não há mais busca por número de orelhão. O cadastro que tem número e coordenada (base SGMU) é marcado como restrito pela própria Anatel e não é publicado. Sem API e sem arquivo: se a prova depender de um número de orelhão específico, o caminho é pedir por LAI."

E uma nota de valor, para você calibrar: a fonte está ancorada só em ITC-2023. Como o casamento número→endereço não é obtível nem à mão, o valor prático hoje é baixo — a ficha serve mais para a equipe reconhecer a forma de um número de orelhão e não perder tempo procurando um serviço que não existe mais. Se em algum momento você quiser a metade "estações por localidade" (que é outra coisa, e essa sim tem bases NÃO restritas: Estações da Telefonia Fixa/Móvel, itens 92/95/96/97 do inventário), vale abrir uma ficha separada em vez de esticar esta — mas eu não confirmei a URL de download desses arquivos, então isso está "não confirmado" e não deve virar selo 'aberta' sem teste.

### `hathitrust` — sim-oficial

- **endpoint:** https://catalog.hathitrust.org/api/volumes/{brief|full}/{oclc|isbn|lccn|htid|recordnumber}/{valor}.json — Bib API, aberta e sem chave, mas SÓ metadados. Lote: /api/volumes/brief/json/oclc:424023;lccn:62009520 (até 20 itens). A paginação do scan só existe na Data API https://babel.hathitrust.org/cgi/htd/volume/meta/{htid} (htd:seqmap / htd:pnum) — exige chave OAuth. Bônus aberto: https://data.htrc.illinois.edu/ef-api/volumes/{htid}/pages (HTRC Extracted Features).
- **chamada:** `curl -sS "https://catalog.hathitrust.org/api/volumes/brief/oclc/424023.json"

# a que TERIA a paginação (falha sem chave):
curl -sS "https://babel.hathitrust.org/cgi/htd/volume/meta/mdp.39015025315527?v=2"   # -> 403 cf-mitigated: challenge

# EF API (aberta, mas sem página impressa):
curl -sS "https://data.htrc.illinois.edu/ef-api/volumes/mdp.39015025315527/pages?seq=00000030&pos=false"`
- **resposta obtida:** Bib API (HTTP/2 200, access-control-allow-origin: *):
{"records":{"000578050":{"recordURL":"https://catalog.hathitrust.org/Record/000578050","titles":["Infinite series"],"isbns":["9780030110405"],"issns":[],"oclcs":["424023"],"lccns":["62009520"],"publishDates":["1962"]}},"items":[{"orig":"University of Michigan","fromRecord":"000578050","htid":"mdp.39015025315527","itemURL":"https://babel.hathitrust.org/cgi/pt?id=mdp.39015025315527","rightsCode":"ic","lastUpdate":"20260305","enumcron":false,"usRightsString":"Limited (search-only)"},{"orig":"University of California","htid":"uc1.b4405602",...}]}
=> repare: htid, link do scan, direitos. NENHUM campo de página.

Data API (a que tem htd:pnum) — HTTP 403:
<title>Just a moment...</title> ... cf-mitigated: challenge

EF API (HTTP 200, 576 página
- CORS: permite-navegador · chave: Bib API: NÃO precisa de chave nem cadastro (testado com Origin real, devolve access-control-allow-origin: *). Limite informado na doc: chamadas em lote de até 20 itens. A Data API — a única que tem a paginação — exige chaveiro OAuth solicitado em babel.hathitrust.org/cgi/kgs/request, e quem não é de instituição membra precisa antes criar uma "Friend Account" da Univ. de Michigan. É credencial pessoal, com aprovação manual: não dá para embutir numa ferramenta aberta. EF API (HTRC): sem chave.
- licença: Bib API é pública e divulgada pela própria HathiTrust para bibliotecas integrarem registros no catálogo — uso programático é o propósito declarado. Não consegui ler a página oficial de termos (hathitrust.org devolve 403 de Cloudflare para cliente automatizado), então o limite de 20 itens/lote vem da documentação citada, não de leitura direta minha. EF (Extracted Features 2.5) é dataset de acesso aberto do HTRC, desenhado para uso não-consumptivo. O que NÃO é aberto: imagens de página e OCR de volumes protegidos (rightsCode "ic" = Limited/search-only).
- **selo sugerido: consulta-manual** · esforço: Integrar a Bib API: baixo, ~1–2 h, direto do navegador (CORS liberado, sem backend, sem chave). Só que isso resolve o passo errado. O que a prova pede — a página impressa — custaria: chave OAuth institucional com aprovação manual (semanas, e credencial pessoal, logo inviável para ferramenta aberta) ou nada. Recomendo NÃO implementar. · valor: baixo
- nota: O selo atual está CERTO e a nota também — só faltava saber por quê. Testei quatro caminhos de verdade.

1) A Bib API existe mesmo, é aberta, sem chave, e o CORS é `*` (dá para chamar do navegador puro). Mas ela devolve só ficha bibliográfica: título, ISBN/OCLC/LCCN, o htid do volume e o link do scan. Não tem uma linha sequer sobre páginas. Para GIA-42 ela não serve — ela te leva até a porta do livro e para aí.

2) A API que TEM o que a prova pede é outra, a Data API (`htd:seqmap`, `htd:pnum` = o mapa página-do-scan → página-impressa). Ela está fechada por dois motivos somados: exige chaveiro OAuth (pedido manual, e quem não é de instituição membra tem de abrir conta antes), e o babel.hathitrust.org agora responde `403` com `cf-mitigated: challenge` — desafio interativo do Cloudflare. Pela regra de ouro do projeto, não se burla isso e não se raspa o leitor. Registro sem rodeios: esse caminho está fechado, e fica fechado.

3) Achei uma terceira porta que ninguém tinha olhado: a EF API do HTRC (`data.htrc.illinois.edu/ef-api`), aberta, sem chave, CORS liberado, com dados por página. Cheguei a achar que tinha resolvido — no primeiro volume o número impresso aparecia entre os tokens do cabeçalho e o deslocamento saía limpo (seq = impressa + 22, explicando 89,9% dos tokens). Mas testei em mais dois volumes antes de cantar vitória e desabou: 21,4% e 11,7%. Livros antigos não têm cabeçalho corrido que o extrator reconheça, e aí os números que sobram são datas e legendas de figura. Ou seja: dá para adivinhar em livro acadêmico moderno, e erra feio no resto. Não é base para uma ferramenta — seria pior que não ter, porque dá resposta errada com cara de certa.

4) Um alerta de brinde: nesse mesmo volume a EF diz "Infinite series" (173 p.) na ficha mas entrega 576 páginas com cabeçalho de outro livro. Os metadados da EF e o scan real podem divergir. Mais uma razão para não confiar nesse atalho.

Conclusão prática para a prova: continua sendo abrir o scan e ler a página, exatamente como a nota já diz. E isso segue funcionando — o desafio do Cloudflare barra cliente automatizado, não pessoa em navegador. Sugiro só afinar a nota para: "A Bib API é aberta e sem chave, mas só dá metadados (htid e link do scan). A paginação do scan existe na Data API, que exige chave OAuth institucional. Abrir o scan e conferir a página continua sendo o caminho." Se um dia quiserem uma migalha de conforto, a Bib API serviria para transformar ISBN/OCLC no link direto do volume — economiza a busca no catálogo, mas não a leitura da página.

### `cbmsc` — so-dados-abertos-em-arquivo

- **endpoint:** Não existe API. O dado autoritativo está num PDF oficial:
https://documentoscbmsc.cbm.sc.gov.br/uploads/6a133ee2f56a3c8fc9f9cd6f1397a63b.pdf
(Portaria nº 1/CBMSC de 11/01/2024 — Separata ao BCBM nº 3 de 18/01/2024, "Articulação das OBM", Apêndice 1 = Circunscrições)

Endpoints TESTADOS e descartados:
- https://dados.sc.gov.br/api/3/action/organization_show?id=cbmsc&include_datasets=true → CKAN real, mas 0 datasets
- https://dados.sc.gov.br/api/3/action/package_search?q=bombeiros → count=1 (portarias de COVID, irrelevante)
- https://dados.sc.gov.br/api/3/action/package_list → 112 datasets no portal inteiro, nenhum do CBMSC
- https://www.cbm.sc.gov.br/index.php/estrutura/mapas → só PNG (mapas-SC_RBM-2026.png, 2026_7BBM.png, …)
- https://painele193.cbm.sc.gov.br/ → página de links; os sistemas (Web E-193, e-Bombeiro, Qlik) são internos/login
- https://documentoscbmsc.cbm.sc.gov.br/relatorio_documentos → listagem pública (11.760 docs, sem login), mas é HTML de 7,6 MB num DataTable, sem API
- **chamada:** `## 1) Provar que o portal de dados abertos do CBMSC está vazio
curl -s "https://dados.sc.gov.br/api/3/action/organization_show?id=cbmsc&include_datasets=true"

## 2) Baixar a portaria e extrair a tabela município→batalhão
curl -sO https://documentoscbmsc.cbm.sc.gov.br/uploads/6a133ee2f56a3c8fc9f9cd6f1397a63b.pdf

# o Apêndice 1 está nas páginas 3–7, em DUAS COLUNAS: extraia coluna a coluna
for p in 3 4 5 6 7; do
  pdftotext -f $p -l $p -x 0   -y 0 -W 298 -H 842 -layout arquivo.pdf - >> apendice1`
- **resposta obtida:** ### (a) CKAN de SC — organização do CBMSC existe, mas SEM dados (resposta real):
{"display_name":"Corpo de Bombeiros Militar do Estado de Santa Catarina","description":"","package_count":0,"created":"2019-10-11T19:41:19.249775","name":"cbmsc","is_organization":true,"state":"active","packages":[],"id":"9aa21b91-570c-4f9e-b73d-6336da24d43f"}

### (b) Texto REAL extraído do PDF da portaria (pág. 3):
      CIRCUNSCRIÇÃO 1o BBM
 1    Florianópolis
      CIRCUNSCRIÇÃO 2o BBM
 No                Município
 1    Abdon Batista
 2    Arroio Trinta
 3    Brunópolis
 4    Caçador
 ...
      CIRCUNSCRIÇÃO 4o BBM
 1    Araranguá
 2    Balneário Arroio do Silva
 3    Balneário Gaivota

### (c) Resultado REAL do parse completo que rodei (295/295, zero duplicata):
 1o BBM:   1 | Florianópolis
 2o BBM:  24 |
- CORS: precisa-backend · chave: Nenhuma. Sem cadastro, sem token, sem captcha e sem login em nada que usei — o PDF da portaria e a listagem de documentos são públicos e abertos. Não encontrei rate limit. (Observação: os sistemas internos do CBMSC — Web E-193, e-Bombeiro, relatórios Qlik — exigem login, e por isso ficaram FORA da investigação, conforme a regra de ouro.)
- licença: Favorável, e é o ponto forte aqui. O dado vem de uma portaria do Comandante-Geral publicada em boletim oficial e no Diário Oficial do Estado. Pela Lei 9.610/98, art. 8º, IV, "os textos de tratados ou convenções, leis, decretos, regulamentos, decisões judiciais e demais atos oficiais" NÃO são objeto de proteção autoral. Ou seja: ato oficial não tem copyright, pode embarcar e redistribuir à vontade. O correto é citar a fonte (Portaria nº 1/CBMSC de 11/01/2024) e a data-base, por honestidade, não por obrigação legal. Nada foi raspado de área logada nem contornou proteção.
- **selo sugerido: aberta** · esforço: Baixo — e metade já está feita. A extração eu já rodei e validei: 295/295 municípios, zero duplicata, JSON de 7 KB (2,3 KB gzipado). O arquivo está pronto em cbmsc-batalhoes-2024.json.

Falta:
1. Copiar o JSON para src/data/ e escrever o lookup — ~30 min. Normalizar a chave (minúscula, sem acento) para casar com o que o usuário digita.
2. Corrigir o atraso do 16º/17º BBM lendo os dois PNG de 2026 a olho — ~30 a 60 min, uma vez só. É trabalho manual, mas é conferência de mapa, não burla de nada.
3. Ligar na aba Cola com busca por município — ~30 min.

Total ~2h. Zero backend, zero chave, zero latência, funciona offline. Se optar por NÃO fazer o passo 2, cai para ~1h e o dado fica certo em ~275 dos 295 municípios. · valor: medio
- nota: ## O selo estava errado, mas por um motivo bom: o dado existe e é seu

A nota atual diz "São imagens, não dados: a comparação é a olho, mapa por mapa". Isso é verdade sobre a página de mapas — confirmei, são só PNG (mapas-SC_RBM-2026.png, 2026_7BBM.png etc.), sem GeoJSON, sem shapefile, sem KML. Mas a conclusão de que só resta olhar mapa está errada: **a tabela município→batalhão existe em texto, num ato oficial, e eu extraí ela inteira.**

O CBMSC publica a "Portaria de Articulação das OBM". O Apêndice 1 dela é exatamente o que a Cola precisa: para cada batalhão, a lista numerada dos municípios da circunscrição. Extraí os 295 municípios de SC, batendo certo, sem sobra nem duplicata.

## Não existe API — e isso está bem checado

Testei tudo que prometia dado e não entreguei nada por suposição:
- O portal de dados abertos de SC **tem** organização do CBMSC cadastrada desde 2019, e ela está **vazia**: `package_count: 0`. Não é que eu não achei o dataset — a API respondeu que não há nenhum.
- O portal inteiro tem 112 datasets; nenhum de bombeiros.
- O painel E-193 e o e-Bombeiro são sistemas internos com login. **Não tentei entrar, e não se deve.**
- A listagem pública de documentos (11.760 registros, sem login) confirma que o 16º BBM está ativo desde jan/2026, mas não expõe API.

Nenhum host devolve `Access-Control-Allow-Origin`, então nada disso seria chamável do navegador. Só que isso vira detalhe: **a recomendação é embarcar, e aí não há chamada nenhuma** — nem navegador, nem backend, nem what3words-style proxy. 7 KB no bundle resolvem.

## O porém honesto, e ele importa

A portaria que extraí é de **janeiro de 2024, com 15 batalhões**. Em 2026 o CBMSC ativou mais dois: o **16º BBM (Jaraguá do Sul)**, em 23/01/2026, e o **17º BBM (Araranguá)**. Eles foram recortados de território que na minha tabela ainda aparece como 7º BBM (Jaraguá do Sul, Corupá, Guaramirim, Schroeder…), 9º BBM (São Bento do Sul, Rio Negrinho, Campo Alegre) e 4º BBM (os 15 municípios da AMESC, que hoje são o 17º).

Procurei a portaria de articulação de 2026 e **não achei publicada** — só os mapas PNG de 2026. Então:

- Se a prova mostrar um mapa antigo ou usar o número do batalhão "clássico", a tabela de 2024 acerta.
- Se a prova usar o mapa de 2026, ~20 municípios do norte e do extremo sul dão número errado.

Por isso o passo 2 do esforço: conferir os dois PNG de 2026 a olho, uma vez, e corrigir o delta. É chato, mas é uma tarde e nunca mais.

## Uma ressalva sobre o uso descrito

A ficha diz "o nº da **região** indexa a letra". Região (RBM) e batalhão (BBM) são coisas diferentes: hoje são **5 RBM** e **17 BBM**. O que eu extraí é município→**BBM** (1 a 15). O mapeamento BBM→RBM atual eu **não** consegui confirmar em fonte confiável — a Wikipédia lista só 3 RBM, está desatualizada, e a página de Regiões do CBMSC só traz nomes de comandantes. Vale decidir qual dos dois números a GIA-23 realmente usava antes de fechar a implementação; se for RBM, falta esse pedaço e ele não está resolvido.

## Recomendação

Trocar o selo para **aberta**, com a ressalva explícita de que "aberta" aqui significa **dado embarcado**, não API viva — e registrar a data-base (jan/2024 + remendo de 2026) na própria ficha, para ninguém confiar cegamente daqui a dois anos.

### `oktoberfest` — sim-nao-oficial

- **endpoint:** https://oktoberfestblumenau.com.br/wp-json/wp/v2/ (WordPress REST API, aberta). Úteis: /wp/v2/media?mime_type=application/pdf (acha o guia do ano) e /wp/v2/atracao (169 atrações da programação). NÃO existe endpoint para o dado que a Cola indexa (nº do mapa → nome): isso só existe dentro do PDF, páginas centrais (20–21 de 40).
- **chamada:** `curl "https://oktoberfestblumenau.com.br/wp-json/wp/v2/media?search=guia&mime_type=application/pdf&orderby=date&order=desc&per_page=3&_fields=id,date,source_url"`
- **resposta obtida:** OBTIDA. Descoberta do guia (HTTP 200, x-wp-total: 2):
[{"id":8931,"date":"2025-10-03T21:28:15","source_url":"https://oktoberfestblumenau.com.br/wp-content/uploads/2025/10/GUIA_OKTOBER_2025_COMPLETO.pdf"},{"id":6972,"date":"2024-10-08T16:59:40","source_url":"https://oktoberfestblumenau.com.br/wp-content/uploads/2024/10/guia_oktoberfest_2024_compacto.pdf"}]

CORS (o header ecoa o Origin que mandei, testado com dois domínios diferentes):
  access-control-allow-origin: https://decrypter.thelogiclab.com.br
  access-control-allow-methods: OPTIONS, GET, POST, PUT, PATCH, DELETE

Tipos de post expostos (/wp/v2/types): atracao "Atrações", produto "Produtos", programacao "Programação".
/wp/v2/atracao → HTTP 200, x-wp-total: 169. Primeiro item: {"id":9175,"slug":"transmissao-do-concurso-da-realeza","
- CORS: permite-navegador · chave: Nenhuma. Endpoint público, sem cadastro e sem token. Não vi cota nem rate limit: 5 chamadas seguidas voltaram 200 200 200 200 200. robots.txt é permissivo (`User-agent: * / Disallow:` vazio, libera tudo).
- licença: Não há declaração de dados abertos nem termos de API — a REST API está aberta simplesmente porque é o padrão do WordPress, não porque a festa publicou um dado aberto. O guia é publicação editorial com publicidade paga, © Parque Vila Germânica/PROEB. A legenda em si (nº + nome do estande) é informação factual e curtíssima (~35 nomes), o tipo de coisa que se cita sem problema; reproduzir páginas do guia ou o mapa em si já seria outra conversa. Uso não comercial, numa oficina de cifras, citando a fonte: tranquilo. Não há captcha nem login em lugar nenhum — nada aqui esbarra na regra de ouro.
- **selo sugerido: consulta-manual** · esforço: Mantendo consulta-manual: zero, só corrigir a nota.
Melhoria barata (recomendada): embarcar as legendas de 2024 e 2025 rotuladas POR EDIÇÃO — ~2 KB de JSON, sem infra, sem rede. 1–2 h, contando a conferência manual das colunas.
Caminho automático (não recomendado): descobrir o PDF pelo wp-json (trivial, 30 min) + proxy no backend .NET porque o PDF não tem CORS (~2 h, molde what3words/Nominatim já pronto) + extrair a legenda do PDF (o caro: 85 MB baixados a cada consulta e um parse frágil — o pdftotext -layout devolve a legenda em 5 colunas intercaladas, com nomes quebrados em duas linhas, então "24 Central de / Acolhimento" precisa de heurística de reagrupamento). Total ~1 dia, para um dado que muda todo ano e que a pessoa lê em 10 segundos abrindo a página 20. · valor: medio
- nota: O selo continua `consulta-manual`, mas por um motivo diferente do que estava escrito — e a nota atual precisa de conserto porque ela subestima o site.

O que eu descobri e ninguém tinha visto: o site é WordPress e a REST API está ABERTA e com CORS liberado. Dá para chamar direto do navegador, sem backend e sem chave — testei mandando dois Origins diferentes e o servidor ecoou os dois no `access-control-allow-origin`. Tem até um tipo de post chamado `atracao` com 169 registros. Parece a solução perfeita. Não é.

O `atracao` são as atrações da PROGRAMAÇÃO (shows, desfiles, "Jornal do Almoço Ao vivo"), não as do MAPA. O campo `acf`, onde caberia um número, vem vazio em todos. E o tipo `programacao` está com zero registros. Ou seja: existe API, ela funciona, e ela responde outra pergunta.

O par "nº → nome" que a Cola indexa só existe desenhado no mapa das páginas centrais do PDF. Confirmei abrindo os dois guias que existem.

E aí vem o achado que decide tudo: **a numeração muda a cada edição**. Em 2024 o Rest. Bierhaus é o 1; em 2025 ele é o 2, porque entrou um "Táxi" na frente. O Oktobershop foi de 3 para 4, o Espaço Mãe de 5 para 7. Um dataset fixo não só envelhece — ele dá resposta errada com cara de resposta certa, que é o pior defeito possível numa oficina de cifras. Se embarcar, embarque separado por ano e mostre o ano na tela.

Segundo achado, pior ainda: **não existe guia antes de 2024**. Nem na midiateca do site, nem no Wayback (varri o CDX do domínio inteiro, 2010 em diante — o que sobrou de antigo é regulamento de desfile e edital). Então, para uma prova do acervo de 2017–2023, o guia daquele ano é irrecuperável pela fonte oficial. Nenhuma automação resolve isso; o que resolveria é alguém ter guardado o PDF.

Uma coisa que dá para melhorar de graça, e vale: hoje a nota fixa o nome do arquivo de 2025, que já estava desatualizado em relação ao de 2024 (`guia_oktoberfest_2024_compacto.pdf` vs `GUIA_OKTOBER_2025_COMPLETO.pdf` — muda até a caixa). O nome é imprevisível, mas o arquivo é **descobrível**: uma chamada ao `/wp-json/wp/v2/media?search=guia&mime_type=application/pdf&orderby=date&order=desc` devolve sempre o guia mais recente. Vale trocar o link fixo da Cola por essa busca, ou pelo menos registrar a receita na nota — assim a ficha não apodrece em outubro de 2026, quando sair o guia novo.

Detalhe operacional: o `wp-json` tem CORS, mas o PDF **não** — o HEAD do arquivo não devolve header nenhum de CORS. Então descobrir o link dá para fazer no navegador; baixar e parsear o PDF, não, teria de passar pelo backend.

Minha recomendação, em ordem: (1) manter `consulta-manual`; (2) reescrever a nota dizendo que a numeração muda por edição, com o exemplo do Bierhaus 1→2, e que não há guia anterior a 2024; (3) trocar o link fixo pela busca no wp-json; (4) opcionalmente embarcar as legendas de 2024 e 2025 como duas tabelas separadas e rotuladas — são 2 KB e cobrem as únicas edições que ainda existem.

### `portal-covid-blumenau` — sim-nao-oficial

- **endpoint:** https://blumenau.sc.gov.br/coronavirus/wp-json/wp/v2/ (WordPress REST API, sem autenticação). Rotas úteis: /pages/4869 (página "Sobre a COVID-19", onde estão os rótulos em texto), /media?search=<termo> (238 itens, os arquivos das ilustrações), /pages (29), /posts. Descoberta em /coronavirus/wp-json/ → namespaces oembed/1.0, accordion-blocks/v1, visualizer/v1, themeisle-sdk/v1, wp/v2 (80 rotas).
- **chamada:** `curl "https://blumenau.sc.gov.br/coronavirus/wp-json/wp/v2/media?search=tosse&per_page=1&_fields=id,slug,title,alt_text,source_url,date"

curl "https://blumenau.sc.gov.br/coronavirus/wp-json/wp/v2/pages/4869?_fields=id,slug,link,title,content"

Preflight testado: curl -X OPTIONS -H "Origin: https://decrypter.example.com" -H "Access-Control-Request-Method: GET" .../wp/v2/media`
- **resposta obtida:** OBTIDA (HTTP 200, anônimo, sem chave).

/media?search=tosse →
[{"id":106,"date":"2020-05-13T07:18:16","slug":"tosse","title":{"rendered":"tosse"},"alt_text":"","source_url":"https://blumenau.sc.gov.br/coronavirus/wp-content/uploads/2020/05/tosse.png"}]

/wp-json/ → name: "Prefeitura de Blumenau", description: "Coronavírus", url: "https://blumenau.sc.gov.br/coronavirus", 80 rotas.

/pages/4869 (24.947 bytes de HTML) traz os rótulos em texto puro: "Os principais são: Coriza e/ou congestão nasal Tosse Dor de cabeça Febre Dor de garganta Dificuldade para respirar" — seguidos do bloco CUIDADOS com 9 itens (lavar as mãos, cobrir ao tossir, não tocar o rosto, 2 metros de distância, higienizar o celular, ventilar ambientes, máscara caseira, evitar circulação, isolamento social).

Os 8 <img> dessa 
- CORS: permite-navegador · chave: Nenhuma. Sem chave, sem cadastro, sem captcha, sem login. GET anônimo puro devolve 200 em /media e /pages. Sem cota declarada (é um WordPress parado, não um serviço com plano).
- licença: Sem licença declarada e sem página de termos de uso no portal (procurei; a única peça jurídica é a política de privacidade do app PRONTO, que trata de LGPD e não de reuso). É comunicação oficial de saúde pública de órgão municipal, portanto informação pública sob a LAI (Lei 12.527/2011) — reusar 15 rótulos curtos e factuais com atribuição à Prefeitura de Blumenau é seguro. O que NÃO se deve fazer é re-hospedar as imagens PNG em si (arte de autoria não licenciada); embarcar só o texto dos rótulos e linkar a imagem na origem.
- **selo sugerido: aberta** · esforço: Baixo, nas duas rotas. (a) Embarcar os rótulos: ~30 min — são 15 strings, 116 bytes de JSON para os 6 sintomas e ~1 KB com o bloco CUIDADOS; vira uma constante TS no padrão que a Cola já usa, e resolve a GIA-12 sem rede. (b) Chamada ao vivo do navegador: 1–2 h — fetch direto, sem backend, sem chave, sem proxy; só precisa despir o HTML de content.rendered. Recomendo (a) e, se quiser, (b) como conferência. · valor: medio
- nota: A nota atual está factualmente errada e precisa mudar. Ela diz que "a aba saiu do ar com o fim da campanha" — não saiu. O portal responde HTTP 200 hoje em https://blumenau.sc.gov.br/coronavirus/ (80 KB de HTML), é um WordPress 5.4.1 congelado: último post de 02/06/2021, última página modificada em 21/11/2022. Está de pé e intacto.

E existe API, ao contrário do que o selo "consulta-manual" sugeria: a REST API do próprio WordPress, em /coronavirus/wp-json/wp/v2/. Sem chave, sem captcha, sem login — nada de burlar nada, é o endpoint que o WP publica por padrão e que o próprio HTML anuncia no cabeçalho Link: rel="https://api.w.org/". O CORS é totalmente permissivo: mandei uma Origin forjada e ela voltou refletida no Access-Control-Allow-Origin, e o preflight OPTIONS respondeu 200. Ou seja: dá para chamar direto do navegador, NÃO precisa passar pelo backend .NET.

Uma ressalva honesta sobre o que a API entrega. Os campos alt_text e caption de TODAS as ilustrações estão vazios — os rótulos estão queimados no pixel do PNG, não nos metadados. Então a API não devolve "rótulo da ilustração" por metadado de imagem. Mas devolve as mesmas palavras por dois outros caminhos, e é isso que interessa para a GIA-12: (1) o texto da página /pages/4869, que lista os seis sintomas na ordem exata das figuras, e (2) o slug de cada arquivo (coriza, tosse, dor-_de_cabeca, febre, dor_de_garganta, dificuldade_respirar), que é o rótulo em si. As duas fontes batem entre si, o que serve de conferência.

Recomendação: embarcar. O dado é minúsculo (6 rótulos de sintoma + 9 itens de cuidado) e a fonte é frágil de um jeito verificável, não hipotético — o domínio-vaidade coronavirusblumenau.sc.gov.br JÁ MORREU: o certificado TLS não cobre mais o nome (curl erro 60), então aquele endereço, que ainda aparece no Google, é link morto. O que sobrou é a pasta /coronavirus/ dentro do site principal, servida por um WordPress 5.4.1 sobre IIS 7.5 e PHP 7.4 — pilha inteira fora de suporte. Isso some numa migração qualquer, sem aviso. Copiar os 15 rótulos para dentro do Decrypter custa meia hora e torna a prova imune a isso; o link fica na Cola só como procedência.

Detalhe de curiosidade que confirma a identidade do portal: o slogan da campanha era "MANTENHA DUAS CAPIVARAS DE DISTÂNCIA", e a ilustração raio_alcance.png é justamente a do raio de 2 metros.

### `siatu-vm` — so-dados-abertos-em-arquivo

- **endpoint:** Para o VM em si: não há endpoint — só o Anexo II da LC 632/2007 em PDF (https://www.blumenau.sc.gov.br/enotablu-legislacao&download=1f293a601cc7ca2d91fffd0d56f0dde9, 202 pág., tabela nas pág. 131-132). O geoportal TEM a coluna, mas vazia: https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Rol_de_ruas/MapServer/0/query (campo VLR_PGV). O que funciona de verdade nesse mesmo endpoint é COD_LOG (código de logradouro).
- **chamada:** `# 1) Prova de que VLR_PGV está zerado nos 9372 registros:
curl -sG "https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Rol_de_ruas/MapServer/0/query" \
  --data-urlencode "where=1=1" \
  --data-urlencode 'outStatistics=[{"statisticType":"max","onStatisticField":"VLR_PGV","outStatisticFieldName":"MAXPGV"},{"statisticType":"sum","onStatisticField":"VLR_PGV","outStatisticFieldName":"SUMPGV"}]' \
  --data-urlencode "f=json"

# 2) O que PRESTA no mesmo endpoint — rua <-> COD_LOG (`
- **resposta obtida:** OBTIDA. (1) Estatística sobre os 9372 eixos: {"MAXPGV":0.0,"MINPGV":0.0,"SUMPGV":0.0,"N":9372.0,"MAXCOD":20001.0} — e where=VLR_PGV>0 devolve {"count":0}, embora VLR_PGV IS NOT NULL devolva {"count":8808}. Coluna existe, valor é zero em 100% dos casos. Idem na camada Sistema_Viario/Rodovias: {"SETOR_CALC":"-","VLR_PGV":0.0,"PLANTA_QUA":0.0}.
(2) Registro cru real do mesmo serviço: {"OBJECTID":1,"IQ":"31-1753","COD_LOG":31,"QUA_DIREIT":"4-3-2-9","BAIRRO_DIR":"11-VELHA","CEP_DIREIT":89036800,"PAVIMENTAC":"Macadame","LARGURA_VI":10.0,"VLR_PGV":0.0,"DESCRICAO":"IRMA ALUYSIANIS"} — e ruas conhecidas: (998,"7 DE SETEMBRO"), (744,"15 DE NOVEMBRO"), (494,"ITAJAI"), (887,"MARTIN LUTHER").
(3) Anexo II da LC 632 extraído do PDF (49 linhas): "VALORES DOS TERRENOS SEGUNDO A ZONA FISCAL E SETOR DE CÁLC
- CORS: permite-navegador · chave: Nenhuma. O geoportal ArcGIS é anônimo e sem cota declarada; testei ~40 requisições seguidas sem throttle. O único limite prático é maxRecordCount=1000 por página (paginação por resultOffset funciona na consulta normal, mas NÃO funciona junto com groupByFieldsForStatistics — ali o offset é ignorado e devolve a mesma página, armadilha que me custou uma contagem errada de "1000 ruas" antes de eu paginar os registros crus e achar as 3848 reais).
- licença: Dado público municipal. O PDF da LC 632/2007 é lei — texto de lei não tem direito autoral (Lei 9.610/98, art. 8º, IV), pode embarcar à vontade. O geoportal não publica termos de uso nem aviso de licença em lugar nenhum (conferi a home do portal e a página de download da SEPLAN, que está 404); copyrightText das camadas vem vazio. Na prática é dado aberto de fato, mas sem licença explícita — o correto é creditar "Prefeitura de Blumenau / SEPLAN" e, se for embarcar, registrar a data da coleta.
- **selo sugerido: consulta-manual** · esforço: Duas coisas diferentes. (a) Embarcar o de-para rua↔COD_LOG: ~2h — um script de coleta (paginar 10 chamadas de 1000) + JSON de 35 KB gzip + campo de busca. Não precisa de backend. (b) Embarcar o Anexo II (49 linhas, ZF×Setor→R$): ~30 min, é copiar a tabela do PDF. (c) O VM por rua de verdade: só por LAI, prazo de semanas e fora do seu controle. · valor: medio
- nota: A ficha está errada em três pontos, e o mais importante é o da premissa.

1) O VM DE BLUMENAU NÃO É POR RUA. O art. 230, I do Código Tributário (LC 632/2007) manda calcular o valor venal do terreno pelo "valor do metro quadrado segundo a Zona Fiscal e Setor de Cálculo onde se situa o imóvel, conforme o Anexo II". O Anexo II é uma tabelinha de 49 linhas (Zona Fiscal 1–4 × Setor 1–18). Não existe, em lugar nenhum, "o VM da Rua X" — existe o VM do par (zona fiscal, setor), e quem sabe em que par cada rua cai é o cadastro do SIATU. Além disso, o VM é dinheiro (337,26 … 2,70), não um "número estável de ~4 dígitos".

2) O GEOPORTAL TEM A COLUNA E ELA ESTÁ VAZIA. Varri os 102 serviços de mapa / 278 camadas do geoportal atrás de campo fiscal. Só 3 camadas têm: Rol_de_ruas e Eixos (VLR_PGV) e Rodovias (VLR_PGV + SETOR_CALC + PLANTA_QUA). Todas zeradas: max=min=sum=0 sobre 9372 registros, e SETOR_CALC="-". Ou seja, o esquema interno da prefeitura prevê a planta de valores, mas o serviço público a publica em branco. Isso não é falha de consulta minha — é supressão deliberada, e é a resposta definitiva para "o ArcGIS expõe a camada?": não expõe.

3) A NOTA SOBRE CORS ESTÁ FACTUALMENTE ERRADA. O SIATU manda "Access-Control-Allow-Origin: *" — não é "sem CORS". Só que manda o header duplicado (o navegador rejeita valor repetido), e o fluxo é WebForms com __VIEWSTATE (3328 chars), __EVENTVALIDATION (1676) e cookie de sessão; a lista de logradouros só aparece por postback parcial de UpdatePanel — o meu postback voltou com 0 opções. Não tem captcha e não tem login, mas o único caminho é replicar sessão ASP.NET, isto é, raspagem. Pela regra de ouro do projeto, isso fecha a porta: fica manual.

O QUE FAZER, NA MINHA OPINIÃO: mudar de "adiada" para "consulta-manual" e reescrever a ficha, porque "adiada" promete uma coisa que a LAI não vai entregar do jeito que está pedida. Se for pedir por LAI, peça a coisa certa: o de-para logradouro → zona fiscal + setor de cálculo. Com ele mais o Anexo II (que já é público) você monta o VM por rua sozinho.

E o consolo é melhor que o alvo. O que a ficha diz querer — "o melhor número secreto por rua que existe", ~4 dígitos, estável — existe, está aberto e eu testei: é o COD_LOG, o código de logradouro, no mesmo endpoint Rol_de_ruas. São 3848 ruas distintas, código de 1 a 4570, 2854 delas (74%) com exatamente 4 dígitos, cada uma com nome, bairro e CEP. 7 DE SETEMBRO = 998, 15 DE NOVEMBRO = 744, ITAJAI = 494. O CORS reflete o Origin (testei com Origin falso e voltou "access-control-allow-origin: https://decrypter.local"), então dá para chamar direto do navegador, sem passar pelo backend .NET. Ou, melhor ainda para uma prova de gincana com internet ruim, embarcar: 35 KB gzipados. Sugiro abrir uma fonte nova com selo "aberta" para isso, em vez de deixar o achado enterrado na ficha do VM.

Ressalva honesta: não consegui confirmar o que a tela de detalhe do SIATU mostra, porque não tenho número de cadastro válido para consultar — as ocorrências de "VM" e "Metro" que aparecem no HTML são falso positivo (lixo base64 do VIEWSTATE e a classe CSS "MetropolisBlue" do DevExpress). Então "o SIATU exibe o VM do imóvel" continua sendo suposição da ficha, não fato verificado.

Arquivo a editar: /Users/peter/Repos/the-decrypter/src/features/reference/sources.ts (entrada siatu-vm, linhas 281-292).