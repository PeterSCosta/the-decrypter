<!-- Plano de execução gerado em 2026-08-19, sobre docs/PLANO-CATALOGOS.md (ondas 0..5), docs/INVENTARIO-CATALOGOS.md (122 verbetes), docs/ARROMBA-INVENTARIO.md e as quatro frentes de medição (A cadeia · B bases do Vale · C re-veredito das cifras · D IMDb/Spotify/Lote).
     Linha de base declarada pelo dono: 117 decoders, 14 abas, 1.559 testes verdes — NÃO re-medida nesta passada.
     Destino sugerido: /Users/peter/Repos/the-decrypter/docs/PLANO-EXECUCAO-2026-08.md
     Nenhum arquivo do repositório foi editado para escrever este documento. -->

# Plano de execução — as quatro frentes fundidas ao plano dos catálogos

**Data:** 2026-08-19 · **Repositórios:** `/Users/peter/Repos/the-decrypter` e `/Users/peter/Repos/the-decrypter-api`

Este documento **não substitui** `docs/PLANO-CATALOGOS.md`. Ele funde as quatro frentes novas com o que sobrou de lá, resolve os conflitos de ordem entre os dois, e passa a ser a única fila de execução. Onde um item vem do plano antigo, o número antigo aparece como `PC-x.y`; onde vem de uma frente, aparece como `A/B/C/D-n`.

**Regra de leitura:** toda linha com número traz o comando ou o arquivo que a produziu. Onde eu não medi, está escrito **não medido**. Três números deste documento são do dono ou de terceiro e estão marcados como tal.

---

## 0 · Estado da execução — 19/08/2026

| onda | estado |
|---|---|
| **0 · a bancada mente** | **FEITA** — 10/10. O item 0.10 fechou em 20/08 e pegou três mentiras na primeira execução |
| **1 · o portão que falta** | **FEITA** — `coverage().analisado` e `maiorPedaco()`, aditivos |
| **2 · transposição sem chave** | **FEITA** — o portão foi recalibrado contra o vocabulário real |
| **3 · só existe aqui** | **FEITA** — 6/6. A soletração mudou de desenho: virou acrofônica, sem tabela (ver abaixo) |
| **4 · motor sem tela** | **FEITA** — aba Retrato, régua do IC na Cola, busca por padrão nos Anagramas |
| **5 · dados do Vale** | **4,5/9** — marcos por perto (5.3), folha cartográfica municipal (5.4), base de estações enriquecida (5.1), chapa como segunda entrada (5.2) e a metade aplicável do carimbo de procedência (5.9). **Os quatro que faltam (5.5–5.8) dependem de arquivo do colega** — não há trabalho nosso pendente na onda |
| **6 · catálogos concordam** | **9/10** — falta só quebrar hash por força bruta (precisa de Worker) e a leva e2e, que é decisão do dono |
| **7 · IMDb / Spotify / Lote** | **2/3 + 1 cancelado** — card de filme (7.2, só por API) e **aba Lote (7.3)**. O recorte local (7.1) foi cancelado pelo dono; falta só o Spotify |
| **9 · os caros que sobraram** | **FEITA** — 4 entregues (homóglifos, alfabeto dado, Pollux/Morbit, LSB de imagem) e a mesa de substituição recusada com número |
| ~~8 · cadeia automática~~ | **CANCELADA** por decisão do dono |
| **10 · aba de fichas** | **AVALIADA em 20/08** — como pedida, **não pode existir**: o nome não resolve para uma entidade só. O que existe é uma **triagem de candidatos**, e ela é um segundo MODO da aba Lote, não uma aba. Ver abaixo |

**O que a Onda 2 entregou, medido contra as 451.016 palavras reais:** 45/45 de acerto, **zero
falso positivo** em cinco famílias de ruído, 1,18 card por entrada, 1,05 ms no pior caso (3% do
fan-out). Ao vivo, `ASAUANDAFARTNMOEADEEAOESIPAISEMNPRRPTPSOTIOARUOTNOOSCER` devolve
`ARESPOSTAESTANOMONUMENTOAOSPIONEIROSDAPRACADAPREFEITURA` em **#1 a 0,79**, acima do `railfence`
a 0,73 — que antes liderava com lixo e sem a resposta certa na lista.

> **A DESCOBERTA DA ONDA 3, e ela derruba a premissa escrita neste plano.**
>
> O item 3.1 previa um decoder de TABELA — casar tokens contra uma lista brasileira fixa —, e
> justificava o esforço M dizendo que *"as palavras brasileiras são substantivos comuns e um
> portão de 60% dispararia em prosa portuguesa"*. O levantamento mediu e achou duas coisas:
>
> 1. **Não existe norma brasileira de soletração em palavras portuguesas.** ANATEL (Res.
>    449/2006, revogada) só permite o "Código Fonético Internacional", sem tabela; o DECEA
>    publica o **ICAO, em inglês**; o manual de comunicações do Exército foi lido inteiro e tem
>    zero ocorrências de "fonétic" ou "soletr". E a lista brasileira mais citada remonta a um
>    domínio morto, nunca arquivado — ela não tem fonte primária.
> 2. **O portão de 60% NÃO dispara em prosa.** Medido em 262.364 tokens (81 provas do acervo +
>    a documentação pt-BR do repositório): **zero vezes**, nem com a lista inflada a 67 palavras.
>    Prosa corrida não encadeia substantivos concretos.
>
> **A premissa estava errada e o veredito continua certo, por outro motivo.** O risco não é a
> prosa: é a entrada curta e listada ("amor, bola, casa, dado" é enunciado plausível) e a
> disputa de topo. E o desenho mudou por completo — **o decoder não usa tabela**. Ele lê a forma
> "X de Palavra" e confere a ACROFONIA, que se autoverifica sem lista nenhuma. As três listas
> vão para a Cola, como consulta e com a procedência de cada uma.
>
> Um decoder de tabela inventaria autoridade que não existe e erraria toda vez que a prova
> usasse outra palavra.

> **A lição da Onda 2, que vale para todo item futuro:** a primeira calibração usou um conjunto
> de teste de 15 palavras e mediu 54/54 de acerto com 0 falso. Contra o vocabulário de verdade
> ela deixava passar **13% de variantes erradas** — e, pior, **calava na resposta certa**, porque
> o texto cifrado também continha uma palavra de 5 letras por acaso e disparava o retorno
> antecipado. **Portão de saída se calibra contra o vocabulário real, nunca contra o conjunto do
> teste.** Foi o navegador que expôs isso, não a suíte.

---

## 0.1 · O que já foi feito da Onda 0, hoje

Medido agora com `git -C /Users/peter/Repos/the-decrypter diff --stat` — 6 arquivos, 225 inserções, **ainda não commitado**:

| item | estado | evidência |
|---|---|---|
| **PC-0.1 · o 4º caractere do geohash** | **FEITO** | `src/features/location/formats.ts` reescrito: os prefixos passaram a ser calculados da caixa da cidade, não declarados em `anchors.ts`. |
| **PC-0.2 · geohash devolve as duas cidades** | **FEITO** | `formats.ts:786` — `confianca: pts.length > 1 ? CONFIANCA.atalhoAmbiguo : confianca`; o retorno virou lista. |
| **nota nova** | **FEITO** | `formats.ts:62` `atalhoAmbiguo: 0.52`, abaixo do `atalhoFraco: 0.55` de `formats.ts:97`. |
| **a Cola conta a limitação** | **FEITO** | `git diff src/features/help/help-content.ts`: o verbete da cauda de geohash passou de *"antepõe o prefixo da cidade — Blumenau 6gjn / Itajaí 6gjq"* para o texto que explica por que são várias leituras, e o `esperado` virou `"3 leituras: 6gjn / 6gjp em Blumenau, 6gjq em Itajaí"`. |
| **decisão do dono** | **TOMADA** | A cauda **fica no leque**, na saída (a) das duas que o plano oferecia. Isto é uma **exceção declarada à régua R1** — a rejeição dela é 0,0% contra o piso de 79,8% — e a exceção se sustenta em três coisas que agora existem: a nota caiu para 0,52, a resposta virou lista rotulada, e a Cola diz que uma cauda não identifica ponto. **Ressalva:** enquanto for exceção, ela tem de aparecer nomeada na §4/R1 deste documento, senão a próxima passada a lê como precedente. |

**Ainda aberto da Onda 0 antiga:** 0.3 (Morse com separador tipográfico), 0.4 (Braille `⠼`/`⠠`), 0.5 (dígito não-ASCII), 0.6 (mojibake), 0.7 (a vitrine), 0.8 (`pnpm build:data`), 0.9 (os argumentos falsos). Conferidos agora, um a um, e **todos os quatro de código continuam exatamente como o plano descreveu**:

- `codecs.ts:184` — `if (!/^[.\-/\s|]+$/.test(input.trim()) …` (0.3 aberto);
- `codecs.ts:201-206` — `decodeBraille` troca o desconhecido por `"?"`, e `grep -n "⠼" src/features/reference/braille.ts` não devolve nada (0.4 aberto);
- `use-decoder.ts:205` — `const digits = debInput.replace(/\D/g, "")` (0.5 aberto);
- `grep -rln mojibake src/` → nada (0.6 aberto).

---

## 1 · A ordem

**Princípio, o mesmo da casa, aplicado como critério de fila:** (1) tirar resposta errada de cima; (2) fazer falar onde a bancada já anuncia capacidade e cala; (3) capacidade nova. Onde uma frente e o plano antigo divergiram na ordem, quem ganhou está dito no item.

### Onda 0 (continua) — a bancada mente · 10 itens · 9 P + 1 M · zero capacidade nova · custo por tecla: zero

**0.3 · Morse com separador tipográfico** — P · `PC-0.3`
**Onde:** `src/features/decoder/engine/codecs.ts:184`. **Portão:** um `replace` de normalização **antes** do portão; o portão literal não afrouxa. **Verifica:** teste com `·`, `–` e `—` colados de PDF na mesma entrada, e um caso negativo (texto com hífen que não é Morse continua devolvendo `null`). **Por quê:** um ponto médio derruba a entrada inteira e a bancada cala.

**0.4 · Braille `⠼` (número) e `⠠` (maiúscula)** — P · `PC-0.4`
**Onde:** `src/features/reference/braille.ts` (81 linhas) e o laço de `codecs.ts:201`. **Portão:** o estado "número" vale até o próximo espaço; o que continuar desconhecido segue virando `?` e **continua reprovando a saída inteira**, como já faz. **Verifica:** `⠼⠁⠃⠉` → `123`, e não `?abc`. **Por quê:** hoje o cartão é entregue como leitura boa com o sinal comido.

**0.5 · Dígito não-ASCII na porta** — P · `PC-0.5`
**Onde:** `src/features/decoder/use-decoder.ts:205`. **Portão:** é normalização de entrada, não decoder — não cobra pedágio no ranking nem emite card. **Verifica:** um CEP em dígito árabe-índico acende o mesmo card que o CEP em ASCII. **Por quê:** `\D` em JS é só 0-9; hoje o dígito é **apagado** e todo decoder numérico cala em silêncio.

**0.6 · Mojibake (`informaÃ§Ã£o`)** — P · `PC-0.6`
**Onde:** decoder novo em `src/features/decoder/engine/decoders/`. **Portão:** assinatura literal — `Ã`/`Â`/`â€` em sequência. **Verifica:** o texto consertado passa a casar com a wordlist pt-BR e recupera o selo de palavra real. **Por quê:** sem isto o texto mojibake perde o selo e a cadeia inteira despenca — e a Onda 8 depende do selo.

**0.7 · Marco geodésico: abrir o portão de forma** — P · `B-1` · **conflito resolvido**
**Onde:** `src/features/decoder/engine/decoders/estacao-ibge.ts` (portão) e teste colado. **Portão:** continua **pré-resolvido** — só emite se `porCodigo()` achar; a forma vira `^[A-Z]?\d{1,7}[A-Z]?$`, barata, e quem decide é a base. **Verifica:** teste com as 8 famílias de formato medidas (`9999999`, `9999A`, `99A`, `9A`, `99999`, `999`, `99`, `9`) mais um negativo por família; `99861` e `8120709`, que **estão** na base, passam a acender. **Por quê:** medido pela Frente B sobre as 491 linhas de `public/data/estacoes-ibge.json` — 246 passam (50,1%) e **245 são inalcançáveis (49,9%)**, sendo 226 de 7 dígitos e 19 de 5. É capacidade anunciada que não responde: Onda 0 por classe, não Onda 5. **Ressalva de rótulo, no mesmo item:** o mapa `TIPO` de `src/features/estacao/types.ts` cobre R, V, G, M, e a distribuição real é `{R:232, G:13, E:226, V:14, P:5, D:1}` — **47,3% das linhas** caem no fallback e mostram a letra crua. O campo `tema` da API do IBGE já diz o que é (EG, RN, GPS, VT).

