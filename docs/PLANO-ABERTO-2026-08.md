# O que está em aberto — 18/08/2026

> Levantamento medido, não lembrado. Cada linha abaixo tem `arquivo:linha` ou a saída de um comando
> por trás. O que a documentação afirmava e o código desmentiu está marcado **(doc mentia)**.
>
> Portões, medidos hoje: front **1.300 testes / 111 arquivos verdes**, `tsc` limpo, `biome` limpo,
> `vite build` ✓; API **105/105 verdes**. As duas árvores estão pushable agora.

---

## 0. O item de maior razão custo/benefício da lista inteira

**Três commits prontos, verdes e não pushados.** Front `4ae0e59` + `55e330b`, API `d8509f9`.

Entregam, de uma vez: Placekey, C-squares, Geo URI, ISO 6709, link curto do OSM, CAR, as 491
estações geodésicas do Vale, a grafia colada da inscrição de Blumenau (`41241628`) e a correção
das camadas de confiança do `detectLocation`.

**Custo: um `git push` em cada repo. Zero migração, zero passo manual de banco.** Conferido nas três
pontas: `db/schema.sql` foi tocado por último no `2bbd4de`, que já está em `origin/main` e já foi
deployado; o commit da API não mexe em SQL nenhum; e o Postgres local tem as mesmas 11 tabelas e
`seed_state` com 9 linhas `complete`.

**Ordem: API primeiro — por preferência, não por obrigação.** A mudança é puramente aditiva.
Front sozinho: `ctx.hits.lotes ?? []` devolve vazio, nada quebra. API sozinha: a grafia colada passa
a funcionar em 97,7% dos números, porque os de leitura única caem no campo `Lote` que o front em
produção já lê; só os 2,3% ambíguos ficam sem card.

---

## 1. O que responde ERRADO hoje — defeitos, não faltas

Esta seção vem antes de tudo porque resposta errada com nota alta é o pior estado possível de uma
bancada: ela encerra a linha de investigação de quem confia nela.

### 1.1 A aba Geolocalização manda 2.900 km para o lado — e com a nota máxima

Medido agora, chamando `detectLocation` direto:

| entrada | a aba responde | verdade | nota |
|---|---|---|---|
| `38HQ+J3` | Plus Code **−58,3987 / −44,9488** (Atlântico Sul) | Blumenau | **0,90** |
| `g7rpj` | Geohash **64,5337 / −23,6646** (Islândia) | Blumenau | 0,50 |

O `38HQ+J3` é o caso gabaritado da ITC 2017 Extra. A causa é `formats.ts:530`: o array `local` da
cascata só tem GeoHex, MGRS/USNG e GEOREF. As funções `decodePlusCodeLocal` (`:336`) e
`decodeGeohashLocal` (`:359`) **existem** e são consumidas apenas pelo decoder `local-geocode.ts`.

**Correção importante do que eu mesmo escrevi hoje.** O commit `4ae0e59` diz que as camadas de
confiança acabaram com as respostas erradas de nota alta. Isso vale para o **Decodificador** — lá
`g7rpj` já sai em Blumenau, porque subi o atalho local para 0,62. **Não vale para a aba**: as duas
telas do mesmo produto respondem coisas diferentes para a mesma entrada, e o Plus Code curto segue
errado nas duas pontas. É o item nº 1 depois do push.

Falta também o teste de regressão: `grep -rn 38HQ src/` → 0 resultados.

### 1.2 `A1Z26` desliga inteiro acima de 26

Provado rodando o motor:

```
"8 5 12 12 15"     → 5 cards da família A1Z26  (hello + 4 leituras da roda)
"27 5 12 1"        → 0 cards
"34 31 38 38 41"   → 0 cards
```

`ciphers.ts:81` exige token de 1–2 dígitos e `:83` corta tudo fora de 1–26; `cipher-disk.ts:132`
exige que a lista inteira caiba numa janela de 26 casas. Os três decoders da família recusam, sem
nenhuma redução modular. Uma contagem que dobra o alfabeto não produz **nada**.

### 1.3 Falso negativo silencioso no zero-width

`zero-width.ts:7` conhece 7 code points. Bloco Tags (U+E0000–E007F), seletores de variação
(U+FE00–FE0F, U+E0100–E01EF) e Bidi (U+202A–202E, U+2066–2069) passam batido — e a bancada
responde "não há nada escondido", que é a resposta mais cara que ela sabe dar.

### 1.4 Carta topográfica: promete um nível que recusa

