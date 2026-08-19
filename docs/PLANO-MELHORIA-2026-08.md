# Plano de melhoria — 19/08/2026

> Sucessor operacional do [`PLANO-ABERTO-2026-08.md`](PLANO-ABERTO-2026-08.md), que é o
> *inventário*. Este é a *ordem de serviço*: o que fazer, em que ordem, e por quê.
>
> Base de evidência: três levantamentos medidos (pendências nos dois repos · auditoria dos 137
> verbetes da Ajuda · inventário das 23 pastas do geoportal de Blumenau), 22 agentes, 740 chamadas
> de ferramenta. Nada aqui é lembrança.

---

## Placar — atualizado em 19/08, fim do dia

| item | estado |
|---|---|
| Push dos 3 commits | **feito**, deploy verde |
| Guia mentindo em 4 exemplos | **feito** (`d77ab9f`), com teste de regressão |
| **Guia novo** — filtro, múltiplos exemplos, código encurtado, motor ao vivo | **feito** (`e1efbe0`) |
| **1.1** Plus Code curto e Geohash na cascata | **feito** (`0563966`) — virou "todas as leituras" |
| **1.2** A1Z26 cíclico | **feito** (`4d37994`) |
| **1.3** Zero-width estendido (7 → 406 pontos de código) | **feito** (`4d37994`) |
| **3.3** Carta ao milionésimo, separadores, número MI | **feito** (`4d37994`) |
| Dedup do motor ignorando caixa | **feito** (`dee8e09`) — achado no caminho |
| **1.4** Verdade das telas (roadmap, `sources.ts`, Cola) | **feito** (`641720c`) — a Cola passou de 10 para 26 formatos, derivados da fonte |
| **Onda 4** criptanálise: IC, Kasiski, Vigenère sem chave, substituição | **feito** (`2eb4e5c`) |
| **3.1** endereço dos lotes · **3.2** eixos | **feito** (`916f4a8` + `184def4`) |
| Impressão digital do seed (dataset regenerado nunca chegava em prod) | **feito** (`184def4` + `0ea3dd9`) |
| **Rota na URL** + atalho por cifra (`/cifra/base64`) | **feito** (`631d8b6` + `603cf24`) |
| **1.5** Exemplo clicável | **feito dentro do guia novo** |
| **3.1** Endereço dos lotes · **3.2** Eixos | em construção |
| Onda 2 (senha, backup, `sync-data`) | **fora por decisão do dono** |

### Três coisas que a regra mudou, e valem para o resto

**"Se existe uma localização, mesmo longe, é válida."** Isso reenquadrou o 1.1
inteiro: o defeito nunca foi responder Atlântico Sul, foi a resposta de Itajaí
não existir na tela. A cascata passou a devolver LISTA, e a leitura distante
fica — embaixo. Apagá-la seria decidir pelo jogador.

**Piso sem teto não segura nada.** O A1Z26 cíclico nasceu com piso 0,32 e a
aposta de que sem palavra ficaria na gaveta; medido, sete de vinte listas
numéricas comuns cruzavam o corte com lixo. Só cruza com palavra real
confirmada — e a trava só vale quando a lista de palavras já chegou, senão se
pune por dado ausente.

**Código que a tela não alcança é código que não existe.** O `decodeMiSheet`
estava escrito, testado e com zero referências fora do módulo, enquanto a ficha
anunciava "articulação MI".

---

## O que mudou desde o inventário

| item | antes | agora |
|---|---|---|
| 3 commits não pushados | maior razão da lista | **feito** — `d8509f9` (API) e `071a946` (front) em produção, deploy verde |
| Guia mentindo em 4 exemplos | desconhecido | **feito** — `d77ab9f`, com teste de regressão |
| `binary-number` sem verbete | suspeita | **feito** — era real, o único dos 112 |

Restam **três defeitos que fazem o produto responder errado**, e é por eles que se começa.

---

## Onda 1 — parar de mentir (P, tudo numa semana)

### 1.1 O Plus Code curto na cascata da aba · **P** · o item mais grave que existe hoje

A aba Geolocalização responde `38HQ+J3` em **−58,40 / −44,95** — Atlântico Sul, 2.900 km fora — com
**nota 0,90, a mais alta que a cascata emite**. `g7rpj` responde na Islândia. As duas entradas são
de provas gabaritadas da série.

