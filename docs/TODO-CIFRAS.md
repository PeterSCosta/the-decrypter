# TODO — Cifras a cobrir na bancada

> ✅ **Executado. Este arquivo virou catálogo, não fila.** Os **19 itens** abaixo foram atacados nas
> ondas 0–5 de [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md): **16 entregues** como cifra ou aba (alguns
> reescopados — o **8** virou a aba Diferenças, o **12** virou inspetor de espaçamento e não
> "resolve a prova 41", o **18** virou cidade→DDD em vez de coordenada→cidade), o **19** entregue
> como documentação (a seção "Bases e onde consultar" da Cola, com o status de cada base), o **14**
> **parcial** (entraram `letter-values`, as legendas de Pigpen e Libras **e as runas** —
> `reference/alphabets.ts:513`/`:573`; falta só a legenda desenhada) e o **17** **descartado** por
> projeto — o argumento agora é o **peso**: centenas de KB de dataset para uma capacidade que
> ninguém pediu. A metade que dizia "zero provas resolvidas no acervo" saiu em 19/08/2026, pela
> regra que este repositório já escrevia em `QUEBRAR-PROVAS.md:854` e não aplicava aqui:
> **nunca trate "adormecida" como "extinta"** — o acervo não é censo. **As 5 melhorias transversais entraram todas**: cadeia, 2º campo,
> título como pista, selo de palavra real e faixa de dicas do sniffer — com a ressalva de que o 2º
> campo tem, por ora, um único consumidor (`PLANO-CIFRAS.md` §8-D8).
>
> Depois delas veio uma **onda 6 que não sai deste arquivo**: 7 decoders (`boleto`, `chave-nfe`,
> `correios`, `numero-extenso`, `placa-veiculo`, `rot8000`, `titulo-eleitor`) e 5 geocódigos
> (MGRS/USNG, carta IBGE/DSG, GEOREF, GARS, grade estatística IBGE) vindos de **varredura da web**,
> sem nenhuma prova do acervo pedindo. O porquê está em [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md) §4,
> "Onda 6"; aqui eles aparecem só na tabela abaixo, marcados com **°** — porque este arquivo é o
> catálogo *do acervo*, e misturar aposta com evidência é justamente o que ele existe para evitar.
>
> Medido no repositório em 2026-08-14: **96 decoders** (15 com `encode`), **7 abas**, **767 testes**
> verdes em 70 arquivos. O que a execução contrariou está em [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md)
> §8 — em especial: *Vive La Resistance* **tem** resolução no acervo (e a resposta são os dígitos
> das faixas, não os ohms), a leitura correta da GIA-39 é UM**L**BICICLETA, e a regra da GIA-28 é
> por junção entre palavras, não por ator.
>
> **O que continua valendo aqui:** as **descrições de mecânica**, o mapa das bases públicas e a
> tabela mecânica ↔ bancada (reescrita) — é para isso que se abre este arquivo. **O que não vale
> mais:** a priorização (Alta/Média/Baixa) e as notas de implementação que dizem "hoje só dá pra
> fazer contando no dedo". A vitrine voltada ao usuário é o Roadmap in-app
> (`src/features/help/roadmap-content.ts`); o backlog técnico é o `PLANO-CIFRAS.md`; este é o
> catálogo do acervo.

**Origem.** Este arquivo é destilado do acervo de provas das gincanas (Itajaí Challenge 2016–2026 +
GIA Virtual 2026), cruzando o **Dicionário de Cifras** (`the-logic-lab/scripts/import-historico/acervo/DICIONARIO-CIFRAS.md`,
38 mecânicas nas famílias A/B/E), a **análise das 41 provas da GIA** (`acervo/GIA-2026.md`) e as
**73 cadeias de dedução** (`acervo/RESOLUCOES.md`) contra o que o Decrypter sabia fazer em julho de
2026 (contado à época como ~55 decoders em `src/features/decoder/engine/`; eram 74, hoje são 96 —
dos quais 7 não têm nenhuma prova no acervo por trás, ver a marca **°** na tabela).

**Objetivo.** Quebrar essas cifras rápido na bancada. A gincana quase nunca é uma cifra pura — é uma
**cadeia de 2 a 4 camadas** que termina num CEP, coordenada, telefone ou objeto. Cada item abaixo
existe para tirar uma camada dessas cadeias do caminho crítico. A prioridade segue **a frequência
histórica** (o dicionário mede por cumprimento X/N) e as **"variações inéditas"** que o dono quer
poder quebrar sem improviso.

> **Escopo (reescrito na execução — a regra antiga dizia "só offline", e já era violada por 4
> decoders em produção).** Consulta externa é permitida **desde que** passe por `lib/api.ts` (cache,
> rate-limit, chave no servidor) e **degrade graciosamente** quando o backend cair; o `decode()`
> continua **síncrono e puro**. Mecânicas físicas (revelação por calor/UV — A17, overlay — A21,
> cofre — A31) e de encenação (Família D) não são decodificáveis aqui e ficam fora. Áudio/vídeo
> (Família E) idem, salvo o subproduto textual. Acrescentar à lista de fora: **adulteração visual**
> (Basta Isso, Bandeiras, Sonho Perturbado) e **contagem de setores em imagem** (GIA-17) — e o que
> se lê mas não se digita (Pigpen, Libras) é **legenda na Cola**, nunca decoder.
>
> **Base com captcha ou login de terceiro não entra, em nenhuma hipótese** — não se raspa. Base sem
> CORS espera virar dado aberto por pedido oficial (LAI), o mesmo caminho que ruas e CEP
> percorreram.