`carta-ibge.ts:35` lê de 1:500.000 a 1:25.000. A ficha da aba e a Ajuda anunciam o nível ao
milionésimo — `SG-22` sozinho volta "não reconheci". E `:70` só aceita hífen: `SG.22.Z.B`, que é
como sai de OCR de legenda de carta, cai fora.

---

## 2. Operação e segurança

| item | estado | prova |
|---|---|---|
| **Postgres em `trust`** | aberto | `docker-compose.prod.yml:21-22`. Qualquer contêiner na `decrypter-internal` lê `app_user` — com os hashes — sem credencial. A justificativa antiga ("dado público") caiu no dia em que a tabela passou a guardar senha. Não é só definir a variável: o `pg_hba.conf` vive no volume já inicializado, então é `ALTER USER` → `sed` → `pg_reload_conf`, **e a ordem importa** (banco primeiro, Dokploy depois; ao contrário a API cai no próximo deploy). |
| **Backup: nenhum** | aberto | `grep -rn "pg_dump\|crontab\|backup"` no repo inteiro → 4 linhas, todas dentro do `DEPLOY.md`. Um `down -v` leva junto as contas e as aprovações; o dataset volta pelo seed, as contas não. |
| **`GH_PAT_THE_DECRYPTER`** | risco não registrado | `deploy.yml` da API faz checkout do repo do front com esse PAT. É **ponto único de falha de todo deploy da API** e não tem nota de validade nem de rotação em documento nenhum. |
| **`AUDD_TOKEN`** | nasce desligado | Aparece só em `docker-compose.prod.yml:87`. `grep -c AUDD_TOKEN DEPLOY.md` → 0. Quem seguir o runbook à risca nunca liga o reconhecimento de música. |
| **Stack do Traccar** | fora do runbook | `grep -ci traccar DEPLOY.md README.md` → 0, 0. Segunda stack em produção, porta 5055 publicada no host, volume H2 sem backup — o runbook inteiro mora em comentário de compose. |
| **Chave órfã do what3words** | resíduo | `VITE_W3W_API_KEY` no `.env.local`; `grep -rn VITE_W src/` → 0. Não vaza, mas induz a erro quem configurar o ambiente. |

### O footgun do `sync-data`

`Makefile:23` procura o dataset em `seed-data/` **primeiro** e cai para `public/data/` como
alternativa. Três dos passos do `build:data` escrevem em `public/data/`. Ou seja: **quem regenerar
um dataset com sucesso escreve no diretório perdedor, e o deploy embarca o antigo em silêncio.**
Não é desarrumação de script — é um jeito de publicar dado velho achando que publicou o novo.

E `pnpm build:data` morre no segundo passo numa clonagem limpa: `build-ceps.ts:19` faz
`readFileSync` de `data-sources/ceps-sc.csv`, que é gitignored e não existe.

---

## 3. A verdade das telas

O produto conta três histórias diferentes sobre si mesmo.

- **Roadmap in-app** (`roadmap-content.ts`) — a vitrine que o usuário lê. `:117` promete
  "Bases grandes por consulta (CNAE, FIPE, TSE)" como *a fazer*, e os três decoders existem. `:123`
  diz que falta a aba Arquivo inteira; existem `arquivo/{imagem,documento,video,youtube}`. `:50`
  pede "SAMAE nos 5 dígitos" e `digit-table.ts:20` já traz `CRM · matrícula do SAMAE`. **(doc mentia)**
  Sobra de verdade: microfone e o miolo de documento (PDF/SVG/OOXML).
- **`sources.ts:312`** ainda diz que o Decodificador aceita "as três grafias" da inscrição. Hoje são
  quatro. Foi meu commit de hoje que criou essa divergência.
- **Ajuda**: um decoder sem verbete — `binary-number` ("Binário → número"). O que existe é
  "Binário / Octal / Decimal (ASCII)", que é o *outro* decoder: `100101010` tem duas leituras
  (`dec 298 · hex 12A` e o texto ASCII) e a Ajuda documenta uma.
- **Cola**: `reference-panel.tsx:27` tem uma lista de 10 formatos de coordenada escrita à mão,
  enquanto `geo/formatos.ts` se declara fonte única e tem mais de 20. Quem abre a Cola sob pressão
  não vê MGRS, GEOREF, GARS, carta, grade do IBGE, Mapcode, Placekey, C-squares…
- **`DEPLOY.md` §7** ("ligar o front — passo futuro") já foi feito.

---

## 4. Sem teste de ponta a ponta

Zero. Nenhum `*.spec.ts`, nenhum `playwright.config`, nada no `package.json`. Num produto que é
**só navegador**, a cobertura lógica é forte (1.300 testes) e o caminho do usuário não é verificado
por máquina nenhuma. Testes de componente: **um**, `matrix-panel.test.tsx` — e nenhuma das quatro
peças de risco (trilha de cadeia, selo de palavra real, faixa de chips, aba Diferenças) tem teste.

