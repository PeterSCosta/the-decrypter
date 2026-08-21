<!-- Gerado em 2026-08-20 a partir da varredura do r/codes (38.140 posts de 01/2018 a 08/2026 e 76.213
     comentários de 01/2023 a 08/2026), cruzada com o registry real da bancada e com o dicionário de
     mecânicas do acervo das gincanas. Linha de base RE-MEDIDA nesta passada, não herdada.
     Método: cada uma das 50 fichas foi escrita contra o código (não contra o documento) e depois
     submetida a uma passada adversarial que tentou derrubá-la — refazendo as contas dos vetores,
     reproduzindo as medições de portão e conferindo se a capacidade já existia. O veredito dessa
     passada está na linha "crítica" de cada ficha, e onde ela corrigiu um número, vale o dela.
     Nenhum arquivo do repositório foi editado para escrever este documento. -->

# Plano — as lacunas do r/codes na bancada (ondas 11 a 14)

**Data:** 2026-08-20 · **Repositório:** `/Users/peter/Repos/the-decrypter`

Este documento **não substitui** [`PLANO-CATALOGOS.md`](PLANO-CATALOGOS.md) nem
[`PLANO-EXECUCAO-2026-08.md`](PLANO-EXECUCAO-2026-08.md). Ele abre uma fila nova, numerada a partir
da **onda 11** porque as ondas 0 a 10 já estão gastas nos dois documentos anteriores, e se submete à
mesma régua (R1–R9 do plano dos catálogos, §5). Onde um item deste plano contraria uma decisão já
escrita, o conflito está nomeado na ficha — nunca resolvido em silêncio.

---

## 0 · Linha de base, medida hoje

| o que | medido | como |
|---|---:|---|
| decoders no registry | **134** | dump do `decoders` de `engine/registry.ts` (contar arquivos de decoder dá 98, e erra: há decoder em `ciphers.ts`, `codecs.ts` e `lookups.ts`, e há arquivo com mais de um) |
| por categoria | 48 consulta · 33 cifra · 29 transformação · 24 codificação | mesmo dump |
| abas | 16 | `src/app-tabs.ts` |
| testes | **2.018 verdes** em **161 arquivos**, 10,75 s | `npx vitest run` nesta passada |
| chips do sniffer | 15 | `engine/sniff.ts` |
| decoders que consomem `ctx.key` | 15 | grep no motor |
| decoders que consomem `ctx.aux` | **4** | `alfabeto`, `count-key`, `hash-check`, `placa-veiculo` |
| decoders com `encode` | 9 | grep no motor |

O número que importa para este plano é o **4**: o segundo campo existe desde a onda 2 do
`PLANO-CIFRAS` e continua praticamente vazio — a divergência D8 daquele plano segue verdadeira. Boa
parte da fila abaixo é justamente o que dá uso a ele.

---

## 1 · Por que existe uma fila nova

Os dois planos anteriores foram medidos contra duas fontes: o **acervo das gincanas** (o que já
caiu numa prova) e os **cinco catálogos** de ferramentas (o que existe no mercado). As duas
respondem à mesma pergunta — *o que existe?* — e nenhuma responde à outra: *o que as pessoas de
fato trazem para a mesa quando não sabem o que têm na mão?*

Esta fila vem de um terceiro eixo, medido pela primeira vez: **oito anos do r/codes**, o maior
fórum público de cifras (132 mil assinantes). O relatório completo, com método e limites, está no
artefato que acompanha este plano. O que o eixo novo mostra, e que nenhum dos dois anteriores
mostrava:

1. **A família do quadrado de Políbio é o maior vão.** Nihilist, four-square, two-square,
   straddling checkerboard, monome-dinome, Grandpré e Syllabary: a bancada não tem nenhuma, o
   acervo nunca usou nenhuma — **não há uma única mecânica de fracionamento em 38 mecânicas do
   dicionário** — e o r/codes usa todas. O próprio `reference/sources.ts:446` já registrava a
   ausência em prosa, mandando abrir o Boxentriq.
2. **A substituição homofônica é a lacuna clássica mais citada do corpus** (156 menções, +511% de
   2018-2020 para 2024-2026) e é a única família de substituição que o `substituicao` da casa **não
   quebra por construção**: o solver é monoalfabético.
3. **O r/codes está saindo de codificação de computador e entrando em símbolo desenhado.** Base64,
   hex, binário e octal caíram um terço; pigpen, runas, Galáctico Padrão e as cifras históricas
   dobraram. A bancada é forte exatamente onde o fórum está saindo, e a Cola é o lugar barato de
   acompanhar o movimento.

**O que este plano NÃO é.** Não é "ter tudo o que o r/codes cita" — 99 dos itens triados foram
recusados com razão escrita, e a recusa está na §5. E não é uma segunda fonte da verdade: os itens
que já têm destino em [`INVENTARIO-CATALOGOS.md`](INVENTARIO-CATALOGOS.md) continuam com o destino
de lá, salvo quando a ficha argumenta a mudança em voz alta.

---

## 2 · A régua não muda

Vale a régua já escrita, e este plano não pede exceção a nenhuma cláusula:

- **R1 · assinatura que rejeita.** Decoder novo no leque precisa de portão com rejeição medida
  acima de 79,8% (a do Plus Code curto) ou portão extra. Quem não tem assinatura não entra no
  leque: vai para o modo **uma cifra só** (`ctx.only`), para **chip do sniffer** ou para a **Cola**.
- **R2 · resposta errada com nota alta é o pior defeito.** Quem não se autoverifica entra com teto
  de nota, abaixo do piso de quem se autoverifica.
- **R3 · nada combinatório no leque.** Busca com espaço grande vai para botão, para `ctx.only` ou
  para Worker, sempre com **orçamento de trabalho contado em passos**, nunca em relógio — a regra
  que o `substituicao`, o `pollux-morbit` e o LSB de imagem já seguem.
- **R4 · nada novo no bundle inicial.** Tabela grande é carga preguiçosa (como as pontes) ou
  `seed-data/` + API (como CEP e CID-10).
- **R6 · item fechado sem linha de documento volta como proposta.** Cada item entregue por esta fila
  fecha com uma linha em `INVENTARIO-CATALOGOS.md` — que tem teste (`reference/inventario.test.ts`)
  e falha quando o documento diz `trazer` e o decoder já existe.
- **A regra de destino.** O que precisa entrar numa cadeia é **decoder**; o que é exploração é
  **aba**; o que se lê mas não se digita é **legenda na Cola**. Um alfabeto que chega como foto não
  vira decoder por vontade — vira legenda.
---

## 3 · As ondas

Cinquenta fichas, todas medidas contra o código de hoje e todas submetidas a um crítico que
tentou derrubá-las: **34 mantidas com correção**, **13 mantidas**, **1 derrubada** e **2 sem
parecer explícito** (o crítico da fatia não emitiu veredito para elas — estão marcadas na ficha).

| onda | tema | itens | P/M/G | horas somadas | destino dominante |
|---|---|---:|---|---:|---|
| **11** | o que é barato e não faz ruído | 16 | 13/3/0 | ~31 h | decoder-no-leque (12) |
| **12** | o que depende de chave e do 2º campo | 21 | 14/7/0 | ~51 h | decoder-no-leque (15) |
| **13** | consulta com base de dados | 1 | 0/0/1 | ~2 h | consulta (1) |
| **14** | os caros e os que dependem do dono | 12 | 4/1/1 | ~22 h | recusar (7) |

> As horas são a soma do que cada ficha declarou, e **não** incluem revisão nem teste de
> regressão do que a onda toca. Trate como piso.

**Por destino, somando as quatro ondas:** `decoder-no-leque` 30 · `recusar` 8 · `decoder-so-cifra-unica` 6 · `legenda-na-cola` 4 · `chip-do-sniffer` 1 · `consulta` 1.

---

## 4 · Fichas

Cada ficha traz o que a implementação precisa e o que a crítica exigiu. Onde a crítica derrubou
um número, o número corrigido está na linha **Correção**, e é ele que vale.


### Onda 11 — o que é barato e não faz ruído

#### 11.1 · Quadrado de Políbio chaveado — a peça comum da família (e o portão do `polybius` de hoje)

`decoder-no-leque` · **P (~2h) — polibio.ts novo (~45 linhas), 2 arquivos deixam de duplicar (bifid, playfair), 1 regex trocada no po…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** O `polybius` já está no leque; o que entra é (a) uma peça comum que os itens 2, 4, 5, 6, 7 e 9 importam e (b) uma variante com chave que só nasce quando o campo chave tem letra — custo por tecla zero para quem não digitou chave. A peça JÁ existe duas vezes, duplicada: `src/features/decoder/engine/decoders/bifid.ts:9` (`bifidSquare`, exportada) e `src/features/decoder/engine/decoders/playfair.ts:3` (`buildSquare`, privada) constroem o MESMO quadrado de 25 letras. Unificar é a condição para os out …

**Portão.** Novo, estrito, substituindo `polybius.ts:15-18`: `/^[1-5][1-5\s.,;|\/-]*$/` sobre a entrada aparada, e nº par de dígitos ≥ 4. A variante chaveada só existe se `ctx.key.replace(/[^a-zA-Z]/g,"").length >= 2`; sem chave o comportamento é bit-a-bit o de hoje (menos os falsos que o portão estrito corta).

**Rejeição medida.** Portão de hoje: 48,59% (10.471 cards em 20.367 entradas). Portão estrito: passa 1.199/20.367 = 5,89% → **rejeição 94,11%**, mantendo 1.000/1.000 das tiras 1–5 de verdade. Ganho medido: 9.272 cards a menos por 20 mil entradas, zero acerto perdido. Corpus: 3.475 CEP + 3.475 CEP com hífen + 2.000 telefone + 2.000 A1Z26 com espaço + 2.000 A1Z26 colado + 2.000 dígitos aleatórios (8– …

**Autoverificação.** Parcial, e é a mesma de hoje: coordenada fora de 1..5 devolve `null` (`polybius.ts:35`). O quadrado chaveado NÃO acrescenta autoverificação — por isso não ganha `forcedScore`, continua sob `scorePlaintext`, e não sobe acima de quem se autoverifica.

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/polibio.ts · /Users/peter/Repos/the-decrypter/src/features/decoder/engine/polibio.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/polybius.ts (portão estrito + `inputs.key` + variante chaveada) · /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/bifid.ts:9-15 (passa a importar) · /Users/peter/Repos/the-decrypter/src/featu …

**API.** `engine/polibio.ts` exporta `quadrado25(chave: string): string` (25 letras, I/J unidos — o corpo de `bifidSquare`) e `quadrado36(chave: string): string` (26 letras + 0–9, para o ADFGVX). O decoder `polybius` mantém id/name/category `classical`, ganha `inputs: { key: { label: "Palavra-chave da grade", placeholder: "BLUMENAU" } }`, e `decode()` devolve 1 candidato sem chave (como hoje) ou 2 com chave ("grade padrão" e "grade BLUMENAU"), ambos com `chainValue` = a leitura.

**Vetor de teste.** Chave BLUMENAU → grade `BLUME / NACDF / GHIKO / PQRST / VWXYZ`. Claro `APONTE` → A(lin2,col2)=22 · P=41 · O=35 · N=21 · T=45 · E=15 → cifrado `22 41 35 21 45 15`. Volta com a chave: `APONTE`. **Hoje, sem chave, a bancada lê a MESMA entrada como `FPOFTE`** (grade fixa `ABCDEFGHIKLMNOPQRSTUVWXYZ`) — conferido.

**Riscos.** 1) Apertar o portão do `polybius` muda comportamento existente e o único teste que o cobre hoje é genérico (`registry.test.ts:22` só confere que `decode` devolve array) — o teste novo tem de prender as duas pontas (tira 1–5 entra, CEP/telefone não). 2) Com chave digitada para outra cifra (Vigenère) o `polybius` passa a emitir 2 cards; o `dobrar()` de `run.ts:56-70` só colapsa se a saída for idêntica. Mitigação: só emitir a variante chaveada quand …

**Conflito com decisão anterior.** nenhum — nenhum documento defende o portão frouxo atual; ele é achado desta passada e é da mesma classe da Onda 0 ("a bancada mente") do docs/PLANO-CATALOGOS.md:92.

**Correção exigida pela crítica.** - **O vetor de teste está errado.** A ficha diz "hoje, sem chave, a bancada lê a MESMA entrada como `FPOFTE` — conferido". Rodei o código real: `polybiusReal("22 41 35 21 45 15")` devolve **`GQPFUE`**. (`22`→idx 6→G, `41`→15→Q, `35`→14→P, `21`→5→F, `45`→19→U, `15`→4→E.) A grade chaveada e o cifrado `22 41 35 21 45 15` estão **certos**; o "antes" está errado. Uma ficha que erra o "antes" produz um teste que prende o número errado. - **A autoverifi …

#### 11.2 · ISO 6346 — marcação de contêiner