---

## Mecânica do dicionário ↔ onde a bancada resolve

Atualizado em 2026-08-14, depois das ondas 0–6. Nem toda mecânica vira decoder: as três colunas de
destino são o **motor** (fan-out do Decodificador), uma **aba** (exploração sobre texto longo) e a
**Cola** (o que se lê mas não se digita). O critério: *o que precisa entrar numa cadeia é decoder;
o que é exploração é aba; o que é legenda é Cola.*

> **°** = entrou pela **onda 6**, por varredura da web — **não há prova no acervo** que o exija. É
> aposta de cobertura, justificada em [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md) §4. Tudo o que não tem a
> marca nasceu de uma prova real.

| Mecânica (dicionário) | Onde resolve hoje |
|---|---|
| A1 Acróstico de iniciais | `acrostic` |
| A2 Acróstico posicional / alternado | `acrostic-nth` (k-ésima letra do início/fim, ímpares/pares, junção nome↔sobrenome) + aba **Texto** |
| A3 Número↔letra (A1Z26) | `a1z26`, `a1z26-encode`, `a1z26-reverse` (1=Z), `cipher-disk` (origem parametrizada) |
| A4 Letra por posição indexada | `letter-index` + aba **Posições** (passo, lista, N fontes × N índices, N fontes × 1 índice) |
| A5 Contagem como chave | `count-key` + séries de contagem na aba **Texto** |
| A6 Anagrama | aba **Anagramas** (exato, duas palavras, sobra de 1–2 letras; pt/en/ruas de Blumenau) |
| A7 Atbash | `atbash` |
| A8 César / substituição por deslocamento | `caesar` (ROT-N), `caesar-bruteforce`, `rot13`, `rot18`, `rot47`, `rot5` (dígitos), `affine`; progressivo → `trithemius`; **`rot8000`°** (o mesmo giro sobre 63.404 code points do BMP — texto vira CJK e volta) |
| A8 Vigenère e parentes | `vigenere`, `autokey`, `beaufort`, `gronsfeld`, `porta`, `xor-key` |
| A8 Cifra vocálica (variação GIA) | `vowel-cipher` (deslocamento com sinal por vogal; a saída primária é a palavra das imagens) |
| A9/A10 Alfabetos exóticos | `letter-values` (gematria, redução 1–9, primos) no motor; **Pigpen e Libras como legenda na Cola**; runas adiadas |
| A10 Leet | `leetspeak` |
| A11 Binário | `binary`, `binary-number`, `baudot`, `digit-regroup` (quando os bits vêm colados na prosa) |
| A12 ASCII | `decimal` (códigos ASCII), `hex`, `octal`, `digit-regroup` |
| A13 Morse | `morse` |
| A14 Base64 e famílias | `base64`, `base32`, `base32hex`, `base45`, `base58`, `ascii85`, `url`, `html` |
| A15 Braille | `braille` (Unicode ⠿, forma já-em-célula) + `whitespace-stego` (célula montada a partir das linhas) |
| A16 Esteganografia | `zero-width` (caracteres invisíveis) + `whitespace-stego` (espaço/tabulação como bit, com perfil linha a linha) |
| A18 Diff contra fonte | aba **Diferenças** — palavras trocadas, originais, letras alteradas e série de contagens |
| A20 Grade / disco | `polybius`, `bifid`, `playfair`, `columnar`, `railfence`, `bacon`, `grid-read` (4 braços, espiral, serpentina), `cipher-disk` (com card SVG da roda) |
| A22 Inversão / espelho / leitura reversa | `reverse` + a aba **Texto** |
| A23 Aritmética disfarçada | `math-helper` (MDC/MMC, raízes, divisões, Kaprekar, resto, com parsing pt-BR), `base-converter`, `digit-regroup` |
| A24 Números romanos | `roman`, e o `letter-index` aceita romano como índice |
| A25 Códigos burocráticos | `barcode` (EAN/UPC **+ país por prefixo GS1**), `isbn`, `ncm`, `documento` (CPF/CNPJ), `airport` (IATA/ICAO), `pix-participant` (ISPB), `registrobr` (.br), `ddd`, `ddi`, `ibge-municipio`, `ddd-cidade` (cidade→DDD), `resistor`, `faber-castell` — **e a leva da onda 6:** **`boleto`°** (44 / 47 / 48 dígitos → banco, valor e **vencimento nas duas leituras do fator**), **`chave-nfe`°** (44 posições → os 9 campos + cDV; encadeia o CNPJ no `documento`), **`titulo-eleitor`°** (12 dígitos → UF de emissão), **`placa-veiculo`°** (antiga ↔ Mercosul, UF pela faixa de letras, categoria pela cor), **`correios`°** (UPU S10: DV, serviço e país de postagem) |
| A26 Teclado T9 / QWERTY | `t9-multitap`, `keyboard`, `tap-code` |
| A27 Fonética | `nato` (alfabeto fonético) |
| A28 Conversões de cor | `color-convert` (hex/RGB/HSL ↔ nome, 255 cores pt-BR por ΔE em CIELab), `resistor`, `faber-castell` |
| A29 Datas como chave | `date-key` (signo, dia da semana por Zeller, dia do ano, serial do Excel, Unix, fase da lua) |
| — Fórmula molecular → dígitos | `periodic-table`, 4º modo: subscritos como dígitos posicionais (com nomes pt-BR → fórmula) |
| — Notas musicais como letras | `music-notes` |
| — Número por extenso ↔ dígitos | **`numero-extenso`°** — extenso→dígitos entra no fan-out e sai como dígito puro, pronto para encadear em `a1z26`/`letter-index`/`cep-exact`; dígitos→extenso só roda em "uma cifra só", senão dispararia em toda entrada numérica |
| B1 CEP → rua | `cep-exact`, `cep-sc-prefix`, `cep-wildcard`, `street-name`, `street-code`, `street-law`, `street-date` |
| B2 Coordenadas GPS / GMS | `location`: DD, DMS, DDM |
| B3 Geocódigos modernos | `location` + `local-geocode` + `geohex-wildcard`: Plus Code (e cauda), Geohash (e cauda), Maidenhead, UTM, Quadkey, H3, GeoHex, what3words, **GeoTude** e **Mapcode**, mais o atalho "Nb" do Vale e CEP→coordenada. **Onda 6:** **MGRS/USNG°** (e a cauda local, sem o fuso "22J"), **GEOREF°** (e a cauda local, sem a célula de 15°), **GARS°**, **carta IBGE/DSG°** (`SG-22-Z-B-IV-4-SE`) e **grade estatística IBGE°** (Albers) — os dois últimos nomeiam uma **área**, e o card diz o tamanho da célula em vez de fingir precisão de ponto |
| — Precedência entre geocódigos | A lista de `detectLocation` é **ordenada, não paralela**: todo MGRS é lexicalmente um Geohash válido, e GEOREF/GARS/H3/GeoHex também casariam como Geohash se viessem depois dele. A ordem está comentada no código com o motivo de cada posição |
| — Diagnóstico de formato | `hash-id`, `digit-count`, e a **faixa de chips** do sniffer (`engine/sniff.ts`), que também dá o diagnóstico negativo |
| — O título como camada 1 | campo de título → chips de dica (`engine/title-hints.ts`); nunca entra em `decode()` nem no ranking |