---

## 5. As fases do `PLANO-2026-08` que seguem abertas

Deduplicado e reclassificado. **Atenção ao viés:** o levantamento marcou F9, F10, F13 e F16 como
"parcial" porque os arquivos existem na árvore local — mas eles estão nos dois commits não pushados.
**Em produção essas quatro são "não iniciado".**

| fase | o que falta | esforço |
|---|---|---|
| **F2** | Plus Code curto e cauda de Geohash na cascata da aba (§1.1) | P |
| **F4** | Zero-width estendido (§1.3) | P |
| **F3** | 41 resoluções de 2024/2025 fora do índice do acervo — e é onde estão os códigos gabaritados das madrugadas que provariam o F2 | M |
| **F7** | Homóglifos/confusáveis. A saída vira entrada do `letter-index`, a 2ª mecânica mais usada do acervo | M |
| **F8** | Marco quilométrico de rodovia. O plano o chama de melhor candidato novo; é a forma exata da GIA-25, e a BR-470 corta Blumenau inteira | M |
| **F11** | Língua do P, Cronograma, Punycode, quoted-printable, uuencode. A língua do P é a única vantagem competitiva pura: dCode, cryptii, CacheSleuth e GC Wizard não têm | M |
| **F13** | Inscrição de **Itajaí** (BCI `201.020.03.0051`) — larguras fixas 3-3-2-4, assinatura mais forte que a de Blumenau | M |
| **F16** | NAC, Geohash-36, S2 | M |
| **F17** | Morbit, Pollux e o chip de ADFGVX no sniffer | M |
| **F15** | Cadeia automática + classificação (IC/Kasiski) | G |
| **F14** | CNEFE offline: 175.212 endereços de Blumenau com coordenada de **porta**, num ZIP de 3,7 MB | G |
| **F18** | Cauda barata, 10 itens — o que mais pesa é **compartilhar por URL**: chave, 2º campo, título e cadeia se perdem ao recarregar | M |

### Onde o F15 encontra a varredura do dCode

A varredura do dCode (18/08) chegou pelo outro lado à mesma conclusão do F15: **o buraco não é
cifra, é criptanálise.** A bancada tem 26 cifras clássicas e nenhuma ferramenta para descobrir qual
delas é — sem Índice de Coincidência, sem Kasiski, sem análise de frequência e sem solver de
substituição monoalfabética. E `ciphers.ts:57`: o Vigenère devolve `null` sem chave, ou seja, só
serve para quem já sabe a chave.

Clássicas ausentes, por ordem de custo: **Trifid, Four-square, Two-square, Nihilist, Scytale,
Caesar box, Pollux/Morbit** (baratas — reusam o Polybius e o Morse que já existem), depois
**ADFGX/ADFGVX, Hill, Book cipher**, e **Brainfuck** fora da cripto.

---

## 6. Os leads novos (conversa de 18/08)

### 6.1 A1Z26 cíclico — **lacuna real, e é a mais barata da lista** (P)

Ver §1.2. Redução modular com origem parametrizada, reusando a máquina do `cipher-disk`.

### 6.2 Folha carta — **já existe, com três buracos** (P)

`carta-ibge.ts` lê a nomenclatura CIM de 1:500.000 a 1:25.000. Falta: o nível ao milionésimo
(prometido e recusado), separador que não seja hífen, e o **número MI** (`MI 2868-1`) — que é como o
acervo do IBGE e o material impresso identificam a folha, e que a própria ficha da aba anuncia
("articulação MI") sem ter parser.

### 6.3 INCRA / CCIR / NIRF / CIB — **entra como validador, nunca como localizador** (M)

Três assinaturas, com os DV fechados e verificados:

- **CCIR/SNCR**: `999.999.999.999-9`, 13 dígitos, módulo 11 com pesos 2..7 cíclicos da direita.
  Validado contra **6.652 códigos reais de 13 UFs: 6.650 conferem (99,97%)**.
- **NIRF** (ITR até 08/2021): 8 dígitos, módulo 11, pesos 8..2 da esquerda.
- **CIB** (substituiu o NIRF): 8 caracteres alfanuméricos, base 32 de Crockford sem I/L/O/U, DV por
  mod 31. **É o melhor candidato a enigma dos três** — curto o bastante para caber num papel de prova.

