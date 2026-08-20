<!-- Consolidado em 2026-08-19. Tudo aqui foi conferido rodando, não lembrado.
     Fontes: docs/PLANO-CATALOGOS.md · docs/ARROMBA-INVENTARIO.md · medições desta sessão. -->

# Pendências — o estado real

Três colunas de responsabilidade, porque misturá-las é o que faz item ficar parado:
**nosso** (eu executo), **dono** (só você decide), **terceiro** (depende de alguém de fora).

---

## 0 · Fechado hoje — para não voltar como proposta

| item | o que ficou |
|---|---|
| **Cauda de geohash com prefixo único** | Era o defeito mais grave da bancada: **62,6%** das caudas de Blumenau saíam erradas, **27 km** de erro médio, **0,0%** de rejeição. Os prefixos agora são **calculados da caixa** (`geohashPrefixes`) e a cauda devolve **todas** as leituras. Medido depois: ponto certo entre as leituras em **98,8%**. |
| **A cauda continua no leque** | Decisão sua, registrada em `formats.ts`. A régua R1 do plano pediria tirá-la (rejeição ~0%), mas a regra de que localização distante é válida pesa mais. Preço aceito e medido: `1400m` dá 5 cards de 0,52. Gatilho de reabertura: custo de espaço, nunca correção. |
| **Nota nova `CONFIANCA.atalhoAmbiguo` = 0,52** | Acima do Geohash global (0,50) porque as leituras caem no Vale; abaixo de `atalhoFraco` (0,55) porque quem devolve 3 pontos acertou no máximo um. Rótulo "(1 de 3)". |
| **Acervo de provas do Arromba** | 105 arquivos, 100 MB, em `acervo-arromba/` (gitignorado). Inclui as resoluções de 2024/2025 — **o material que a F3 esperava**. |

---

## 0.5 · Anotado para depois — não esquecer

| # | item | onde |
|---|---|---|
| ~~**A**~~ | ✅ **FEITO em 20/08/2026** — `src/features/reference/inventario.test.ts`. Ele falha quando uma linha do inventário diz `trazer` e o decoder já existe. **Pegou três mentiras na primeira execução**: alfabeto dado, Morbit e Pollux, todos entregues pela Onda 9 e ainda listados como pendentes. A Onda 0 está fechada. | `docs/INVENTARIO-CATALOGOS.md` + o teste |
| **C** | **O `leetspeak` herda a legibilidade da prosa que ele NÃO decodificou.** Medido: em `Fatore em primos: 60 84 210` ele devolve `Fatore em primos: go ba zio` e tira **0,73**, acima do `math-helper` (0,62) que resolveu a pergunta. A prosa passa intacta, só os dígitos mudam, e o `scorePlaintext` vê um texto quase todo português. Vale para qualquer decoder que altere pouco da entrada. Consertar toca a pontuação global — provavelmente uma penalidade proporcional à fração NÃO alterada —, então não entrou de carona numa onda. | `engine/score.ts` + `bruteDecoder` |
| **B** | **A transliteração de `ᛇ` (eihwaz).** A bancada escreve `ei`; a convenção acadêmica é `ï`. Divergência estética — o repositório dobra tudo para ASCII, como já faz com `th` (þ) e `ng` (ŋ) —, e está registrada na legenda de runas. Se for alinhar, é uma linha. | `src/features/reference/alphabets.ts:513` |

---

## 1 · Nosso — conserto dentro de regra já escrita, sem decisão pendente

| # | item | esforço | estado conferido |
|---|---|---|---|
| 1.1 | **Cauda de UTM** | P (~2 h) | O atalho mais seletivo do conjunto: rejeita **98,67%** contra a VALE_BBOX (Plus Code 79,8%; cauda de geohash 18,3%). O Vale cabe em `E 653.868..744.044 · N 6.978.196..7.067.846` — portão de assinatura, não palpite. Hoje `parseUTM` exige zona+banda, então `692000 7021000` não é lido. Bônus: `utmZone` deixa de ser campo morto e o literal `"22J"` sai do `mgrs.ts`. |
| 1.2 | **Letras por linha no `countSeries`** | P (~1 h) | Confirmado ausente: `counts.ts` emite 4 séries e nenhuma conta letras. Âncora p04/2024 (20-5-14-5-20 → TENET). O `count-key` já faz a leitura A1Z26 de graça. Entra sem tocar em ranking nem score. Cuidado: `RE_WORD` conta letra **e** dígito — a série nova precisa de letra pura. |
| 1.3 | **Morse com separador tipográfico** | P (~30 min) | Portão é `/^[.\-/\s\|]+$/`. Um ponto médio ou travessão colado de PDF derruba a entrada e a bancada cala. Um `replace` antes do portão. |
| 1.4 | **Braille ⠼ e ⠠** | P (~1 h) | `decodeBraille` troca o desconhecido por `?`: `⠼⠁⠃⠉` (o número 123) sai `?abc` e é entregue como leitura boa. |
| 1.5 | **Dígito não-ASCII na porta** | P (~1 h) | `use-decoder.ts:205` usa `\D`, que em JS é só 0-9 — dígito árabe-índico é **apagado** e todo decoder numérico cala em silêncio. É normalização de entrada, não decoder. |
| 1.6 | **Mojibake (`informaÃ§Ã£o`)** | P (~2 h) | Não casa com a wordlist, perde o selo de palavra real e a cadeia despenca. Assinatura literal. |
| 1.7 | **A vitrine mente em dois lugares** | P (~30 min) | `roadmap-content.ts:71` diz que as runas ficaram de fora "por falta de prova-âncora" — elas estão em `alphabets.ts:513/573` e a âncora existe. E "Engine esperto" segue como *Ideia* com solver de substituição, quebra de Vigenère e detector de cifra — **os três entregaram**. |
| 1.8 | **`build:data` destrói o `streets.json`** | P | O passo 1 sobrescreve o artefato **versionado e enriquecido** pela versão crua sem coordenada, e derruba 3 testes. O comando deixa o repositório pior do que encontrou. (A outra metade é decisão sua — ver 2.3.) |