Observação: **GS1 → país** sai no `barcode`. A variação da GIA `Ponto de Encontro` (prefixo GS1 vira
**dígito de coordenada**) é um *padrão de uso*, não um decoder faltante — e desde a barra de Cadeia
o encadeamento que faltava é um clique.

---

## A implementar

### Prioridade ALTA

#### 1. Índice de letra (`letter-index`) — mecânica A4 "Letra por posição indexada"
- **Resolve:** A4, ~25 usos no Challenge (top-2 de todos os tempos) + GIA 05/23/24/29/37/39.
- **Padrão de uso real:** "conquistou 10 pontos → 10ª letra do nome da equipe" (GIA *E Agora*);
  "algarismo romano esculpido = índice da letra no nome do imperador → LOUROS" (GIA *Romanos*);
  número camuflado na foto do ex-prefeito indexa o nome (GIA *No detalhe*). É o **conversor final**
  de meia dúzia de cadeias e hoje só dá pra fazer contando no dedo.
- **Entrada → saída:** uma palavra/nome/lista (2º campo) + uma sequência de números → as letras
  daquelas posições, concatenadas. Suportar **índice reverso** ("5ª de trás pra frente", GIA
  *Sinfonia Silenciosa*) e o par **A{n}L{m}** (folha/linha, GIA *Quem Peleia*).
- **Nota de implementação:** transformação pura. **Exige o 2º campo de entrada** (a fonte a indexar)
  — hoje a bancada só tem o campo de chave do Vigenère; ver Melhoria "campo secundário".

#### 2. Contador → chave (`count-key`) — mecânica A5 "Contagem como chave"
- **Resolve:** A5, ~15 usos no Challenge + **a mecânica mais recorrente da GIA** (04, 18, 23, 24, 25, 26, 39, *Romanos*).
- **Padrão de uso real:** "conte quantas palavras tem cada parágrafo → A1Z26 = VENCEDOR" (GIA *O poder das palavras*);
  "quantas vezes a plaqueta se repete = índice na placa" (GIA *Seguindo as Orientações*); contar
  bairros/repetições/ângulos. O `digit-count` de hoje faz outra coisa (comprimento → tipo de documento).
- **Entrada → saída:** um texto + um alvo a contar (palavras por linha, ocorrências de um caractere,
  itens por bloco) → a lista de contagens, já opcionalmente passada por A1Z26.
- **Nota de implementação:** transformação pura. Casa naturalmente com o item 1 e com A1Z26 num só passo.

#### 3. Acróstico estendido / posicional (estender `acrostic`) — mecânica A2
- **Resolve:** A2 (posicional/alternado) e as variações de A1 — e **A1 é a lógica mais usada da
  história** (~28 usos). O `acrostic` atual só lê a 1ª letra de cada palavra/linha.
- **Padrão de uso real:** "5ª letra de trás pra frente de cada música" (GIA *Sinfonia Silenciosa*);
  "última letra do nome + 1ª do sobrenome" (GIA *Vale Encantado* → OS SEM FLORESTA); "uma palavra
  sim / uma não" (*Parque do Atalaia*, zerou 0/4 sem ferramenta); ler em coluna de jornal diagramado.
