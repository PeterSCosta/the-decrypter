# O acervo de provas da Equipe Arromba — 2025 e 2026

> **Documento de levantamento. Nada implementado.** Escrito em 20/08/2026 a partir das duas
> páginas do dashboard da Equipe Arromba (`/dashboard/provas-2025/` e `/dashboard/provas-2026/`)
> e dos 84 arquivos que elas publicam, espelhados em `acervo-arromba/`.
>
> Método: o índice das duas páginas foi lido na sessão logada do dono (só leitura, nada
> submetido); os 84 documentos foram rasterizados em **195 páginas** e lidos por visão, uma a
> uma; cada mecânica foi depois conferida contra
> [`DICIONARIO-CIFRAS.md`](../../the-logic-lab/scripts/import-historico/acervo/DICIONARIO-CIFRAS.md)
> e contra os 98 decoders de `src/features/decoder/engine/decoders/`.
>
> Onde a leitura não fecha, está escrito **não dá para saber pelo material**. Onde o número é
> contagem minha sobre o papel, está dito.

---

## 0. O resumo, para quem vai ler só isto

**Três achados governam o resto do documento.**

1. **A Comissão de Provas publicou o próprio repertório.** A resolução da prova 03 (NOSTALGIA)
   traz uma lista nomeada de **18 famílias de charada "que já utilizamos diversas vezes"**. Não é
   inferência nossa sobre frequência: é a casa dizendo o que usa. É a peça mais valiosa do acervo
   inteiro e está na §3.

2. **A gincana é metade mobilização, metade enigma.** Das 110 fichas levantadas, **54 não têm
   cifra nenhuma** — doar sangue, gravar vídeo, arrecadar ração. O `DICIONARIO-CIFRAS.md` foi
   escrito sobre um corpus quase inteiramente cifrado (Challenge/GIA) e **não tem família que
   descreva metade deste acervo**.

3. **A bancada resolve pouco, e o motivo não é falta de cifra.** Das 56 fichas com lógica
   decodificável, a bancada de hoje fecha **6**. O que falta quase nunca é o decoder — é o
   **corpus** que o índice aponta (a lista de lojas do shopping, o álbum de figurinhas, o placar da
   própria gincana). Detalhe na §6.

---

## 1. O que as duas páginas publicam

| | 2025 | 2026 |
|---|---|---|
| linhas na página | 60 | 30 |
| provas distintas | 39 (01–39) | 21 (01–21) |
| linhas com PDF anexado | 53 | 30 |
| linhas **sem** PDF | 7 | 0 |
| tipo declarado pelo site | Lógica 40 · Artística 11 · Social 6 · Objetos 2 · vazio 1 | Lógica 17 · Social 7 · Artística 6 |
| status | Entregue 48 · Não cumprida 6 · Cancelada 2 · vazio 4 | Entregue 25 · Não cumprida 4 · Ativa 1 |

**O espelho local está completo e exato:** os 84 arquivos de `acervo-arromba/` correspondem
exatamente às 83 linhas com anexo, sem sobra de nenhum lado. Não há o que rebaixar.

**As 7 linhas de 2025 sem PDF** — 02 NOSSO RIO (cancelada), 03 NOSTALGIA (o *enunciado*; a
resposta está publicada), 15 etapa 2, 19 etapa 6, 23 MERCADO SOLIDÁRIO, 24 TRIBUTO AO ROCK e
34 CRÉDITO. Duas delas doem: **34 CRÉDITO tem resolução publicada e enunciado não**, e
**03 NOSTALGIA idem** — e a NOSTALGIA é justamente a prova mais rica do acervo.

**Os botões "Apoio" são decorativos.** Conferido nas duas páginas: 30 de 30 âncoras "Apoio" de
2026 estão sem `href`, e nenhuma linha de 2025 tem apoio anexado. O que a
[`ARROMBA-INVENTARIO.md`](ARROMBA-INVENTARIO.md) registrava como "PDF de *Prova* e de *Apoio* por
linha" é, na prática, só *Prova*.

### 1.1 Quatro nomes de arquivo mentem — e o índice do site desmente

Isto vale como aviso de indexação, porque quem catalogar pelo nome do arquivo erra:

| arquivo | o que o nome sugere | o que a linha do site diz |
|---|---|---|
| `Rivage-resolucao.pdf` | resolução da 13 RIVAGE 40 ANOS | **03 NOSTALGIA – RESPOSTA** (25 páginas) |
| `PROVA-16-ILUSTRE.jpg` | prova 16 | **15 etapa 1 — ILUSTRE** (a 16 é ANIVERSARIANTES) |
| `Scanner_20250830-1..7.jpg` | folhas anônimas | **provas 29, 27, 28, 35, 30, 31, 33, 36** |
| `Etapa-*-Seq-5*` e `37-pm-etapa-*` | etapas do Topiário | **prova 37**, cujas resoluções a chamam de *Prova da Madrugada* |

O caso do 37 não é defeito: no site as provas 25 **e** 37 se chamam "PM TOPIÁRIO" e a 19 se chama
"PM ESQUENTA" — **PM = Prova da Madrugada**, e Topiário é o patrocinador que dá nome à noite.
As duas leituras são a mesma coisa.

Um defeito real: em 2026 as linhas **14 etapa 1** e **14 etapa 2** (IRMÃOS) apontam para arquivos
diferentes que são **byte a byte idênticos** (mesmo md5). A etapa 2 nunca foi publicada; o link
repete a etapa 1.

---

## 2. Catálogo — 2025

Legenda de cobertura: **✅ coberta** (a bancada fecha hoje) · **◐ parcial** (fecha um trecho) ·
**✗ descoberta** · **—** (não é cifra).

### 2.1 As provas sem cifra (execução, produção, mobilização)

Registradas porque a lógica delas é o *critério de pontuação*, e isso também é informação.

