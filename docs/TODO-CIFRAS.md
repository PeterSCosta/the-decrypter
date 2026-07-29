# TODO — Cifras a cobrir na bancada

**Origem.** Este arquivo é destilado do acervo de provas das gincanas (Itajaí Challenge 2016–2026 +
GIA Virtual 2026), cruzando o **Dicionário de Cifras** (`the-logic-lab/scripts/import-historico/acervo/DICIONARIO-CIFRAS.md`,
38 mecânicas nas famílias A/B/E), a **análise das 41 provas da GIA** (`acervo/GIA-2026.md`) e as
**73 cadeias de dedução** (`acervo/RESOLUCOES.md`) contra o que o Decrypter já sabe fazer hoje
(~55 decoders em `src/features/decoder/engine/`).

**Objetivo.** Quebrar essas cifras rápido na bancada. A gincana quase nunca é uma cifra pura — é uma
**cadeia de 2 a 4 camadas** que termina num CEP, coordenada, telefone ou objeto. Cada item abaixo
existe para tirar uma camada dessas cadeias do caminho crítico. A prioridade segue **a frequência
histórica** (o dicionário mede por cumprimento X/N) e as **"variações inéditas"** que o dono quer
poder quebrar sem improviso.

> **Escopo.** Só cifras "software puro" ou lookup por dataset offline entram como decoder. Mecânicas
> físicas (revelação por calor/UV — A17, overlay — A21, cofre — A31) e de encenação (Família D) não
> são decodificáveis aqui e ficam fora. Áudio/vídeo (Família E) idem, salvo o subproduto textual.

---

## Já cobertos (decoder existente ↔ mecânica do dicionário)

| Mecânica (dicionário) | Decoder(s) no Decrypter |
|---|---|
| A3 Número↔letra (A1Z26) | `a1z26`, `a1z26-encode`, `a1z26-reverse` (1=Z) |
| A7 Atbash | `atbash` |
| A8 César / substituição por deslocamento | `caesar` (ROT-N), `caesar-bruteforce`, `rot13`, `rot18`, `rot47`; progressivo → `trithemius` |
| A8 Vigenère e parentes | `vigenere`, `autokey`, `beaufort`, `gronsfeld`, `porta` |
| A11 Binário | `binary`, `binary-number` |
| A12 ASCII | `decimal` (códigos ASCII), `hex`, `octal` |
| A13 Morse | `morse` |
| A14 Base64 e famílias | `base64`, `base32`, `base32hex`, `base45`, `base58`, `ascii85`, `base-converter` |
| A15 Braille | `braille` (Unicode ⠿ — **só** a forma já-em-célula; ver A16-whitespace nos gaps) |
| A1 Acróstico de iniciais | `acrostic` (**só** 1ª letra de palavra/linha — ver A2 nos gaps) |
| A20 Grade / disco (parcial) | `polybius`, `bifid`, `playfair`, `columnar`, `railfence`, `bacon` |
| A22 Inversão / espelho / leitura reversa | `reverse` |
| A24 Números romanos | `roman` |
| A25 Códigos burocráticos | `barcode` (EAN/UPC **+ país por prefixo GS1**), `isbn`, `ncm`, `documento` (CPF/CNPJ), `airport` (IATA/ICAO), `pix-participant` (ISPB), `registrobr` (.br), `ddd`, `ddi`, `ibge-municipio` |
| A23 Aritmética (parcial) | `base-converter`, `periodic-table` (massas atômicas) |
| A26 Teclado T9 / QWERTY | `t9-multitap`, `keyboard`, `tap-code` |
| A10 Leet (parcial) | `leetspeak` |
| A16 Esteganografia (parcial) | `zero-width` (só caracteres invisíveis) |
| A27 Fonética (parcial) | `nato` (alfabeto fonético) |
| — Notas musicais como letras | `music-notes` |
| B1 CEP → rua | `cep-exact`, `cep-sc-prefix`, `cep-wildcard`, `street-name`, `street-code`, `street-law`, `street-date` |
| B2 Coordenadas GPS / GMS | `location` (DD, DMS, DDM) |
| B3 Geocódigos modernos | `location` + `local-geocode` + `geohex-wildcard`: Plus Code (e cauda), Geohash (e cauda), **Maidenhead**, UTM, Quadkey, H3, GeoHex, what3words |
| — Diagnóstico de formato | `hash-id`, `digit-count` (comprimento → que documento pode ser) |

