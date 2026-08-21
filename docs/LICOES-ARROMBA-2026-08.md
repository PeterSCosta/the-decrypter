# O que o acervo da Arromba ensina — e o que fazer com a bancada

> **Análise. Nada implementado, nada decidido.** Escrita em 20/08/2026 sobre as 110 fichas de
> [`ACERVO-ARROMBA-PROVAS.md`](ACERVO-ARROMBA-PROVAS.md) (provas da Gincana Cidade de Blumenau,
> 2025 e 2026), o `Gabarito de Códigos` da própria Arromba, e o código de `src/`.
>
> Seis eixos levantaram 49 propostas; cada uma passou por conferência adversarial contra o
> repositório. **5 foram rejeitadas, 33 reformuladas, 8 aprovadas como vieram** — e
> **25 das 46 conferidas já existiam parcialmente**. Onde o número é medição, digo de quem é.

---

## 0. A resposta curta

**O gargalo não é cifra faltando.** Das 56 fichas com lógica decodificável, quase nenhuma trava por
falta de um algoritmo: trava por **corpus ausente**, por **gramática de entrada estreita demais**,
ou por **a bancada perder o estado no meio da cadeia**. As três coisas custam horas, não dias.

Três frases resumem o acervo inteiro:

1. **A mecânica nº 1 é `A4` — letra por posição indexada — com 26 fichas.** A seguinte (`A25`,
   códigos burocráticos) tem 14. E o parser que serve essa mecânica **rejeita a notação que as
   provas realmente imprimem**.
2. **A resposta quase sempre é uma RUA.** Na madrugada de 2025, oito etapas: rua · rua · associação
   de moradores · código de ruas · rua · praça · rua · rua. **Endereço com número de porta: zero em
   110 fichas. CEP como resposta codificada: uma.**
3. **Existe relógio impresso.** 41 das 110 fichas trazem prazo; a madrugada de 2026 dá
   `LIMITE DA ETAPA` de hora em hora (21:59:59 → 02:59:59). O `QUEBRAR-PROVAS.md` não menciona
   orçamento de tempo em lugar nenhum.

---

## 1. Antes de qualquer número: o denominador estava inflado

Registro porque quase toda proposta deste lote errou nisso, e a conta certa muda a ordem.

As 110 fichas cobrem **61 números de prova distintos**, e **49 fichas são `nao-aplicavel`** (prova
de execução — vídeo, artesanato, passeata). Pior: as fichas `00` são **gabaritos que redocumentam
provas já contadas**, e o campo de lacuna é compartilhado por arquivo — então uma mesma lacuna
aparece 3 e 5 vezes.

Caso extremo: `letter-index` é citado em **29 fichas**, que são **11 provas reais**. O que sobrevive
à correção é o essencial: **`A4` continua sendo a mecânica nº 1 com folga.**

Daqui em diante conto **provas distintas servidas**, não fichas.

---

## 2. Bloco A — consertos: o que já existe e está estreito ou mentindo

**Este é o bloco de maior retorno, e é onde o acervo mais bate.** Conferi pessoalmente os quatro
primeiros itens no código.

| # | Onde | O defeito | Custo |
|---|---|---|---|
| **A1** | `positions/zip.ts:153-156,173` | `PAIR` = `/^[A-Za-z]?(\d+)[A-Za-z](\d+)$/` **exige uma letra entre os números**; `DOTTED` exige ponto; o split (`/[\s,;\|/]+/`) **não inclui hífen**. Logo `7-3` não casa nada, `parseIndexSpecs` é tudo-ou-nada e devolve `null` — e o `letter-index` **nem acende**. Duas regex derrubam a mecânica nº 1 do acervo | horas |
| **A2** | `positions/extract.ts:51-57` | `parsePositions` quebra em `/[^0-9]+/`: a trinca `8-4-3` vira `[8,4,3]` **e a aba entrega a leitura achatada como resultado, formatada, sem uma linha de aviso**. É pior que o A1 — o A1 ao menos cala | horas |
| **A3** | `diff/diff.ts:41` | `changedA: Set<number>` já guarda *"os índices das palavras que entraram em algum trecho"*. **O ordinal já está computado**; as tiras copiáveis do painel não incluem a única que a prova pede | minutos |
| **A4** | `sniff.ts:117` vs `:127,:136` | `ean-bad` imprime *"o dígito verificador deveria ser X, não Y"*; `cpf-bad` e `cnpj-bad` têm `detail` fixo (*"o DV não fecha"*). **Nove linhas de distância**, mesmo arquivo | minutos |
| **A5** | `sniff.ts:53-60` | O `every()` faz uma lista A1Z26 com **um** intruso não acender chip nenhum |  minutos |
| **A6** | `title-hints.ts:314,350,400` | Três regex erradas por plural ou domínio — ver §3 | horas |
| **A7** | `App.tsx:291-315` | Trocar de aba **desmonta o painel e apaga a colagem**. `matrix.ts:16` promete que "o localStorage engole o estado inteiro" e nada o faz | horas |
| **A8** | `acrostic-nth` | `nth()` já é parametrizada por k; falta **k variável** (⌈n/2⌉ = letra central) | horas |
| **A9** | `ciphers.ts:283,301` | `keyboard` aplica um delta único à string inteira; a folha da prova 26 imprime **sinal por letra** | horas |
| **A10** | `music-notes.ts:20` | A regex captura a letra e **descarta a oitava** — e `arquivo/audio/notas.ts:56-71` já tem a aritmética MIDI inteira do outro lado | horas |
| **A11** | `positions/extract.ts:35` | `countUnits` conta "tudo" ou "só letras" — nenhum dos dois dá **81** numa grade 9×9 colada com quebras de linha |  minutos |
| **A12** | `lookups.ts:13,137` | `fold` preserva espaço → `JOSEDOSSANTOS` e `RTAPAJOSFIM`, que são **as saídas literais das camadas**, não casam com rua nenhuma | horas |