| nº | prova | a lógica que importa |
|---|---|---|
| 01 | SANGUE | 70 doadores no HEMOSC + 10 publicações no Instagram com a placa oficial visível. Contagem **retroativa a set/2024** e auditada por terceiro (relatório do HEMOSC). PC10 |
| 04 | VIAJANTES | entrega de cópia física original de um de 5 filmes de viagem no tempo + 6 caracterizados. **Bônus invertido pela obsolescência do suporte**: Blu-ray +1, DVD +2, **VHS +3** |
| 05 | REELS | 5 motivos, 1 de tema travado (impacto social) e 4 de lista branca; lista negra desclassifica; ≤2 min |
| 06 | VHS | recria uma cena do VHS que a equipe recebeu na semana anterior — repertório **individual por equipe**; entrega o trecho original junto; julgada por ranqueamento |
| 07 | VÍDEO – VIAJANTES DO TEMPO | curta ≤5 min, **avaliação cega** (proibido nome/logo/ficha técnica no vídeo e no pôster, sob desclassificação) |
| 08 | PREFEITURA NOS BAIRROS | comparecimento com **10 integrantes durante todo o período**, rodízio permitido; o corte é o check-in às 08:30 |
| 09 | INSPIRAÇÃO | 5 cortesias para palestra; envio de nome/CPF/e-mail/WhatsApp. Funciona como dobradiça de calendário |
| 10 | TREILER | trailer ≤1 min derivado da 07 — e aqui o **anonimato da 07 é suspenso** de propósito. PC3 |
| 11 | MAKING OF | bastidores 5–20 min, captura horizontal, **só som ambiente** (trilha adicionada é a pegadinha) |
| 12 | SONS DE BLUMENAU | *(cancelada)* escolher 6 de 13 palavras, 15–20 s cada, câmera 100% estática, áudio ao vivo |
| 13 | RIVAGE 40 ANOS | 3 itens obrigatórios + ao menos 5 de 9 sugeridos — checklist com piso e escolha |
| 16 | ANIVERSARIANTES | achar pessoa cuja data de nascimento case com a **data de criação** de um município catarinense; premia a data mais **antiga** → alvo ótimo 30/12/1953 (14 municípios). +1 se a inicial da pessoa casar com a da cidade |
| 20 | NO PALCO DA RIVAGE | artista de lista fechada de 41 nomes; alocação por **ordem de chegada do e-mail** sobre 9 preferências |
| 21 | DESAFIO SICREDI | o recipiente é a unidade de medida (garrafa PET de 2 L cheia de lacres; saco de 100 L de tampinhas) + legenda travada no Instagram |
| 22 | GCBET | **metaprova de aposta** sobre o resultado do festival de vídeos; 8 tabelas de ranking, conta-se acerto exato de posição; rasura anula |
| 27 | ARTE MASCOTE | amigurumi com as 4 cores da logo; vencedor único por **voto popular**, +1 |
| 28 | VALORIZANDO A EXPERIÊNCIA | o papel declara *"não há nenhuma charada"*: achar 1 dos 8 motoristas da BluMob com +60 anos nos terminais, no intervalo entre corridas |
| 30 | RELÍQUIAS | a lista **não vem na folha** — é divulgada em pingos, ≥1 objeto a cada 15 min; entrega única no fim; empate admitido |
| 31 | PALÍNDROMO | maior palíndromo dentro de nome completo de pessoa real, trazida com documento; acento/espaço/cedilha não contam |
| 33 | INICIAIS | **acróstico construído, não decifrado**: uma pessoa por letra do nome do estabelecimento, inicial casando, enfileiradas na ordem |
| 36 | MAKING OF GCB | 5–10 min, ≥5 provas diferentes registradas, só som ambiente |
| 38 | ONDE ESTOU | 6 placas de trânsito em close; reconhecer o local pelo entorno. Duas placas são do mesmo tipo em locais diferentes — o entorno é o que discrimina |

### 2.2 As provas com cifra — fichas

**14 · PRA RUA!** — ◐ parcial · `cep-wildcard`, `location`
Duas camadas, uma física. A comissão entregou três **CEPs gravados em MDF**; a equipe precisa
conseguir três contas de energia da CELESC de 2025 cujos **5 primeiros dígitos** do CEP batam.
Os 3 últimos são livres de propósito — amplia de um endereço para um bairro inteiro.
Prefixos: `89010`, `89040`, `89065`.
*Lacuna:* a bancada resolve o prefixo, mas não valida uma conta da CELESC contra a máscara.

**15 etapa 1 · ILUSTRE** — ✗ descoberta
Charada em verso de duas camadas. Os versos e as três ilustrações convergem para **ABRAÇO**; o
verso *"Tenho até um, para chamar de meu"* vira a chave — o abraço tem **data comemorativa**, e o
fecho converte a palavra num destino temporal.
*Lacuna:* não há na bancada nada que ataque charada em verso, nem base de efemérides. Conferido:
`src/` não tem uma ocorrência de efeméride/comemorativo/feriado e nenhuma fonte da Cola é
calendário.

**17 · GENIO** — ✗ descoberta
**Cifra de índice alfabético + escolha binária**, em três passos. Os 22 tokens usam cada letra de
A a V exatamente uma vez — a letra **não é conteúdo, é a posição**. Reordenados A→V, cada token
oferece **duas letras candidatas**; escolhe-se a que faz a cadeia de 22 ter sentido.
Resultado: `CHARLIECHAPLINCOCAZERO` → apresentar um Carlitos com uma Coca Zero.
*Lacuna:* faltam o passo de reordenação por rótulo e a busca 1-de-2 por posição (2²² ≈ 4,2 M,
trivial). E mesmo com eles o filtro morreria no vocabulário — `charlie` e `chaplin` não estão na
wordlist.

**18 · ENDEREÇO** — ◐ parcial · `location`, `street-code`, `street-law`
Trocadilho com a palavra *endereço*. A ilustração é o diagrama das **classes A–E de IPv4** e não
carrega dado: serve para dizer "isto é um endereço IP". O payload está na faixa de host da
Classe A: `71.253.40.80`.
*Lacuna:* falta o passo que reconheça a notação IPv4 como portadora e ofereça os octetos ao
`street-code`; e falta critério de desempate, porque a base devolveria quatro ruas dispersas.

**19 · PM ESQUENTA** *(madrugada de sexta, 6 etapas; a 6 não foi publicada)*

- **E1** ✗ — narrativa + **planta baixa** com 5 cômodos rotulados (ÁREA DE SERVIÇO, LAVABO,
  VENTILAÇÃO, HORTA DOS ABACATES, HALL). A regra de leitura não está impressa; `ALVHH` e afins
  não formam nada. *A bancada não tem superfície que receba desenho/planta.* **confiança baixa**
- **E2** ◐ · `poste`, `digit-regroup` — tabela de faixas de consumo × valores em reais (padrão
  CIP/COSIP) com **um algarismo mascarado por linha**; recuperar os 5 dígitos contra a tabela
  oficial. *Falta a base de tarifa por faixa.*
- **E3** ✗ — fotos de rua **recortadas** de modo que só sobra o começo do nome pintado no asfalto
  (`R.`, `R. B`, `R. S…`). O dispositivo é o enquadramento, não uma cifra. *`street-name` exige 3
  letras; `R. B` nem dispara.*
- **E4** — sem cifra: identificar o centro de jardinagem de arranjos escuros e ir até lá.
- **E5** ◐ · `letter-index` — faixa com 23 tokens `a.b` (a ∈ 1..12, b ∈ 1..92) = índice de dois
  níveis, resposta de 23 caracteres, compatível com `RUA <NOME>`. O gancho é *"os reais nutrientes
  de seus fabulosos refúgios florais"* — os 12 refúgios são a lista a indexar. **O corpus não está
  na folha.** *`letter-index` já parseia o formato pontuado nativamente; falta só o corpus.*