`decoder-no-leque` · **P — decoder ~80 linhas + reference/conteiner.ts ~60 (os valores das letras saem de um laço, não de tabela escr…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** É o item da fatia com a autoverificação mais limpa (DV módulo 11 fechado) e com a âncora geográfica mais forte: Itajaí é porto, e a fatia inteira é sobre objeto de rua fotografável. Entra em cadeia (o serial de 6 dígitos sai limpo; o código de tamanho/tipo entra pelo 2º campo). E o que ele substitui está medido na sonda: hoje `CSQU3054383` produz **4 cards ≥0,35**, três deles a 0,50 — `leetspeak` ("CSQUeosaebe"), `location` (69,65 / -102,96, Nunavut, no Ártico canadense) e `youtube` ("Vídeo do Y …

**Portão.** Após remover `[\s-]`: `const CONT = /^([A-Z]{3})([UJZ])(\d{6})(\d)$/` — 3 letras de proprietário + identificador de categoria obrigatoriamente U (contêiner de carga), J (equipamento destacável) ou Z (reboque/chassi) + 6 dígitos de série + DV — **E** o DV módulo 11 fecha. A 4ª letra sozinha rejeita 88,43%, o que REPROVA no piso R1 de 79,8%… não: passa por pouco, mas fica abaixo do que a casa aceita sem portão extra; com o DV vai a 98,86%, na mesma faixa da cauda de UTM (98,67%, `docs/PENDENCIAS.md` item 1.1), que é o atalho mais seletivo que a casa tem.

**Rejeição medida.** Corpus real: **100,00%** (0 disparos em 20.047). Sintético: **100,00%** (0 em 24.400). Condicionado à forma exata `AAAA9999999` (200.000 sorteadas): 4ª letra em U/J/Z sozinha = 88,43% de rejeição; **com o DV = 98,86%** (2.273 disparos em 200.000). Referência de calibragem: a cauda de UTM, o atalho mais seletivo que a casa aceita, rejeita 98,67%.

**Autoverificação.** Completa. Valores das letras: A=10, pulando todo múltiplo de 11 (11, 22, 33), até Z=38; multiplica por 2^0..2^9 e o resto mod 11 é o DV (resto 10 → 0). Confirmei rodando: `CSQU3054383` → C=13, S=30, Q=28, U=32 → **soma 6185** → 6185 mod 11 = **3** = DV lido ✓. DV furado NÃO vira card no topo: segue o desenho do `correios.ts:95` (0,9 quando fecha, 0,2 quando não fecha — diagnóst …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/conteiner.ts`, `conteiner.test.ts`, `src/features/reference/conteiner.ts` (valores das letras + tabela de tamanho/tipo ISO 6346 Anexo D), `src/features/reference/conteiner.test.ts`. EDITAR: `src/features/help/help-content.ts`, `src/features/help/help-examples.test.ts`, `docs/PENDENCIAS.md`. Renderer: `render:"code-list"`, nenhum componente novo.

**API.** `defineDecoder`. id: `"conteiner"` · name: `"Contêiner (ISO 6346)"` · category: `"lookup"` · inputs: `{ aux: { label: "Código de tamanho/tipo", placeholder: "45G1, 22G1, 42R1…" } }` — mesmo desenho do 2º campo do `placa-veiculo.ts` ("Cor da placa"), opcional e some do card quando não é código válido · encode: NÃO. `decode()` devolve 0 ou 1: `{ label:"CSQU3054383 · DV confere", output, notes, forcedScore: 0.9 | 0.2, chainValue: serial 6 dígitos, render:"code-list", data: CodeHit[] }`.

**Vetor de teste.** POSITIVO, conta minha: `CSQU3054383` → C=13, S=30, Q=28, U=32, depois 3,0,5,4,3 → pesos 2^0…2^9 → soma **6185** → 6185 mod 11 = **3** → DV 3 = lido ✓ → "proprietário CSQ · U = contêiner de carga · série 305438 · DV confere". Com o 2º campo `45G1`: 4 = 40 pés · 5 = 9'6" (high cube) · G1 = carga geral com aberturas de ventilação. NEGATIVO: `MSCU1234565` → soma 5528 → DV calculado **6**, lido **5** → card de diagnóstico a 0,2 (gaveta), com a conta inteira exibida, nunca no topo. NEGATIVO DURO: `CSQX3054383` (4ª letra fora de U/J/Z) → `[]`.

**Riscos.** (1) O nome do PROPRIETÁRIO exige o registro BIC (~2.700 códigos), que não é dado aberto para redistribuição — o card NÃO inventa dono: mostra o prefixo e um link para a consulta oficial, no mesmo espírito com que `placa-veiculo.ts` rotula a faixa de UF como compilação de terceiros. Sem esse cuidado o card vira a mentira que a casa mais combate. (2) O código de tamanho/tipo é uma marcação SEPARADA no contêiner; se a prova só fotografar o número, o …

**Conflito com decisão anterior.** Nenhum. Não consta de `docs/INVENTARIO-CATALOGOS.md` nem de `docs/PLANO-CATALOGOS.md` §3 (as 67 recusas), e o gabarito da Equipe Arromba não tem contêiner — `grep -i` por 6346/conteiner nos 81 PDFs do acervo devolve 0.

**Decisão do dono.** Nenhuma.

**Correção exigida pela crítica.** A frase da R1 está quebrada** e precisa ser reescrita: *"a 4ª letra sozinha rejeita 88,43%, o que REPROVA no piso R1 de 79,8%… não: passa por pouco"*. 88,43% **passa a R1 com folga**; a ficha se autocorrige no meio da linha e deixa o destroço. O argumento verdadeiro é outro: sem DV o card não teria autoverificação e cairia na R2. 2. **O 2º campo (`45G1`) é invisível no leque.** `decoder-workbench.tsx:62` só mostra `inputs.aux.label` quando o deco …

#### 11.3 · Código DOT de pneu (TIN — semana/ano no flanco)

`decoder-no-leque` · **P — decoder ~70 linhas + teste ~60** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** Assinatura LITERAL (o prefixo `DOT` gravado no flanco), que é a classe de portão que a casa mais aprova — a mesma do Punycode `xn--` (100,00% nos dois corpora, `help-content.ts:57`). E o campo legível existe: semana + ano de fabricação, ou seja uma DATA, que é o insumo mais encadeável que uma gincana tem (vira dia da semana, vira A1Z26, vira 4 dígitos de cadeado). O que ele substitui está medido: hoje `DOT B3 4H 3G8 5119` devolve 4 cards, com `documento` a **0,60** dizendo "CNPJ alfanumérico inv …

**Portão.** `/^DOT[\s-]?([A-Z0-9]{2,4})[\s-]?([A-Z0-9]{2})[\s-]?([A-Z0-9]{0,4})[\s-]?(\d{3,4})$/i` **E** semana entre 01 e 53 no último grupo. O grupo de fábrica aceita 2 a 4 símbolos de propósito: a marcação antiga usa 2 e a regra nova da NHTSA passou a exigir 3 — aceitar os dois evita que o portão envelheça junto com a frota.

**Rejeição medida.** Corpus real: **100,00%** (0 em 20.047). Sintético: **100,00%** (0 em 24.400). Dicionários: **0 disparos em 463.438 palavras** pt+en. Condicionado ao pior colisor imaginável — 100.000 strings `"DOT" + lixo alfanumérico de 6 a 12 caracteres`: 873 disparos = **99,13% de rejeição**, e quem segura é a faixa de semana 01–53.

**Autoverificação.** Fraca-média, e a nota diz isso. Não há dígito verificador; o que verifica é (a) o literal `DOT`, que é evidência de INTENÇÃO — coisa que o `timestamp` não tem e por isso entrou com teto (`timestamp.ts:12`) — e (b) a semana 01–53, que rejeita 47 de 100 pares possíveis. Por isso 0,88 e não 0,95: acima da faixa de palpite, abaixo do patamar de quem tem DV (0,9 do `correios`, 0,96 …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/dot-pneu.ts`, `dot-pneu.test.ts`. EDITAR: `src/features/help/help-content.ts`, `src/features/help/help-examples.test.ts`, `docs/PENDENCIAS.md`. Renderer: `code-list`. A tabela de códigos de fábrica da NHTSA (~1.000 linhas, domínio público) fica FORA por ora, com gatilho escrito: só entra se uma prova pedir a fábrica, e aí como carga preguiçosa.

**API.** `mapDecoder` basta (uma entrada → uma leitura). id: `"dot-pneu"` · name: `"Código DOT de pneu"` · category: `"lookup"` · inputs: nenhum · encode: NÃO. Retorno: `{ output: "51ª semana de 2019 — pneu fabricado entre 16 e 22/12/2019", label:"5119", notes: "…só um dos flancos traz o código de data completo…", forcedScore: 0.88, chainValue: "5119", render:"code-list", data: CodeHit[] }`.

**Vetor de teste.** POSITIVO, contas minhas: `DOT B3 4H 3G8 5119` → último grupo `5119` → semana **51**, ano **2019**. Calculei os dois calendários porque eles discordam e o card precisa dizer isso: contagem ISO-8601 → **16 a 22/12/2019**; contagem simples da indústria (1º de janeiro = semana 1) → **17 a 23/12/2019**. Idade em 20/08/2026 = **6 anos**. NEGATIVO: `DOT B3 4H 3G8 6819` → semana 68 não existe → `[]`. NEGATIVO DE PROSA: nenhuma das 463.438 palavras de `public/data/words-pt.txt` + `words-en.txt` dispara — inclusive as 12 que começam com "dot" (dotação, dote, dotalício…), porque nenhuma termina em grupo de 3-4 dígitos.

**Riscos.** (1) Só UM flanco do pneu traz o TIN completo; o outro pode trazer a versão sem data. O card tem de avisar, senão a equipe fotografa o lado errado e conclui que o pneu não tem código. (2) A contagem de semana da indústria não é normativa como a ISO-8601 — por isso o card entrega um INTERVALO com as duas leituras, e não uma data única. (3) Marcação de 3 dígitos (pré-2000) tem década ambígua; o card não pode escolher uma. (4) O decoder tem de ficar …

**Conflito com decisão anterior.** Nenhum. `grep -rniE "dot|pneu|flanco"` no `src/` do the-decrypter não acha nada do domínio, e o gabarito da Equipe Arromba não tem pneu.

**Decisão do dono.** Nenhuma para a fatia mínima. Se quiser a fábrica pelo código de planta, é a tabela da NHTSA (~1.000 linhas, domínio público) em carga preguiçosa — item separado, com gatilho.

**Correção exigida pela crítica.** 1. **BLOQUEANTE — a regex erra o pneu sem separador.** Testei `DOTB34H3G85119` (que é como o TIN é gravado no flanco): o portão da ficha casa e devolve `["B34H","3G","85","119"]` → **semana 11**, quando a leitura certa é semana **51 de 2019**. O `[\s-]?` opcional com grupos gulosos produz uma resposta errada **que passa no gate da semana** — R2 na veia. Conserto: âncorar o último grupo em `(\d{4})$` e resolver o split preferindo o grupo final de …

#### 11.4 · POSTNET / leitor de barras altas e baixas (2-de-5)

`decoder-no-leque` · **P — decoder ~100 linhas (tabela de 10 padrões, os dois sentidos de leitura, as duas notações) + teste ~80** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** Aqui EU CONTRARIO, com argumento, a regra que a casa usou contra bandeiras e semáforo náutico (`docs/PLANO-EXECUCAO-2026-08.md` §2: "a entrada real é IMAGEM, e não há string para decodificar"). A diferença é medível: na bandeira, transcrever JÁ É decodificar — quem identifica a bandeira Alfa já tem a letra A, e a bancada não acrescenta nada. Na barra, transcrever é mecânico e cego (alta/baixa, dois símbolos) e **depois** ainda falta a tabela 2-de-5 e o dígito verificador. Sobra trabalho para a m …

**Portão.** Exatamente DOIS símbolos distintos na string (aceita `|`/`.`, `1`/`0`, `T`/`S`, `l`/`,`); comprimento em {32, 52, 62} (POSTNET: 5, 9 ou 11 dígitos + DV, com as duas barras de moldura); primeiro e último caractere iguais ao símbolo ALTO; cada grupo de 5 barras do corpo tem exatamente 2 altas e consta da tabela 2-de-5; e a soma dos dígitos lidos (inclusive o DV) ≡ 0 (mod 10). Comprimento 47 entra como HIPÓTESE CEPNet (8 dígitos de CEP + DV) — ver riscos.

**Rejeição medida.** Corpus real: **100,00%** (0 em 20.047). Sintético: **100,00%** (0 em 24.400, incluindo 1.500 binárias aleatórias, 800 binárias que são ASCII de verdade, 800 de Morse e 800 de `|`/`.`). Condicionado ao pior colisor — 300.000 binárias sorteadas nos comprimentos 32/52/62: **2 disparos = 99,9993%**; e 0 em 50.000 binárias que são texto ASCII.

**Autoverificação.** A mais forte da fatia. Só 10 dos 32 padrões de 5 bits são válidos (2 altas de 5), e ainda há o dígito verificador módulo 10. Medido: **2 disparos em 300.000** strings binárias sorteadas nos comprimentos exatos (99,9993% de rejeição) e **0 em 50.000** strings de 32 bits que são ASCII de 4 letras. Nota 0,9 — acima do `binary-number` (0,50), e a inversão é justa: um deles conferiu …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/postnet.ts`, `postnet.test.ts`. EDITAR: `src/features/help/help-content.ts`, `src/features/help/help-examples.test.ts`, `docs/PENDENCIAS.md`. Opcional (P, mesmo commit): uma linha na `<Section title="Checklist de técnicas">` de `reference-panel.tsx:238` ensinando a transcrever alta/baixa.

**API.** `mapDecoder`. id: `"postnet"` · name: `"Barras altas e baixas (POSTNET / 2-de-5)"` · category: `"encoding"` (é transcrição reversível, não consulta a base) · inputs: nenhum · encode: SIM — `encode("20500")` devolve o desenho em `|` e `.`, e isso é barato porque a tabela já está ali. Retorno: `{ output:"20500 · DV 3 confere", label:"32 barras · 5 dígitos + DV", notes:"5 barras por dígito, 2 altas · a soma dos dígitos fecha em múltiplo de 10", forcedScore: 0.9, chainValue:"20500", render:"code-list", data: CodeHit[] }`.

**Vetor de teste.** CALCULADO POR MIM, ida e volta. Claro `20500` → DV = (10 − (2+0+5+0+0) mod 10) mod 10 = **3** → moldura + 2(00101) 0(11000) 5(01010) 0(11000) 0(11000) + DV 3(00110) + moldura = `10010111000010101100011000001101` (**32 barras**) = `|..|.|||....|.|.||...||.....||.|`. Volta: os 6 grupos de 5 dão 2,0,5,0,0,3 → soma 10 ≡ 0 (mod 10) ✓ → `20500` com DV conferido. HIPÓTESE CEPNet (a confirmar): `89010000` → DV = (10 − 18 mod 10) mod 10 = **2** → **47 barras** = `||..|.|.|..||......||||...||...||...||.....|.||`. NEGATIVO MEDIDO: a mesma string de 32 barras escrita em 0/1 devolve HOJE `hash-id` 0,50 e `binary-number` 0,50 — duas leituras erradas que o card de 0,9 passa a encabeçar.

**Riscos.** (1) O CEPNet dos Correios é HIPÓTESE minha, não fato conferido: acredito que use o mesmo 2-de-5 alto/baixo com 8 dígitos + DV (47 barras), mas NÃO validei contra fonte. O código tem de tratar 47 barras como ramo experimental, rotulado na tela, e o teste que o promove a fato é barato e concreto: contar as barras numa foto de envelope dos Correios — 47 confirma, outro número derruba. Publicar essa leitura como certa sem esse teste seria o tipo de m …

**Conflito com decisão anterior.** CONTRARIO, declaradamente, o argumento "a entrada real é imagem" que a casa usou para arquivar bandeiras/semáforo (`docs/PLANO-EXECUCAO-2026-08.md` §2 e R9 do `PLANO-CATALOGOS.md`). A distinção que ofereço é operacional, não retórica: na bandeira a transcrição É a decodificação; na barra ainda restam a tabela 2-de-5 e o DV. E o NFPA desta mesma fat …

**Decisão do dono.** Confirmar ou derrubar a hipótese CEPNet antes de o ramo de 47 barras sair rotulado como fato. O ramo POSTNET (32/52/62) não depende dessa decisão.

**Correção exigida pela crítica.** Melhor peça de medição da fatia: **reproduzi 2 disparos em 300.000 e 0 em 50.000 ASCII**, e as duas cadeias de barras (32 e 47) saem **caractere por caractere** iguais às da ficha. A contestação declarada ao argumento "a entrada é imagem" é legítima pela via da R6/R9 (contrariar por escrito, com critério aplicado nos dois sentidos — e ela de fato aplica, rebaixando o NFPA na mesma passada). Correções:

#### 11.5 · Ogham (ogâmico)

`decoder-no-leque` · **P (~2 h): 1 entrada de dados de ~35 linhas em alphabets.ts + 2 linhas de teste** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Chega como TEXTO e se cola: os 20 glifos vivem no BMP, U+1681–1694 (conferido: /^\p{Script=Ogham}+$/u casa). Regra da casa — o que entra numa cadeia é decoder. E não é decoder NOVO: é uma entrada em ALPHABETS que o `alfabeto` já consome sozinho via detectScript (alphabets.ts:953), devolvendo transliteração com chainValue e forcedScore 0.62 (alfabeto.ts, ramo byScript). Custo no fan-out: zero decoder a mais. Não é legenda porque a Cola não lista ALPHABETS — reference-panel.tsx importa COLORS, COM …

**Portão.** block: /[ -᚜]/ na entrada do ALPHABETS. Sem caractere nessa faixa, detectScript devolve null e o decode() do `alfabeto` não emite nada. Somam-se dois portões que já existem: byScript recusa quando det.letters.length < 2 e a entrada tem mais de um caractere (glifo solto no meio de prosa não vira 'texto ogâmico'), e detectScript exige known > 0.

**Rejeição medida.** 100,00% — 0 acendimentos em 44.000 entradas do corpus que montei. Nenhuma das 4.000 ruas de Blumenau, das 7.000 palavras soltas pt/en, dos CEPs, CPFs, telefones, coordenadas, hex, base64 ou criptogramas colados contém um caractere em U+1681–169C. Confirmei também que o espaço ASCII NÃO é Script=Ogham (só U+1680 é), então prosa comum não roça o portão.

**Autoverificação.** Sim, por bloco Unicode — o mesmo argumento que numerais-antigos.ts escreve ('o portão já estava pago'). Mais o teste de integridade que já existe em alfabeto.test.ts:84: latin.length === letters.length, letterNames.length === letters.length e letras todas distintas. Um erro de transliteração não passa em silêncio.

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/reference/alphabets.ts (nova entrada em ALPHABETS logo depois de `futhark-recente`, hoje em :573–581); editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/alfabeto.test.ts (acrescentar `expect(count("ogham")).toBe(20)` ao it da linha :62, e um it de transliteração no describe da linha :93, no molde do teste de grego em :94).

**API.** Nenhuma API nova. Preenche o tipo `Alphabet` (alphabets.ts:32): id "ogham" · name "Ogâmico" · letters = os 20 glifos U+1681..U+1694 · latin = [b,l,f,s,n,h,d,t,c,q,m,g,ng,z,r,a,o,u,e,i] · letterNames = os nomes-árvore (beith/bétula, luis/sorveira, fearn/amieiro, sail/salgueiro, nion/freixo, uath/espinheiro, dair/carvalho, tinne/azevinho, coll/aveleira, ceirt/macieira, muin/videira, gort/hera, gétal/junco, straif/abrunheiro, ruis/sabugueiro, ailm/pinheiro, onn/tojo, úr/urze, edad/álamo, idad/teixo) · aliases [ogham, ogam, ogamico, celta, irlandes antigo] · block /[ -᚜]/ · extras { " ": " ", ᚕ:"ea", ᚖ:"oi", ᚗ:"ui", ᚘ:"ia", ᚙ:"ae", ᚚ:"p", ᚛:"", ᚜:"" } · note. O decode() continua sendo o do `alfa …

**Vetor de teste.** Calculado e conferido com round-trip: BLUMENAU → ᚁᚂᚒᚋᚓᚅᚐᚒ → BLUMENAU. Segundo vetor, o da armadilha de contagem (o motivo de alphabets.ts existir): a 5ª letra do ogham é ᚅ = N (nion/freixo); o latino diria E. Tabela usada: os 20 glifos U+1681..U+1694 na ordem dos quatro aicmí (B L F S N / H D T C Q / M G NG Z R / A O U E I). Não há chave.

**Riscos.** 1) U+1680 (OGHAM SPACE MARK) casa com \s em JS — conferido. Qualquer normalização `input.replace(/\s+/g,"")` antes do portão APAGA a separação de palavras. Por isso ele fica DENTRO do block e é mapeado em `extras` para " " (extras só é consultado quando block.test(ch) é verdadeiro — ver detectScript em alphabets.ts:970). 2) Os 6 forfeda (U+1695–169A) NÃO podem entrar em `letters`: se entrarem, o alfabeto deixa de ter 20 e a prova que pedir 'a 5ª …

**Conflito com decisão anterior.** nenhum. O ogham não aparece em docs/INVENTARIO-CATALOGOS.md nem entre as 10 recusas de 'chega como imagem e não tem âncora' de docs/PLANO-CATALOGOS.md:180, que nomeiam Hexahue, Dancing Men, maia, babilônico, cisterciense, egípcio, ático, suzhou, grade de Cardan e os alfabetos de ficção — e não ele.

**Correção exigida pela crítica.** 1. **Tire o alias `celta`.** `findAlphabet` (alphabets.ts:851–860) casa alias exato ANTES do prefixo: uma chave de Vigenère `CELTA` passa a selecionar o ogham e emitir `panel()` a 0.3 em toda tecla. É abaixo do corte, mas é gaveta poluída de graça. 2. `block` e a chave U+1680 de `extras` têm de ser escritos como `\u1680`/`\u169C`, nunca literais — um OGHAM SPACE MARK literal no código é indistinguível de espaço para quem revisa e para o Biome. 3. …

#### 11.6 · Numerais maias

`decoder-no-leque` · **P (~2 h) — a tabela é uma subtração, não um dicionário** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Bloco Unicode próprio, U+1D2E0–1D2F3, 20 caracteres, categoria No (conferido). Colam-se de um PDF; o valor de cada dígito é `codePoint − 0x1D2E0`, e a leitura é aritmética pura, base 20, mais significativo em cima. É texto que entra numa cadeia (o número sai como chainValue e vira CEP/telefone na camada seguinte), logo é decoder. Como legenda não serviria: ponto/barra/concha é deduzível com dois exemplos, e a Cola não paga uma Section por isso.

**Portão.** Todo caractere da entrada (depois de tirar espaço) tem de estar em /^[\u{1D2E0}-\u{1D2F3}]+$/u, com ≥1 caractere. Um único caractere fora derruba a leitura inteira — a mesma disciplina do byLetter do `alfabeto` (alfabeto.ts: 'dígito ou letra de outro alfabeto significa que a entrada não é uma palavra deste alfabeto').

**Rejeição medida.** 100,00% — 0 acendimentos em 44.000 entradas. O plano SMP não tem colisão possível com nada que a bancada recebe: nenhuma das 44.000 entradas tem um code point acima de U+FFFF.

**Autoverificação.** Parcial, e por isso o card mostra DUAS leituras em vez de escolher. Aritmética determinada (sem chave, sem variante) e portão de bloco. O que NÃO se autoverifica é a convenção: base 20 pura (…,400,20,1) e Conta Longa (…,7200,360,20,1) dão números diferentes. Emitir as duas é o precedente literal de numerais-antigos.ts, que mostra mispar hechrachi e mispar gadol lado a lado quan …

**Arquivos.** criar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/numerais-visuais.ts e .../numerais-visuais.test.ts. Auto-registro: decoders/README.md garante que basta largar o arquivo na pasta — nada a editar em registry.ts.

**API.** defineDecoder({ id: "numerais-visuais", name: "Numerais de outra escrita", category: "transform", decode(input) }) — sem `inputs`, sem chave. Um id só com `label` por sistema, espelhando numerais-antigos.ts (que emite 'isopsefia grega' e 'gematria hebraica' sob o mesmo id). Para o maia o decode devolve DecodeCandidate { label: "maia — base 20" | "maia — Conta Longa", output: "𝋥𝋡𝋦 = 2026 (5·400 + 1·20 + 6)", forcedScore: 0.8, chainValue: "2026" }. `encode(texto)` opcional: número decimal → glifos, servindo a linha 168 do INVENTARIO (conferir hipótese no modo uma-cifra-só).

**Vetor de teste.** Calculado e conferido com round-trip nas duas convenções. 2026 em base 20 = 5·400 + 1·20 + 6 → dígitos [5,1,6] → 𝋥𝋡𝋦 (U+1D2E5 U+1D2E1 U+1D2E6) → volta 2026. Mesmos três glifos lidos como Conta Longa (3º nível = 18×20 = 360, não 400) = 5·360 + 1·20 + 6 = 1826 — 200 de diferença, e nenhum sinal na tela diz qual é. Segundo vetor: 89035 (prefixo de CEP de Blumenau) → dígitos [11,2,11,15] → 𝋫𝋢𝋫𝋯 → volta 89035.

**Riscos.** 1) A armadilha da Conta Longa é a única forma de este decoder dar resposta errada com nota alta, e o remédio é emitir as duas — nunca escolher. 2) Prova que chega como IMAGEM do numeral não cola caractere nenhum e o decoder cala em silêncio; isso é correto, mas o escopo tem de estar escrito no card (é o `notes`), senão alguém conclui que a bancada 'não tem maia'. 3) forcedScore 0.8: é o mesmo de numerais-antigos.ts e pela mesma razão (portão de b …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:120 marca 'Numerais maia, babilônico, cisterciense, egípcio, ático e suzhou' como `descartar`, com a razão 'mesmo os que têm bloco Unicode moram no SMP e ninguém digita'; docs/PLANO-CATALOGOS.md:180 repete no grupo 'chega como imagem'. CONTRARIO essa razão, não o cuidado: 'ninguém digita' já foi respondido dentro de cas …

**Correção exigida pela crítica.** 1–30` já traz decisão escrita da casa: *"**maia** — a escrita é logossilábica…, indexar seria inventar resposta"*. É sobre a ESCRITA, não os numerais, e por isso não é conflito — mas quem grepar "maia" cai ali. Uma linha nesse cabeçalho separando escrita de numeral entra no mesmo commit.

#### 11.7 · Numerais Kaktovik

`decoder-no-leque` · **P (~1 h) marginal, porque reaproveita a função do maia: muda a constante de base e o rótulo.** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Mesmo caso do maia, mesmo algoritmo, outro offset: U+1D2C0–1D2D3, 20 caracteres, categoria No (conferido). Base 20 posicional, valor = codePoint − 0x1D2C0. Entra no MESMO arquivo e no mesmo decoder do maia — dois blocos, uma função. Se fosse decoder separado, seriam dois ids fazendo a mesma conta.

**Portão.** /^[\u{1D2C0}-\u{1D2D3}]+$/u sobre a entrada sem espaços, ≥1 caractere. Idêntico ao do maia, com outro intervalo.

**Rejeição medida.** 100,00% — 0 acendimentos em 44.000 entradas, pelo mesmo motivo do maia (nada no corpus passa de U+FFFF).

**Autoverificação.** Portão de bloco + aritmética determinada. E aqui, ao contrário do maia, NÃO há a ambiguidade da Conta Longa: o Kaktovik é base 20 pura, com sub-base 5 apenas no desenho do glifo (as hastes em grupos de 5), não na posição. Uma leitura só, sem escolha a fazer — é a versão mais limpa dos três.

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/numerais-visuais.ts e .../numerais-visuais.test.ts (os mesmos arquivos do maia).

**API.** Mesmo decoder `numerais-visuais`. DecodeCandidate { label: "Kaktovik — base 20", output: "𝋅𝋁𝋆 = 2026 (5·400 + 1·20 + 6)", forcedScore: 0.8, chainValue: "2026" }. Uma função `posicional(texto, base0, radix)` serve maia e Kaktovik; `encode` idem.

**Vetor de teste.** Calculado e conferido com round-trip: 2026 → dígitos [5,1,6] → 𝋅𝋁𝋆 (U+1D2C5 U+1D2C1 U+1D2C6) → volta 2026. Segundo vetor, o que separa Kaktovik de maia na tela: 8801 → [1,2,0,1] → 𝋁𝋂𝋀𝋁 → volta 8801, e o zero (U+1D2C0) é um caractere presente, não uma ausência — o oposto do egípcio.

**Riscos.** 1) Confundir a sub-base 5 (que é só desenho) com posição: quem tentar ler 'cada haste vale 5 na conta' erra a leitura inteira. Vale uma linha em `notes`. 2) O bloco é de 2022 (Unicode 15) — fonte antiga do sistema desenha tofu, e a pessoa vê caixinhas em vez de numerais. Não afeta a decodificação (o code point chega intacto), mas afeta a confiança de quem lê o card: o card deve mostrar o número, não depender do glifo. 3) Triagem classificou como …

**Conflito com decisão anterior.** nenhum: Kaktovik não é nomeado em INVENTARIO-CATALOGOS.md nem em PLANO-CATALOGOS.md §3 — o bloco Unicode dele é posterior ao levantamento dos cinco catálogos. Herda por analogia a recusa da linha 120, e a contestação é a mesma escrita na ficha do maia.

**Correção exigida pela crítica.** **(c) Vetor — bate.** `2026 → 𝋅𝋁𝋆` = U+1D2C5 U+1D2C1 U+1D2C6; `8801 → [1,2,0,1] → 𝋁𝋂𝋀𝋁`, com U+1D2C0 presente como zero. `\p{No}` ✓. Custo marginal honesto, e a autoavaliação como o mais fraco dos três (0 posts + 2 comentários, primeiro a cair) é correta e deve ser respeitada. Nada a corrigir.

#### 11.8 · Numerais Suzhou (huāmǎ / hangzhou)

`decoder-no-leque` · **P (~2 h): tabela de 13 caracteres + o portão (b) + os testes negativos dos três casos acima.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Este derruba, com medição, o argumento que barrou o grupo inteiro. Suzhou NÃO está no SMP: 〇 é U+3007 e os dígitos 1–9 são U+3021–3029, todos BMP, todos categoria Nl (conferido). É base 10 posicional, então a leitura é literalmente a string de dígitos — texto que encadeia, logo decoder. Mesmo arquivo do maia/Kaktovik.

**Portão.** Dois portões em série, e o segundo é o que importa: (a) a entrada sem espaços casa /^[〇〡-〩〸-〺一二三]+$/u; (b) tem de haver PELO MENOS UM caractere em U+3021–3029. Sem (b), 〇 sozinho ou 一二三 (numeral chinês comum) acenderiam — conferido: com (b), "〇" não passa, "一二三" não passa, "中国" não passa, e "〡二〣" (a grafia mista legítima) passa.

**Rejeição medida.** 100,00% no corpus de 44.000, com a ressalva honesta de que o corpus não tem texto chinês. É por isso que o portão (b) existe e foi medido isoladamente contra 〇, 一二三 e 中国 — os três casos em que um portão ingênuo acenderia sobre chinês comum.

**Autoverificação.** Portão de bloco + a regra de grafia como conferência: em Suzhou de verdade os dígitos 1, 2 e 3 alternam entre a forma vertical (〡〢〣) e a horizontal (一二三) quando são adjacentes, justamente para não virar um borrão de traços iguais. Uma string com três verticais seguidas é suspeita e merece nota no card. Não é dígito verificador, mas é um sinal de grafia que não se fabrica por ac …

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/numerais-visuais.ts e .../numerais-visuais.test.ts.

**API.** Mesmo decoder `numerais-visuais`. DecodeCandidate { label: "Suzhou — base 10", output: "〢〇〢〦 = 2026", forcedScore: 0.8, chainValue: "2026" }. Precisa de um mapa próprio (não é subtração como maia/Kaktovik): { 〇:0, 〡:1 … 〩:9 } mais os alternantes { 一:1, 二:2, 三:3 } e as dezenas soltas { 〸:10, 〹:20, 〺:30 }, que só aparecem em etiqueta de preço.

**Vetor de teste.** Calculado e conferido com round-trip: 2026 → 〢〇〢〦 (U+3022 U+3007 U+3022 U+3026) → volta 2026. Segundo vetor, o CEP: 89035 → 〨〩〇〣〥 → volta 89035. E os três negativos medidos: "〇" → recusa · "一二三" → recusa · "中国" → recusa; "〡二〣" → aceita (=123).

**Riscos.** 1) A leitura clássica de etiqueta é em DUAS LINHAS (magnitude em cima, unidade embaixo) e o decoder só lê a linha de dígitos — o card precisa dizer que devolve os dígitos, não a magnitude, senão 〢〇〢〦 sai como 2026 quando a etiqueta dizia 20,26. 2) A triagem mediu 0 posts e 0 comentários em 8 anos de r/codes para 'suzhou', 'rod numeral' e 'huama' — é o item com a âncora externa mais fraca da fatia. O que o justifica é o custo (13 linhas dentro de …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:120 inclui 'suzhou' no `descartar` com a razão 'moram no SMP'. CONTRARIO essa afirmação como FATO, não como opinião: U+3007 e U+3021–3029 são BMP, verificados com /\p{Nl}/u nesta sessão. A linha do inventário precisa de correção na mesma passada, senão o teste de src/features/reference/inventario.test.ts continua guarda …

**Correção exigida pela crítica.** **(c) Vetores e negativos — todos batem.** `2026 → 〢〇〢〦` (U+3022 U+3007 U+3022 U+3026); `89035 → 〨〩〇〣〥`. Rodei o portão de dois estágios: `〇` recusa · `一二三` recusa · `中国` recusa · `〡二〣` aceita. E o fato central confere: U+3007 e U+3021–3029 são **BMP**, `\p{Nl}` — a razão escrita em `INVENTARIO:120` ("moram no SMP") é falsa para o Suzhou. A contestação está certa e é medível.

#### 11.9 · Pontuação do Scrabble

`decoder-no-leque` · **P (~2 h): duas tabelas de 24/26 letras, uma linha em SCHEMES, o portão de K/W/Y e os testes.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** É letra→número por tabela, que é exatamente a família que letter-values.ts já implementa (gematria clássica, redução 1–9 pitagórica e primos). Não pede decoder novo: pede uma quarta entrada no array SCHEMES (letter-values.ts:60–70). E é decoder e não legenda porque o resultado (a soma) encadeia — a peça já traz o número impresso, mas a SOMA de uma palavra é o que a prova pede e ninguém faz de cabeça.

**Portão.** Herdado, sem uma linha nova: a função words() de letter-values.ts — uma palavra só, sem dígito, sem pontuação, 2 a 24 letras fora do modo `ctx.only`; até 120 letras dentro dele. Mais um portão PRÓPRIO da tabela portuguesa: se a palavra tiver K, W ou Y, a leitura pt tem de ser RECUSADA (devolver null), não pontuada como zero — o jogo em português não tem essas peças.

**Rejeição medida.** 82,26% — medido rodando o portão words() de letter-values.ts sobre as 44.000 entradas: acendem 7.807, sendo 5.000 palavras pt, 2.000 en, 497 nomes de rua, 180 alfanuméricos e 130 criptogramas colados. O número é PISO e não teto: eu carreguei o corpus de propósito com 7.000 palavras soltas, que é o formato que o portão aceita por construção. Passa a régua R1 de 79,8% por 2,46 po …

**Autoverificação.** Nenhuma no sentido forte: qualquer palavra tem soma. O que existe é o portão de forma herdado e o portão de K/W/Y na tabela pt. Por isso a nota é a mesma dos irmãos — forcedScore 0.5, já calibrado em letter-values.ts com o raciocínio escrito lá ('a saída é uma lista de números, que o scorePlaintext afunda; daí o 0.5').

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/letter-values.ts (novo esquema no array SCHEMES de :60 e as duas tabelas junto de GEMATRIA/REDUCAO/PRIMOS em :36–56); editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/letter-values.test.ts.

**API.** Nenhuma assinatura nova. Uma entrada { label: "Scrabble (pt 120 peças · en 100)", values: …, inverse: false } no array SCHEMES. `inverse: false` é obrigatório e medido: na tabela portuguesa o valor 1 cobre 9 letras (A E I O S U M R T), então o caminho de volta ofereceria 9ⁿ leituras — a mesma razão pela qual REDUCAO já está com inverse: false. RECOMENDAÇÃO DE PRODUTO: as duas tabelas emitem UM card com os dois totais no output, não dois cards. Hoje uma palavra digitada já produz até 3 cards a 0.5, todos acima do corte de 0.35; dois cards de Scrabble levariam a 5, e o topo é o espaço mais escasso do produto (run.ts documenta isso na dedução por caixa/acento).

**Vetor de teste.** Calculado com as duas tabelas. CIFRA → pt: C2+I1+F4+R1+A1 = 9 · en: C3+I1+F4+R1+A1 = 10. BLUMENAU → pt 13 · en 12. PROVA → pt 9 · en 10. Negativo medido: KIWI não tem soma em português (K e W não existem no conjunto de 120 peças) e vale 11 em inglês — a leitura pt tem de recusar, não devolver 0. A volta não existe por decisão: 1 → A/E/I/O/S/U/M/R/T em pt são 9 letras. Tabela pt conferida na distribuição oficial de 120 peças: 1 ponto A E I O S U M R T · 2 D L C P · 3 N B Ç · 4 F G H V · 5 J · 6 Q · 8 X Z. Tabela en (100 peças): 1 A E I O U L N S T R · 2 D G · 3 B C M P · 4 F H V W Y · 5 K · 8 J X · 10 Q Z.

**Riscos.** 1) Escolher UMA das duas tabelas é decidir pela prova, e elas divergem em 12 das 26 letras (M vale 1 em pt e 3 em en; Q vale 6 em pt e 10 em en). O precedente da casa é numerais-antigos.ts, que mostra mispar hechrachi e mispar gadol lado a lado quando há letra final em vez de escolher. Mesmo desenho aqui. 2) O Ç vale 3 em português e não existe em inglês — o esquema pt não pode dobrar acento antes de pontuar, senão Ç vira C e a soma cai de 3 para …

**Conflito com decisão anterior.** nenhum. 'scrabble' não aparece em INVENTARIO-CATALOGOS.md nem em src/ (grep vazio). r/codes: 9 posts + 7 comentários; triagem LACUNA_QUENTE, prova_fit 4, e ela mesma nota que letter-values cobre gematria/redução/primos e não a pontuação do Scrabble.

**Correção exigida pela crítica.** **(c) Aritmética — bate à mão contra as distribuições oficiais.** CIFRA pt 9 / en 10 · BLUMENAU pt 13 / en 12 · PROVA pt 9 / en 10 · KIWI en 11 e sem leitura pt. As duas tabelas (120 e 100 peças) estão corretas.

#### 11.10 · VIN / chassi (ISO 3779)

`decoder-no-leque` · **M — decoder ~70 linhas + reference/vin.ts ~200 (tabela WMI curada de ~180 prefixos + 30 letras de ano + 8 faix…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** Passa no critério que MATOU a família vizinha. `docs/PLANO-2026-08.md:47` abandonou Luhn/RENAVAM/PIS/CNH/cartão/IMEI porque "um decoder que responde 'é válido' e nada mais não paga o pedágio de ranking" — e salvou a inscrição estadual por ser "o único do grupo com campo legível". O VIN tem TRÊS campos legíveis: WMI (país + montadora, posições 1-3), letra de ano-modelo (posição 10) e a fábrica (posição 11), além do DV. Precisa entrar na cadeia: o serial de 6 dígitos sai por `chainValue` para a ca …

**Portão.** Após remover `[\s-]` (mesma normalização mínima do `correios.ts:19`): `const VIN = /^[A-HJ-NPR-Z0-9]{17}$/` (sem I, O, Q) **E** `"ABCDEFGHJKLMNPRSTVWXY123456789".includes(t[9])` (letra de ano válida — sem I,O,Q,U,Z,0) **E** (`WMI.has(t.slice(0,3))` **OU** `dvFecha(t)`). Sem o terceiro termo o portão rejeita só 77,38% e REPROVA no piso R1 de 79,8% — é a medição que obriga a tabela de WMI a existir.

**Rejeição medida.** Corpus real (20.047 tokens de 81 PDFs do acervo): **100,00%** — 1 disparo, e ele é um VIN de verdade. Corpus sintético (24.400 strings, 34 classes): **99,98%** (4 disparos, todos na classe `alfanum-maiusc`). Condicionado à sub-população que chega ao portão — 200.000 strings de 17 caracteres [A-Z0-9] sorteadas: forma sem I/O/Q **77,38%** (REPROVA na R1), + letra de ano 79,40%, + …

**Autoverificação.** Parcial, e o card tem de dizer isso. DV na posição 9: translitera (A=1…Z=9, sem I/O/Q), pesos 8 7 6 5 4 3 2 10 0 9 8 7 6 5 4 3 2, soma mod 11 (10 → 'X'). MEDIDO: o DV é obrigatório nos EUA/Canadá (49 CFR 565) e na China (GB 16735), e é OPCIONAL no resto — calculei `9BWZZZ377VT004251` (VW Gol, Brasil) e o DV deveria ser 2, mas a posição 9 traz 7. Portanto DUAS notas, pela R2: DV …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/vin.ts` (auto-registrado pelo glob de `registry.ts:21`), `src/features/decoder/engine/decoders/vin.test.ts`, `src/features/reference/vin.ts`, `src/features/reference/vin.test.ts`. EDITAR: `src/features/help/help-content.ts` (verbete na seção de documentos/códigos), `src/features/help/help-examples.test.ts` (linha na lista OFFLINE — o exemplo roda sem rede), `docs/PENDENCIAS.md` (R6: item fechado sem li …

**API.** `defineDecoder` (não `mapDecoder`: a nota varia e o payload é estruturado). id: `"vin"` · name: `"Chassi / VIN (ISO 3779)"` · category: `"lookup"` · inputs: nenhum (sem key, sem aux) · encode: NÃO (não existe texto claro que vire chassi). `decode()` devolve 0 ou 1 candidato: `{ decoderId, decoderName, category:"lookup", label:"9BWZZZ377VT004251 · VW do Brasil · 1997 ou 2027", output, notes, forcedScore: 0.93 | 0.72, chainValue: serial (6 últimos dígitos), render:"code-list", data: CodeHit[] }` — reusa `CodeHit` de `@/features/reference/phone-codes`, como `placa-veiculo.ts:1`.

**Vetor de teste.** POSITIVO, conta conferida por mim: `1HGCM82633A004352` → transliteração 1,8,7,3,4,2,8,2,6,3,3,1,0,0,4,3,5,2 × pesos 8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2 → **soma 311** → 311 mod 11 = **3** → DV calculado 3 = DV lido (posição 9) ✓ · WMI 1HG = Honda, América do Norte · posição 10 = '3' → 2003 (dígito não tem ambiguidade de 30 anos, só as letras têm) · chainValue = `004352`. NEGATIVO-QUE-ENTRA: `9BWZZZ377VT004251` → soma 420 → 420 mod 11 = 2 → DV calculado **2**, lido **7** → não fecha; entra pelo ramo do WMI (9BW = Volkswagen do Brasil), nota 0,72, com a explicação do porquê. NEGATIVO-QUE-SAI: `ABCDEFGH1JKLMNPQR` (17 caracteres, alfabeto ok, mas WMI fora da tabela e DV não fecha) → `[]`.

**Riscos.** (1) A tabela WMI curada é recorte: chassi de montadora fora dela só entra se o DV fechar. Mitigação escrita no card ("WMI não consta da tabela curada — o DV fecha, e é ele que sustenta esta leitura"), nunca inventar montadora. (2) O ciclo de 30 anos do ano-modelo: mostrar as duas leituras é obrigatório; a regra de desempate pela posição 7 vale só na América do Norte e o card tem de dizer que só vale lá. (3) O disparo único no corpus real veio do …

**Conflito com decisão anterior.** Nenhum, e cito a decisão vizinha para não parecer que a estou contrariando: `docs/PLANO-2026-08.md:47` mata RENAVAM, PIS/PASEP, CNH, cartão e IMEI. O VIN NÃO é dessa família — os cinco só dizem "é válido", o VIN entrega país, montadora, ano e fábrica. RENAVAM continua morto.

**Decisão do dono.** Tamanho da tabela WMI: ~180 prefixos curados (~8 KB, cabe no bundle) ou a lista vPIC inteira (~35 mil registros, obrigaria carga preguiçosa e ativaria a R4). Recomendo os 180.

**Correção exigida pela crítica.** Contas certas, rejeição reproduzida, sonda exata, âncora do rival verificada no PDF. Correções:

#### 11.11 · GS1-128 — identificadores de aplicação (AI)

`decoder-no-leque` · **M — tabela de AIs ~130 linhas (número, nome pt-BR, comprimento fixo ou variável, formato) + parser ~120 (máqui…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** É a sequência natural de duas coisas que a casa JÁ tem e que hoje morrem no meio do caminho: a aba Arquivo lê Code 128 da foto pelo `BarcodeDetector` (`arquivo/imagem/codigo.ts:33`, formato `code_128`) e devolve a string CRUA; e o `barcode.ts` só entende EAN/UPC (`^[\d\s.-]+$` + 8/12/13 dígitos). Medido na sonda: `0107891234567895112608151042` produz **0 cards ≥0,35** — a bancada lê o código de barras da caixa e não sabe dizer nada sobre ele. Com o parser de AIs a mesma string vira GTIN + data d …

**Portão.** Duas formas, uma função. (a) Forma humana: `/^(\(\d{2,4}\)[\x21-\x7e]+)+$/` — parênteses são a notação impressa e não aparecem em mais nada da bancada. (b) Forma crua (a que o `BarcodeDetector` devolve): começa com AI de comprimento FIXO conhecido (00, 01, 02, 11, 12, 13, 15, 17, 20, 31nn–36nn, 41) **E** a cadeia de AIs consome a string INTEIRA **E** há ao menos 2 AIs **E** todo (01)/(02) tem DV mod-10 válido e toda data AAMMDD é válida. "Consumir a string inteira" é o portão de verdade — é o que transforma um palpite em prova.

**Rejeição medida.** Corpus real: **100,00%** (0 em 20.047; e o acervo não tem NENHUM token só-dígito de 16 a 40 caracteres). Sintético: **100,00%** (0 em 24.400, incluindo as 400 chaves de NF-e de 44 dígitos). Dicionários: 0 em 463.438 palavras. Condicionado à forma crua — 200.000 strings de dígitos de 16 a 34 caracteres: **5 disparos = 99,9975% de rejeição**, e quem segura é a exigência de a cade …

**Autoverificação.** Forte e tripla: (1) DV módulo 10 do GTIN em (01)/(02) — a mesma `gs1CheckDigit` que já existe em `features/codes/barcode.ts`, sem código novo; (2) datas AAMMDD dos AIs 11/12/13/15/17 têm de ser válidas (DD=00 é legal e significa "último dia do mês" — o card tem de saber disso); (3) a cadeia tem de consumir a string toda. Nota 0,92. AVISO OBRIGATÓRIO: sem o separador FNC1 (que o …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/gs1-128.ts`, `gs1-128.test.ts`, `src/features/reference/gs1-ai.ts`, `src/features/reference/gs1-ai.test.ts`. EDITAR: `src/features/help/help-content.ts`, `src/features/help/help-examples.test.ts`, `docs/PENDENCIAS.md`. REUSAR sem tocar: `src/features/codes/barcode.ts` (`gs1CheckDigit`) e `src/features/reference/gs1-prefixes.ts` (`gs1Lookup`).

**API.** `defineDecoder`. id: `"gs1-128"` · name: `"GS1-128 (identificadores de aplicação)"` · category: `"lookup"` · inputs: nenhum · encode: NÃO. Retorno: 1 candidato `{ label:"(01) GTIN · (11) fabricação · (10) lote", output:"GTIN 07891234567895 · fabricado 15/08/2026 · lote LOTE42", notes, forcedScore: 0.92 | 0.6, chainValue: EAN-13 sem o zero de padding (cai no decoder `barcode`), render:"code-list", data: CodeHit[] (uma linha por AI) }`.

**Vetor de teste.** POSITIVO, DV conferido por mim: `(01)07891234567895(11)260815(10)LOTE42` → (01) GTIN-14 `07891234567895`: corpo `0789123456789`, pesos alternados 3,1 a partir da direita → **DV 5** = lido ✓ → prefixo GS1 789 = **Brasil** (via `gs1Lookup`) · (11) `260815` → fabricado em **15/08/2026** · (10) `LOTE42` → lote · chainValue `7891234567895`. FORMA CRUA equivalente: `0107891234567895112608151042` → 01+14 = 16 caracteres, 11+6 = 8 (total 24), 10+"42" = 4 (total 28), a cadeia consome exatamente 28 → mesma leitura, sem palpite, porque o campo variável é o último. Hoje essa string dá **0 cards** na bancada (sonda). NEGATIVO: `0107891234567890112608151042` (DV do GTIN trocado para 0) → `[]`.

**Riscos.** (1) AMBIGUIDADE SEM FNC1 é o defeito de projeto do formato, não do nosso parser — a única defesa honesta é rebaixar a nota e dizer na tela; imprimir um lote adivinhado com nota alta seria a R2 na veia. (2) O `BarcodeDetector` não é uniforme entre navegadores no tratamento do FNC1: o parser tem de aceitar 0x1D, `<GS>` escrito e a ausência dos dois. (3) A GS1 General Specifications é obra protegida — copiamos os NÚMEROS dos AIs e escrevemos a descr …

**Conflito com decisão anterior.** Nenhum. O `barcode` cobre EAN/UPC e diz isso no próprio cabeçalho; GS1-128 não aparece em `docs/INVENTARIO-CATALOGOS.md` nem nas 67 recusas da §3, e o gabarito da Equipe Arromba também não o tem (eles têm só EAN/UPC e boleto).

**Decisão do dono.** Nenhuma.

**Correção exigida pela crítica.** O valor é real e a cadeia foi verificada: o `chainValue` `7891234567895` cai no `barcode` e produz **"EAN-13 válido · Brasil"** a 0,85, e a string crua dá **0 cards** hoje. Mas:

#### 11.12 · Gold-Bug — alfabeto de símbolos para substituição (`alfabeto-simbolico`)

`decoder-no-leque` · **M — 4 h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: homofônica e vizinhas

**Por que esse destino.** É normalização de entrada com portão estatístico, não cifra nova — a mesma família do item 1.5 de `docs/PENDENCIAS.md` ("dígito não-ASCII na porta … é normalização de entrada, não decoder"). **Assinatura:** medida, IC×N ≥ 1,35 sobre um alfabeto de ≤26 símbolos com pelo menos um não-letra — 100% de rejeição sobre 3.300 entradas. **Autoverificação:** duas camadas — a saída vai para o `resolverSubstituicao` já existente, que tem os portões dele, e a cobertura de palavra real decide no fim. **Ruído: …

**Portão.** ```ts
const toks = tokenizarSimbolico(input);      // grupos curtos separados OU caracteres colados
if (!toks || toks.length < 120) return [];
const dist = [...new Set(toks)];
if (dist.length > 26 || dist.length < 12) return [];
if (dist.every((d) => /^[a-zA-Z]$/.test(d))) return [];   // só letras → é o `substituicao`
if (dist.every((d) => /^\d+$/.test(d))) return [];        // só dígitos → é o `a1z26`
const icN = icDeSimbolos(toks) * dist.length;
if (icN < 1.35) return [];                                // alfabeto plano: hex, base-N, ruído
// passou: mapeia símbolo→letra por ordem de frequência e entrega ao solver já existente
const comoLetras = toks.map((t) => LETRA[indice.get(t)!]).join("");
return resolverSubstituicao(letrasDe(comoLetras));        // engine/substituicao.ts:287
```

* …

**Rejeição medida.** **100% — 0 acendem de 3.300** entradas não-Gold-Bug: 500 listas A1Z26 espaçadas, 500 textos de letras, 500 strings hex, 1.000 listas de CEP e 800 sequências de dígitos colados. Recall de 95% (285 de 300) sobre Gold-Bug de verdade. Para comparar: piso da R1 = 79,8%; a primeira versão deste mesmo portão, com faixa absoluta de IC, media **70,5%** e teria sido reprovada — é a difer …

**Autoverificação.** SIM, e em duas camadas herdadas, sem constante nova.
1. O `resolverSubstituicao` já existente aplica seus próprios portões (`IC_MINIMO = 0,058`, `MIN_LETRAS_DISTINTAS = 12`, `MIN_LETRAS = 200` — `decoders/substituicao.ts:124-135`).
2. A cobertura de palavra real ≥ 0,45 sobre a saída decide a promoção, com o mesmo `PISO = 0,32` na falta de confirmação (`:163`).

**Teto de nota:* …

**Arquivos.** CRIAR:
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/alfabeto-simbolico.ts`
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/alfabeto-simbolico.test.ts`

EDITAR:
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/substituicao.ts:250` — um comentário em `pareceCifraDeLetras` dizendo que o portão de dígito/símbolo é PROPOSITAL e que quem cuida do alfabeto simbólico é o decoder …

**API.** ```ts
id: "alfabeto-simbolico"
name: "Substituição em símbolos (Gold-Bug e parentes)"
category: "classical"
inputs: nenhum

export function tokenizarSimbolico(t: string): string[] | null;
/** símbolo → letra por ordem de frequência; devolve também o mapa, para o rótulo. */
export function comoLetras(toks: string[]): { texto: string; mapa: Map<string, string> };
decode(input, ctx): DecodeCandidate[]
//   label: "21 símbolos distintos · ‡→a, 8→e, 5→o …"
//   output: o texto decifrado pelo solver de substituição
//   chainValue: o mesmo texto
//   notes: "IC×N 1,53 sobre 21 símbolos (alfabeto plano = 1,00). Substituição 1:1 preserva o IC,
//           então símbolo é só outra roupa da mesma cif …

**Vetor de teste.** **Ida e volta do normalizador, com o alfabeto tipográfico do conto de Poe.**
Alfabeto, na ordem de primeira aparição: `5 3 ‡ 8 * 4 ) ( ;`
mapa, atribuído por ordem de primeira aparição sobre `apontedeferro`:
`a→5 · p→3 · o→‡ · n→8 · t→* · e→4 · d→) · f→( · r→;`

claro → `apontedeferro` (13 letras)
cifrado → `53‡8*4)4(4;;‡`
conferência símbolo a símbolo: 5=a · 3=p · ‡=o · 8=n · *=t · 4=e · )=d · 4=e · (=f · 4=e · ;=r · ;=r · ‡=o → `apontedeferro` ✔ 13 símbolos, 13 letras, idêntico ao claro.

Este vetor exercita o NORMALIZADOR (o mapa e a volta), não o portão: com 13 tokens ele não passa do piso de 120, e nem deveria. O teste do portão usa o vetor abaixo, e a distinção tem de estar escrita no …

**Riscos.** 1. **O portão óbvio (faixa absoluta de IC) reprova na R1 — 70,5%.** Está medido e documentado acima. Se alguém "simplificar" IC×N de volta para uma faixa de IC, o hex volta a acender em 96% e o decoder passa a rodar a subida de encosta em cima de todo dump hexadecimal da bancada. Isto tem de virar comentário no arquivo, não só linha de teste.
2. **Duplicata com o `a1z26`.** Uma lista A1Z26 é, tecnicamente, substituição de símbolos. O portão `só d …

**Conflito com decisão anterior.** Contrario, com prova, a linha da triagem que diz `cobertura_decrypter: "decoder:substituicao"` para o Gold-Bug — ou seja, "já temos". **Não temos, e o motivo está no código.** `decoders/substituicao.ts:250`, função `pareceCifraDeLetras`, é o primeiro portão do solver:
```ts
if (/\d/.test(input)) return false;                    // ← o Gold-Bug de P …

**Decisão do dono.** Nenhuma. Cabe em regra já escrita (normalização de entrada, como o item 1.5 de `PENDENCIAS.md`), tem assinatura acima do piso, autoverificação herdada e custo P/M. **Se a fatia inteira for cortada, este é o item que eu manteria** — 4 h, risco medido zero, e destrava a família de cifras em glifo que hoje a bancada recusa em silêncio.

**Correção exigida pela crítica.** **(a)** Não existe. **(c)** Refiz o VETOR à mão: alfabeto `5 3 ‡ 8 * 4 ) ( ;` por ordem de aparição sobre `apontedeferro` (= "a ponte de ferro", 13 letras) → `53‡8*4)4(4;;‡`. Conferência símbolo a símbolo: 13 símbolos, 13 letras, **bate exatamente**.

#### 11.13 · Cartão de diagnóstico: "N símbolos para 26 letras — homofônica de razão X"

`chip-do-sniffer` · **P — 2 h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: homofônica e vizinhas

**Por que esse destino.** **Assinatura:** a mesma IC×N do item 1, medida em 99,886% de rejeição sobre 10.500 entradas — acima do piso de 79,8% da R1 com folga de 20 pontos. **Autoverificação:** NÃO TEM, e por isso é chip e não card: chip não entra no `runDecoders`, não recebe `forcedScore`, não disputa o topo e não pode canibalizar candidato real. É exatamente o argumento do cabeçalho de `sniff.ts` ("Não é decoder, por projeto"). O teto de nota da R2 não se aplica porque não há nota. **Custo:** O(n) com um `Map`, na mesm …

**Portão.** Em `sniff.ts`, função nova `sniffHomofonica(input, out)`, chamada de `sniff()` (`engine/sniff.ts:228`):

```ts
const toks = tokenizarSimbolos(input);
if (!toks || toks.length < 300) return;
const N = new Set(toks).size;
if (N < 27 || N > 120) return;
const icN = icDeSimbolos(toks) * N;
if (icN < 1.05 || icN > 1.45) return;
out.push({
  id: "homofonica-shape",
  label: `${N} símbolos para 26 letras — homofônica de razão ${(N / 26).toFixed(2)}`,
  detail: `IC×N = ${icN.toFixed(2)}. Alfabeto plano (ruído) fica em 1,00; substituição 1:1 de língua natural, em 1,85. No meio é um-para-muitos: cada letra tem vários símbolos, e é isso que achata a frequência. ${N/26 < 1.2 ? "Razão baixa — pode ser substituição 1:1 sobre um alfabeto maior que 26; tente o solver de substituição." : N/26 > 2.6 ? "Razã …

**Rejeição medida.** **99,886% (12 de 10.500)** — exatamente a medição do item 1, porque é o mesmo portão sem a etapa de solver. Detalhamento por classe na ficha do item 1. Comparações da casa: piso da R1 = 79,8%; cauda de UTM = 98,67%; chip ADFGVX = 0 de 30.000; cauda de geohash (mantida por decisão do dono) = 18,3%.

**Autoverificação.** NENHUMA — e é por isso que ele não é card. O chip não afirma uma leitura; afirma uma FORMA, e a forma é o que foi medido. A R2 fala de resposta errada com nota alta; aqui não há resposta e não há nota. O precedente é o próprio chip ADFGVX, que também não se autoverifica e também só nomeia. O texto do chip é escrito para não prometer: diz "homofônica de razão X", não "a resposta …

**Arquivos.** EDITAR:
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/sniff.ts` — nova `sniffHomofonica`, chamada dentro de `sniff()` na linha 228, ao lado de `sniffGeoShapes`.
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/sniff.test.ts` — 4 casos: acende na homofônica de 1.200 símbolos; NÃO acende em lista A1Z26; NÃO acende em lista aleatória 01-99 de 1.200; NÃO acende em ASCII decimal.

CRIAR (se o item 1 não vier antes):
- …

**API.** ```ts
// engine/sniff.ts — o Hint já existe (sniff.ts:20), nada muda no tipo
function sniffHomofonica(input: string, out: Hint[]): void;
// id do chip: "homofonica-shape" · tone: undefined (info) · decoderId: "homofonica"

// engine/homofonica.ts (mínimo)
export function tokenizarSimbolos(t: string): string[] | null;
export function icDeSimbolos(toks: string[]): number;  // IC sobre os símbolos, não sobre letras
```

**Vetor de teste.** **Acende.** VETOR B do item 1: 1.200 símbolos, 39 distintos, IC = 0,03058, IC×N = **1,193**. Chip: `39 símbolos para 26 letras — homofônica de razão 1,50`.
Início da entrada: `23 34 01 08 02 09 10 32 34 03 14 04 22 17 21 18 05 07 24 22 28 08 14 09 …`

**Não acende — os três casos que o teste tem de prender:**
1. **A1Z26 colado ou espaçado**, 5 a 405 números: 0 de 1.500. Recusa dominante: menos de 300 símbolos; quando é longo, N ≤ 26 corta.
2. **Lista aleatória 01-99**, 1.200 tokens: 0 de 400. Recusa: IC×N = 1,00 < 1,05 ("alfabeto plano").
3. **ASCII decimal de prosa**: 0 de 1.000. Recusa: curto demais; e quando é longo, IC×N ≈ 1,6–1,9 > 1,45 ("é substituição 1:1 ou claro").

**O caso de fron …

**Riscos.** 1. **Um chip a mais na faixa disputa espaço com os 13 que já existem** (contei `out.push` em `sniff.ts`: 13, não 15 — o número 15 do enunciado está velho). Como ele só acende em 0,114% do tráfego, o custo de espaço é desprezível na prática.
2. **Razão baixa (≤1,2) confunde com substituição 1:1** — 21 a 26% de escape medido. Mitigado pelo texto do próprio chip, que manda tentar o solver de substituição nesse caso.
3. **Os 12 falsos de 10.500 são l …

**Conflito com decisão anterior.** Nenhum. O `sniff.ts` já tem o precedente exato no chip ADFGVX (`engine/sniff.ts:187`), que **nomeia a cifra e se recusa a decifrá-la** — e a razão escrita lá vale palavra por palavra aqui: "num ADFGVX de verdade a bancada emite 5 cards acima do corte, todos errados, e nenhum nomeia a cifra. Trocar cinco respostas erradas por uma frase certa custa e …

**Decisão do dono.** Nenhuma para o chip. Uma para a metade opcional: **o Retrato ganha leitura por símbolo?** Hoje ele só olha letras (`soLetras` em `criptanalise.ts:546`), então toda a aba é cega para cifra numérica — não é um buraco só da homofônica, é do Pollux, do Morbit, do A1Z26 e de qualquer cifra de dígitos. Isso é uma frente própria, maior que esta fatia, e quem decide se ela existe é o dono.

**Correção exigida pela crítica.** **(a)** Não existe. **(b)** Portão idêntico ao da ficha 1, rejeição de 99,886% reproduzida por mim (~1% de cauda em listas aleatórias 01-99 de 300–600 tokens, batendo os 12 de 1.200). Sem nota, sem `forcedScore`, fora do `runDecoders` — R2 não se aplica, precedente ADFGVX está corretamente lido (`sniff.ts:167-191`, e o `decoderId` opcional em `sniff.ts:26`). O(n). Nada no bundle.

#### 11.14 · Diamante NFPA 704

`legenda-na-cola` · **P — src/features/reference/nfpa-704.ts ~60 linhas (4 quadrantes × 5 níveis + os 3 símbolos normativos) + <Sect…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** Aplico a régua da casa no sentido contrário ao do POSTNET, e é por isso que ela é régua: aqui a TRANSCRIÇÃO JÁ É A DECODIFICAÇÃO. Quem olha o losango e escreve `3-0-2-W` já leu tudo o que há para ler; não sobra tabela nem verificador para a máquina fazer. É exatamente o critério com que a casa arquivou bandeiras e semáforo náutico (R9 do `PLANO-CATALOGOS.md`; "a entrada real é imagem e não há string para decodificar", `PLANO-EXECUCAO-2026-08.md` §2). O que FALTA a quem está na rua às 23h não é u …

**Portão.** Não há decoder, logo não há portão de fan-out — e é essa a decisão. SE o dono quiser o complemento de P, ele é um chip no sniffer, não um card: `/^([0-4])[\s\-/]([0-4])[\s\-/]([0-4])[\s\-/](W|OX|SA)$/i`, com o símbolo do quadrante branco OBRIGATÓRIO — é ele que dá 100% de rejeição. A forma só-numérica (`4-2-3`) fica FORA: medido, ela já produz hoje 3 cards de `cipher-disk` a 0,36–0,38 e o chip "todos entre 1 e 26", e acrescentar mais uma leitura ali é piorar o topo.

**Rejeição medida.** Não se aplica: legenda não entra no fan-out e não pode fazer ruído (rejeição 100% por construção). Para o chip opcional, medi o portão com símbolo obrigatório: **100,00%** no corpus real (0 em 20.047), **100,00%** no sintético (0 em 24.400) e **0 disparos em 463.438 palavras** pt+en. E medi por que a variante só-numérica fica fora: `4-2-3` já produz hoje 3 cards a 0,36–0,38, e …

**Autoverificação.** NENHUMA — quatro dígitos de 0 a 4 não verificam nada. É a razão declarada de não ser decoder: pela R2, quem não se autoverifica entra com teto de nota, e um teto de nota sobre uma leitura que a pessoa já fez sozinha não vale um card. Legenda não disputa ranking, então o problema evapora.

**Arquivos.** CRIAR: `src/features/reference/nfpa-704.ts`, `src/features/reference/nfpa-704.test.ts`. EDITAR: `src/features/reference/components/reference-panel.tsx` (nova `<Section title="Diamante NFPA 704">`, no molde de `"Bandeiras do Código Internacional de Sinais"` em `:458`, que é a seção-irmã: legenda de coisa que se VÊ), `src/features/help/help-content.ts` (verbete de aba, com `esperado` em vez de `examples` — não passa pela bancada), `docs/PENDENCIAS. …

**API.** Não é decoder; a assinatura é do módulo de dados da Cola: `export interface QuadranteNfpa { cor: "azul"|"vermelho"|"amarelo"|"branco"; posicao: "esquerda"|"topo"|"direita"|"base"; eixo: string; escala: { valor: 0|1|2|3|4; significado: string }[] }` · `export const NFPA_704: QuadranteNfpa[]` · `export const NFPA_SIMBOLOS: { simbolo: "W̶"|"OX"|"SA"; significado: string; normativo: boolean }[]` · `export const NFPA_ARMADILHAS: string[]` (a ordem de leitura; e que COR, ACID, ALK, BIO, POI aparecem no mundo real mas NÃO são normativos na NFPA 704).

**Vetor de teste.** A legenda tem de resolver este caso de leitura, e o teste é sobre ela: entrada visual `3` no azul, `0` no vermelho, `2` no amarelo, `W̶` no branco → a Cola devolve "saúde 3 = exposição curta pode causar dano grave · inflamabilidade 0 = não queima · instabilidade 2 = reage violentamente sob aquecimento ou pressão · W̶ = não use água". A armadilha que a legenda desfaz, e que é o produto de verdade: a transcrição `3-0-2` é AMBÍGUA — na ordem do desenho (vermelho, azul, amarelo) ela diria inflamabilidade 3; na ordem de escrita usual (azul, vermelho, amarelo) diz saúde 3. São leituras opostas do mesmo texto, e a Cola diz qual é qual. Contraprova de que decoder seria pior: `1-3-0-2` casa em `PAREC …

**Riscos.** (1) Símbolos não normativos (COR, ACID, ALK, BIO, POI, RAD) circulam muito em placa real; a legenda tem de listá-los COMO não normativos, senão vira fonte de erro com aparência de norma — é a mesma disciplina do rótulo de faixa de UF em `placa-veiculo.ts`. (2) A escala muda entre edições da NFPA 704; a legenda deve nomear a edição que serviu de fonte, ou envelhece mentindo (R6). (3) Se o dono preferir o chip, ele é P e não conflita com esta legen …

**Conflito com decisão anterior.** Contraria a triagem, que classificou NFPA como LACUNA_MORNA com viés de decoder. Rebaixo o destino aplicando a MESMA régua com que aprovei o POSTNET nesta fatia — transcrição que já é decodificação vira legenda; transcrição que deixa tabela e verificador para a máquina vira decoder. Aplicar o critério só no sentido que convém seria pior que não ter …

**Decisão do dono.** Se quer o chip do sniffer junto (P), ou só a legenda.

**Correção exigida pela crítica.** O destino está certo e a simetria com o POSTNET é o que dá crédito à régua. Mas a "contraprova" principal é autocontraditória:

#### 11.15 · Elian script

`legenda-na-cola` · **P (~1 h): 4 linhas de texto e um subtítulo** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Não tem bloco Unicode e não tem notação textual: chega como rabisco numa margem ou num muro. Regra da casa, escrita no cabeçalho de glyphs.ts:1–17 — 'nenhum dos dois tem bloco Unicode, e a entrada real de prova é uma imagem; descrever glifo por glifo para digitar seria mais lento do que olhar a legenda'. Vale exatamente para este. O que o torna BARATO é que ele não é um alfabeto novo: é o pigpen desenhado de outro jeito — a mesma grade 3×3, com o glifo puxado num traço só e as passadas separadas …

**Portão.** Não há — e não pode haver. Nada entra no fan-out, nada roda por tecla, o decode() não existe. É por isso que o item é onda 11: o risco de ruído é estruturalmente zero.

**Rejeição medida.** não se aplica — item sem portão e sem card. Rejeição de tráfego: 100% por construção, porque nada é avaliado.

**Autoverificação.** Nenhuma no motor. A conferência é a mesma do pigpen: o ponto é o único sinal que separa duas letras de mesmo desenho, e a legenda tem de mandar procurá-lo antes de chutar (PIGPEN_NOTES já diz isso na 3ª nota). Como não há decoder, não há nota a limitar.

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/reference/glyphs.ts (novo `export const ELIAN_NOTAS: string[]` logo abaixo de PIGPEN_NOTES, hoje em :146–151); editar /Users/peter/Repos/the-decrypter/src/features/reference/components/reference-panel.tsx (importar ELIAN_NOTAS na linha 14, junto de LIBRAS/PIGPEN, e renderizar `<Notas itens={ELIAN_NOTAS} />` DENTRO da Section "Pigpen / maçônico" que começa em :342, abaixo do <ul> de PIGPEN_NOTES …

**API.** `export const ELIAN_NOTAS: string[]` — mesma forma de PIGPEN_NOTES e LIBRAS_NOTES, consumida pelo componente Notas() de reference-panel.tsx:96, que já existe e já é o formato de toda legenda desta Cola.

**Vetor de teste.** Não há claro→cifrado→claro porque não há notação textual — e escrever um seria inventar. O vetor é de LEITURA e é falsificável: a célula 'cantoneira com traço à direita e embaixo, sem ponto' é o A tanto no pigpen quanto no Elian, e é exatamente o que gridGlyph("A", 0, false) produz hoje em glyphs.ts:75 (sides {top:false,right:true,bottom:true,left:false}). A mesma cantoneira COM um ponto é a 2ª passada, e com dois pontos a 3ª. Quem implementar tem de rodar esse casamento contra a fonte antes de publicar — se a atribuição de letras às células divergir, a nota muda e a tabela do pigpen permanece intacta.

**Riscos.** 1) A ordem de atribuição das letras às células varia entre as representações que circulam. Precedente da casa para exatamente isso: NYCTOGRAFICO_NOTAS (alfabetos-visuais.ts) declara a divergência e manda usar a tabela da prova, em vez de preencher por semelhança. A última nota do Elian tem de repetir essa ressalva palavra por palavra. 2) Se a checagem do vetor acima falhar, o item vira uma Section própria com tabela — e aí o custo sobe de P para …

**Conflito com decisão anterior.** nenhum. 'elian' não aparece em INVENTARIO-CATALOGOS.md nem em src/. r/codes: 5 posts + 13 comentários; triagem LACUNA_QUENTE com prova_fit 5, e o argumento dela é o mesmo que sustenta a legenda: a posição do ponto é livre e o texto passa por rabisco decorativo.

**Correção exigida pela crítica.** 143–148**, não :146–151. A Section é `reference-panel.tsx:342` ✓ e o import é a linha 14 ✓. R1/R3/R4 não se aplicam (sem portão, sem fan-out, sem bundle). A etapa de falsificação de 20 min é o melhor pedaço da ficha e fica como está — é o único card do lote que traz o próprio interruptor.

#### 11.16 · Soroban (ábaco japonês)

`legenda-na-cola` · **P (~15 min)** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Chega como foto de um objeto, então decoder está fora. Mas a regra de leitura cabe em UMA frase — a conta de cima vale 5, as de baixo valem 1, e a coluna é a casa decimal — e por isso ela não merece uma Section: merece uma LINHA no bloco 'Imagens' do CHECKLIST que já existe em reference-panel.tsx:74–83, ao lado de 'Busca reversa' e 'Propriedades do arquivo / EXIF'. O valor do verbete não é ensinar a ler o ábaco, é fazer alguém RECONHECER que aquilo na foto é um número.

**Portão.** Não há — item sem decoder. Nada roda por tecla e nada entra no fan-out.

**Rejeição medida.** não se aplica. Impacto no fan-out e no bundle: zero (uma string num array literal que já é carregado).

**Autoverificação.** Nenhuma no motor. A conferência humana é posicional: coluna vazia é zero, e a contagem tem de bater com o número de colunas do instrumento.

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/reference/components/reference-panel.tsx — uma string a mais no array `items` do bloco { title: "Imagens" } do CHECKLIST, hoje em :74–83. Nenhum arquivo de dados novo, nenhum import novo, nenhuma Section nova.

**API.** nenhuma. O CHECKLIST é um literal local do componente (reference-panel.tsx:50) e não tem export.

**Vetor de teste.** Aritmético: uma coluna com a conta de cima abaixada e três contas de baixo levantadas vale 5 + 3 = 8. Três colunas lendo 8 · 9 · 0 (a terceira sem nenhuma conta encostada na barra) valem 890. O negativo: quem contar todas as contas encostadas como 1 lê 4 + 3 = 7 em vez de 8, e o erro é de 1 por coluna, silencioso e cumulativo.

**Riscos.** 1) O risco real é o oposto do usual: promover isto a Section própria por duas frases é exatamente o inchaço que a casa nomeou ('Cola inchada é Cola que ninguém lê às 23h'). Se a discussão empurrar para uma Section, a resposta é não. 2) A triagem dá prova_fit 4 e LACUNA_QUENTE, mas com 2 posts + 2 comentários no r/codes — a âncora externa é fraca e o custo escolhido reflete isso.

**Conflito com decisão anterior.** nenhum: soroban e ábaco não aparecem em INVENTARIO-CATALOGOS.md nem em src/ (grep vazio).

**Correção exigida pela crítica.** Destino e arquivo corretos: o bloco `{title:"Imagens"}` do `CHECKLIST` está em `reference-panel.tsx:74–83`, é literal local sem export ✓. Vetor aritmético correto (5+3=8; três colunas 8·9·0 = 890; o erro de contar todas as encostadas = 7). A auto-recusa de virar Section é o instinto certo.


### Onda 12 — o que depende de chave e do 2º campo

#### 12.1 · Numerais egípcios

`decoder-no-leque` · **P (~3 h), e as 3 horas são de conferência: fixar os sete code points contra a carta oficial do Unicode e escre…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** São sete sinais aditivos de potência de 10 dentro do bloco Egyptian Hieroglyphs (U+13000–1342F, conferido que /\p{Script=Egyptian_Hieroglyphs}/u casa). Colam-se; a soma é um número; o número encadeia. Fica em onda 12 e não 11 porque, ao contrário do maia e do Kaktovik, os code points NÃO são deduzíveis por subtração: cada sinal tem de ser fixado um a um contra a carta Unicode, e essa é a etapa que pode dar errado em silêncio.

**Portão.** Todo caractere da entrada (sem espaços) tem de ser UM dos sete sinais numerais (Gardiner Z15=1, V20=10, V1=100, M12=1.000, D50=10.000, I8=100.000, C11=1.000.000), ≥1 caractere. Um hieróglifo do bloco que não seja numeral derruba a leitura — texto egípcio corrido não vira número.

**Rejeição medida.** 100,00% no corpus de 44.000 (SMP, mesma razão do maia). Contra hieróglifo NÃO-numeral a rejeição é o complemento: os sete numerais são 7 de mais de 1.000 sinais do bloco, então um texto egípcio real de N caracteres acende com probabilidade desprezível.

**Autoverificação.** Sim, e é a mais forte da fatia depois do FEN: na escrita canônica cada sinal se repete no MÁXIMO 9 vezes, porque a décima vira o sinal da potência seguinte. Um sinal repetido 10 ou mais vezes prova que a transcrição está errada (ou que a prova usou notação livre) e o card tem de dizer isso em vez de somar. Segundo sinal: o sistema não tem zero, então a ausência de uma potência …

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/numerais-visuais.ts e .../numerais-visuais.test.ts (os mesmos três arquivos dos outros numerais).

**API.** Mesmo decoder `numerais-visuais`, ramo aditivo. DecodeCandidate { label: "egípcio — aditivo", output: "𓆼𓆼𓏺 = 2001 (2×1000 + 1)", notes: "sem zero: o 0 das centenas e o das dezenas é a AUSÊNCIA do sinal", forcedScore: 0.7, chainValue: "2001" }. Score 0.7 e não 0.8 de propósito: é o único dos quatro cuja tabela depende de identificação de sinal, e o teto reconhece isso (R2).

**Vetor de teste.** Aritmético, conferível sem a tabela: 2001 = 2×1000 + 0×100 + 0×10 + 1 → dois sinais M12 (lótus, 1.000) seguidos de um Z15 (traço, 1) → 𓆼𓆼𓏺 → volta 2001. Note que 2001 e 2010 diferem por QUAL sinal acompanha os dois lótus (Z15 uma vez vs V20 uma vez), e 21 é o mesmo desenho sem os lótus — é a ausência que carrega o zero. Segundo vetor negativo: dez traços Z15 seguidos NÃO valem 10; a escrita canônica escreveria um V20, e o card deve marcar a repetição ≥10 como transcrição suspeita.

**Riscos.** 1) O risco número um é fixar o code point errado. Z15 (o traço do NUMERAL 1) é visualmente quase idêntico a Z1 (o traço DETERMINATIVO), e uma consulta que fiz nesta sessão já devolveu os dois trocados — não confie em resumo, abra a carta do Unicode e assere no teste. O mesmo vale para V1 (100) contra as variantes V1A–V1H. 2) A ordem dos sinais não importa (é notação de valor de sinal, não posicional), então a soma tem de ser por sinal, nunca por …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:120 e docs/PLANO-CATALOGOS.md:180 recusam 'egípcio' no mesmo pacote do maia. A contestação é a mesma da ficha do maia (o argumento 'ninguém digita' já está vencido dentro de casa por numerais-antigos.ts), com a ressalva a mais de que aqui o custo de conferência é real e por isso o item é onda 12.

**Correção exigida pela crítica.** **(c) Vetor — bate, e resolvi a tabela.** `𓆼` = **U+131BC = M012**, `𓏺` = **U+133FA = Z015** → 1000+1000+1 = 2001. Os sete, fixados contra `unicodedata` nesta sessão:

#### 12.2 · Códons de DNA e aminoácidos

`decoder-no-leque` · **P (~2 h): tabela de 64 códons gerada por laço (não digitada), 6 quadros, portão e testes.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** ATGCGA é texto ASCII puro: digita-se, cola-se, encadeia. A saída é a palavra em código de UMA letra dos aminoácidos, que é exatamente o que o realce de palavra real do score.ts sabe julgar. Onda 12 porque a leitura tem 3 quadros de leitura × 2 fitas = 6 hipóteses, o que pede bruteDecoder e não mapDecoder.

**Portão.** A entrada, com espaços e quebras removidos e SEM dobrar acentos, casa /^[ACGT]+$/i (ou /^[ACGU]+$/i para RNA — a presença de U e ausência de T é ela própria um sinal), comprimento ≥12 e múltiplo de 3.

**Rejeição medida.** 100,00% no corpus de 44.000 para os pisos de 9, 12 e 18. E medi o adversário certo, que é a palavra que por acaso só usa A/C/G/T: nas listas pt+en juntas (463.437 palavras) existem 71 palavras só com essas letras, e NENHUMA tem ≥9 letras com comprimento múltiplo de 3 — as maiores são de 6 a 7 (cacata, gagata, catacá, tacaca). Pares colados dessas 71 passam o portão em 11,4% dos …

**Autoverificação.** Três camadas, e é isso que a tira do teto de nota. (a) o comprimento múltiplo de 3 é aritmético; (b) uma fita de verdade abre em ATG (metionina) e fecha num códon de parada TAA/TAG/TGA — quando os dois batem, é uma ORF e não uma coincidência; (c) o alfabeto de saída tem só 20 letras (ACDEFGHIKLMNPQRSTVWY: faltam B, J, O, U, X, Z), e MEDI que só 14,5% do vocabulário português — …

**Arquivos.** criar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/codon.ts e .../codon.test.ts.

**API.** bruteDecoder({ id: "codon", name: "Códons de DNA", category: "encoding", keep: 2, variants(input) }) — as variantes são os 3 quadros × 2 fitas (a fita reversa complementar é A↔T, C↔G, na ordem invertida), rotuladas 'quadro 1 · fita direta' etc. SEM forcedScore: a saída é texto e quem decide é o scorePlaintext com o realce de palavra real, exatamente como o ramo inverso do letter-values.ts já faz ('no sentido inverso a saída é texto: sem forcedScore, para o realce decidir sozinho'). Um `notes` obrigatório dizendo que B, J, O, U, X e Z não têm códon.

**Vetor de teste.** Calculado com a tabela padrão e conferido com round-trip: PALESTRA → CCT GCT TTA GAA TCT ACT CGT GCT → "CCTGCTTTAGAATCTACTCGTGCT" (24 nucleotídeos, múltiplo de 3) → volta PALESTRA. Tabela: o código genético padrão, gerada pela ordem TCAG × TCAG × TCAG contra a string FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG; conferi 26 códons conhecidos um a um contra ela (ATG=M, TGG=W, TAA/TAG/TGA=parada, CCA=P, GGG=G, CAT=H, AAA=K…). Sem chave.

**Riscos.** 1) NÃO dobrar acento no portão. Medi: se o portão aplicar stripDiacritics e aceitar U, 'cataguaçu' vira 'cataguacu' — 9 letras, múltiplo de 3, tudo em ACGTU — e passa. Sem dobrar, o ç a barra. É uma linha de código e a diferença entre 0 e 1 falso positivo conhecido. 2) O teto de 14,5% de palavras soletráveis é o limite real da utilidade: PORTA não existe neste alfabeto (não há O). Isso vai no card, não no commit message. 3) O piso de 12 é conserv …

**Conflito com decisão anterior.** nenhum. 'códon' e 'aminoácido' não aparecem em INVENTARIO-CATALOGOS.md nem em src/ (conferi por grep; o periodic-table.ts é a tabela dos elementos, outra coisa). r/codes: 22 posts + 32 comentários, veredito LACUNA_QUENTE em duas fichas da triagem.

**Correção exigida pela crítica.** - Tabela gerada por `TCAG×TCAG×TCAG` contra `FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG`: conferi 16 códons conhecidos, **0 divergência**. - `PALESTRA → CCT GCT TTA GAA TCT ACT CGT GCT` = 24 nt, múltiplo de 3, volta `PALESTRA`. Alfabeto sem `BJOUXZ` ✓. - `words-pt.txt` = **259.221** ✓ · soletráveis **37.686 = 14,54%** ✓ · palavras só-ACGT (com dobra) = **71** ✓ · com ≥9 e múltiplo de 3 = **0** ✓ · pares colados no piso 9 = * …

#### 12.3 · Notação de xadrez — FEN

`decoder-no-leque` · **P (~3 h): parser de FEN, render das 8 linhas, testes.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** FEN é literalmente uma string, e é a única desta fatia com dígito verificador de fato: cada uma das 8 fileiras tem de somar exatamente 8 casas. O que o decode devolve — o tabuleiro em 8 linhas — é a entrada natural do grid-read.ts e da aba Matriz, então ele encadeia. Onda 12 porque o ramo SAN, irmão dele, precisa de decisão de escopo.

**Portão.** O primeiro campo (até o primeiro espaço) partido por '/' tem de dar exatamente 8 pedaços; cada pedaço casa /^[rnbqkpRNBQKP1-8]+$/ E soma exatamente 8 (dígito conta o próprio valor, letra conta 1); e o tabuleiro tem de ter ≥2 peças. Sem o piso de 2 peças, '8/8/8/8/8/8/8/8' (tabuleiro vazio) passa — conferido.

**Rejeição medida.** ≥99,9996%. Medido em três corpora: 0 de 44.000 no corpus geral; 0 de 200.000 strings base64 aleatórias de 20 a 80 caracteres — que é o adversário CERTO, porque o alfabeto base64 contém '/' e é o único jeito de fabricar 8 pedaços por acaso; 0 de 50.000 caminhos de arquivo de 8 segmentos.

**Autoverificação.** Sim, e é aritmética, não estatística: 8 fileiras × soma 8. É um dígito verificador com outro nome. Conferido nos dois sentidos — a FEN inicial passa; a mesma FEN com um peão a mais na primeira fileira (9 casas) é recusada.

**Arquivos.** criar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/xadrez.ts e .../xadrez.test.ts.

**API.** defineDecoder({ id: "xadrez", name: "Notação de xadrez", category: "transform", decode(input) }) com dois ramos. Ramo FEN: DecodeCandidate { label: "FEN — posição no tabuleiro", output: as 8 linhas com '.' nas casas vazias (texto que a aba Matriz aceita colado), notes: "lado a jogar, roque e en passant vêm dos campos seguintes", forcedScore: 0.85, chainValue: as letras de peça na ordem de leitura }. O 0.85 é acima do 0.8 dos numerais porque aqui há conferência aritmética, e abaixo do 0.95 de acerto em base real de decoders/README.md.

**Vetor de teste.** Calculado e conferido contra o portão: FEN inicial `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` → aceita → 8 linhas, 32 peças, chainValue "rnbqkbnrppppppppPPPPPPPPRNBQKBNR". Negativos medidos: `rnbqkbnrp/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1` (fileira de 9) → recusada; `8/8/8/8/8/8/8/8` (vazio) → recusada pelo piso de 2 peças; 200.000 base64 → 0 aceitas. Sem chave.

**Riscos.** 1) O tabuleiro vazio é o único falso positivo estrutural e o piso de 2 peças o mata — quem esquecer o piso ganha um card em toda string que por acaso partir em 8 oitos. 2) FEN não é a resposta, é o suporte: o card devolve a posição, e a leitura (que peça em que casa soletra o quê) é da equipe. Dizer isso no `notes` evita a expectativa errada. 3) A saída em 8 linhas tem de ser colável na Matriz sem edição, senão o encadeamento que justifica o deco …

**Conflito com decisão anterior.** nenhum. 'xadrez', 'chess' e 'FEN' não aparecem em INVENTARIO-CATALOGOS.md nem em src/ (grep vazio). r/codes: 8 posts + 9 comentários para notação de xadrez, 30 posts + 44 comentários para 'chess' em geral; veredito LACUNA_QUENTE em duas fichas.

**Correção exigida pela crítica.** **(c) Portão — bate em todos os casos.** FEN inicial aceita; fileira de 9 recusada; `8/8/8/8/8/8/8/8` recusado **pelo piso de 2 peças** (o piso é carga, como a ficha diz); **0 de 200.000** base64 aleatórios de 20–80 caracteres; **0 de 50.000** caminhos de 8 segmentos.

#### 12.4 · Notação de xadrez — SAN (lista de lances)

`decoder-no-leque` · **P (~2 h) marginal sobre o ramo FEN, mesmo arquivo.** · crítica: **CAI** · fatia: Cola e tabelas pequenas

**Por que esse destino.** É o segundo ramo do MESMO decoder do FEN, e existe por um motivo específico: numa cifra de tabuleiro o que carrega a mensagem são as CASAS DE DESTINO dos lances, e 'e4 d5 c6' é uma coordenada de grade 8×8 que o grid-read.ts e a aba Matriz já sabem consumir. O chainValue é a lista de destinos concatenada — isso é encadear, logo é decoder e não aba.

**Portão.** Depois de remover os tokens de número de lance (/^\d+\.$/), sobram ≥4 tokens e TODOS casam /^(?:[KQRBN][a-h1-8]?x?[a-h][1-8]|[a-h]x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?$/. O piso de 4 é o que separa lance de xadrez de rótulo de célula.

**Rejeição medida.** 100,000% em dois corpora: 0 de 44.000 no corpus geral e 0 de 45.000 no adversário dirigido (20.000 listas de byte hex separados por espaço, 20.000 listas de rótulo letra+dígito, 5.000 códigos de assento). O piso de 4 tokens é o que produz esse número: o portão irmão de 'lista de casas soltas a1..h8 com ≥3 itens' foi medido em 99,884% no MESMO adversário, com 52 falsos positivos …

**Autoverificação.** Fraca, e o desenho reconhece isso. A gramática do SAN é um portão de forma, não uma prova: ela não confere legalidade (não sabemos onde as peças estão). Por isso o ramo SAN entra com TETO DE NOTA (R2), abaixo do piso de quem se autoverifica — o irmão FEN, que confere aritmeticamente, fica em 0.85; este fica em 0.45, o mesmo teto que timestamp.ts usa e pela mesma razão declarada …

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/xadrez.ts e .../xadrez.test.ts (os mesmos arquivos do FEN).

**API.** Mesmo decoder `xadrez`, segundo DecodeCandidate: { label: "SAN — casas de destino", output: "e4 d5 c6 …", notes: "o que costuma carregar a mensagem é a casa de DESTINO; o roque (O-O) não tem casa e entra como buraco", forcedScore: 0.45, chainValue: os destinos concatenados sem espaço }. Sem `inputs`, sem chave.

**Vetor de teste.** Calculado contra o portão. Positivo: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6` → remove '1.','2.','3.' → sobram 6 tokens, todos casam → destinos e4 e5 f3 c6 b5 a6 → chainValue "e4e5f3c6b5a6", que colado na Matriz é uma lista de 6 coordenadas de grade. Negativos medidos: 20.000 listas de byte hex ("3f a1 09 …") → 0 aceitas; 20.000 listas letra+dígito ("k7 c2 m4 …") → 0 aceitas.

**Riscos.** 1) O roque (O-O, O-O-O) não tem casa de destino: emitir buraco é honesto, emitir uma casa inventada é resposta errada. 2) O teto de 0.45 fica acima do corte de 0.35 do partition (run.ts), ou seja, o card aparece na área provável — é a mesma escolha do timestamp e o mesmo preço: informa sem liderar. 3) O terceiro ramo (lista de casas soltas) foi medido e está FORA por decisão desta ficha; se alguém quiser trazê-lo depois, o número dele já está aqu …

**Conflito com decisão anterior.** nenhum — mesma situação do FEN.

**Correção exigida pela crítica.** o portão corrigido é o "lista de casas soltas" com piso 4 mais lances de peça, e medi esse terceiro ramo no MESMO adversário em **99,962%**, isto é, *melhor*. A discriminação que a ficha alega entre os dois (100,000% vs 99,884%) não sobrevive à medição. Cai como está. Pode voltar como sub-ramo do `xadrez` com portão consertado, piso ≥6 tokens e exigência de ≥1 lance de peça (para não colapsar em lista de rótulos) — mas isso é ficha nova com númer …

#### 12.5 · Nihilist (substituição)

`decoder-no-leque` · **P (~2h) — decoder (~70 linhas) + chip do sniffer (~15) + testes** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** A régua diz "o que precisa entrar numa cadeia é decoder", e o Nihilist termina em NÚMEROS — o formato que a casa encadeia para CEP, DDD e coordenada. Ele entra no leque porque tem as duas coisas que a régua exige e que o inventário não mediu: uma assinatura ARITMÉTICA de 99,96% de rejeição e uma autoverificação que mata 1.999 de 2.000 chaves erradas ANTES do vocabulário. Fora isso, `inputs.aux.required` o tira da corrida enquanto a 2ª chave estiver vazia (`use-decoder.ts:357`), então o custo por …

**Portão.** `const toks = input.split(/[^0-9]+/).filter(Boolean)` e então: `toks.length >= 8` · todo token com 2 ou 3 dígitos · todo valor em [22,110] · `v % 10 !== 1` · `v % 10 === 0 → v >= 30`. Os três últimos saem da álgebra da cifra: v = (10·r₁+c₁)+(10·r₂+c₂) com r,c ∈ 1..5, logo unidade = (c₁+c₂) mod 10 ∈ {0,2..9} — **unidade 1 é impossível** — e unidade 0 exige vai-um (r₁+r₂+1 ≥ 3).

**Rejeição medida.** **99,96%** — o portão aritmético passa em 8 de 20.367 entradas do corpus de tráfego (o mesmo do item 1), e os 8 são tiras sintéticas de pares de Políbio, nenhum CEP, telefone, quadra, data, coordenada ou A1Z26. Com piso de 12 tokens vai a 100,00%. Comparação: o piso da R1 é 79,8% (Plus Code curto) e a cauda de UTM, o melhor atalho da casa, faz 98,67%. A aritmética não é enfeite …

**Autoverificação.** Dupla, e a primeira camada é aritmética pura: com a chave errada, a subtração cai fora de 1..5 e o decoder devolve `[]`. Medido com 2.000 pares de chaves aleatórias sobre o cifrado real: **apenas 1 par produziu coordenada válida nas 13 posições** (0,05%), e **0 passaram** o portão de vocabulário (`coverage` ≥ 0,45). A chave certa dá cobertura 0,77. Segunda camada: `coverage(sai …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/nihilist.ts · .../nihilist.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/sniff.ts (chip `nihilist-shape`, com `decoderId: "nihilist"`, ao lado do bloco ADFGVX de `sniff.ts:187`) · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:50 (destino sai de `terceirizar`) · /Users/peter/Repos/the-decrypter/src/features/reference/inventa …

**API.** `defineDecoder({ id: "nihilist", name: "Nihilist (soma sobre o quadrado)", category: "classical", inputs: { key: { label: "Chave da grade", placeholder: "BLUMENAU" }, aux: { label: "Chave da soma", placeholder: "ITAJAI", required: true } } })`. `decode()` devolve no máximo 1 candidato: `{ decoderId, decoderName, category, label: "grade BLUMENAU · soma ITAJAI", output, chainValue: output }`, sem `forcedScore` quando a cobertura é alta o bastante para o `scorePlaintext` levá-lo ao topo, e `forcedScore: Math.min(0.82, 0.6 + cob*0.25)` (a fórmula de `transposicao.ts:200`) quando ele precisa passar por cima do `periodic-table` a 0,55. `encode()` existe (soma) e é determinístico.

**Vetor de teste.** Chave da grade `BLUMENAU` → `BLUME / NACDF / GHIKO / PQRST / VWXYZ`. Chave da soma `ITAJAI` (J dobra em I). Claro `APONTEDEFERRO`. Conta das 3 primeiras posições: A=22 + I=33 → **55** · P=41 + T=45 → **86** · O=35 + A=22 → **57**. Cifrado completo: `55 86 57 54 67 48 57 60 47 48 65 76 68`. Decifrando com as mesmas duas chaves: `APONTEDEFERRO`. Faixa 47–86, unidades observadas {0,4,5,6,7,8} — nenhuma unidade 1, como a álgebra prevê.

**Riscos.** 1) **Colisão frontal com `periodic-table`**, medida: todo Nihilist válido também é uma lista de números atômicos válidos, e hoje ela tira 0,55. Se o card do Nihilist não passar por cima quando o vocabulário confirma, a bancada continua liderando com a resposta errada. 2) O inventário descreve o portão errado — ver `conflito`. 3) O corpus de tráfego é sintético em 6 das 12 famílias (telefone, data, dígitos aleatórios, preço, lei, tira 1–5); CEP e …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:50 dá destino `terceirizar` e descreve o portão como "[22,110], sem 0 e sem 6 a 9 nas posições decompostas". **A descrição está errada como portão**: os dígitos do CIFRADO incluem 6–9 sem problema — no meu vetor conferido, 8 dos 13 números os têm (86, 67, 76, 68, 65, 48, 47, 57). Implementar o que a linha diz rejeitaria …

**Correção exigida pela crítica.** ** a API proposta é **impossível de implementar**. "sem `forcedScore` quando a cobertura é alta o bastante para o `scorePlaintext` levá-lo ao topo, e `forcedScore: …` quando ele precisa passar por cima do `periodic-table` a 0,55" — `decode(input, ctx)` é **pura e síncrona** e não vê a nota de card nenhum (`run.ts:24-30` calcula `c.forcedScore ?? scorePlaintext(c.output)` **depois**). Tem de virar uma fórmula incondicional. `Math.min(0.82, 0.6 + c …

#### 12.6 · Four-square

`decoder-no-leque` · **P (~2h) para o par Four-square + Two-square no mesmo arquivo — a operação de dígrafo é a mesma, muda o retângu…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** O inventário o manda terceirizar por "reprova na assinatura", e isso é verdade da assinatura de ENTRADA — mas a casa tem um mecanismo que o inventário não considerou: `inputs.aux.required` tira o decoder da corrida enquanto o 2º campo estiver vazio (`use-decoder.ts:357`), e o Four-square precisa de DUAS chaves. Ou seja, a cifra que o documento rejeita por não ter assinatura é justamente a que o portão de campo obrigatório resolve de graça: enquanto ninguém digitar a segunda grade, ele não roda, …

**Portão.** Entrada: só letras, comprimento par ≥ 8, depois de dobrar J em I. Chaves: `ctx.key` (grade 1) e `ctx.aux` (grade 2), a segunda com `required: true`. Saída: `coverage(saida).covered/analisado >= 0,45` **e** `maiorPedaco(saida) >= 5`.

**Rejeição medida.** 100% do tráfego enquanto a 2ª chave estiver vazia (portão de campo obrigatório). Com as duas chaves preenchidas e ERRADAS: **99,85%** (3 falsos em 2.000 pares). O piso da R1 é 79,8%.

**Autoverificação.** Só pelo vocabulário — o mecanismo não trava com chave errada (sai texto dos dois lados, como em `alfabeto-chave.ts:113-119`). Por isso o portão é de SAÍDA e foi calibrado medindo: com as duas chaves certas o vetor abaixo dá cobertura **0,71** e maior pedaço **5**; com 2.000 pares de chaves aleatórias sobre o mesmo cifrado, `cobertura ≥ 0,45` passa em 24 (1,20%) e `cobertura ≥ 0 …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/quadrados-duplos.ts (exporta o array com os dois decoders — o registry aceita array, `registry.ts:26-29`) · .../quadrados-duplos.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:60 · /Users/peter/Repos/the-decrypter/src/features/reference/sources.ts:446 · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31 (`["**Fou …

**API.** `mapDecoder({ id: "four-square", name: "Four-square", category: "classical", inputs: { key: { label: "Grade 1", placeholder: "BLUMENAU" }, aux: { label: "Grade 2", placeholder: "ITAJAI", required: true } } })`. `decode()` devolve `{ output, label: "grades BLUMENAU / ITAJAI", chainValue: output }` ou `null`. `encode()` presente (o inverso é a mesma operação com os retângulos trocados). Importa `quadrado25()` do item 1; nenhum quadrado novo.

**Vetor de teste.** Grades `BLUMENAU` (canto superior-direito) e `ITAJAI` (canto inferior-esquerdo), alfabetos simples nos outros dois cantos. Claro `APONTEDEFERRO` → completa para 14 letras com X → `AP ON TE DE FE RR OX`. Dígrafo `AP`: A na linha 0 col 0 do alfabeto simples, P na linha 3 col 0 → cifra = (linha de A, coluna de P) na grade 1 e (linha de P, coluna de A) na grade 2 → `EK`. Cifrado completo: `EKINTBEBFIQQIY`. Decifrando com as mesmas duas grades: `APONTEDEFERROX`. Conferido nos dois sentidos.

**Riscos.** 1) O X de enchimento aparece na resposta e derruba a cobertura de quem lê a saída inteira — 0,71 é COM o X; a régua de `coverage` usa `analisado`, então não é problema, mas um teste tem de prender isso. 2) 0,15% de falso com chaves erradas não é zero: se a pessoa digitou duas chaves para OUTRA cifra e o Four-square emitir, é resposta errada com nota alta. Mitigação barata: `forcedScore` com teto de 0,70, abaixo de quem se autoverifica sozinho (Ni …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:60 dá `terceirizar` com a razão "saída alfabética indistinguível de qualquer substituição, e exigem duas grades-chave". Contesto a segunda metade: **exigir duas chaves é o que torna o item seguro, não o que o desqualifica** — o campo obrigatório existe no motor desde `use-decoder.ts:357` e é usado por 6 decoders. A prim …

**Correção exigida pela crítica.** - **A frase "é usado por 6 decoders" é falsa** (ver defeito 1 acima). Trocar por: "o mecanismo existe no motor e **este seria o primeiro decoder a usá-lo**; o teste tem de cobrir o filtro do hook, não só o decode." - **"100% de rejeição enquanto a 2ª chave estiver vazia" precisa da ressalva do campo global** (defeito 2). Com o Nihilist e o ADFGVX na mesma fatia, o `aux` vai estar preenchido com frequência, e aí a rejeição real é a de saída: 99,85 …

#### 12.7 · Two-square

`decoder-no-leque` · **P (~30 min) — é o delta sobre o item Four-square, no mesmo arquivo** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** Mesmo desenho e mesmo arquivo do Four-square — muda o retângulo e nasce uma propriedade que o Four-square não tem e que vale para a bancada: as **transparências**. Quando as duas letras do dígrafo caem na mesma coluna, o dígrafo sai INALTERADO. É estrutural, não estatístico: 5 colunas × 5 letras × 5 letras = 125 dos 625 dígrafos possíveis, **exatamente 20,0%**. Isso dá ao decoder um sinal que ele pode MOSTRAR ("1 dígrafo dos 7 saiu intacto — é a marca do Two-square") e à equipe uma pista de graç …

**Portão.** Idêntico ao Four-square: letras, comprimento par ≥ 8, `ctx.key` + `ctx.aux` com `required: true`, e portão de saída `coverage ≥ 0,45` e `maiorPedaco ≥ 5`. Acrescenta um sinal (não um portão): contar os dígrafos transparentes e pô-los em `notes`.

**Rejeição medida.** 100% do tráfego enquanto a 2ª chave estiver vazia. Com as duas chaves erradas: **99,90%** (2 falsos em 2.000 pares).

**Autoverificação.** Vocabulário, como o Four-square, e medida do mesmo jeito: chaves certas dão cobertura **0,71** e maior pedaço **5**; com 2.000 pares de chaves aleatórias, `cobertura ≥ 0,45` passa em 16 (0,80%) e com `maiorPedaco ≥ 5` passa em **2 (0,10%)**. É ligeiramente mais seletivo que o Four-square porque as transparências deixam pedaços do claro à mostra na saída errada também — o que aj …

**Arquivos.** MESMO arquivo do Four-square: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/quadrados-duplos.ts · .../quadrados-duplos.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:60 (a linha cobre os dois) · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31.

**API.** `mapDecoder({ id: "two-square", name: "Two-square (Playfair duplo)", category: "classical", inputs: { key: { label: "Grade de cima", placeholder: "BLUMENAU" }, aux: { label: "Grade de baixo", placeholder: "ITAJAI", required: true } } })`. `decode()` devolve `{ output, label: "grades BLUMENAU / ITAJAI", notes: "1 dígrafo saiu inalterado (transparência — 20% dos dígrafos)", chainValue: output }`. Só a variante VERTICAL: a horizontal é a mesma máquina com os retângulos trocados e não merece um segundo card no leque.

**Vetor de teste.** Grades `BLUMENAU` (cima) e `ITAJAI` (baixo). Claro `APONTEDEFERROX` → cifrado `NQKOQHAGAHRRIZ`. Volta com as mesmas chaves: `APONTEDEFERROX`. Conferido nos dois sentidos. A **transparência** aparece no vetor: o dígrafo `RR` sai `RR` — R está na coluna 2 da grade de cima e na coluna 2 da de baixo, e por isso o par não se move.

**Riscos.** 1) Two-square e Four-square emitem cards parecidos e, com as MESMAS duas chaves, disputam o topo entre si; `run.ts:56-70` só colapsa saídas idênticas. Como só um dos dois pode estar certo, o portão de vocabulário resolve — mas um teste tem de prender que o errado fica abaixo do corte. 2) Mesmo risco de teto do Four-square (`forcedScore` ≤ 0,70). 3) Para AUTORAR prova, a triagem é explícita: escolher UM entre Two-square e Four-square, porque são a …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:60 (`terceirizar`), pelo mesmo argumento do Four-square. Nota de contagem: o inventário lista os dois numa linha só, então flipar o destino cobre os dois de uma vez — mas a linha de `ENTREGUES` em inventario.test.ts precisa nomear um id, e o teste confere a LINHA, não o par.

**Correção exigida pela crítica.** as mesmas duas da ficha 5 (o "6 decoders" falso e a ressalva do `aux` global). A observação sobre a disputa Four-square × Two-square com as mesmas chaves está certa e o `dobrar()` de `run.ts:56-70` de fato só colapsa saída idêntica. **Custo P (~30 min como delta):** honesto. ---

#### 12.8 · Quagmire I, II e III — Vigenère com alfabeto chaveado

`decoder-no-leque` · **P — ~2h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: chave, transposição e 2º campo

**Por que esse destino.** Régua da casa: o que precisa entrar numa cadeia é decoder — a saída é texto claro que quase sempre é só mais uma camada, e o `chainValue` é o ponto. O atalho sugerido no briefing (alfabeto-chave + vigenere + Cadeia em 3 passos) NÃO existe, e medi as duas metades: (a) A ÁLGEBRA FECHA, MAS COM UMA CHAVE QUE NINGUÉM TEM. Quagmire III se decompõe em K2 → Vigenère → K1, só que o Vigenère do meio precisa da chave TRANSFORMADA pelo alfabeto chaveado: com palavra-chave BLUMENAU e indicadora ITAJAI, a ch …

**Portão.** ENTRADA (fica fora do fan-out sem o 2º campo, via `inputs.aux.required`):
const kw  = (ctx.key ?? "").replace(/[^a-zA-Z]/g, "");
const ind = (ctx.aux ?? "").replace(/[^a-zA-Z]/g, "");
if (kw.length < 3 || ind.length < 2) return [];
if (letrasDe(input).length < 22) return [];   // mesmo piso do alfabeto-chave.ts:50
if (!wordsProntas()) return [];               // sem vocabulário não há como conferir
SAÍDA (o portão que de fato segura): das 3 variantes (I, II, III), só passam as com `coverage(saida).covered/analisado >= 0,45` (alfabeto-chave.ts:52) E `maiorPedaco(saida) >= 6`; ordena por cobertura e corta em 2 cards.

**Rejeição medida.** ENTRADA: 100% enquanto o 2º campo está vazio — e hoje ele está vazio em 100% do tráfego, porque NENHUM decoder do registry declara `inputs.aux.required` (o filtro de `use-decoder.ts:357` nunca foi exercitado em produção; é o que a D8 de `PLANO-CIFRAS.md:588` registra, e este item o exercita pela primeira vez). SAÍDA: 0 falsos em 1.190. Como o portão é estrutural (dois campos va …

**Autoverificação.** Sim — vocabulário, e forte. Medido em 1.190 pares (prosa pt-BR corrida do próprio repo como claro, palavra-chave e indicadora sorteadas de `public/data/words-pt.txt`, 5-8 letras): ZERO passam cobertura≥0,45 e maiorPedaco≥6 (cobertura média 0,088; maior pedaço máximo observado 6). Com a chave certa: 320 de 325 (98,5%). Como se autoverifica, entra SEM teto de nota (R2) — pode lid …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/quagmire.ts · /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/quagmire.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts (bloco de caracterização — quem acende em entrada canônica) · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts (uma linha no mapa ENTREGUES: ["**Quagmire I-I …

**API.** id: "quagmire" · name: "Quagmire (Vigenère com alfabeto chaveado)" · category: "classical" · inputs: { key: { label: "Palavra-chave do alfabeto", placeholder: "BLUMENAU" }, aux: { label: "Chave indicadora (a que anda letra a letra)", placeholder: "ITAJAI", required: true } } · decode(input, ctx) devolve até 2 DecodeCandidate { decoderId, decoderName, category: "classical", label: "Quagmire I (chave no claro)" | "Quagmire II (chave no cifrado)" | "Quagmire III (mesma chave nos dois)", output, chainValue: output }, ordenados por cobertura, sem forcedScore (deixa o scorePlaintext + realce decidirem) · encode(input, ctx): cifra na variante III, fechando parte do item "direção de codificar" de IN …

**Vetor de teste.** CONVENÇÃO (a que faço valer, e que degenera em Vigenère quando o alfabeto é reto — conferido): K = alfabeto chaveado; a0 = posição de 'A' em K; para a letra indicadora k, deslocamento s = (posK(k) − a0) mod 26; cifrado = K[(posK(claro) + s) mod 26].
Chave do alfabeto BLUMENAU → K = BLUMENACDFGHIJKOPQRSTVWXYZ (a0 = 6).
Chave indicadora ITAJAI.
CLARO  : OMORROAZULFICAEMBLUMENAUEAPONTEDEFERRO (38 letras — passa o piso de 22)
CIFRADO: VQOZRVIJUDFRJTEGBCDQEIADGTPWNBGWEPEYYM
Conferência letra a letra das três primeiras: O(posK 15) com I(posK 12) ⇒ s=6 ⇒ K[21]=V · M(posK 3) com T(posK 20) ⇒ s=14 ⇒ K[17]=Q · O(15) com A(6) ⇒ s=0 ⇒ K[15]=O. Bate com VQO.
MEDIDAS DO PAR: o CIFRADO tem cobertura 0/38 e …

**Riscos.** 1) CONVENÇÃO DO TABLEAU. Os catálogos escrevem "deslocado para que a letra-chave caia sob o 'a' do alfabeto claro" e isso é ambíguo em prosa. Fixei a leitura que degenera em Vigenère e pus o teste de degenerescência acima; ainda assim, pinar contra o dCode antes de fechar é o que impede a resposta quase certa. 2) QUAGMIRE IV FICA DE FORA, POR ESCRITO. São três palavras-chave (claro, cifrado, indicadora) mais a posição da indicadora — quatro opera …

**Conflito com decisão anterior.** CONTRARIO três decisões escritas, e digo por quê. (a) /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:63 põe "Quagmire I-IV" em `descartar` com a razão "precisam de 100 ou mais letras, todas exigem chave, nenhuma tem assinatura". (b) /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md:176 agrupa em "cifra de concurso com chave e …

**Decisão do dono.** Duas. (1) Pinar a convenção do tableau: aceitar a minha (a que degenera em Vigenère) ou mandar conferir contra o dCode/Boxentriq antes do merge. (2) O rótulo do 2º campo passa a ser por cifra: hoje `decoder-workbench.tsx:136` mostra o genérico "2º campo — fonte a indexar, texto original, lista" quando nenhuma cifra está selecionada. Com `required`, a bancada passa a ter um decoder que só existe de …

#### 12.9 · Myszkowski — transposição colunar com chave de letras repetidas

`decoder-no-leque` · **P — ~1,5h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: chave, transposição e 2º campo

**Por que esse destino.** NÃO é capacidade nova: é conserto de RESPOSTA ERRADA COM NOTA ALTA, que a régua da casa (R2) chama de pior defeito possível — e ele já está em produção. O `columnar` desempata coluna de letra repetida por índice posicional (`columnar.ts:17-18`: `key[a] < key[b] ? -1 : key[a] > key[b] ? 1 : a - b`), que é a colunar clássica e é a leitura ERRADA de uma Myszkowski. Medido, com a chave CERTA: cifrado OTFRELNUAEDROUMNEBAPEDE + chave ITAJAI ⇒ o `columnar` emite APONEOEETELUDDFBNMRERAU com scorePlainte …

**Portão.** ENTRADA:
const key = (ctx.key ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
if (key.length < 3) return [];
if (new Set(key).size === key.length) return [];   // sem letra repetida, Myszkowski === columnar
const texto = input.toUpperCase().replace(/[^A-Z]/g, "");
if (texto.length < key.length * 2) return [];
if (!wordsProntas()) return [];
SAÍDA: `coverage(saida).covered/analisado >= 0,45` E `maiorPedaco(saida) >= 6`; um card só (a leitura é determinística dada a chave).
O segundo `if` não é cosmético: sem chave repetida a saída é BYTE A BYTE igual à do `columnar`, e o dedup por caixa/acento de `run.ts:60-66` mataria uma das duas pela sorte do score — a armadilha que a roda de cifras já documentou.

**Rejeição medida.** ENTRADA: 100% enquanto `ctx.key` está vazia — é o contrato dos 9 decoders com chave já em produção. Sobre o espaço de chaves plausíveis, o portão "tem letra repetida" rejeita mais 17,4%: das 175.384 palavras pt-BR de 4 a 10 letras em `public/data/words-pt.txt`, 144.953 (82,6%) têm letra repetida e 30.431 (17,4%) não. Ou seja, o caso em que Myszkowski diverge do columnar é o CAS …

**Autoverificação.** Sim — vocabulário, e o vão é enorme no caso medido: a leitura ERRADA (columnar sobre Myszkowski) dá cobertura 5/23 = 0,22 e maiorPedaco 5; a leitura CERTA dá 22/23 = 0,96 e maiorPedaco 8. O corte em 0,45 cai no meio do vão, com folga dos dois lados. Sem teto de nota (R2): quem passa provou português.

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/myszkowski.ts · .../myszkowski.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts (linha no mapa ENTREGUES) · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md linha 58 · /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md linha 176 …

**API.** id: "myszkowski" · name: "Myszkowski (colunar com chave repetida)" · category: "classical" · inputs: { key: { label: "Chave da transposição", placeholder: "ITAJAI · BLUMENAU (precisa ter letra repetida)" } } · SEM `aux` — a cifra tem um operando só · decode(input, ctx) devolve 0 ou 1 DecodeCandidate { label: `chave: ${KEY}`, output, chainValue: output } · encode(input, ctx) cifra (é o inverso exato, e fecha mais uma linha de INVENTARIO-CATALOGOS.md:168) · `mapDecoder` com portão de saída dentro do `decode`, ou `defineDecoder` se o portão ficar mais legível fora.

**Vetor de teste.** REGRA: escreve por linhas numa grade de `len(chave)` colunas; na leitura, letra de chave que aparece UMA vez tem a coluna lida de cima para baixo; letras de chave EMPATADAS têm suas colunas lidas linha a linha, da esquerda para a direita; a ordem entre as letras é alfabética.
CLARO   : APONTEDEFERRODEBLUMENAU (23 letras)
CHAVE   : ITAJAI (6 colunas; I nas posições 0 e 5, T na 1, A nas 2 e 4, J na 3)
GRADE   : linha0 A P O N T E · linha1 D E F E R R · linha2 O D E B L U · linha3 M E N A U (linha curta, 5 letras)
LEITURA : A empatado (col 2 e 4) ⇒ OT FR EL NU = OTFRELNU · I empatado (col 0 e 5) ⇒ AE DR OU M = AEDROUM (o M sozinho porque a linha 3 não tem coluna 5) · J sozinho (col 3) ⇒ NEBA · …

**Riscos.** 1) GRADE INCOMPLETA. É onde o `columnar` já acertou (a lógica de `rem`, columnar.ts:14) e onde a Myszkowski é mais fácil de errar, porque uma coluna empatada pode estar curta enquanto a irmã está cheia — no meu vetor é exatamente o M solto. O teste tem de ter um caso de grade não divisível, senão o bug volta. 2) DUPLA TRANSPOSIÇÃO CONTINUA FORA, por escrito: são duas chaves e o `INVENTARIO-CATALOGOS.md:176` a recusa junto; a Cadeia já permite rod …

**Conflito com decisão anterior.** CONTRARIO /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:58, que põe "AMSCO, Myszkowski, Grandpré, Route com chave" em `descartar` com a razão "cifra de concurso da ACA, não de caça ao tesouro. Nenhuma tem assinatura, todas exigem chave" — e /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md:176, que a agrupa no bloco de 17 rec …

**Decisão do dono.** Se o `columnar.ts` ganha ou não o comentário de topo apontando para o arquivo novo. Sou a favor: o defeito nasceu de um desempate de uma linha sem nenhuma prosa em volta, e a casa inteira é construída sobre o princípio oposto.

#### 12.10 · Seriated Playfair — Playfair de pares verticais

`decoder-no-leque` · **P — ~2h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: chave, transposição e 2º campo

**Por que esse destino.** Mesmo caso do Myszkowski: conserto de resposta errada com nota alta, já em produção. O `playfair` da bancada cifra e decifra pares ADJACENTES (`playfair.ts:31`, `for (let i = 0; i < text.length; i += 2)`), e a seriada forma os pares VERTICALMENTE entre duas linhas. Medido, com a chave CERTA: cifrado MNMUUKCXZMGAHTFKTMROGOCR + chave ITAJAI ⇒ o `playfair` emite LMORPOAZXOFBECDMALUMHNAU, scorePlaintext 0,550, bem acima do corte — e a leitura errada contém OAZ, LUM e NAU, três pedaços da resposta ve …

**Portão.** ENTRADA:
const key = (ctx.key ?? "").replace(/[^a-zA-Z]/g, "");
if (key.length < 3) return [];
const t = stripDiacritics(input).toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, "");
if (t.length < 24 || t.length % 2 !== 0) return [];   // par por construção (duas linhas iguais)
if (!wordsProntas()) return [];
BUSCA: períodos 2..12, um decode por período (11 passagens O(n) — a mesma ordem de grandeza do `railfence`, que já roda 5, e 28× menos que os 312 variantes do `affine`; NÃO é busca combinatória, então não cai na R3).
SAÍDA: `cobertura >= 0,45` E `maiorPedaco >= 6`; ordena por cobertura, corta em 2 cards.