**0.8 · `base36`: apertar o portão do decoder que já temos** — P · `C-3`
**Onde:** `src/features/decoder/engine/decoders/base36.ts` (45 linhas). **Portão:** exigir **letra E dígito** e comprimento **2..13** — hoje `base36.ts` exige só letra e aceita até 64 caracteres. **Verifica:** a re-medição entra no teste, com alvo ≥88% no corpus sintético e ≥99% no real (é o que a versão da Equipe Arromba entrega, medido pela Frente C). Sem a re-medição escrita, não fecha. **Por quê:** rejeição medida de **33,11%** no corpus real de provas contra o piso R1 de 79,8% — o pior número de dentro de casa.
**Ressalva que rebaixa a prioridade, e é minha, contra a leitura da Frente C:** `base36.ts` emite com `forcedScore: 0.3`, e o corte do `partition` é **0,35** (`src/features/decoder/engine/run.ts:73`). Ou seja, ele cai na gaveta, não no topo. Reprova a R1 e por isso entra — mas **não** é "resposta errada com nota alta", é ruído na cauda. Resolvi pelo lado conservador: o item fica na Onda 0 porque a régua vale para o acervo existente, e não só para decoder novo; e fica **atrás** de qualquer item que ponha resposta errada acima de 0,35.

**0.9 · A vitrine e os argumentos falsos** — P · `PC-0.7` + `PC-0.9` · **veredito é decisão do dono**
**Onde:** `src/features/help/roadmap-content.ts`, `docs/PLANO-2026-08.md` (`:119`, `:437`, `:458`), `docs/TODO-CIFRAS.md` (`:155`, `:8-9`, `:399`, `:51`), `docs/PLANO-CIFRAS.md` (`:180`, `:429`, `:447`). **Portão:** cada veredito virado vira **linha de documento com data**; decisão que não vira linha volta como proposta na próxima passada. **Verifica:** `grep` pelos argumentos mortos não devolve mais nada nas cinco superfícies. **Por quê:** a vitrine é o único desses cinco lugares que o usuário lê.
**Acréscimo desta passada:** a §2.3 já pode ser fechada com a decisão escrita, e o verbete da cauda de geohash na vitrine tem de acompanhar o que já mudou na Cola hoje.

**0.10 · Corrigir a §1c e a §1a do `ARROMBA-INVENTARIO`** — P · `C-1` + `B-7` + `B-10`
**Onde:** `docs/ARROMBA-INVENTARIO.md`. **Portão:** um teste de documento que lê os ids afirmados como ausentes e **falha se o decoder existir** — é a R6 do plano antigo aplicada a este documento. **Verifica:** o teste roda no CI junto com o resto. **Por quê:** o documento que motivou esta rodada erra em **cinco linhas**, todas conferidas:
- **Base91** existe — `src/features/decoder/engine/decoders/base91.ts:23`;
- **Pigpen** existe — `src/features/reference/glyphs.ts`, PIGPEN completo, 4 grades, desenho ASCII por glifo, âncora P21/2023;
- **Número por extenso** existe — `src/features/decoder/engine/decoders/numero-extenso.ts`, e no desenho **oposto** ao deles (nós fazemos extenso→dígitos sob gramática no fan-out e trancamos dígitos→extenso em `ctx.only`; o Gabarito de Códigos **deles** documenta a nossa regra enquanto o JS deles faz o contrário);
- **Cifra de livro** já é `ja-temos` em `INVENTARIO-CATALOGOS.md:71` (`letter-index` + `ctx.aux` + aba Posições);
- **"É a nossa F8"** está errado: a F8 do `PLANO-2026-08.md` é **marco quilométrico de rodovia** (BR-470); o geodésico já tem decoder desde antes;
- **"o *por perto* (KNN) é a Fase 2, ainda não feita"** está errado nos dois lados: `PostesController.Proximos` em `GET /api/postes/near` (`the-decrypter-api/src/TheDecrypter.Api/Controllers/PostesController.cs:42`, `ORDER BY coord_bnu <-> point(...)` sobre índice GiST) e `export const postesProximos` em `src/features/poste/api.ts:27` — e `grep -rn "postesProximos" src/` devolve **1 ocorrência, que é a própria definição**. Zero chamadas.

**0.11 · `pnpm build:data`** — P (conserto) + **decisão do dono** · `PC-0.8`
**Onde:** `package.json`, `scripts/build-ceps.ts`, `public/data/streets.json`. **Portão:** o comando não pode deixar o repositório pior do que encontrou. **Verifica:** clonagem limpa → `pnpm build:data` → `pnpm test` verde (hoje derruba 3 testes de `enriquecimento.test.ts`). **Por quê:** o passo sobrescreve o `streets.json` versionado e enriquecido pela versão crua sem coordenada. **Decisão do dono:** `build:ceps` sai da cadeia, ou o CSV volta.

**0.12 · O verbete do SAMAE na Cola, e nenhum decoder** — P · `B-10`
**Onde:** `src/features/reference/sources.ts` (28 verbetes hoje, medido com `grep -c "id:"`; `grep -in "samae\|área azul\|incra\|cacarecos"` devolve **0 linhas** — o destino está livre, não há duplicata a resolver). **Portão:** não emite nada, em nenhuma forma de entrada. **Verifica:** `^\d{5}$` continua sem card novo; o verbete existe e traz o aviso. **Por quê:** rejeição medida **0,0%** contra o piso de 79,8%, sem base atrás, e **39,4% do espaço de 5 dígitos já é plaqueta de poste confirmada** (35.443 plaquetas de 5 dígitos, medidas em `seed-data/postes.json`). **Ressalva que é parte do item, não rodapé:** o verbete tem de avisar que a 2ª via do GSAN expõe nome, endereço e débito de terceiro só com a matrícula, sem autenticação. Empurrar alguém para lá sem esse aviso é a bancada participando de consulta de dado pessoal alheio.

### Onda 1 — o portão que falta ao motor · 2 itens · 2 P · pré-requisito medido das Ondas 2 e 8

**1.1 · `coverage()` devolve o prefixo ANALISADO, não só o total** — P · `A-1`
**Onde:** `src/features/decoder/engine/score.ts` — `gluedCoverage` (`:323`) passa a devolver `{cobertas, analisadas}`, e `coverage()` (`:355`, hoje `{covered, total, hits}`) ganha o campo `analisado`; teste em `score-words.test.ts`. **Portão:** teste que trava o degrau — `coverage(colado.slice(0,64))` e `coverage(colado)` têm de diferir em menos de 0,05 na razão. Hoje diferem **0,40** (0,81 contra 0,41). **Verifica:** o mesmo texto colado, cortado em 64 e em 128 letras, dá a mesma razão. **Por quê:** `GLUED_MAX = 64` (`score.ts:311`) trunca a segmentação; o numerador congela em 52 e o denominador cresce. Medido pela Frente A: len 64 → 0,81 passa · len 70 → 0,74 barra · len 128 → 0,41. Confirmado ponta a ponta: uma cadeia base64→César7 sobre resposta de 128 letras **achou** e o portão **barrou**. Não muda `scorePlaintext` — o realce continua usando `covered/total`; muda só a leitura pública.

**1.2 · `maiorPedaco()` — expor a maior palavra reconhecida da segmentação** — P · `A-2`
**Onde:** o mesmo `score.ts` (a DP de `gluedCoverage` já sabe o tamanho de cada pedaço; guardar o máximo custa um `Int32Array`) e `score-words.test.ts`. **Portão:** `maiorPedaco("ROjaROVaCuDaNOXz") < 6` e `maiorPedaco("AREPOSTAEOMONUMENTO") >= 6`. **Verifica:** os dois casos no teste. **Por quê:** é o fator que zera o vazamento residual do portão da cadeia — sem ele, um portão de 4 fatores deixa passar 3/260 adversárias, todas do mesmo padrão (quatro cacos de 4 letras costurados dando 13 "cobertas" de 16). É o defeito que o comentário do realce em `score.ts` já descreve (7.402 palavras de 4 letras fazem 1 em ~57 strings aleatórias virar "palavra"), agora medível de fora.

**Por que uma onda só para dois itens P:** os dois são pré-requisito de 2.1 e da Onda 8 inteira, custam meio dia somados, e sem eles os dois itens grandes nascem reprovando a resposta certa mais comum do acervo (a resposta colada e longa).

### Onda 2 — a transposição sem chave · 1 item · M · **promovida**

**2.1 · Transposição sem chave, camada (a)** — M · `PC-4.1` + `C-2` · **conflito resolvido: promovida da Onda 4 para cá**
**Onde:** `src/features/decoder/engine/decoders/transposicao.ts` (novo, registry por auto-descoberta) e teste colado. **Portão:** 2 a 12 colunas nas duas leituras (~22 variantes) + **selo de palavra real de ≥5 letras** sobre o índice de 451.016 + piso de 20 letras + **teto de variantes emitidas** + ordenação por cobertura de palavra real, nunca por nota fixa. **Verifica:** rejeição re-medida no teste (a Frente C mediu 94,64% no corpus real e 97,50% no sintético **com** o selo, contra 93,12% sem ele e 71,93% na versão da Equipe Arromba, que não tem portão de saída); e o caso do scytale(5) acha a resposta. **Por quê:** hoje, num scytale de verdade, a bancada **não cala — responde errado com 0,72**: `runDecoders` emite 3 cards ≥0,35, topo `railfence` 0,72 (`OPONTEEFEDURONORRTNETDEBLCANEMOTESOOSEOROAESCUDIDNIDEBAUADOX`), e a resposta certa **não está entre os cards**. É a mesma classe do antigo item 0.1 (19,44 km a 0,55), e o plano antigo pôs essa classe no topo da fila — então este item sobe junto.
**Ressalva que é parte do item:** o portão proposto emitiu **9 variantes** na amostra. Trocar "a bancada cala" por "a bancada fala nove vezes" é meia correção. O teto de variantes e a ordenação são requisito, não polimento. **Segunda ressalva, de orçamento:** `runDecoders` já custa **44,8 ms** num bloco de 60 letras (Frente C, melhor de 5, com os datasets carregados) — que é exatamente a forma de entrada desta cifra. As ~22 variantes caem em cima do pior caso atual, não do médio; o teto de trabalho tem de ser assertado em teste.

### Onda 3 — o que nenhum dos cinco catálogos vai construir · 6 itens · 1 M + 5 P

Esta onda entra inteira do plano antigo (`PC-1.1` a `PC-1.6`), sem mudança de veredito e sem reordenação interna. Resumo, com o que esta rodada acrescentou:

**3.1 · Soletração pt-BR (Ana, Bandeira, Carlos / "A de Amor")** — **M** · `PC-1.1`
**Onde:** decoder novo + tabela em `src/features/reference/`. **Portão:** 100% dos tokens na tabela · ≥4 tokens · bônus para a forma "X de Y" · a saída tem de formar palavra real · teto de nota. **Verifica:** prosa portuguesa comum não dispara (as palavras são substantivos comuns — casa, lua, ouro, uva —, ao contrário do NATO, onde 60% de acerto basta). **Por quê:** 0 de 5 catálogos têm. **Ressalva mantida:** o inventário se contradiz (P no Grupo 1, M no Grupo 2) e vale **M**, pelo portão.

**3.2 · Cauda de UTM** — P · `PC-1.2` · rejeita **98,67%** contra a VALE_BBOX em 300.000 pares medidos; é o oposto exato da cauda de geohash e entra por assinatura, não por palpite. Bônus: `utmZone` deixa de ser campo morto e o literal `"22J"` sai do `mgrs.ts`.

**3.3 · Letras por linha no `countSeries`** — P · `PC-1.3` · âncora p04/2024 (20-5-14-5-20 → TENET); ~6 linhas; `count-key` já faz a leitura A1Z26 de graça, com portão 1..26 e ≥3 contagens. Entra sem tocar em ranking nem em score.