**25 · PM TOPIÁRIO** *(4 etapas)*

- **E1** ◐ · `location` — oito **Plus Codes curtos 4+2** sem prefixo (implícito `585G`, Blumenau),
  cada um etiquetado com uma letra. Decodifiquei os oito e todos caem em Blumenau
  (`3WW5+G3` → −26,9025/−49,0911; `3WGV+5Q` → −26,9234/−49,0544; …). *A bancada plota os pontos
  mas não diz o que existe em cada um — não há camada de POI.*
- **E2** ✗ — silhueta de um lote + o número `109 757-983`. *Não existe busca por forma na bancada:
  a base de lotes guarda só o centroide.* **confiança média**
- **E3** ✗ — enigma verbal (ÁGUA "quando atinge a cota máxima") + uma mancha. Verifiquei por
  processamento de imagem: a mancha é **espelhada em torno de um eixo vertical (93% de
  coincidência)** e cada metade isolada não desenha letra — é Rorschach mesmo. A revelação não está
  impressa e o scan mostra o quadro **ainda não revelado** (revelação física, A17).
  **confiança baixa**
- **FINAL** — não é enunciado nem gabarito: é o cartão-prêmio do ponto final. Única informação
  operacional: *"vocês foram a 3ª equipe a perder"* — registra colocação.

**26 · PROVINHA MAIS OU MENAS** — ◐ parcial · `letter-index`
Uma das mais bem construídas do acervo. O texto tem **exatamente 315 palavras** e a tabela tem
**exatamente 315 letras** (21×15): palavra nº N ↔ letra nº N. Os **19 erros propositais**
("mais" por "mas", "menas" por "menos") marcam quais posições valem — posições 81, 92, 105, 108,
114, 121, 139, 141, 162, 164, 191, 194, 208, 223, 260, 268, 278… As letras resultantes se leem no
**teclado QWERTY**. Resposta: **DICIONÁRIO MICHAELIS**.
*Lacuna:* a aba Diferenças acha as 19 palavras trocadas, mas nenhuma tira devolve o **ordinal de
palavra** de cada troca — o `changedA` já guarda o índice do token, falta expor a tira.

**29 · CONHECIMENTO** — ◐ parcial · `acrostic`
**Letra central de cada palavra.** Pista estrutural: todas as 31 palavras têm número **ímpar** de
letras, logo toda palavra tem uma letra exatamente no meio; e os parágrafos estão **centralizados**,
o que alinha as letras do meio numa coluna. Lendo a coluna: **BLUMENAU EM CADERNOS TOMO I NUMERO
UM** — entregar o periódico.
*Lacuna:* falta em `acrostic.ts` a variante "letra central de cada palavra" (e um detector que
acenda quando **todos** os tamanhos são ímpares); `counts.ts` conta letras por linha, nunca por
palavra.

**32 · SALGADINHO** — ◐ parcial · `letter-index`
**Metaprova indexada na própria gincana.** Cada código `X-Y` = prova nº X da GCB 2025, letra na
posição Y do **nome** daquela prova. Ex.: `7-3` VÍDEO→D, `14-5` PRA RUA!→U, `13-1` RIVAGE→R…
Resultado: **DURANTA ERECTA AUREA** → planta *pingo-de-ouro* → entregar o salgadinho
**Pingo d'Ouro**. A etapa 2 encadeia no trocadilho: gravar um integrante caracterizado do
*Brachycephalus boticario* (sapinho-pingo-de-ouro) na lagoa do Parque Ramiro Ruediger, **fazendo
chover** — proibido cenário preparado ou qualquer efeito de IA.
*Lacuna:* `parseIndexSpecs` recusa a notação literal da folha — `7-3` não casa com `PAIR` (que
exige letra entre os números) nem com `DOTTED`, e o hífen nem é separador de token.

**34 · CRÉDITO** — ✗ descoberta *(enunciado não publicado; mecânica recuperada da resolução)*
**Data de nascimento escondida no cartão.** Os **quatro últimos dígitos do cartão** coincidem com o
**dia e o mês de nascimento** (DDMM) da pessoa do documento apresentado ao lado. O padrão é
consistente em todas as entregas fotografadas: cartão terminado em `2406` ↔ nascimento 24/06 (CNH,
Blumenau/SC); `1108` ↔ 11/08 (RG do Paraná, cartão Bradesco Elo); `3008` ↔ 30/08 (RG da Polícia
Científica de SC, Lages); `1109` ↔ 11/09 (CNH, Timbó/SC).
*Lacuna:* não é lacuna de decoder — é prova de campo. A bancada não tem (nem deve ter) nada a
oferecer aqui.

**35 · PARCERIA** — ✗ descoberta · `letter-index`
Seis pares `identificador → posição` (`214 8`, `90 4`, `250 6`, `105 4`, `90 2`…), o identificador
numa plaqueta escura recortada. **A resolução fecha a cadeia**: o primeiro número é o **número da
loja no Shopping Neumarkt** e o segundo é a **posição da letra na razão social** daquela loja —
razão social, não nome fantasia. Resposta: **BIG MAC**, entregue na caixa.
*Lacuna:* o `letter-index` resolve o índice; falta o **cadastro de lojas do Neumarkt por número**.
O `documents` só vai de um CNPJ válido para a razão social, nunca de um número de loja para o CNPJ.

**37 · PM TOPIÁRIO / Prova da Madrugada** *(8 etapas — a peça mais bem documentada do acervo,
8 folhas ↔ 8 resoluções)*

- **E1** ◐ · `color-convert` — **chave física**. Na sexta as equipes receberam um boneco de vodu
  com 6 aviamentos coloridos (alfinete azul, botão cinza, fita vermelha, laço laranja, lantejoula
  verde, marcador rosa). Das 16 células da grade só valem as 6 cujas cores batem — e há **decoys
  quase idênticos** (vermelho-tijolo, rosa-escuro): é preciso ter o objeto na mão. Ordenação pela
  **ordem alfabética do nome do aviamento**. Reconstruí: **JOSEDOSSANTOS** → Rua José dos Santos
  (das 4 combinações possíveis, só esta dá nome real).
  *Lacuna:* a aba Matriz não modela **cor de célula** (`Cell` tem v/n/mark/glyph/heat, e heat é
  saída de regra, não cor de entrada).
- **E2** ◐ · `location`, `letter-index` — **what3words × 12**. Cada linha traz 3 palavras + 1
  numeral por extenso: as 3 palavras dão um endereço w3w → uma rua → **o bairro dessa rua**, e o
  numeral diz qual letra do **nome do bairro** usar. O salto rua→bairro é o passo escondido.
  *Lacuna:* `detectWhat3Words` só aceita a forma com pontos ancorada na entrada inteira, então as
  12 linhas têm de ser remontadas à mão.