**Rejeição medida.** ENTRADA: 100% enquanto `ctx.key` está vazia. Somado o piso de 24 letras e a paridade, sobra pouquíssimo; e sobre o que sobra, a SAÍDA rejeita 2.710 de 2.710 leituras de período errado. O número exigido pela R1 (79,8%) é atendido pelo portão de chave sozinho, antes de qualquer estatística.

**Autoverificação.** Sim, e o período errado se autoelimina. Medido sobre 271 criptogramas seriados (prosa pt-BR, chave ITAJAI, períodos 4/5/6/7, textos de 40 a 120 letras), varrendo os 11 períodos de cada um: o período CERTO passa o portão em 265 de 271 (97,8%); os 2.710 períodos ERRADOS passam em 0 (0,00%). O portão de saída é, portanto, também o que escolhe o período — não há palpite exposto ao …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/playfair-seriado.ts · .../playfair-seriado.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md (linha NOVA no Grupo 1 — "Seriated Playfair" não está catalogado; grep = 0 no repositório inteiro) · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.t …

**API.** id: "playfair-seriado" · name: "Playfair seriado (pares verticais)" · category: "classical" · inputs: { key: { label: "Palavra-chave do quadrado", placeholder: "ITAJAI" } } · SEM `aux` DE PROPÓSITO: o período é o segundo operando natural, mas 11 tentativas custam menos que um campo a preencher, e a medição mostra 0 falsos entre os períodos errados — pedir o período seria cobrar do usuário uma informação que a máquina descobre de graça. O período descoberto vai no `label` ("chave: ITAJAI · período 4"), que é onde a prova costuma querer a confirmação · decode devolve até 2 DecodeCandidate { label, output, chainValue } · encode(input, ctx): cifra com período 5 (o mais comum da ACA), rotulado.