**A1 e A2 são a mesma prova falhando de dois jeitos.** A 2026/13-E2 (RECONHECIMENTO, cifra de livro
de três níveis sobre o discurso inaugural da estátua de Fritz Müller) manda `8-4-3|26-8-4|…`: o
`letter-index` fica mudo e a aba Posições responde errado com cara de certo. É a classe de defeito
que a Onda 1 do `PLANO-MELHORIA` existiu para eliminar — "o produto mente sobre si mesmo" — e este
é o membro que sobrou.

---

## 3. O `title-hints` foi calibrado no acervo errado

**Medição minha, rodando o `titleHints()` real contra os 62 títulos distintos das duas páginas:
dispara em 5, e só 1 está certo.**

| título | dica emitida | veredito |
|---|---|---|
| PRA RUA! | `cep` → `cep-exact`, `street-name` | ✅ a prova **é** prefixo de CEP |
| ENDEREÇO | `cep` → `cep-exact`, `street-name` | ◐ a prova é **IPv4** → `street-code`: família certa, entrada errada |
| FISCALIZAÇÃO | `fiscal` → `math-helper` | ✗ casou por substring |
| PREFEITURA NOS BAIRROS | `cep` → `cep-exact` | ✗ é prova de comparecimento |
| RIVAGE 40 ANOS | `data` → `date-key` | ✗ é checklist de curadoria |

E deixa passar os dois títulos que **nomeiam a mecânica em português claro**: **PALÍNDROMO** (A22) e
**INICIAIS** (A1, acróstico). Rodado sobre as 110 fichas por outro caminho, o quadro é o mesmo:
29 acendem, mas **16 são só "sequência"**, e entre títulos próprios são 2 acertos para 1 erro.

A razão é honesta e está no próprio docstring: o módulo foi calibrado na **GIA**, onde o título é
charada (*Prova quadrada*→raiz quadrada, *I lingii di i*→cifra vocálica). **A GCB nomeia a mecânica
direto** — o caso mais fácil possível, e é o que não dispara. Duas causas confirmadas:
`/inicial/.test('iniciais') === false` e `/aniversario/.test('aniversariantes') === false`.