**3.4 · Significado ICS anexado ao mapa NATO** — P · `PC-1.4` · **a ressalva de âncora continua podendo matar o item**: a afirmação de que "o Challenge 2024 usou as bandeiras" está só em `sources.ts:403`. **O que esta rodada mudou:** a Frente C leu a lista que os **próprios organizadores** publicaram em 2025 (`2025/Rivage-resolucao.pdf:634`) e as bandeiras **não estão nela** — o que enfraquece a âncora, não a fortalece. Item fica, com o gatilho invertido: **entra se a âncora for corroborada fora do `sources.ts:403`; sai se a próxima leitura do acervo também não a achar.**

**3.5 · Nyctográfico na Cola** — P · `PC-1.5` · único alfabeto visual do inventário com âncora afirmada (ITC 2019 P14). Se só uma legenda entrar, é esta.

**3.6 · Runas: legenda de forma** — P · `PC-1.6` · o decoder já existe (`alphabets.ts:513` Elder, `:573` Younger); falta o desenho. **Acréscimo desta rodada:** a lista de 2025 traz **"Alfabeto Lost Symbol"**, que é a família maçônica/pigpen — a âncora do nosso PIGPEN ficou mais forte, e isso vira linha na Cola no mesmo passe.

### Onda 4 — o motor pago que não tem tela · 3 itens · 1 M + 2 P · zero decoder novo no leque

Entra inteira do plano antigo (`PC-2.1`, `PC-2.2`, `PC-2.3`): **retrato estatístico do texto** (M), **régua do IC e frequências na Cola** (P), **busca de palavra por padrão com curinga** (P).

**Acréscimo da Frente C, que reforça 4.1 e fecha uma recusa junto:** a "análise de frequência" da Equipe Arromba passa na R1 (97,61% real / 100% sintético) e mesmo assim é o pior card das 20 medidas — acerta de **0% a 18,2%** das letras, sempre com nota fixa 0,40 (acima do corte de 0,35), e emite até sobre prosa pt-BR limpa. A metade legítima dessa capacidade é exatamente o item 4.1: **mostrar o número e não inventar o texto**.

### Onda 5 — os dados do Vale · 9 itens · 4 P + 5 M · depende de arquivo de terceiro em 4 deles

**5.1 · Enriquecer a base de estações do IBGE** — P · `B-2` — ✅ **FEITO**
**Onde:** `scripts/build-estacoes-ibge.ts`, `public/data/estacoes-ibge.json`, `src/features/estacao/types.ts`, `estacao-ibge.ts`. **O que entrou:** os cinco campos pedidos (`tema`, `nomeEstacao`, `inscricaoChapa`, `localizacao`, `itinerario`, `altitudeOrtometrica`) e o teto de `nrMaxEstacoes=100` passou a **lançar erro** em vez de imprimir aviso — truncar calado é como o dado se perde. **Custo real:** 49,7 → **111,3 KB crus, 23,5 KB em gzip**, dentro da carga preguiçosa que já existia. **O ganho que não estava previsto:** o campo `tema` resolve as SEIS letras de `tipoEstacao`, inclusive as três que caíam no fallback (`E` 226, `P` 5, `D` 1 — 47,3% das linhas mostravam a letra crua). **Zero linhas sem tema**, e há teste de regressão sobre esse número. **A exceção honesta:** `EP` (5 estações) fica sem nome — não achamos fonte que fixe a sigla, então o card mostra "EP (sigla do BDG)". Inventar "estação planimétrica" por semelhança seria a mesma classe de erro que este rótulo existe para consertar.

**5.2 · Chapa como segunda entrada pré-resolvida da estação** — P · `B-3` — ✅ **FEITO**
**Onde:** `src/features/estacao/types.ts` (`porChapa`), `estacao-ibge.ts` (segunda porta), testes colados nos dois. **O que entrou:** busca por inscrição normalizada (hífen, espaço e caixa não importam), **mais** a inscrição extraída da descrição — 57 do campo do cadastro + **13 da prosa** ("…estampada: RN 2004-R"), cobertura 11,6% → **14,3%**. `MR-103` e `RN2004H` deixaram de cair em `caesar-bruteforce` a 0,40. **Duas armadilhas, as duas medidas:** (1) o portão de forma da estação só conhecia a forma do CÓDIGO (`^[A-Z]?\d{1,7}[A-Z]?$`), então `MR-103` era barrado **antes** de chegar à busca — a segunda porta existia e nunca abria; (2) nem tudo depois de "estampada:" é inscrição — treze descrições trazem o NOME gravado ("SPITZCOPF 95") e uma é meta-texto ("estampada: o nome da estação"). O corte `sem corrida de 4 letras E com dígito` separa as duas famílias **sem um erro em nenhuma das duas colunas**. **E uma que quase passou:** a descrição guardada é truncada em 180 caracteres e seis das treze inscrições ficam depois disso; o extrator lê o texto **cru**, antes do truncamento. Medir sobre a cópia guardada dá 12 e parece certo. **No card:** quando o acerto vem pela chapa, o cartão diz `chapa MR-103 → 99861`, senão quem digitou a chapa recebe um código que não pediu e não entende.

**5.3 · Marcos e postes por perto pendurados no card de coordenada** — P · `B-4`
**Onde:** `src/features/decoder/engine/decoders/location.ts` (bloco extra no card já emitido), `src/features/estacao/types.ts` (KNN linear nas 491 linhas, sem rede), `src/features/poste/api.ts:27` (`postesProximos`, hoje sem chamador). **Portão:** não cria card novo nem portão novo — é enriquecimento de card que já ganhou nota por outro motivo; o poste vai por `/api/postes/near` de forma assíncrona e **nunca** bloqueia a corrida síncrona do fan-out. **Verifica:** `grep -rn "postesProximos" src/` passa a devolver 2 ocorrências. **Por quê:** backend e cliente já existem e têm zero consumidores; é fiação, não construção.

**5.4 · Folha cartográfica municipal de Blumenau (1:10.000 a 1:1.000)** — M · `B-5`
**Onde:** `scripts/build-articulacao-blumenau.ts` → `public/data/articulacao-blumenau.json` (camadas ArcGIS `voo/Articulacao_5000_2022` e `voo/Articulacao_1000_2022`), `src/features/location/carta-ibge.ts` (níveis 8..11), `docs/GEOCODIGOS-2026-08.md`. **Portão:** níveis 2..7 continuam na matemática nacional, intocados; do nível 8 em diante **só emite se a folha existir na articulação publicada**; fora dela segue "não reconheci". O `generatedAt` aparece no card. **Verifica:** `SG-22` a `SG-22-Z-B-VI-1-NE` continuam saindo iguais (medidos um a um), e o 7º nível para de sair mudo. **Por quê:** o `location` já dá 0,95 até 1:25.000 e cala além disso; o buraco é só o desdobramento municipal, e o dado é ArcGIS aberto — **não depende de pedir arquivo a ninguém**. **Ressalva:** a articulação é de 2022; se a prefeitura republicar, a nossa cópia envelhece em silêncio — daí o `generatedAt` no card.

**5.5 · Imóvel rural do SNCR/INCRA** — M · `B-6` · **depende de arquivo do colega**
**Onde:** API — `db/schema.sql` (tabela `imovel_rural`), `seed-data/imoveis-rurais.json`, `Domain/Search/LookupShape.cs`, `Api/Controllers/LookupController.cs`; front — `src/features/decoder/engine/decoders/imovel-rural.ts` + teste. **Portão:** `^801\d{10}$` **E** pré-resolução na base; sem acerto, não emite. Nenhum nome de titular entra. **Verifica:** rejeição efetiva ≈ **99,99997%** (10^10 strings de forma, 2.520 pré-resolvidas) — a única base nova com assinatura de verdade. **Ressalva de colisão, que é parte do item:** ~1 em 10 desses códigos fecha como EAN-13 válido e o `barcode` emite a 0,85 (medido: `8010025478939` → 0,85 "EAN-13 válido · Itália, San Marino e Vaticano"). As duas leituras são verdadeiras; o card do SNCR fica **acima** de 0,85 porque acerto exato em base local vale mais que faixa de país.

**5.6 · Abrigos da Defesa Civil de Blumenau** — P · `B-7` · **depende de arquivo do colega**
**Onde:** `public/data/abrigos-blumenau.json` (59 linhas, ~10 KB), `src/features/decoder/engine/decoders/abrigo.ts` + teste, verbete em `sources.ts`. **Portão:** pré-resolvido nos 59 códigos reais; o portão de forma só evita varrer a base à toa. **Verifica:** rejeição 88,1% (495 strings de forma, 59 acertos), acima do piso R1; `C1` e `N12` hoje não passam de 0,40. **Ressalva que pode invalidar a regex:** os códigos `C/N/S/E/W` podem ser convenção do app da Equipe Arromba, não da Defesa Civil — **confirmar no arquivo recebido antes de escrever a regex**. **Recusa dentro do item:** o estado "aberto agora" **não** entra no decoder — é rede numa corrida síncrona, e estado de enchente errado é pior que ausente; se vier no arquivo, é carimbado com a hora da coleta e rotulado como tal.

**5.7 · Vagas da área azul — no card da rua, nunca no número** — M · `B-8` · **depende de arquivo do colega** · **conflito com decisão do dono, resolvido pelo lado conservador**
**Onde:** API — tabela `vaga_blumenau` + `seed-data/vagas-blumenau.json`; front — linha aditiva nos cards de `street-code`/`street-name` e ponto no mapa. **Portão:** **não existe decoder de número de vaga**; o número só entra pelo caminho inverso (clique no mapa, busca no painel). Na rua, a linha é aditiva dentro de um card que já ganhou nota. **Verifica:** digitar `742` continua devolvendo `street-code` 0,97 no topo, sem terceiro card. **Por quê:** medido sobre `public/data/streets.json` e `seed-data/postes.json` — dos 3.448 números, **92,8% são código de rua, 99,0% são plaqueta de poste, 91,8% são os dois e 0,0% não são nenhum**; e o portão `^\d{1,4}$` rejeita 65,5%, abaixo do piso de 79,8%.
**A resolução do conflito, dita:** o dono decidiu "trazer a área azul". O dado entra — o **eixo** número→vaga não. Se o dono quiser o eixo mesmo assim, isso é exceção declarada como a da cauda de geohash, e tem de virar linha aqui.

**5.8 · Acervo Cacarecos — painel próprio, só o código chegando ao leque** — M · `B-9` · **depende de arquivo e de permissão de uso**
**Onde:** API — tabela `cacareco` + seed + rota de busca; front — painel na aba Biblioteca, linha aditiva nos cards `barcode`/`isbn` já emitidos. **Portão:** por **código**, pré-resolvido, pendurado no card que `barcode`/`isbn` já emitiu (0,85/0,90) — não cria card concorrente. Por **texto**, existe apenas dentro do painel, com busca explícita; **jamais** no fan-out. **Verifica:** `vinil` continua sem abrir consulta (hoje devolve 21 cards com `affine` 0,64 no topo — o pior lugar possível para abrir uma consulta). **Ressalva:** 8.481 itens é volume de tabela, não de `public/data`. E é catálogo de um particular — ver §3.

**5.9 · O carimbo de procedência** — P · `B-11` — ⏳ **METADE FEITA, metade sem consumidor**
**O que entrou:** a data da cópia passou a viajar no card da estação geodésica (`BDG/IBGE, cópia de 2026-08-20`), do mesmo jeito e pela mesma razão que o card de folha cartográfica já fazia — o BDG é atualizado pelo IBGE, e uma estação destruída ou recadastrada continua na nossa cópia **com cara de dado corrente**. Para isso o `generatedAt` teve de ser declarado em `EstacoesData`: o `build:estacoes` sempre gravou o campo, mas a interface não o declarava, então quem quisesse mostrá-lo não tinha como. **O que NÃO entrou, e por quê:** o carimbo `"não verificada — recebida da Equipe Arromba"` é para arquivo de terceiro, e nenhum chegou (5.5 a 5.8). Construir o mecanismo agora seria mais um `postesProximos` — código nas duas pontas com zero chamadores, que este repositório já registrou como defeito. Ele entra junto com o primeiro arquivo, no mesmo item.

### Onda 6 — o que quatro ou cinco catálogos concordam · 10 itens · 2 M + 8 P