**Vetor de teste.** REGRA: o claro é escrito em grupos de 2×período, linha de cima com os primeiros `período` caracteres e linha de baixo com os seguintes; cada par é (letra de cima, letra de baixo); aplica-se Playfair normal; o cifrado é lido linha de cima inteira, depois linha de baixo, grupo a grupo.
CHAVE ITAJAI ⇒ quadrado 5×5 (I/J unidos): ITABC / DEFGH / KLMNO / PQRSU / VWXYZ
CLARO   : OMORROAZULFICAEMBLUMENAU (24 letras, período 4 ⇒ 3 grupos de 8)
GRUPO 1 : cima OMOR / baixo ROAZ ⇒ pares (O,R)(M,O)(O,A)(R,Z)
  (O,R): O=(2,4) R=(3,2), retângulo ⇒ (2,2)=M e (3,4)=U ⇒ cima M, baixo U
  (M,O): mesma linha 2 ⇒ (2,3)=N e (2,0)=K ⇒ cima N, baixo K
  (O,A): retângulo ⇒ (2,2)=M e (0,4)=C ⇒ cima M, baixo C
  (R,Z) …

**Riscos.** 1) PAR VERTICAL DE LETRAS IGUAIS. Playfair não cifra letra com ela mesma; na seriada isso acontece na VERTICAL, e a convenção clássica é inserir um nulo no CLARO antes de seriar — o que muda o alinhamento inteiro. Ao decifrar isso é indiferente (a regra do retângulo é reversível), mas o `encode` tem de implementar a inserção, e o teste tem de trazer um claro com colisão vertical (BLUMENAU/... produz E sobre E no meu corpus). Se o `encode` ignorar …