- **E3** ◐ · `grid-read`, `location` — **aritmética disfarçada define o passo**: "enraizados" no
  texto + o desenho de √ na lápide; a tabela tem 81 caracteres, √81 = 9; pega-se a posição 9 e
  salta-se de 9 em 9. Saem 9 caracteres → **geohash** `6963k7zxs`. Detalhe de projeto: a grade
  contém `a`, `i`, `l`, `o` — letras que **não existem** no alfabeto geohash — como ruído.
  *Lacuna:* `grid-read` não lê antidiagonal e `decodeGeohashLocal` limita a cauda.
- **E4** ✗ · **metaprova sobre o placar**: a **cor** de cada célula identifica uma **equipe** e os
  números são **números de prova**; consulta-se quantos pontos aquela equipe fez naquelas provas.
  *Falta o dado, não a ferramenta — a bancada não tem o boletim da GCB 2025 nem a legenda
  cor→equipe.*
- **E5** ✗ · **caça-palavras com resíduo ordenado por cor**: achar as 37 palavras na grade 14×14;
  sobram exatamente **11 letras**; ordená-las pela **ordem alfabética do nome da cor** da célula.
  Resultado: **RTAPAJOSFIM** → Rua Tapajós, fim.
  *Lacuna:* a bancada não tem resolvedor de caça-palavras — "caça-palavras" só aparece como texto
  de dica em `title-hints.ts` — e a Matriz não guarda cor de célula.
- **E6** ◐ · `music-notes` — **nota musical → frequência em hertz → dígito por posição → número de
  lei**. `Hz B6-2 D3-2 F6-3 C4-1`. Com A4=440: B6=1975,53 · D3=146,83 · F6=1396,91 · C4=261,63 →
  9-4-9-2 → Lei nº 9492, que deu nome à praça. *(o cálculo é meu; o gabarito confirma a mecânica
  mas não imprime o número)*
  *Lacuna:* `music-notes.ts` para na letra da cifra anglo e **não carrega tabela de Hz** — é a
  única peça faltante da cadeia.
- **E7** ✅ **coberta** · `acrostic`, `location` — as iniciais da primeira frase
  (*Mortes Acontecem Por Causas Odiosas Dentre Elas Cadáveres Ousadamente Mutilados*) soletram
  **MAPCODECOM**. Não é a resposta: é a **ferramenta**. O código `2SL.RM` na arte é um Mapcode.
  Quem não vê o acróstico fica com um código sem saber em que sistema usá-lo.
- **E8** ✅ **coberta** · `grid-read` — *"façam o sinal da cruz"* é literal: há um único `X` na
  tabela e ele é o centro; cada um dos quatro braços contém **exatamente um algarismo** e todo o
  resto é letra. Lidos em ordem: **1-8-6-2** → **RUA TUPARI**. Verifiquei a unicidade célula a
  célula.

**39 · FISCALIZAÇÃO** — ◐ parcial · **confiança baixa**
Tabela de pares (número, letra) disfarçada de "relatório de fiscalização" (`783 X`, `1044 H`,
`1655 B`…). O enunciado **não está impresso** e a folha traz "Sequência 2" — a instrução veio por
outro canal. Testei as reduções auto-contidas e **nenhuma** produz palavra: A1Z26 sobre o número
mod 26, sobre a soma dos dígitos, César nos dois sentidos, Atbash, Vigenère com chave local.

---

## 3. A lista das 18 famílias — a peça mais valiosa do acervo

Na resolução da **prova 03 NOSTALGIA** (`Rivage-resolucao.pdf`, 25 páginas), a Comissão escreve:

> *"O endereço de cada locadora estava em 'charadas/códigos' que já utilizamos diversas vezes"*

E lista, nomeadamente:

| # | família citada pela CP | onde cai na nossa taxonomia | bancada |
|---|---|---|---|
| 1 | Lápide: José Deeke | F (pista cultural → nome de rua) | ✗ |
| 2 | Ilustração: Tereza de Benguela | F | ✗ |
| 3 | Ilustração: 7 de setembro | F | ✗ |
| 4 | **Código de Rua** | A25 / B1 | ✅ `street-code` |
| 5 | **Lei que nomeou a rua** | A25 | ✅ `street-law` |
| 6 | **Extensão da rua** | A25 | ◐ |
| 7 | Código binário | A11 | ✅ `binary-number` |
| 8 | Código Braile | A15 | ✅ `codecs` |
| 9 | Código Morse | A13 | ✅ `codecs` |
| 10 | Letra ↔ nº (A=1) | A3 | ✅ `a1z26-ciclico` |
| 11 | Coordenada | B2 | ✅ `location` |
| 12 | ASCII (Alt + teclado numérico) | A12 | ✅ `base-converter` |
| 13 | Plus Codes | B3 | ✅ `location` |
| 14 | **Alfabeto Lost Symbol** | A10 | ✗ **não temos** |
| 15 | Teclado numérico de telefone | A26 | ✅ `t9` |
| 16 | Anagrama | A6 | ✅ aba Anagramas |
| 17 | **Mapa sem nomes das ruas** | A20/B | ✗ **não temos** |
| 18 | Tabela Periódica | A10 | ✅ `periodic-table` |

**Leitura:** a bancada cobre **12 das 18**. As três primeiras (lápide, ilustrações) são a mesma
coisa sob nomes diferentes — *pista cultural de Blumenau que aponta um nome de rua* — e são
exatamente o que nenhuma ferramenta alcança. As duas ausências nomeáveis são o **alfabeto do
Símbolo Perdido** (cifra de substituição do livro do Dan Brown) e o **mapa sem nomes de ruas**.

E a própria NOSTALGIA é a prova-enciclopédia do acervo: cadeia de 5 camadas que termina numa
fachada de locadora no **Street View com a imagem histórica de 2011** — os retângulos desenhados
no papel são a planta dos porta-cartazes reais, e o número dentro de cada retângulo é a **posição
da letra a extrair do título do filme** daquele pôster (`SOUL SURFER`, 5ª letra → S;
`UM NOVO DESPERTAR`, 13ª → T, ignorando espaços). Concatenado: **REVISTA SET CINEMA E VIDEO
QUALQUER EDICAO**. Trocar a data do Street View para hoje quebra tudo — a locadora não existe mais.

---

## 4. Catálogo — 2026

Ano mais curto e **sem uma única resolução publicada**: as 30 linhas são só enunciado.

### 4.1 Sem cifra