Entra do plano antigo (`PC-3.1` a `PC-3.9` + `PC-3.G`), com três itens agora **medidos** pela Frente C e dois defeitos alheios nomeados para não copiar:

**6.1 · Conferir hash de texto (MD5 · SHA-1 · SHA-256 · CRC-32)** — P · `PC-3.1` · campo "conferir contra este hash", **não** decoder no fan-out.
**6.2 · Quebrar hash pelo vocabulário local** — M · `PC-3.2` · Worker; risco de resposta errada **zero** (bate ou não bate). Depende de 6.1.
**6.3 · Punycode (`xn--`)** — P · `PC-3.3` · rejeição medida **100,00%** nos dois corpora. **Portão adicional que a medição obriga:** saída **não vazia e diferente da entrada** — a implementação da Equipe Arromba devolve card **vazio a 0,75** para a entrada `xn--`. Teste de regressão com esse caso exato.
**6.4 e 6.5 · Quoted-Printable e MIME encoded-word** — P + P · `PC-3.4`/`PC-3.5` · vêm no mesmo papel colado: se um entra, os dois entram. QP rejeita **100,00%/100,00%**. **Portão adicional:** decodificar **dos bytes**, nunca `charCodeAt(i) & 0xff` — o deles corrompe todo não-ASCII que não estava codificado (medido: `Blumenau =C3=A9 =C3=B3timo → Blumenau é ótimo` sai `Blumenau é ótimo � Blumenau � �timo`).
**6.6 · Escapes `\uXXXX` / `\xNN` / `%uXXXX`** — P · `PC-3.6` · dentro do `codecs.ts`, de carona, nunca sozinho.
**6.7 · Timestamp Unix → data** — P · `PC-3.7` · rejeição medida **99,02% real / 96,30% sintético** (o plano antigo só supunha). Continua com **teto de nota, na gaveta, nunca no topo**.
**6.8 · Fatoração em primos + sequências** — P · `PC-3.8` · sob a regra de palavra-dica já testada; sem a dica não dispara.
**6.9 · Numerais gregos e hebraicos (isopsefia, gematria)** — P · `PC-3.9` · o portão já foi pago pelo `alfabeto.ts`, por bloco Unicode.
**6.10 · Chip ADFGVX no sniffer** — P · `PC-5.3` + `C-4` · **antecipado da Onda 5 antiga para cá, por medição**. **Onde:** `src/features/decoder/engine/sniff.ts` (208 linhas, 13 chips; molde do chip `mapcode-shape` em `:158`). **Portão:** `^[ADFGVX]+$` com comprimento par e ≥8 — rejeição **100,00% nos dois corpora, 0 disparos em 33.144 entradas**. O chip **diz o nome e não decifra**. **Verifica:** em `DFFGDDAFVDAAVFAAAXDAGXDAAVGDAAGDXA` a bancada hoje emite **7 cards ≥0,35, todos errados** (bifid 0,59 · caesar 8 0,58 · affine 7,1 0,57) e nunca nomeia a cifra; depois, emite o chip. Troca sete respostas erradas por uma frase certa, e custa P.
**6.G · A primeira leva e2e** — M · **decisão do dono** · `PC-3.G` · o argumento ficou **mais forte** com esta rodada: as Ondas 2, 7 e 8 mexem em fan-out, em ranking e em rede, e hoje são 2 testes de componente e 0 e2e.

### Onda 7 — IMDb, Spotify e a aba Lote · **7.1 cancelado pelo dono · 7.2 e 7.3 feitos · falta o Spotify**

**7.1 · Recorte local da IMDb** — ❌ **CANCELADO por decisão do dono, 2026-08-20**
O dono optou por **só API, sem base local**, depois de a alternativa e o custo serem apresentados com medição. Fica registrado o que isso troca, porque a consequência é da decisão e não do desenho: (a) **nada de filme funciona offline nem com a nossa API fora** — não há a degradação que o `fipe.ts` tem; (b) o título brasileiro passa a depender do Wikidata, que o tem em **6,2%** dos filmes de 2019 com ID da IMDb (11,7% com ≥10 wikis · 35,6% com ≥25 · **66,7% com ≥50**), contra praticamente 100% que `title.akas` region=BR daria; (c) some o download único de 710 MB e some a manutenção do artefato. Se um dia a decisão mudar, o que este item pedia continua valendo — e os três portões do script seguem escritos acima no histórico do arquivo.

**7.2 · Decoder `imdb` + card + gateway do Wikidata** — ✅ **FEITO, 2026-08-20 — só API**
**Front:** `decoders/imdb.ts` (portão `^tt\d{7,8}$/i`), `features/filme/types.ts` (a regra de qual título mostrar), `features/filme/components/filme-card.tsx`, mais os enganches em `engine/types.ts` (`render: "filme"`), `lookup-cache.ts` (`hits.filme`) e `result-card.tsx`. **API:** `IWikidataGateway` + `FilmeInfo`, `FilmeSparql` (consulta e leitura, **puras, no Domain**), `WikidataGateway` (fino: monta URL, faz GET), `ImdbId` (a forma, num lugar só), `LookupShape.Filme`, `LookupService.FilmeAsync` com cache de uma semana, `LookupController`. **Verificado:** 130 testes na API e 1.819 no front, `build` verde nos dois; a URL que o gateway monta foi conferida contra o serviço real (HTTP 200); latência medida **137 ms / 1.155 ms / 2.164 ms** (menor, mediana, maior) contra o teto de 12 s por tentativa da esteira.

**As três armadilhas do Wikidata, todas medidas e todas travadas em teste com resposta REAL do endpoint:**
1. **A duração vem com unidade.** `Oppenheimer` tem P2047 = `10809` com unidade `Q11574` (segundo); o resto vem em `Q7727` (minuto). A primeira versão da consulta imprimiu "10809 min" para um filme de 180.
2. **A data de lançamento é uma por país.** Pegar um P577 qualquer dava 1999 para *Close-Up*, que é de 1990, e 1995 para *Um Sonho de Liberdade*, que é de 1994. O ano é o `MIN`.
3. **O título brasileiro é APELIDO, não rótulo — e há mais de um.** `tt0111161` tem `rdfs:label`@pt-br = "The Shawshank Redemption"; "Um Sonho de Liberdade" está em `skos:altLabel`@pt-br. E `SAMPLE()` escolhe um apelido qualquer: numa medição devolveu "Back to the Future" como título em português de *De Volta Para o Futuro*. A consulta traz todos e a escolha é por regra — vale o primeiro que não é o original **nem uma variação dele** (comparação por continência sobre a forma dobrada, senão "Shawshank Redemption" passaria por tradução).

**A regra que é o item inteiro:** sem título brasileiro, a escada **não** desce para o de Portugal. Ela vai para o original e **avisa na tela**, colada ao título e não num rodapé. "Regresso ao Futuro" no lugar de "De Volta Para o Futuro" é um nome plausível, em português, e errado — a resposta errada mais bem disfarçada que esta bancada consegue produzir. E "o Wikidata não conhece este ID" nunca vira "esse filme não existe": a fonte cobre uma fração do catálogo da IMDb, e afirmar a partir dessa ausência seria argumentar por ausência de evidência.

**A regra do QID, que vale para o repositório inteiro e não só para este item:** medido em 2.000 QIDs sorteados, o card de coordenada é o topo em **61,0%**, e por comprimento: 3 dígitos 100% · 4 dígitos 98,3% · 5 dígitos 97,3% · **6 dígitos 95,8%** · 7 dígitos 95,0%. `Q220741` devolve os **três primeiros cards** como Geohash no litoral de SC. O QID **nunca** vira valor clicável, encadeável ou coluna copiável — o que encadeia é o título.

**7.3 · Aba Lote (16ª)** — G · `D-3` — ✅ **FEITA, 2026-08-20**
**O desenho foi RECONSTRUÍDO, não recuperado.** A descrição original chegou truncada; o que existe agora saiu de um levantamento do código (quatro frentes de leitura), três desenhos independentes por ângulos opostos e três juízes por lentes distintas — honestidade, custo e uso real num sábado de gincana. Os três juízes escolheram o **mesmo** desenho por razões diferentes, e o resultado final enxertou nele o que os perdedores tinham de melhor.

**O que a aba é:** a metade ONLINE da bancada, no plural. Uma entrada por linha, um botão com o número de consultas escrito dentro, e **uma linha de saída por linha de entrada**. A unidade da tela é a LINHA; a unidade da rede é o TERMO distinto — trinta linhas iguais desenham trinta linhas e custam uma permissão.

**O que ela recusa, e por quê:** não roda as 129 cifras por item. A justificativa de CPU do plano velho está **errada e não entrou** — medido, 60 itens curtos custam 66 ms somados. As duas razões que sobrevivem: o vocabulário do realce de palavra real é alimentado pela bancada, então o lote pontuaria com régua diferente (duas telas, duas respostas, nenhuma pista de qual vale); e sessenta palpites ranqueados numa coluna que vai para a folha da prova é a forma industrial do pior defeito da casa. Quem quer palpite tem, em toda linha, o botão que manda o item para o Decodificador.

**Os dez desfechos, e os três silêncios que não são o mesmo silêncio** — esta é a razão de a aba existir: `sem-acerto` ("perguntei em CEP e em plaqueta — nenhuma tinha", nomeando as bases) · `sem-forma` ("não perguntei: não sei procurar isto") · `indeterminado` ("não sei dizer se alguma base foi consultada"). Mais `resolvido`, `recusado` (portão do cliente, com o motivo), `falhou`, `interrompido`, `nao-perguntado` com razão nomeada (parado/teto/429/sessão) e os dois transitórios. **A palavra "não existe" não aparece na aba**, e há teste de componente que varre o DOM para provar.

**A peça nova de servidor, e o motivo dela:** `LookupResposta.Consultou`. Medido — quando `LookupShape.De` devolve `Nenhuma`, o controlador responde `200` sem tocar em repositório nenhum, e como o `Program.cs` não configura `DefaultIgnoreCondition`, esse payload é **byte a byte idêntico** ao de um miss completo. Sem o campo, nenhum cliente honesto é possível. A alternativa — espelhar `LookupShape` no cliente — é o que o cabeçalho daquela classe proíbe por escrito, com contraexemplo verificado: `MR-103` é chapa de estação geodésica, cai em `Nenhuma`, e um espelho frouxo anunciaria "perguntei como plaqueta" sobre uma base nunca tocada. **Enquanto o deploy não chega, o campo vem ausente e o item vira `indeterminado`** — nunca `sem-acerto`, que afirmaria uma consulta talvez inexistente.

**Os dois desvios da letra do plano, registrados:**
1. `cancelarSuperadasExceto` **já existia** (foi escrita hoje, mais cedo nesta mesma onda). O que faltava não era a função: era o **dono**. Sem ele, uma tecla na bancada aborta o lote a cada 300 ms, calado, e as linhas aparecem como "não encontrei". Escolhida posse (`Dono = "bancada" | "lote"`) contra um conjunto global de protegidas, por assimetria de falha: a posse morre sozinha no `.finally`, enquanto um conjunto exige release explícito que, vazando, desligaria o cancelamento da BANCADA pela sessão inteira.
2. A promessa envenenada foi consertada **na origem**, não por timing: `ctrl.abort()` é síncrono, mas a limpeza do cache morava no `.catch` — um microtask à frente. Nessa janela, pedir o mesmo termo devolvia a promessa já condenada, e "tentar de novo" não tentava nada. Agora `abortarAgora` limpa na mesma volta, e duas guardas de identidade impedem o `.catch`/`.finally` de uma promessa velha de apagar a entrada da nova.

**O orçamento é livro-caixa, não marca-passo.** Espalhar um lote no tempo não reduz o custo dele — sessenta consultas custam sessenta permissões. O que estoura o balde é o SEGUNDO lote no mesmo minuto, num teto de 120/min por IP em janela FIXA que a equipe inteira atrás do NAT divide com a bancada. Então: sem intervalo, com teto de 90 (30 reservadas para quem está digitando) e pausa quando o saldo acaba. A janela do cliente é deslizante e a do servidor é fixa — o cliente conta a mais, nunca a menos.