**Conflito com decisão anterior.** Nenhum. "Seriated Playfair" não aparece em nenhum documento nem em nenhuma linha de código do repositório (grep = 0). O que existe é a linha de /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:38 e a triagem, que registram o Playfair como `ja-temos` com a ressalva de que "só as variantes seriada/dois-quadrados escapam" — este item fech …

**Decisão do dono.** Nenhuma. A única escolha de projeto — período por força bruta em vez de 2º campo — está medida (0 de 2.710 falsos) e não depende de gosto.

#### 12.11 · Morse fracionado (Fractionated Morse) com a chave dada

`decoder-no-leque` · **P — ~2h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: chave, transposição e 2º campo

**Por que esse destino.** É a cifra com a AUTOVERIFICAÇÃO MAIS FORTE de toda a fatia, e a documentação da casa a recusou por um argumento que uma medição derruba. Cada letra do cifrado vale um trigrama de {ponto, traço, separador}; concatenados, eles ou formam Morse válido ou não formam. Medido: aplicando um alfabeto chaveado ERRADO a 744 criptogramas Morse-fracionados reais, o resultado é Morse válido em ZERO casos (0,0%). Não é "cobertura baixa" — é o decodificador devolvendo `null`. Com o alfabeto certo: 179 de 185 pa …

**Portão.** ENTRADA:
const kw = (ctx.key ?? "").replace(/[^a-zA-Z]/g, "");
if (kw.length < 3) return [];                       // sem chave, cala (ver a ficha da recusa do solver)
const t = stripDiacritics(input).toUpperCase().replace(/[^A-Z]/g, "");
if (t.length < 8) return [];
SAÍDA (o portão é o item inteiro, e ele é binário):
const mx = [...t].map((c) => TRIGRAMAS[alfabetoChaveado(kw).indexOf(c)]).join("");
const texto = decodeMorseX(mx);      // engine/morse-x.ts:37 — já recusa xs>2, código fora da tabela e prefixo impossível
if (texto === null) return [];
E só depois o portão de vocabulário, para ORDENAR e não para admitir: cobertura >= 0,35 (o mesmo do Morbit, `morbit.ts` MIN_COBERTURA).

**Rejeição medida.** ENTRADA: 100% enquanto `ctx.key` está vazia. SAÍDA: 100,0% dos alfabetos errados (744 de 744) — o `decodeMorseX` devolve `null` e nenhum card nasce. É a maior rejeição medida de toda a fatia e passa o piso de 79,8% da R1 por dois caminhos independentes.

**Autoverificação.** Sim, e é a mais dura da fatia: Morse válido, verificado por `decodeMorseX` (`engine/morse-x.ts:37`), que já existe e já é usado pelo Pollux e pelo Morbit. Medido: alfabeto errado ⇒ 0 de 744 produzem Morse válido; alfabeto certo ⇒ 179 de 185 passam também o vocabulário. Como se autoverifica, entra sem teto de nota (R2) — está na mesma classe do Morbit, que a R2 já lista como aut …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/morse-fracionado.ts · .../morse-fracionado.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts (mapa ENTREGUES) · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md linha 64 · /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md linha 1 …

**API.** id: "morse-fracionado" · name: "Morse fracionado (trigramas)" · category: "classical" · inputs: { key: { label: "Palavra-chave do alfabeto", placeholder: "ITAJAI (ou o alfabeto inteiro, 26 letras)" } } · SEM `aux` — um operando só · decode devolve 0 ou 1 DecodeCandidate { label: `chave: ${KW}`, output, chainValue: output, notes: `${n} trigramas` } · encode(input, ctx): claro → Morse com 'x' (`encodeMorseX`) → completa com nulo até múltiplo de 3 SEM formar 'xxx' → trigramas → letras · `mapDecoder` basta: uma entrada, uma saída, `null` quando o Morse não fecha.

**Vetor de teste.** CHAVE ITAJAI ⇒ alfabeto chaveado de 26: ITAJBCDEFGHKLMNOPQRSUVWXYZ
TABELA: os 27 trigramas de {'.','-','x'}³ em ordem lexicográfica com '.' < '-' < 'x', menos 'xxx'; o i-ésimo trigrama vale a i-ésima letra do alfabeto chaveado.
CLARO   : APONTEDEFERRODEBLUMENAUX (24 letras — o X final é o nulo que faz o Morse fechar em múltiplo de 3 sem gerar 'xxx')
MORSE   : .-x.--.x---x-.x-x.x-..x.x..-.x.x.-.x.-.x---x-..x.x-...x.-..x..-x--x.x-.x.-x..-x-..-x   (84 símbolos = 28 trigramas)
CIFRADO : CBENKOVDRKDKJWPAEISATWUKCTVC (28 letras)
VOLTA   : CBENKOVDRKDKJWPAEISATWUKCTVC + ITAJAI ⇒ APONTEDEFERRODEBLUMENAUX
CONFERÊNCIA DE UM TRIGRAMA (o caso curto TEATRO, mesma chave, para caber na conta à mão): Morse …

**Riscos.** 1) O ENCHIMENTO É ONDE ISSO QUEBRA. O Morse tem de fechar em múltiplo de 3, e completar com 'x' pode gerar o trigrama 'xxx', que não existe na tabela. Medido: APONTEDEFERRODEBLUMENAU (sem o X) produz 81 símbolos terminados em '..-xxx' e o encode falha. A regra tem de ser "acrescenta letra nula ao CLARO até fechar", nunca "acrescenta x ao Morse". Ao DECIFRAR isso não importa (o alfabeto nunca produz 'xxx'), mas o teste de ida e volta pega. 2) O CI …

**Conflito com decisão anterior.** CONTRARIO /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:64 e /Users/peter/Repos/the-decrypter/docs/PLANO-2026-08.md:474, que descartam com a frase "parece primo do Morbit mas não se salva: saída alfabética normal e chave é um alfabeto K1/K2 COMPLETO, ou seja nem assinatura nem força bruta viável (26!)". CONTESTO A PRIMEIRA METADE e …

**Decisão do dono.** Nenhuma para o decoder. Uma para a linha 446 do `sources.ts`: ela é a vitrine que o usuário lê e já está desatualizada em quatro cifras — decidir se a correção entra neste commit ou vira item próprio.

#### 12.12 · Hexagramas do I Ching

`decoder-no-leque` · **M (~4 h): 64 linhas de tabela conferida + bruteDecoder de 4 convenções + os dois testes de integridade acima +…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Bloco Unicode BMP dedicado, U+4DC0–4DFF, exatos 64 caracteres, categoria So (conferido) — cola-se de qualquer PDF. Seis linhas cheias ou partidas são seis bits: a saída é texto ou número, e as duas encadeiam. Onda 12 e não 11 porque a leitura tem QUATRO convenções legítimas e a tabela de 64 linhas não é deduzível por aritmética.

**Portão.** Três portões alternativos, todos literais: (a) entrada sem espaços casa /^[䷀-䷿]+$/, ≥1 caractere; (b) entrada sem espaços casa /^[⚊⚋]+$/ (U+268A/U+268B), comprimento ≥6 e múltiplo de 6; (c) pares de trigramas em /^[☰-☷]+$/ com comprimento par. Fora dos três, decode() devolve [].

**Rejeição medida.** 100,00% — 0 acendimentos em 44.000 entradas para os três portões (nenhuma tem caractere em U+4DC0–4DFF, U+268A–268B ou U+2630–2637).

**Autoverificação.** Sim, e é verificável no próprio teste: a tabela King Wen de 64 linhas tem de conter os 64 padrões de 6 bits, todos distintos, cobrindo 0..63 sem buraco — CONFERI: 64 entradas, 64 distintas, cobertura completa. E a regra clássica dos pares: cada par consecutivo (1,2), (3,4) … (63,64) é a inversão de cabeça para baixo OU o complemento do anterior — CONFERI: 32 de 32 pares passam. …

**Arquivos.** criar /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/i-ching.ts e .../i-ching.test.ts. Auto-registro pelo glob de registry.ts:21 — nada mais a editar.

**API.** bruteDecoder({ id: "i-ching", name: "Hexagramas do I Ching", category: "encoding", keep: 2, variants(input) }) para o ramo de bits: as 4 variantes são {linha 1 embaixo | linha 1 em cima} × {cheia=1 | partida=1}, rotuladas 'de baixo para cima · cheia=1' etc., e o scorePlaintext elege as duas melhores — o mesmo desenho do railfence e do affine. Mais um mapDecoder irmão para o ramo do NÚMERO King Wen (1–64), que devolve a lista e, quando todos ≤26, também a leitura A1Z26, com forcedScore 0.6 (teto: 64 números viram letra só por coincidência de faixa).

**Vetor de teste.** Dois, ambos calculados e conferidos com round-trip. (A) bits: SOL → 01010011 01001111 01001100 → grupos de 6: 010100 110100 111101 001100 → King Wen 40, 54, 14, 62 → ䷧䷵䷍䷽ → volta SOL. (B) número: CIFRA → A1Z26 3 9 6 18 1 → ䷂䷈䷅䷑䷀ (U+4DC2 U+4DC8 U+4DC5 U+4DD1 U+4DC0) → volta 3 9 6 18 1 → CIFRA. Sem chave; a tabela usada é a sequência King Wen com as linhas escritas de baixo para cima.

**Riscos.** 1) ARMADILHA CENTRAL, e ela é do tipo que a casa chama de pior defeito possível: a ordem Unicode é a sequência King Wen, NÃO a ordem binária. Quem escrever `(codePoint - 0x4DC0).toString(2).padStart(6,"0")` produz seis bits errados para 62 dos 64 hexagramas e o card sai bonito e falso. O hexagrama 1 (䷀) é 111111 e o 2 (䷁) é 000000 — não 000000 e 000001. A tabela de 64 linhas não é opcional. 2) Quatro convenções: publicar uma só é decidir pela pro …

**Conflito com decisão anterior.** nenhum. I Ching e hexagramas não aparecem em INVENTARIO-CATALOGOS.md, em PLANO-CATALOGOS.md §3 nem em PENDENCIAS.md — conferi por grep. A triagem registra 15 posts + 25 comentários no r/codes e veredito LACUNA_QUENTE em duas fichas independentes.

**Correção exigida pela crítica.** **(c) Vetores — é o card mais bem medido do lote.** Montei a tabela King Wen: **64 entradas, 64 distintas, cobre 0..63 sem buraco**; a regra dos pares passa **32 de 32**. `SOL → 010100110100111101001100 → 010100|110100|111101|001100 → KW 40, 54, 14, 62 → ䷧䷵䷍䷽ → SOL`. `CIFRA → 3 9 6 18 1 → ䷂䷈䷅䷑䷀` = U+4DC2 U+4DC8 U+4DC5 U+4DD1 U+4DC0. Bloco = 64 caracteres, todos `\p{So}`.

#### 12.13 · Cifra de Hill 2×2 e 3×3

`decoder-no-leque` · **M — ~3h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: chave, transposição e 2º campo

**Por que esse destino.** Decoder porque a saída encadeia e porque a operação, com a matriz dada, é determinística e instantânea. O argumento escrito contra ela é factualmente errado sobre o repositório de hoje: `PLANO-2026-08.md:472` e `INVENTARIO-CATALOGOS.md:61` dizem que "a chave é uma matriz invertível mod 26, que não cabe num campo de texto" — mas `3 3 2 5` são quatro números, e o mesmo campo já lê `1 5 2 4 4 3` para o `letter-index` (`decoders/letter-index.ts:102-104`, placeholder documentado) e `+11 -4 +7 -6 -2` …

**Portão.** ENTRADA:
const nums = (ctx.key ?? "").split(/[^0-9-]+/).filter(Boolean).map(Number);
if (nums.length !== 4 && nums.length !== 9) return [];        // só 2×2 e 3×3
if (nums.some((n) => !Number.isInteger(n))) return [];
const t = stripDiacritics(input).toUpperCase().replace(/[^A-Z]/g, "");
if (t.length < 12) return [];
if (!wordsProntas()) return [];
SAÍDA: duas leituras — a matriz como MATRIZ DE CIFRAR (aplica a inversa) e como MATRIZ DE DECIFRAR (aplica ela mesma), porque a prova entrega ora uma ora outra e adivinhar seria errado. Cada uma passa por `cobertura >= 0,45` E `maiorPedaco >= 6`; ordena por cobertura, corta em 1 card.
EXCEÇÃO DELIBERADA: quando gcd(det, 26) ≠ 1, emite UM card `forcedScore: 0.30` (abaixo do corte de `run.ts:73`, ou seja na gaveta, nunca no topo) cujo `output` é a …

**Rejeição medida.** ENTRADA: 100% enquanto `ctx.key` está vazia; e mesmo preenchida, o portão "exatamente 4 ou 9 inteiros" rejeita toda chave textual — uma chave de Vigenère, de Playfair ou de colunar produz `nums.length === 0`. Sobre as chaves NUMÉRICAS já em circulação na bancada, colide de propósito só com quem tiver 4 ou 9 números, e aí o portão de saída decide. SAÍDA: 0 falsos em 1.593.

**Autoverificação.** Sim, pelo vocabulário — a matriz certa é a única que produz português. Medido em 1.593 tentativas (prosa pt-BR de 120 letras, matriz 2×2 sorteada entre as invertíveis mod 26): ZERO passam cobertura ≥ 0,45 e maiorPedaco ≥ 6; cobertura média 0,073, p95 0,194, maior pedaço máximo 6. NÃO se autoverifica na ENTRADA (o cifrado é texto alfabético comum), e por isso o piso de 12 letras …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/hill.ts · .../hill.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md linha 61 · /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md linha 176 · /Users/peter/Repos/the-decrypter/doc …

**API.** id: "hill" · name: "Cifra de Hill (matriz)" · category: "classical" · inputs: { key: { label: "Matriz da chave", placeholder: "3 3 2 5 (2×2) · 6 24 1 13 16 10 20 17 15 (3×3)" } } · SEM `aux`: a matriz cabe no campo de chave, e é isso que derruba o argumento do documento · decode devolve 0 ou 1 DecodeCandidate { label: "matriz 2×2 · lida como matriz de cifrar" | "…de decifrar", output, chainValue, notes: `det = ${d}, inverso de ${d} mod 26 = ${di}` } — as notas são a conta que a equipe não consegue fazer no papel · ou, no caso singular, { label: "matriz sem inversa", output: explicação, forcedScore: 0.30 } · encode(input, ctx): multiplica pela matriz dada · `defineDecoder`, porque há duas lei …

**Vetor de teste.** 2×2 · MATRIZ M = [[3,3],[2,5]] · det = (3·5 − 3·2) mod 26 = 9 · gcd(9,26) = 1 · inverso de 9 mod 26 = 3 (9·3 = 27 = 1) · M⁻¹ = 3 · [[5,−3],[−2,3]] = [[15,17],[20,9]]
CLARO   : APONTEDEFERRODEBLUMENAU (23 letras; enche para 24 com X)
CIFRADO : TXDPRGVABEYPZRPNPSWSNAZZ
Conferência do primeiro bloco à mão: A=0, P=15 ⇒ [3·0+3·15, 2·0+5·15] = [45, 75] ⇒ mod 26 = [19, 23] ⇒ T, X. Bate.
VOLTA   : TXDPRGVABEYPZRPNPSWSNAZZ com [[15,17],[20,9]] ⇒ APONTEDEFERRODEBLUMENAUX (cobertura 22/24 = 0,92, maiorPedaco 8, score 0,825)
3×3 · MATRIZ M3 = [[6,24,1],[13,16,10],[20,17,15]] · det mod 26 = 25 · inverso de 25 mod 26 = 25 · M3⁻¹ = [[8,5,10],[21,8,21],[21,12,8]]
CIFRADO : KQXSTTPXVHAAEKBEZNZMJJEJ · VOLTA: …

**Riscos.** 1) COLISÃO DE CHAVE NUMÉRICA. Quatro números no campo de chave também acendem o `letter-index` (que lê índices) e outros consumidores de `ctx.key`. Não é bug — são leituras diferentes da mesma chave, e o portão de saída de cada um decide — mas o teste de caracterização em `integridade.test.ts` tem de registrar a mudança, senão ela aparece em produção. 2) ENCHIMENTO: o último bloco ganha X, e a resposta sai com X que a prova não tem. O card tem de …

**Conflito com decisão anterior.** CONTRARIO /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:61 ("reprova duas vezes: sem assinatura na saída, e a chave é uma matriz invertível mod 26, que não cabe num campo de texto de mesa de rua"), /Users/peter/Repos/the-decrypter/docs/PLANO-2026-08.md:472 e /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md:176. CONTESTO os d …

**Decisão do dono.** Uma, e é de produto: o card de "matriz sem inversa mod 26" é conteúdo pedagógico, não resposta. Vale a pena ocupar um card com ele (na gaveta, forcedScore 0,30) ou ele deveria ser um chip `warn` do `sniff.ts`? Meu voto é card, porque só existe com a chave preenchida e o sniffer não vê a chave — mas é escolha de vitrine, e a vitrine é do dono.

**Correção exigida pela crítica.** **7. Swagman — NÃO CONSTRUIR AINDA (cai para PENDENCIAS se o dono não responder nesta passada).** Único da fatia sem **nenhuma** justificativa do lado de quem LÊ: 1 post, 0 comentários em 114 mil, zero no acervo, zero no repo. O R1 dele é satisfeito pelo `\n`, não por assinatura. Se entrar, entra com a mesma correção de `forcedScore` do item 2. Se o dono disser "não vou usar", vira linha com o gatilho já escrito — e isso é fechamento, não perda.

#### 12.14 · Cifra de livro / chave corrida — o 2º campo como texto-fonte

`decoder-no-leque` · **M — ~5h** · crítica: **sem parecer da crítica** · fatia: chave, transposição e 2º campo

**Por que esse destino.** É O ITEM QUE DÁ FUNÇÃO AO 2º CAMPO, e é o único da fatia com âncora em prova REAL do acervo. Duas mecânicas, um decoder, o mesmo operando: (a) CHAVE CORRIDA — as letras do texto-fonte servem de fluxo de chave de Vigenère; (b) CIFRA DE LIVRO / OTTENDORF — os números da ENTRADA indexam o texto-fonte por linha·palavra·letra. O documento diz que já temos isso (`INVENTARIO-CATALOGOS.md:75`, `ja-temos`, razão: "letter-index mais o 2º campo (ctx.aux) mais a aba Posições") e isso é falso em três pontos …

**Portão.** ENTRADA (o primeiro `inputs.aux.required` do repositório — o filtro de `use-decoder.ts:357` existe desde a Onda 2 e nunca foi exercitado):
if (!ctx.aux?.trim()) return [];
const fonte = ctx.aux;
MODO (a) CHAVE CORRIDA:
  const letrasFonte = (fonte.match(/\p{L}/gu) ?? []).length;
  const t = stripDiacritics(input).toUpperCase().replace(/[^A-Z]/g, "");
  if (t.length < 20) return [];
  if (letrasFonte < t.length) return [];   // fonte mais curta que a mensagem NÃO é chave corrida — é Vigenère, e o `vigenere` já faz
  saída: cobertura >= 0,45 E maiorPedaco >= 6
MODO (b) CIFRA DE LIVRO:
  const trincas = input.trim().split(/\s+/);
  if (trincas.length < 3) return [];
  if (!trincas.every((t) => /^\d+[.\-\/]\d+([.\-\/]\d+)?$/.test(t))) return [];   // TUDO ou nada, como o parseIndexSpecs já faz …

**Rejeição medida.** ENTRADA: 100% enquanto o 2º campo está vazio — hoje isso é 100% do tráfego, porque nenhum decoder o exige. No modo (a), a exigência de a fonte ter MAIS letras que a mensagem rejeita ainda o caso em que a fonte é curta, que é Vigenère e já tem dono. No modo (b), o portão "toda entrada é uma dupla ou trinca de números" é literal e não deixa passar texto. SAÍDA, modo (a): 0 falsos …

**Autoverificação.** MODO (a): sim, vocabulário, e o vão é limpo. Medido em 1.878 pares de prosa pt-BR (texto claro "decifrado" com a fonte ERRADA): ZERO passam cobertura ≥ 0,45 e maiorPedaco ≥ 6; cobertura média 0,078, p95 0,203, maior pedaço máximo 7. Com a fonte CERTA: 461 de 475 (97,1%). MODO (b): sim, mas de outra natureza — um índice pedido que cai fora da fonte é leitura errada, não resposta …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/cifra-de-livro.ts · .../cifra-de-livro.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/positions/zip.ts (linhas 138-183: novo `TRINCA` ao lado de `PAIR`/`DOTTED`, campo `nivel3?` em `IndexSpec`, e `parseIndexSpecs` deixando passar a trinca) · /Users/peter/Repos/the-decrypter/src/features/positions/zip.test.ts · /Users/peter/Repos/the-decrypter/src/features/ …

**API.** id: "cifra-de-livro" · name: "Cifra de livro / chave corrida" · category: "classical" · inputs: { aux: { label: "Texto-fonte (o livro, o discurso, a estrofe)", placeholder: "Cole aqui o texto que a prova mandou usar — o parágrafo, a letra da música, o discurso", required: true } } · O RÓTULO É A AFFORDANCE (é o que `types.ts:26` diz do InputSpec, e é o que hoje não acontece: sem cifra selecionada, `decoder-workbench.tsx:136` mostra o genérico "2º campo — fonte a indexar, texto original, lista") · decode devolve até 2 DecodeCandidate: { label: "chave corrida", output, chainValue } e/ou { label: "cifra de livro · linha·palavra·letra", output, notes: a trilha `linha 8 · palavra 4 · letra 3 = T` …

**Vetor de teste.** MODO (a) CHAVE CORRIDA
TEXTO-FONTE (2º campo): "Quem peleia não está morto e quem morre" ⇒ 32 letras QUEMPELEIANAOESTAMORTOEQUEMMORRE (o título da prova A3L6 do acervo da GIA)
CLARO   : APONTEDEFERRODEBLUMENAU (23 letras — a fonte é maior, portanto passa o portão)
CIFRADO : QJSZIIOINEERCHWULGAVGOY
Conferência das sete primeiras: A(0)+Q(16)=16 ⇒ Q · P(15)+U(20)=35−26=9 ⇒ J · O(14)+E(4)=18 ⇒ S · N(13)+M(12)=25 ⇒ Z · T(19)+P(15)=34−26=8 ⇒ I · E(4)+E(4)=8 ⇒ I · D(3)+L(11)=14 ⇒ O. Bate com QJSZIIO.
VOLTA   : QJSZIIOINEERCHWULGAVGOY + a mesma fonte ⇒ APONTEDEFERRODEBLUMENAU (cobertura 22/23 = 0,96, maiorPedaco 8, score 0,840)
CONTRAPROVA (a que mede o portão): a mesma cifra com a fonte ERRADA dá c …

**Riscos.** 1) HOMONÍMIA, e ela já enganou a triagem. "Running key" da ACA é OUTRA cifra: o claro é partido ao meio e a metade de cima cifra a de baixo, sem fonte externa. Essa variante NÃO entra (atacá-la é deslizar palavras prováveis nas duas metades ao mesmo tempo — grind estatístico, R3), e a recusa tem de estar escrita no cabeçalho, senão o nome atrai a implementação errada. 2) O MODO (b) MEXE EM `zip.ts`, QUE TEM TESTE E TEM DONO. Um terceiro nível mud …

**Conflito com decisão anterior.** CONTRARIO /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:75, que classifica "Book cipher / chave corrida (running key) / letra por índice" como `ja-temos` porque "letter-index mais o 2º campo (ctx.aux) mais a aba Posições... resolve por exploração e não por cifra fechada — que é o desenho certo". CONTESTO com três fatos de código e u …