**Ressalva que veio da conferência, e é boa:** não acenda chip de decoder em PALÍNDROMO, ONDE ESTOU
e INICIAIS. As três provas têm `decoders: []` no próprio veredito do acervo — são execução, não
cifra. O que essas dicas devem sugerir é a **leitura** ("o título nomeia a mecânica: leitura
reversa"), não um decoder para rodar. Acender decoder onde nada está cifrado é o ruído que o
docstring proíbe.

---

## 4. Bloco B — peças novas

**Entram** (custo horas, portão medido):

- **Chips estruturais no farejador** — a assinatura que ninguém vê às 2 h da manhã: *todas as
  palavras têm tamanho ímpar* (⇒ existe letra central), *o total de caracteres é quadrado perfeito*
  (⇒ o passo é √total), *a grade contém letras que não existem no alfabeto geohash*. Taxa base
  medida: todas-ímpares dá 17,9% em N=3 mas **1,35% em N=8** — daí o portão obrigatório de
  **≥8 unidades**, não ≥3.
- **`Cell.cor` na Matriz + ordem de leitura por nome de cor.** Fica barato porque
  `src/features/reference/colors.ts` **já tem as 11 cores do gabarito** — e hoje tem **zero
  consumidores**.
- **Saída "letras não marcadas"** na Matriz: é o estêncil já existente, invertido.
- **Índice das provas da GCB como corpus** — o dado já está transcrito no nosso próprio
  `ACERVO-ARROMBA-PROVAS.md`. Cuidado com colisão: 2026 renumera por cima de 2025.

**Ficam com gatilho escrito** (boa ideia, hora errada):

- **Solucionador de caça-palavras** — economiza 25–40 min, o maior ganho isolado do lote, mas serve
  **uma** prova, custa um dia, e o resíduo só vira `RTAPAJOSFIM` **depois** de `Cell.cor`. Dois
  itens de "dia" encadeados para uma prova. Entra quando houver uma segunda prova transcrita.
- **POI e água do OSM** — 125 POIs nomeados e 42 elementos de água, medição reproduzida ao vivo.
  Entra com portão declarado (`poi-nome` ≥4 letras, acerto exato ou prefixo; `poi-perto` só com
  coordenada dentro da bbox do Vale). **Portão declarado é condição, não detalhe.**
- **Aba Listas** e **cadastro do Neumarkt via CNPJ** (multi-GB, e razão social de MEI é problema).

---

## 5. Bloco C — procedimento: grátis, e o mais subestimado

Sete regras que o acervo escreve e o `QUEBRAR-PROVAS.md` não tem. Custo: uma tarde de escrita.

1. **A resposta é uma rua.** Antes de perseguir geocódigo exótico, pergunte que rua é.
2. **O caça-palavras entrega o RESÍDUO, não o cruzamento.** O `title-hints.ts:583` afirma o
   contrário — e está certo para a GIA, **errado para a GCB**. Uma frase vale 30 minutos.
3. **Paridade é assinatura.** Todas as palavras ímpares ⇒ o autor construiu para haver letra central.
4. **O contorno do hífen, para usar hoje:** troque `7-3` por `7.3` — o `DOTTED` já resolve e devolve
   `{source: 7, position: 3}`. **Vale 10 minutos por prova de índice e custa uma linha de
   documentação.** Enquanto o A1 não entrar, é o item de melhor retorno do documento inteiro.
5. **O relógio, escrito.** Madrugada 2026: 1 h por etapa. Topiário 2025: 45 min × 8. Sábado: 2–4 h.
6. **Grade colada: conte primeiro.** Total de caracteres quadrado perfeito ⇒ passo = √total. Foi a
   cadeia inteira da 37-E3 numa frase.
7. **Higiene da fila** — `PENDENCIAS.md §1` está **8 de 8 feitos**; rebaixar F14/F16/F8 com gatilho.

---

## 6. O que não vale a pena — e por quê

Uma lista sem recusas não é priorização. Estas caíram por **medição**, não por gosto:

- **Eixo vertical no QWERTY** — refeita a conta das 19 letras da prova 26: **19/19 são vizinhos
  horizontais ±1**. Dobraria as variantes de um `bruteDecoder` em toda entrada por um eixo que
  nenhuma prova usa.
- **Antidiagonal no `grid-read`** — zero evidência no acervo, e cada variante custa em toda entrada.
- **"Salto de N" como leitura ausente** — **já existe**: `positions/extract.ts:42` (`stepPositions`),
  com modo "Passo fixo" e rótulo próprio. A proposta nunca abriu `src/features/positions/`.
- **Reparo de DV por força bruta** — em 3.000 sequências de 11 dígitos inválidas, a média de reparos
  de um dígito é **1,01**, e só 14,1% não admitem nenhum. Dizer "troque o 10º dígito e o CPF fecha"
  em 86% dos casos não é diagnóstico: é o caso base, e manda alguém à rua atrás de quem não existe.
- **`214␣␣8` como par por coluna** — já parseia como dois índices soltos; virar par seria regressão
  silenciosa em qualquer lista de dois índices.
- **`nearestNamedColor` decidindo o nome da cor** — `named-colors.ts:369` chama `#B22222` de
  *"Tijolo refratário"* (ordena sob **T**); a folha da 37-E1 chama de *"vermelho-tijolo"* (ordena sob
  **V**). **A leitura inteira é a ordem alfabética da cor** — sugestão automática que sorteia sob a
  letra errada arruína a resposta sem dar sinal.
- **IPv4 como portador** — 1 ficha em 110, e o `PLANO-2026-08.md:496` já escreveu o argumento
  contra: assinatura fraca que colide com a inscrição imobiliária de Itajaí.
- **F14 CNEFE (2 dias)** — segunda medição independente derruba a razão que a pôs na frente: **zero
  fichas terminam em número predial**.
- **F16 (NAC/Geohash-36, 1 dia)** e **F8 (marco quilométrico, meio dia)** — zero no acervo. *Ressalva:
  o S2 sai desse pacote — ele aparece no Gabarito deles e **não é nosso**, então o argumento "está lá
  porque nós embarcamos" não vale para ele.*
- **Área azul, INCRA, Defesa Civil, Cacarecos** — zero cada no acervo. A matrícula do SAMAE segue
  recusada por privacidade, e **pedir o dump ao colega não contorna isso**: o problema é o dado ser
  de terceiro.

---

## 7. Se só desse para fazer três coisas antes da próxima gincana

### 1 · O bloco do índice — A1 + A2 + A3 · **horas**

As três tocam a mecânica nº 1 do acervo. Uma é **bug de resposta errada** (A2: a aba achata `8-4-3`
e entrega formatado, sem aviso), uma é **dado já computado que não é exibido** (A3: `changedA`), e a
terceira são **duas regex** (A1).

Fecha a **32 SALGADINHO** ponta a ponta e a **26 PROVINHA** sem contar até a 314ª palavra à mão; nas
13-E2, 18-E1 e 37-E1 derruba um dos dois bloqueios (o outro é corpus ou chave física, e nenhuma
proposta o resolve).

**Condição:** o cartão precisa **imprimir a leitura escolhida** — `7-3` admite "fonte 7, letra 3" e
"índices 7 e 3", e a folha não diz qual. Emitir as duas rotuladas; nunca escolher em silêncio.
Sem isso a bancada vira uma máquina de responder errado com confiança.

### 2 · Paridade + letra central — **horas**

O único par do lote em que o antes e o depois foram reproduzidos inteiros. **Antes:** o texto da
29 CONHECIMENTO produz 25 saídas, `BLUMENAU` em **zero** delas, sniffer vazio. **Depois:** um chip
diz *"as 31 palavras têm tamanho ímpar — há letra central em todas"* e a leitura responde
`BLUMENAUEMCADERNOSTOMOINUMEROUM`.

**Condição inegociável:** portão de **≥8 unidades**, não ≥3 — o `keep: 2` do `acrostic-nth` foi
baixado de 4 para 2 justamente porque string curta só de letras entulhava o topo.

### 3 · O estado que sobrevive à troca de aba — **horas**

11 provas declaram cadeia de ≥2 camadas. Uma prova de 3 camadas obriga 3 a 6 idas e voltas
Matriz↔Posições, e **cada saída de aba apaga a colagem** — 196 células na 37-E5, 315 palavras na 26.
São ~6 min por etapa, mas o efeito real é maior: **a rotina que custa quatro trocas de aba não é
rodada** por quem está na rua às 2 da manhã. A folha de método da própria Arromba prova que essa
rotina *é* a rotina — 24 itens na coluna TEXTO, espalhados por quatro abas nossas.

O padrão já está pago no repositório: `lote/estado.ts` (store de módulo + `useSyncExternalStore`),
cujo comentário diagnosticou o defeito por escrito — *"sair da aba é o fluxo, não a exceção"*.
Matriz e Posições primeiro. Traga junto a correção que o Lote já pagou: guardar o texto **dentro**
da rodada, com aviso quando divergir, senão o defeito espelhado (estado velho ressuscitando calado)
troca um problema por outro.

**Por que não o cronômetro:** ele tem a maior frequência de evidência do lote (41 fichas) e o menor
valor por unidade dela — 41 mede quantas folhas imprimem prazo, não quantas vezes um cronômetro
mudaria o resultado. Cabe como quarto item **se custar minutos**; se custar meio dia, não entra.

---

## 8. Nota de método — o padrão que este lote repetiu cinco vezes

Vale registrar porque é o mesmo erro do inventário de 19/08, e vai se repetir:

- `nota-hz` declarou `ja_existe: "nao"` grepando `docs/` por "hertz" e abrindo um arquivo de 56
  linhas — com `arquivo/audio/notas.ts` inteiro ao lado.
- `grade-passo` abriu com *"duas leituras que a bancada não tem"* e uma delas tem **modo próprio**
  na aba Posições.
- `cor-como-chave` apresentou a inversão Branco/Preto como achado próprio; o cabeçalho de
  `colors.ts` já a documentava.
- `pendencias-1-envelheceu` — a proposta que existe para impedir isso — declarou o item 1.5 aberto
  usando `\p{Nd}` como sonda, com `src/lib/digitos.ts` resolvendo por faixa de código.
- `lote-local` desenhou tudo sobre "sem rede, sem orçamento" para uma prova de what3words, que é uma
  chamada ao backend por linha.

**A regra que funciona é uma só: grep por capacidade, não por palavra, e abra o arquivo vizinho
antes de escrever "não temos".**

---

*Análise de 20/08/2026. Os itens A1–A4 e a medição do `title-hints` foram conferidos por mim
diretamente no código; o restante vem da conferência adversarial dos eixos, com arquivo:linha
citado em cada veredito. Nenhuma linha de produto foi alterada.*