**Mais três defesas que vieram dos perdedores:** o **seletor de campo** da coluna copiável (resposta · logradouro · bairro · cidade · UF · lat,lng), com as opções derivadas do que de fato resolveu — uma coluna rotulada só "resposta" pode entregar o logradouro a quem precisava do bairro. O `?` **por padrão** no que não resolveu, porque linha em branco no meio de um bloco colado é a não-resposta viajando disfarçada. E o **cabeçalho de integridade**, com todos os baldes não-zero e a frase fixa "Este resultado NÃO está completo" — com teste de propriedade prendendo `soma dos baldes === total`, porque resumo sem invariante é onde um balde some.

**A revisão adversarial, e o que ela pegou.** Depois de pronta, a aba passou por cinco revisores por dimensões distintas (honestidade, corrida/cancelamento, React, regressão, servidor) e cada achado foi julgado por três céticos independentes com instrução de refutar na dúvida. **23 achados brutos, 5 descartados, 18 confirmados** — e não foram cosméticos. Os que mais importam:

1. **A coluna copiável elegia entre candidatos.** `41101634` é lote de Blumenau sem hífens e admite mais de um agrupamento real: a resposta traz dois endereços. A linha mostrava os dois; a coluna — o que vai para a folha da prova — saía com um só, sem marca. O mesmo valia para `cepsPrefixo` (medido: 2.271 sufixos de seis dígitos existem com 88 **e** com 89). Agora, com mais de um valor distinto, o campo devolve `? N candidatos` e a escolha volta para quem digitou.
2. **A rodada velha escrevia na rodada nova.** Um trabalhador dormindo na espera de orçamento sobrevive ao `abort()`; ao acordar, o rabo do executor carimbava a fila inteira como "não perguntei" **no mapa da rodada atual**, apagando respostas já na tela. Guarda de identidade em `porTermo`/`aoPausar`.
3. **A posse era gravada só no primeiro despacho.** Como o dedupe devolve a mesma promessa, quem chegava depois herdava o cancelamento de quem chegou antes: com um termo em voo pelo lote, o botão "na bancada" daquela linha fazia o Decodificador esperar a mesma promessa, e o "Parar" do lote matava a consulta da bancada junto. Agora `emVoo` guarda o **conjunto** de donos, e só aborta quem ninguém mais quer.
4. **CEP escrito com hífen dizia "não sei procurar".** `88010-500` é a grafia canônica — e era o único jeito de escrever CEP que o portão do servidor não reconhecia. Numa lista de CEPs colados, a lista mais provável que existe, toda linha voltava recusada. O corte é exatamente oito dígitos, para uma coordenada (`-26.9194`, seis dígitos) não passar a gastar requisição.
5. **Acerto sem conteúdo contava como resolvido.** A base de aeroportos traz nome/cidade/país nulos em parte das linhas: a linha ficava muda, o cabeçalho dizia "1 resolvido" e a coluna escrevia `?` — três afirmações se contradizendo na mesma tela.
6. **Linha em branco no meio da colagem deslocava tudo.** A coluna pulava as vazias, e quem colasse de volta numa planilha receberia cada resposta um degrau acima a partir dali. A coluna passou a ter uma célula por linha do texto **colado**, não por item.
7. **Depois de um 429 o botão ficava em "Parar"** logo acima da frase mandando rodar de novo — e "Parar" não parava nada, porque a rodada já tinha acabado.
8. **Voltar para a aba acendia "resultados do texto anterior"** sem ninguém ter digitado: o texto era `useState` e morria no desmonte, enquanto a rodada sobrevivia no store. O texto passou a ser parte da rodada.
9. **E uma regressão minha, de horas antes:** a normalização de dígitos na porta (Onda 0) cegava o decoder `unicode-styles`. `１２３ｆ` virava `123ｆ`, a cobertura caía abaixo do piso e o card sumia — os dígitos ficavam certos, o `ｆ` ficava órfão, e o único decoder que consertaria a string inteira calava justamente porque a normalização o "ajudou". A largura plena é o único dos sete blocos que tem rival; agora ela cede a vez quando há outro caractere de largura plena no texto.

**Dois achados ficaram REGISTRADOS e não corrigidos**, porque são anteriores a esta frente: o `OutputCache` dos lookups nunca guarda nada (o header `Authorization` desliga a política herdada — a camada de cache anunciada no comentário não existe na prática), e uma máscara de CEP com mais de oito posições escapa do portão do curinga e vira busca de rua (`88xxx500xx` → `RuaOuBairro`), da mesma família do `Rua XV` já anotado.

**E uma armadilha estrutural que só apareceu na leitura:** `TABS` era array literal no `App.tsx`, e a renderização é cadeia de `{tab === "x" && …}` sem ramo padrão — uma aba podia existir na união de rotas, no mapa de apelidos, e **não aparecer em navegação nenhuma**, compilando e passando em todos os testes. Virou `Record<TabId, …>` em `src/app-tabs.ts` (esquecer = erro de compilação) mais `src/app-tabs.test.ts`, que lê o `App.tsx` e falha se alguma aba não tiver ramo de renderização — aba com botão e sem tela dá área em branco e **nenhum erro em lugar nenhum**.


**Sobre o Spotify, dentro desta onda:** o campo de 22 caracteres base62 está **91,5% livre** (topo ≥0,50 em 85 de 1.000 sorteadas) e o gate rejeita **99,988%** dos tokens do acervo — mas os **dois** falsos positivos são prosa portuguesa (`sestsenatsantacatarina`, `ResponsabilidadeSocial`). Por isso o `spotify` **só emite depois do 200 do oEmbed**, e a regra de código é: **200 = achado · 404 = negativa · qualquer outra coisa = indeterminado** (não emite e não afirma inexistência) — o contrato mediu 404 hoje onde a medição anterior viu 500. O artista não está no oEmbed e está no `__NEXT_DATA__` da página de embed, que **não** tem CORS: essa metade é obrigatoriamente do backend.

### Onda 8 — a cadeia automática — **CANCELADA por decisão do dono, 2026-08-19**

> **A onda inteira sai da fila.** A razão é a que a própria medição produziu: portar a
> estrutura de referência trocando só a régua pela nossa dá **45% de falso positivo** nas
> entradas que não são cadeia (e 61,5% nas adversárias); o portão que fecha isso precisa de
> **seis fatores** e de dois consertos no motor antes de existir; o acerto declarado (11/13)
> está medido sobre cadeias **sintéticas**, porque as cifras do acervo estão em imagem; e
> nada disso cabe por tecla — é botão, a 6× a 17,6× o fan-out atual.
>
> **Os dois itens da Onda 1 continuam**, e não por causa dela: o `GLUED_MAX = 64` já hoje
> faz `coverage()` mentir sobre qualquer texto colado acima de 64 letras, que é o formato
> mais comum do acervo. Eles deixam de ser pré-requisito e passam a ser conserto.
>
> *Gatilho de reabertura:* uma prova real do acervo, **transcrita**, que só se resolva por
> duas camadas encadeadas — e mesmo aí, entra pelo portão de seis fatores, nunca pelo
> `scorePlaintext` sozinho.

<details>
<summary>O desenho original, preservado para o caso de reabertura</summary>

### Onda 8 — a cadeia automática · 5 itens · 1 P + 3 M + 1 pré-requisito de acervo

**8.0 · Transcrever 10 cifras reais das imagens do acervo** — M · `A-risco-1` + `C-risco-1` · **pré-requisito de fechar a onda**
**Onde:** `/Users/peter/Repos/the-decrypter/acervo-arromba` (105 arquivos) → texto. **Portão:** o acerto da cadeia só pode ser declarado sobre cifra **real**, não sintética. **Verifica:** o número de acerto (hoje 11/13) é refeito sobre as transcritas. **Por quê:** duas frentes independentes bateram no mesmo muro — 33 dos 79 PDFs de prova têm menos de 120 caracteres extraíveis e há 22 JPGs; o `pdftotext` só entrega prosa, e as cifras estão nas imagens. **O mesmo trabalho serve a três coisas:** o acerto da cadeia, os gatilhos de reabertura de Nihilist/semáforo/Cardan (§5), e a segunda checagem do encadeamento que falha por poda (base64→A1Z26→César4).

**8.1 · Motor da cadeia — BFS determinístico com orçamento de trabalho** — M · `A-3`
**Onde:** `src/features/decoder/engine/cadeia.ts` e `cadeia.test.ts` (novos, puros, sem React). Consomem `runDecoders` e `chainValueOf` (`src/features/decoder/trail.ts:32`); **nenhum arquivo existente muda de comportamento**. **Portão:** (a) determinismo — mesma entrada, mesma cadeia em 20 execuções; **nada de `Date.now`/`performance.now`**, o teto é Σ(letras dos nós expandidos) ≤ 6.000, o mesmo padrão do bloco ORÇAMENTO de `substituicao.ts:67-75`; (b) teto de tempo assertado em teste: máx 2,0 s na entrada colada de 225 caracteres (medido hoje: 1,63 s a 40 ramos); (c) **o motor não é um decoder e não entra no registry**. **Verifica:** profundidade 2 com **40 ramos** por nível dá alcance 11/12, contra 3/12 dos 5 ramos do arquivo de referência. **Por quê da profundidade 2:** a 3 são 294 rodadas de `runDecoders`, 34.400 `decode()`, 2,2 s médios e 14 s na entrada colada.

**8.2 · O portão de quatro fatores + a suíte de regressão de falso positivo** — M · `A-4`
**Onde:** `passaNoPortao(texto, notaDaEntrada)` em `cadeia.ts`, e `cadeia-falso-positivo.test.ts` (300 linhas reais do acervo + 260 adversárias geradas por xorshift32 semeado + 13 cadeias de 2 camadas). **Portão — a própria suíte reprova o PR:** falso positivo **0/560** e acerto **≥10/13**. Os seis fatores, todos medidos isoladamente: cobertura ≥12 letras · razão ≥75% **sobre o analisado** (item 1.1) · `scorePlaintext` ≥0,60 · ganho ≥0,20 sobre a nota da entrada · **maior pedaço ≥6** (item 1.2) · bagunça de caixa ≤8%. **Verifica:** tirar o ganho de 0,20 leva o falso positivo a 19,3% na prosa (round-trip A1Z26 devolvendo o próprio texto); tirar os dois últimos leva a 1,2% nas adversárias; **usar só o `scorePlaintext` leva a 45%–61,5%**. **Por quê:** `scorePlaintext` ordena, não decide emitir — portar a estrutura alheia trocando só a régua pela nossa produz lixo como CPF `111.444.777-35` → Políbio → Afim ⇒ `"DESI"` (0,69) e `Rua Sao Paulo` → Bifid → Afim ⇒ `"ZBODATONAEC"` (0,78).

**8.3 · Painel da cadeia — botão, estados e o texto do "não achei"** — M · `A-5`
**Onde:** `src/features/decoder/components/chain-panel.tsx` (novo), `use-cadeia.ts` (novo: ocioso | rodando | achou | nada), `decoder-workbench.tsx` (só monta), reusando `pushStep`/`MAX_TRAIL` (`trail.ts:22`, `:40`) para o botão "usar esta cadeia". **Portão — a bancada não pode calar.** Teste de componente obrigatório para o estado "nada": mostra (1) o que foi tentado (N nós, 2 camadas, quantos decoders encadeáveis correram); (2) a **melhor tentativa** com os números dela, rotulada "não bate o portão — não é resposta", com botão "usar como entrada"; (3) o motivo nomeado — *"a entrada já está legível (nota 0,85)"* · *"orçamento esgotado em N nós"* · *"nenhuma leitura de 1ª camada serviu de entrada"* · *"campo Chave vazio: 7 cifras com chave ficaram de fora"*. E o botão fica **desabilitado com motivo escrito** enquanto o vocabulário não carregou. **Verifica:** quando acha, o painel emite **exatamente 1 card** — nunca lista. **Por quê do botão e não da tecla:** mesmo a versão mais podada que existe (5 ramos, prof 2) custa 6× o fan-out de hoje e 309 ms na entrada colada; a versão que realmente acha (40 ramos, prof 2) mede mediana 485 ms e máximo 1.634 ms. **Não existe recorte que caiba na tecla e ainda ache alguma coisa.**