**Decisão do dono.** Duas. (1) ESCOPO: o modo (a) sozinho é P (~1,5h) e fecha os 63 posts + 105 comentários do r/codes (posição 21 do ranking, `lacuna: true`); o modo (b) é o que fecha a prova real do acervo e custa o resto. Se a fatia apertar, (a) entra e (b) vira item próprio. (2) O rótulo do 2º campo quando NENHUMA cifra está selecionada: hoje é "2º campo — fonte a indexar, texto original, lista" (`decoder-workbenc …

#### 12.15 · Homofônica com a tabela dada (`homofonica-tabela`)

`decoder-no-leque` · **M — 4,5 h** · crítica: **MANTÉM** · fatia: homofônica e vizinhas

**Por que esse destino.** **Assinatura:** literal e total — sem `ctx.key` o decoder cala, exatamente como o `vigenere`, o `beaufort`, o `bifid` e o `alfabeto-chave` (o bloco "POR QUE NÃO ENTRA SEM CHAVE" de `decoders/alfabeto-chave.ts`). Enquanto o campo está vazio ele não pode fazer ruído nenhum, e é por isso que ele PODE ficar no leque, diferente do item anterior. **Autoverificação:** cobertura ≥ 0,45, o mesmo `MIN_COBERTURA` do `alfabeto-chave`. **Custo:** aplicar um mapa é O(n) — nada de busca, nada de R3. **Regra de …

**Portão.** ```ts
const tabela = lerTabelaHomofonica(ctx.key ?? "");
if (!tabela) return [];                              // campo vazio ou não parseia → nem entra na corrida
if (tabela.maxHomofonos < 2) return [];              // 1:1 é o `alfabeto-chave`, não este
const toks = tokenizarSimbolos(input);
if (!toks || toks.length < 8) return [];
const conhecidos = toks.filter((t) => tabela.mapa.has(t)).length;
if (conhecidos / toks.length < 0.9) return [];       // tabela não é desta cifra
if (!wordsProntas()) return [];                      // aplicar mapa nunca falha; quem separa é o vocabulário
```

O parser aceita as duas formas que uma prova escreve, e o teste é literal:
```
forma A (por letra):    a=01,14,27  b=02  c=03,16  …
forma B (por linha):    01-26: abcdefghijklmnopqrstuvwxyz …

**Rejeição medida.** **100% do fan-out enquanto `ctx.key` estiver vazio** — o portão é a primeira linha do `decode` e é literal. É a mesma rejeição, medida do mesmo jeito, que `decoders/alfabeto-chave.ts`, `ciphers.ts` (vigenère), `beaufort.ts` e `bifid.ts` já têm hoje; nenhum deles precisou de medição estatística porque a assinatura não é estatística. Com a chave preenchida, o portão residual é o …

**Autoverificação.** SIM — cobertura de palavra real ≥ 0,45 sobre a saída, o mesmo corte e a mesma função de `decoders/alfabeto-chave.ts`. Aplicar um mapa sempre produz texto, certo ou errado; sem o corte, qualquer par entrada×tabela vira card. Sem teto de nota: `chainValue` + score natural do `scorePlaintext`, como o `alfabeto-chave` faz. Ele se autoverifica de forma MAIS forte que o solver, porqu …

**Arquivos.** CRIAR:
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/homofonica-tabela.ts`
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/homofonica-tabela.test.ts`

EDITAR:
- `/Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:62` (a mesma linha do item anterior)
- `/Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:33` (mapa `ENTREGUES`)

NADA a editar no registry: `engine/ …

**API.** ```ts
id: "homofonica-tabela"
name: "Homofônica com tabela dada"
category: "classical"
inputs: { key: { label: "Tabela homofônica", placeholder: "a=01,14,27 b=02 …  ou  01-26: abc…z" } }
// NOTA DE IMPLEMENTAÇÃO: NÃO marcar `key.required`. O filtro do hook
// (`use-decoder.ts:357`) só olha `inputs.aux.required` — `key.required` não é lido
// por ninguém hoje, e marcá-lo daria a falsa impressão de que o portão é do hook.
// O portão é do decoder, como no `alfabeto-chave`.

export interface TabelaHomofonica {
  mapa: Map<string, string>;   // símbolo → letra (ou palavra, ver o item Nomenclator)
  maxHomofonos: number;        // maior nº de símbolos apontando para a mesma letra
  letras: number …

**Vetor de teste.** O mesmo VETOR A do item anterior, e este decoder é quem o executa nos dois sentidos.

Chave (forma A), 39 símbolos:
`a=01,14,27 b=02 c=03,16 d=04 e=05,18,31,44 f=06 g=07 h=08 i=09,22 j=10 l=11 m=12,25 n=13,26 o=15,28,41 p=17 q=19 r=20,33 s=21,34,47 t=23,36 u=24,37 v=29 x=30 z=32`

`encode("ovelhotempedra")` → `15 29 05 11 08 28 23 18 12 17 31 04 20 01`
(rodízio: o k-ésimo uso da letra pega o homófono `k mod n` — o→15/28, e→05/18/31, t→23, r→20, a→01, os de homófono único saem sempre iguais)

`decode("15 29 05 11 08 28 23 18 12 17 31 04 20 01")` com a mesma chave → `ovelhotempedra`
Rodei a ida e a volta: **batem exatamente**. 14 símbolos usados dos 39 da tabela; `maxHomofonos = 4` (a letra `e …

**Riscos.** 1. **O custo de digitação é o risco real, e ele tem número.** A forma A com N=40 são 40 pares = ~160 caracteres num campo de uma linha. Sob pressão, às 23h, com o celular. A forma B (`01-26: abcdefghijklmnopqrstuvwxyz` por bloco) resolve o caso mais comum em 2 a 4 linhas de 26 letras e é a forma que a triagem descreve como a real das provas. **Se só a forma A for implementada, o item não vale a pena** — o gargalo passa a ser o teclado.
2. **Erro …

**Conflito com decisão anterior.** Mesma linha `docs/INVENTARIO-CATALOGOS.md:62`, e aqui eu contrario **só a segunda metade dela**: "E ainda exige a tabela homofônica inteira digitada". Isso não é argumento de recusa nesta casa — é a descrição do `decoders/alfabeto-chave.ts`, que pede um alfabeto de 26 letras no campo Chave e ENTROU. A linha do inventário usa como veto o que a casa …

**Decisão do dono.** Só uma, e pequena: **a forma B do parser entra?** Ela é o que torna o item usável (risco 1) mas acrescenta um formato de entrada que ninguém mais no repositório usa. Se a resposta for não, meu conselho é não fazer o item — a forma A sozinha é mais lenta que copiar a tabela no papel.

**Correção exigida pela crítica.** **(a)** Não existe. **(c)** É o mesmo VETOR A, que refiz e bate nos dois sentidos; o caso negativo (`maxHomofonos = 1` → `[]`, território do `alfabeto-chave`) está correto.

#### 12.16 · Nihilist (transposição)

`decoder-so-cifra-unica` · **P (~1,5h) — ~60 linhas, duas convenções, testes** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** Ela é anagrama puro: a entrada é letra, o IC é de português e a assinatura de ENTRADA é só "comprimento quadrado perfeito", que não segura nada. Quem segura é a SAÍDA, e é a mesma disciplina de `transposicao.ts`. Mas há duas diferenças que a mandam para o modo "uma cifra só" em vez do leque: (a) o `transposicao` já ocupa o espaço da transposição SEM chave e esta exige chave; (b) a literatura tem duas convenções conflitantes (permutar linhas e depois colunas, ou ler a grade por colunas na ordem d …

**Portão.** `ctx.only === "nihilist-transposicao"` (o portão inteiro, como `morbit.ts:53`). Dentro dele: letras ≥ 16, `letras.length === n*n` onde `n = ctx.key` sem não-letra, `n` entre 4 e 10, e `wordsProntas()` verdadeiro. Fora do modo "uma cifra só" o decoder não existe.

**Rejeição medida.** 100% do leque, por construção (`ctx.only`). Dentro do modo, sobre as 2 convenções × chave dada, o portão de vocabulário é o de `transposicao`, com 0,2% de falso medido lá. O que justifica o `ctx.only` e não o leque: só o comprimento quadrado perfeito rejeita 96,9% do texto (16, 25, 36, 49, 64, 81, 100 letras entre 16 e 100) — abaixo do que a R1 exigiria de um decoder que ainda …

**Autoverificação.** Total, e do tipo mais forte que a casa tem: toda variante é anagrama da entrada, só a certa forma português. Portão de saída herdado de `transposicao.ts:79-87` — `maiorPedaco ≥ 6`, `covered/analisado ≥ 0,60`, ganho ≥ 0,20 sobre a cobertura da própria entrada. Naquela calibração, medida sobre 54 leituras certas e 540 erradas, esses três números dão 54/54 de acerto e 1/540 de fal …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/nihilist-transposicao.ts · .../nihilist-transposicao.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md (a linha 50 cobre a família; acrescentar a nota de que a transposição entrou só em `ctx.only`) · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31.

**API.** `defineDecoder({ id: "nihilist-transposicao", name: "Nihilist (transposição)", category: "classical", inputs: { key: { label: "Chave (a mesma nos dois eixos)", placeholder: "ITAJA" } } })`. `decode()` devolve até 2 candidatos, um por convenção, com `label: "linhas depois colunas"` / `"colunas depois linhas"`, `forcedScore` pela fórmula de `transposicao.ts:200` e `chainValue` = a leitura. `encode()` implementa a convenção nº 1.

**Vetor de teste.** Chave `ITAJA` (5 letras → grade 5×5; ordem das linhas/colunas = ranking alfabético com desempate por posição: A(3)→1, A(5)→2, I→3, J→4, T→5). Claro `APONTEDEFERRODEBLUMENAUXX` (25 letras, as duas últimas de enchimento). Cifrado: `OERDRUXNXAOTANPUEBMLEEEFD`. Voltando com a mesma chave: `APONTEDEFERRODEBLUMENAUXX`. Conferido nos dois sentidos.

**Riscos.** 1) **Risco de gabarito**: as duas convenções são incompatíveis, e uma prova autorada com uma e resolvida com a outra vira reclamação. Se virar prova, a convenção escolhida tem de estar escrita na Cola, não só no código. 2) Comprimento quadrado perfeito obriga enchimento visível (`XX`), que entrega a cifra a olho — é feature para prova, defeito para sigilo. 3) O `railfence` continua emitindo lixo a 0,59 nessa entrada mesmo depois deste item; conse …

**Conflito com decisão anterior.** nenhum diretamente — docs/INVENTARIO-CATALOGOS.md:50 fala da família Nihilist sem separar as duas; a triagem do r/codes a marca LACUNA_MORNA, fit 3 (1 post, 0 comentários), e eu concordo com a temperatura: é o item mais fraco da minha fatia em demanda.

**Decisão do dono.** Qual das duas convenções vira o gabarito, SE ela virar prova. Enquanto for só ferramenta, as duas convivem rotuladas e não há decisão pendente.

**Correção exigida pela crítica.** ** `rank(ITAJA) = [2,4,0,3,1]` é uma **involução** (é o próprio inverso). Por isso "push" e "pull" produzem a MESMA saída neste vetor — conferi as duas. Um teste construído sobre `ITAJA` **não pega uma permutação invertida**, que é justamente o erro que uma transposição chaveada comete. Trocar por uma chave cujo ranking não seja involutivo (ex.: `ITAJU` ou qualquer chave de 5 com ranking assimétrico) e prender as duas direções. Correção menor: "s …

#### 12.17 · Monome-dinome

`decoder-so-cifra-unica` · **P (~1h) — é delta sobre o item 7** · crítica: **MANTÉM** · fatia: família do quadrado de Políbio

**Por que esse destino.** Medi a estrutura e ela é a MESMA máquina do straddling checkerboard: 8 letras de um dígito, 2 dígitos de escape abrindo duas linhas de dez. O que a formalização ACA muda é só a origem do arranjo — a ordem dos dígitos vem de uma palavra-chave em vez de ser digitada. Então isto não é um decoder novo: é uma segunda leitura do campo chave dentro do arquivo do item 7, e é por isso que custa P e não M. Vale a pena porque a palavra-chave dá papel real à casca temática da prova (a triagem chama isso de …

**Portão.** `ctx.only === "monome-dinome"` (portão inteiro, idêntico ao item 7). Dentro: `/^[0-9\s]+$/`, ≥ 10 dígitos, `ctx.key` com 10 letras (a palavra que gera a ordem) e `wordsProntas()`. Se a chave tiver a forma `AE.ORIS.DT` (10 caracteres com 2 pontos), o decoder cede a vez ao `checkerboard` e devolve `[]` — para os dois não emitirem o mesmo card.

**Rejeição medida.** 100% do leque por `ctx.only`. Não muda nada do item 7: os 88,88% do melhor portão de entrada concebível e os 11,12% que passam (incluindo A1Z26) são os mesmos.

**Autoverificação.** Idêntica à do item 7 e pelo mesmo motivo: nenhuma estrutural, tudo no vocabulário (`cobertura ≥ 0,45` e `maiorPedaco ≥ 5`, com 1 falso em 2.000 chaves erradas medido no item 7 — a máquina é a mesma, a medição vale). Entra com o mesmo **teto de nota** (`forcedScore` ≤ 0,70).

**Arquivos.** MESMO arquivo do item 7: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/checkerboard.ts (exporta os dois decoders num array) · .../checkerboard.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:64 · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31.

**API.** `defineDecoder({ id: "monome-dinome", name: "Monome-dinome", category: "classical", inputs: { key: { label: "Palavra de 10 letras (dá a ordem dos dígitos)", placeholder: "RMASTERTON" } } })`. Reusa 100% das funções internas do `checkerboard`; o que ele acrescenta é `ordemPorChave(palavra: string): string`, que devolve os 10 dígitos. `decode()` devolve 0 ou 1 candidato `{ label: "ordem 6318927054 · escapes 5 e 4", output, forcedScore, chainValue }`. `encode()` presente.

**Vetor de teste.** Chave `RMASTERTON`. Ranking alfabético com desempate por posição, 1-based e o 10º virando 0: A→1, E→2, M→3, N→4, O→5, R→6, R→7, S→8, T→9, T→0, ou seja **`6318927054`** — que bate com o número citado na triagem do r/codes, conferido por conta minha. Os 8 primeiros dígitos dessa ordem recebem as 8 letras de 1 dígito do pt-BR (A E O R I S D T, do `PERFIL_PT`): A=6, E=3, O=1, R=8, I=9, S=2, D=7, T=0. Os dois últimos, 5 e 4, são os escapes: 50=B, 51=C, 52=F, 53=G, 54=H, 55=J, 56=K, 57=L, 58=M, 59=N, 40=P, 41=Q, 42=U, 43=V, 44=W, 45=X, 46=Y, 47=Z. Claro `APONTEDEFERRO` → 6, 40, 1, 59, 0, 3, 7, 3, 52, 3, 8, 8, 1 → cifrado **`6401590373523881`**. Lendo de volta: `APONTEDEFERRO`. Conferido nos dois s …

**Riscos.** 1) **A literatura diverge**: a ACA descreve um retângulo 3×8 (24 casas) e a implementação acima usa 8 + 2×10 = 28 casas, que é o straddling generalizado. As duas se chamam "monome-dinome" por aí. Se virar prova, a convenção precisa estar na Cola e no enunciado — é a mesma armadilha de gabarito do item 3. 2) Dois decoders sobre a mesma máquina podem emitir o mesmo card se a pessoa preencher a chave de um jeito ambíguo; a cessão de vez descrita no …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:64 (`descartar`, na mesma linha do straddling). Mesmo argumento do item 7, e com um agravante a favor: descartar os dois separadamente é descartar duas vezes a mesma máquina.

**Correção exigida pela crítica.** - **Vetor: EXATO nas duas metades.** `RMASTERTON` → ordem **`6318927054`** (conferido pelo ranking alfabético com desempate por posição, 10º virando 0), e `APONTEDEFERRO` → **`6401590373523881`**, com round-trip conferido. - A cessão de vez ao `checkerboard` quando a chave tem a forma `AE.ORIS.DT` é obrigatória e a ficha diz que é obrigatória. Certo. - A ficha é honesta sobre a demanda (0 posts / 11 comentários) e sobre a divergência ACA (3×8 vs …

#### 12.18 · PLU de frutas e legumes (IFPS)

`decoder-so-cifra-unica` · **M — a tabela curada é o custo (~180 linhas com nome pt-BR conferido, ~2 h) + decoder ~60 + teste ~60 + seção n…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** É a única ficha da fatia que REPROVA como decoder de leque, e a medição é de dentro de casa: dos 2.000 valores de 4 dígitos da faixa PLU (3000–4999), **1.189 (59,5%) são código de rua REAL de Blumenau**, que o `street-code` já responde com forcedScore **0,97** (`lookups.ts:76`). Confirmei na sonda com o motor de verdade: `3722` devolve hoje "R ABACATE — bairro Do Salto" a 0,97. Um card de PLU sobre número nu duplicaria a leitura de mais da metade da faixa. O precedente da casa é literal e é o me …

**Portão.** No leque: `/^PLU\s*#?\s*(\d{4,5})$/i` **E** o código existe na tabela curada. No modo solo (`ctx.only === "plu"`): `/^\d{4,5}$/` **E** existe na tabela. Fora disso, `[]`. O código-fonte do portão é o mesmo desenho de `numero-extenso.ts:441` (`const solo = ctx.only === ID`).

**Rejeição medida.** Portão NU (o que NÃO recomendo): sobre os 1.033 tokens só-dígito do corpus real, dispara em 33 = **96,81% de rejeição** — passa no piso R1 de 79,8% e mesmo assim é ruim, porque condicionado aos tokens de 4 dígitos (128 no acervo) ele dispara em **25,8%**. É o caso em que a R1 aprova e a medição de dentro de casa reprova. Portão LITERAL (o proposto): **100,00%** no corpus real, …

**Autoverificação.** Por tabela, e ela é parcial — o card tem de dizer isso, não fingir cobertura total. Não existe dígito verificador em PLU. A tabela curada (~180 itens comuns no varejo brasileiro, com nome pt-BR) responde "4011 = banana"; código fora dela sai como "faixa PLU válida, item não consta da tabela curada" — nunca um nome inventado. Nota: 0,80 com item na tabela; sem tabela não emite. …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/plu.ts`, `plu.test.ts`, `src/features/reference/plu.ts` (tabela + a regra dos prefixos), `src/features/reference/plu.test.ts`. EDITAR: `src/features/reference/components/reference-panel.tsx` (nova `<Section title="PLU — etiqueta de fruta">`, no molde da seção "Cores" em `:131`), `src/features/help/help-content.ts`, `docs/PENDENCIAS.md`.

**API.** `mapDecoder`. id: `"plu"` · name: `"PLU (etiqueta de fruta/legume)"` · category: `"lookup"` · inputs: nenhum (o portão é o literal, não um 2º campo) · encode: SIM — `encode("banana")` → `"4011"`, útil no modo solo e barato. Retorno: `{ output:"4011 — banana (convencional)", label:"PLU 4011", notes:"prefixo 9 = orgânico · 3xxx e 4xxx = convencional", forcedScore: 0.8, chainValue:"4011", render:"code-list", data: CodeHit[] }`.

**Vetor de teste.** POSITIVO: `PLU 4011` → 4 dígitos na faixa convencional → "banana". `PLU 94011` → prefixo 9 + 4011 → "banana orgânica" (5 dígitos = 9 + o código de 4). NEGATIVO POR PROJETO: `4011` sozinho no leque → `[]`; o mesmo `4011` com `ctx.only === "plu"` → o card sai. NEGATIVO MEDIDO NA SONDA: `3722` no leque → hoje `street-code` 0,97 "R ABACATE — bairro Do Salto"; com o portão literal o PLU não aparece ali, que é exatamente o objetivo. ARMADILHA A DOCUMENTAR NO CARD: o prefixo 8 **não** significa transgênico — a IFPS retirou essa reserva em 2015 e liberou a faixa para produto convencional; a crença contrária é a lenda de internet mais difundida sobre PLU, e quem cair nela erra a prova com convicção.

**Riscos.** (1) A lista completa da IFPS (~1.500 códigos) não tem licença clara de redistribuição — por isso a tabela é CURADA e escrita por nós, com nome pt-BR próprio; copiar a base inteira é risco jurídico sem ganho. (2) A capacidade fica fora do fan-out por padrão: quem não souber que existe não a encontra. Mitigação: a legenda na Cola é o que torna a ferramenta descobrível, e ela vem no mesmo commit — sem a legenda este item não vale a pena. (3) Se o do …

**Conflito com decisão anterior.** Contraria a leitura otimista da triagem, que classificou PLU como LACUNA_QUENTE com prova_fit 4 e sugeriu decoder direto. Estou rebaixando o DESTINO (não o mérito) com o número: 59,5% da faixa de 4 dígitos já é código de rua a 0,97. A capacidade entra; o que não entra é ela no fan-out por tecla.

**Decisão do dono.** Aceitar que a capacidade nasce fora do leque automático (só literal + modo solo + legenda). Se o dono quiser o número nu, é decisão dele e vira linha de documento, como a cauda de geohash virou em `formats.ts:560`.

**Correção exigida pela crítica.** - **O literal proposto é ele próprio uma placa.** Medido: `PLU 4011` → **`placa-veiculo` 0,70 "PLU4A11"**; `PLU4011` → idem. `OLD_ONE = /^([A-Za-z]{3})[\s.·•-]?(\d{4})$/` (`placa-veiculo.ts:37`) come **qualquer** três letras + quatro dígitos, com ou sem hífen. `#4011` → **0 cards**. Use `#4011` e `PLU:4011` (dois-pontos não está na classe de separadores da placa) e abandone `PLU 4011`. - A ficha diz "sem a legenda este item não vale a pena" — con …

#### 12.19 · ADFGX / ADFGVX

`decoder-so-cifra-unica` · **M (~3h) — grade 6×6 (quadrado36 do item 1), fracionamento (~20 linhas), leitura colunar reaproveitada, encode,…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** Contrario a decisão do inventário, e o argumento é o mecanismo, não o gosto. A decisão de "só o chip" foi tomada contra DECIFRAR SEM AS CHAVES — e ninguém está propondo isso. O que proponho é o caso que a mesma casa já aceitou nove vezes (`vigenere`, `beaufort`, `bifid`, `playfair`, `columnar`, `alfabeto-chave`…): a prova ENTREGA a chave e o trabalho é aplicar. Como autores de prova, as duas chaves são nossas. O portão é o `ctx.only`, e ele resolve o problema que o chip sozinho não resolve: medi …

**Portão.** O chip continua exatamente como está (`sniff.ts:187`): `/^[ADFGVX]+$/` sobre a entrada sem espaço, comprimento par e ≥ 8. O decoder acrescenta `ctx.only === "adfgvx"` como portão inteiro, mais `ctx.key` (palavra da grade 6×6) e `ctx.aux` obrigatória (palavra da colunar). Sem `only`, sem chave ou sem aux: `[]`.

**Rejeição medida.** Chip: **0 acendimentos em 30.000 strings alfanuméricas aleatórias de 8 a 47 caracteres** — refiz a medição que `sniff.ts:181` afirma e ela se confirma. Decoder: 100% do leque, por `ctx.only`. Nota de doc: `sniff.ts:176-178` diz "5 cards acima do corte (`affine` 0,49, `caesar` 0,46…)"; no meu vetor a conta deu **7 cards, `affine` 0,67, `caesar` 0,61**. A amostra é outra, mas o n …

**Autoverificação.** Em cascata, três camadas: (1) toda letra do cifrado tem de ser A/D/F/G/V/X — qualquer outra mata; (2) a leitura colunar tem de consumir exatamente o comprimento (as colunas altas/baixas de `columnar.ts:16` precisam fechar); (3) cada par fracionado tem de cair numa das 36 casas. Erradas as chaves, a camada 3 quase nunca falha (a grade 6×6 é cheia), então o veredito final é o voc …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/adfgvx.ts · .../adfgvx.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/columnar.ts:14-34 (extrair o corpo para `export function lerColunar(cifra: string, chave: string): string`, exatamente como `bifid.ts:9` já exporta `bifidSquare` — o decoder passa a chamá-la, comportamento idêntico) · /Users/peter/Repos/the-decrypter/src/features …

**API.** `defineDecoder({ id: "adfgvx", name: "ADFGVX / ADFGX", category: "classical", inputs: { key: { label: "Palavra da grade 6×6", placeholder: "BLUMENAU2026" }, aux: { label: "Palavra da colunar", placeholder: "ITAJAI", required: true } } })`. `decode()` devolve 0 ou 1 candidato `{ label: "grade BLUMENAU2026 · colunar ITAJAI", output, chainValue: output }`. Detecta ADFGX (sem V) pela ausência de V no cifrado e usa grade 5×5 sem dígitos. `encode()` faz o caminho inverso e é determinístico.

**Vetor de teste.** Grade 6×6 com a chave `BLUMENAU2026` → `BLUMEN / ACDFGH / IJKOPQ / RSTVWX / YZ0123 / 456789` (rótulos A D F G V X nas duas bordas). Chave colunar `ITAJAI` (6 colunas; ordem alfabética com desempate por posição: A(3)→1, A(5)→2, I(1)→3, I(6)→4, J→5, T→6). Claro `APONTEDEFERRO` → fracionado (A=linha2,col1 → `DA`; P=linha3,col5 → `FV`; …) → após a colunar, cifrado `FGAGFADGDADAFGVGAVFVAAXFVG` (26 letras, par, só A/D/F/G/V/X — o chip acende). Decifrando com as duas chaves: `APONTEDEFERRO`. Conferido nos dois sentidos.

**Riscos.** 1) **Estou contrariando uma decisão escrita duas vezes** (inventário e o comentário do sniffer); se o dono mantiver "só o chip", o item cai inteiro e o único resto é acrescentar `decoderId` ao chip (30 min) — o que já vale, porque leva a pessoa ao modo "uma cifra só" onde os 7 cards errados somem. 2) O `detail` do chip vira mentira no instante em que o decoder existir; a edição do sniff.ts não é opcional. 3) Duas chaves é o dobro de campo para di …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:49 (`trazer`, mas "Só o CHIP do sniffer") e src/features/decoder/engine/sniff.ts:167-179 ("A bancada NÃO decifra: são duas chaves… e sem elas não há o que tentar"). Contesto a INFERÊNCIA, não o dado: "sem elas não há o que tentar" é verdade e continua verdade; ela não implica "com elas também não". A evidência da Scotla …

**Decisão do dono.** Manter "só o chip" (INVENTARIO:49) ou aceitar o decode em `ctx.only` com as duas chaves. É a única decisão de veredito da minha fatia — o resto é engenharia dentro de regra já escrita.

**Correção exigida pela crítica.** - **A chave do vetor não bate com a grade impressa.** Com `BLUMENAU2026` a grade é `BLUMEN / A206CD / FGHIJK / OPQRST / VWXYZ1 / 345789` — os dígitos entram no bloco da chave. A grade escrita na ficha (`BLUMEN/ACDFGH/IJKOPQ/RSTVWX/YZ0123/456789`) é a da chave **`BLUMENAU`**. O cifrado conferido é o da segunda. Trocar o `placeholder` ou trocar a grade; como está, um teste escrito da ficha falha. - Os números do comentário `sniff.ts:176-178` ("5 ca …

#### 12.20 · Straddling checkerboard

`decoder-so-cifra-unica` · **M (~3h) — a montagem da grade a partir da linha 0 (~50 linhas), a leitura gulosa com escape, encode, e os test…** · crítica: **MANTÉM** · fatia: família do quadrado de Políbio

**Por que esse destino.** É a melhor prova da minha fatia pela triagem (LACUNA_QUENTE, fit 5) e o pior candidato a leque que existe: uma fita de dígitos sem separador não tem forma nenhuma. Medi o melhor portão de entrada possível — "só dígitos e espaço, ≥ 20 dígitos" — e ele rejeita **88,88%**, deixando passar 2.264 entradas do tráfego, das quais 198 listas A1Z26 com espaço e 173 coladas, que é a cifra nº 1 do acervo. Subir para ≥ 36 dígitos leva a rejeição a 97,68% e custa metade das cifras reais (o vetor abaixo tem 16 …

**Portão.** `ctx.only === "checkerboard"` (portão inteiro). Dentro: `/^[0-9\s]+$/`, ≥ 10 dígitos, `ctx.key` com 10 caracteres sendo 8 letras distintas e 2 furos (`.`), e `wordsProntas()`. Sem a linha 0, o card não nasce — e a bancada diz por quê, em vez de calar.

**Rejeição medida.** 100% do leque por `ctx.only`. O número que justifica isso: o melhor portão de entrada concebível (só dígitos, ≥ 20) rejeita **88,88%** — acima do piso de 79,8% da R1 no papel, mas os 11,12% que passam são exatamente a família que a casa mais recebe. Corpus: 20.367 entradas (o mesmo do item 1).

**Autoverificação.** **Nenhuma estrutural** — é o achado que decide o destino: 70,9% das linhas 0 erradas produzem uma leitura completa, só que em letra aleatória. Quem verifica é o vocabulário, e ele verifica bem: com a linha 0 certa o vetor dá cobertura **0,77** e maior pedaço **5**; com 2.000 linhas 0 aleatórias, `cobertura ≥ 0,45 + maiorPedaco ≥ 5` passa em **1** — 99,95% de rejeição entre as q …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/checkerboard.ts · .../checkerboard.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:64 · /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md:176 (o grupo "Dígitos sem forma própria") · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31 · /Users/peter/Repos/the-decrypter/src/features/reference/components/refere …

**API.** `defineDecoder({ id: "checkerboard", name: "Straddling checkerboard", category: "classical", inputs: { key: { label: "Linha 0 (8 letras + 2 furos)", placeholder: "AE.ORIS.DT" } } })`. `decode()` devolve 0 ou 1 candidato `{ label: "linha 0 AE.ORIS.DT · escapes 2 e 7", output, forcedScore, chainValue: output }`. As linhas de escape recebem as 18 letras restantes + `/` + `.` em ordem alfabética (convenção fixa, documentada na Cola). `encode()` presente e determinístico.

**Vetor de teste.** As 8 letras de 1 dígito para o **português** saem medidas do `PERFIL_PT` de `criptanalise.ts:109`: **A E O R I S D T**, que somam **66,7%** do texto corrido (não é o ESTONIA-R inglês da literatura — este é um achado da casa). Linha 0 = `AE.ORIS.DT`, ou seja A=0, E=1, furo=2, O=3, R=4, I=5, S=6, furo=7, D=8, T=9. As 18 letras restantes + `/` + `.` ocupam 20…29 e 70…79: B=20, C=21, F=22, G=23, H=24, J=25, K=26, L=27, M=28, N=29, P=70, Q=71, U=72, V=73, W=74, X=75, Y=76, Z=77. Claro `APONTEDEFERRO` → A=0, P=70, O=3, N=29, T=9, E=1, D=8, E=1, F=22, E=1, R=4, R=4, O=3 → cifrado **`0703299181221443`** (16 dígitos para 13 letras). Lendo de volta com a mesma linha 0: `APONTEDEFERRO`. Conferido nos d …

**Riscos.** 1) **Sem chave a bancada fica muda**, e mudez não deixa rastro — o card de ausência ("faltam a linha 0 e os dois furos") é parte do item, não enfeite. 2) A busca automática pela linha 0 é tentadora e está FORA: são 45 escolhas de par de escape × 26! alfabetos, e a R3 proíbe busca combinatória. O caminho honesto para uma camada (b) futura, em botão, é usar as 45 segmentações e escolher a que põe as 8 frequências mais altas nos dígitos de 1 símbolo …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:64 e docs/PLANO-CATALOGOS.md:176 descartam "straddling checkerboard, VIC, Monôme-Dinôme, Fractionated Morse" por "string de dígitos de comprimento variável sem forma própria". **Concordo com o diagnóstico e discordo do destino**: o mesmo diagnóstico, aplicado ao Morbit e ao Pollux, não produziu descarte — produziu `ctx. …

**Correção exigida pela crítica.** - **Vetor: EXATO.** `APONTEDEFERRO` → **`0703299181221443`**, e a leitura gulosa com escapes 2 e 7 volta ao claro. Conferido. - **As 8 letras saem mesmo do `PERFIL_PT`.** `criptanalise.ts:109`: A 13,09 · E 12,05 · O 10,66 · R 6,93 · I 6,60 · S 6,48 · D 5,65 · T 5,28 = **66,74%**. A ficha diz 66,7%. Certo, e é achado real da casa (não é o ESTONIA-R inglês). - **A medição do portão reproduz.** ≥20 dígitos: medi **87,34%** de rejeição (ficha: 88,88% …

#### 12.21 · Nomenclator / cifra de repertório

`recusar` · **P — 1 h, e só se o item 2 existir** · crítica: **MANTÉM** · fatia: homofônica e vizinhas

**Por que esse destino.** Aplico a régua e ele reprova por redundância, não por perigo. **Assinatura:** nenhuma própria — a saída é uma lista de números indistinguível da homofônica, do A1Z26 e de qualquer contagem. **Autoverificação:** herdada da tabela, quando ela existe. **Ruído:** seria alto no leque, zero fora dele. **Mas o ponto que decide é outro:** um nomenclator com a tabela dada é o item 2 desta lista com o lado direito da tabela sendo uma PALAVRA em vez de uma letra. `lerTabelaHomofonica` já vai devolver `Map< …

**Portão.** Não há decoder novo, logo não há portão novo. O que muda é UMA linha no parser do item 2, e é aí que mora o teste:

```ts
// lerTabelaHomofonica: o lado direito passa a aceitar palavra, não só letra
const RE_ENTRADA = /^([0-9A-Za-z]{1,4})\s*=\s*([A-Za-zÀ-ú]+)$/;   // era /=\s*([a-z])$/
// e o portão de "não é o alfabeto-chave" continua o mesmo:
if (tabela.maxHomofonos < 2 && [...tabela.mapa.values()].every((v) => v.length === 1)) return [];
```

Se o item 2 não for feito, a recusa é total e não há arquivo de código a tocar.

**Rejeição medida.** Não se aplica como decoder novo (não há decoder). Como modo do item 2, a rejeição é a dele: **100% do fan-out enquanto o campo Chave estiver vazio**, por assinatura literal, mais o corte de 90% de tokens conhecidos.

**Autoverificação.** A da tabela dada — cobertura de palavra real ≥ 0,45 sobre a saída, herdada do item 2 sem alteração. Sem tabela **não há autoverificação possível**, e é essa a razão técnica da recusa como decoder autônomo: um repertório de nomes próprios não tem estatística que o denuncie nem vocabulário que o confirme. Nesse regime a regra do teto da R2 mandaria nota abaixo do piso, ou seja, u …

**Arquivos.** EDITAR:
- `/Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md` — linha nova no Grupo 1, destino `descartar`, com a razão e o gatilho. Hoje o nomenclator não está catalogado; o total de 122 verbetes sobe para 123. (O cabeçalho do arquivo já avisa que "a contagem é piso, não teto".)
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/homofonica-tabela.ts` — a linha de regex, se o item 2 existir.
- `/Users/peter/Repos …

**API.** Nenhuma superfície nova. A capacidade chega pela API já especificada no item 2:
```ts
export interface TabelaHomofonica {
  mapa: Map<string, string>;   // símbolo → letra OU palavra — é só isto que muda
  maxHomofonos: number;
  letras: number;
}
```

**Vetor de teste.** Nomenclator de bolso, misto (repertório + letras), do tipo que uma prova de gincana escreveria:

chave: `12=BLUMENAU 07=a 19=ponte 04=do 31=e 22=i 55=GARCIA`
claro → `BLUMENAU a ponte do GARCIA`
cifrado → `12 07 19 04 55`
decode(`12 07 19 04 55`) → `BLUMENAU a ponte do GARCIA`
Conferência: 12→BLUMENAU, 07→a, 19→ponte, 04→do, 55→GARCIA. Ida e volta batem por construção — o mapa é uma bijeção símbolo→cadeia, e a volta é a leitura direta do `Map`.

Caso negativo: a tabela `01=a 02=b … 26=z` (todo lado direito com 1 letra e nenhum homófono repetido) tem de devolver `[]` — é `alfabeto-chave`/`a1z26`, não nomenclator.

Observação honesta sobre este vetor: com 5 símbolos ele não passa no piso de 8 …

**Riscos.** 1. **Recusar sem escrever o gatilho é o defeito R6, e este item existe justamente por causa dele.** Gatilho proposto, para virar linha de documento: *reabre se uma prova entregar um repertório de mais de 30 verbetes, ou se o item da tabela dada precisar de lado direito multi-caractere por outra razão*.
2. **A generalização do lado direito pode virar buraco.** Se o valor puder ser qualquer cadeia, o decoder passa a ser um buscar-e-trocar genérico …

**Conflito com decisão anterior.** Nenhum — o nomenclator nunca foi julgado por escrito neste repositório. `grep -i nomenclator docs/ src/` = 0 ocorrências. Esta ficha é a primeira decisão sobre ele, e por isso ela PRECISA virar linha de documento com gatilho de reabertura (R6), senão volta como proposta na próxima passada.

**Decisão do dono.** Nenhuma. É recusa dentro de regra já escrita — a mesma que rejeitou "buscar-e-trocar" e o Great Cipher. O que o dono precisa é só aprovar que a recusa VIRE linha de documento com o gatilho, porque decisão que não vira texto volta como proposta (R6).

**Correção exigida pela crítica.** recusa dentro de regra escrita, com o gatilho de reabertura formulado. ---


### Onda 13 — consulta com base de dados

#### 13.1 · Painel Kemler laranja + número ONU

`consulta` · **G — parte offline do Kemler (tabela ~30 linhas + decoder + teste) é P (~1,5 h)** · crítica: **MANTÉM COM CORREÇÃO** · fatia: consultas industriais