| nº | prova | a lógica que importa |
|---|---|---|
| 01 | Sangue | **cota por equipe** impressa em tabela (ARROMBA = 92); apuração pelo relatório do HEMOSC de 28/08/2026; doações anteriores a set/2025 não valem. PC10 |
| 03 | Mercado Solidário | lista de itens com quantidade **e gramatura** como piso item a item; exige frota e mão de obra mínimas |
| 04 | Vídeo – Universos Paralelos | 18 culturas, lista ordenada de 8 preferências, **empate resolvido por ordem de chegada do e-mail** |
| 05 | Pôster | envio duplo — a versão **anônima** disputa o prêmio, a identificada serve para crédito. Sanção graduada: identificar-se tira o prêmio, não os pontos de cumprimento |
| 06 | Abertura 1 | convocação: 3 integrantes **com smartphone**; o desafio é ao vivo e não está impresso |
| 07 | Abertura 2 | convocação com **dependência dura**: o uniforme exigido *é a resposta do enigma da prova 02*. Quem não decifra a 02 não se apresenta na 07 |
| 08 | Ler é Crescer | **lista de 12 títulos própria por equipe** — não existe lista comum, a prova é intransferível. 1 ponto por livro, teto 12 |
| 09 | Desafio Sicredi | duas moedas independentes com cota por equipe: garrafas PET cheias de lacres + kg de ração (validade > 01/09/2026, granel não vale) |
| 10 | Reels – Maio Amarelo | 4 temas, 8 equipes, **capacidade 2 por tema**, alocação por ordem de chegada do e-mail |
| 11 | Passeata Multimodal | quórum de 10 **integrantes** + 3 Stories (concentração, percurso, chegada) |
| 12 | Blumenau unida contra o El Niño | quórum de 5 pessoas **"podendo ou não serem integrantes"** — admite mão de obra externa, ao contrário da 11 |
| 16 | Making of Esquenta | horizontal, MP4 ≥1080p, 5–10 min, só som ambiente, ≥4 provas registradas |
| 20 | GCBet 2026 | **a metaprova voltou**: 7 critérios, 13 jurados, aposta de ranking + nota cravada. Traz uma tabela de decisões da CP sobre a folha (corretivo → ANULADA; erro riscado com resposta legível ao lado → VÁLIDA) |
| 21 | Uma Gincana em cada Universo | encenar no palco **o mesmo universo** que a equipe criou na prova 04 — dependência conceitual entre provas |

### 4.2 Com cifra

**02 · VOCÊ SABIA?** — ✗ descoberta · `letter-index` · **confiança média**
Grade de 56 células (8×7), cada uma com **duas referências** `P <número> (<índice>)`. O índice da
primeira é **sempre (4)** nas 56 células; o da segunda é **sempre (1)**. Os números vão de 174 a
35207 e de 2 a 7451. É índice a um **corpus externo** que a folha não nomeia.
*Lacuna:* nada na bancada descobre o que `P` indexa, e as dicas diárias de 20–28/03/2026 não estão
no acervo — **procurá-las é o que fecha a prova**. É pré-requisito da prova 07.