- **Entrada → saída:** texto + regra de salto (última letra; n-ésima palavra; n-ésimo caractere;
  linha sim/linha não; ler em coluna) → mensagem.
- **Nota de implementação:** transformação pura, estende o módulo existente `decoders/acrostic.ts`.

#### 4. Anagrama (`anagram`) — mecânica A6
- **Resolve:** A6, **viva na GIA (3×)**: *O Código Songi*. (Dizia "adormecida no Challenge desde 2019" — retirado em 19/08/2026: o acervo é incompleto e não registra edições que ocorreram, então "não apareceu desde" mede o arquivo, não a gincana.)
  (SONGI→SIGNO), *Arte sem Nome* (contagens → anagrama de "UM MAPA"), *Quem Peleia* (Gino→Ingo,
  Torvi→Vitor…). O dono marcou como "ressuscitar" no dicionário.
- **Padrão de uso real:** o alvo (nome de bairro/escola/filme local) chega embaralhado no título ou
  numa lista; filtra bem quando o destino é nome próprio local.
- **Entrada → saída:** letras embaralhadas → palavras reais que usam exatamente aquelas letras
  (com opção "sobra 1 letra = resposta", como no dicionário).
- **Nota de implementação:** **precisa de dataset local** — uma wordlist pt-BR (e, idealmente, os
  nomes de rua/bairro de Blumenau que já temos em `street-guide`) para ranquear soluções. Sem lista,
  vira força-bruta inútil.

#### 5. Cifra vocálica (`vowel-cipher`) — mecânica A8 (variação inédita da GIA)
- **Resolve:** GIA *I lingii di i* (prova 22) — o dono listou explicitamente como variação inédita
  a quebrar rápido.
- **Padrão de uso real:** a chave `+11 −4 +7 −6 −2` é aplicada **só às 5 vogais A E I O U**, dentro
  do alfabeto completo → A+11=L, E−4=A, I+7=P, O−6=I, U−2=S → **LAPIS**. O texto vem escrito com
  vogal única, ensinando o mecanismo.
- **Entrada → saída:** texto + lista de 5 deslocamentos (um por vogal) → texto decifrado. Cobrir
  também o inverso (aplicar só às consoantes).
- **Nota de implementação:** transformação pura, trivial. Alto valor por custo baixíssimo.

### Prioridade MÉDIA

#### 6. Helper aritmético (`math-helper`) — mecânica A23 "Aritmética disfarçada"
- **Resolve:** A23, das mais difíceis do acervo, e **pesada na GIA**: MDC (*Engenheiro Foragido*,
  MDC=3 → divide → GEOTUDE), raiz quadrada (*Prova Quadrada* → coordenada), divisão (*Paraíso Fiscal*
  → CEP), Kaprekar (*O Matemático*, a mais difícil de 2019), aritmética modular.
- **Padrão de uso real:** os números estão espalhados no texto e uma dica de uma palavra ("em comum",
  "raiz", "dividir") diz a operação; o resultado concatenado vira CEP/coordenada.
- **Entrada → saída:** uma lista de números → um painel: MDC/MMC, raiz de cada, soma, divisão par a
  par, Kaprekar, resto modular — com o resultado já concatenado pronto pra jogar no `location`/`cep`.
- **Nota de implementação:** transformação pura (calculadora dedicada).

#### 7. Mapcode + GeoTude (estender `location`) — mecânica B3
- **Resolve:** os **dois únicos geocódigos da GIA que faltam** na bancada (Maidenhead já entrou):
  *Fragmentos do Mundo* (Mapcode `2JF.5R` → PREFEITURA) e *Engenheiro Foragido* (GeoTude/GeoCoding
  `###`, código `68130.89.91.15.12`). Completa a "rotação enciclopédica de geocódigos".
- **Padrão de uso real:** o título dá o sistema (`###` = sintaxe do GeoTude; logo do serviço no
  título do Mapcode) e o código decodifica pra coordenada.
- **Entrada → saída:** `2JF.5R` / `68130.89.91.15.12` → lat/lng no mapa.
- **Nota de implementação:** **Mapcode** tem algoritmo/lib pública (offline viável, como o Plus Code).
  **GeoTude** é site proprietário (`geotude.com`) — provável necessidade de **web** ou de mapear o
  esquema; se não der offline, degradar para "reconhece o formato + link pra consulta".

#### 8. Diff contra fonte (`diff-source`) — mecânica A18
- **Resolve:** A18, robusta no Challenge (*Pede o VAR*, *Frases Eternas*, *Lições de Mãe*) e na GIA
  (*Basta Isso* placa adulterada, *Bandeiras* brasão trocado, *Sonho Perturbado* intruso).
- **Padrão de uso real:** "compare com a Wikipedia/IMDb; as palavras trocadas, em ordem, são a chave".
- **Entrada → saída:** texto adulterado + texto original (2º campo) → as diferenças (letras/palavras)
  na ordem em que aparecem.
- **Nota de implementação:** transformação pura, **exige 2º campo**. Irmão por exclusão da "pista
  negativa" (A19), que é julgamento humano e não vira decoder.

#### 9. Cifra de disco / roda alfabética (`cipher-disk`) — mecânica A20 (variação da GIA)
- **Resolve:** GIA *Círculos* (prova 17) — 9 discos de **26 setores = alfabeto**, linha vermelha =
  início, setores pretos = letras. Também a "cifra de disco circular" clássica do dicionário.