**Ressalvas duras:** o código de 13 dígitos **não codifica UF nem município** (o prefixo `95`
aparece nas 13 UFs amostradas) — é identificador opaco, não geocódigo. Toda consulta oficial está
atrás de **hCaptcha** (`sncr.serpro.gov.br`) ou de **login gov.br nível prata/ouro** (SIGEF): pela
regra da casa, não entra. O DV de um dígito vale ~1,5 bit — 10,07% de qualquer sequência de 13
dígitos passa, então ele **não serve de detector isolado**: exigir a máscara pontuada.
Zeros à esquerda são suprimidos nas fontes reais (aparecem códigos de 9, 11 e 12 dígitos):
`zfill(13)` **antes** de validar, senão 66 códigos reais falham indevidamente.

Se um dia isso virar localizador, o único caminho limpo é congelar uma tabela offline a partir do
espelho aberto `services5.arcgis.com/.../sigef_brasil` — sem captcha, sem chave, CORS `*` — do mesmo
jeito que CEP e CID-10 fizeram.

### 6.4 LEGO — **faça a cor, não a peça** (P para a cor)

- **Cor**: CSV aberto do Rebrickable, **3,2 KB gzip**, sem chave e sem captcha, licença que só exige
  crédito. Entra na mesma família de resistor e Faber-Castell. Custo quase zero.
- **Element ID** (7 dígitos): só como consulta de nota baixa (~0,3) — **colide de frente com o CNAE**,
  que já reivindica `/^\d{7}$/` em `cnae.ts:54` e se dá 0,3 quando pelado. Não pode entrar acima dele.
- **Design ID** (4–5 dígitos): **não entra**. 27,3% de qualquer número de 4 ou 5 dígitos é molde
  válido — um em cada quatro. É ruído puro, exatamente o que a regra da casa existe para barrar.
- O gate "bonito" de decompor 6 dígitos em molde(4) + cor(2) dá **15,2% de falso positivo**. Não fazer.

### 6.5 SAMAE — **fechado, e o caminho é o pedido oficial**

A consulta pública roda em `45.7.130.209:8081/gsan/...` (o subdomínio `samae.blumenau.sc.gov.br`
**não existe** — NXDOMAIN; o site é `samae.com.br`) e tem **reCAPTCHA em toda busca**, uma matrícula
por vez, sem listagem, sem faixa e sem paginação. A matrícula é numérica de até 9 dígitos, ID
sequencial do GSAN, sem DV exposto.

O geoportal de Blumenau, que resolveu lotes e postes, **não publica camada de água, hidrômetro ou
ligação** — só drenagem pluvial e hidrografia natural.

**Conclusão: não há rota aberta.** Pela regra escrita neste repositório, base com captcha ou login
de terceiro não entra em nenhuma hipótese, e o "mesmo esquema do Cidade Iluminada" não se aplica —
aquele endpoint não tinha captcha, este tem. O único caminho é o pedido formal pelo e-SIC
(Lei 12.527/2011 + LC municipal 1.074/2016), pedindo dado agregado e não identificável. É o mesmo
caminho que a base de postes percorreu.

*Achado colateral que vale um aviso:* a consulta é **HTTP puro, sem TLS**, sobre JBoss 4.2.3.GA de
2008. Qualquer matrícula digitada ali trafega em claro.

### 6.6 Uma decisão tomada e registrada: a inscrição **não** entra na tabela de dígitos

`digit-table.ts` responde "o que este número pode ser". Seria tentador somar "inscrição imobiliária"
em 8 dígitos, já que agora é verdade. **Não deve entrar**: a bancada tem os 84.539 lotes, então ela
não precisa chutar — se o número fosse um lote, o card apareceria. O palpite ali só apareceria
justamente quando a bancada já sabe que **não** é. CEP é diferente e por isso fica: a base só tem SC.

---

## 7. Ordem sugerida

1. **Push dos 3 commits.** Maior razão da lista, e destrava as fases F9/F10/F13/F16 em produção.
2. **§1.1 — o Plus Code curto na cascata da aba** + teste de regressão com `38HQ+J3`. É o único
   defeito conhecido em que o produto responde errado com a nota máxima.
3. **Verdade das telas** (§3) — uma varredura de meia hora que faz o produto parar de mentir sobre
   si mesmo em quatro lugares.
4. **A1Z26 cíclico** (§6.1) e **zero-width estendido** (§1.3) — dois P que fecham falso negativo.
5. **Senha do Postgres + backup** (§2). Segurança de conta e o único item aqui que não se recupera.
6. **Criptanálise (F15, leva 1): IC, Kasiski, frequência.** Destrava as 26 cifras que já existem em
   vez de somar a 27ª.
7. Daí em diante, pelo acervo: F3 primeiro (é o que produz evidência nova para priorizar o resto).