**Por que esse destino.** O painel tem duas metades com naturezas diferentes, e a ficha as separa. O Kemler (número de cima) é OFFLINE: tabela de ~30 linhas, primeiro dígito = perigo principal (2 gás, 3 líquido inflamável, 4 sólido inflamável, 5 oxidante, 6 tóxico, 7 radioativo, 8 corrosivo, 9 diversos), dígito repetido = intensificado, 0 = sem significado adicional, X à frente = não pode receber água. O número ONU (de baixo) é CONSULTA: precisa da lista de produtos perigosos para virar "gasolina". E a consulta é a assin …

**Portão.** Painel: `/^X?(\d{2,3})\s*[/|\n]\s*(\d{4})$/` **E** primeiro dígito do Kemler em 2–9 **E** o número ONU existe na base. Literal: `/^(?:ONU|UN)\s*-?\s*(\d{4})$/i` **E** existe na base. O portão da CARGA (em `use-decoder.ts`, no molde do `PARECE_ESTRUTURA` de `:167`) é a mesma forma, para os dois portões não divergirem — o comentário de `use-decoder.ts:192` conta o que acontece quando divergem.

**Rejeição medida.** Corpus real: **100,00%** (0 disparos em 20.047 — inclusive as 130 ocorrências de `NN/NNNN`, todas datas). Sintético: **100,00%** (0 em 24.400). Dicionários: 0 em 463.438 palavras. Condicionado à forma `NN/NNNN`: 1º dígito em 2–9 deixa passar 8 de 9; ONU válido cobre ~30% dos 4 dígitos (faixa 0004–3560 com lacunas); coerência de classe fecha em ~0,147 (calculado sobre a distribu …

**Autoverificação.** Genuína, e é a COERÊNCIA DO PAR: o primeiro dígito do Kemler tem de bater com a classe de risco que a base atribui ao número ONU. `33/1203` → gasolina, classe 3 → o 3 do Kemler confere ✓. `33/1017` → cloro, classe 2.3 (gás tóxico), cujo Kemler é 268 → INCOERENTE → o card recusa, ou emite com aviso explícito e nota de gaveta. Nenhum outro item da fatia tem verificação cruzada en …

**Arquivos.** CRIAR: `src/features/decoder/engine/decoders/onu-kemler.ts`, `onu-kemler.test.ts`, `src/features/reference/kemler.ts` + teste, `scripts/build-onu.ts`, `public/data/onu.json`, `src/features/onu/types.ts`. EDITAR: `src/lib/data.ts` (`loadOnu` no molde de `:101`), `src/features/decoder/engine/types.ts` (campo `onu?: OnuData | null` no `DecodeContext`, com o comentário do porquê preguiçoso, como o de `bridges`), `src/features/decoder/use-decoder.ts` …

**API.** `defineDecoder`. id: `"onu-kemler"` · name: `"Painel de produto perigoso (ONU / Kemler)"` · category: `"lookup"` · inputs: nenhum · encode: NÃO. Lê `ctx.onu` (novo campo, `null` até carregar — e devolve `[]` enquanto for `null`, a mesma disciplina dos outros preguiçosos). Retorno: `{ label:"33 / 1203", output:"ONU 1203 — gasolina · classe 3 · Kemler 33 = líquido muito inflamável (ponto de fulgor abaixo de 23 °C), 3 repetido = intensificado", notes, forcedScore: 0.9 | 0.25, chainValue:"1203", render:"code-list", data: CodeHit[] }`.

**Vetor de teste.** POSITIVO: `33/1203` → Kemler 33: primeiro 3 = líquido inflamável, 3 repetido = intensificado (ponto de fulgor < 23 °C); ONU 1203 = gasolina, classe 3 → o par é COERENTE (3 = 3) ✓ → nota 0,9, chainValue `1203`. NEGATIVO POR INCOERÊNCIA: `33/1017` → ONU 1017 = cloro, classe 2.3; o Kemler do cloro é 268, não 33 → o par NÃO fecha → card de diagnóstico a 0,25, fora do topo. NEGATIVO POR FORMA — e esta é a medição que mais me tranquilizou: o acervo tem **130 ocorrências de `NN/NNNN`** (02/2004, 08/2026, 11/2025…) e **ZERO** passa no portão, porque mês é sempre 0x ou 1x e Kemler começa em 2–9. As duas gramáticas são disjuntas por construção, não por sorte.

**Riscos.** (1) TAMANHO E FONTE DA BASE: a faixa de números ONU vai de 0004 a 3560, ou seja **teto duro de 3.557 linhas**; com nome pt-BR + classe estimo 250–350 KB de JSON cru (~80 KB gzip), na faixa dos eixos (697 KB, preguiçoso). **A contagem exata sai do script de build e a ficha não a inventa** — se passar de ~250 KB gzip, a regra da casa manda ir para a API. (2) LICENÇA: as Recomendações da ONU (Orange Book) são publicação comercial da ONU e NÃO devem …

**Conflito com decisão anterior.** Nenhum decidido. Anoto a distinção que a triagem embaralhou: o losango/rótulo de risco e o painel laranja são ADR/ONU (transporte); o diamante NFPA 704 é instalação fixa e norma americana. São normas diferentes e viram fichas diferentes — esta e a seguinte.

**Decisão do dono.** Três: (a) fonte da base — ANTT 5.998/2022 em pt-BR (recomendo) ou 49 CFR 172.101 em inglês; (b) preguiçosa local (recomendo, pelo argumento do balde de 120/min) ou seed-data + API como o CID-10; (c) se recusar a base, aceitar a degradação para chip do sniffer.

**Correção exigida pela crítica.** A coerência do par é a autoverificação mais interessante da fatia e os fatos de domínio conferem (ONU 1203 = gasolina classe 3, Kemler 33; ONU 1017 = cloro classe 2.3, Kemler 268). Correções:


### Onda 14 — os caros e os que dependem do dono

#### 14.1 · Grandpré

`decoder-no-leque` · **P (~2h) — parser da grade (~25 linhas), leitura por par, encode determinístico, testes.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** Onda 14 porque **depende de decisão do dono**, não porque seja caro: o código é P. A grade É a chave, e ela é texto longo (10 palavras), então o campo natural é o `aux` com `required: true` — o que põe o decoder fora da corrida até alguém colar a grade (`use-decoder.ts:357`) e faz a rejeição ser 100% por construção. O que o dono decide é se vale existir: são **0 posts e 2 comentários** em 38.140 posts do r/codes, zero ocorrência no acervo, e o único argumento a favor é que a cifra encaixa na cas …

**Portão.** `ctx.aux` obrigatória e não vazia (a grade, uma palavra por linha). Entrada: `/^[0-9\s]+$/`, nº par de dígitos, ≥ 8 pares, e todo dígito dentro do tamanho da grade (1..8 para 8×8, 0..9 para 10×10). Saída: `coverage ≥ 0,45`.

**Rejeição medida.** 100% do tráfego enquanto o campo da grade estiver vazio. Se alguém apagasse esse portão e deixasse só a forma, medi o que aconteceria: "pares de dígitos 1–8, ≥ 8 pares" passa em 792 de 20.367 (rejeição 96,11%) — número bonito que esconde uma colisão frontal: **773 dos 792 são tiras de Políbio**, porque 1–5 está dentro de 1–8. Com grade 10×10 a forma vira "pares de qualquer dígi …

**Autoverificação.** Estrutural fraca (coordenada fora da grade mata) e vocabulário forte — com a grade certa a saída é português, com a grade errada é letra aleatória. A parte estrutural é mais fraca que a do Nihilist porque a grade é cheia: quase toda coordenada existe. Por isso **teto de nota** (`forcedScore` ≤ 0,70).

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/grandpre.ts · .../grandpre.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:58 · /Users/peter/Repos/the-decrypter/docs/PLANO-CATALOGOS.md:174 · /Users/peter/Repos/the-decrypter/src/features/reference/sources.ts:446 · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts:31.

**API.** `mapDecoder({ id: "grandpre", name: "Grandpré", category: "classical", inputs: { aux: { label: "A grade (uma palavra por linha)", placeholder: "GRAVANHA\nALPALHAO\n…", required: true } } })`. `decode()` devolve `{ output, label: "grade 8×8 · acróstico GAMASIDA", notes: "letras ausentes da grade: K W Y", chainValue: output }` ou `null`. `encode()` escolhe SEMPRE a primeira coordenada de cada letra — a cifra é homófona e `Math.random` aqui seria um card piscando, exatamente o que `substituicao.ts:15-23` proíbe.

**Vetor de teste.** Grade 8×8 montada por busca sobre as 35.742 palavras pt-BR de 8 letras de `public/data/words-pt.txt`, com acróstico `GAMASIDA`: linha 1 `GRAVANHA`, 2 `ALPALHAO`, 3 `MCLXXIII`, 4 `ANAMATRA`, 5 `SUBOSQUE`, 6 `IBERIZAR`, 7 `DEIFICAR`, 8 `AIJULATA`. Claro `APONTEDEFERRO` → cifrado `48 23 54 16 87 58 71 58 74 63 68 47 54` (A na linha 4 col 8, P na linha 2 col 3, O na linha 5 col 4, …). Decifrando com a grade: `APONTEDEFERRO`. Conferido nos dois sentidos.

**Riscos.** 1) **A grade pt-BR não cobre o alfabeto.** Em 200.000 sorteios de grades 8×8 de palavras pt-BR reais, a melhor cobriu **23 das 26 letras** — K, W e Y são inalcançáveis em português de 8 letras. Uma prova em Grandpré ou evita essas três, ou a grade inclui nome próprio/estrangeiro. Isto é restrição de AUTORIA, e precisa estar escrita antes de alguém montar a prova. 2) A grade automática do meu vetor pegou `MCLXXIII` (numeral romano que está na word …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:58 (`descartar`, na linha "AMSCO, Myszkowski, Grandpré, Route com chave") e docs/PLANO-CATALOGOS.md:174. A razão escrita — "nenhuma tem assinatura, todas exigem chave" — é verdadeira e não decide: exigir chave é o que faz o campo obrigatório funcionar. Mas eu **não contesto o veredito**, contesto só a razão: o item cont …

**Decisão do dono.** Vale autorar uma prova em Grandpré (10 ruas de Blumenau cujas iniciais formam a 11ª palavra)? Se não, o item fica na gaveta com este gatilho escrito e **não** vira código — é a única coisa da minha fatia que eu não construiria sem o sim.

**Correção exigida pela crítica.** - **O vetor contradiz o `encode()` que a própria ficha especifica.** "escolhe SEMPRE a primeira coordenada de cada letra" produziria `13 23 28 16 46 58 71 58 74 58 12 12 28` — **não** o vetor. (O vetor usa `58`, `58`, depois `63` para o terceiro E.) Um teste de ida e volta escrito da ficha **falha**. Ou o vetor vira o determinístico, ou o `encode` deixa de ser "sempre a primeira". - **"K, W e Y são inalcançáveis em português de 8 letras" é FALSO …

#### 14.2 · Swagman — transposição com chave de quadrado latino

`decoder-no-leque` · **P — ~2h** · crítica: **sem parecer da crítica** · fatia: chave, transposição e 2º campo

**Por que esse destino.** Decoder porque é transposição e a saída encadeia; onda 14 porque a decisão é do dono e a evidência de demanda é a mais fraca da fatia inteira. O portão é o mais duro que medi: a chave é um QUADRADO LATINO N×N (nenhum número repetido em linha nem em coluna), e essa propriedade se verifica em três linhas de código. Sobre 9.000 entradas reais (5.000 CEPs de `seed-data/ceps.json`, 2.000 frases em pt-BR e 2.000 números soltos de 8 a 9 dígitos), ZERO passam — rejeição 100,000%, contra o piso de 79,8% …

**Portão.** ENTRADA (o 2º campo, `required`):
if (!ctx.aux?.trim()) return [];
const linhas = ctx.aux.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const N = linhas.length;
if (N < 3 || N > 6) return [];
const grade = linhas.map((l) => (l.match(/\d/g) ?? []).map(Number));
if (grade.some((r) => r.length !== N)) return [];
const completa = (v: number[]) => [...v].sort().join() === [...Array(N).keys()].map((i) => i + 1).join();
if (!grade.every(completa)) return [];                              // toda linha tem 1..N
if (![...Array(N).keys()].every((j) => completa(grade.map((r) => r[j])))) return [];   // toda coluna também
const t = input.toUpperCase().replace(/[^A-Z]/g, "");
if (t.length < N * N) return [];
SAÍDA: como toda saída é anagrama da entrada, o portão é o do `transposicao.ts` e …

**Rejeição medida.** ENTRADA: 100% enquanto o 2º campo está vazio, e 100,000% (0 de 9.000) mesmo quando preenchido com tráfego real — CEP, frase, número solto. Medi de propósito com CEP e ids numéricos porque é a família de falso positivo que já obrigou o `a1z26-ciclico` a exigir palavra real e que o `pollux.ts` documenta como o inimigo do espaço numérico. SAÍDA: os limiares do `transposicao.ts` tr …

**Autoverificação.** Dupla. (1) A CHAVE se autoverifica: quadrado latino é uma propriedade combinatória, não um palpite — 0 de 9.000 entradas reais a satisfazem por acaso. (2) A SAÍDA se autoverifica pelo vocabulário, e aqui NÃO uso o corte de 0,45 do `alfabeto-chave`: transposição preserva a frequência de letras, então `scorePlaintext` não separa nada (é exatamente por isso que o `railfence` lider …

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/swagman.ts · .../swagman.test.ts
EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/integridade.test.ts · /Users/peter/Repos/the-decrypter/src/features/reference/inventario.test.ts · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md (linha NOVA — "Swagman" não está catalogado; grep = 0 no repositório) · /Users/peter/Repos/the-decrypter/docs/ …

**API.** id: "swagman" · name: "Swagman (transposição por quadrado latino)" · category: "classical" · inputs: { aux: { label: "Quadrado latino da chave — uma linha por linha", placeholder: "2413\n3142\n1324\n4231", required: true } } · O 2º campo aqui é MESMO um campo de texto multi-linha, e é o único item da fatia em que a `Textarea` de `decoder-workbench.tsx:141` é a forma certa e não um exagero · decode devolve 0 ou 1 DecodeCandidate { label: `quadrado ${N}×${N}`, output, chainValue: output } · encode(input, ctx) cifra · `defineDecoder`.

**Vetor de teste.** REGRA: o texto é dividido em blocos de N²; cada bloco é escrito numa grade N×N POR COLUNAS; a saída lê, para cada célula (i,j) da grade de saída, o caractere da linha `chave[i][j]−1`, coluna `j`, da grade de entrada; e é lida por linhas.
CHAVE (2º campo, 4 linhas): 2413 / 3142 / 1324 / 4231 — latino conferido: toda linha e toda coluna contêm {1,2,3,4} uma vez.
CLARO   : ARUADASPALMEIRAS (16 letras = um bloco 4×4)
GRADE preenchida por colunas: linha0 A D A I · linha1 R A L R · linha2 U S M A · linha3 A P E S
SAÍDA linha 0 (chave 2,4,1,3): grade[1][0]=R, grade[3][1]=P, grade[0][2]=A, grade[2][3]=A ⇒ RPAA
SAÍDA linha 1 (chave 3,1,4,2): grade[2][0]=U, grade[0][1]=D, grade[3][2]=E, grade[1][3]=R …

**Riscos.** 1) É O ITEM DE MENOR LASTRO DA FATIA, e digo o número: 1 post e 0 comentários em 38.140 posts e 76.213 comentários do r/codes (posição 125 de 135 no ranking medido), e zero ocorrência no acervo. A triagem lhe dá prova_fit 4, mas por um argumento de DESENHO DE PROVA (a chave como sudoku), não por demanda observada. Se a régua for aplicada só ao tráfego, este item não entra. 2) BLOCO INCOMPLETO. Com texto que não é múltiplo de N², a última grade fi …

**Conflito com decisão anterior.** Nenhum. "Swagman" não aparece em nenhum documento nem em nenhuma linha de código do repositório (grep = 0 nos dois repos, conforme a triagem). É item novo, sem decisão anterior a contrariar — o que também significa que não há nada além da minha medição sustentando-o, e a onda 14 registra isso.

**Decisão do dono.** A decisão é o item inteiro. O valor está em ESCREVER prova (chave entregue como sudoku incompleto, cadeia de duas camadas com o A20), não em ler cifra — e quem escreve prova é ele. Se a resposta for "não vou usar", o item não entra e a recusa vira linha de PENDENCIAS.md com gatilho: reabre quando uma prova real usar quadrado latino como chave. Se for "vou usar", ele sobe para a onda 12 junto com M …

#### 14.3 · Syllabary (silabário)

`decoder-no-leque` · **M (~5h) — a tabela (decisão + 100 células), o decoder (~50 linhas), o encode por munch máximo, a legenda na Co…** · crítica: **MANTÉM COM CORREÇÃO** · fatia: família do quadrado de Políbio

**Por que esse destino.** Onda 14 porque a tabela é uma decisão do dono, não porque o portão seja fraco — ele é o segundo melhor da minha fatia. Destino decoder e não aba porque a saída são PARES DE DÍGITOS e a entrada também: é peça de cadeia, e a régua da casa manda peça de cadeia ser decoder. A forma sozinha não segura nada (pares 00–99 rejeitam só 63,44% e engolem os 3.475 CEPs do corpus), então o portão é de SAÍDA — a leitura tem de ser palavra real —, e medido isso rejeita **99,98%**: 4 falsos em 20.367 entradas de …

**Portão.** `/^[0-9\s]+$/` na entrada aparada, nº par de dígitos, ≥ 8 dígitos (4 células). Depois disso o portão real: a concatenação das sílabas tem de estar na lista de palavras (`WORDS.has`) ou ter `coverage.covered/analisado ≥ 0,60` com `maiorPedaco ≥ 6`. Sem `wordsProntas()`, `[]` — sem vocabulário não há como conferir, e 4 células decodificam sempre em alguma coisa.

**Rejeição medida.** Forma sozinha: 63,44% (7.447 passam de 20.367) — **abaixo do piso de 79,8% da R1**, e por isso ela não pode ser o portão. Forma + palavra real: passa 4/20.367 → **rejeição 99,98%**. Corpus: o mesmo dos outros itens.

**Autoverificação.** Total e binária: ou a leitura é palavra do dicionário, ou não sai card. Medido sobre as 7.447 entradas do tráfego que passam na forma, **4 produzem palavra real** (2 CEPs, 1 lista A1Z26, 1 tira de Políbio) — e as duas do CEP produzem a mesma palavra por caminhos diferentes (`89046500` e `89040298` dão ambas `ERECIA`), o que é a homofonia da tabela aparecendo.

**Arquivos.** CRIAR: /Users/peter/Repos/the-decrypter/src/features/reference/silabario.ts (a tabela, ~1 KB, importável pela Cola e pelo decoder — o padrão de `src/features/reference/regua-ic.ts:1`, que importa do motor em vez de reescrever número) · /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/silabario.ts · .../silabario.test.ts. EDITAR: /Users/peter/Repos/the-decrypter/src/features/reference/components/reference-panel.tsx (secção nov …

**API.** `mapDecoder({ id: "silabario", name: "Silabário (pares de dígitos → sílabas)", category: "classical" })` — **sem `inputs`**: a tabela é da casa, fixa, e está impressa na Cola. `decode()` devolve `{ output, label: "tabela da casa 10×10", chainValue: output }` ou `null`. `encode()` faz munch máximo (3 letras, depois 2, depois 1) e é determinístico. A tabela sai de `reference/silabario.ts` como `SILABARIO: Record<string,string>` de 100 chaves `"00"`…`"99"`.

**Vetor de teste.** Tabela da casa: as 26 letras em 00–25 e 74 sílabas em 26–99 — `26=RA 27=RE 28=RI 29=RO 30=RU 31=TA … 55=LU … 47=ME … 41=NA … 69=PO 13=N 32=TE 57=DE 87=FE 17=R 29=RO`. Claro `BLUMENAU` → B(01) LU(55) ME(47) NA(41) U(20) → cifrado **`0155474120`**; volta: `BLUMENAU`. Segundo caso, colado: `APONTEDEFERRO` → A(00) PO(69) N(13) TE(32) DE(57) FE(87) R(17) RO(29) → **`0069133257871729`**; volta: `APONTEDEFERRO`. Conferidos os dois nos dois sentidos. Cobertura da tabela: **5.000 de 5.000** palavras pt-BR de 4 a 14 letras são escrevíveis (as 26 letras soltas garantem isso), e a compressão média é **0,63 célula por letra**.

**Riscos.** 1) **A tabela é NOSSA.** Um silabário da ACA ou de outro puzzle não vai decodificar, e o card não tem como avisar. A honestidade obriga o `notes` a dizer "tabela da casa" e a Cola a imprimi-la. 2) Uma primeira tabela só de consoante+vogal (BA BE BI…) parece a escolha óbvia e **não funciona**: medi 27,6% de cobertura, e ela não escreve `BLUMENAU` (o encontro BL) nem `PONTE` (o N de coda). Foi preciso pôr as 26 letras soltas na grade para chegar a …

**Conflito com decisão anterior.** nenhum — o silabário **não está** em docs/INVENTARIO-CATALOGOS.md nem em docs/PLANO-CATALOGOS.md, em nenhum dos 122 verbetes. É item novo, vindo da varredura do r/codes (4 posts + 26 comentários, LACUNA_QUENTE fit 4 na triagem), e por isso precisa de linha nova no inventário, não de flip de destino.

**Decisão do dono.** Adotar uma tabela silábica da casa e imprimi-la na Cola. Sem isso o decoder não tem o que decodificar. A tabela medida acima é uma proposta pronta para carimbar ou trocar — o que não dá é ter decoder sem tabela publicada.

**Correção exigida pela crítica.** É o único item que **não pude verificar**, e por um motivo estrutural, não por descuido meu.

#### 14.4 · Substituição homofônica — solver sem tabela (`homofonica`)

`decoder-so-cifra-unica` · **G — 10,5 h** · crítica: **MANTÉM COM CORREÇÃO** · fatia: homofônica e vizinhas

**Por que esse destino.** Régua aplicada item a item. **Assinatura:** existe e é medida — IC×N ∈ [1,05; 1,45] com N ∈ [27;120] rejeita 99,886% do tráfego (12 de 10.500). **Autoverificação:** existe e é forte — cobertura de palavra real ≥ 0,45; medido em 288 homofônicas verdadeiras e 96 ruídos de mesma forma, 149 verdadeiras passam com acerto de letra médio 99,5% e MÍNIMO 88,2%, e 0 de 96 ruídos passam em qualquer corte de 0,35 a 0,65. **Ruído:** zero no leque, porque não corre no leque. **R3 — busca combinatória:** o esp …

**Portão.** Em ordem, e cada linha custa O(n) ou menos. Devolve `[]` (nenhum card) em qualquer falha:

```ts
if (ctx.only !== ID) return [];                    // 1. o portão inteiro fora do modo "uma cifra só"
const toks = tokenizarSimbolos(input);             // pares colados `1245…` OU grupos `12 45 …`
if (!toks) return [];
if (toks.length < MIN_SIMBOLOS) return [];          // MIN_SIMBOLOS = 500
if (toks.length > JANELA) toks.length = JANELA;    // JANELA = 1600 (a chave sai da janela, aplica-se ao todo)
const N = new Set(toks).size;
if (N < 27 || N > 120) return [];                  // < 27 é monoalfabética (é o `substituicao`); > 120 não se resolve
const icN = icDeSimbolos(toks) * N;
if (icN > 1.45) return [];                         // substituição 1:1 ou texto em claro
if (icN < 1.05) return [ …

**Rejeição medida.** **99,886% — 12 acendem de 10.500 entradas de tráfego não-homofônico.** Corpora e resultado por classe (script `m3-portao.mjs`, portão completo com MIN_SIMBOLOS=300 para medir a cauda curta):

| classe | n | acende | recusa dominante |
|---|---:|---:|---|
| CEP (`seed-data/ceps.json`, 40.445 linhas) | 3.000 | 0 | curto demais |
| id de poste (`seed-data/postes.json`, 45.285) | 2 …

**Autoverificação.** SIM, e é a mesma do `decoders/substituicao.ts` — cobertura de palavra real, não existência de palavra. Corte: `cobertas / total ≥ 0,45` E `cobertas ≥ 20`, com a segmentação gulosa de piso 5 (`PISO_PEDACO`, `decoders/substituicao.ts:161`) sobre a janela de 240 letras (`JANELA_COBERTURA`, :137).

Medido em 288 homofônicas verdadeiras (N ∈ {30,36,40,46,52,62} × L ∈ {400,600,800,10 …

**Arquivos.** CRIAR:
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/homofonica.ts` (motor puro)
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/homofonica.worker.ts`
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/homofonica.test.ts`
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/homofonica.ts` (só os portões e o card)
- `/Users/peter/Repos/the-decrypter/src/features/decoder/engine/deco …

**API.** ```ts
// engine/homofonica.ts — puro, sem rede, sem DecodeContext
export interface Solucao {
  chave: Uint8Array;          // chave[simbolo 0..N-1] = letra 0..25
  simbolos: string[];         // os N símbolos distintos, na ordem do índice
  hipotese: "proporcional" | "uniforme";
  cobertura: number;          // a razão que decidiu
  trabalho: number;           // avaliações gastas; sempre <= teto (há teste prendendo)
  estourou: boolean;          // a busca foi cortada — a tela precisa dizer
  reinicios: number;
}
export function tokenizarSimbolos(t: string): string[] | null;
export function icDeSimbolos(toks: string[]): number;
export function repartirProporcional(N: number): number[];   // …

**Vetor de teste.** **VETOR A — ida e volta, conferível à mão (calculei e rodei; a volta bate com o claro).**
Tabela (39 símbolos, homófonos proporcionais à frequência do pt):
`a=01,14,27 · b=02 · c=03,16 · d=04 · e=05,18,31,44 · f=06 · g=07 · h=08 · i=09,22 · j=10 · l=11 · m=12,25 · n=13,26 · o=15,28,41 · p=17 · q=19 · r=20,33 · s=21,34,47 · t=23,36 · u=24,37 · v=29 · x=30 · z=32`
Regra de escolha: rodízio — o k-ésimo uso da letra pega o homófono `k mod n`.

claro → `ovelhotempedra` (14 letras)
cifrado → `15 29 05 11 08 28 23 18 12 17 31 04 20 01`
conferência letra a letra: o→15 (1º de 15/28/41) · v→29 · e→05 (1º de 05/18/31/44) · l→11 · h→08 · o→28 (2º) · t→23 (1º de 23/36) · e→18 (2º) · m→12 (1º de 12/25) · …

**Riscos.** 1. **A HIPÓTESE DE CONTAGEM É O RISCO CAPITAL, e uma versão ingênua erra 50% dos casos em silêncio.** O solver fixa quantos homófonos cada letra tem e depois só TROCA slots — se a contagem estiver errada, a resposta sai plausível e errada. Medido, cifra com 2 homófonos por letra (N=52, uniforme), 10 amostras: contagem por perfil dá **34,1%** (L=600) e **53,0%** (L=1200); contagem uniforme dá **96,2%** e **99,2%**. Solução: rodar as DUAS hipóteses …

**Conflito com decisão anterior.** CONTRARIO TRÊS DECISÕES ESCRITAS, e digo por quê. (1) `docs/INVENTARIO-CATALOGOS.md:62` — "Homofônica (substituição um-para-muitos, 01-99) · `descartar` · a saída é uma lista de números de dois dígitos SEM forma própria, que colide de frente com o a1z26-ciclico… E ainda exige a tabela homofônica inteira digitada". (2) `docs/PLANO-CATALOGOS.md:177` …

**Decisão do dono.** SIM, e é o item inteiro. Três perguntas, nesta ordem: (1) **Reverter uma recusa escrita em três documentos** vale um decoder de 10,5 h para uma cifra com ZERO ocorrências no acervo? A varredura do r/codes diz que é a lacuna clássica mais citada (156 menções, 85 threads); o acervo diz que nunca apareceu. São evidências de universos diferentes e só o dono pesa qual vale. (2) **Aceitar o primeiro Wor …

**Correção exigida pela crítica.** Cortar a hipótese uniforme.** Substituí-la por uma repartição intermediária, ou rodar hipótese única. Orçamento cai pela metade; pior caso vai de 523 ms para ~262 ms (pela taxa dela) ou ~200 ms (pela minha, medida a L=1600). 2. **O Worker deixa de ser obrigatório e passa a ser escolha.** Com uma hipótese, e estando o item em `ctx.only` (onde a entrada de 500+ símbolos é colada, não digitada), 200 ms uma vez por colagem é discutível. Recomendo man …

#### 14.5 · Numerais cistercienses

`legenda-na-cola` · **P (~2 h) de escrita, mas a decisão é do dono e é ela que fixa a onda em 14.** · crítica: **MANTÉM COM CORREÇÃO** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Chega como DESENHO — um glifo gravado, um logotipo, uma tatuagem — e não tem bloco Unicode, então decoder está fora pela mesma regra do pigpen. Mas como legenda ele é diferente de todos os outros desta fatia: não precisa de tabela de 26 glifos, precisa de uma REGRA DE CONSTRUÇÃO de 4 quadrantes × 9 formas em torno de uma haste. Esse é exatamente o formato que a casa já aceitou uma vez, no NYCTOGRAFICO_NOTAS de alfabetos-visuais.ts — regra, sem tabela, com a ressalva de fonte escrita junto. E o r …

**Portão.** Não há — item sem decoder e sem card. Nada roda por tecla.

**Rejeição medida.** não se aplica — sem portão e sem card, nada é avaliado. Impacto no fan-out: zero.

**Autoverificação.** Nenhuma no motor. A conferência é humana e a legenda tem de ensiná-la: o ZERO é a AUSÊNCIA de marca no quadrante, então quem transcreve precisa dizer 'nada aqui', nunca pular o quadrante. É a diferença entre ler 2026 e ler 226.

**Arquivos.** editar /Users/peter/Repos/the-decrypter/src/features/reference/alfabetos-visuais.ts (novo `export const CISTERCIENSE_NOTAS: string[]` de 5–6 linhas, e opcionalmente `export const CISTERCIENSE_QUADRANTES: { quadrante: string; potencia: number; onde: string }[]` com as 4 linhas); editar /Users/peter/Repos/the-decrypter/src/features/reference/components/reference-panel.tsx (importar de ../alfabetos-visuais na linha 4 e abrir uma `<Section title="Num …

**API.** `export const CISTERCIENSE_NOTAS: string[]`, consumido por `<Notas itens={CISTERCIENSE_NOTAS} />` — o mesmo componente de reference-panel.tsx:96 que já serve RUNAS_NOTAS, NYCTOGRAFICO_NOTAS e ICS_NOTAS.

**Vetor de teste.** Aritmético e conferível sem desenho nenhum. 2026 numa haste vertical: unidades 6 no quadrante superior direito · dezenas 2 no superior esquerdo · centenas 0, isto é NADA, no inferior direito · milhares 2 no inferior esquerdo. Volta: 2×1000 + 0×100 + 2×10 + 6 = 2026. O vetor NEGATIVO é o que a legenda existe para evitar: espelhe o desenho (troca esquerda e direita) e a mesma marca vira 60 + 2 + 0 + 200 = 262, não 2026 — três dígitos de diferença sem nenhum aviso na tela.

**Riscos.** 1) Espelhamento, medido acima: 2026 vira 262. É a primeira nota. 2) A ausência de marca é o zero, e quem transcreve tende a pular quadrante vazio. É a segunda nota. 3) INCHAÇO DA COLA: este é o argumento que a casa já usou para barrar 200 alfabetos, e ele continua válido — por isso a proposta é uma Section de notas e ZERO glifo desenhado, custando menos espaço que a Section de runas. 4) Âncora: não há prova do acervo que tenha usado. A força do i …