Observação: **GS1 → país** já sai no `barcode`. Portanto a variação da GIA `Ponto de Encontro`
(prefixo GS1 vira **dígito de coordenada**) é um *padrão de uso*, não um decoder faltante — os dados
já estão na bancada, falta encadear (ver Melhorias).

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
- **Resolve:** A6, adormecida no Challenge desde 2019 mas **viva na GIA (3×)**: *O Código Songi*
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
| **Catálogo Faber-Castell (cores)** | código (015) → nome ("Laranja Escuro") + cor | código → nome → contagem/índice (GIA *Desenhar e Colorir*) | **Offline viável.** Tabela estática pequena → dataset shippável (alimenta o item 11). |
| **CBMSC — mapas de batalhão** | silhueta municipal → região/batalhão | silhueta → nº da região → índice (GIA *Esquentou*) | **Parcial.** Imagens estáticas; embarcar como referência visual. |
| **Guia oficial da Oktoberfest (PDF)** | mapa numerado de atrações → nome da atração | `atração.posição` → letra (GIA *Origens*) | **Efêmero.** O PDF muda todo ano; não vale dataset fixo, só reconhecer o padrão. |
| **HathiTrust Digital Library** | página do scan (#77) ↔ página do livro impresso (989) | offset scan×impresso → A1Z26 cíclico (GIA *Sonho Perturbado*) | **API existe**, mas de nicho. Baixa prioridade. |
| **Prefixo GS1 (código de barras)** | prefixo → país de origem | GS1 → país → dígito de coordenada (GIA *Ponto de Encontro*) | **Já shipado** (`gs1-prefixes.ts`, no `barcode`). |
| **Portal COVID municipal** | rótulos oficiais dos sintomas ilustrados | site → rótulo → índice (GIA *Proteção Diária Básica*) | **Obsoleto/efêmero.** Não vale automatizar. |
| **Estatuto de entidade (CTG Fogo de Chão)** | artigo/palavra como coordenada textual | `A{artigo}L{palavra}` → letra (GIA *Quem Peleia*) | Documento avulso, não é dataset; casa com o item 1 (índice A{n}L{m}). |

**Datasets que já temos e alimentam a bancada:** guia de ruas de Blumenau (nome/código/lei/data —
`street-guide`), CEP de SC, municípios IBGE, aeroportos (IATA/ICAO), participantes PIX (ISPB),
prefixos GS1, tabela periódica. **A wordlist pt-BR (para o Anagrama, item 4) é o dataset mais valioso
que ainda falta** — e destrava também o realce de "palavra reconhecível" (ver Melhorias).

**Burocráticos extra (variações A25, item 17)** — CID-10, CNAE, FIPE, Anatel, rastreio Correios,
placa Mercosul, INMETRO: cada um é uma base própria; adotar sob demanda quando a prova pedir.

---

## Melhorias na bancada (transversais)

O acervo não pede só "mais decoders" — pede que a bancada **case com o formato real das provas**, que
são cadeias multicamada com o título como primeira pista.

1. **Pipeline / encadeamento ("usar resultado como entrada").** As provas são **cadeias de 2–4
   camadas** (Base64 → outra cifra; contagem → A1Z26 → índice → CEP → rua). Hoje o fluxo é
   copiar-colar manualmente o resultado de um decoder na entrada do próximo. Um botão **"usar como
   entrada"** em cada `ResultCard` (e, no limite, uma trilha de passos) tira o atrito da cadeia
   inteira. É a melhoria de maior impacto.

2. **Campo secundário genérico ("título/lista como chave").** Vários itens de alta prioridade —
   Índice de letra (1), Diff (8), Cifra vocálica (5), Acróstico-índice — precisam de um **segundo
   texto** (a palavra a indexar, o texto-fonte, a lista de deslocamentos). A bancada só tem o campo
   de chave do Vigenère. Generalizar esse campo destrava metade dos gaps de alta prioridade.

3. **Modo "título como chave".** Na GIA o **título é sistematicamente a camada 1** (*Ask Me*→ASCII,
   *Prova Quadrada*→raiz, *SONGI*→SIGNO, *###*→GeoTude). Um campo de "título" que a bancada
   interpreta como pista (fonética → ASCII? anagrama? nome de sistema de geocódigo?) alinha a
   ferramenta ao "contrato explícito com quem resolve" que a GIA formalizou.

4. **Realce de "palavra reconhecível" (checksum grátis).** A lição nº 1 do acervo: o preditor de
   fracasso é **dupla camada sem validação intermediária**, e a GIA resolve isso fazendo cada camada
   intermediária resolver para uma **palavra real** (GEOTUDE, MAPCODE, COVID, OSCAR, SIGNO). Com a
   wordlist pt-BR, a bancada pode **dar boost de score** a qualquer saída que seja uma palavra real —
   sinalizando "você acertou o meio do caminho" exatamente onde as equipes historicamente travam.

5. **Detector de dicionário/formato (estender o que já existe).** A fan-out + score já roda todos os
   decoders e ranqueia — para geocódigo o reconhecimento por formato (`///`, `GH94RC`, `2JF.5R`,
   8 dígitos) já é forte. Vale estender a **sinalização explícita**: "isto tem cara de Mapcode / de
   ASCII e não A1Z26 / de prefixo GS1", copiando o truque do **título-dica** da GIA, cuja barreira
   histórica era justamente confundir ASCII com A1Z26.

---

## Tabela-resumo priorizada

| # | Decoder sugerido | Mecânica | Prioridade | Tipo | Prova-âncora |
|---|---|---|---|---|---|
| 1 | `letter-index` | A4 Letra por posição indexada | **Alta** | Puro (2º campo) | GIA *E Agora* / *Romanos* |
| 2 | `count-key` | A5 Contagem como chave | **Alta** | Puro | GIA *O poder das palavras* |
| 3 | estender `acrostic` | A2 Acróstico posicional/reverso | **Alta** | Puro | GIA *Sinfonia Silenciosa* |
| 4 | `anagram` | A6 Anagrama | **Alta** | Dataset (wordlist) | GIA *O Código Songi* |
| 5 | `vowel-cipher` | A8 Cifra vocálica | **Alta** | Puro | GIA *I lingii di i* |
| 6 | `math-helper` | A23 Aritmética disfarçada | Média | Puro | GIA *Engenheiro Foragido* / *Prova Quadrada* |
| 7 | estender `location` | B3 Mapcode + GeoTude | Média | Lib/Web | GIA *Fragmentos do Mundo* |
| 8 | `diff-source` | A18 Diff contra fonte | Média | Puro (2º campo) | GIA *Basta Isso* |
| 9 | `cipher-disk` | A20 Roda alfabética 26 setores | Média | Puro | GIA *Círculos* |
| 10 | `date-key` | A29 Datas como chave | Média | Puro | GIA *O Código Songi* |
| 11 | `color-convert` | A28 Conversões de cor | Média | Dataset (cores) | GIA *Desenhar e Colorir* |
| 12 | `whitespace-stego` | A16 Estego por espaçamento | Média | Puro | GIA *Os olhos enganam* |
| 13 | `resistor` | A25 Cores de resistor | Média | Puro | Challenge *Vive La Resistance* |
| 14 | `exotic-alphabets` | A9/A10 Pigpen/runas/gematria | Baixa | Referência/imagem | Challenge *Scotland Yard* |
| 15 | estender `periodic-table` | A19/A23 Fórmula molecular | Baixa | Puro | GIA *Químico maluco* |
| 16 | `grid-spiral` | A20 Grade rotativa 4 braços | Baixa | Puro | GIA *Padrão* |
| 17 | `cid10`/`cnae`/`fipe`/… | A25 Burocráticos extra | Baixa | Dataset/Web | (variações inéditas) |
| 18 | `reverse-geo-ddd` | B2/B4 Coordenada→cidade→DDD | Baixa | Dataset/Web | GIA *Enxergar sem ver* |
| 19 | `gov-recognizer` | A25 TSE / VM / postes | Baixa | Só reconhecer + linkar | GIA *CRJA* / *Seguindo as Orientações* |

**Contagem:** Alta = 5 · Média = 8 · Baixa = 6 · total = 19.

Regra de ouro do acervo, para toda cifra nova acima: **toda camada intermediária deve resolver para
uma palavra reconhecível** — é a resposta direta ao padrão de fracasso mais reincidente do corpus
(dupla camada sem checkpoint). Priorizar transformações puras que encadeiam limpo, e o campo
secundário + o pipeline que as fazem funcionar em cadeia.