**8.4 · Verbete na Cola e a nota do que a cadeia não faz** — P · `A-6`
**Portão:** o verbete diz os três limites medidos — 2 camadas (não 3); **69 dos 117 decoders encadeiam** sem chave (76 com o campo Chave preenchido); e as 7 cifras com chave (autokey, beaufort, columnar, playfair, porta, vigenere, xor-key) ficam de fora enquanto o campo estiver vazio. **Acrescenta o limite estrutural:** o fator "ganho de 0,20 sobre a nota da entrada" torna a cadeia **cega a uma prova cuja entrada já pareça texto**. É escolha, não defeito, e por isso está escrita.

</details>

### Onda 10 — a aba de FICHAS: uma lista de nomes, uma tabela de dados · **a investigar**

> **Pedida pelo dono em 19/08/2026.** Colar uma lista de **filmes, músicas, atores ou
> personagens** — vários de uma vez — e receber uma tabela com os dados de cada um: data de
> nascimento e nome completo para pessoa; data de lançamento e duração para filme; e assim por
> diante. Ainda **não é plano**, é a pergunta escrita para não se perder.

**Por que ela não é a aba Lote (7.3), e por que depende dela.** A 7.3 resolve **código →
registro** — CEP, poste, CID, `tt…`: a chave é exata, o acerto é binário, e o resolvedor sabe
dizer "não achei". Esta aqui resolve **nome → entidade**, que é outra natureza: "Bacurau"
redireciona para uma família de aves, "Tropa de Elite" cai em desambiguação, e nome de ator tem
homônimo. Medido na Frente D: **4 de 10 nomes escolhidos a dedo resolveram para não-filme.**
O mecanismo de plural (textarea, botão, coluna copiável, cache, cancelamento por conjunto) é o
mesmo e sai de graça da 7.3 — o que muda é tudo que vem depois da busca.

**As perguntas que a investigação tem de responder, antes de virar item:**

1. **Que campos, por tipo de entidade?** Filme (título BR, título original, ano, duração,
   direção, país) · pessoa (nome completo, nascimento, morte, nacionalidade) · música (faixa,
   artista, álbum, ano, duração) · personagem (obra, intérprete). A lista de campos decide a
   fonte, não o contrário.
2. **Uma fonte ou várias?** O Wikidata responde os quatro tipos com uma consulta SPARQL só, sem
   chave — mas **não sabe o título em português** (medido: 13 acertos em 120). O recorte do IMDb
   sabe o título BR e só fala de filme. Provavelmente é híbrido, como o 7.2.
3. **Como a ambiguidade aparece na tela.** Esta é a pergunta que decide se a aba serve ou
   atrapalha. Nome → entidade **nunca** pode virar veredito silencioso: ou a linha mostra o que
   escolheu e por quê (`P31/P279* wd:Q11424`), ou marca em vermelho que caiu em desambiguação.
   A regra da casa aqui é literal — resposta errada com nota alta é o pior defeito.
4. **O tipo é declarado ou adivinhado?** Declarar ("esta lista é de atores") elimina metade da
   ambiguidade de graça. Adivinhar parece mais esperto e erra em silêncio.
5. **Quantos itens de uma vez, e a que custo?** O Wikipedia devolve `toomanyvalues` acima de 50
   com HTTP 200 — quem não fatiar acha que a resposta veio vazia. E o teto da nossa API é
   120/min por IP em janela fixa.
6. **Onde a saída vai dar.** Tabela na tela é meio caminho; o que fecha a prova é **uma coluna
   copiável** por campo, preservando a linha vazia de quem não resolveu — o mesmo requisito da 7.3.
7. **O QID nunca aparece.** Medido: 61% dos QIDs sorteados devolvem coordenada como card de topo,
   e 95,8% dos de 6 dígitos. Ele não vira coluna, nem valor clicável, nem encadeável.

**Depende de:** Onda 7 inteira (7.1 o recorte, 7.2 o gateway de Wikidata, 7.3 o mecanismo de
plural). **Esforço:** não estimado — a investigação vem antes.

### Onda 9 — ✅ **FEITA, 2026-08-20** (4 itens entregues, 1 recusado com número)

**9.2 · Homóglifos e confusáveis** — ✅ **e ele não acrescentou capacidade: RETIROU um erro que já estava em produção.** Medido no fan-out real antes do conserto: `a рorta рreta` (com `р` cirílico) devolvia no TOPO, a 0,62, o card do `alfabeto` com `"a rorta rreta"`. Ele translitera por SOM, e por som o `р` cirílico é mesmo `r` — mas quem esconde uma letra numa prova esconde um **desenho**. `src/features/reference/confusaveis.ts` (121 pares, 1,2 KB — a ressalva de bundle do plano antigo estava superdimensionada em duas ordens de grandeza, e há teste prendendo o tamanho), `decoders/confusaveis.ts` e o rebaixamento do `byScript` no `alfabeto.ts`. **A regressão inversa é tão importante quanto:** `Привет мир` → `Privet mir` continua saindo a 0,62, porque ali a leitura fonética é a certa. O portão é por TOKEN, com três cláusulas, e rejeita **100,0000%** das 463.438 palavras dos dois vocabulários — o portão ingênuo ("tem caractere fora de a-z") rejeitaria só 64,11% do português, porque 92 mil palavras nossas têm acento.

**9.1 · Alfabeto dado (K1/K2/K3)** — ✅ `decoders/alfabeto-chave.ts`. Fecha a faixa de 22 a 199 letras que o solver de substituição recusa (`MIN_LETRAS = 200`), usando o campo Chave que já existia. Aceita alfabeto inteiro (26 letras distintas) ou palavra-chave, e nesse caso tenta as três construções clássicas — quem desempata é o vocabulário, e a variante que não produz português não vira card. **O portão de saída é o item inteiro:** aplicar uma chave nunca falha, sai texto dos dois lados; sem o corte de cobertura, o mesmo motor emitiria três leituras de aparência técnica para qualquer par texto×chave.

**9.4 · Pollux e Morbit** — ✅ `engine/morse-x.ts` (o dialeto com separador `x` e o conjunto de prefixos que torna a poda possível), `engine/pollux-morbit.ts` (os dois solvers, DFS por posição com **teto contado em passos, nunca em tempo**), `decoders/pollux.ts` (no leque, piso 80) e `decoders/morbit.ts` (só em `ctx.only`).
- **O piso do Pollux é o item, e o preço dele está dito:** falsos positivos por piso, sobre números reais — 8 dígitos → 132 · 30 → 2 · **80 → zero**. Com piso baixo, o CEP `88353537` devolvia `CETETE` com cobertura 1,00. A conta honesta: no leque ele só responde onde é menos provável, porque uma palavra não chega a 80 dígitos; para cifra curta existe o modo "uma cifra só", onde o piso sai.
- **O Morbit fica fora do leque** por duas razões medidas: custa 49 a 66 ms (contra 0,4 a 1,0 ms do leque inteiro em texto numérico), e o portão natural dele deixa passar 554 de 600 listas de A1Z26 coladas — a cifra nº 1 do acervo.
- **Três documentos deste repositório afirmavam que o Morbit tem comprimento PAR. É falso** — a paridade é do Morse, e o último dígito completa o par com separador. Um portão de paridade calaria em metade dos Morbit de verdade, e calar não deixa rastro. Há teste prendendo isso.
- **Dois erros meus, pegos por medição e não por revisão:** o primeiro solver revarria o prefixo inteiro a cada passo (O(n²), 119 ms) — o estado passou a viajar pela recursão; e o corte de "maior pedaço ≥ 6" chegou a preferir `ANIMAISXII S AN` a `A PONTE DE FERRO`, porque `PONTE` tem cinco letras. O filtro que existe para barrar ruído estava escolhendo o ruído; ele ficou só no leque.

**9.3 · LSB de imagem** — ✅ `arquivo/imagem/lsb.ts` + card no painel de imagem. 20 interpretações (canais × varredura × ordem dos bits), reusando o `corteMinimo` do LSB de áudio em vez de recalcular — o corte sobe com o tamanho da busca, porque testar 20 interpretações é colher 20 vezes mais acaso, e o número **vai para a tela**. **O card se desliga em JPEG e WebP** e diz por quê: formato com perda descarta justamente o bit baixo, e rodar ali devolveria ruído indistinguível de "não achei". Decidido pelos BYTES, não pela extensão. Sob botão, e com teto de 64 KB por interpretação, em vez de worker — quem esconde texto numa imagem começa do primeiro pixel, porque é o único ponto de partida que o outro lado sabe achar. **Um erro meu, pego pelo teste:** a varredura ordenava por `maiorCorrida`, que não passa pelo filtro de variedade, e o canal alfa opaco produzia uma corrida de `UUUU…` que vencia a mensagem de verdade. Quem ordena o resultado tem de ordenar pelo mesmo critério que decidiu o que é resultado.

**9.5 · Mesa de substituição manual** — ❌ **NÃO FEITA, e a recusa está medida.** O plano mandava reavaliar antes de começar, e a reavaliação derrubou o item. Das cinco metades de uma mesa clássica, quatro já estão entregues: a contagem de frequência ao lado do texto (aba Retrato), a leitura da estatística (régua do IC na Cola), a busca por forma de palavra (Anagramas) e agora aplicar o alfabeto (9.1). Sobra **uma** — o mapa parcial ao vivo —, e ela custaria ~950 linhas, 5 arquivos novos e a 17ª aba. **E uma proibição que fica escrita:** preenchimento automático de mapa por posto de frequência é PROIBIDO, agora ou depois. Medido sobre 86.332 letras de prosa real do acervo: 17,8% de acerto em 40 letras, 19,5% em 60, com pior caso 0,0% nos cinco tamanhos. É literalmente o card de "análise de frequência" da Equipe Arromba que este plano já recusou.

### Onda 10 — a aba de fichas · **AVALIADA, 2026-08-20 · veredito: versão menor**

**O pedido, textual:** "uma nova aba de coleta de dados onde eu poderia inserir filmes/músicas/atores/personagens, buscar dados sobre eles (múltiplos itens) — por exemplo uma lista de atores, e me traria data de nascimento, nome completo; ou filmes, com data de lançamento, duração em min".

**A pergunta que decide:** dá para resolver NOME → ENTIDADE sem produzir resposta errada com confiança? **Medido: não, se a aba tiver de responder "quem é".**

| medição | resultado |
|---|---|
| nomes célebres de ATOR, com o tipo declarado | 30 de 40 resolvem sozinhos · **9 têm 2+ candidatos** · 1 dá zero |
| títulos de FILME | 16 de 20 |
| títulos de MÚSICA | **11 de 20** |
| sem o tipo declarado | o topo é a entidade ERRADA em 3 de 9 — `Bacurau` → uma **ave**, `Aquarius` → uma **constelação**, `Elis` → um prenome |

**Portanto a Onda 10 como pedida não existe.** O que existe é outra coisa, e é boa: uma **triagem de candidatos por nome** — cada linha devolve uma entidade identificada, ou N candidatos que a máquina **se recusa a desempatar**, ou um não-achado que nomeia o que foi perguntado. Essa recusa já está escrita e testada no repositório: é o `? N candidatos` da coluna copiável do Lote.

**E é MODO da aba Lote, não aba nova.** O `estado.ts` tem UM `AbortController` de módulo, com `parar()` e `emAndamento()` únicos: uma aba nova ou compartilha o abort — e aí o "Parar" de uma mata a rodada da outra, calado, que é o mesmo defeito de posse que a revisão do Lote já pegou um andar acima — ou duplica store, resumo, divisão em linhas e coluna copiável.

**Três campos pedidos NÃO EXISTEM na fonte, e isso é do veredito:**
- **duração de música** morre nas duas fontes. No Wikidata, 12% (2 de 17). O MusicBrainz tem o campo (92%) e **não tem a identidade**: ele indexa GRAVAÇÃO, não obra — "Garota de Ipanema" devolve 564, "Baby" devolve 145.475. Imprimir a duração de um cover arbitrário com cara de dado oficial é a forma industrial do pior defeito da casa.
- **nome completo** reconstruído de P735+P734 produz nome plausível e errado em sobrenome composto. Mesma família do "Regresso ao Futuro".
- e há uma armadilha que só uma das três avaliações viu: **"Carlos Drummond de Andrade" devolve zero** em pt/pt-br/en, porque o rótulo do poeta vive na língua `mul`. Uma consulta que fixa idiomas fabrica falso-negativo **silencioso** — e a migração para `mul` no Wikidata é ampla, então isso é uma classe, não um caso.

