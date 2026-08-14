# Plano — cifras do acervo na bancada

> Documento de trabalho. Substitui a priorização de [`TODO-CIFRAS.md`](TODO-CIFRAS.md) (escrito em 2026-07-29, commit `ca32b11`), que mediu a bancada contra um snapshot antigo e só contra o motor de decoders.
>
> **Procedência.** Destilado de uma análise multi-agente (6 leitores do código + 5 projetistas + 4 verificações adversariais) cruzando o repositório com o acervo em `the-logic-lab/scripts/import-historico/acervo/`. Números conferidos contra o código em 2026-08-14.
>
> **Verificado de forma independente** (execução direta, não relato de agente): contagem de decoders em runtime (`74`, `12` com `encode`) e existência dos 17 ids da tabela "Já cobertos"; `wc -l` das wordlists; ausência de coordenada em `municipios.json`; `score.ts` sem consumo de wordlist; ausência de `data-sources/ceps-sc.csv`; pesos bruto/gzip de `public/data/`.
>
> **Uma ressalva de proveniência:** o esquema do GeoTude (§5, item #7a) veio de engenharia reversa sobre 17 amostras conferidas contra a API pública do serviço — não de especificação publicada. Os fixtures são o contrato; se o serviço mudar, o teste quebra antes do usuário.

---

## 0. Estado — o plano foi executado

**As ondas 0 a 5 estão fechadas, e uma onda 6 fora do acervo entrou por cima** (§4). Medido no
repositório em 2026-08-14, não relatado:

| | Quando o plano foi escrito | Fim da onda 5 | Agora (fim da onda 6) |
|---|---|---|---|
| Decoders em runtime | 74 (12 com `encode`) | 89 (13 com `encode`) | **96** (**15** com `encode`) |
| Abas | 6 | 7 (entrou Diferenças) | **7** |
| Suíte | 33 arquivos, 194 testes | 59 arquivos, 548 testes | **70 arquivos, 767 testes** verdes |
| Sistemas em `detectLocation` | 10 | 11 (+GeoTude; o Mapcode é assíncrono e fica fora) | **16** |
| `import()` dinâmico | zero | 1 | 1 (`mapcode-ts`, isolado em `location/mapcode.ts`) |

Os 15 decoders das ondas 0–5: `acrostic-nth`, `cipher-disk`, `color-convert`, `count-key`,
`date-key`, `ddd-cidade`, `digit-regroup`, `faber-castell`, `grid-read`, `letter-index`,
`letter-values`, `math-helper`, `resistor`, `vowel-cipher`, `whitespace-stego`. Fora do motor:
`location` passou a reconhecer GeoTude e Mapcode, `periodic-table` ganhou o 4º modo (subscritos de
fórmula → dígitos), e a bancada ganhou barra de Cadeia, 2º campo, campo de título, faixa de chips do
sniffer e selo de palavra real.

Os **7 da onda 6** — `boleto`, `chave-nfe`, `correios`, `numero-extenso`, `placa-veiculo`,
`rot8000`, `titulo-eleitor` — mais **5 geocódigos** no `detectLocation` (MGRS/USNG, carta IBGE/DSG,
GEOREF, GARS, grade estatística IBGE) **não vieram do acervo**: são varredura da web. O porquê está
em §4, "Onda 6".

**As seções §1, §2 e §3 são o retrato de antes** — ficam como estão, porque são a auditoria que
justificou a ordem, não a descrição do produto de hoje. O que a execução contrariou está em
**[§8 Divergências encontradas na implementação](#8-divergências-encontradas-na-implementação)**;
as §4 e §5 carregam o status item a item.

---

## 1. Onde a bancada estava (retrato de antes das ondas)

**Motor.** `runDecoders(input, ctx, list?)` é um fan-out síncrono e puro: percorre todos os decoders, chama `decode(input, ctx)` dentro de try/catch (exceção = decoder some sem log, `run.ts:24-30`), pontua com `forcedScore ?? scorePlaintext(output)` (`run.ts:33`), ordena por score desc com desempate pela saída mais curta (`run.ts:38`), **deduplica globalmente por string de `output` exata** (`run.ts:40-47`) e devolve `{results, hitCount}`. `partition(results, 0.35)` separa "prováveis" de "pouco prováveis" (`run.ts:53-57`), e a gaveta dos improváveis vem fechada (`decoder-workbench.tsx:152-173`).

**Tamanho real: 74 decoders, não "~55".** Contei em runtime importando o registry: `TOTAL 74 · ENCODE 12`. A composição é 12 codecs (`codecs.ts`, via helper `single()`) + 11 ciphers (`ciphers.ts`) + 7 lookups (`lookups.ts`) + 44 objetos em 43 arquivos de `engine/decoders/` (`rot5-18.ts` exporta dois). Registro por `import.meta.glob(["./decoders/*.ts","!./decoders/*.test.ts"], {eager:true})` com validação por duck-typing (`registry.ts:21-30`) — decoder novo entra com zero fiação, mas o glob é **raso** (subpasta não é varrida) e tudo é eager.

**Score.** `scorePlaintext` = `gate × lenConf × tidiness × (0.5·bigramas + 0.3·frequência pt/en + 0.2·stopwords) − penalidade de consoantes` (`score.ts:294-296`). `lenConf = 0.4 + letras/12` (`score.ts:291`) pune saída curta; texto só de dígitos leva `gate×0.1`. As stopwords são uma lista fixa de ~110 termos embutida no código (`score.ts:72`) — **o scorer nunca viu as wordlists do repositório**.

**A bancada tem SEIS abas, não uma** (`App.tsx:14-23`, render em `:69-74`): Decodificador, Texto, Posições, Anagramas, Cola, Frota. Três delas já implementam mecânicas que o TODO lista como "a implementar":

| Aba | O que já entrega | Cobre do TODO |
|---|---|---|
| **Texto** | 11 extrações: 1ª/última letra de linha e de palavra, maiúsculas, letra após pontuação, leitura em coluna, diagonal, espelhado, palavras espelhadas, palavras repetidas (`text-extract/extract.ts:124-138`) | ~70% do item 3 |
| **Posições** | passo fixo (`positions/extract.ts:41-48`), lista "3 7 12" na ordem pedida (`:51-75`), toggle "apenas letras" ligado por padrão, destaque no texto | ~60% do item 1 |
| **Anagramas** | chave canônica, índice invertido, seletor pt/en/ambos, debounce 200 ms, testes verdes | **item 4 inteiro** |

**Datasets.** `public/data/` tem 6 arquivos, 9.786.305 B brutos / 2.768.966 B gz (medidos): `ceps.json` (3,08 MB bruto / 784 KB gz, 40.445 linhas com lat/lng, só SC), **`words-pt.txt` (259.220 palavras, 2,77 MB bruto / 868 KB gz) e `words-en.txt` (204.216, 2,13 MB / 634 KB gz)**, `streets.json` (4.426 ruas, 3.178 geocodificadas), `airports.json`, `municipios.json` (5.571 linhas na forma `["1100015","Alta Floresta D'Oeste","RO"]` — **sem coordenada**). Tabelas pequenas ficam in-bundle em `src/features/reference/` (gs1-prefixes 4,4 KB, phone-codes 7,5 KB, colors 1,3 KB).

**Rede.** Existe backend proxy: `src/lib/api.ts:1-11` roteia BrasilAPI, Open Food Facts, Nominatim, what3words e a lista PIX por `VITE_API_BASE_URL → /api`, com cache Redis, rate-limit e chaves no servidor. Nenhum `decode()` faz rede; os fetches vivem nos cards (`map-card.tsx`, `barcode-card.tsx`) e no hook.

**Bundle.** Um único chunk (`dist/assets/index-*.js` = 725.812 B / 223.920 B gz), zero `import()` dinâmico, zero `manualChunks`.

**Suíte.** 33 arquivos, 194 testes verdes. Zero testes de componente (`*.test.tsx` não existe) — verificação de UI é manual, obrigatoriamente a ~375px e em desktop.

---

## 2. Correções ao TODO-CIFRAS

Severidade: **bloqueante** = invalida o item inteiro · **alta** = muda escopo/prioridade · **média** = muda a nota de implementação · **baixa** = imprecisão de catálogo.

| O que o TODO diz | Realidade | Evidência | Sev. |
|---|---|---|---|
| Item 4 `anagram`, ALTA, "precisa de dataset local… sem lista vira força-bruta inútil" (`TODO:91-101`) | **Já está em produção** desde 2026-06-20 (commit `2a8d6be`), 39 dias antes do TODO: aba Anagramas, solver, seletor pt/en, teste verde | `App.tsx:20,72`; `anagram/solve.ts:14-38`; `anagram/use-anagram.ts:19-49`; `anagram/solve.test.ts` | **bloq.** |
| "A wordlist pt-BR é o dataset mais valioso que ainda falta" (`TODO:248-249`) | Está versionada há 5 semanas antes dessa frase: `words-pt.txt` 259.220 palavras / 2,77 MB e `words-en.txt` 204.216, geradas por `scripts/build-words.ts` (`pnpm build:words`, dentro de `build:data`) | `wc -l public/data/words-*.txt`; `src/lib/data.ts:112-123` | **bloq.** |
| Melhoria 4: "Com a wordlist pt-BR, a bancada pode dar boost de score" (`TODO:277-281`) | O condicional já está satisfeito. O bloqueio é **estrutural**: `scorePlaintext(text)` é pura sem contexto, chamada em `run.ts:33` **e em `define.ts:81` (dentro do `bruteDecoder`, sem ctx)**, e `lib/data.ts` não expõe `getWords()` síncrono — é o único dos 6 datasets sem par load/get | `score.ts:294`; `define.ts:81`; `data.ts:112-123` vs. `:17-31` | alta |
| Item 1 `letter-index`: "hoje só dá pra fazer contando no dedo" + "exige o 2º campo" (`TODO:60-70`) | A aba Posições já faz 1 texto × N posições, com "apenas letras" por padrão. E a forma está errada: em **13 das 15 provas A4** o padrão é *N fontes × 1 índice cada* (zip de listas paralelas), que é justamente o que ninguém tem. Falta zip, índice reverso e A{n}L{m} | `positions/extract.ts:41-75`; `acervo/RESOLUCOES.md:993,1047` | alta |
| Item 3: "o `acrostic` só lê a 1ª letra" (`TODO:81-89`) | Verdade sobre o decoder (`decoders/acrostic.ts:11-31`), falso sobre a bancada: a aba Texto já entrega última letra de linha e de palavra, maiúsculas, coluna, diagonal, espelhamentos. Sobra a k-ésima letra (início/fim) e a alternância | `text-extract/extract.ts:124-138` | alta |
| Item 2 `count-key`, ALTA: "a mecânica mais recorrente da GIA (04, 18, 23, 24, 25, 26, 39, Romanos)" (`TODO:72-79`) | **A5 aparece em 4 das 41 fichas** (04, 18, 24, 25). Romanos(29), Desenhar e Colorir(39), CRJA(34), No Detalhe(37) e Esquentou(23) são etiquetadas **A4** nas fichas. A frase veio de `DICIONARIO-CIFRAS.md:88`, que contradiz o próprio acervo. Das 4 provas A5, só GIA-04 é automatizável do material | `acervo/GIA-2026.md:175,211,241,259,265` vs `DICIONARIO-CIFRAS.md:88` | alta |
| Item 5 `vowel-cipher`: "texto + 5 deslocamentos → **texto decifrado**" (`TODO:103-111`) | A resposta da prova é a concatenação das **imagens das vogais**: A+11=L, E−4=A, I+7=P, O−6=I, U−2=S → **LAPIS**. O texto de vogal única é veículo didático; um decoder que só substitua vogais devolve parágrafo ilegível e não resolve a prova | `acervo/gia-2026/gia-22-lingii-di-i/texto/enunciado.md` | alta |
| Item 12 `whitespace-stego`: "sobrevive em texto plano (some em PDF)" (`TODO:170-178`) | **Invertido.** O sinal é posicional dentro da **linha renderizada** — morre em qualquer reflow e sobreviveria em layout fixo. O `.docx` original tem 7 parágrafos (perfil 0,3,1,1,3,0,0) e 4 células Braille exigiriam 12 linhas: **o mapeamento é irrecuperável do acervo** | `acervo/gia-2026/gia-41-os-olhos-enganam/original/*.docx` | alta |
| Item 7: "GeoTude é site proprietário — provável necessidade de web… degradar para reconhecer + linkar" (`TODO:125-134`) | **Falso.** O esquema é grade decimal aninhada, aritmética pura de ~15 linhas: `A=⌊N/500⌋, B=N mod 500; lat0=110−A, lng0=B−180`, cada par soma dígito decimal (lat ao sul, lng a leste). Validado 17/17 contra a API pública deles, incluindo `68130.89.91.15.12 → −26.8911, −49.0848` (FURB Campus 2) | verificação adversarial; `gia-27-engenheiro-foragido/texto/enunciado.md:19` | alta |
| Item 7: "Mapcode tem lib pública (offline viável, **como o Plus Code**)" | Offline viável, mas **não como o Plus Code**: `mapcode-ts@1.0.1` (Apache-2.0, zero deps) pesa **313 KB gz** — mais que o bundle inteiro (224 KB gz) — e 438 KB do fonte estão numa linha só (sem tree-shaking). Pior: `decode("2JF.5R")` **lança**; o código é válido em **467 dos 543 territórios**. Só fecha com `Territory.BR_SC` → −26.913966, −49.069159 (Prefeitura de Blumenau) | verificação adversarial (tarball baixado e executado) | alta |
| Item 18: "dataset de municípios+centroides (**temos IBGE**)" (`TODO:210-215`) | `municipios.json` é `[código, nome, UF]` nas 5.571 linhas — sem coordenada. `build-municipios.ts` usa `/localidades/municipios`, que não devolve lat/lng | `head public/data/municipios.json`; `ibge/types.ts:2` | alta |
| Item 18: "o `ddd` já faz cidade→DDD" | Falso. `lookupDDD` só aceita tokens de 2 dígitos e devolve `UF · área`; `cities` é texto livre não indexado. Teresópolis não está na tabela, e vizinho-mais-próximo entre cidades-cabeça responde **24 (Petrópolis)** em vez de 21 | `reference/phone-codes.ts:138-149`; `decoders/ddd.ts:14` | alta |
| Escopo geral: o TODO trata "a bancada" como sendo o motor | O produto tem 6 abas e 3 delas cobrem itens 1, 3 e 4 fora do motor. A auditoria "o decoder existe?" dá falso-negativo em 3 dos 5 itens ALTA | `App.tsx:14-23,69-74` | alta |
| "Contagem: Alta = 5 · Média = 8 · Baixa = 6" (`TODO:291-316`) | Dos 5 ALTA: 1 entregue (4), 2 parciais (1, 2), 1 meio-entregue (3). Só o 5 está intocado. A priorização inteira precisa ser refeita | confronto com `src/features/{anagram,positions,text-extract}/` | alta |
| Nenhum dos 19 itens cobre "descartar pontuação → concatenar dígitos → repartir em blocos de N" | É o mecanismo **integral** de GIA-01 *Ask Me* (a prova de abertura): ignorar as vírgulas → 4 octetos → TOPO. O decoder `binary` exige octetos já separados, então a prova não engata. Custo trivial, ataca a barreira histórica nº 1 | `acervo/GIA-2026.md:41`; `codecs.ts` (`binary`) | alta |
| Melhoria 2: "a bancada só tem o campo de chave do Vigenère" (`TODO:268-271`) | `ctx.key` alimenta **nove** decoders: vigenere, autokey, beaufort, gronsfeld, porta, playfair, bifid, columnar, xor-key. O que está desatualizado é o **placeholder** | `ciphers.ts:56`; `decoders/{autokey,beaufort,gronsfeld,porta,playfair,bifid,columnar,xor-key}.ts`; `decoder-workbench.tsx:53` | média |
| Item 15: "hoje o `periodic-table` **soma massas**" (`TODO:195-199`) | Nunca somou. Tem 3 modos: nº atômico→símbolo, símbolo→nº atômico e (token numérico único) peso→elemento por proximidade. O parser de fórmula é enxerto, não substituição | `decoders/periodic-table.ts:86-146` | média |
| Item 11: "nome aproximado precisa de **tabela de cores nomeadas** (dataset pequeno)" (`TODO:162-168`) | Invertido: a tabela existe (11 cores do gabarito, com HEX/letras/soma A1Z26, na aba Cola). O que **não existe** é a matemática: zero conversão hex↔RGB↔HSL em todo o `src/` | `reference/colors.ts:1-44`; `reference/components/reference-panel.tsx:104-140` | média |
| Item 8 `diff-source` — âncoras citadas | 2 de 3 caem: *Pede o VAR* é conferência factual contra súmulas; *Frases Eternas* é caça-palavras com máscara; o trio da GIA (Basta Isso, Bandeiras, Sonho Perturbado) é **adulteração visual**. As âncoras reais são outras 5 provas | `catalogo-provas-dataset.json` (tags `texto-alterado-diff`, `diff-com-wikipedia`, `erros-ortograficos`) | média |
| Escopo: "só cifras software puro ou lookup por dataset offline" (`TODO:15-17`) | Já é violado por 4 decoders em produção (`registrobr`, `barcode`, `location`, `pix-participant`), que passam por backend proxy com cache e chaves no servidor. Existe caminho oficial para consulta online | `src/lib/api.ts:1-11`; `map-card.tsx:24` | média |
| Tabela "Já cobertos": A3 A1Z26 marcado como coberto | O decoder rejeita token com 3+ dígitos e valor fora de 1..26 → **a variante cíclica não roda**, e GIA-42 *Sonho Perturbado* depende dela (página 989 → A, 989 mod 26 = 1) | `ciphers.ts:81`; `DICIONARIO-CIFRAS.md:70` | média |
| Item 13 `resistor`: âncora "Challenge *Vive La Resistance* (2025)" | A prova existe mas **não tem resolução no acervo** — `RESOLUCOES.md` cobre 2017/18/19/22/23 + GIA. O registro guarda só a dica. O item vale, mas será implementado sem teste ancorado | `catalogo-provas-dataset.json` (ITC25-P14) | média |
| Item 17: CID-10/CNAE/FIPE/Anatel/Correios como datasets a adotar | FIPE não existe offline (API, muda mensalmente — incompatível com um pipeline que **commita** o JSON dentro da imagem); Correios exige API autenticada; Anatel não tem bulk; CID-10 são ~500 KB. Frequência no catálogo: rastreio 4, CNAE 3, FIPE 2, Anatel 2 — todas **menções**, zero provas resolvidas. *(A parte do Correios caiu na onda 6: a API autenticada é para **rastrear**, não para **ler** o código — §6.)* | `catalogo-provas-dataset.json`; `Dockerfile:24`; `nginx.conf:15-25` | média |
| Existe um só backlog | Existe um **segundo roadmap, visível ao usuário** (`help/roadmap-content.ts`), com "Cores como decoder" (:61), "Decodificação recursiva" (:97), "Compartilhar por URL" (:71) e os bloqueios de SIATU/Cidade Iluminada (:34,:40). Os dois não se referenciam e divergem | `src/features/help/roadmap-content.ts` | média |
| Item 14 `exotic-alphabets` como bloco único | Contagem no catálogo: pigpen 5, Libras 5, runas 4, nyctográfico 1, gematria 1. O **mais usado (pigpen) é justamente o que não pode virar decoder** (não há bloco Unicode, a entrada é imagem); o que pode (gematria) quase não aparece | `catalogo-provas-dataset.json` | média |
| Item 9 `cipher-disk` como cifra nova, MÉDIA | O próprio TODO admite ser "César com origem explícita" — e `caesar` + `caesar-bruteforce` já existem. Aparece 1× no corpus, e a entrada real é **contar setores pretos numa imagem** | `GIA-2026.md:137`; `DICIONARIO-CIFRAS.md:224` | média |
| Datasets existentes tratados como base estável | Dois **não são regeneráveis**: `build:ceps` lê `data-sources/ceps-sc.csv`, gitignored e ausente do repo; `build:words` pula o inglês sem `/usr/share/dict/words`. Como `build:streets-geo` depende de `ceps.json`, `pnpm build:data` quebra numa clonagem limpa — e o CI nunca roda `build:data` | `scripts/build-ceps.ts:19`; `scripts/build-words.ts:56-65`; `.github/workflows/ci.yml` | média |
| Cabeçalho: "~55 decoders" (`TODO:7`) | **74** (medido em runtime importando o registry), dos quais só 12 têm `encode` — o que explica por que o painel "Codificar em X" quase nunca aparece | `registry.ts:32`; contagem via vitest | baixa |
| Tabela "Já cobertos" é o mapeamento completo | Faltam 6 decoders reais: `affine`, `baudot`, `rot5`, `xor-key`, `url`, `html`. A Ajuda do app (`help-content.ts`) já documenta todos — **a Ajuda está em dia, o TODO é que ficou para trás** | `help-content.ts:55,57,95,145,192` | baixa |
| Linha A14: `base-converter` entre os codecs Base-N | É aritmética (dec/hex/oct/bin de um número, `forcedScore` 0.45), pertence a A23 | `decoders/base-converter.ts:4` | baixa |
| Linha B2: `location` "(DD, DMS, DDM)" | Detecta dez formatos: DD, DMS, DDM, Plus Code, UTM, Maidenhead, Quadkey, H3, GeoHex, Geohash, mais o atalho "Nb" do Vale e CEP→coordenada | `location/formats.ts:339-355` | baixa |
| B3: what3words listado entre os geocódigos offline | Só o **reconhecimento** é offline; a coordenada vem de chamada assíncrona ao backend, que guarda a chave | `location/formats.ts:333`; `map-card.tsx:24` | baixa |
| "Datasets que já temos… participantes PIX" | PIX não é embarcado: vem de `api("/pix")` em runtime. Backend fora do ar ⇒ o decoder simplesmente não dispara (`.catch(()=>{})`) | `lib/data.ts:90-106`; `use-decoder.ts:79` | baixa |

---

## 3. O diagnóstico

**A tese: o que falta não são cifras — é validação intermediária, cadeia e nomeação do dicionário.**

Três medições independentes sustentam isso.

**(a) A mecânica campeã já tem 60% de ferramenta, e a forma implementada é a rara.** A4 ("letra por posição indexada") aparece em **15 das 41 fichas da GIA** (37% da edição) e é a tag de cifra nº 1 nas 73 cadeias de `RESOLUCOES.md` (15 ocorrências; só `multi-etapa` 18 e `geolocalizacao` 14 superam, e são estruturais). A aba Posições já resolve "1 texto × N posições" — mas em **13 das 15 provas** o padrão é "N fontes × 1 índice cada": 6 imperadores × `[I,V,II,IV,IV,III]` → LOUROS; 13 candidatos × 13 posições → TITULO ELEITOR; 12 nomes de cor × 12 comprimentos de barra → UMA BICICLETA. Falta o *zip*, não o mecanismo. E há uma regra de normalização não negociável, verificada em 4 provas independentes: **contar ignorando espaços e pontuação, com acentuado valendo 1 caractere** — `'Capitão Caverna'[10]` só dá V se `ã` ocupar a posição 6, e um `normalize("NFD")` antes de indexar quebra E Agora, CRJA, Sinfonia e Faber-Castell de uma vez.

**(b) "Muitas camadas" explica pouco; "dicionário que você tem que adivinhar" explica muito.** Nas 286 provas do catálogo com cumprimento X/N, a média de `logicas` é **3,92 nas 36 provas 0/N** contra **3,00 nas 131 com ≥90%**, e a taxa de zero sobe de 10% (0 camadas de cifra) para 25% (4). Correlação real, mas fraca. Lendo as 36 provas zeradas, o denominador comum é outro: a cadeia exige adivinhar **qual tabela externa** consultar — *Só Para Nerds* (stats-for-nerds do YouTube), *De:Para* (rastreio dos Correios com três regras de extração), *Scotland Yard* (primos + gematria + T9 + campeões), *Piloto do Século* (HSL + concursos da Mega-Sena). E a GIA neutraliza isso de duas formas mensuráveis, ambas documentadas no acervo: **o título nomeia o dicionário em 11 das 41 provas** (`GIA-2026.md:363`) e **toda camada intermediária resolve para palavra real** — GEOTUDE, MAPCODE, CIDADE ILUMINADA, COVID, OSCAR, SIGNO (`GIA-2026.md:400`).

**(c) A bancada tem o dado do checkpoint e não o usa.** As 259.220 palavras de `words-pt.txt` estão no repositório desde junho e são consumidas **exclusivamente pela aba Anagramas**. O ranking do Decodificador roda com 110 stopwords hardcoded (`score.ts:72`). Ou seja: a resposta ao padrão de fracasso nº 1 do acervo está a ~40 linhas de fiação, e o TODO a classifica como bloqueada por falta de dataset.

**Consequência para o plano.** As duas melhorias transversais que o TODO trata como "nice to have" — realce de palavra reconhecível e encadeamento — são o produto principal. Elas valem mais que qualquer cifra nova da lista, porque tornam **todas** as 74 cifras existentes mais úteis: hoje uma equipe que acerta a camada 1 não recebe nenhum sinal de que acertou, e ainda precisa copiar-colar para tentar a camada 2. Depois delas vêm as duas primitivas de forma errada (zip de listas paralelas; reagrupamento de dígitos com descarte de pontuação), e só então cifras novas.

Correção de rota adicional: dois itens do TODO desabam sob verificação (GeoTude fica **muito mais barato**, Mapcode fica **muito mais caro**), e dois se resolvem quase de graça porque a peça que falta já está no repo em outro lugar (cores, anagrama).

---

## 4. A ordem de implementação

O recurso disputado não é tempo de código: é a **coluna de entrada no mobile**. Trilha de passos, 2º campo, chips do sniffer e campo de título empilham linhas acima do Textarea, e hoje o `<aside>` com 74 cifras já vem **antes** da entrada no DOM (`decoder-workbench.tsx:35-36`, `max-h-[55vh]`). Fazer isso em ordem aleatória é retrabalhar o layout quatro vezes. Daí a ordem abaixo.

### Onda 0 — Higiene e verdade (o primeiro commit) · **ENTREGUE**

**Primeiro commit concreto: `chore(bancada): ctx único, rótulo da chave e ordem no mobile`** — ~120 linhas, zero mudança de comportamento do motor, suíte verde sem tocar em nenhum teste:

1. **ENTREGUE.** Extrair para um `useMemo` o literal de `DecodeContext` que hoje é montado **duas vezes** em `use-decoder.ts` (linha 86 no run e :101-108 no encode). Sem isso, as ondas 1 e 2 duplicam fiação e o campo novo some silenciosamente no modo codificar. — o `ctx` único (`use-decoder.ts:124`) alimenta o fan-out e o `encode`.
2. **ENTREGUE.** Trocar o placeholder de `decoder-workbench.tsx:53` de "Chave (para Vigenère)" para **"Chave · índices · deslocamentos"** — o campo já serve a 9 decoders. E quem declara `inputs.key` (letter-index, vowel-cipher) sobrescreve o rótulo com o seu.
3. **ENTREGUE.** `order-2 md:order-1` no `<aside>`, para a entrada vir antes da lista de cifras a ~375px — hoje o `<aside>` é o `DecoderSelector`, último no DOM e `md:order-1` no desktop.
4. **ENTREGUE.** Reescrever `docs/TODO-CIFRAS.md` com a seção 2 deste plano, e cruzar-referenciar `help/roadmap-content.ts` — os três documentos agora se citam.

**Esforço:** XS. **Destrava:** tudo o que vem depois.

### Onda 1 — Os dois checkpoints · **ENTREGUE**

| Entra | Status | Por quê agora | Esforço |
|---|---|---|---|
| **#23 Realce de palavra real** (wordlist → `score.ts` via singleton) | **ENTREGUE** — `engine/words.ts` (`loadWordSet`/`getWordSet`), `realWords()` no `score.ts`, selo no ResultCard | Muda o ranking. Fazer **antes** de acrescentar decoders, para não recalibrar duas vezes. É a resposta direta ao padrão de fracasso nº 1 e o dado já está shipado | M |
| **#20 Pipeline v0** (`chainValue` + botão "usar como entrada") | **ENTREGUE** | Tira 100% do atrito de copiar-colar nas cadeias de 2–4 camadas. O motor já é puro e re-entrante (`run.ts:16-20`); é problema de UI. ~40 linhas na versão v0 | M (v0: S) |
| **#24 Sniffer v0** (ASCII×A1Z26, MDC, quadrados perfeitos, DV inválido) | **ENTREGUE** — e passou direto para o completo (13 chips em `engine/sniff.ts`, dos quatro do v0 até forma de GeoTude/Mapcode/what3words e blocos de coordenada) | É o "nomear o dicionário" do diagnóstico, e as três primeiras regras resolvem GIA-01, GIA-21 e GIA-27 sem decoder nenhum. Fora do pipeline de candidatos ⇒ risco de regressão zero | M |

**Destrava:** o usuário passa a saber *onde parou* (badge de palavra real), *como seguir* (botão) e *o que é a entrada* (chips). A partir daqui, cada cifra nova rende mais.

### Onda 2 — Campo auxiliar e as cifras ALTA · **ENTREGUE**

| Entra | Status | Nota |
|---|---|---|
| **#21 Campo aux** (`DecodeContext.aux?` + `Decoder.inputs` declarativo) | **ENTREGUE** (com divergência, ver §8-D8) | Pré-requisito duro dos itens 1 e 5 no fan-out — que, na prática, nenhum dos dois usou |
| **#1 letter-index** (zip + índice reverso + A{n}L{m}) | **ENTREGUE** — `positions/zip.ts` + decoder + modos "N fontes" na aba | Modo novo na aba Posições **e** decoder; núcleo puro compartilhado |
| **#5 vowel-cipher** | **ENTREGUE** | XS, e a saída primária é LAPIS (não o texto) |
| **#3 acrostic-nth** | **ENTREGUE** — `acrostic.ts` exporta os dois decoders | Segundo decoder no mesmo arquivo, via `bruteDecoder` |
| **#2 count-key** | **ENTREGUE** — séries de contagem na aba Texto (`text-extract/counts.ts`) + decoder | Rebaixado para MÉDIA (ver §2), mas é S e fecha GIA-04 |
| **#4 anagram (delta)** | **ENTREGUE** — duas palavras, sobra de 1–2 letras e a fonte "Ruas" no seletor | Só sobra "sobra de 1-2 letras", duas palavras e ruas de Blumenau |
| **novo: digit-regroup** | **ENTREGUE** | Descartar pontuação → concatenar dígitos → repartir em blocos de N (GIA-01). Ausente do TODO inteiro |

**Esforço:** M+S+S+S+M+S ≈ uma a duas semanas de trabalho concentrado.

### Onda 3 — Aritmética, grade e formatos puros · **ENTREGUE**

**#6 math-helper** (L, o de maior valor do grupo médio) · **ENTREGUE** (`features/math/arith.ts` + `math-card.tsx`), **#16 grid-read** (S, melhor âncora do grupo BAIXA — reproduzi PARACUMPRIRESSAPROVAVOCESDEV caractere a caractere) · **ENTREGUE**, **#15 periodic-table subscritos** (S) · **ENTREGUE** (com `reference/compounds.ts`, os nomes pt-BR → fórmula), **#10 date-key** (M) · **ENTREGUE**, **#7-GeoTude** (XS — aritmética pura, entra como uma linha em `formats.ts:339`) · **ENTREGUE** (com divergência de portão, ver §8-D7), **#24 sniffer completo** · **ENTREGUE**.

### Onda 4 — Lookups com tabela · **ENTREGUE**

**#11 color-convert** (S, dataset resolvido: 255 cores pt-BR da Wikipédia, 2,6 KB gz in-bundle) · **ENTREGUE** (`reference/named-colors.ts`), **#13 resistor** (S, o único item com `encode`) · **ENTREGUE** — e ganhou âncora de verdade, ao contrário do que o plano previa (§8-D1), **#18 ddd-cidade reescopado** (S) · **ENTREGUE** (`reference/city-ddd.ts`), **#11b Faber-Castell** (XS, 12 cores verificadas) · **ENTREGUE** (com o gabarito corrigido, §8-D2).

### Onda 5 — Caros, opcionais e de aba · **ENTREGUE**

**#20 Pipeline v1** (trilha de passos + migalhas) · **ENTREGUE** (`decoder/trail.ts` + `trail-bar.tsx`: volta, migalha clicável e ramificação), **#8 diff-source** (M, vira a **7ª aba**, não decoder) · **ENTREGUE** (`features/diff/`, as quatro tiras copiáveis), **#22 título como chave** (M) · **ENTREGUE** (`engine/title-hints.ts`, chips na mesma faixa do sniffer, sem tocar no score), **#12 whitespace-stego** (M, entrega inspetor — não "resolve a prova 41") · **ENTREGUE como inspetor**; a prova 41 continua irrecuperável do acervo, como previsto, **#9 cipher-disk** (M, só se o card SVG for feito) · **ENTREGUE** — o card SVG foi feito (`render: "wheel"`, `wheel-card.tsx`), então o item não caiu, **#7-Mapcode** (M, exige o primeiro `import()` dinâmico do projeto) · **ENTREGUE** (`location/mapcode.ts`, `import("mapcode-ts")` isolado numa função), **#14 letter-values + grade Pigpen na Cola** (S) · **PARCIAL**: entraram `letter-values` (primos, gematria, redução) e as legendas de Pigpen **e Libras** na Cola; as runas Elder Futhark seguem **adiadas por falta de âncora**, como o próprio item mandava.

### Onda 6 — cifras e geocódigos de fora do acervo · **ENTREGUE**

**Nenhum destes doze itens veio do acervo.** As ondas 0–5 tinham uma regra de origem: toda ficha
nascia de uma prova real, com âncora em `RESOLUCOES.md` ou na pasta da prova, e item sem âncora era
adiado (as runas do #14 estão adiadas até hoje por isso). **A onda 6 quebra essa regra de
propósito.** Os itens saíram de **varredura da web** por cifras e sistemas de geocódigo que a bancada
não conhecia — nenhuma prova pediu nenhum deles. É aposta, não dedução; e a aposta tem dois
fundamentos, ambos lidos no próprio acervo.

**(a) Geocódigo: a casa rotaciona o sistema a cada madrugada.** O dicionário chama isso de "rotação
enciclopédica de geocódigos" (`TODO-CIFRAS.md`, item 7), e o corpus confirma: Plus Code, Maidenhead,
UTM, Geohash, GeoHex, Mapcode, GeoTude — cada edição estreia um sistema, quase nunca o da anterior.
Contra um autor que rotaciona, **cobertura ampla é defensável sem prova nenhuma**: o que se está
prevendo não é *qual* sistema vem, é que **virá um que ainda não temos**. O custo por sistema é uma
função pura de ~100 linhas, sem dataset e sem rede; a probabilidade de o próximo cair na lista sobe
a cada entrada. Foi o único critério: geocódigo com especificação pública e aritmética fechada
entra, os cinco entraram, nenhum ficou bloqueado.

**(b) Código burocrático: é a identidade intelectual do evento.** A frase é do dicionário, citada em
`TODO-CIFRAS.md` ("Bases públicas e datasets"): o par *código burocrático + consulta pública* é
declarado como a assinatura da casa. Boleto, chave de NF-e, título de eleitor, placa e rastreio são
exatamente esse par — números que todo mundo tem no bolso, com DV conferível e um campo escondido
que **é** a resposta (o vencimento do boleto, a UF do título, a UF da placa, o país do rastreio).

**Isto contradiz o §6, e a contradição é deliberada.** O #17 (burocráticos extra) foi **descartado**
com a frase "adotar sob demanda, quando uma prova concreta pedir" — e o `correios` estava
nominalmente naquela lista de descarte. A demanda foi antecipada. O que mudou **não** foi a
frequência no acervo, que continua zero: foi o **custo**. O motivo real do descarte era "centenas de
KB de dataset" (CID-10, CNAE, FIPE) — e nenhum item da onda 6 tem dataset. As cinco tabelas de
referência somam **51 KB de fonte**, comentário incluso e antes de minificar: são faixas de letra,
27 UFs, 10 modelos de documento fiscal, prefixos de banco. **CID-10, CNAE, FIPE e Anatel seguem
descartados pelo motivo original**, e o critério fica escrito: *lookup de tabela pequena in-bundle
entra sob aposta; lookup que exige dataset espera a prova.*

| Entra | O que resolve | Por que entrou | Testes |
|---|---|---|---|
| **`boleto`** | 44 dígitos (código de barras bancário **ou** de arrecadação), 47 (linha digitável) e 48 (arrecadação), sempre normalizados para os 44 | O **fator de vencimento** é o campo de prova perfeito: quatro dígitos no meio do código que viram uma data. Sai nas **duas leituras** (a contagem original de 1997 e a reiniciada em 2025), porque o fator é genuinamente ambíguo e calar uma delas seria escolher pela equipe | 24 |
| **`chave-nfe`** | Os 9 campos da chave de acesso de 44 posições + cDV mód-11; `chainValue` = CNPJ do emitente | Toda nota fiscal do país carrega uma; cai direto no `documento` pela cadeia. Exigiu o **gate anti-ruído mais caro da onda** (5 travas: formato, cUF do IBGE, mês, modelo, DV do CNPJ e cDV) — sem a trava do CNPJ escapava 1 boleto plausível em 773; com ela, 1 em 75.000 | 8 |
| **`titulo-eleitor`** | 12 dígitos → UF de emissão, com os dois DVs mód-11 | A UF vem **embutida** no número: é lookup e checksum no mesmo passo. Spec conferida contra **dado real**, não contra blog — 177.997 títulos do `consulta_cand` do TSE, 100% aceitos, sigla modal batendo nas 27 UFs | 10 |
| **`placa-veiculo`** | Antiga ↔ Mercosul nos dois sentidos, UF pela faixa histórica de letras, categoria pela cor | Já era **ideia no Roadmap** in-app ("Detector de placa de carro (offline)"), o que a torna a menos especulativa da onda. A conversão (5º caractere = 2º dígito virado letra, 0=A…9=J) foi confirmada em duas fontes independentes e é reversível | 38 |
| **`correios`** | DV do padrão UPU S10, serviço pela tabela 5.6 da norma e país pelo sufixo ISO 3166-1 | Rastreio é o burocrático mais **manuseado** do país. Especificação extraída da **norma primária** (S10-12 da UPU, via `pdftotext`), não de blog — e isso mudou a implementação | 33 |
| **`numero-extenso`** | Extenso pt-BR ↔ dígitos, com ordinais, gênero e ligação entre classes | Metade da ideia "Utilitários de número" que já estava no Roadmap. **Assimétrico de propósito**: extenso→dígitos entra no fan-out (dígito puro pronto para encadear em a1z26/`cep-exact`); dígitos→extenso só roda em "uma cifra só", senão poluiria toda entrada numérica | 29 |
| **`rot8000`** | O "ROT13 do Unicode": 9 faixas do BMP, auto-inverso | Único item da onda que é **cifra**, não código. Entra porque é o rótulo que uma prova usaria para esconder texto em glifos CJK sem parecer cifra. Spec reproduzida do `rot8000.js` de rottytooth e provada **por exaustão**: 63.404 dos 65.536 code points giram, e todos voltam ao girar de novo | 20 |
| **5 geocódigos** no `detectLocation`: MGRS/USNG, carta IBGE/DSG, GEOREF, GARS, grade estatística IBGE | Cinco sistemas novos, um arquivo por sistema; nenhum decoder novo — quem emite o `render:"map"` continua sendo o `location` | O item (a) acima. Todos fecharam **offline**, nenhum bloqueado. A Albers do IBGE reproduziu o pyproj no decímetro; a carta IBGE foi validada em duas âncoras independentes, uma delas contra o registro real do acervo IBGE | 57 |

**Ordem de precedência foi o trabalho escondido dos geocódigos.** Todo MGRS é lexicalmente um
Geohash válido; GEOREF e GARS também casariam como Geohash. A lista em `detectLocation` é ordenada,
não paralela, e a ordem está comentada no código com o motivo de cada posição — é o tipo de detalhe
que alguém "arruma" em seis meses e quebra cinco sistemas de uma vez.

**Preço da onda:** +7 decoders (96 no total, 15 com `encode`), +5 sistemas de geocódigo (16 no
`detectLocation`), +219 testes (548 → 767), +51 KB de **fonte** em tabelas de referência (com
comentário, antes de minificar e comprimir). Zero dependências novas, zero chamadas de rede, zero
`import()` dinâmico novo.

### Fora do plano

**#17 burocráticos extra** · **DESCARTADO, com uma exceção aberta na onda 6.** Na execução das ondas 0–5 nenhum decoder de CID-10/CNAE/FIPE/Anatel/Correios existia, e a fatia útil virou verbete na Cola. O **`correios` entrou depois**, na onda 6, por não ter dataset — CID-10, CNAE, FIPE e Anatel continuam descartados pelo motivo original (ver "Onda 6", acima). **#19 gov-recognizer** · **DESCARTADO como decoder e ENTREGUE como documentação**: `reference/sources.ts` alimenta a seção "Bases e onde consultar" da aba Cola, com o status de cada base (aberta / consulta manual / bloqueada / adiada).

---

## 5. Fichas por item

Agrupadas por onda. `E` = esforço.

### Onda 1 — transversais

---

**#23 · `realce-palavra-real` — Melhoria 4** · **implementar** · E: **M** · **ENTREGUE**

A wordlist **não pode** entrar pelo `DecodeContext`: `bruteDecoder` chama `scorePlaintext` sem ctx (`define.ts:81`), então César/afim/railfence escolheriam suas 3 melhores variantes sem o bônus — justo onde ele mais importa. Solução: **singleton de módulo** em `score.ts` (`setWordSet(set|null)`), assinatura de `scorePlaintext` intacta. Fórmula que **puxa para 1** em vez de somar: `lifted = base + 0.6·cov·(1−base)`, com cobertura ponderada **por letra**. Gate medido, não chutado: descartar tokens < 4 letras (3 letras = 1.205 palavras em 26³, 1 em 15 — ruído puro; a 4 letras é 1 em 123, e 25 deslocamentos errados de César sobre 10 palavras-âncora deram **1 falso positivo em 250**). Carregar em `requestIdleCallback`; até chegar, `WORDS = null` e o score é **bit-a-bit o de hoje** — os 194 testes seguem verdes sem ajuste. O badge "palavra real: LAPIS" no ResultCard é metade do valor e não depende do motor.
*Arquivos:* `lib/data.ts` (novo `getWordSet`/`loadWordSet`), `engine/score.ts`, `use-decoder.ts`, `components/result-card.tsx`, novos `engine/score.test.ts` e `reference/puzzle-words.ts`. *Deps:* nenhuma.
*Âncoras:* LAPIS, TEATRO, LOUROS, VENCEDOR, SIGNO, CASCAVEL, OSCAR — **todos presentes** em `words-pt.txt`. **GEOTUDE, MAPCODE e TOPO NÃO estão** (medido; "topo" só existe em `words-en.txt`) — é a justificativa de `puzzle-words.ts` e do merge pt+en.

---

**#20 · `pipeline-usar-como-entrada` — Melhoria 1** · **implementar** · E: **M** (v0: S) · **ENTREGUE**

Duas armadilhas decidem o item. (a) `output` **não é valor encadeável** para lookups: `local-geocode.ts:29` emite `"${hit.full} — ${lat}, ${lng} (${anchor})"`, `caesar-bruteforce.ts:32` emite a **tabela de 53 linhas** como output. Daí o campo opcional `chainValue?: string`, com a regra `c.chainValue ?? (render == null || render === "text" ? output : null)`. (b) `mapDecoder` descarta saída igual à entrada (`define.ts:53`), então `pushStep` faz no-op quando o valor empurrado não muda nada. A trilha é `TrailStep[]` em módulo puro (`trail.ts`): push = encadear, pop = desfazer, truncate = ramificar. Encadear limpa `selectedId` e volta ao fan-out. **Não** persistir em URL nesta rodada (é item próprio no roadmap in-app, `:71`).
*Arquivos:* novos `decoder/trail.ts`, `trail.test.ts`, `components/trail-bar.tsx`; toca `engine/types.ts`, `engine/define.ts` (o tipo `DecodeResult` **também** precisa de `chainValue`, senão o excess-property-check recusa o literal), `use-decoder.ts`, `result-card.tsx`, `decoders/location.ts`, `decoders/local-geocode.ts`.
*Âncoras:* `"7 5 15 20 21 4 5"` → a1z26 → **geotude** (GIA-27, cadeia canônica de 3 camadas); `location` de `−26.94818, −49.07202` deve expor `chainValue` limpo (GIA-21).

---

**#24 · `sniffer-formato` — Melhoria 5** · **implementar** · E: **M** · **ENTREGUE**

**Não deve ser decoder**, e essa é a decisão do item: o dedup por `output` exato (`run.ts:40-47`) faria um sinalizador genérico canibalizar candidatos reais, e para ser visto ele precisaria de `forcedScore` acima de 0.35, empurrando respostas para baixo. Módulo puro `engine/sniff.ts`, rodado no mesmo useMemo, renderizado como faixa de chips **acima** dos resultados. O valor exclusivo é o **diagnóstico negativo** — hoje um decoder que não se aplica devolve `[]` em silêncio: "13 dígitos mas o DV GS1 não fecha", "valores 79–84: é ASCII, não A1Z26", "3 palavras com ponto: what3words, mas o backend não respondeu". Começar por ASCII×A1Z26, aritmética latente (MDC/quadrados) e DV inválido.
*Arquivos:* novos `engine/sniff.ts`, `sniff.test.ts`, `components/hint-strip.tsx`. *Deps:* nenhuma (reusa `phone-codes.ts`, `digit-table.ts`, `codes/barcode.ts`, `location/formats.ts`).
*Âncoras:* `"84 79 80 79"` → alerta "é ASCII, não A1Z26" (GIA-01); `"676 81 2304 1 64"` → "quadrados perfeitos · raízes 26 9 48 1 8" (GIA-21); `"21 15 45 60 63 12 15"` → "MDC = 3 · 7 5 15 20 21 4 5" (GIA-27); `"47 32 21 51 44"` → "todos são DDD válidos" (GIA-40).

### Onda 2 — campo aux e cifras ALTA

---

**#21 · `campo-aux-generico` — Melhoria 2** · **implementar** · E: **M** · **ENTREGUE** (a armadilha do `define.ts` era real; o consumo, não — §8-D8)

`DecodeContext.aux?: string` **opcional** (22 literais `{key:"",streets:null,ceps:null}` nos testes quebrariam com campo obrigatório) + `Decoder.inputs?: {key?, aux?}` declarativo, porque o rótulo **é** a affordance. **Armadilha nº 1 do item:** `mapDecoder` e `bruteDecoder` montam o objeto literal e **descartam opção desconhecida** (`define.ts:45-57, 73-92`) — sem `...(opts.inputs ? {inputs} : {})` nos dois helpers, o campo compila, não quebra teste e simplesmente não existe em runtime. Decoder com `inputs.aux.required` fica **fora** da lista do fan-out enquanto `aux` está vazio, e o filtro mora no **hook**, nunca em `runDecoders` (senão `run.test.ts`/`registry.test.ts` mudam de comportamento).
*Arquivos:* `engine/types.ts`, `engine/define.ts`, `use-decoder.ts`, `decoder-workbench.tsx`, `decoder-selector.tsx`, novo `engine/inputs.test.ts`. *Deps:* #20 (ordem de layout).

---

**#1 · `letter-index`** · **estender** · E: **M** · **ENTREGUE**

Núcleo puro em `positions/zip.ts` com três funções — `letterAt(source,k,fromEnd,onlyLetters)`, `zipIndex(sources[],positions[])`, `constIndex(sources[],k)` — consumido pela **aba** e por um **decoder** novo. Regra inegociável: `s.match(/\p{L}/gu)`, **nunca** `stripDiacritics` (`engine/util.ts:9`, que seria a escolha instintiva). O decoder lê `ctx.key` como lista de índices (aceitando romanos, reusando `roman.ts`) e a entrada multi-linha como as fontes; emite os quatro modos rotulados. `forcedScore: 0.6` (só dispara com chave numérica ⇒ ruído nulo, e TITULOELEITOR levaria penalidade de consoantes). `defineDecoder`, não `mapDecoder`.
*Arquivos:* novos `positions/zip.ts` + teste, `decoders/letter-index.ts` + teste; toca `use-positions.ts`, `positions-panel.tsx`, `decoder-workbench.tsx`, `help-content.ts`. *Deps:* #21.
*Âncoras:* 6 imperadores + `I V II IV IV III` → **LOUROS** (GIA-29); 13 nomes CRJA + 13 índices → **TITULOELEITOR** (RESOLUCOES.md:993, 13/13 conferidos, só fecham ignorando espaços); 6 títulos do VLAD V + `5` do fim → **TEATRO** (GIA-30 — derivação minha, o acervo não registra a palavra final: **confirmar com o dono**); `'Capitão Caverna'[10]` → **V** (GIA-05); 12 cores Faber-Castell → UMABICICLETA com a **célula 038 como known-bad** (gabarito diz A, `Lilás[3]` = L).

---

**#5 · `vowel-cipher`** · **implementar** · E: **XS** · **ENTREGUE**

Caso principal **não precisa de 2º campo**: na folha da prova a chave está impressa como linha isolada (`+11 -4 +7 -6 -2`), então a própria entrada é a chave e o decoder emite LAPIS direto, com as notas mostrando a derivação vogal a vogal. Modo secundário lê `ctx.key`. Generalização de graça: lista de deslocamentos com sinal aplicada **posição a posição** resolve GIA-26 *Legado Mundial* (César com direção sinalizada por +/− sob cada escudo), que o TODO não cita. Exigir **sinal explícito** para não brigar com `a1z26` (`ciphers.ts:81`) — verifiquei que `+11` já reprova no regex de lá, o espaço está livre. Reusar `shiftLetter` (`engine/util.ts:19`).
*Arquivos:* novos `decoders/vowel-cipher.ts` + teste. *Deps:* #21 (só para o modo texto+chave).
*Âncora:* `+11 -4 +7 -6 -2` → **LAPIS** (GIA-22).

---

**#3 · `acrostic-nth`** · **estender** · E: **S** · **ENTREGUE**

**Não** reescrever `acrostic.ts` como `bruteDecoder`: o acróstico de iniciais é determinístico e seria expulso do top-3 por ruído. O arquivo passa a exportar um **array de dois decoders** (o registry achata, `registry.ts:26-30`; `rot5-18.ts` é o precedente). O novo é `bruteDecoder` com `keep: 4`, gerando k-ésima letra (início/fim, k=1..5) sobre linhas e palavras, mais ímpares/pares e as duas variantes de nome+sobrenome. **Cuidado com GIA-28:** a resolução diz "última do nome e primeira do sobrenome" e no exemplo as duas **coincidem** — implementar como par concatenado duplicaria a mensagem; são duas variantes separadas.
*Arquivos:* `decoders/acrostic.ts`, novo `acrostic-nth.test.ts`. *Deps:* nenhuma.
*Âncoras:* GIA-30 (TEatro, "5ª letra do fim de cada linha"); GIA-28 → **OS SEM FLORESTA**.

---

**#2 · `count-key`** · **estender** · E: **S** · *prioridade rebaixada de ALTA para MÉDIA* · **ENTREGUE**

Funções puras em `text-extract/counts.ts` (não em `extract.ts`, que já tem 138 linhas), consumidas pela aba **e** por um decoder. Guarda dura no topo (`input.length < 40 || !/\n/.test(input)` → `[]`), porque roda a cada tecla entre 74. A série crua sai com `forcedScore: 0.3` — na gaveta **por projeto**, não por acidente do gate de dígitos. O candidato A1Z26 só é emitido quando **todas** as contagens caem em 1..26, o que num texto qualquer quase nunca acontece: é isso que transforma um decoder ruidoso num detector. Parágrafo = `/\n\s*\n/`, suprimindo a série quando `paras.length === lines.length`.
*Arquivos:* novos `text-extract/counts.ts` + teste, `decoders/count-key.ts` + teste; toca `extract.ts`, `text-extract-panel.tsx`.
*Âncora:* os 8 parágrafos de GIA-04 → `22 5 14 3 5 4 15 18` → **vencedor**.

---

**#4 · `anagram`** · **JÁ EXISTE — ficha de delta** · E: **M** · **ENTREGUE**

Reescrever o item no TODO. Sobra: (a) **duas palavras** — GIA-18 termina em "UM MAPA" e `solveAnagram` (`solve.ts:35-38`) é lookup exato, então falha hoje; implementar com um lookup por palavra + subtração de vetores de 26 posições (`Int8Array`), **bucketizando o índice por tamanho**, que é a diferença entre "trava a digitação" e "imperceptível"; (b) **sobra de 1-2 letras**, pedida pelo TODO — a letra que sobra costuma ser o índice da camada seguinte; (c) **ruas/bairros de Blumenau** como fonte separada no seletor (`streets.json` já é carregado eager). **Descartado por projeto:** promover a decoder do fan-out — arrastaria 848 KB gz para a aba principal e geraria ruído em toda entrada curta.
*Nit:* `scripts/build-words.ts:32` comenta "acentos contam dobrado", mas `fold()` roda **antes** do filtro de tamanho.
*Âncoras que já passam (regressão):* SONGI→signo, Gino→ingo, Torvi→vitor, Toti→tito, Erni→neri, Giores→sérgio (6/6). *Falha hoje:* `ummapa` → `["um","mapa"]`.

---

**#novo · `digit-regroup`** · **implementar** · E: **XS** · *ausente do TODO* · **ENTREGUE**

Descartar pontuação → concatenar todos os dígitos → repartir em blocos de N (8, 7, 6, 4, 2) → ASCII / A1Z26 / binário. É o mecanismo **integral** de GIA-01 *Ask Me*, a prova de abertura da edição, e hoje não engata porque o decoder `binary` exige octetos já separados. Pré-requisito de A11/A12 e ataque direto à barreira histórica declarada no dicionário (confundir ASCII com A1Z26). Guarda: só dispara com ≥16 dígitos e comprimento múltiplo de algum bloco.
*Âncora:* o texto de GIA-01 com as vírgulas → `01010100 01001111 01010000 01001111` → **TOPO**.

### Onda 3 — aritmética, grade e formatos puros

---

**#6 · `math-helper`** · **implementar** · E: **L** · **ENTREGUE**

O único do grupo com risco real de ruído: a entrada verdadeira é **prosa com números enterrados**. Portão de três faixas dentro do mesmo `decode()`: (1) **lista nua** (regex de só-números, 2..24 valores) → painel completo, `forcedScore` 0.5; (2) **prosa + palavra-dica** (`raiz`, `em comum/mdc`, `dividir/%`, `múltiplo`, `Kaprekar`, `resto`) → só a linha da dica, `0.62`; (3) **solo** (`ctx.only === "math-helper"`) → painel completo. Sem dica, prosa **nunca** dispara. Truque que vale por si: quando uma linha produz valores todos em 1..26, computar a leitura A1Z26 e usar `forcedScore = max(base, scorePlaintext(leitura))` — em GIA-27 a leitura é GEOTUDE e a linha do MDC sobe sozinha ao topo. Agrupamento **por bloco** (`/\n\s*\n/`) é o que faz GIA-21 funcionar. Parsing pt-BR obrigatório: `15.586.677,75` → 15586677.75, `17,5%` → `{value:17.5, percent:true}`.
*Arquivos:* novos `features/math/arith.ts` + teste, `decoders/math-helper.ts` + teste, `components/math-card.tsx`; toca `types.ts` (`render:"math"` + `only?`), `use-decoder.ts`, `result-card.tsx`.
*Âncoras:* `21 15 45 60 63 12 15` → MDC 3 → **GEOTUDE**; GIA-21 → blocos `2694818` / `4907202` → chip "possível coordenada −26.94818, −49.07202"; `15.586.677,75 ÷ 17,5%` → **89066730** → chip CEP (GIA-06); prosa com números sem dica → `[]`. *Divergência a documentar:* no Kaprekar de 2019, `2010` dá 3 passos em contagem estrita e o gabarito registra 4 — **não** ajustar o algoritmo para bater com o gabarito.

---

**#16 · `grid-read`** · **implementar** · E: **S** · *subir de BAIXA para MÉDIA* · **ENTREGUE**

Melhor âncora de todo o grupo BAIXA e verificada por execução: a grade 8×8 de GIA-15 lida com **quatro braços girando juntos** (TL→direita, TR→baixo, BR→esquerda, BL→cima, um caractere de cada por passo, anel a anel) produz **PARACUMPRIRESSAPROVAVOCESDEV** — 28 caracteres = anel externo (4×7). A espiral horária ingênua devolve lixo. `bruteDecoder` com `keep: 3` e cinco variantes (4 braços, espiral horária/anti-horária, serpentina por linhas/colunas): a saída é português e o `scorePlaintext` elege sozinho ⇒ **sem `forcedScore`, sem `render` novo, um arquivo só**. Guarda tripla obrigatória: ≥3 linhas, largura uniforme em células, 1 caractere por célula — e aceitar tabela markdown (que é o formato do acervo), separado por espaço e contíguo.
*Arquivos:* novos `decoders/grid-read.ts` + teste.

---

**#15 · `periodic-table` (subscritos)** · **estender** · E: **S** · *subir de BAIXA para MÉDIA* · **ENTREGUE**

Quarto modo dentro do `defineDecoder` existente, sem arquivo novo. Dois detalhes decidem a correção: o parse `[A-Z][a-z]?` é **case-sensitive por construção** (CO = carbono+oxigênio, Co = cobalto) — nunca aplicar `toUpperCase` na fórmula inteira; e exigir `els.length ≥ 2`, senão símbolo único duplica o modo existente e vira presa do dedup. Reusa `render: "elements"` ⇒ zero edição em `types.ts` e `result-card.tsx`. Extensão que fecha a prova de verdade: `reference/compounds.ts` com ~30 nomes pt-BR → fórmula (~2 KB), porque o enunciado dá os **nomes**, não as fórmulas.
*Âncora:* `H3PO4 H2O HNO3` → **31421113** (telefone do Crachás Aracaju, DDD 79 confirmado no enunciado, GIA-19).

---

**#10 · `date-key`** · **implementar** · E: **M** · **ENTREGUE**

Gate pelo formato: cada token precisa conter **barra** (dd/mm) ou ser ISO — é isso que impede `2019 2010 1949 1905` (âncora do Kaprekar) de virar data, e ao mesmo tempo aceita `dd/mm-dd/mm-…`, que é o formato da prova. Duas saídas: **lista (≥3 datas)** → iniciais dos signos **sem `forcedScore`** (o scorer é o autocheck: se formar palavra sobe, se formar ruído afunda); **data única** → painel com signo, Zeller, dia do ano, serial de Excel, Unix, fase da lua (rotulada aproximada), `forcedScore` 0.5. Aritmética inteira ou `Date.UTC` — nada de `new Date` local (o repo já tem cicatriz de bug de fuso).
*Âncoras:* as 8 datas de GIA-13 → Câncer, Áries, Sagitário, Capricórnio, Aquário, Virgem, Escorpião, Libra → **CASCAVEL** (8/8 conferidos); `23/11` → Sagitário (fronteira onde toda tabela de zodíaco erra); `01/01/2000` → serial 36526.

---

**#7a · `geotude-offline`** · **reescopar** (do "web/degradar" para puro) · E: **XS** · **ENTREGUE** (portão em ≥2 grupos, não ≥1 — §8-D7)

Um arquivo puro `location/geotude.ts` + **uma linha** no array `attempts` de `detectLocation` (`formats.ts:339-355`). Zero decoder novo, zero `render` novo, zero dataset, zero rede — o `location` já tem `render:"map"`, MapCard, `forcedScore` 0.9 e `scopeLabel`. Dois cuidados: **não somar meia célula** (o serviço devolve o **canto**, ao contrário de `decodeMaidenhead`/`decodePlusCode`), e exigir ≥1 grupo pontuado (`^\d{4,6}(?:\.\d{2})+$`) para não transformar todo número de 5 dígitos em coordenada. Rede só como verificação opcional, nunca como dependência. **Ressalva honesta:** o esquema veio de engenharia reversa de 13 amostras, não de especificação publicada — manter os fixtures como contrato.
*Âncoras:* `68130.89.91.15.12` → **−26.8911, −49.0848** (recepção da FURB Campus 2, GIA-27); `53281.86.69.03` → 3.14, 101.693 (exemplo da home deles); `68130` → `null`.

### Onda 4 — lookups com tabela

---

**#11 · `color-convert`** · **implementar** · E: **S** · **ENTREGUE** (§8-D6)

O TODO inverte o custo: a tabela é o fácil, a matemática é o que não existe (zero `hsl|rgb(` em `src/features/decoder/`). **Dataset resolvido e a escolha de idioma é requisito funcional:** a "Lista de cores" da Wikipédia **em português** (255 entradas, template machine-parseável, CC BY-SA) → 6,4 KB de TS / **2,6 KB gz in-bundle**. Em inglês a prova-âncora não fecha: 245-245-220 Bege, 244-196-48 Açafrão, 0-0-128 Naval, 0-0-255 Azul, 255-250-250 Neve, 153-102-204 Ametista → **B-A-N-A-N-A**; em inglês sairia B-S-N-B-S-A. Distância em **CIELab (ΔE CIE76)**, não euclidiana em RGB (erra em matiz saturado, que é o caso das provas). Reusa `render: "code-list"` ⇒ nenhuma edição em `types.ts`. Manter `reference/colors.ts` (as 11 do gabarito, com Branco/Preto de HEX trocado **de propósito**) **separado**.
*Âncoras:* as 6 triplas → BANANA (2022 P3 Et.2, hexes conferidos na lista pt); `rgb(255,165,0)` → Laranja (2019 P4 Et.5); `#993399/#000000/#00ff00/#add8e6` (2023 P19 Et.4); **`hsl(120,100%,25%)`** — 2023 P11 *Piloto do Século* teve cumprimento **0/4**, única prova de cor com fracasso total.

---

**#11b · `faber-castell`** · **reescopar** · E: **XS** · **ENTREGUE** (§8-D2)

Sem fonte pública utilizável: a Faber-Castell Brasil publica a tabela só como encarte impresso/PDF, e digitalizações estão no Scribd — raspar está fora pela mesma regra já registrada para SIATU/Cidade Iluminada. Entregar as **12 cores verificadas do gabarito da GIA-39** (~400 B), com cabeçalho declarando a proveniência, e **degradação explícita**: código de 3 dígitos fora da tabela responde "não catalogado" em vez de silêncio. O valor é o **nome** (a prova indexa letra dentro dele, sem espaços), não a cor — o gabarito nem dá HEX.
*Âncoras:* `015` → "Laranja escuro"[11] = **U**; **`038` é known-bad** (gabarito diz A, `Lilás[3]` = L).

---

**#13 · `resistor`** · **implementar** · E: **S** · **ENTREGUE** — e com âncora do acervo, ao contrário do previsto (§8-D1)

Gate mais limpo da bancada: 3–6 tokens, **todos** nome de cor do código (pt + en; abreviações de 1 letra não, ambíguas). Semântica por nº de faixas (3/4/5/6) e regra de direção: se a última for ouro/prata é inequívoco; se a **primeira** for preta é fisicamente impossível ⇒ leitura invertida — é o erro nº 1 na bancada. `forcedScore` 0.6 (determinístico, não chute). **Único do grupo que ganha `encode`** (`4700` → amarelo violeta vermelho ouro), o que resolve o caminho inverso da prova sem UI nova. Tabela em `reference/resistor.ts` — **não** reutilizar `colors.ts`, cujo Branco/Preto está trocado.
*Âncoras:* canônicas (sem âncora no acervo, ver §2): `marrom preto vermelho ouro` → 1000 Ω ±5%; `vermelho vermelho preto marrom marrom` → 2200 Ω ±1% (5 faixas, onde a leitura de 4 erraria uma ordem de grandeza).

---

**#18 · `ddd-cidade`** · **reescopar** · E: **S** · **ENTREGUE**

Abandonar coordenada→cidade e implementar **cidade→DDD**, que é o que a bancada realmente não sabe fazer. Justificativa: o passo coordenada→cidade já está resolvido na prática (cola-se a coordenada, `location` dispara com 0.9 e o MapCard mostra o ponto); e reverse-geocode por cidade-cabeça **erra silenciosamente** (Teresópolis responde 24/Petrópolis em vez de 21). Índice `CITY_DDD` com ~400 municípios (~10-12 KB in-bundle) resolve. Dois detalhes decidem: separadores **nunca** espaço simples ("Juiz de Fora" viraria três tokens) e dobra de acentos ("Maringá"/"MARINGA"). Reusa `render: "code-list"`.
*Descartado:* dataset nacional de centroides (~5.571 linhas) — e **jamais** enxertar em `municipios.json`, que é carregado **eager** no mount (`use-decoder.ts:44`).
*Âncora:* `Blumenau, Juiz de Fora, Teresópolis, Porto Alegre, Maringá` → **4732215144** (47 3221-5144, Ilhatur — GIA-40).

### Onda 5 — caros, opcionais e de aba

---

**#20b · Pipeline v1 (trilha)** · E: **S** · **ENTREGUE** — `trail.ts` + `<TrailBar>` com migalhas clicáveis, teto de 8 passos (a cadeia mais longa do acervo tem 4). Extensão: botão por linha na CaesarTable.

---

**#8 · `diff-source`** · **reescopar** · E: **M** · **ENTREGUE** — **vira a 7ª aba, não decoder.** LCS O(n·m) sobre dois documentos não cabe num fan-out que roda a cada tecla, e a aba dissolve a dependência da Melhoria 2. As 5 âncoras reais (não as do TODO): *Quer Provar Isto?* 2022 P12, *Lições de Mãe* 2022 P10, *Carne é fundamental* 2016-06 Et.2, *Bronquinha* 2016-05 Et.1, *Skate na Veia* 2023 Pocket-3. Lendo as resoluções, **o diff nunca é a resposta** — a resposta é um subproduto. Daí as quatro tiras copiáveis: (a) palavras trocadas em ordem → *Quer Provar Isto?* (EYELASH, LIGHT → Hercílio Luz); (b) originais correspondentes; (c) letras que mudaram (LCS de caractere no par) → *Bronquinha* (anagrama de SOCIESC); (d) série de contagens de letras → *Lições de Mãe*, já formatada para colar na aba Posições. Guarda de 20.000 caracteres por lado, debounce ≥300 ms. Comparar normalizado, **exibir o original** (o corpus responde com a grafia acentuada).

---

**#22 · `titulo-como-chave`** · **reescopar** · E: **M** · **ENTREGUE** — **não é um segundo operando**, é camada de meta-informação: o título nunca entra em `decode()`. Motor puro `title-hints.ts` com quatro famílias (nome de sistema; ~60 regexes temáticos; anagrama do título via índice já existente; ~10 trunfos fonéticos curados). Chips na **mesma faixa** do #24, clicáveis → `setSelectedId`. **Decisão explícita: o título NÃO altera score** — um título mal interpretado corromperia o ranking que o #23 acabou de tornar confiável, e o efeito seria invisível. Ambiguidade assumida: "Enxergar sem ver" (GIA-40, coordenada) e "Os olhos enganam" (GIA-41, Braille) caem na mesma regra ⇒ um chip pode listar vários decoders e a bancada nunca auto-seleciona.
*Âncoras:* "O Código SONGI" → chip SONGI = SIGNO; "Prova Quadrada" → raiz; "Ask Me" → ASCII (o mesmo chip que o #24 emite pela entrada, por caminho independente); "Romanos", "Desenhar e Colorir".

---

**#12 · `whitespace-stego`** · **reescopar** · E: **M** · **ENTREGUE como inspetor** — não dá para prometer "resolve a prova 41" (mapeamento irrecuperável, ver §2). Entregar um **inspetor** no molde exato do `zero-width.ts`: gate por anomalia (≥2 espaços duplos ou tab, ≥3 linhas), quatro leituras candidatas (1 bit/linha; 2 bits/linha; espaço=0/tab=1; espaços à direita), **cada uma também invertida** (o gabarito termina em "de trás pra frente"), todas pontuadas pelo scorer; mais um candidato de inspeção (`forcedScore` 0.4) mostrando o perfil linha a linha e o aviso operacional que vale mais que o decoder: *"cole preservando as quebras originais — copiar de PDF/Word reflowa e apaga o sinal"*. Requer extrair o mapa BRAILLE de `codecs.ts:180-227` para `reference/braille.ts` (commit separado, arquivo quente).

---

**#9 · `cipher-disk`** · **reescopar** · E: **M** · **ENTREGUE** (o card SVG foi feito, então o item não caiu) — a entrada real de GIA-17 é imagem ("Prova sem t e x t o") e contar setores pretos não se automatiza. Reescopar para "A1Z26 parametrizado": varrer 2 bases × 2 sentidos × 26 origens, **pulando a variante identidade** (senão o dedup mata arbitrariamente ou ela ou o decoder `a1z26`). O entregável de verdade é o **card SVG** da roda (`forcedScore` 0.38, faixa da tabela do caesar-bruteforce): sem ele, o item vira 3 candidatos redundantes e deve ser **descartado**.
*Âncora derivada (marcar como tal):* `21 13 1 / 2 9 3 / 9 3 12 / 5 20 1` → UMA BICICLETA.

---

**#7b · `mapcode`** · **implementar** · E: **M** · **ENTREGUE** — `mapcode-ts@1.0.1`, Apache-2.0, zero deps, roda no browser. **313 KB gz** ⇒ obriga o **primeiro `import()` dinâmico do projeto**, dentro do MapCard (mesmo padrão assíncrono do what3words/CEP), com detecção síncrona e barata em `formats.ts`. Zero decoder novo, zero `render` novo. Ordem de resolução: território explícito → BR-SC filtrado por `VALE_BBOX` (rótulo "assumindo BR-SC", mesma honestidade do `local-geocode`) → varredura `BR_*`+`BRA` filtrada por `BRAZIL_BBOX` → internacional. **Bugs reais da 1.0.1:** `decode(code, "BR-SC")` com território em string lança `getParentTerritory is not a function` (usar `Territory.fromString`); filtrar por `startsWith("BR")` captura BRB/Barbados e BRN/Brunei.
*Âncora:* `2JF.5R` @ BR-SC → **−26.913966, −49.069158** (Prefeitura de Blumenau, GIA-08 → PREFEITURA).

---

**#14 · `letter-values` + grade Pigpen** · **reescopar** · E: **S** · **PARCIAL** (runas seguem adiadas) — quebrar em três: (a) **pigpen/Libras/nyctográfico → referência visual na aba Cola**, nunca decoder (sem bloco Unicode, entrada é imagem, descrever glifo é mais lento que olhar a legenda); (b) **`letter-values`** com três esquemas (gematria clássica, redução 1-9, **primos** — o que *Scotland Yard* usou), `forcedScore` ~0.5, **excluindo o ordinal** (colidiria com `a1z26-encode` no dedup); (c) **runas Elder Futhark → adiar**: a "prova de runas" de 2019 (`RESOLUCOES.md:289`) não usa alfabeto rúnico — cada "runa" é uma lista de células de Excel que **desenha um dígito**. Sem âncora, é cifra de catálogo.

---

## 6. Fora do escopo / degradações honestas

**#17 burocráticos extra (CID-10, CNAE, FIPE, Anatel, Correios) — descartar.** Zero provas resolvidas no acervo contra centenas de KB de dataset. FIPE é incompatível com o pipeline (JSON commitado dentro da imagem, `expires 1d` no nginx ⇒ dado mensal nasce desatualizado); Correios exige API autenticada; Anatel não tem bulk. Sobrevive só o **reconhecimento de forma alfanumérica** (rastreio `AA123456789BR`, placa Mercosul, CNAE `00.00-0/00`, CID-10 `A00.0`) — que é o mesmo entregável do #19. **Adotar sob demanda**, quando uma prova concreta pedir.

> **Revisto na onda 6 — e o parágrafo acima errou em dois pontos, não em um.** (1) "Correios exige API autenticada" vale para *rastrear* (saber onde o pacote está), **não para ler o código**: o padrão UPU S10 tem DV mód-11, tabela de serviço e sufixo de país publicados na norma, tudo offline. O `correios` entrou sem rede. (2) "Placa Mercosul" estava listada como *reconhecimento de forma* — mas a conversão antiga ↔ Mercosul e a UF pela faixa de letras também são aritmética e tabela, e viraram o `placa-veiculo`. **O que continua de pé é o critério pelo custo, não pela lista:** CID-10, CNAE, FIPE e Anatel seguem descartados porque são **dataset**, e dataset sem prova não entra. Ver §4, "Onda 6".

**#19 gov-recognizer — não pode ser decoder, por um motivo anterior à regra de não raspar: os códigos não têm assinatura.** Uma votação do TSE é `5356`; um VM é "um nº arbitrário e estável de ~4 dígitos"; uma plaqueta de poste é um número. Não existe regex, DV ou faixa que os distinga de qualquer número — um decoder disparando em "4 dígitos" seria ruído puro e provavelmente sumiria no dedup. O entregável é **documentação no lugar certo**: uma `<Section>` "Bases e onde consultar" na **aba Cola** (quem está numa gincana às 23h abre a Cola, não o Roadmap), com base, o que indexa, link oficial e selo de status. Fonte única em `reference/sources.ts`, consumida também pelo Roadmap.

**Bases bloqueadas — respeitar literalmente a decisão já registrada** (`roadmap-content.ts:34,40`):
- **Cidade Iluminada / Exati (postes):** reCAPTCHA Enterprise + login, sem bulk. Não burlar captcha de terceiro comercial. Caminho: pedido oficial (LAI/PPP de iluminação).
- **SIATU / planta de valores (VM):** ASP.NET WebForms (`__VIEWSTATE`), sem CORS. Caminho: dados abertos via LAI → JSON offline, como já foi feito com ruas e CEP.
- **TSE:** portal sem JSON aberto amigável. Reconhecer + linkar.
- **Faber-Castell / Pantone:** o primeiro só existe em encarte impresso (ampliar por digitação manual, como as 11 cores do gabarito); Pantone é catálogo proprietário licenciado — **não entra**, e o TODO deveria dizer isso em vez de listá-lo como dataset de fabricante.

**Mecânicas que não são texto:** revelação por calor/UV (A17), overlay (A21), cofre (A31), Família D (encenação) e Família E (áudio/vídeo, salvo subproduto textual) — o TODO já acerta em excluí-las. Acrescentar: **adulteração visual** (Basta Isso, Bandeiras, Sonho Perturbado) e **contagem de setores em imagem** (GIA-17) caem na mesma categoria.

**Sem âncora testável:** `RESOLUCOES.md` cobre 2017/18/19/22/23 + GIA; **2024, 2025 e 2026 não têm nenhuma cadeia documentada**. Qualquer item ancorado em prova recente (*Vive La Resistance*, *Itens Raros*, *Abro no Fecho*, *The Goblet*) será implementado sem teste ancorado no corpus — e isso precisa ficar escrito na ficha, não descoberto depois.

> **Corrigido na execução.** A premissa acima vale para o `RESOLUCOES.md`, não para o acervo. *Vive La Resistance* **tem** resolução — na pasta da própria prova, não no índice consolidado (§8-D1). A lição de método: `RESOLUCOES.md` é um recorte, e "não está no índice" não é "não existe". Antes de declarar um item sem âncora, olhar `acervo/<edição>/<prova>/texto/resolucao.md`.

---

## 7. Riscos e decisões que dependem do dono

| # | Pergunta | Recomendação |
|---|---|---|
| 1 | **GIA-30 *Sinfonia Silenciosa*: a resposta é TEATRO?** Calculei a 5ª letra do fim, ignorando espaços, dos 6 títulos do VLAD V → T-E-A-T-R-O, coerente com "o melhor lugar para ouvir" e com o Teatro Carlos Gomes (marco listado em `GIA-2026.md:251`). O acervo não registra a palavra final | **Confirmar.** Vira fixture do item 1 e fecha uma pendência do próprio acervo |
| 2 | **A célula 038/LILAS/3 do gabarito Faber-Castell está errada?** `Lilás[3]` = L, o gabarito diz A (comprimento de barra 4?) | Marcar como **known-bad** no teste (11/12 conferem). Sem isso, alguém vai caçar bug no código por horas |
| 3 | **CRJA: 5356 é IVAN NAATZ (tabela do TSE) ou Ismael (tabela de derivação)?** Não muda a letra (ambos dão I na posição 1), mas contamina o fixture | Adotar a tabela do TSE e anotar a divergência |
| 4 | **A5 é "a mecânica mais recorrente da GIA" (`DICIONARIO-CIFRAS.md:88`) ou as fichas mandam?** As fichas etiquetam Romanos/CRJA/Desenhar e Colorir/No Detalhe/Esquentou como **A4** | **As fichas mandam.** Corrigir o dicionário e rebaixar o item 2 para MÉDIA |
| 5 | **Wordlist no score: pt+en ou só pt?** Medido: "topo" (resposta de GIA-01) **não está** em `words-pt.txt`, só na inglesa | **Os dois**, com gate de 4 letras (falso positivo medido: 1 em 250) + `puzzle-words.ts` para GEOTUDE/MAPCODE/COVID, que nenhuma das duas listas tem |
| 6 | **Aceita +868 KB gz (pt) e +634 KB (en) carregados em `requestIdleCallback` na aba inicial, e ~20-30 MB de heap?** Hoje só quem abre Anagramas paga | **Sim**, com degradação graciosa (antes do load, score idêntico ao de hoje). Plano B se o perfil piorar: subconjunto de ~40k palavras de alta frequência (~400 KB), **nunca** afrouxar o gate |
| 7 | **Mapcode: aceita o primeiro `import()` dinâmico do projeto (313 KB gz de chunk lazy)?** Alternativa: endpoint no backend (zero bundle, quebra o offline) | **`import()` dinâmico**, com comentário no topo do módulo avisando que trocar por import estático dobra o tempo de carga da bancada para todo mundo |
| 8 | **Onde `data-sources/ceps-sc.csv`?** Gitignored e ausente ⇒ `pnpm build:data` **quebra numa clonagem limpa** (e `build:streets-geo` depende dele). `words-en.txt` idem, depende de `/usr/share/dict/words` | Guardar o CSV fora do repo com um README apontando o local, e marcar `ceps.json`/`words-en.txt` como **blobs versionados** no doc de dados |
| 9 | **Os dois backlogs se fundem?** `docs/TODO-CIFRAS.md` (técnico, invisível) × `help/roadmap-content.ts` (curado, exposto ao usuário na aba Roadmap) | **Não fundir:** o `docs/` vira o plano técnico (este documento) e o `roadmap-content.ts` a vitrine — mas cada um cita o outro, e "Decodificação recursiva"/"Cores como decoder" mudam de status quando as ondas 1 e 4 entregarem |
| 10 | **A regra de escopo "só offline" deve ser reescrita?** Já é violada por 4 decoders em produção via `api()` | **Sim:** "consulta externa é permitida desde que passe por `lib/api.ts` (cache, rate-limit, chave no servidor) e degrade graciosamente quando o backend cair; o `decode()` continua síncrono e puro" |
| 11 | **`acrostic` fica redundante com a aba Texto — aposentar?** | **Manter.** É atalho determinístico no fan-out; a aba é exploração manual. O critério geral: **o que precisa entrar numa cadeia é decoder; o que é exploração sobre texto longo é aba** |
| 12 | **O campo aux aparece no fan-out ou só no modo "uma cifra só"?** Sempre visível custa uma linha permanente no mobile; só no modo cifra tira letter-index/diff da descoberta por acaso | **Botão discreto "+ 2º campo"** no fan-out; uma vez preenchido, permanece e os decoders `required` entram na corrida. Preencher o campo **é** o gatilho |
| 13 | **`import()` dinâmico e wordlist mexem no perfil de carga; e não há um único teste de componente no repo** | Aceitar por ora, mas a onda 1 é a hora de criar o **primeiro `*.test.tsx`** (trilha + badge), senão toda mudança de UI segue sem rede de segurança |
| 14 | **Vale extrair as resoluções de 2024–2026 antes de implementar os itens ancorados nelas?** | **Sim, e antes da onda 4** — é o que dá teste verídico ao `resistor` e a mais três itens; hoje eles nascem sem âncora |

**O que a execução fechou:** 2 (célula 038 é known-bad, fixada no teste — §8-D2), 4 (as fichas mandaram: `count-key` entrou como MÉDIA), 5 (pt+en com gate de 4 letras), 6 (sim, com degradação graciosa: sem wordlist carregada o score é o de antes), 7 (`import()` dinâmico, isolado numa função), 10 (regra de escopo reescrita — ver o cabeçalho de `TODO-CIFRAS.md`), 11 (`acrostic` mantido, e o critério "decoder × aba" virou regra), 12 (botão "2º campo", e preencher é o gatilho), 14 (parcialmente: *Vive La Resistance* tinha resolução na pasta da prova — §8-D1).

**Ponto 3 (CRJA: 5356 é Ivan Naatz ou Ismael?) não precisou de decisão:** o fixture usa a lista inteira dos 13 candidatos, com os dois nomes em posições diferentes, e o `zipIndex` fecha TITULOELEITOR de qualquer jeito.

**O que continua aberto e depende do dono:**

- **1 — GIA-30 *Sinfonia Silenciosa*: a resposta é TEATRO?** Continua sendo **derivação nossa**. O acervo (`GIA-2026.md:213-216`) registra a regra ("a 5ª letra de trás para frente" de cada título do VLAD V) e a **entrega como "um local"** — a palavra final não está escrita em lugar nenhum. TEATRO está fixado como fixture em `positions/zip.test.ts` e `acrostic-nth.test.ts`, com o comentário dizendo que é derivado. Se o dono confirmar, o fixture vira verdade documentada e uma pendência do próprio acervo se fecha; se desmentir, dois testes mudam.
- **8 — `data-sources/ceps-sc.csv`** segue gitignored e ausente: `pnpm build:data` ainda quebra numa clonagem limpa.
- **13 — nenhum `*.test.tsx` no repo.** A onda 1 era a hora, e passou: a trilha, o selo de palavra real, a faixa de chips e a aba Diferenças são UI **sem um único teste de componente**. A verificação segue manual, a ~375px e em desktop.
- **14 — resoluções de 2024–2026** ainda não extraídas para o índice consolidado; *Itens Raros*, *Abro no Fecho* e *The Goblet* seguem sem âncora.
---

## 8. Divergências encontradas na implementação

O que a execução das ondas 0–5 contrariou. Cada uma está **fixada em teste** — a divergência não
vive só aqui, vive na suíte, que é o que impede alguém de "corrigir" o código de volta ao erro.
Severidade: **alta** = muda a resposta de uma prova · **média** = muda o portão ou a ficha ·
**baixa** = imprecisão de catálogo.

### D1 — *Vive La Resistance* **tem** resolução no acervo, e a resposta são os dígitos · **alta**

O plano afirma duas vezes (§2, linha do item 13; §6 "sem âncora testável") que a prova existe mas
**não tem resolução**, e que o `resistor` nasceria sem teste ancorado. **É falso.** A resolução está
em `acervo/itc-2025/p14-vive-la-resistance/texto/resolucao.md` — mais a captura da calculadora
DigiKey em `imagens/02-…`. O erro de método foi olhar só o `RESOLUCOES.md` consolidado (que cobre
2017/18/19/22/23 + GIA) e concluir "não existe" a partir de "não está no índice".

E a resolução muda o **entregável** do decoder: a prova não usa o valor em ohms. As 6 cores do texto
dão **742 MΩ ±0,5% · 50 ppm/K**, e o que a cadeia consome é `742` → troca simples número→letra →
**GDB** (o nome da loja). Por isso o `resistor` emite **dois** candidatos, e o segundo é o dos
**dígitos significativos**, com `chainValue` limpo para a barra de Cadeia. Um decoder que só
respondesse "742000000 Ω" estaria certo na eletrônica e inútil na gincana.

*Fixado em:* `decoders/resistor.test.ts` ("lê as 6 faixas da ITC25-P14").

### D2 — GIA-39 Faber-Castell: a leitura correta é UM**L**BICICLETA · **alta**

As 12 células do gabarito, lidas pela regra da própria prova (k-ésima letra do nome da cor,
ignorando espaço, acento valendo 1), dão **UMLBICICLETA** — não UMABICICLETA. Onze células fecham
exatamente; a **038** não: o código 038 é *Lilás*, e `Lilás[3]` = **L**, enquanto o gabarito declara
**A**. O erro é do gabarito, não da contagem: em 4 das 11 células restantes o índice pedido **passa
por cima do espaço** do nome ("Laranja escuro"[11] = U, "Amarelo canário"[8] = C, "Verde claro"[6] =
C, "Marrom claro"[8] = L) e mesmo assim fecham — o que descarta a hipótese de a regra de
normalização estar errada, que seria a explicação alternativa.

Isto foi previsto como risco nº 2 do §7 e **confirmou-se**. Está fixado como **known-bad** em dois
lugares, com comentário explícito de "não caçar bug aqui" — sem isso alguém perde horas procurando
defeito num código correto.

*Fixado em:* `decoders/faber-castell.test.ts` (a asserção é `UMLBICICLETA`) e `positions/zip.test.ts`.

### D3 — GIA-28: a regra não é "uma letra por ator" · **alta**

O acervo (`GIA-2026.md:201-203`) descreve a costura como "colher a letra da junção de cada ator" e
registra em nota que o elenco extraído renderia `OSEMFORSTA`, atribuindo a diferença a "provável
perda de 2–3 atores na extração ou erro de montagem da CP". **Não há ator perdido.** São 10 atores e
a resposta OS SEM FLORESTA tem **13 letras**: a regra vale por **junção entre palavras
consecutivas**, e três nomes do elenco têm três palavras (Tavares **S**tannis **S**ouza, Afeff
**F**isterol **L**ederof, Dagmar **R**enilde **E**stevan), rendendo duas letras cada. 7×1 + 3×2 = 13.

Consequências de projeto: (a) o decoder itera palavras dentro da linha, não linhas; (b) as duas
leituras — última letra do nome e primeira do sobrenome — são **variantes separadas** e não um par
concatenado, porque em GIA-28 elas coincidem e o par duplicaria cada letra
(`OOSSSSEEMMFFLLOORREESSTTAA`); (c) a nota do acervo pode ser corrigida: a extração está completa.

*Fixado em:* `decoders/acrostic-nth.test.ts` (o elenco inteiro → `OSSEMFLORESTA`, um único cartão).

### D4 — GIA-30 *Sinfonia Silenciosa*: TEATRO continua sendo derivação nossa · **média**

Não foi resolvido pela implementação, e **não deve ser tratado como resolvido**. O acervo registra a
regra e a lista dos seis títulos do VLAD V, e descreve a entrega apenas como "um local"; a palavra
final não aparece. TEATRO é o que a regra produz e é coerente com o Teatro Carlos Gomes, mas segue
**pergunta em aberto ao dono** (§7, item 1). Os dois testes que a usam dizem isso no comentário.

### D5 — GIA-01: a culpa não era de o `binary` exigir octetos separados · **média**

O plano (§2, última linha do bloco "alta") explica a falha dizendo que "o decoder `binary` exige
octetos já separados". **Não exige:** `decodeBinary` faz `input.trim().split(/\s+/)` e **junta** os
grupos antes de validar, então tanto `01010100 01001111` quanto `0101010001001111` decodificam hoje.

A causa real é outra e é mais simples: depois da junção, o codec valida `/^[01]+$/` sobre a string
**inteira**. Qualquer vírgula, ponto, letra ou parágrafo de prosa reprova a entrada — e GIA-01 é
justamente números enterrados em prosa com vírgulas ("0,10", "100", "0,100", "111"). O que faltava
não era tolerar octetos colados: era **descartar tudo que não é dígito** antes de repartir. Daí o
`digit-regroup`, que também é o que permite blocos de 7, 6, 4 e 2, e não só de 8.

*Fixado em:* `decoders/digit-regroup.test.ts` — o texto de *Ask Me* na íntegra → **TOPO**. E o
`digit-regroup` recua explicitamente (`if (/^[01]+$/.test(input.replace(/\s+/g, ""))) return []`)
quando a entrada é só 0 e 1, espaçada **ou** colada: esse território é do codec `binary`, e duplicar
o cartão dele seria ruído, não achado.
*Nit pendente:* o cabeçalho de `decoders/digit-regroup.ts` ainda repete a explicação antiga
("exige os octetos já separados por espaço") — corrigir na próxima passagem pelo arquivo.

### D6 — `color-convert`: `hsl(120,100%,25%)` é canônico, não verídico · **média**

O plano lista a tripla HSL entre as âncoras de *Piloto do Século* (ITC23 P11) como se fosse valor
extraído da prova. **Não é.** A prova dá matiz/saturação/luminosidade derivados de concursos da
Mega-Sena; `hsl(120,100%,25%)` → Verde é um caso **canônico** escolhido para exercitar o caminho
HSL→hex→nome, e o teste diz isso. As âncoras verídicas de cor continuam sendo as 6 triplas RGB de
2022 P3 (→ BANANA), o `rgb(255,165,0)` de 2019 P4 e os 4 hexes de 2023 P19.

Divergência menor no mesmo item, também fixada: em 2023 P19 o gabarito chama `#00ff00` de "verde"
(nomenclatura da Encycolorpedia); na lista pt-BR esse hex é **Verde espectro**, e "Verde" é
`#008000`. O hex — que é o que a prova entrega — casa exato; o nome diverge por origem de catálogo.

### D7 — GeoTude: o portão ficou em **≥2** grupos pontuados, não ≥1 · **média**

A ficha #7a manda "exigir ≥1 grupo pontuado (`^\d{4,6}(?:\.\d{2})+$`)". Na implementação isso é
frouxo demais: com um único par, o código não se distingue de um decimal comum (`15586.77` é preço,
não lugar — e a bancada recebe números assim o tempo todo) e a precisão seria de 0,1° — ~11 km, que
não é localização. O serviço, aliás, não emite código assim. `decodeGeoTude` devolve `null`
abaixo de dois pares; a faixa de latitude/longitude é o segundo portão, e é ele que descarta as
datas `AAAA.MM.DD` (ano de 4 dígitos ⇒ latitude entre 91 e 108).

### D8 — O 2º campo entrou, mas quase ninguém o consome · **média**

O plano trata o #21 como "pré-requisito duro dos itens 1 e 5". A armadilha técnica prevista era real
(os helpers de `define.ts` descartam opção desconhecida, e sem repassar `inputs` o campo compilaria
sem existir em runtime) — mas o **consumo** não se confirmou: `letter-index` lê os índices de
`ctx.key` e as fontes das linhas da entrada; `vowel-cipher` lê os deslocamentos da própria entrada,
com `ctx.key` só como modo secundário; e o `diff-source` virou aba, sem passar pelo `DecodeContext`.
Resultado: **`ctx.aux` tem um único consumidor** — o `count-key`, para o caractere a contar — e
**nenhum decoder marca `required`**, de modo que o filtro do fan-out (`use-decoder.ts:143`) existe
sem exercício em produção. O campo não é desperdício (é o gancho declarativo para a próxima cifra de
dois operandos), mas a ficha superestimou a dependência.

### D9 — Kaprekar de 2019: 3 passos, contra os 4 do gabarito · **baixa**

Previsto na ficha #6 e **confirmado por execução**: `2010` fecha em 3 passos
(2100−0012=2088 → 8820−0288=8532 → 8532−2358=6174), não 4. O código verídico da prova é **4377**, e o
gabarito de 2019 registra 4477. Como o plano mandava, o algoritmo **não** foi ajustado para bater com
o gabarito. *Fixado em:* `features/math/arith.test.ts`, com o comentário "não ajustar".

### D10 — O `cipher-disk` não caiu, e o `#14` não entrou inteiro · **baixa**

Duas fichas traziam condicional de descarte. O **#9 cipher-disk** dizia "sem o card SVG, descartar" —
o card foi feito (`render: "wheel"`, `wheel-card.tsx`), então o item entrou como planejado. Já o
**#14** entrou em duas partes de três: `letter-values` (primos, gematria, redução) e as legendas de
**Pigpen e Libras** na Cola; as **runas Elder Futhark** seguem adiadas exatamente pelo motivo escrito
na ficha — a "prova de runas" de 2019 não usa alfabeto rúnico, cada runa é um dígito desenhado com
células de planilha. Sem âncora, não entra.