**13 · RECONHECIMENTO**
- **E1** ◐ · `roman`, `date-key` — `XIX - V - MCMXXIX` → 19/05/1929, a **data gravada na inscrição**
  do monumento a Fritz Müller (a etapa 2 confirma: a inauguração foi 20/05, "um dia após a data
  registrada na própria inscrição"). *A bancada entrega a data e para aí — não há camada de
  efeméride/patrimônio local.*
- **E2** ✗ · `letter-index` — **cifra de livro de três níveis**: trincas `a-b-c` (9 no primeiro
  bloco, 13 no segundo), e o texto-fonte é apontado pela sílaba **inaug** em negrito — *"o discurso
  INAUGural da estátua de Fritz Müller"*.
  *Lacuna:* `parseIndexSpecs` (zip.ts) só entende índice de 1 ou 2 níveis e devolve `null` para
  `8-4-3`, então o `letter-index` **nem acende**.

**14 · IRMÃOS** — ✗ descoberta
E1 é charada de memória urbana: *"Irmãos estão entre os que escaparam de um incêndio em outubro de
2012"* — checkpoint físico, 30 min. E2 (execução) é recorde: **maior intervalo entre dois irmãos de
mesmo pai e mesma mãe**, com documento com foto **e filiação** nos dois (é isso que barra
meio-irmãos); +1 se vierem caracterizados de bebê e de idoso.
*Lacuna:* falta qualquer base de fatos locais datados — a bancada converte código→local, nunca
charada→local.

**15 etapa 2 · PIONEIRISMO** — ◐ parcial · `street-name`
Charada de história industrial: a **Companhia Lorenz** (1916, primeira fécula de mandioca da
América Latina, alternativa à fécula de batata europeia). O truque está nas aspas de *"mudou-se"*:
a fábrica não se mudou — o **município** mudou, com o desmembramento de Indaial em 1934.
Traz ainda 18 pares `X. Y` (índice posicional) cujo texto-fonte **não está na folha** — testei por
script os três parágrafos históricos e os dois boxes, em todas as ordens, e nenhum fecha.

**17 · MESTRES**
- **E1** ✗ · **confiança baixa** — charada visual: quatro pessoas a identificar, cada uma com um
  **ano** associado; reunidos "dominariam um local em Blumenau". A mecânica não está impressa.
  *`imdb` só aceita `tt#######` ou QID, e `wikidata-item` recusa por decisão de projeto resolver
  nome→entidade.*
- **E2** — **xadrez humano**: a **coluna** (A–H) define a inicial do nome e a **linha** (7 ou 8) a
  quantidade de letras; a peça é a da posição inicial das pretas. D8 exige uma Rainha com nome
  começando em D e 8 letras.

**18 · COLECIONADORES** — ◐ parcial · `letter-index` · **confiança baixa**
Álbum de figurinhas da Copa. Cada verso traz `NNN-D` com D ∈ 1..11 (posição da letra) e
NNN ∈ 36..583 (número da figurinha); as 22 letras formam o nome do item a entregar. Ficou
**provado pelo papel** que o pareamento frente↔verso é **posicional, não espelhado** — os versos
são semitransparentes e o fantasma da foto bate casa a casa.
*Lacuna:* `parseIndexSpecs` não aceita o par com hífen, e falta o corpus (o índice do álbum).

**19 · PM ESQUENTA** *(madrugada 2026, 6 etapas — todas publicadas)*
- **E1** ◐ · `documents` — sequência de 11 dígitos `11458750330` em fonte estêncil. Tem formato de
  CPF e o 1º dígito verificador **confere**, mas o **2º não** (esperado 7, impresso 0); PIS/PASEP
  também não fecha. Ou é dado fictício, ou há dígito trocado de propósito.
- **E2** ◐ · `location` — três capturas de Street View; a chave da etapa seguinte está **na ligação
  entre os três locais**, não em cada um. Qual ligação, não está impresso.
- **E3** ✗ · **diff contra fonte oficial** — laudo de potabilidade da **ETA IV** (vocabulário do
  SAMAE) com valores truncados por interrogações: `DIOXANO 1,5??`, `BENZENO 0,177?`, `BÁRIO 2?`,
  `ARSÊNIO 1?` — 5 dígitos ocultos. Recompor contra o relatório oficial.
  *Lacuna:* falta na Cola a fonte "SAMAE — relatórios de qualidade da água (ETA I–IV)".
- **E4** ◐ · `location` — dois pares de coordenadas, um em São Paulo e outro em Houston. Não são o
  destino: são **modelos**. A deixa "deuses e astros" aponta astronomia/mitologia; achar o análogo
  em Blumenau.
- **E5** ✗ · `location` — o rodapé é literalmente uma entrada de catálogo **MUFON** (*"MUFON member
  witnesses very bright light…"*, 05/01/95, 5 seg.). Buscar o registro, que carrega a coordenada.
  *Lacuna:* não há fonte de avistamentos (NUFORC/UFOCAT/MUFON) na Cola.
- **E6** ✗ · `location` — foto aérea com **três tanques circulares alinhados**, e a analogia manda
  lê-los como **as Três Marias** (Cinturão de Órion). Reconhecer o conjunto de reservatórios —
  coerente com a ETA IV da etapa 3.
  *Lacuna:* nenhuma camada de infraestrutura/POI e nenhuma busca por imagem aérea.

---

## 5. O que o conjunto diz — e onde diverge do `DICIONARIO-CIFRAS.md`

Contagem sobre as 110 fichas (a taxonomia é multivalorada, então os totais somam mais que 110):

```
—(sem cifra) 29 · A4 26 · NOVA 17 · F 14 · I 12 · A25 11 · B3 10 · H 9 · A1 8 · G 8
D 7 · A26 6 · A23 6 · A20 6 · A5 5 · A22 5 · B2 5 · E 4 · A29 4 · A3 4 · A2 4 · A16 4
```

**Cinco divergências concretas.**

1. **Um quarto do acervo não tem cifra nenhuma.** 29 fichas `[-]`. O dicionário foi construído
   sobre um corpus quase inteiramente cifrado; a GCB é metade gincana de mobilização. **Nenhuma
   família do dicionário cobre essa metade** — é o maior vazio de taxonomia que este levantamento
   encontra.

2. **A mecânica-mãe aqui é A4, não A1.** *Letra por posição indexada* aparece 26×; o dicionário
   registra o **acróstico** (A1) como "a lógica mais usada da história" do Challenge (~28 usos), e
   aqui A1 aparece 8×. **A GCB indexa; o Challenge acrostica.** E as três variantes de A4 da GCB
   têm assinatura própria: `prova-letra` (32 SALGADINHO), `loja-letra` (35 PARCERIA, sobre a razão
   social das lojas do Neumarkt), `figurinha-letra` (18 COLECIONADORES) — sempre **um cadastro do
   mundo real como dicionário**.

3. **O patrocinador gera a prova, não a emoldura.** Família I com 12 ocorrências, quase toda em
   2026: Sicredi (nos dois anos), CELESC, Rivage, Ler é Crescer, Maio Amarelo, El Niño. O
   dicionário trata I como *enquadramento sem mecânica própria*; aqui a pauta cívica **origina** a
   prova.

4. **Metaprova anual institucionalizada.** O **GCBet aparece nos dois anos** (prova 22 em 2025,
   prova 20 em 2026): apostar sobre o próprio jogo virou item fixo de calendário. Some-se a 32
   (índice sobre os nomes das provas já executadas) e a 37-E4 (índice sobre o próprio placar): a
   gincana é **corpus de si mesma** com frequência incomum.

5. **O repertório clássico é raso — e empilhado numa prova só.** Zero ocorrências de Atbash, César,
   Pigpen, Base64, telefone-como-resposta. Binário, ASCII, Morse, Braille e alfabetos exóticos
   aparecem **exclusivamente** dentro da NOSTALGIA, que sozinha carrega 18 famílias. A GIA espalha
   o cardápio por 41 provas; a GCB o concentra numa prova-enciclopédia por ano.

**E uma divergência de projeto, não de mecânica.** O `Gabarito-de-Códigos` (ago/2026) é organizado
por **onde procurar** — TEXTO · GUIA DE RUAS · NÚMEROS · COORDENADAS · IMAGENS · VÍDEO/SOM · CORES ·
QUANTIDADE DE DÍGITOS —, não por mecânica. Isso sugere que na GCB o dicionário de cifras é
**material circulante**: a dificuldade não está em *conhecer* a cifra, e sim em saber *qual
aplicar*. O `DICIONARIO-CIFRAS.md` assume o contrário. **Não dá para saber pelo material** se essa
folha é da comissão ou colinha interna da própria Arromba — a diferença é grande e vale perguntar.

---

## 6. O que a bancada não alcança

Das 110 fichas: **54 não-aplicável** (execução), **30 parcial**, **20 descoberta**, **6 coberta**.

Das 56 fichas com lógica decodificável, a bancada fecha **6** — as etapas 7 e 8 da madrugada de
2025 e quatro leituras equivalentes nas resoluções. **Isso não é um veredito sobre as cifras.**
Lendo as 50 lacunas, elas caem em três grupos, e só o primeiro é trabalho de decoder:

**(a) Buracos pequenos e nomeáveis no código — sete, todos de baixo custo:**

| lacuna | onde | destranca |
|---|---|---|
| `parseIndexSpecs` não aceita `7-3` nem `8-4-3` (1 e 3 níveis) | `features/positions/zip.ts` | 32, 18, 13-E2, 35 — **a mecânica nº 1 do acervo** |
| `acrostic` não tem "letra central de cada palavra" | `decoders/acrostic.ts` | 29, e a resolução do SÁBADO |
| `music-notes` não carrega tabela de Hz | `decoders/music-notes.ts` | 37-E6 (é a **única** peça faltante da cadeia) |
| a aba Matriz não modela **cor de célula** | `features/matrix` | 37-E1, 37-E5, 37-E4 |
| não há resolvedor de caça-palavras | — | 37-E5 |
| `detectWhat3Words` só aceita a forma com pontos ancorada | `location` | 37-E2 (12 linhas à mão) |
| `grid-read` não lê antidiagonal | `decoders/grid-read.ts` | 37-E3 |

**(b) Falta o corpus, não a ferramenta** — e este é o grupo maior. O `letter-index` funciona; o que
não existe é a lista que ele indexa: o mix de lojas do Neumarkt, o índice do álbum da Copa, o
placar da GCB, o nome das 12 "refúgios florais". **Nenhuma quantidade de decoder novo resolve
isso.**

**(c) Não é trabalho de bancada** — charada em verso, reconhecimento de foto de rua, memória
urbana datada, revelação física. A prova 15 (ILUSTRE) e a 14 (IRMÃOS) são humanas de ponta a ponta.

**Uma recomendação que o material sustenta:** a folha da CP prova que **Código de Rua, Lei que
nomeou a rua e Extensão da rua** são repertório declarado da casa. Nós temos os três — `street-code`
(`engine/lookups.ts:62`), `street-law` (`:86`) e `street-name` (`:138`), mais `street-date` (`:110`)
e os dois de CEP — e essa é a nossa maior vantagem sobre o que a Arromba embarca. Vale garantir que
nenhum deles regrida.

Duas ausências ficam nomeadas pela própria lista da CP: o **alfabeto do Símbolo Perdido**
(`grep -ri "lost symbol" src/` devolve zero) e o **mapa sem nomes de ruas**.

---

## 7. O que não dá para saber pelo material

- **A prova 03 NOSTALGIA não tem enunciado publicado** — só a resolução. Idem 34 CRÉDITO. As duas
  são cifradas e as duas estão incompletas no acervo.
- **2026 não tem nenhuma resolução.** As 25 fichas do ano são só enunciado, e as respostas das
  cifras de 2026 (02, 13-E2, 15, 18) permanecem abertas.
- **A prova 25 (Topiário) não tem resolução alguma** — incluindo a etapa 3, que é revelação física
  e cujo scan mostra o quadro ainda não revelado.
- **O `Gabarito-2026` e o `Gabarito-de-Codigos` não são gabarito de prova**: são folhas de
  referência de cifras. Se são material oficial da comissão ou colinha da equipe, não está dito.
- **`status-de-comprimento`** (9 equipes × provas 26–37) é a **única** evidência de dificuldade real
  do acervo: não há dado de cumprimento para as provas 01–25 nem para 2026.
- Catorze fichas ficaram com **confiança baixa**; as mais caras são 19-E1 (planta baixa sem regra de
  leitura), 25-E3 (revelação não impressa), 35 e 39 (enunciado ausente).

---

## 8. Nota sobre o backend

O `Gabarito-de-Códigos` da Arromba (pág. 2, seção *APIS UTILIZADAS*) nomeia o próprio backend:

> **Backend (the-decrypter-api)** — ponte de entrada das consultas externas (`/cnpj`, `/isbn`,
> `/cep`, `/ncm`, `/pix`, `/registro`, `/what3words`, `/geocode`, `/fleet`) e das bases grandes:
> CEP, municípios, aeroportos e postes.

Confirma por escrito o que a [`ARROMBA-INVENTARIO.md`](ARROMBA-INVENTARIO.md) tinha levantado por
observação de rede. A seção *BASES DE BLUMENAU / SANTA CATARINA* da mesma folha se descreve como
*"dados locais embutidos, usados nas provas da Equipe Arromba"*.

---

*Levantamento de 20/08/2026. Índice lido no dashboard em sessão de leitura; 84 documentos e 195
páginas lidos do espelho local. Contagens de taxonomia e cobertura são sobre as 110 fichas
produzidas, não sobre os 84 arquivos — documentos multi-prova rendem várias fichas.*

---

## Anexo — o índice completo das duas páginas

As 90 linhas como o site as publica, em 20/08/2026. `—` = sem PDF anexado.

### 2025

| nº | prova | tipo | status | arquivo |
|---|---|---|---|---|
| 00 | STATUS DE CUMPRIMENTO SÁBADO E MADRUGADA 2025 | Lógica | — | `status-de-comprimento-Sabado-e-Madrugada.pdf` |
| 00 | RESOLUÇÕES MADRUGADA | Lógica | — | `resolucao-SABADO-Cadeado-RESPOSTAS-PM-SEM-PONTUACAO.pdf` |
| 00 | RESOLUCOES DO SÁBADO | Lógica | — | `SABADO-Cadeado-RESPOSTAS-SEM-PONTUACAO.pdf` |
| 00 | STATUS DE CUMPRIMENTO SÁBADO COM FOTOS | Lógica | — | `SABADO-Cadeado-RESPOSTAS-PONTUACAO.pdf` |
| 01 | SANGUE | Social | Entregue | `01-Doacao-de-Sangue-1.jpg` |
| 02 | NOSSO RIO (CANCELADA) | Social | Cancelada | — |
| 03 | NOSTALGIA | Lógica | Entregue | — |
| 03 | NOSTALGIA - RESPOSTA | Lógica | Entregue | `Rivage-resolucao.pdf` |
| 04 | VIAJANTES | Objetos | Entregue | `04-Viajantes.pdf` |
| 05 | REELS | Artística | Entregue | `05-Reels.pdf` |
| 06 | VHS | Artística | Entregue | `Prova-06-VHS.pdf` |
| 07 | VIDEO | Artística | Não cumprida | `07-Video.pdf` |
| 08 | PREFEITURA NOS BAIRROS | Social | Entregue | `08-Prefeitura-nos-Bairros.pdf` |
| 09 | INSPIRAÇÃO | Social | Entregue | `09-Inspiracao.pdf` |
| 10 | TREILER | Artística | Entregue | `10-Trailer.pdf` |
| 11 | MAKING OF | Artística | Entregue | `11-Making-of.pdf` |
| 12 | SONS DE BLUMENAU (CANCELADA) | Artística | Cancelada | `12-Sons-de-Blumenau-Seq8.pdf` |
| 13 | RIVAGE 40 ANOS | Artística | Entregue | `13-Rivage-40-anos-1.pdf` |
| 14 | PRA RUA! ETAPA 1 E 2 | Lógica | Entregue | `14-rua.pdf` |
| 15-E1 | ILUSTRE | Lógica | Entregue | `PROVA-16-ILUSTRE.jpg` |
| 15-E2 | ILUSTRE | Lógica | Entregue | — |
| 16 | ANIVERSARIANTES | Lógica | Entregue | `16-aniversariantes.pdf` |
| 17 | GENIO | Lógica | Entregue | `17-genio.pdf` |
| 18 | ENDEREÇO | Lógica | Não cumprida | `18-endereco.pdf` |
| 19-E1 | PM ESQUENTA | Lógica | Entregue | `ETAPA-1-.pdf` |
| 19-E2 | PM ESQUENTA | Lógica | Entregue | `ETAPA-2.pdf` |
| 19-E3 | PM ESQUENTA | Lógica | Entregue | `ETAPA-3-2.pdf` |
| 19-E4 | PM ESQUENTA | Lógica | Entregue | `etapa-4.pdf` |
| 19-E5 | PM ESQUENTA | Lógica | Não cumprida | `etapa-5-.jpg` |
| 19-E6 | PM ESQUENTA | Lógica | Entregue | — |
| 20 | NO PALCO DA RIVAGE | Artística | Entregue | `20-No-Palco-da-Rivage.pdf` |
| 21 | DESAFIO SICREDI | Social | Entregue | `21-Desfio-Sicredi.pdf` |
| 22 | GCBET | Lógica | Entregue | `Prova-22-GCBet-1.pdf` |
| 23 | MERCADO SOLIDÁRIO | Social | Entregue | — |
| 24 | TRIBUTO AO ROCK | Artística | Entregue | — |
| 25-E1 | PM TOPIÁRIO | Lógica | Entregue | `25-TOPIARIO-ETAPA-1-1.pdf` |
| 25-E2 | PM TOPIÁRIO | Lógica | Entregue | `25-TOPIARIO-ETAPA-2.jpg` |
| 25-E3 | PM TOPIÁRIO | Lógica | Entregue | `25-TOPARIO-ETAPA-3.jpg` |
| 25-FINAL | PM TOPIÁRIO | Lógica | Entregue | `25-TOPARIO-FINAL-.jpg` |
| 26 | PROVINHA MAIS OU MENAS | Lógica | Entregue | `26-PROVINHA-MAIS-OU-MENAS.pdf` |
| 27 | ARTE MASCOTE | Artística | Entregue | `Scanner_20250830-2-1.jpg` |
| 28 | VALORIZANDO A EXPERIENCIA | Lógica | Entregue | `Scanner_20250830-3.jpg` |
| 29 | CONHECIMENTO | Lógica | Entregue | `Scanner_20250830-1.jpg` |
| 30 | RELIQUIAS | Objetos | Entregue | `Scanner_20250830-4.jpg` |
| 31 | PALÍNDROMO | Lógica | Entregue | `Scanner_20250830-5.jpg` |
| 32 | SALGADINHO | Lógica | Entregue | `32-salgadinhos.pdf` |
| 33 | INICIAIS | Lógica | Entregue | `Scanner_20250830-6.jpg` |
| 34 | CRÉDITO | Lógica | Entregue | — |
| 35 | PARCERIA | Lógica | Não cumprida | `Scanner_20250830-3-1.jpg` |
| 36 | MAKING OF | Artística | Entregue | `Scanner_20250830-7.jpg` |
| 37-E1 | PM TOPIÁRIO | Lógica | Não cumprida | `Etapa-1-Seq-5-1.jpg` |
| 37-E2 | PM TOPIÁRIO | Lógica | Entregue | `ETAPA-2-CP-1.pdf` |
| 37-E3 | PM TOPIÁRIO | Lógica | Não cumprida | `Etapa-3-Seq-5-1.pdf` |
| 37-E4 | PM TOPIÁRIO | Lógica | Entregue | `Etapa-4-Seq-5-1.pdf` |
| 37-E5 | PM TOPIÁRIO | Lógica | Entregue | `37-pm-etapa-5.pdf` |
| 37-E6 | PM TOPIÁRIO | Lógica | Entregue | `37-pm-etapa-6.jpg` |
| 37-E7 | PM TOPIÁRIO | Lógica | Entregue | `37-pm-etapa-7.pdf` |
| 37-E8 | PM TOPIÁRIO | Lógica | Entregue | `37-pm-etapa-8.pdf` |
| 38 | ONDE ESTOU | Lógica | Entregue | `38-onde-estou.pdf` |
| 39 | FISCALIZAÇÃO | (vazio) | Entregue | `39-fiscalizacao.pdf` |

### 2026

| nº | prova | tipo | status | arquivo |
|---|---|---|---|---|
| 01 | Sangue | Social | Entregue | `01-Sangue.pdf` |
| 02 | Você Sabia? | Lógica | Entregue | `02-Voce-Sabia.pdf` |
| 03 | Mercado Solidário | Social | Entregue | `03-Mercado-Solidario.pdf` |
| 04 | Vídeo - Universos Paralelos de Blumenau | Artística | Entregue | `04-Video.pdf` |
| 05 | Poster (Vídeo) | Artística | Entregue | `05-Poster.pdf` |
| 06 | Abertura 1 | Artística | Entregue | `06-Abertura.pdf` |
| 07 | Abertura 2 | Artística | Entregue | `07-Abertura-2.pdf` |
| 08 | Ler é Crescer | Social | Entregue | `08-Ler-e-Crescer.pdf` |
| 09 | Desafio Sicredi | Social | Entregue | `09-Desafio-Sicredi.pdf` |
| 10 | Reels - Maio Amarelo | Social | Entregue | `10-Reels-Maio-Amarelo.pdf` |
| 11 | Passeata Multimodal | Social | Entregue | `11-Passeata-Multimodal.pdf` |
| 12 | Blumenau unida contra o El Niño | Social | Entregue | `12-Blumenau-Unida-Contra-o-El-Nino.pdf` |
| 13-E1 | RECONHECIMENTO | Lógica | Entregue | `WhatsApp-Image-2026-06-20-at-14.28.16.jpeg` |
| 13-E2 | RECONHECIMENTO | Lógica | Entregue | `WhatsApp-Image-2026-06-20-at-14.28.16-1.jpeg` |
| 14-E1 | IRMÃOS | Lógica | Entregue | `14-irmaos-24-Jun-2026-19-41-21.pdf` |
| 14-E2 | IRMÃOS | Lógica | Não cumprida | `14-irmaos-24-Jun-2026-19-41-21-1.pdf` |
| 15-E2 | PIONEIRISMO | Lógica | Entregue | `15-pioneirismo-24-Jun-2026-19-43-36.pdf` |
| 16 | MAKING OF ESQUENTA 2026 | Artística | Entregue | `WhatsApp-Image-2026-06-20-at-14.28.15.jpeg` |
| 17-E1 | MESTRES | Lógica | Não cumprida | `WhatsApp-Image-2026-06-20-at-15.31.00.jpeg` |
| 17-E2 | MESTRES | Lógica | Entregue | `WhatsApp-Image-2026-06-20-at-15.43.42-2.jpeg` |
| 18-E1 | COLECIONADORES | Lógica | Entregue | `18-colecionadores-24-Jun-2026-19-52-12.pdf` |
| 18-E2 | COLECIONADORES | Lógica | Não cumprida | `WhatsApp-Image-2026-06-20-at-16.14.55.jpeg` |
| 19-E1 | PM ESQUENTA | Lógica | Não cumprida | `PM-etapa-1-24-Jun-2026-20-04-09.pdf` |
| 19-E2 | PM ESQUENTA | Lógica | Entregue | `PM-ETAPA-2.pdf` |
| 19-E3 | PM ESQUENTA | Lógica | Entregue | `PM-etapa3-24-Jun-2026-20-04-49.pdf` |
| 19-E4 | PM ESQUENTA | Lógica | Entregue | `PM-ETAPA-4.pdf` |
| 19-E5 | PM ESQUENTA | Lógica | Entregue | `pr-etapa5-24-Jun-2026-20-06-06.pdf` |
| 19-E6 | PM EQUENTA | Lógica | Entregue | `PM-etapa-6.pdf` |
| 20 | GCBET | Lógica | Entregue | `prova-20-gcbet-01-Aug-2026-10-05-31.pdf` |
| 21 | Uma Gincana em cada Universo | Artística | Ativa | `21-Uma-Gincana-em-Cada-Universo.pdf` |

