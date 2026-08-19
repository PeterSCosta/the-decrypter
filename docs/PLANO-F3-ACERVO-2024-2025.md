# F3 — o acervo de 2024/2025, e o que ele muda

> **Plano de ação. Nada implementado.** Escrito em 19/08/2026 depois de ler as 41
> `resolucao.md` de `itc-2024`, `itc-2025`, `cp-2024` e `cp-2025` — 144 KB que
> existiam em disco e nunca entraram no índice curado `RESOLUCOES.md`, que para
> em 2023.
>
> Tudo abaixo é medido. Onde eu mesmo refiz a medição, está dito.

---

## Por que isso não é trabalho de arquivo

O `RESOLUCOES.md` não guarda a prova: ele guarda a **mecânica destilada** e um
bloco de `Tags extras`. Essas tags são a contagem de frequência que decidiu tudo
neste projeto — o `TODO-CIFRAS.md` prioriza "pela frequência histórica", e o
`PLANO-2026-08.md` herdou a conta.

Ou seja: **os 117 decoders da bancada foram priorizados por uma amostra que
parava em 2023.** Os números não estavam errados; eles eram de outro acervo.

---

## 1. O que 2024/2025 derruba

### 1.1 A âncora é menor que o próprio município — e isso reprova o "1.1 feito"

O caso literal da madrugada de 2024 é o Plus Code `25JR+P8`
(`itc-2024/p12/resolucao.md:40` — Capela São Sebastião, Laranjeiras). Rodei na
bancada de hoje:

```
585H25JR+P8            → −26,968187 / −48,809188   (Laranjeiras, que É Itajaí)
dentro da bbox de Itajaí?  NÃO   (lonMin = −48,78; o ponto está em −48,809)
cauda "25JR+P8"        → null nos DOIS ramos
a bancada responde     → −77,2987 / −103,6988, Antártida, nota 0,50
```

O conserto de ontem (`0563966`) fez `38HQ+J3` funcionar porque aquele ponto cai
dentro da caixa. Este não cai — e o `PLANO-2026-08.md:223` previa exatamente
estes códigos como "os casos de teste de regressão que faltam para provar que o
F2 funcionou". **O teste que faltava reprova.**

A raiz não é a cascata: são as caixas. Medidas contra dado que o próprio
repositório já embarca — os 84.539 lotes de Blumenau e os 1.565 CEPs de Itajaí:

| cidade | extensão REAL | caixa em `anchors.ts` | o que fica de fora |
|---|---|---|---|
| Blumenau | lat −27,062..**−26,622** · lon −49,198..−49,012 | lat −27,050..**−26,780** | **~17 km do norte** |
| Itajaí | lat −27,065..−26,844 · lon **−48,862**..−48,629 | lat −27,000..−26,820 · lon **−48,780**..−48,580 | **~8 km do oeste** (Laranjeiras) e ~7 km do sul |

**Ação:** derivar as caixas do dado embarcado em vez de escrevê-las à mão, com
uma folga declarada, e prender num teste que o código gabaritado de cada
madrugada documentada resolve. É o conserto de maior retorno de toda a F3, e
fecha uma fase que hoje está marcada como pronta.

### 1.2 O desfecho mudou de figura — e é um fator de 10

`TODO-CIFRAS.md` diz que a cadeia "termina num CEP, coordenada, telefone ou
objeto", nessa ordem, e o dicionário chama o CEP de "cavalo de batalha
histórico" (~18 usos). Nas 41 fichas de 2024/2025:

| desfecho | fichas | % |
|---|---|---|
| **objeto a entregar/exibir** | **20** | **48,8%** |
| palavra/frase/senha | 11 | 26,8% |
| local/endereço (foto no ponto) | 9 | 22,0% |
| encenação em vídeo | 7 | 17,1% |
| coordenada/geocódigo | 4 | 9,8% |
| **CEP como resposta codificada** | **2** | **4,9%** |

O lugar físico continua vivo (9 fichas terminam com foto num ponto). O que
morreu foi a **codificação por CEP**: quando é lugar, ele chega por Plus Code,
geohash, coordenada, lei municipal ou vizinhança de mapa.

**Ação:** rever a justificativa da **F14 (CNEFE)**, que se vende como "melhor que
CEP para o desfecho nº 1 do acervo". O desfecho nº 1 não é mais esse. A fase pode
continuar valendo — 175 mil endereços com coordenada de porta são bons de todo
jeito —, mas não por essa razão, e ela estava na frente de coisas mais urgentes
por causa dela.

### 1.3 Cinco descartes com a premissa hoje falsa

| descartado | premissa escrita | o que 2024/25 mostra |
|---|---|---|
| **Náutico** | "zero provas náuticas em dez anos… isso é dado, não falta de amostra" (`PLANO-2026-08.md:119`) | ITC 2024 p13: bandeiras do alfabeto náutico (ICS) nos navios do desenho |
| **Enigma** | "teria de entregar a configuração inteira, e aí a equipe usa um simulador" (`:458`) | ITC 2024 p09 entrega o emulador E fixa rotores I,II,III + anel A,A,A, sem plugboard |
| **Runas** | "adiadas por falta de âncora" (`TODO-CIFRAS.md:8`) | ITC 2024 p12-E6: duas runas físicas escrevendo PAX HIC |
| **Anagrama** | "adormecida no Challenge desde 2019" (`:155`) | ITC 2024 p08: NEPTE → PENTE |
| **A31 "cofre"** | arquivado como mecânica física | ITC 2025 p15-Et.3: anel de 14 letras percorrido por sequência numérica — **digitável de ponta a ponta** |