**Conflito com decisão anterior.** docs/INVENTARIO-CATALOGOS.md:120 · docs/PLANO-CATALOGOS.md:180 · docs/PLANO-CATALOGOS.md:167 (Gaveta). Contrario as três, e digo por quê: a razão escrita nelas é 'reprovam como decoder e reprovam como legenda pela fila já decidida — o nyctográfico entra antes por ter âncora'. O nyctográfico JÁ ENTROU (NYCTOGRAFICO_NOTAS está em alfabetos-visuais.ts …

**Decisão do dono.** Promover cistercienses de `descartar` para `legenda-na-cola` contraria três linhas escritas do repositório e só o dono fecha isso. As linhas são: docs/INVENTARIO-CATALOGOS.md:120 (destino `descartar`, com 'Cistercienses aparece nominalmente no plano como se sobrar tarde — mantenha nesse patamar, não promova'), docs/PLANO-CATALOGOS.md:180 (grupo 'chega como imagem e não tem âncora') e docs/PLANO-CA …

**Correção exigida pela crítica.** ** "conferir `inventario.test.ts` na mesma passada" é desnecessário — `descartar` não é guardado por teste nenhum. Escalar para o dono está certo: são três linhas escritas, uma delas explícita ("mantém nesse patamar, não promove").

#### 14.6 · Morse fracionado SEM a chave (solver por busca) — recusa medida

`recusar` · **P — ~1h, e é custo de DOCUMENTO, não de código: o bloco de comentário no morse-fracionado.ts com os dois númer…** · crítica: **MANTÉM** · fatia: chave, transposição e 2º campo

**Por que esse destino.** A tentação óbvia é reaproveitar a arquitetura do Pollux e do Morbit: DFS por posição, atribuindo símbolo ao caractere na primeira vez que ele aparece, podando assim que o Morse deixa de ser prefixo válido, com teto em PASSOS (`engine/pollux-morbit.ts`, e o `ORCAMENTO = 400_000` de `decoders/morbit.ts`). Prototipei e MEDI: ela não transfere. O fator de ramificação é 26 trigramas por letra nova, contra 3 símbolos no Pollux e 9 pares no Morbit — e o espaço de leituras VÁLIDAS explode antes de qualq …

**Portão.** O portão é a RECUSA, e ela é literal, no decoder do item anterior:
if ((ctx.key ?? "").replace(/[^a-zA-Z]/g, "").length < 3) return [];
Sem chave, o `morse-fracionado` devolve `[]` — inclusive no modo "uma cifra só" (`ctx.only`), ao contrário do Morbit, que usa o `only` justamente como caminho do solver. A diferença tem de estar escrita no arquivo, senão a próxima passada "conserta" o `only` e reintroduz o problema.

**Rejeição medida.** 100% — o decoder não emite nada sem chave. É recusa, não portão estatístico.

**Autoverificação.** NENHUMA que sirva, e é essa a razão da recusa. Morse válido, que no item anterior rejeita 100% dos alfabetos errados, aqui é o critério que a busca MAXIMIZA — o júri vira o réu, exatamente o defeito que `INVENTARIO-CATALOGOS.md:132` descreve para o solver de substituição ("NÃO promove por scorePlaintext... seria o júri sendo o réu"). Sobram 2 milhões de leituras todas válidas, …

**Arquivos.** EDITAR: /Users/peter/Repos/the-decrypter/src/features/decoder/engine/decoders/morse-fracionado.ts (bloco de cabeçalho "POR QUE ELE NÃO BUSCA A CHAVE", no formato dos blocos de `pollux.ts` e `morbit.ts`) · /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md linha 64 (a linha muda de `descartar` para `ja-temos` no caso COM chave e ganha a recusa explícita do caso sem chave) · /Users/peter/Repos/the-decrypter/docs/PLANO-2026-08.md linha 47 …

**API.** Não há API nova. O que há é uma cláusula no decoder existente e um teste que a prende: `it("sem chave, não emite nem no modo uma-cifra-só")`, com `ctx.only === "morse-fracionado"` e `ctx.key === ""` ⇒ `[]`. Sem esse teste a recusa não sobrevive à próxima refatoração.

**Vetor de teste.** O vetor É a medição da recusa, e ela se refaz com o mesmo protótipo: entrada CBENKOVDRKDKJWQ (o Morse fracionado de APONTEDEFERRO com a chave ITAJAI, 15 letras). DFS por posição com poda por prefixo de Morse, teto de 3.000.000 de passos ⇒ 2.007.947 leituras VÁLIDAS contadas, busca NÃO esgotada, 1,34 s. Mesmo protótipo em GDGRPOVSRQ (BLUMENAU, 10 letras) ⇒ 1.800.634 leituras válidas em 3.000.000 de passos, não esgotada, 1,30 s. COMPARAÇÃO que decide: `decoders/pollux.ts` documenta que uma cifra Pollux real de 103 dígitos fecha em ~230.000 passos (15 ms), e `decoders/morbit.ts` documenta 49 a 66 ms por entrada. A diferença não é de grau — no Pollux a busca ESGOTA dentro do orçamento; aqui ela …

**Riscos.** 1) O RISCO É A RECUSA SUMIR. Alguém vê o `ctx.only` do Morbit, conclui por simetria que o Morse fracionado deveria ter o mesmo, e ativa. Por isso a recusa é código (o `if`), teste (o caso acima) e comentário com número, e não só uma linha de plano. 2) NÃO ESTOU RECUSANDO A CIFRA — só o modo sem chave. Se a linha do INVENTARIO for reescrita como "descartada", ela volta a mentir na direção oposta. 3) GATILHO DE REABERTURA, por escrito: reabre se ap …

**Conflito com decisão anterior.** CONCORDO com a conclusão de /Users/peter/Repos/the-decrypter/docs/PLANO-2026-08.md:474 e /Users/peter/Repos/the-decrypter/docs/INVENTARIO-CATALOGOS.md:64 — a busca sem chave não entra. DISCORDO DO ARGUMENTO: as duas linhas dizem "26!", que é o tamanho do espaço de CHAVES e não é o que impede nada (o Morbit tem 9! = 362.880 e entra assim mesmo, porq …

**Decisão do dono.** Nenhuma. É recusa com número; só o gatilho de reabertura precisa do aval dele para virar linha de PENDENCIAS.md.

#### 14.7 · Dancing Men (Sherlock Holmes)

`recusar` · **zero se recusado** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Duas razões, e a segunda é a que fecha. (a) Entrada é desenho de bonecos, sem bloco Unicode e sem notação textual — decoder está fora pela regra do pigpen. (b) Uma vez transcrito, isto É substituição monoalfabética com fronteiras de palavra conhecidas (a bandeirinha marca fim de palavra), e a bancada JÁ RESOLVE esse caso: substituicao.ts está no leque com ORCAMENTO_TRABALHO = 16.600 (:87) e é justamente das fronteiras de palavra que um solver de substituição tira proveito. Não falta capacidade — …

**Portão.** Não pode existir. Não há string: a entrada é a foto do desenho. Qualquer portão teria de operar sobre pixels, e a aba Arquivo hoje tem EXIF (imagem/exif.ts), LSB (imagem/lsb.ts), planos de bit (imagem/planos.ts) e leitor de código de barras (imagem/codigo.ts) — nenhum extrator de grade ou de forma.

**Rejeição medida.** não se aplica. O item não consome tráfego e não ocupa o topo.

**Autoverificação.** não se aplica — nada a verificar, porque nada é lido.

**Arquivos.** nenhum a criar ou editar. O ponteiro já existe: src/features/reference/sources.ts:449 nomeia 'Semáforo, Hexahue, Dancing Men e Pigpen' dentro da nota do Boxentriq, ou seja a bancada já diz onde ir.

**API.** nenhuma.

**Vetor de teste.** O vetor é o que prova a recusa, e é executável hoje: transcreva a mensagem original do conto ('AM HERE ABE SLANEY') para letras à mão e cole no Decodificador — o `substituicao` é quem responde, com o orçamento de trabalho de 16.600 reinícios×letras já em produção. Nenhum código novo participa dessa cadeia. É esse o teste que mostra que o buraco é de transcrição, não de motor.

**Riscos.** Risco de recusar: uma prova do Challenge usa Dancing Men e a equipe não reconhece o desenho. Mitigação já paga: o ponteiro de sources.ts:449. GATILHO DE REABERTURA (R6): se uma prova do acervo usar Dancing Men, o item volta como legenda COM as 26 figuras, e aí o custo de Cola é aceito conscientemente, não de surpresa.

**Conflito com decisão anterior.** nenhum — estou de acordo com docs/INVENTARIO-CATALOGOS.md:121 ('Hexahue e Dancing Men … entrada é imagem colorida/desenho, sem âncora no acervo e sem bloco Unicode') e com docs/PLANO-CATALOGOS.md:180. A ficha só acrescenta o argumento que faltava: além de não haver entrada, a capacidade de decifrar já existe em casa (substituicao.ts).

**Correção exigida pela crítica.** De acordo com `INVENTARIO:121`, `:72` e `PLANO:180`. O argumento novo é verificável: `substituicao.ts` está no leque com `ORCAMENTO_TRABALHO = 16_600` na **linha 87** ✓, e o ponteiro de `sources.ts:449` nomeia Dancing Men ✓. A aba Arquivo tem mesmo só `exif/lsb/planos/codigo` ✓. Gatilho de reabertura escrito ✓ (R6 satisfeita).

#### 14.8 · Theban (alfabeto das bruxas)

`recusar` · **zero se recusado** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** 24 glifos, sem bloco Unicode, entrada por foto — decoder fora pela regra do pigpen. E como legenda ele reprova no teste que importa: o único conteúdo que caberia sem tabela de 24 desenhos são as colisões I/J e U/V/W, e saber que I e J colidem NÃO ajuda ninguém a identificar um glifo que está olhando. Legenda que não converte desenho em letra é enfeite. A triagem ainda registra cobertura_acervo = A10, ou seja é troca de tabela dentro de uma família que o acervo já rodou 4 vezes.

**Portão.** Não pode existir — sem bloco Unicode não há string para casar.

**Rejeição medida.** não se aplica. Zero impacto no fan-out.

**Autoverificação.** não se aplica.

**Arquivos.** nenhum.

**API.** nenhuma.

**Vetor de teste.** O vetor é a falsificação da hipótese de legenda: escreva as duas linhas que caberiam ('I e J são o mesmo glifo; U, V e W são o mesmo glifo') e tente usá-las para ler uma foto de Theban. Não dá — falta a correspondência glifo→letra, que é a parte cara. Se a prova entregar a tabela, a tabela já resolve e a Cola não acrescenta nada.

**Riscos.** Risco de recusar: baixo. r/codes registra 3 posts + 9 comentários, a triagem dá LACUNA_MORNA. GATILHO DE REABERTURA (R6): se uma prova usar Theban SEM entregar a tabela — só então a legenda com os 24 glifos compra alguma coisa, e nesse dia ela entra no mesmo formato da Section de runas (tabela do que ENGANA, não os 24 desenhos).

**Conflito com decisão anterior.** nenhum explícito: Theban não é nomeado em INVENTARIO-CATALOGOS.md. Cai por analogia direta no grupo 'chega como imagem e não tem âncora' de docs/PLANO-CATALOGOS.md:180, e estou de acordo.

**Correção exigida pela crítica.** O teste "legenda que não converte desenho em letra é enfeite" é o certo, e `alfabetos-visuais.ts:1–17` já tem a posição da casa quase nessas palavras ✓. Gatilho escrito ✓.

#### 14.9 · Moon type (alfabeto tátil de William Moon)

`recusar` · **zero se recusado.** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Sem bloco Unicode e sem notação textual, então decoder está fora. E, ao contrário de todos os outros da fatia, ele compete de frente com uma capacidade que a bancada JÁ TEM e tem melhor: o Braille, que é o mesmo nicho (tato, relevo, madrugada às escuras) com bloco Unicode próprio (U+28xx) e decoder pronto — src/features/reference/braille.ts com BRAILLE_TO_LETTER, 26 letras mais o espaço, compartilhado entre o codec `braille` e o inspetor de espaços em branco. Trazer o Moon é gastar espaço de Col …

**Portão.** Não pode existir — não há bloco Unicode e a entrada é relevo fotografado.

**Rejeição medida.** não se aplica. Zero impacto no fan-out e no bundle.

**Autoverificação.** não se aplica.

**Arquivos.** nenhum.

**API.** nenhuma.

**Vetor de teste.** O vetor é a comparação que decide: ⠓⠑⠇⠇⠕ já é lido hoje pelo codec `braille` a partir de caracteres colados, com a tabela em braille.ts, e o Braille tem bloco Unicode. O Moon não tem — a mesma mensagem em Moon não produz caractere nenhum para colar. A pergunta 'qual dos dois a prova vai usar' se responde pelo mesmo lado das duas vezes.

**Riscos.** Risco de recusar: mínimo. r/codes registra 2 posts + 1 comentário para 'moon script/type/alphabet' — a menor contagem da fatia depois do Suzhou. GATILHO DE REABERTURA (R6): se aparecer uma prova de acessibilidade que use Moon em vez de Braille. Nenhum sinal aponta para isso.

**Conflito com decisão anterior.** nenhum: 'moon' não é nomeado em INVENTARIO-CATALOGOS.md. Cai por analogia no grupo 'chega como imagem' de docs/PLANO-CATALOGOS.md:180.

**Correção exigida pela crítica.** `braille.ts` existe com `BRAILLE_TO_LETTER`, 26 letras + espaço, compartilhado entre o codec e o inspetor de espaços ✓ — a comparação é exata. **Acrescente**, sem mudar o veredito: `PENDENCIAS.md` item 1.4 registra que `decodeBraille` troca o desconhecido por `?` e entrega `⠼⠁⠃⠉` como `?abc`. O vizinho que a ficha chama de resolvido tem defeito aberto — o que reforça a recusa.

#### 14.10 · Tom-Tom code

`recusar` · **zero se recusado.** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Recusado por procedência, não por formato — e essa distinção importa porque a régua da casa já matou dois itens exatamente assim. A triagem registra que a única fonte é o Omniglot e que o próprio dCode desaconselha a tabela; ou seja, a correspondência glifo→letra não tem fonte que a sustente. É a mesma razão pela qual a triagem recusou Vulcan ('tabela declarada tecnicamente incorreta pelo próprio Vulcan Language Institute — usar uma correspondência que a fonte canônica repudia é risco de gabarit …

**Portão.** Não pode existir. O suporte são riscos / e \ numa tábua — sem bloco Unicode, sem notação, e mesmo transcrito para barras o resultado colide com qualquer sequência de barras (data, fração, caminho, base64).

**Rejeição medida.** não se aplica como decoder. Se alguém insistisse num decoder de '/' e '\', a rejeição seria PÉSSIMA: barras aparecem em data (25/07/2026), em base64 e em caminho de arquivo, todos presentes no corpus de 44.000 — seria a receita de resposta errada com nota alta que a R2 nomeia.

**Autoverificação.** não se aplica.

**Arquivos.** nenhum.

**API.** nenhuma.

**Vetor de teste.** O vetor negativo é o que fecha a porta do decoder: '25/07/2026' e '8/8/8/8' são strings reais da bancada compostas quase só de barras e dígitos. Um portão de '/'+'\' as aceitaria. E o vetor da tabela é o argumento de procedência: sem uma segunda fonte independente do Omniglot, qualquer leitura publicada é a nossa palavra contra a de ninguém — e se a prova mandar a tabela junto, a tabela já resolve e a bancada não acrescenta nada.

**Riscos.** Risco de recusar: baixo. r/codes: 7 posts + 5 comentários. GATILHO DE REABERTURA (R6): aparecer uma segunda fonte independente da tabela, OU uma prova do acervo que use Tom-Tom entregando a tabela — e nesse caso a legenda vira desnecessária, o que é justamente o argumento.

**Conflito com decisão anterior.** nenhum: Tom-Tom não é nomeado nos documentos. A recusa reaproveita a régua de procedência já aplicada a Vulcan e Falmer na triagem.

**Correção exigida pela crítica.** Recusa por procedência, e o vetor negativo é bom: `25/07/2026` e `8/8/8/8` são strings reais da bancada — e `8/8/8/8/8/8/8/8` é literalmente a que a ficha do FEN precisa barrar com piso de peças. A colisão não é hipótese. Coerente com a régua já aplicada a Vulcan/Falmer.

#### 14.11 · Telégrafo de Chappe

`recusar` · **zero se recusado.** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Os vocabulários operacionais originais se perderam — está registrado na própria triagem — e isso significa que a tabela teria de ser INVENTADA pela casa. Uma bancada que inventa a tabela e depois apresenta o resultado como leitura é a definição literal do pior defeito que a R2 nomeia: resposta errada com nota alta, sem nada na tela que avise. As 92 posições de braço são vistosas e imprimem bem; nenhuma delas tem significado que possamos afirmar.

**Portão.** Não pode existir: sem bloco Unicode e sem tabela defensável, não há nem string nem semântica. E a variante 'alfabeto de 26' que circula é uma redução moderna, não a operacional.

**Rejeição medida.** não se aplica.

**Autoverificação.** não se aplica — e é exatamente o buraco: mesmo com a tabela inventada, não haveria nada contra o que conferir a leitura.

**Arquivos.** nenhum.

**API.** nenhuma.

**Vetor de teste.** Não é possível construir um vetor honesto, e isso É o resultado do teste: um vetor claro→cifrado→claro exige uma tabela, e a tabela que existiria seria a nossa. Comparação que fecha o caso: o ogham desta mesma fatia tem vetor (BLUMENAU → ᚁᚂᚒᚋᚓᚅᚐᚒ → BLUMENAU) porque a correspondência é padronizada e está no Unicode; o Chappe não tem, e nenhuma quantidade de trabalho produz um.

**Riscos.** Risco de recusar: baixo. r/codes: 3 posts + 1 comentário. GATILHO DE REABERTURA (R6): uma prova entregar a tabela junto — e nesse caso a prova já resolveu o problema, o que é o argumento. A triagem também nota que A10 já propõe 'semáforo naval de bandeiras', que é o mesmo gesto com outro objeto, e o semáforo já está descartado por escrito na R9.

**Conflito com decisão anterior.** nenhum direto, mas o parente próximo tem decisão escrita: docs/PLANO-CATALOGOS.md:228 (R9) registra que 'semáforo naval é descartado como decoder e condicionado como legenda, não as duas coisas', e docs/INVENTARIO-CATALOGOS.md:72 recusa 'Semáforo de braços, Dancing Men, Hexahue' por não haver notação textual padronizada. O Chappe é o mesmo mecanism …

**Correção exigida pela crítica.** "Não é possível construir um vetor honesto, e isso é o resultado do teste" é a forma certa do argumento. R9 está em `PLANO-CATALOGOS.md:228` ✓ e `INVENTARIO:72` ✓, ambos citados corretamente.

#### 14.12 · Hexahue

`recusar` · **zero se recusado** · crítica: **MANTÉM** · fatia: Cola e tabelas pequenas

**Por que esse destino.** Recusado nas duas portas. Como decoder: o caractere é um bloco 2×3 de COR numa imagem, e a bancada não tem amostragem de grade — conferi o que a aba Arquivo faz hoje em src/features/arquivo/imagem/, e são exif.ts, lsb.ts, planos.ts e codigo.ts (leitor de código de barras nativo ou jsQR); nenhum extrator de grade, nenhum quantizador de cor, nenhum alinhamento de bloco. Como legenda: são 38 caracteres (26 letras + 10 dígitos + espaço + ponto) mapeados por combinação de 6 cores, e uma tabela de 38 …

**Portão.** Não pode existir hoje. Um portão textual precisaria de uma notação de cor por bloco que ninguém escreve à mão; um portão de pixel precisaria do tamanho e do alinhamento do bloco, que é o trabalho que não existe.

**Rejeição medida.** não se aplica — nada roda.

**Autoverificação.** não se aplica.

**Arquivos.** nenhum. O ponteiro já existe em src/features/reference/sources.ts:449, que nomeia Hexahue dentro da nota do Boxentriq.

**API.** nenhuma.

**Vetor de teste.** O vetor mostra onde a corrente arrebenta: mesmo com a tabela das 6 cores na mão, para ler um mosaico de 10 caracteres é preciso saber onde cada bloco 2×3 começa — e é isso que nenhum código nosso responde. A prova disso é o que a bancada JÁ faz e como: o QR é lido porque existe leitor nativo (imagem/codigo.ts:85, temLeitorNativo) com o alinhamento resolvido pela especificação do próprio código; o Hexahue não tem especificação de alinhamento.

**Riscos.** Risco de recusar: real. r/codes registra 11 posts + 13 comentários e a triagem dá prova_fit 5 com LACUNA_QUENTE — é o item recusado mais forte da fatia. GATILHO DE REABERTURA (R6), e este é concreto: se a aba Arquivo ganhar amostragem de grade sobre imagem (o caminho já parcialmente pago pelo leitor de código), Hexahue e soroban entram juntos, porque passam a ter entrada.

**Conflito com decisão anterior.** nenhum — estou de acordo com docs/INVENTARIO-CATALOGOS.md:121 e :72 e com docs/PLANO-CATALOGOS.md:180. O que esta ficha acrescenta é o gatilho de reabertura em termos de capacidade nossa (amostragem de grade), em vez de 'reabrir se uma prova usar', que é um gatilho que ninguém controla.

**Correção exigida pela crítica.** Verificado: `src/features/arquivo/imagem/` tem exatamente `codigo.ts`, `exif.ts`, `lsb.ts`, `planos.ts` (+ testes e components) — sem amostrador de grade, sem quantizador de cor ✓. `temLeitorNativo` em `codigo.ts:85` ✓. O gatilho de reabertura em termos de **capacidade nossa** (amostragem de grade), e não "se uma prova usar", é a forma superior — deveria ser o molde das outras recusas.
---

## 5 · O que este plano recusa, com gatilho

Recusa sem gatilho escrito volta como proposta na passada seguinte. As nove abaixo já vêm com o
gatilho.

| item | por que não entra | gatilho de reabertura |
|---|---|---|
| **Dancing Men** | Entrada é desenho de boneco: sem bloco Unicode e sem notação textual — fora pela mesma regra do pigpen. E, transcrito, é substituição monoalfabética com fronteira de palavra, que o `substituicao` já quebra. | Uma prova do acervo usar Dancing Men **e** a equipe reclamar de transcrição. Aí o item é legenda, não decoder. |
| **Theban** | 24 glifos, sem Unicode, entrada por foto. Como legenda, o único conteúdo que caberia sem desenhar 24 formas são as colisões I/J e U/V/W — informação pequena demais para uma linha de Cola. | Alguém desenhar a tabela em SVG e doar; ou uma prova real chegar com Theban. |
| **Moon type** | Compete de frente com uma capacidade que a bancada já tem melhor — o Braille cobre o mesmo nicho (tato, relevo) com decoder, legenda e bloco Unicode. | Um artefato tátil real de Moon aparecer numa prova. |
| **Tom-Tom** | Recusado por **procedência**: a única fonte é o Omniglot e o próprio dCode desaconselha a tabela. Bancada que publica tabela sem procedência produz leitura com nota alta em cima de fonte frágil. | Uma segunda fonte independente publicar a mesma tabela. |
| **Telégrafo de Chappe** | Os vocabulários operacionais se perderam: a tabela teria de ser **inventada** pela casa e depois apresentada como leitura. É exatamente o defeito que a régua chama de pior. | Publicação acadêmica com a tabela reconstruída e citável. |
| **Hexahue** | Recusado nas duas portas. Decoder: o caractere é um bloco 2×3 de **cor numa imagem**, e a aba Arquivo não tem amostragem de grade (só `exif`, `lsb`, `planos`). Legenda: sem a grade, a tabela não se aplica. | A aba Arquivo ganhar amostragem de grade de cor (por outro motivo). Aí o Hexahue entra de carona. |
| **Notação SAN (lista de lances)** | Derrubada pela crítica: é o segundo ramo do mesmo decoder do FEN e o que carrega mensagem numa cifra de tabuleiro são as **casas de destino**, que a aba Matriz e o `grid-read` já leem. | O FEN entrar e alguém trazer uma prova em lances, não em posição. |
| **Solver de Morse fracionado sem a chave** | Recusa **medida**, não estimada: a arquitetura do Pollux/Morbit não transporta — o espaço de busca não poda pelo Morse, porque toda atribuição produz Morse válido. | Uma prova chegar em FM sem chave. Enquanto isso, o modo com chave resolve. |
| **Nomenclator** | Reprova por redundância, não por perigo: sem assinatura própria (é uma lista de números indistinguível da homofônica e do A1Z26) e, com a tabela dada, é o mesmo caminho do `homofonica-tabela`. | O `homofonica-tabela` existir e alguém pedir código-de-palavra. Aí é **uma linha de regex** no parser, não um decoder. |

Além dessas, a triagem que originou este plano recusou **99 mecanismos** com razão escrita —
máquinas de rotor, esolangs, bases sem tração, alfabetos de ficção em volume, cifras ACA de cadeia
longa. A lista completa está no relatório do garimpo; o que muda aqui é que as nove acima foram
recusadas **contra o código**, não contra o catálogo.

---

## 6 · Riscos

Os riscos R1–R9 do [`PLANO-CATALOGOS.md`](PLANO-CATALOGOS.md) continuam valendo. Estes cinco são
novos, e três deles foram achados pela crítica adversarial, não pela especificação.

**R10 · `required` nunca foi exercitado.** A ficha que se apoiava em "o campo obrigatório já é usado
por 6 decoders" está **errada**, e a crítica provou: `grep -rn "required" src` fora de testes devolve
três linhas de produto — `types.ts:28` (o tipo), `use-decoder.ts:357` (o filtro) e
`decoder-workbench.tsx:137` (o rótulo). Seis decoders declaram `inputs`; **nenhum** declara
`required`. Quem entrar primeiro é o primeiro usuário de um caminho não exercitado, no hook e na UI.
Não mata ficha nenhuma — obriga teste do **filtro**, não só do decoder.

**R11 · `ctx.aux` é um campo global, então `required` é uma chave geral.** `use-decoder.ts:69` tem
um único `aux`. No instante em que alguém digita a segunda chave do Nihilist ou a palavra colunar do
ADFGVX, todos os outros decoders que pedem `aux` entram juntos no leque, sobre a mesma entrada. O
argumento "custo por tecla zero" vale só enquanto o campo está vazio — e são justamente as fichas
que o enchem que se apoiavam nele. Mitigação: rótulo por cifra (`InputSpec.label` já existe) e o
card dizendo **o que consumiu**; e não marcar `aux` como obrigatório em mais de um decoder da mesma
forma de entrada.

**R12 · o "teto de 0,70" é regra nova, não convenção da casa.** Seis fichas o citam como se já
existisse. Não existe: o análogo mais próximo (`alfabeto-chave`, que também aplica chave dada e
também só se autoverifica por vocabulário) **não usa `forcedScore`**; só `substituicao.ts:330`,
`transposicao.ts:200` e os lookups usam. Criar a regra é legítimo — importá-la como se fosse
herança, não. Se ela entrar, entra uma vez, escrita, e as fichas passam a citá-la.

**R13 · o leque cresce, e a conta honesta separa "não emitir" de "não rodar".** Trinta fichas pedem
lugar no leque; oito declaram campo obrigatório e só correm com ele cheio. As outras 22 rodam a cada
tecla — mas parte delas lê `ctx.key` e devolve `[]` sem chave, o que **não** é a mesma coisa: não
emitir card é grátis no ranking e caro no relógio. A conta de custo por tecla tem de ser medida
depois da onda 11, com o `affine` (312 variantes) como régua.

**R14 · o `polybius` de hoje já não passaria na régua.** A medição que abre a onda 11 foi reproduzida
pela crítica: o decoder emite card em **51,0%** do tráfego típico (o corpus tem CEP e quadra reais de
Blumenau), contra o piso de 79,8% de rejeição da R1. O portão estrito leva a rejeição a **94,75%**.
Isso é conserto de defeito em produção, da mesma classe da Onda 0 — e é pré-requisito da família
inteira, porque `bifid` e `playfair` compartilham o quadrado. O risco é o mesmo de toda mudança de
comportamento em decoder antigo: o `decoders/README.md` usa o `polybius` como exemplo, e há teste
prendendo o número velho.

**R15 · três filas ao mesmo tempo.** Com este documento existem `PLANO-CATALOGOS`,
`PLANO-EXECUCAO-2026-08` e este. **Regra:** esta é a única que numera ondas a partir de 11; as
outras duas são histórico e não recebem item novo. Quem for executar lê esta e só volta às antigas
para conferir uma decisão citada.

---

## 7 · Decisões que são do dono

Nove decisões, e nenhuma delas é de engenharia — todas são de produto ou de veredito. As fichas
correspondentes trazem o argumento completo.

| # | decisão | recomendação da ficha |
|---|---|---|
| D1 | **ADFGX/ADFGVX**: manter "só o chip" (`INVENTARIO-CATALOGOS.md:49`) ou aceitar o decode em `ctx.only` com as duas chaves? | Aceitar em `ctx.only`. O argumento original — "cifra que exige chave sem entregá-la zera" — vale para quem **recebe** a prova; quem **escreve** a prova tem as duas chaves. |
| D2 | **Homofônica**: reverter uma recusa escrita em três documentos vale um decoder de ~10,5 h para uma cifra com **zero** ocorrências no acervo? | A varredura diz que é a lacuna clássica mais citada do r/codes (156 menções). A ficha entrega o número que decide: com 40 símbolos e 200 caracteres **não resolve em orçamento nenhum**; só serve a partir de ~600 símbolos. |
| D3 | **Numerais cistercienses**: promover de `descartar` para `legenda-na-cola` contraria três linhas escritas. | A ficha argumenta a promoção; a crítica manteve, marcando que é decisão do dono. |
| D4 | **Base do painel Kemler/ONU**: ANTT 5.998/2022 em pt-BR ou 49 CFR 172.101 em inglês? Carga preguiçosa local ou `seed-data` + API? | ANTT, preguiçosa local. |
| D5 | **Tabela WMI do VIN**: ~180 prefixos curados (~8 KB, cabe no bundle) ou a lista vPIC inteira (~35 mil registros, aciona a R4)? | Os 180. |
| D6 | **Tabela do silabário**: sem uma tabela publicada na Cola, o decoder não tem o que decodificar. | Carimbar a proposta da ficha ou trocá-la — mas escolher. |
| D7 | **Grandpré e Swagman**: os dois só valem se você quiser **autorar** prova com eles. | Se a resposta for "não vou usar", ficam na gaveta com gatilho e não viram código. |
| D8 | **Cifra de livro**: modo (a) — texto-fonte no 2º campo — sozinho é ~1,5 h e fecha o que o r/codes usa; o modo (b) é o que fecha a prova real do acervo e custa o resto. | Fatiar: (a) na onda 12, (b) na 14. |
| D9 | **PLU e POSTNET**: aceitar que o PLU nasce fora do leque (só literal, modo solo e legenda) e confirmar/derrubar a hipótese CEPNet antes de o ramo de 47 barras sair rotulado como fato. | Aceitar; e não publicar o ramo de 47 barras como fato antes da confirmação. |

---

## 8 · O que muda em documento

R6 diz que item fechado sem linha de documento é item que a próxima passada reabre. Esta fila toca
quatro superfícies, e as quatro entram no mesmo commit do código:

1. **`docs/INVENTARIO-CATALOGOS.md`** — uma linha por item entregue, com destino explícito. E uma
   **correção**: a linha 50 descreve o portão do Nihilist como "sem 6 a 9 nas posições decompostas";
   no vetor conferido pela crítica, **8 dos 13 números** contêm 6–9. Implementar a linha como está
   escrita rejeitaria o próprio Nihilist. O que a linha quer dizer vale para a **coordenada**, não
   para o **cifrado**.
2. **`src/features/reference/sources.ts:446`** — é a vitrine que o usuário lê, e ela lista como
   ausentes cifras que passam a existir nesta fila. Hoje já está desatualizada em quatro (Morbit e
   Pollux entraram na onda 9).
3. **`docs/PENDENCIAS.md`** — os nove gatilhos de reabertura da §5, na coluna "dono" quando a
   reabertura depender de decisão, "nosso" quando depender só de trabalho.
4. **`docs/PLANO-CIFRAS.md` §8-D8** — a divergência "o 2º campo entrou e quase ninguém o consome"
   passa a ter número: **4 consumidores hoje**, e a onda 12 é a que muda isso.

---

## 9 · Como executar

A ordem é a das ondas, e dentro da onda a ordem é a da tabela — o que não faz ruído primeiro.
Três amarrações que não podem ser invertidas:

- **11.1 antes de toda a família do Políbio.** O quadrado chaveado é a peça comum; o portão estrito
  do `polybius` é pré-requisito de `bifid` e `playfair` continuarem certos.
- **O chip do sniffer antes do solver homofônico.** O chip custa ~2 h e já entrega o diagnóstico
  ("N símbolos para 26 letras"); o solver custa ~10,5 h e só serve acima de ~600 símbolos. Se o
  cronograma apertar, o chip sozinho paga a fatia.
- **A leva de teste do filtro `required` antes da primeira cifra que o usa.** É o caminho não
  exercitado da R10, e ele mora no hook e na UI, não no decoder.

Se o cronograma cortar, corta-se a **onda 14 inteira** — ela concentra 12 itens, ~22,5 h e todas as
decisões pendentes do dono. A onda 11 é a que não se corta: é lá que mora o conserto do `polybius`,
que é defeito em produção, não capacidade nova.