**Pré-requisito que vale sozinho, mesmo que o resto seja cancelado:** o `IWikidataGateway` tem balde de 30/min do servidor inteiro e um disjuntor (`FailureRatio 0.5`, `MinimumThroughput 8`) no MESMO `HttpClient` que serve o card de filme **já em produção**. Um lote de nomes lento abre esse disjuntor e apaga uma funcionalidade entregue. Pipeline próprio, com timeout maior que 12 s (a p95 do WDQS medida é 11,37 s).

**A conta de valor, que é por que é "menor" e não "agora":** ninguém achou UM pedido medido. A avaliação que argumentou contra extraiu 80 dos 81 PDFs do acervo e achou zero ocorrências de "data de nascimento", "duração", "elenco" — e **desqualificou honestamente o próprio achado**, porque 34 dos 80 PDFs têm menos de 120 caracteres extraíveis. Está certa: ausência de evidência não é evidência de ausência, e isso não conta contra. Mas também não conta a favor.

### Placar da fila

| onda | itens | esforço | capacidade nova | custo por tecla |
|---|---:|---|---|---|
| 0 · a bancada mente | 10 | 9 P + 1 M | zero | zero |
| 1 · o portão que falta | 2 | 2 P | zero | zero |
| 2 · transposição sem chave | 1 | M | 1 | **+~22 variantes** |
| 3 · só existe aqui | 6 | 1 M + 5 P | 6 | +1 decoder de portão duro |
| 4 · motor sem tela | 3 | 1 M + 2 P | 3 | zero |
| 5 · dados do Vale | 9 | 5 M + 4 P | 6 | +2 decoders pré-resolvidos |
| 6 · catálogos concordam | 10 | 2 M + 8 P | 9 | +4 de assinatura literal, +1 chip |
| 7 · IMDb/Spotify/Lote | 3 | 2 M + 1 G | 3 | +2 confirmados, +1 aba |
| ~~8 · cadeia automática~~ | ~~5~~ | — | — | **CANCELADA** |
| 9 · os caros | 5 | 2 G + 2 M + 1 P | 5 | +Morbit (com teto), +homóglifos |
| **10 · aba de fichas** | ? | **a investigar** | ? | zero — é aba, e sob botão |

**Não medido:** dias de trabalho. O plano antigo usava ~5 h por capacidade; mantive P/M/G e não converti, porque a conta de dias dele nunca foi medida e repeti-la aqui seria transformar estimativa em número.

---

## 2 · O que mudou de veredito

A Frente C mediu **20 portões** (as 15 cifras que a Equipe Arromba implementou e nós não, mais 5 que já estavam aprovadas), contra dois corpora: **13.144 entradas reais** extraídas de 79 provas do acervo e **20.000 sintéticas** em 24 classes colisoras. Resultado:

> ### Regra de método, decidida pelo dono em 19/08/2026
>
> **Ausência no acervo não é evidência de ausência.** Existem edições que aconteceram e nunca
> foram mapeadas — este repositório já conhece quatro (`itc-2024`, `itc-2025`, `cp-2024`,
> `cp-2025`), e não há razão para supor que sejam as únicas. Contar zero num arquivo que não
> é censo mede o arquivo, não o mundo.
>
> Onde este documento usou "0 ocorrências em 79 provas" como razão, a razão **saiu** e a linha
> foi reescrita com o argumento que se sustenta sozinho. Nenhum veredito mudou — o que mudou é
> em que eles se apoiam, que era exatamente o que o item 0.9 pedia.
>
> **Presença no acervo continua valendo como âncora.** O que não vale é o contrário.
>
> **E a regra já estava escrita aqui dentro**, em `docs/QUEBRAR-PROVAS.md:854` — *"Uma cifra
> marcada 'última 2023' pode ter reaparecido numa prova física não gabaritada. **Nunca trate
> 'adormecida' como 'extinta'.**"* Ela existia e vinha sendo violada nos outros quatro
> documentos. Não é regra nova; é regra que voltou a valer.

**Zero recusas reabertas.** As 11 recusas confirmadas, cada uma com o número que a sustenta:

| cifra | veredito | rejeição medida (real / sintético) |
|---|---|---|
| Hill (chave válida `3 3 2 5`) | **mantém a recusa** | 51,64% / 77,63% — emite alfabeto aleatório a 0,65 fixo |
| Enigma M3 | **mantém a terceirização** | 30,73% / 64,30% — a pior das 20; roda com rotores padrão sem chave |
| Four-square / Two-square | **mantém a terceirização** | 64,56% / 78,05% |
| Morse fracionada | **mantém a recusa** | 42,70% sem chave / 35,96% com chave (69,81% e 68,08% no sintético) |
| Straddling checkerboard | **mantém a recusa** | 42,58% sintético com chave — dispara em 57% das entradas numéricas |
| Base62 | **mantém a recusa** | passa a R1 (99,76%/86,70%) e cai por outro motivo: **2.792 disparos, 100% com outra base nossa já falando, 0 sozinha** |
| UUencode | **mantém (gaveta)** | assinatura 100%/100%. ~~E 0 ocorrências em 79 provas~~ — argumento de ausência retirado (ver a nota da §2). O que o mantém na gaveta é o custo de oportunidade: nada o pede, e nada nele urge |
| Grelha de Cardan | **mantém a recusa** | não há string; o "decoder" deles é legenda disparada pela palavra, a 0,90 |
| Substituição por frequência **como card** | **mantém a recusa** | passa a R1 (97,61%/100%) e acerta **0% a 18,2%** das letras, sempre a 0,40 |
| Bandeiras / semáforo náutico | **mantém (gaveta)** | ~~0 âncoras nas 79 provas~~ — argumento retirado. Fica na gaveta pela mesma razão de antes do acervo: a entrada real é **imagem**, e não há string para decodificar |
| Nihilist | **mantém (gaveta)** | passa a R1 (99,98%/99,72%). O gatilho escrito era "apetite por cifra clássica com chave" — e ele não pode ser considerado **não disparado** com base no acervo, que é incompleto. Fica na gaveta por outro motivo, que sempre valeu: **exige chave, e o card sem chave não decifra nada** |

**O argumento que fechou os dois gatilhos de gaveta:** a resolução de 2025 (`2025/Rivage-resolucao.pdf:634`) traz a lista que os **próprios organizadores** escreveram das charadas "que já utilizamos diversas vezes" — Código de Rua · Lei que nomeou a rua · Extensão da rua · binário · Braile · Morse · A=1 · Coordenada · ASCII · Plus Codes · Alfabeto Lost Symbol · Teclado de telefone · Anagrama · Mapa sem nomes · Tabela Periódica. **Os 15 estão todos na bancada.** Nenhuma das 15 cifras medidas está lá. `grep -i` por adfg, nihilist, four-square, hill, cardan, semáforo, scytale, punycode, quoted, uuencode, timestamp, base62/91 e checkerboard nas 79 provas devolve **0** em todas (os 4 hits de "enigma" e os 2 de "templ" são o substantivo comum e "contemplativo").

**Quatro linhas que eram erro nosso, não recusa:** Base91, Pigpen, Número por extenso e Cifra de livro estão **implementados**, e nos três primeiros o nosso desenho é o oposto do deles pelo motivo certo. Vira o item **0.10**.

**Um veredito novo, contra a nossa própria bancada:** `base36` reprova a R1 com 33,11% no corpus real. Vira o item **0.8** — com a ressalva de que ele emite a 0,30, abaixo do corte de 0,35 do `partition`, e portanto é ruído de gaveta, não resposta errada no topo.

**Uma promoção:** transposição sem chave sai da Onda 4 e vira a Onda 2, porque a medição mostrou que ela não é capacidade nova — é **retirada de resposta errada** (railfence a 0,72 sobre um scytale real, com a resposta certa ausente da lista).

**Uma antecipação:** o chip ADFGVX sai da Onda 5 e entra na Onda 6, porque o portão mediu 100,00% de rejeição em 33.144 entradas e o custo é P, enquanto o estado atual são 7 cards errados ≥0,35 num ADFGVX de verdade.

**Uma âncora que ficou mais forte:** "Alfabeto Lost Symbol" na lista de 2025 é a família maçônica/pigpen, que já temos em `glyphs.ts`.

**Uma âncora que ficou mais fraca:** as bandeiras do ICS não aparecem na lista dos organizadores — o item 3.4 fica, com o gatilho invertido.

**E cinco itens que já estavam aprovados continuam na mesma onda**, agora com número em vez de suposição: punycode (100%/100%), Quoted-Printable (100%/100%), timestamp (99,02%/96,30%), scytale/transposição (94,64%/97,50% **com** o nosso selo, contra 71,93% na versão deles) e o retrato estatístico. Em todos os cinco, **existir implementação ao lado só ajudou porque ela foi lida antes de ser copiada** — e o que ela rendeu foram dois defeitos nomeados para não repetir (card vazio a 0,75 no punycode; `charCodeAt & 0xff` corrompendo não-ASCII no QP).

---

## 3 · O que depende de outra pessoa

### 3.1 · Do colega da Equipe Arromba (arquivo, e a pergunta que vai junto)

Medido que **não há atalho técnico**: as rotas `api/...` dos decoders deles são relativas a `equipearromba.com.br/bases/` e são backend **deles**. `curl -s -o /dev/null -w '%{http_code}'` devolve **404** em `apiarromba.thelogiclab.com.br/api/vagas/742`, `/api/abrigos/C1`, `/api/imovelrural/8011234567890`, `/api/geodesico/estacao?cod=1400M` e `/api/postes?raio=150&perto=...`; na mesma host, `/api/lookup?q=3448` devolve **401** (rota nossa, existe, exige token); e `equipearromba.com.br/bases/api/vagas/742` devolve **200**. Só foi medido código de status — **nenhum corpo de rota deles foi lido**, e raspar aquele backend está recusado (§5).

Pedir, com a procedência de cada um:

1. **Vagas da área azul** — 3.448 linhas com rua, número, setor, tipo, lat, lng (alimenta 5.7);
2. **As 42 vagas especiais** com tipo, quantidade e referência;
3. **Os 59 abrigos** com código, nome, logradouro, bairro, telefone, lat, lon (alimenta 5.6) — **e a confirmação de que os códigos `C1..W99` são da Defesa Civil e não convenção do app deles**, porque a regex de 5.6 depende disso;
4. **Os 2.520 imóveis do SNCR**, sem titulares (alimenta 5.5);
5. **O acervo Cacarecos**, 8.481 itens em 9 categorias (alimenta 5.8) — **combinar o uso, não só receber o arquivo**: é catálogo de um particular, e trazer para dentro é redistribuir acervo de outra pessoa;
6. **A articulação de folhas** que eles usam, só para conferir contra a que baixaremos do geoportal (5.4 não depende dela).

**Ressalva de contagem, que é minha:** os números 3.448 / 42 / 59 / 2.520 / 8.481 vêm do dashboard deles (`ARROMBA-INVENTARIO`) e **não foram medidos contra arquivo nenhum**. Se a base de vagas tiver buracos, o intervalo 1..3448 não é contínuo e o tamanho do pré-resolvido muda.

**E o SAMAE não tem o que pedir:** o comentário no próprio código deles diz que a consulta automática não é possível porque o GSAN protege o formulário com reCAPTCHA v2, e o decoder deles é só um link. Não existe arquivo. Fica o verbete (item 0.12) e, se o dono quiser o dado, o caminho é **LAI**, fora desta fila.

### 3.2 · Do dono (decisão, não trabalho)

| # | decisão | onde trava |
|---|---|---|
| D1 | `build:ceps` sai da cadeia `build:data`, ou o CSV volta | item **0.11** |
| D2 | Liberar a primeira leva e2e | item **6.G** — as Ondas 2, 7 e 8 entram sem rede se não |
| D3 | O veredito de cada argumento falso nas 5 superfícies, e a decisão sobre as 41 resoluções | item **0.9** |
| D4 | A **exceção declarada** da cauda de geohash (rejeição 0,0% contra o piso de 79,8%) fica escrita como exceção, e não como precedente | §4/R1 |
| D5 | A área azul entra como **dado**, e o eixo número→vaga **não** entra — ou é uma segunda exceção declarada | item **5.7** |
| D6 | Corte de votos do recorte IMDb: **≥5.000** (19.000 filmes, 384 KB gzip, padrão proposto) ou ≥25.000 (7.254 filmes, 152 KB) | item **7.1** — o pior caso da prova real tem 414.791 votos, 83× o corte |
| D7 | Profundidade 3 da cadeia como **segundo botão**, depois, com o mesmo portão — ou nunca | Onda 8 |
| D8 | Fazer o OCR/transcrição do acervo (item **8.0**), que é o que destrava o acerto real da cadeia e os gatilhos de reabertura de três recusas | Onda 8 |