---

## 2 · Dono — só você decide

| # | pergunta | por que é sua |
|---|---|---|
| 2.1 | **Testes de ponta a ponta** | Conferido: zero `*.spec.ts`, Playwright nem instalado, CI roda lint/typecheck/test/build. 128 arquivos de teste, **2 de componente**. As ondas que mexem em ranking e fan-out entram sem rede se não liberar. Está registrado como "eu, quando mandar". |
| 2.2 | **Os cinco argumentos falsos nos docs** | Náutico (`PLANO-2026-08.md:119` **e** `:437`) · Enigma (`:458`) · anagrama (`TODO-CIFRAS.md:155`) · runas (4 lugares) · A31 (2 lugares). O F3 é explícito: *muda a razão, não o veredito* — então cada veredito é seu; a redação é minha. |
| 2.3 | **`build:ceps` sai da cadeia, ou o CSV volta?** | Numa clonagem limpa o passo 2 morre com ENOENT em `data-sources/ceps-sc.csv` (gitignored). Pergunta 6 do §8 do `PLANO-2026-08`, ainda sem resposta. |
| 2.4 | **Escrever a decisão sobre as 41 resoluções** | Você mandou ignorar o item, mas o `PLANO-MELHORIA` ainda o lista como aberto e o chama de *"a única fase que produz evidência nova"*. **E o contexto mudou: o material está baixado.** Decisão que não vira linha de documento volta como proposta. |
| 2.5 | **O custo de espaço da cauda de geohash** | Fechado hoje a favor de manter. Fica aqui só como gatilho: se cinco cards no topo incomodarem numa prova real, a saída é a aba Geolocalização. |

---

## 3 · Terceiro — não depende de nós

| # | item | caminho |
|---|---|---|
| 3.1 | **Vagas da área azul (3.448) e matrícula SAMAE** | Você decidiu trazer, com procedência registrada como não verificada. O caminho é **pedir os arquivos ao colega** — nós tentamos as duas e falhamos (MITM do Rek Pay; reCAPTCHA do SAMAE). |
| 3.2 | **Imóvel rural INCRA · folha cartográfica · abrigos da Defesa Civil · Cacarecos** | Mesma via: o Arromba já tem. Pedir o dump em vez de recoletar. |
| 3.3 | **Mapa de assentos de cinema** | Sem rota: `checkout.ingresso.com/robots.txt` = `Disallow: /`, Arcoplex 403, nenhum endpoint de mapa. Caminho honesto: `api-content.ingresso.com/v0/sessions/{id}` dá sala e sessão sem chave; o mapa, se uma prova exigir, se pede à exibidora e se transcreve **uma vez** — grade é dado estável. |
| 3.4 | **Piso e número de loja no Neumarkt e no Norte** | 255 das 337 lojas não têm piso publicado em lugar nenhum. Não é bloqueio, é ausência de publicação: entram como `consulta-manual` até alguém pedir a planta à administração. |

---

## 4 · Em análise agora

Quatro frentes rodando, para virar o plano de ação único:

- **Porte da cadeia recursiva** com a nossa pontuação (eles têm BFS funcionando; nós temos 451 mil palavras contra as ~200 deles).
- **As bases locais do Arromba** — contrato, portão e onde o dado mora.
- **Re-veredito das 15 cifras** que eles implementaram e nós recusamos por escrito. O critério não mudou; o custo de trazer, sim.
- **Desenho executável de IMDb, Spotify e aba Lote.**

---

## 5 · Fora, com gatilho escrito

- **Onda 2** (senha do Postgres, backup, `sync-data`) — fora por decisão sua. Ressalva: o placar joga `sync-data` em "fora" mas a tabela mantém `build:data` aberto; as duas metades precisam ser separadas (item 1.8 + 2.3).
- **67 capacidades dos cinco catálogos** — recusadas com critério e gatilho em `docs/PLANO-CATALOGOS.md` §3. A frente de re-veredito pode mexer em até 15 delas.
- **F8, F11, F14, F16** — não são capacidade dos catálogos e seguem na fila própria. Este documento não as promove nem as rebaixa. (F8 pode mudar: o Arromba tem marco geodésico do IBGE.)