Medição que aperta o diagnóstico: a caixa da aba **já faz** atalho local para MGRS (`GR3221221631` →
Itajaí, 0,75), GeoHex (`11478825612` → Itajaí) e GEOREF (`MD2005` → Itajaí). Falham **exatamente
dois** — Plus Code e Geohash — porque o atalho deles mora no decoder `local-geocode` e não no
`detectLocation` que o `geo-panel.tsx:34` chama. E as fichas desses dois, na mesma tela, prometem
em letras de marca que a bancada completa o prefixo da cidade.

Conserto: mover `decodePlusCodeLocal` e `decodeGeohashLocal` para o array `local` de
`formats.ts:530`, na camada `CONFIANCA.atalho` (0,75). Teste de regressão com `38HQ+J3` e `g7rpj` —
hoje `grep -rn 38HQ src/` devolve zero.

### 1.2 A1Z26 acima de 26 · **P**

`27 5 12 1` e `34 31 38 38 41` produzem **zero cards** da família A1Z26. Os três decoders recusam
sem redução modular (`ciphers.ts:81`, `:83`, `cipher-disk.ts:132`). Uma contagem que dobra o
alfabeto não produz nada. Conserto: redução modular com origem parametrizada, reusando a máquina do
`cipher-disk`.

### 1.3 Zero-width estendido · **P**

`zero-width.ts:7` conhece 7 code points. Bloco Tags (U+E0000–E007F), seletores de variação
(U+FE00–FE0F, U+E0100–E01EF) e Bidi (U+202A–202E, U+2066–2069) passam batido, e a bancada responde
"não há nada escondido" — o falso negativo é o erro mais caro numa gincana.

### 1.4 A verdade das telas · **P**

O que sobrou depois do `d77ab9f`: o Roadmap in-app promete como *a fazer* três coisas entregues
(CNAE/FIPE/TSE, aba Arquivo, SAMAE nos 5 dígitos); `sources.ts:312` ainda diz "três grafias" da
inscrição (são quatro); e a Cola tem uma lista de 10 formatos de coordenada escrita à mão enquanto
`geo/formatos.ts` — que se declara fonte única — tem 26.

### 1.5 Exemplo clicável na Ajuda · **P** · responde ao "como usar"

`help-page.tsx:55` renderiza o exemplo como **texto morto**. Quem lê tem de retransscrever à mão —
e foi exatamente por isso que o CAR truncado passou anos sem ninguém notar: ninguém tentou.
Um botão "Testar" que carrega o exemplo no Decodificador transforma o guia em bancada, e faz o
exemplo quebrado gritar na primeira vez que alguém clica.

---

## Onda 2 — segurança e o que não se recupera (M)

### 2.1 Senha no Postgres · **M**

`docker-compose.prod.yml:21-22` roda em `trust`. A justificativa antiga ("dado público") caiu no dia
em que `app_user` passou a guardar hash de senha. Qualquer contêiner na `decrypter-internal` lê a
tabela sem credencial. **Não é só definir a variável**: o `pg_hba.conf` vive no volume já
inicializado — `ALTER USER` → `sed` → `pg_reload_conf` —, e a ordem importa (banco primeiro,
Dokploy depois; ao contrário a API cai no próximo deploy).

### 2.2 Backup · **M**

`grep -rn "pg_dump|crontab|backup"` no repositório inteiro devolve 4 linhas, todas dentro de um
documento. Um `down -v` leva junto as contas e as aprovações: o dataset volta pelo seed, as contas
não. Dump agendado **e um restore testado** — backup não testado não é backup.

### 2.3 O footgun do `sync-data` · **P**, e é o mais traiçoeiro

`Makefile:23` procura o dataset em `seed-data/` **primeiro** e cai para `public/data/` como
alternativa. Três passos do `build:data` escrevem em `public/data/`. Quem regenerar um dataset com
sucesso escreve no diretório perdedor, e o deploy embarca o antigo **em silêncio**. Some a isso que
`pnpm build:data` já morre no segundo passo numa clonagem limpa (`build-ceps.ts:19` lê um CSV
gitignored e ausente).

### 2.4 Riscos sem dono anotado · **P**

`GH_PAT_THE_DECRYPTER` é ponto único de falha de **todo** deploy da API — o workflow faz checkout do
repo do front com ele — e não tem nota de validade nem de rotação em documento nenhum.
`AUDD_TOKEN` só existe num comentário de compose, então o reconhecimento de música nasce desligado
para quem seguir o runbook. A stack do Traccar não aparece em nenhum documento de deploy.