**Ação:** nenhum deles vira decoder automaticamente. O náutico e as runas são
**legenda na Cola** pela regra da casa ("o que se lê mas não se digita"), o
Enigma continua sendo escolha (simulador dedicado resolve), o anagrama já tem
aba. O que muda é que os **argumentos** precisam ser reescritos: hoje eles dizem
"não existe prova", e existe.

### 1.4 Três coberturas declaradas que não cobrem

- **A27 fonética → "já existe o NATO"**. A p12-E3 de 2024 lê `TWO FIVE JULIET
  ROMEO PLUS PAPA EIGHT` = o Plus Code `25JR+P8`. A tabela em `ciphers.ts:204`
  tem 29 chaves, **todas letras** — sem ZERO..NINE e sem "PLUS". O portão exige
  60% de acerto; 3 de 7 = 43% → devolve nada. **Conserto de ~dez linhas.**
- **A5 contagem → "coberta por `count-key` + aba Texto"**. As séries em
  `counts.ts` são quatro, e **nenhuma conta letras por linha** — que é a p04 de
  2024 inteira (20-5-14-5-20 → A1Z26 → TENET). A mecânica foi entregue na forma
  errada.
- **A10 leet → "coberto"**. A p07 de 2024 vai de `BBEOEOAO` para `88303040` (CEP
  da Rua Almirante Barroso). O `leetspeak` só mapeia dígito→letra, não tem
  `encode`, e o portão recusa entrada só com letras. Cobre a direção que a prova
  não usa.

**Ação:** os três são pequenos e têm prova real por trás. São o melhor
custo/benefício que a F3 revelou.

### 1.5 A `periodic-table` perdeu o modo que a prova exige

Uma correção anterior tirou do catálogo a soma de massas, com a nota "nunca
somou". A p14 de 2024 soma cinco massas (12+15+24+26+30 = 107) e pede "o elemento
mais próximo" = **Prata**. Hoje `107` cai no modo número atômico e responde
**Bóhrio**, e nenhum elemento arredonda para 107 (Pd 106,42→106; Ag 107,87→108).

---

## 2. O que a frequência diz agora

**151 camadas de mecânica em 41 fichas — média de 3,8 por prova.** O dicionário
calibra o "ponto doce" em **2 camadas**; 17 das 40 fichas passam de quatro, e a
p12/2024 tem dez. A cadeia ficou mais longa, e isso é sobre a bancada inteira,
não sobre um decoder.

**Onde a camada mora:** texto digitável **80 (53%)** · imagem 28 · consulta
externa 26 · objeto físico 7 · áudio 4 · vídeo 3. **Cinco fichas não têm nenhuma
camada textual** — a bancada não tem o que fazer nelas, e isso é resposta
honesta, não falha.

**Subiu:** A4 letra por posição virou a mecânica de cifra nº 1 (11 camadas, 8
fichas), com uma forma nova — **índice em lista externa** (faixa 8 do álbum).
A5 contagem saltou de 6º para 2º, e mudou de cara: agora é **contagem filtrada**
("só as palavras em latim", "quantos trechos alterados por parágrafo").

**Caiu:** A1 acróstico perdeu o primeiro lugar. A3 A1Z26 é a maior queda — era
"o conversor final de metade das cadeias", hoje são 4 fichas em 41. A proporção
ASCII×A1Z26 foi de 20:1 para **2:1**, então o chip "é ASCII, não A1Z26" deixou de
ser desempate raro.

**Zero absoluto:** Atbash, Binário, Base64, Braille, Pigpen, what3words,
Maidenhead, Mapcode. Seis "ressurreições" que o dicionário previa e 2024/25 não
confirmou.

**Novo, e ausente do dicionário inteiro:** Enigma · **homóglifo VISÍVEL**
(hífen `U+002D` × travessão `U+2013` escolhendo os índices) · dado na geometria
do arquivo (tamanho de autoforma em PPTX → CEP) · MP3 escondido dentro de JPEG ·
passeio do cavalo · anel de letras · topologia de mapa · acróstico silábico ·
bandeiras ICS · metadados de vídeo do YouTube · **encurtador de URL (3 fichas**,
contra 1 aparição histórica).

**Ação:** dois desses já têm casa. O **homóglifo visível** dá à F7 a âncora que
lhe faltava — e muda a forma: o plano previa confusáveis invisíveis, e a prova
usa pontuação trocada à vista. O **carve de mídia dentro de imagem** a aba
Arquivo já faz. O **encurtador de URL** é o único candidato a decoder novo que a
frequência sustenta sozinho (3 fichas), e cabe no escopo reescrito (consulta por
`lib/api.ts`, com degradação).

---

## 3. Ordem sugerida

1. **As caixas das âncoras** (§1.1) — reprova uma fase marcada como pronta, e o
   dado para consertar já está embarcado.
2. **NATO com dígitos** (§1.4) — dez linhas, prova real, e é a cifra mais
   previsível de uma prova de rádio.
3. **"Letras por linha" no `countSeries`** (§1.4) — resolve a p04 inteira num
   clique e destrava a mecânica que mais subiu.
4. **Destilar as 41 no `RESOLUCOES.md`** — é a F3 propriamente dita. Depois dos
   três consertos acima, porque eles não dependem dela e ela é a parte cara.
5. **Reescrever os argumentos falsos** (§1.3) nos quatro documentos, sem mudar
   nenhuma decisão: o que muda é a razão, não o veredito.
6. **Rever a justificativa da F14** (§1.2) e reordenar o que estava atrás dela.

O que **não** entra: nada vira decoder por aparecer uma vez. A regra da casa —
assinatura, ou pré-resolução, ou nada — continua valendo, e metade das novidades
de 2024/25 é imagem, objeto ou encenação, que é resposta honesta e não lacuna.