### 3.3 · De terceiro, fora do nosso alcance

- **SAMAE** — só por LAI; reCAPTCHA em toda busca e exposição de dado pessoal de terceiro na 2ª via.
- **Vagas da área azul na fonte** — a rota do app Rek Pay já falhou por MITM (QUIC/MapKit pinado); resta o arquivo do colega, o espelhamento ou a LAI.
- **Articulação municipal** — publicada no ArcGIS aberto do geoportal (`voo/Articulacao_1000_2022`, `voo/Articulacao_5000_2022`), **sem login**: esta **não** depende de ninguém.
- **Licença IMDb** — *personal and non-commercial*. Se a bancada mudar de natureza, o item 7.1 é o primeiro a ser reavaliado.

---

## 4 · Riscos

A numeração continua a de `PLANO-CATALOGOS.md` §5 — R1 a R9 continuam valendo como estão escritos lá. O que muda:

**R1 · A régua de admissão (rejeição ≥ 79,8%) — o que ela barra nesta rodada.** Ela barra, com número:

| barrado | rejeição medida |
|---|---|
| decoder numérico de vaga (`^\d{1,4}$`, 1..3448) | **65,5%** — e 0,0% do intervalo está livre de resposta pré-resolvida nossa |
| decoder de matrícula SAMAE (`^\d{5}$`) | **0,0%**, sem base atrás |
| `base36` como está hoje | **33,11%** real / 71,43% sintético — dentro de casa |
| scytale na implementação deles (sem portão de saída) | 71,93% real |
| número por extenso na direção deles (dígitos→extenso solto no fan-out) | 74,43% sintético |
| `rua-vagas`, `abrigo-busca` e o ramo de texto do `cacarecos` | não medidos como taxa; barrados por competirem com `street-name` a 0,62 e por abrirem consulta em qualquer palavra digitada |

E ela **aprova**, também com número: cauda de UTM 98,67% · imóvel rural ≈99,99997% · abrigo por código 88,1% · chip ADFGVX 100,00% · punycode 100,00% · Quoted-Printable 100,00% · timestamp 99,02% · `imdb` 100,000% · transposição **com o selo** 94,64%.
**Duas exceções declaradas, e são as únicas:** (a) a **cauda de geohash**, que fica no leque com 0,0% de rejeição por decisão do dono, sustentada pela nota 0,52, pela lista rotulada e pela Cola corrigida hoje; (b) o **Spotify**, que passa em número (99,988%) mas cujos dois falsos positivos são **prosa portuguesa** — e por isso a régua nele não é a porcentagem, é a segunda porta: só emite depois do 200 do oEmbed. Toda vez que a régua for excedida, a exceção vira linha aqui. Sem isso ela deixa de ser régua.

**R3 · Custo por tecla somado.** **Não medido como soma** — e digo isso em vez de somar as parcelas, porque as medições vieram de bancadas diferentes. O que **está** medido:
- piso atual, com os datasets carregados: `'blumenau'` 2,3 ms · 17 letras 9,7 ms · **60 letras 44,8 ms** · `'1723680000'` 0,2 ms · domínio de 23 caracteres 2,9 ms · frase de 95 caracteres 11,4 ms (Frente C, melhor de 5); e média 7,6 ms com **47,3 ms na entrada colada de 225 caracteres** (Frente A);
- o teto citado em `substituicao.ts` é 50 ms — ou seja, **a entrada colada e longa já consome o teto sozinha, hoje, antes de qualquer item deste plano**.

Do que entra no leque: 4 itens têm assinatura literal e não conseguem fazer ruído nem gastar tempo (punycode, QP, MIME, escapes); 2 são pré-resolvidos e só varrem base pequena (imóvel rural, abrigo); 2 só existem com confirmação de rede (imdb, spotify) e não bloqueiam a corrida síncrona; 1 é chip de sniffer. **Sobram dois que gastam de verdade: a transposição (~22 variantes, exatamente na forma de entrada de 60 letras que já custa 44,8 ms) e o Morbit (com teto de trabalho e poda pelos primeiros pares — sem isso são 362.880 permutações por tecla).** Regra que os dois itens carregam no portão: **teto assertado em teste**, medido antes de entrar. E a cadeia automática, que seria o maior gasto de todos, **não entra no leque** — é botão, e o número que a manteve fora é 6× a 17,6× o fan-out atual por tecla.

**R10 · O acerto da cadeia está medido sobre material sintético.** O falso positivo (0/560) está medido sobre 300 linhas de prova real; o **acerto (11/13) está medido sobre 13 cadeias que a Frente A construiu**, porque as cifras do acervo estão nas imagens. É por isso que o item 8.0 é pré-requisito de fechar a onda, e não melhoria.

**R11 · O tempo da cadeia é de Node num Mac, não do navegador.** A mediana de 485 ms e o máximo de 1,63 s podem piorar com a thread principal ocupada e 32 MB de heap de vocabulário montado. O item 8.1 traz teto assertado em teste, mas o número que vale é o do navegador — **medir uma vez com o painel montado antes de publicar**.

**R12 · O portão da cadeia depende do vocabulário carregado.** Ele chega por `requestIdleCallback`, ~1,2 s depois da montagem. Se o botão ficar clicável antes, o portão julga com `WORDS = null`, a cobertura é 0/0 e a cadeia fica **muda sem dizer por quê** — que é exatamente o defeito que a onda inteira existe para evitar. Está no portão do item 8.3, e é o erro mais fácil de deixar passar.

**R13 · Procedência não verificada com a cara de dado oficial.** Quatro bases da Onda 5 chegam de terceiro. Se o carimbo ficar só no documento (e não na UI, item 5.9), a bancada apresenta dado de origem desconhecida com a mesma cara do CEP oficial.

**R14 · A R1 nunca foi aplicada ao acervo existente.** `base36` mede 33,11%. **Os outros 116 decoders não foram medidos.** Há risco real de existirem mais reprovados dentro de casa do que candidatos recusados fora — é uma varredura de Onda 0 que este documento **abre e não fecha**.

**R15 · A colisão está subcontada.** As medições de `runDecoders` das Frentes B e C rodaram com `ceps`, `municipios`, `airports` e `pix` nulos (hoje vêm pré-resolvidos da API). Os números de "quantos decoders já acendem" são **piso**: com as consultas ligadas, o topo é mais disputado do que o relatado.

**R16 · Uma frente chegou truncada até mim.** O item 7.3 (aba Lote) veio cortado no meio da lista de arquivos. Reconferi no código as duas afirmações que sustentam o desenho (`valeConsultar` e `cancelarSuperadas`) e marquei o resto como "reler na frente antes de começar". A conta de itens desta onda é **piso**.

---

## 5 · O que fica de fora, com gatilho de reabertura

**As 67 recusas de `PLANO-CATALOGOS.md` §3 continuam valendo integralmente**, com os critérios e gatilhos já escritos lá. Onze delas ganharam número nesta rodada (§2) e devem receber uma coluna "rejeição medida" com a data no mesmo documento — **linha sem número medido não entra na tabela**.

O que esta rodada **acrescenta** à lista de fora:

**Da cadeia (Frente A):**
- **A régua de legibilidade deles** (0,55 sobre ~240 palavras à mão) — reprova **4/4** das respostas coladas e 1/5 dos textos claros com espaço, e dentro da cadeia trava o acerto em **3/12 a 5, 10, 20 e 40 ramos**. É segura por ser surda. *Reabre: nunca — as 451.016 palavras do `words-index.bin` fazem o trabalho que 240 não fazem.*
- **Portar a estrutura deles trocando só a régua pelo nosso `scorePlaintext`** — 45% de falso positivo nas não-cadeias e 61,5% nas adversárias. *Reabre: nunca.*
- **`RAMOS_POR_NIVEL = 5`** — alcance 3/12; joga fora 9 das 12 respostas antes de qualquer portão julgar, e economiza 117 ms contra 551 ms, que dentro de um botão é o mesmo custo. *Reabre: se o teto de tempo do navegador (R11) provar ser proibitivo — e aí o corte é do orçamento, não do número de ramos.*
- **`PROFUNDIDADE = 3`** — 294 rodadas, 34.400 `decode()`, 2,2 s médios, 14 s no fan-out completo de uma entrada colada. *Reabre: como **segundo botão**, com o mesmo portão, se as cifras transcritas em 8.0 mostrarem cadeia de 3 camadas no acervo.*
- **`TETO_MS = 300` com `Date.now()`** — viola o bloco ORÇAMENTO de `substituicao.ts:67-75`: relógio faz a mesma entrada devolver cadeias diferentes conforme a máquina esteja ocupada. *Reabre: nunca.*
- **A lista `IGNORAR` de 35 ids** — 27 não existem no nosso registry e 8 já são barrados de graça pelo `chainValueOf`. *Reabre: nunca — uma lista de nomes envelhece, a regra estrutural não.*
- **A cadeia como decoder no registry** — viola a R3 ("nada com busca combinatória entra no leque") e custa 6× a 17,6× por tecla. *Reabre: nunca.*
- **Portões intermediários** (só cobertura ≥8/60%; só ≥12/75%; ≥16/80%) — vazam 20%–30%, 19,3% e derrubam o acerto de 11 para 8 de 12. *Reabre: nunca — só o conjunto de seis fatores fecha os dois lados.*

**Das bases do Vale (Frente B):**
- **Decoder numérico de vaga** (§4/R1). *Reabre: se o dono declarar a exceção D5, por escrito, como fez com a cauda de geohash.*
- **Decoder de matrícula SAMAE.** *Reabre: nunca como decoder; o dado, se vier por LAI, entra como consulta pré-resolvida.*
- **`rua-vagas` e `abrigo-busca` como decoders de texto livre** — duplicam o `street-name`, que já responde 0,62 no mesmo texto, e disparam consulta a cada nome digitado. *Reabre: nunca no leque; existem como busca dentro do painel.*
- **Ramo de texto do `cacarecos`** — `vinil` hoje devolve 21 cards com `affine` 0,64 no topo. *Reabre: nunca no fan-out.*
- **Estado "aberto agora" do abrigo dentro do decoder** — rede em corrida síncrona, e estado de enchente errado é pior que ausente. *Reabre: no painel, com carimbo de hora da coleta.*
- **Reimplementar a folha cartográfica nacional (níveis 2..7)** e **reimplementar `postes/near`** — já existem, medidos um a um. *Reabre: nunca; o trabalho é fiação.*
- **Raspar `equipearromba.com.br/bases/api/*`** — é o backend do colega. *Reabre: nunca; o caminho é pedir o arquivo.*
- **Copiar os `forcedScore` deles** (vaga 0,42 · SAMAE 0,40 · marco sem letra 0,30 · chapa 0,55) — são notas de **forma**, e a nossa régua só dá nota alta a acerto confirmado. *Reabre: nunca.*
- **Nomes de titulares do SNCR** — o próprio Arromba os removeu de propósito. *Reabre: nunca, nem como campo oculto.*

**Das cifras (Frente C):** copiar o scytale deles (71,93%, sem portão de saída), o Quoted-Printable deles (`charCodeAt & 0xff`), o punycode deles (card vazio a 0,75) e o número por extenso deles (direção fácil solta no fan-out a 0,35). *Reabrem: nunca — as capacidades entram, as implementações não.*

**Dos identificadores (Frente D):** **expor o QID** como valor clicável, encadeável ou coluna copiável — 95,8% dos QIDs de 6 dígitos viram coordenada dentro da região da própria gincana. *Reabre: se e quando a cauda de geohash sair do leque — e não antes.*

**E o gatilho que ficou honesto e aberto:** as recusas de **Nihilist, semáforo náutico e Grelha de Cardan** se apoiam em "0 âncoras no acervo", e esse zero cobre só a metade legível — 33 dos 79 PDFs de prova têm menos de 120 caracteres extraíveis e há 22 JPGs. É ausência de evidência, não evidência de ausência. **Quem quiser reabrir qualquer das três tem um caminho escrito: o item 8.0.** Enquanto não houver OCR, o gatilho segue não disparado.