---

## Onda 3 — o que o geoportal oferece de graça

O inventário mediu as 23 pastas. **Quatro coisas valem**, e a primeira não é decoder novo — é o
conserto do decoder que acabou de entrar.

### 3.1 O endereço que falta em 87,6% dos lotes · **P** · melhor retorno da onda

A base embarcada tem 84.539 lotes, e **74.091 não têm número de porta utilizável** (44.227 com
`NUMERO` vazio, 29.842 com `"00"`, 1.472 com `"000"`, 81 com `"0000"`). O `Lotes_info` não tem esse
dado. A tabela `consulta_construir/Consulta_endereco/MapServer/1` tem — **170.993 linhas**.

Amostra aleatória de 150 lotes sem número, consultada no servidor: **114 (76%) ganham número de
verdade**, e o nome da rua bate com o que já temos em 113 dos 114. Extrapolando, ~56 mil lotes saem
de "Rua Iguape — Itoupava Seca" para "Rua Iguape, 546".

**O gatilho não muda**: a pessoa continua digitando `41241628`. Muda a resposta. Trabalho: ~35
páginas no build, join por `TRDSIQ`, e o cartão passa a admitir **conjunto** de endereços — 11 dos
114 lotes da amostra têm mais de um (lote de esquina).

### 3.2 Eixos de logradouro: três gatilhos de uma vez · **M**

`consulta_construir/Eixos` — 9.372 trechos. Nosso `streets.json` veio do PDF do Rol de Ruas e foi
geocodificado por *join* de nome com a base de CEP; resultado, **1.248 dos 4.426 trechos (28,2%)
estão sem coordenada nenhuma**. Testados 8 desses: **7 são achados por `COD_LOG`**, com o nome
idêntico, e vêm com o traçado da via em vez de um centroide de CEP.

Três decoders no mesmo dado: código de logradouro (3.720 códigos para 3.719 nomes, quase 1:1),
número da lei de denominação (já temos `numLei` em 4.092 dos 4.426 — decoder sem custo de dado
novo) e CEP por lado do trecho. Bônus: `QUA_DIREIT`/`QUA_ESQUER` é prefixo do IQ do lote, então a
rua passa a dizer qual quadra fica de cada lado.

### 3.3 A folha de voo municipal · **P** · fecha o assunto "folha carta"

`voo/Articulacao_1000_2022` (938 folhas) + `Articulacao_5000_2022` (93). Hoje `carta-ibge.ts` para
no 1:25.000 e **rejeita** `SG-22-Z-B-IV-4-NE-F-I-2-D`. Estas camadas são a continuação local da mesma
escada, descendo a um quadrado de **~547 m de lado** — resolução melhor que qualquer coisa que a
bancada entrega hoje. Assinatura impecável, zero risco de ruído. Junto vão os três buracos já
medidos do `carta-ibge`: o nível ao milionésimo (prometido na ficha, recusado pelo parser), o
separador que não seja hífen, e o **número MI** (`MI 2868-1`), que a própria ficha anuncia sem ter
parser.

### 3.4 A escada do IQ · **P**

Hoje o IQ só resolve em cinco segmentos. Com 1.533 linhas a mais (1.184 quadras + 349 patrimônios)
ele passa a resolver em três resoluções: **quadra** (`4-5-16-1`, quatro segmentos — hoje falha em
silêncio) → **lote** → **unidade**. O patrimônio traz `ANO_LANCAM` vivo, com 42 casas anteriores a
1900. **Sem o campo `PESSOA`** — ver a ressalva abaixo.

### Ressalva de publicação, e ela é dura

A camada de patrimônio histórico traz nome de pessoa. **Dado pessoal não vira dataset embarcado**,
ainda que esteja aberto no servidor: uma coisa é a Prefeitura publicar num visualizador, outra é a
gente empacotar e distribuir. Colher só `IQ`, `ANO_LANCAM` e o tipo de tombamento.

### O que o geoportal NÃO tem, e encerra uma linha