- **Padrão de uso real:** contar setores a partir da marca de origem até cada setor preto → letra;
  cada disco entrega uma sílaba → UMA BICICLETA.
- **Entrada → saída:** deslocamento(s) de origem + posições marcadas → letras. Na prática é um César
  com origem explícita; vale renderizar a roda pra conferência visual.
- **Nota de implementação:** transformação pura (parente do César com anel visual).

#### 10. Datas → chave (`date-key`) — mecânica A29
- **Resolve:** A29 no Challenge (serial de Excel em *Contando os Dias*, ano-modelo, padrão de
  nascimento) e na GIA (*O Código Songi* → **signo pela data**; *Festa*/*A Mais Amada* → dígitos de anos).
- **Padrão de uso real:** pesquisar a data de algo → extrair um dígito/derivado → A1Z26/índice/CEP.
- **Entrada → saída:** uma data → signo do zodíaco, dia da semana (Zeller), fase da lua, serial de
  Excel, timestamp Unix, último dígito.
- **Nota de implementação:** transformação pura (tabelas fixas de zodíaco + cálculos de calendário).

#### 11. Conversões de cor (`color-convert`) — mecânica A28
- **Resolve:** A28 no Challenge (Encycolorpedia, RGB, HSL) e na GIA (*Desenhar e Colorir* →
  catálogo **Faber-Castell**).
- **Padrão de uso real:** hex/RGB/HSL → nome de cor, ou código de fabricante → nome → contagem/índice.
- **Entrada → saída:** `#54...`/`rgb()`/`hsl()` → nome aproximado + valores nos outros espaços.
- **Nota de implementação:** base hex↔RGB↔HSL é pura; nome aproximado precisa de **tabela de cores
  nomeadas** (dataset pequeno). Faber-Castell/Pantone exigem **catálogo de fabricante** (dataset).

#### 12. Esteganografia por espaçamento (`whitespace-stego`) — mecânica A16 (variação inédita da GIA)
- **Resolve:** GIA *Os olhos enganam* (prova 41) — a "anti-prova" que nega conter cifra e esconde
  Braille nos espaços.
- **Padrão de uso real:** espaço duplo = ponto, espaço simples = vazio; contabiliza por linha,
  agrupa de 3 em 3 linhas, monta a célula Braille, lê de trás pra frente → TACA → TAÇA.
- **Entrada → saída:** texto com espaços/tabs → bits → Braille ou binário. Sobrevive em texto plano
  (some em PDF).
- **Nota de implementação:** transformação pura; encadeia com o `braille` e o `reverse` que já existem.

#### 13. Código de cores de resistor (`resistor`) — mecânica A25 (sub)
- **Resolve:** Challenge *Vive La Resistance* (2025, resistores) — assinatura burocrática da casa.
- **Padrão de uso real:** faixas de cor → valor em ohms (ou o inverso), servindo de número pra
  A1Z26/índice.
- **Entrada → saída:** lista de cores (preto, marrom, vermelho…) → valor; e valor → faixas.
- **Nota de implementação:** transformação pura (tabela fixa de 10 cores + multiplicador/tolerância).

### Prioridade BAIXA

#### 14. Alfabetos exóticos e símbolos (`exotic-alphabets`) — mecânicas A9/A10
- **Resolve:** Pigpen/maçônico (*Puzzle & Poesia*), runas + nyctográfico (madrugada 2019), gematria
  (*Scotland Yard*, foi longe demais 0/4), Libras, semáforo naval.
- **Nota de implementação:** a maioria é **imagem** (símbolo → letra), difícil de digitar; o
  entregável realista é uma **tabela de referência** + os casos textualizáveis (gematria numérica é
  transformação pura; um mapa Pigpen ASCII é possível). Baixo ROI para digitação.

#### 15. Fórmula molecular → dígitos (estender `periodic-table`) — mecânica A19/A23 (GIA)
- **Resolve:** GIA *Químico maluco* — H₃PO₄/H₂O/HNO₃ → subscritos em ordem `3·1·4|2·1|1·1·3` → 3142-1113.
- **Nota de implementação:** transformação pura; hoje o `periodic-table` soma massas — falta extrair
  **subscritos como dígitos posicionais**. Niche.

#### 16. Leitura de grade rotativa / caracol (`grid-spiral`) — mecânica A20 (GIA)
- **Resolve:** GIA *Padrão* (prova 15) — grade 8×8 lida em 4 braços sincronizados (não é espiral simples).
- **Nota de implementação:** transformação pura mas de nicho (mecanismo visto 1×); depende de colar
  a grade estruturada.

#### 17. Burocráticos extra por lookup (`cid10`, `cnae`, `fipe`, `anatel`, `correios`) — mecânica A25
- **Resolve:** as "variações inéditas" de A25 (CID-10, CNAE, FIPE, Anatel/orelhão, rastreio Correios).
- **Nota de implementação:** cada um é **dataset/base pública** (alguns com API); ver a seção de Bases.
  Prioridade baixa até aparecerem numa prova concreta.

#### 18. Coordenada → cidade → DDD (`reverse-geo-ddd`) — mecânicas B2/B4 (GIA, cadeia inversa)
- **Resolve:** GIA *Enxergar sem ver* — coordenadas de cidades escondidas → DDD de cada → telefone.
- **Nota de implementação:** inverso do fluxo atual (hoje decodificamos *para* coordenada). Precisa
  de **reverse-geocode** (cidade a partir de lat/lng) — dataset de municípios+centroides (temos IBGE)
  ou web. O `ddd` já faz cidade→DDD; falta o passo coordenada→cidade.

#### 19. Reconhecedor de bases com acesso restrito (`gov-recognizer`) — mecânica A25
- **Resolve:** TSE (GIA *CRJA*), planta de valores VM (GIA *Além dos Nomes*/*CRJA*), postes Cidade
  Iluminada (GIA *Seguindo as Orientações*).