**Nenhuma camada de água, hidrômetro ou ligação** — só drenagem pluvial e hidrografia natural. A
consulta do SAMAE tem reCAPTCHA em toda busca, uma matrícula por vez, sem listagem. Pela regra
escrita neste repositório, base com captcha não entra em nenhuma hipótese, e o "mesmo esquema do
Cidade Iluminada" não se aplica: aquele endpoint não tinha captcha. **O caminho é o e-SIC**, como foi
com os postes. Achado colateral que vale um aviso a quem usar: a consulta roda em HTTP puro, sem
TLS, sobre JBoss de 2008 — matrícula digitada ali trafega em claro.

---

## Onda 4 — o buraco que as duas varreduras acharam pelo mesmo caminho

A varredura do dCode e a fase F15 do plano antigo chegaram, por lados opostos, à mesma conclusão:
**o buraco não é cifra, é criptanálise.**

A bancada tem 26 cifras clássicas e **nenhuma ferramenta para descobrir qual delas é**. Sem Índice
de Coincidência, sem Kasiski, sem análise de frequência, sem solver de substituição monoalfabética.
E `ciphers.ts:57`: o Vigenère devolve `null` sem chave — ou seja, só serve para quem já sabe a
chave.

Leva 1 (**M**): IC, Kasiski e frequência. Não somam a 113ª entrada no leque — **destravam as 26 que
já existem**.
Leva 2 (**M**): as clássicas baratas, que reusam o Polybius e o Morse já implementados — Trifid,
Four-square, Two-square, Nihilist, Scytale, Caesar box, Pollux, Morbit.
Leva 3 (**G**): ADFGX/ADFGVX, Hill, Book cipher; e Brainfuck, fora da cripto.

---

## Onda 5 — cobertura, que hoje é zero onde mais importa

**Não existe um único teste de ponta a ponta.** Nenhum `*.spec.ts`, nenhum `playwright.config`, nada
no `package.json`. Num produto que é **só navegador**, a cobertura lógica é forte (1.313 testes) e o
caminho do usuário não é verificado por máquina nenhuma. Testes de componente: **um**, e nenhuma das
quatro peças de risco (trilha de cadeia, selo de palavra real, faixa de chips, aba Diferenças) tem
teste.

---

## Ordem, em uma linha

~~1.1 → 1.4 → 1.5 → 1.2/1.3 → 2.3 → 2.1/2.2 → 3.1 → 3.3 → 4 (leva 1) → 5.~~

**Executado em 18–19/08, menos a onda 2 (fora por decisão do dono).** O que
resta está listado em "Ainda em aberto", logo abaixo.

O critério: primeiro o que faz o produto **responder errado**, depois o que faz ele **mentir sobre
si mesmo**, depois o que **não se recupera** (senha e backup), e só então o que acrescenta
capacidade. Somar decoder a uma bancada que erra com nota alta é construir sobre chão que cede.


---

## Ainda em aberto — conferido em 19/08, fim do dia

| item | estado | quem decide |
|---|---|---|
| **Onda 5 — nenhum teste de ponta a ponta** | aberto. Zero `*.spec.ts`, zero `playwright.config`, num produto que é **só navegador**. Testes de componente: dois (`matrix-panel`, `use-rota`). | eu, quando mandar |
| **`pnpm build:data` quebra numa clonagem limpa** | aberto e CONFERIDO agora: `build:ceps` morre em `data-sources/ceps-sc.csv`, que é gitignored e ausente. Como ele fica no MEIO da cadeia, nada depois dele roda. | **o dono**: tirar `build:ceps` da cadeia, ou repor o CSV |
| **Onda 2 — senha do Postgres, backup, PAT sem rotação** | **fora por decisão do dono**, registrado. O Postgres de produção segue em `trust` com hash de senha na tabela, e não há backup automatizado. Não é esquecimento: é escolha, e fica escrita. | o dono |
| **F18 — compartilhar a ENTRADA por URL** | fora por decisão do dono ("não precisamos compartilhar resultados"). A navegação e o atalho de cifra saíram; o conteúdo da prova não vai para a barra de endereço. | o dono |
| **F3 — 41 resoluções de 2024/2025 fora do índice do acervo** | aberto. É a única fase que produz EVIDÊNCIA nova, e é onde deve estar o gabarito das madrugadas que provariam o resto. | eu |
| **F7 homóglifos · F8 marco quilométrico · F11 língua do P · F14 CNEFE · F16 NAC/S2 · F17 Morbit/Pollux/ADFGVX** | abertos, por ordem de retorno. | eu |