- **Nota de implementação:** **NÃO raspar.** Ver a seção de Bases — essas fontes têm captcha/login
  (Cidade Iluminada) ou ViewState/sem-CORS (SIATU) e foram **adiadas por decisão do dono**. O
  entregável aqui é só: reconhecer o formato do código e **linkar para a consulta oficial**, nunca
  automatizar o acesso.

---

## Bases públicas e datasets

O par `código burocrático + consulta pública` é declarado no dicionário como "a identidade
intelectual do evento". A GIA revelou **dez bases brasileiras nunca tocadas**. Abaixo, o que cada uma
indexa e como viraria um "resolvedor de atalho" na bancada — marcando o que é offline-viável e o que
esbarra em scraping/captcha.

| Base | O que indexa | Vira atalho de… | Acesso |
|---|---|---|---|
| **VM — planta de valores das ruas (SIATU / cadastro imobiliário)** | cada rua de Blumenau → um nº arbitrário e estável de ~4 dígitos (e ano eleitoral, na GIA 34) | **rua ↔ VM ↔ ano**; o melhor "número secreto por rua" que existe (GIA *Além dos Nomes*, *CRJA*) | **Adiado.** SIATU é ASP.NET WebForms (`__VIEWSTATE`, sem CORS) — impossível do navegador estático. Caminho: **dataset oficial via LAI/dados abertos** → JSON offline (igual fizemos com ruas/CEP). |
| **TSE — resultados eleitorais** | votação exata de um candidato → nome do candidato | votação → candidato → índice de letra (GIA *CRJA*) | **Adiado.** Portal/scraping; sem JSON aberto amigável. Reconhecer + linkar. |
| **Cidade Iluminada (postes, Exati)** | nº de plaqueta de poste → ponto no mapa (+ Street View) | plaqueta → local → placa de trânsito (GIA *Seguindo as Orientações*) | **Bloqueado — respeitar.** reCAPTCHA Enterprise + login; **sem bulk**. Já investigado e adiado (não burlar captcha de terceiro comercial). Caminho: pedido oficial (LAI/PPP de iluminação). |
| **Catálogo Faber-Castell (cores)** | código (015) → nome ("Laranja Escuro") + cor | código → nome → contagem/índice (GIA *Desenhar e Colorir*) | **Parcial, e assim fica.** Não há fonte pública utilizável: a tabela da fabricante só existe em encarte impresso e em digitalizações de terceiros — não se raspa. Shipamos as **12 cores conferidas no gabarito**, e código fora dessa lista responde "não catalogado" em vez de calar. Ampliar é digitação manual. |
| **CBMSC — mapas de batalhão** | silhueta municipal → região/batalhão | silhueta → nº da região → índice (GIA *Esquentou*) | **Parcial.** Imagens estáticas; embarcar como referência visual. |
| **Guia oficial da Oktoberfest (PDF)** | mapa numerado de atrações → nome da atração | `atração.posição` → letra (GIA *Origens*) | **Efêmero.** O PDF muda todo ano; não vale dataset fixo, só reconhecer o padrão. |
| **HathiTrust Digital Library** | página do scan (#77) ↔ página do livro impresso (989) | offset scan×impresso → A1Z26 cíclico (GIA *Sonho Perturbado*) | **API existe**, mas de nicho. Baixa prioridade. |
| **Prefixo GS1 (código de barras)** | prefixo → país de origem | GS1 → país → dígito de coordenada (GIA *Ponto de Encontro*) | **Já shipado** (`gs1-prefixes.ts`, no `barcode`). |
| **Portal COVID municipal** | rótulos oficiais dos sintomas ilustrados | site → rótulo → índice (GIA *Proteção Diária Básica*) | **Obsoleto/efêmero.** Não vale automatizar. |
| **Estatuto de entidade (CTG Fogo de Chão)** | artigo/palavra como coordenada textual | `A{artigo}L{palavra}` → letra (GIA *Quem Peleia*) | Documento avulso, não é dataset; casa com o item 1 (índice A{n}L{m}). |

**Datasets que já temos e alimentam a bancada:** guia de ruas de Blumenau (nome/código/lei/data —
`street-guide`), CEP de SC, municípios IBGE, aeroportos (IATA/ICAO), participantes PIX (ISPB),
prefixos GS1, tabela periódica, **wordlists pt (259.220) e en (204.216)** e as tabelas pequenas
in-bundle acrescentadas na execução: 255 cores nomeadas em pt-BR, faixas de resistor, ~400
municípios por DDD, compostos químicos (nome → fórmula), Braille, Pigpen e Libras. A onda 6
acrescentou mais cinco, todas pequenas e sem pipeline de build — **51 KB de fonte somados**:
prefixos de banco e fatores de vencimento (`boleto`), 27 cUF + 10 modelos + 9 tpEmis
(`chave-nfe`), as 28 UFs do TSE (`titulo-eleitor`), as faixas de letra por UF (`placa-veiculo`) e a
tabela 5.6 da UPU + sufixos ISO 3166-1 (`correios`).

> A frase original desta seção — "a wordlist pt-BR é o dataset mais valioso que ainda falta" — era
> falsa quando foi escrita: as duas listas estavam versionadas havia 5 semanas, consumidas só pela
> aba Anagramas. Hoje alimentam também o **selo de palavra real** do ranking, que era o valor que a
> frase estava tentando prever.

**Burocráticos extra (variações A25, item 17)** — a lista original era CID-10, CNAE, FIPE, Anatel,
rastreio Correios, placa Mercosul e INMETRO, todos "adotar sob demanda quando a prova pedir". A
**onda 6 partiu a lista em duas pelo custo, não pela frequência** (que segue zero em todos):

- **Entraram, porque não são base — são conta:** rastreio dos **Correios** (DV mód-11 do padrão UPU
  S10, tabela de serviço e sufixo ISO de país, tudo na norma) e **placa Mercosul** (conversão
  reversível 0=A…9=J e UF pela faixa histórica de letras). Nenhum dos dois precisa de dataset nem
  de rede.
- **Continuam de fora, porque são base mesmo:** **CID-10** (~500 KB), **CNAE**, **FIPE** (API
  mensal, incompatível com JSON commitado na imagem) e **Anatel** (sem bulk). Aqui a regra original
  vale intacta: **dataset sem prova não entra**.

O critério que ficou: *tabela pequena in-bundle pode entrar sob aposta; dataset espera a prova.*

---

## Melhorias na bancada (transversais)

O acervo não pede só "mais decoders" — pede que a bancada **case com o formato real das provas**, que
são cadeias multicamada com o título como primeira pista.

1. **Pipeline / encadeamento ("usar resultado como entrada").** · **ENTREGUE** — barra de Cadeia
   com volta, migalha clicável e ramificação (`decoder/trail.ts`). As provas são **cadeias de 2–4
   camadas** (Base64 → outra cifra; contagem → A1Z26 → índice → CEP → rua). Hoje o fluxo é
   copiar-colar manualmente o resultado de um decoder na entrada do próximo. Um botão **"usar como
   entrada"** em cada `ResultCard` (e, no limite, uma trilha de passos) tira o atrito da cadeia
   inteira. É a melhoria de maior impacto.

2. **Campo secundário genérico ("título/lista como chave").** · **ENTREGUE** — botão "2º campo" e
   `Decoder.inputs` declarativo; na prática só o `count-key` consome o campo (ver `PLANO-CIFRAS.md` §8-D8). Vários itens de alta prioridade —
   Índice de letra (1), Diff (8), Cifra vocálica (5), Acróstico-índice — precisam de um **segundo
   texto** (a palavra a indexar, o texto-fonte, a lista de deslocamentos). A bancada só tem o campo
   de chave do Vigenère. Generalizar esse campo destrava metade dos gaps de alta prioridade.

3. **Modo "título como chave".** · **ENTREGUE** — campo de título → chips de dica
   (`engine/title-hints.ts`). Por decisão explícita, **o título nunca entra em `decode()` nem no ranking**. Na GIA o **título é sistematicamente a camada 1** (*Ask Me*→ASCII,
   *Prova Quadrada*→raiz, *SONGI*→SIGNO, *###*→GeoTude). Um campo de "título" que a bancada
   interpreta como pista (fonética → ASCII? anagrama? nome de sistema de geocódigo?) alinha a
   ferramenta ao "contrato explícito com quem resolve" que a GIA formalizou.

4. **Realce de "palavra reconhecível" (checksum grátis).** · **ENTREGUE** — selo "palavra real" no
   cartão, com as duas wordlists (pt+en) e gate de 4 letras. A lição nº 1 do acervo: o preditor de
   fracasso é **dupla camada sem validação intermediária**, e a GIA resolve isso fazendo cada camada
   intermediária resolver para uma **palavra real** (GEOTUDE, MAPCODE, COVID, OSCAR, SIGNO). Com a
   wordlist pt-BR, a bancada pode **dar boost de score** a qualquer saída que seja uma palavra real —
   sinalizando "você acertou o meio do caminho" exatamente onde as equipes historicamente travam.

5. **Detector de dicionário/formato (estender o que já existe).** · **ENTREGUE** — faixa de chips do
   sniffer (`engine/sniff.ts`), inclusive o diagnóstico negativo ("é ASCII, não A1Z26", "o DV não fecha"). A fan-out + score já roda todos os
   decoders e ranqueia — para geocódigo o reconhecimento por formato (`///`, `GH94RC`, `2JF.5R`,
   8 dígitos) já é forte. Vale estender a **sinalização explícita**: "isto tem cara de Mapcode / de
   ASCII e não A1Z26 / de prefixo GS1", copiando o truque do **título-dica** da GIA, cuja barreira
   histórica era justamente confundir ASCII com A1Z26.

---

## Tabela-resumo priorizada

A coluna de prioridade não faz mais sentido — a fila acabou. No lugar dela, o que cada item virou:

| # | Mecânica | Status | Onde vive hoje |
|---|---|---|---|
| 1 | A4 Letra por posição indexada | **ENTREGUE** | decoder `letter-index` + modos "N fontes" na aba Posições (`positions/zip.ts`) |
| 2 | A5 Contagem como chave | **ENTREGUE** | decoder `count-key` + séries de contagem na aba Texto (`text-extract/counts.ts`) |
| 3 | A2 Acróstico posicional/reverso | **ENTREGUE** | `acrostic-nth`, segundo decoder dentro de `decoders/acrostic.ts` |
| 4 | A6 Anagrama | **ENTREGUE** | aba Anagramas (já existia) + duas palavras, sobra de 1–2 letras e fonte "Ruas" |
| 5 | A8 Cifra vocálica | **ENTREGUE** | decoder `vowel-cipher` (a saída primária é LAPIS, não o texto) |
| 6 | A23 Aritmética disfarçada | **ENTREGUE** | decoder `math-helper` + `features/math/arith.ts` + card de painel |
| 7 | B3 Mapcode + GeoTude | **ENTREGUE** | `location`: GeoTude offline puro; Mapcode por `import()` dinâmico |
| 8 | A18 Diff contra fonte | **ENTREGUE, reescopado** | **aba Diferenças** (`features/diff/`), não decoder — com as 4 tiras copiáveis |
| 9 | A20 Roda alfabética 26 setores | **ENTREGUE** | decoder `cipher-disk` + card SVG da roda (`render: "wheel"`) |
| 10 | A29 Datas como chave | **ENTREGUE** | decoder `date-key` (signo, Zeller, dia do ano, Excel, Unix, lua) |
| 11 | A28 Conversões de cor | **ENTREGUE** | `color-convert` (255 cores pt-BR, ΔE em CIELab) + `faber-castell` |
| 12 | A16 Estego por espaçamento | **ENTREGUE como inspetor** | `whitespace-stego`: 4 leituras × 2 direções + perfil linha a linha. A prova 41 segue irrecuperável do acervo |
| 13 | A25 Cores de resistor | **ENTREGUE** | `resistor` — o único do lote com `encode`; emite valor **e** dígitos |
| 14 | A9/A10 Pigpen/runas/gematria | **PARCIAL** | `letter-values` (primos/gematria/redução) + legendas de Pigpen e Libras na Cola. **Runas: o decoder EXISTE** (`reference/alphabets.ts:513` Elder, `:573` Younger) — o que falta é a legenda desenhada, para quem vê o traço numa foto e não tem o caractere. A nota antiga ("adiadas por falta de âncora") estava errada nas duas metades e saiu em 19/08/2026 |
| 15 | A19/A23 Fórmula molecular | **ENTREGUE** | 4º modo do `periodic-table` + `reference/compounds.ts` (nome pt-BR → fórmula) |
| 16 | A20 Grade rotativa 4 braços | **ENTREGUE** | decoder `grid-read` (4 braços, espirais, serpentinas) |
| 17 | A25 Burocráticos extra | **DESCARTADO em parte** | CID-10/CNAE/FIPE/Anatel seguem fora (são dataset). Rastreio **Correios** e **placa Mercosul** entraram na onda 6 por não precisarem de dataset — `correios` e `placa-veiculo` |
| 18 | B2/B4 Coordenada→cidade→DDD | **ENTREGUE, reescopado** | `ddd-cidade` faz **cidade→DDD**; coordenada→cidade já se resolvia colando a coordenada |
| 19 | A25 TSE / VM / postes | **ENTREGUE como documentação** | seção "Bases e onde consultar" da Cola (`reference/sources.ts`) — reconhecer e linkar, nunca raspar |
| — | *(ausente do TODO)* Reagrupar dígitos | **ENTREGUE** | `digit-regroup` — descarta pontuação, concatena, reparte em blocos (GIA-01) |
| ° | *(fora do acervo)* Onda 6 — códigos burocráticos | **ENTREGUE sob aposta** | `boleto`, `chave-nfe`, `titulo-eleitor`, `placa-veiculo`, `correios` — nenhuma prova pediu; a justificativa é a "identidade intelectual do evento" (§ Bases) |
| ° | *(fora do acervo)* Onda 6 — geocódigos | **ENTREGUE sob aposta** | MGRS/USNG, carta IBGE/DSG, GEOREF, GARS e grade estatística IBGE no `detectLocation` — a casa rotaciona o sistema a cada madrugada, cobertura ampla é a aposta |
| ° | *(fora do acervo)* Onda 6 — cifra e utilitário | **ENTREGUE sob aposta** | `rot8000` (ROT13 do Unicode) e `numero-extenso` (extenso pt-BR ↔ dígitos, este já era ideia do Roadmap in-app) |

**Contagem:** 16 entregues como cifra ou aba · 1 entregue como documentação · 1 parcial · 1
descartado · total = 19 (mais 1 item que o TODO não tinha). **Fora dessa conta**, porque não saem
deste catálogo: os 12 itens da onda 6, marcados **°** — 7 decoders e 5 geocódigos que nasceram de
varredura da web, sem prova por trás ([`PLANO-CIFRAS.md`](PLANO-CIFRAS.md) §4).

Regra de ouro do acervo, para toda cifra nova acima: **toda camada intermediária deve resolver para
uma palavra reconhecível** — é a resposta direta ao padrão de fracasso mais reincidente do corpus
(dupla camada sem checkpoint). Priorizar transformações puras que encadeiam limpo, e o campo
secundário + o pipeline que as fazem funcionar em cadeia.
