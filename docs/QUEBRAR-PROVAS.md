# Quebrar provas — playbook de campo

> **Documento irmão:** [`TODO-CIFRAS.md`](TODO-CIFRAS.md) e [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md)
> descrevem **o que falta construir** na bancada. Este aqui descreve **o que fazer com o papel na
> mão**, com o relógio correndo. Onde a bancada não alcança, aponto para lá e sigo.

**Fontes.** Tudo abaixo sai de cinco lugares, e nada foi inventado:
`acervo/DICIONARIO-CIFRAS.md` (38 mecânicas, famílias A/B/E, com cumprimento X/N medido) ·
`acervo/RESOLUCOES.md` (73 cadeias de dedução reais) · `acervo/GIA-2026.md` (41 provas da GIA) ·
`acervo/DIFICULDADE.md` (o modelo de custo/janela, base da §6) ·
o próprio `src/features/decoder/engine/` (nomes de decoder conferidos em runtime).
Onde o material não fecha, está escrito **não encontrado**; onde o número é palpite meu e não
medição, está escrito **estimativa**.

**Eixo.** O documento se organiza por **o que você tem na mão**, não por ordem de cifra. A primeira
pergunta sob pressão é "o que é isto que estou vendo", não "como funciona Vigenère".

---

## 0. Estado da bancada (leia uma vez, antes da gincana)

Medido em runtime importando o registry: **96 decodificadores**, **771 testes** verdes em 71
arquivos. O número sobe a cada cifra nova. **Não decore o número; faça o teste de bancada:** role a
barra lateral e confira se as três canárias estão lá.

**As três canárias.** São os decoders que mais mudam o seu procedimento manual se faltarem:

| Se a barra lateral NÃO tem | Você perde | E volta a fazer à mão |
|---|---|---|
| `Letra por posição` (`letter-index`) | A4, ~25 usos — a **2ª** mecânica mais usada do acervo (atrás só do acróstico A1, ~28) | §2.2 e §3.2 |
| `Contagem como chave` (`count-key`) | A5, ~15 usos | §2.3 |
| `Localização` (`location`) resolvendo **Mapcode** | o geocódigo da GIA-08 | mapcode.com (§2.7) |

Se qualquer uma faltar, você está diante de uma **versão antiga da bancada** — não de um limite dela.
O resto deste documento pressupõe as 89.

Abas da bancada: **Decodificador · Texto · Posições · Diferenças · Anagramas · Cola · Frota**
(sete). A aba **Cola** ganhou peso: além das tabelas de cor e A1Z26, ela hoje carrega a legenda de
**pigpen** e o alfabeto de **Libras** (§2.4) e o diretório **"Bases e onde consultar"**, com o link
oficial e o status de cada base pública que a GIA e o Challenge já usaram (§7.3).

---

## 1. COMO USAR

1. **Leia o título como cifra antes de ler o texto.** Em 11 das 41 provas da GIA o título já entrega
   a mecânica (`GIA-2026.md` §3.1). Custa 30 segundos e é a checagem mais barata que existe.
2. **Cole o material bruto na aba Decodificador** e olhe os chips do farejador antes dos cartões.
3. **Abra a gaveta "pouco provável".** O corte é 0,35 e saída só de dígitos leva multiplicador 0,1 —
   **um número correto quase sempre nasce embaixo**.
4. **Não achou nada?** Você não está diante de uma cifra: está diante de um domínio. Vá para a
   TRIAGEM (§2) e nomeie o domínio primeiro.
5. **Chegou a uma palavra?** Aplique o teste de bifurcação da §3.4 antes de correr: nome próprio é
   ferramenta, substantivo comum é resposta.

---

## 2. TRIAGEM — da forma bruta ao primeiro palpite

### 2.0 O achado que governa a triagem inteira

**Varrendo as 73 cadeias, encontrei 7 em que a camada 1 é um bloco com cara de cifra** (a contagem
é leitura minha das cadeias, não um campo do acervo). São estas:
*A Base de Cálculo* (ITC 2017 P18, Base64) · *The Hacker* Et.2 (ITC 2018 P13, Atbash) ·
madrugada Et.2 (ITC 2019 P14, nyctográfico) · *Xallengianos* Et.3 (ITC 2023 P19, cifra de traços) ·
*Puzzle & Poesia* (ITC 2023 P21, pigpen) · *Código entre Amigos* (GIA-16, binário) ·
*I lingii di i* (GIA-22, cifra vocálica).

Nas outras, **a camada 1 é um domínio de conhecimento ou um artefato**. Colar tudo na bancada e
rodar todos eles resolve uma fatia pequena. A bancada quase sempre entra na camada 2 ou 3, depois que
você nomeou o domínio.

### 2.1 Vejo um BLOCO DE DÍGITOS sem separador

| Comprimento | Primeiro palpite | Decoder (nome na barra lateral) | Âncora no acervo |
|---|---|---|---|
| **8 dígitos** | **CEP** — o desfecho nº 1 (~18 usos, B1) | `CEP (Santa Catarina)` (`cep-exact`), `Localização` (`location`) | GIA-06 diz literalmente "8 dígitos = CEP 89066-730" |
| 8 dígitos, não fecha CEP | telefone fixo (8) ou NCM | `NCM` (`ncm`), `Participante PIX (ISPB)` (`pix-participant`) | GIA-09 → 3339-4080; GIA-19 → 3142-1113 |
| **6 dígitos** | CEP sem o prefixo 88/89 | `CEP sem prefixo SC (88/89)` (`cep-sc-prefix`) | — |
| 6 ou 7 dígitos | município IBGE | `Município (IBGE)` (`ibge-municipio`) | — |
| **11 dígitos** | CPF — e o DV diz se não é | `Documento (CPF/CNPJ)` (`documento`) | chip `cpf-bad` avisa quando o DV não fecha |
| **13 dígitos** | EAN-13 → **prefixo GS1 = país** | `Código de barras` (`barcode`) | GIA-07: 4 latinhas → Taiwan/Bulgária/Israel/Egito → coordenada |
| 13 com prefixo 978/979 | ISBN | `ISBN` (`isbn`) | ITC 2018 P18 Et.2 (jornal *Biblioteca Popular*) |
| **14 dígitos** | CNPJ | `Documento (CPF/CNPJ)` (`documento`) | ITC 2022 P18 Et.1: posições da Billboard → CNPJ do McDonald's |
| 1 a 5 dígitos | código de rua de Blumenau (score 0,97) | `Código de rua (Blumenau)` (`street-code`), `Nº da Lei (Blumenau)` (`street-law`) | — |
| **44 dígitos** | chave de acesso de NF-e **ou** código de barras de boleto — os dois têm 44 | `Chave de acesso (NF-e)` (`chave-nfe`) fatia UF, ano/mês, CNPJ do emitente e nº; `Boleto / conta de consumo` (`boleto`) dá banco, valor e **vencimento** | ITC 2018 CG-8 (*Não Faça Experimentos*) |
| 47 ou 48 dígitos | linha digitável de boleto (47) ou de arrecadação (48) | `Boleto / conta de consumo` (`boleto`) — normaliza para os 44 | — |
| **12 dígitos** | título de eleitor — **as posições 9–10 são a UF** | `Título de eleitor` (`titulo-eleitor`) | GIA-34 (*CRJA*) termina em título de eleitor |
| 13 alfanuméricos `AA123456789BR` | rastreio dos Correios / UPU S10 | `Rastreio (Correios)` (`correios`) — DV módulo 11 e tipo de serviço | *De:Para* (**0/3**) |
| qualquer, desconhecido | o que aquele comprimento pode ser | `Quantidade de dígitos` (`digit-count`) | tabela de 26 formatos |
| ≥16 dígitos espalhados na prosa | **reagrupar em blocos de N** | `Reagrupar dígitos` (`digit-regroup`) | GIA-01 *Ask Me*: descartar vírgulas → 8 dígitos/parágrafo → ASCII → TOPO |

### 2.2 Vejo uma LISTA DE NÚMEROS separados

**A discriminação mais cara do acervo está aqui.** Faça na ordem:

| Teste | Se sim | Decoder | Frequência |
|---|---|---|---|
| Algum valor **fora de 1–26** mas dentro de 32–126? | **é ASCII, não A1Z26** | `Decimal (códigos ASCII)` (`decimal`) | A12; o chip `ascii-not-a1z26` acende sozinho |
| Todos entre **1 e 26**? | A1Z26 | `A1Z26 (número→letra)` (`a1z26`) | **A3, ~20 usos** — "o conversor final de metade das cadeias" |
| Existe uma **lista de nomes próprios** junto (equipes, cores, imperadores, cidades)? | **índice de letra dentro do nome**, não do alfabeto | `Letra por posição` (`letter-index`), com os índices no campo de chave | **A4, ~25 usos**; e **11 das 40 fichas de GIA** em `RESOLUCOES.md` trazem a tag de posição de letra |
| Todos são **quadrados perfeitos**? | raiz quadrada | `Aritmética escondida` (`math-helper`); chip `squares` já devolve as raízes | GIA-21 *Prova Quadrada* → coordenada |
| **MDC > 1**? | dividir pelo MDC | `Aritmética escondida` (`math-helper`); chip `gcd` já devolve a divisão | GIA-27: MDC 3 → 7 5 15 20 21 4 5 → GEOTUDE |
| Todos entre **11 e 99** e válidos como DDD? | coordenada → cidade → DDD → telefone | `DDD (área do Brasil)` (`ddd`); chip `all-ddd`. Com a **lista de cidades** em mãos, `Cidade → DDD` (`ddd-cidade`) monta o telefone | GIA-40 → 47-3221-5144 = Ilhatur |
| Todos ≤ 118, tema químico? | número atômico | `Tabela periódica` (`periodic-table`) — **a leitura "número atômico" entra com 0,55**, abaixo da leitura por "símbolos" (0,70) e bem abaixo da que casa nome de composto (0,85): número→elemento é a hipótese mais barata e a mais chutável, então ela cede a vez | ITC 2019 P20: soma dos atômicos = 1993 |
| Números romanos dentro de **nomes**? | o nome já é o número | `Números romanos` (`roman`) | GIA-29 (imperadores → LOUROS); ITC 2023 P19 Et.2 (papas → 28/06/1914) |
| Pares tipo `A3L6`, `33.9`? | par fonte→letra | `Letra por posição` (`letter-index`), chave `A3L6` | GIA-35 (estatuto do CTG), GIA-33 (guia da Oktoberfest) |
| Grupos de 4 dígitos pontuados (`1.6.9.6`)? | **não é par fonte→letra**: é **VM** (planta de valores), e cada VM identifica UMA rua | consulta manual — ver §7.3 | GIA-20 e GIA-34 (a assinatura da edição) |
| Nada disso, e há **prosa com dica de operação**? | a palavra-gatilho manda | `Aritmética escondida` (`math-helper`) — reconhece `raiz`, `em comum`/`mdc`, `dividir`, `múltiplo`, `Kaprekar`, `resto` | A23 |

> **Duas guardas que você precisa conhecer.**
>
> **1. `A1Z26 (número→letra)` recusa qualquer token de 3+ dígitos e qualquer valor acima de 26.**
> Se ele não apareceu, **não é A1Z26** — é ASCII ou é índice.
>
> **2. O painel do `Aritmética escondida` nasce NA GAVETA.** Em lista nua de números, ele entra com
> piso **0,32** — de propósito **abaixo do corte de 0,35**, porque sem uma leitura que signifique
> alguma coisa o painel é uma calculadora sem achado, e calculadora não disputa o topo (com o piso
> antigo, mais alto, ele era o cartão nº 1 para "47 3221 5144" e para qualquer número de cartão). O
> mecanismo que o resgata é o próprio conteúdo: se **alguma linha** do painel lê como palavra —
> GEOTUDE, na GIA-27 —, essa leitura promove o cartão inteiro e ele sobe sozinho. **Regra de campo:
> diante de uma lista de números, abra a gaveta e procure o painel de aritmética; ele estar lá
> embaixo é o comportamento correto, não sinal de que não achou nada.** Com palavra-gatilho na prosa
> ele sai por linha e entra com 0,62; sem gatilho nenhum, escolha-o na barra lateral ("uma cifra
> só") para forçar o painel completo.

### 2.3 Vejo TEXTO CORRIDO com alguma anomalia

| Anomalia | Leitura | Ferramenta |
|---|---|---|
| Maiúsculas espalhadas | acróstico de maiúsculas | aba **Texto** → "maiúsculas na ordem" |
| Iniciais de frase/linha/item | **A1, ~28 usos — a lógica mais usada da história** | `Acróstico` (`acrostic`) |
| A inicial não dá nada | k-ésima letra, alternado, nome↔sobrenome | `Acróstico posicional` (`acrostic-nth`) |
| Negrito demais, poucos sublinhados | **negrito é ruído, sublinhado é sinal** | leitura humana |
| Vírgulas com aviso no enunciado | descartar vírgulas, concatenar dígitos | `Reagrupar dígitos` (`digit-regroup`) |
| Espaços duplos / a palavra "espaço" no texto | whitespace como bit → Braille | `Espaços escondidos (whitespace)` (`whitespace-stego`) — dá o perfil linha a linha e leituras candidatas (as duas direções); **cole preservando as quebras**, PDF/Word reflowam e apagam o sinal |
| Letras em tamanhos diferentes | símbolos de elemento químico | `Tabela periódica` (`periodic-table`) |
| Frases em cores | cor = valor de tabela externa | leitura humana + fonte fixada |
| Texto "quase-português" invertido | leitura reversa | `Texto invertido` (`reverse`) |
| Bloco embaralhado com muitos Z/V/Y | Atbash | `Atbash (alfabeto invertido A↔Z)` (`atbash`) |
| Bloco monoalfabético + um número solto | César com esse deslocamento | `César / ROT-N` (`caesar`), `César — força bruta` (`caesar-bruteforce`) |
| Lista de deslocamentos **com sinal** (`+11 −4 +7 −6 −2`) | cifra vocálica | `Cifra vocálica (deslocamento com sinal)` (`vowel-cipher`) |
| Muitas linhas/parágrafos homogêneos e nenhum número | **contar** | `Contagem como chave` (`count-key`) |
| Texto real levemente errado | diff contra a fonte | aba **Diferenças** — cole o adulterado de um lado, a fonte do outro. Achar a fonte ainda é manual (A18) |

Exemplos: GIA-08 (maiúsculas → MAPCODE) · GIA-25 (iniciais de frase → CIDADE ILUMINADA) ·
GIA-12 (acróstico duplo: título → PDB, bullets → COVID) · GIA-10 (3 sublinhadas = `///cuidou.prol.loja`) ·
GIA-30 (5ª letra de trás para frente dos títulos do VLAD V) · GIA-04 (contar palavras → VENCEDOR) ·
GIA-22 (`+11 −4 +7 −6 −2` → LAPIS) · ITC 2017 P7 Et.2 (a palavra **antes** do marca-texto).

### 2.4 Vejo SÍMBOLOS, pontos e traços

| Vejo | Decoder | Nota |
|---|---|---|
| Só `.` `-` `/` `|` | `Código Morse` (`morse`) | A13; o filtro histórico é o **canal** (luz, som, vídeo), não o decode |
| Células ⠿ já formadas | `Braille` (`braille`) | A15 — estreou na GIA (GIA-41), nunca no Challenge |
| Grupos de pontos em pares | `Tap code (batidas)` (`tap-code`) | recusa números; só pontos |
| a/b ou 0/1 em múltiplos de 5 | `Cifra de Bacon` (`bacon`) | — |
| Bits em múltiplos de 8 | `Binário` (`binary`) | exige octetos separados; se estiverem colados na prosa use `Reagrupar dígitos` |
| Nada visível, texto suspeito | `Caracteres invisíveis (zero-width)` (`zero-width`) | — |
| Glifos de quadrante (pigpen/maçônico) ou mão soletrando (Libras) | **não há decoder** — a entrada é imagem | mas a aba **Cola** tem a legenda: pigpen com o desenho de cada letra em ASCII e as quatro grades, Libras com a configuração de mão letra a letra. Leia a legenda e digite a letra |
| Runas, nyctográfico, gematria, Wingdings | **não encontrado** — nem decoder nem tabela | ver §7 e `TODO-CIFRAS.md` item 14 |
| Disco/roda com setores pintados | conte os setores e cole os números | `Roda alfabética` (`cipher-disk`) — ver §2.6 |

### 2.5 Vejo uma PRANCHA DE IMAGENS sem legenda

**Não há decoder para isto — e é a forma bruta mais comum do acervo (~16 das 73; como a contagem da
§2.0, é leitura minha das cadeias, não um campo do acervo).** O procedimento:

1. **Busca reversa** numa das imagens. Ela nomeia o lugar, e o lugar nomeia o sistema da cifra
   (GIA-14: a foto é de Maidenhead/Inglaterra → a placa `GH94RC` é um Maidenhead Locator).
2. **Procure o intruso.** GIA-42: entre insetos há cabeças de elefante — *hathi* = elefante = logo
   do **HathiTrust**. GIA-32: a bandeira é falsa, o **brasão** dentro dela é o sinal.
3. **Procure o número camuflado.** GIA-37: 14 retratos sépia de ex-prefeitos, cada um com um dígito
   preto sobre fundo escuro. Aumente contraste antes de desistir.
4. **A entidade já é o número** (A24 é explícito: *"o nome já é o número"*): elemento → atômico ·
   município → população/nº de bairros · rua → VM · cidade → DDD · cor → código do fabricante ·
   música → nº da faixa ou edição do Oscar · imperador → algarismo romano · besta → nº de caudas.

### 2.6 Vejo uma GRADE ou puzzle geométrico

| Vejo | Ação | Ferramenta |
|---|---|---|
| Grade de letras, "procure o padrão" | leitura em espiral / 4 braços | `Leitura de grade` (`grid-read`) — GIA-15 |
| Coordenadas de grade (`D1 F1 A12 M15`) | troque o número por letra, mantenha a letra | `A1Z26 (número→letra)` — ITC 2022 P7 → ALMOFADA |
| Grade 5×5 de dígitos 1–5 | Políbio | `Quadrado de Políbio` (`polybius`) |
| Disco de 26 setores com linha vermelha | **conte os setores à mão**, depois cole as contagens | `Roda alfabética` (`cipher-disk`) — varre as 26 origens × 2 sentidos × base 0/1 (GIA-17) |
| Caça-palavras, cruzadinha, nonograma | **não encontrado** | manual (GIA-20, GIA-36; nonograma ITC 2023 **1/4**) |

### 2.7 Vejo um GEOCÓDIGO (reconhecimento pela forma)

| Forma | Sistema | Decoder | Acervo |
|---|---|---|---|
| `///palavra.palavra.palavra` | what3words | `Localização` (`location`) — reconhece offline, **coordenada só por API** | GIA-10; ITC 2018 P24 (**1/4**) |
| `2JF.5R` | Mapcode | `Localização` (`location`) — **resolve, e assume o território** (leia abaixo) | GIA-08 |
| `GH94RC` (2 letras, 2 dígitos, 2 letras) | Maidenhead | `Localização` (`location`) | GIA-14 |
| `38HQ+J3` (tem `+`) | Plus Code | `Localização` + `Código local (cauda)` — **leia a armadilha da §8.2** | ITC 2017 Extra *Nos Desculpe* |
| `68130.89.91.15.12` (dígitos e pontos) | GeoTude | `Localização` (`location`) | GIA-27 → FURB Campus 2 |
| base32 curto sem `+` | Geohash (ou cauda) | `Localização`, `Código local (cauda)` | madrugada ITC 2025 (**4/4**) |
| `Nb…` ou dígitos puros do Vale | GeoHex | `Localização`; com curinga, `GeoHex curinga` (`geohex-wildcard`) | — |
| Dois blocos de ≥6 dígitos | coordenada decimal | chip `coord-blocks` valida se cai em SC | GIA-07, GIA-21 |
| `22JFR9203021024` (zona + 2 letras + dígitos em nº par) | **MGRS / USNG** — o par natural do UTM, que a bancada já tinha | `Localização` (`location`) — cai em Blumenau, precisão de 1 m | — |
| `JELD560048` (4 letras + dígitos) | **GEOREF** (militar, WGS) | `Localização` (`location`) — `JELD560048` = Blumenau | — |
| `262FG1` (3 dígitos + 2 letras + quadrante) | **GARS** (célula de 30′, subdividida em 15′ e 5′) | `Localização` (`location`) | — |
| `NG-22-Z-B-IV-4-SE` (letra-número-letras) | **carta IBGE/DSG** — articulação sistemática, de 1:1.000.000 a 1:25.000 | `Localização` (`location`) — a 1ª letra é o hemisfério: **`S`** para o Brasil quase todo | — |
| `1KME5499N8337` / `10KME5490N8330` | **grade estatística do IBGE** (Albers do IBGE, células de 1 km e 10 km) | `Localização` (`location`) — `1KME5499N8337` = Blumenau | — |

> **Mapcode: o cartão dá a coordenada, mas o território é palpite.** Um mapcode local **não** se
> decodifica sozinho — o mesmo `2JF.5R` é aceito por **467** territórios, cada um devolvendo um ponto
> diferente (verificado em runtime). A bancada faz assim, da certeza ao palpite: território escrito
> na entrada (`BR-SC 2JF.5R`) → **BR-SC filtrado pela caixa do Vale** → varredura dos territórios
> brasileiros → código internacional. `2JF.5R` sozinho cai em **−26,913966 / −49,069158**
> (Prefeitura de Blumenau), rotulado *"assumindo BR-SC (Santa Catarina) — Vale do Itajaí"* — e o
> cartão lista os outros estados brasileiros que também aceitam o código. **Leia o rótulo: se a prova
> não é de casa, o palpite de casa está errado.** A detecção é instantânea; a coordenada demora um
> instante porque a biblioteca é pesada (~305 KB gz) e só é baixada quando você cola um mapcode.

O padrão da casa é **"carta noturna": um geocódigo por madrugada, sempre rotacionando o sistema**
(Plus Code 2017 → what3words 2018 → Plus Code 2024 → geohash 2025). A GIA 2026 usou **seis sistemas
numa edição só**. Maidenhead e Mapcode nunca entraram no Challenge — segundo o dicionário, eram os
próximos candidatos, e os dois já estão na bancada.

**É por causa desse padrão que a bancada cobre sistemas que o acervo nunca usou.** MGRS/USNG, carta
IBGE/DSG, GEOREF, GARS e a grade estatística do IBGE entraram por varredura da web, não por prova —
a aposta é que, num evento que troca de sistema toda madrugada, o próximo já esteja coberto. Todos
resolvem **offline, por aritmética**: nenhum depende de rede ou de dataset grande.

---

## 3. AS CADEIAS — o miolo

### 3.1 Os seis arquétipos

| # | Arquétipo | Como se reconhece | Frequência |
|---|---|---|---|
| 1 | **Domínio → número canônico → letra** | lista de entidades nomeadas, nenhum número explícito | ≥30 das 73 |
| 2 | **Código burocrático → consulta pública → entidade real** | número com comprimento canônico | A25, ~20 usos — *"a identidade intelectual do evento"* |
| 3 | **Geocódigo reconhecido pela forma** | a forma do bloco; o título costuma ser a dica | B3 |
| 4 | **Trilha física com checkpoint** (só no Challenge) | 4–6 etapas, staff no fim | ~15 ocorrências de CEP → corrida → checkpoint |
| 5 | **Enigma pesado, entrega barata** (padrão GIA) | 2–3 passos; a dificuldade é "que dicionário é esse?" | dominante nas 41 |
| 6 | **Metaprova** | nada na folha fecha; a chave é o próprio evento | 5 casos verificados |

### 3.2 As transições mais prováveis

**Saiu um bloco de 8 dígitos** → CEP em 10 leituras, telefone fixo em 3.
Discriminador: começa em **88/89** → CEP de SC. Se o enunciado carrega *ligar / ligação / atender /
crachá* → telefone (GIA-09 planta "ligada/ligação" no áudio; GIA-19 planta "apresentar o crachá" e
"79 cidades" = DDD de Aracaju; ITC 2017 P14 traz a coluna literalmente chamada "Code/Area").

**Saíram dois blocos de 6 a 8 dígitos** → coordenada decimal, nos 4 casos lidos: GIA-07 (6+6:
`471380`/`729622`), GIA-21 (7+7: `2694818`/`4907202`), ITC 2018 P18 Et.5 (6+6: `269352`/`487228`) e
ITC 2017 P23 (**8+8**: `26911713`/`48662919`). **Não descarte um par de blocos de 8 só porque 8
dígitos "é CEP"** — o P23 é exatamente esse caso. **O sinal negativo é sempre dito, nunca
calculado** — GIA-07 diz "SUL DO MUNDO". GMS é mais ingrato que decimal e gerou **1/6** em 2017.

**Saiu uma sequência ≤ 26** → A1Z26 → palavra (≈7 casos: ITC 2017 P7 Et.3 = PREFEITURA · GIA-04 =
VENCEDOR · GIA-27 = GEOTUDE · ITC 2023 P20 Et.3 = PIPETA · ITC 2022 P7 Et.2 = ALMOFADA).

**Saiu uma sequência com algum valor > 26** → **não é A1Z26: é índice de letra dentro de um NOME.**
Esta é a camada 2 mais frequente do acervo (A4, ~25 usos; **11 das 40** fichas de GIA em
`RESOLUCOES.md` trazem a tag de posição de letra — 10 como `posicao-de-letra` e a GIA-30 como
`posicao-de-letra-reversa` —, e **15 das 41** fichas de `GIA-2026.md` trazem
`Letra por posição indexada` — contado por grep, não estimado). O dicionário
avisa que é *"brutal quando o 'onde indexar' é ambíguo"* (*De: Para:* **0/3**).

**Numa trilha, a etapa seguinte quase nunca repete a mecânica da anterior.** Li as 7 trilhas de 4+
etapas do acervo — ITC 2017 P7, P19 e P22, ITC 2018 P18, ITC 2019 P14, ITC 2022 P13, ITC 2023 P19 —
e a regra vale em todas menos uma: em ITC 2017 P7 as Et.1 e Et.2 são as duas "primeira letra de uma
palavra escolhida por uma regra" (codinome × palavra antes do marca-texto), com fontes diferentes.
Corolário operacional: **descarte a mecânica que você acabou de usar — mas se nada mais fecha,
tente-a com outra fonte antes de abandonar.**

### 3.3 O checksum grátis

`GIA-2026.md` §3.10 registra a regra: *"cada passo intermediário produz uma palavra real (GEOTUDE,
MAPCODE, CIDADE ILUMINADA, COVID, OSCAR, SIGNO), que funciona como checksum."*

**Ataque derivado: se a sua camada 1 produziu lixo, ela está errada. Se produziu uma palavra em
caixa alta, siga.** A bancada ajuda aqui: o score recebe um **realce por wordlist** pt+en (451 mil
palavras, piso de 4 letras), mais uma lista curta de palavras de quebra-cabeça que nenhum
dos dois dicionários tem (geotude, mapcode, geohash, quadkey, maidenhead, what3words, covid, oscar,
songi, furb, samae, siatu, blumenau, itajai, prefeitura, vigenere, atbash, braille, polybius,
playfair, bacon, morse). Duas coisas mudaram no realce, e as duas mexem no que sobe ao topo:

- **A resposta colada agora é segmentada.** `PARACUMPRIRESSAPROVA` era um token só, fora do
  dicionário, cobertura zero — e não ganhava realce nenhum. Hoje um token sem espaço de 8 a 64
  caracteres é quebrado por programação dinâmica nas palavras reais que contém (pedaços de 4 letras
  para cima), e as letras cobertas contam. **Não insira espaços à mão para "ajudar" o ranking.**
- **O realce é amortecido por evidência absoluta, não só por proporção.** Antes, um lixo de 4 letras
  que por acaso está na lista cobria 100% da saída e ganhava o realce máximo — e a lista tem
  **7.402** palavras de 4 letras, ou seja 1 em ~57 strings aleatórias "é palavra". Hoje 4 letras
  casadas valem **meio** realce e 8 ou mais valem o realce inteiro. Consequência de campo: **uma
  saída curta e certa (LAPIS, TOPO) sobe menos do que você espera** — ela ganha um empurrão, não o
  topo garantido. Continue abrindo a gaveta (§1.3).

O realce **puxa para 1** em vez de somar, então nunca estoura o teto nem inverte a ordem entre duas
saídas igualmente reconhecíveis. Enquanto as listas carregam, o score é bit-a-bit o histórico — se
os primeiros resultados vierem "sem faro", espere um segundo e cole de novo. E a mesma varredura
alimenta o **selo de palavra real** no cartão: se ele diz *"palavra real: LAPIS"*, o checksum da
§3.3 fechou sem você precisar ler a saída inteira.

### 3.4 A bifurcação que decide se você já terminou

Regra verificada em 13 casos:

- **Substantivo PRÓPRIO / marca / site / app → não é a resposta, é a FERRAMENTA da camada seguinte.**
  GEOTUDE → geotude.com (GIA-27) · MAPCODE → mapcode.com (GIA-08) · CIDADE ILUMINADA → app de postes
  (GIA-25) · COVID → aba do site da Prefeitura (GIA-12) · OSCAR → edições do Oscar (GIA-09) · SIGNO,
  via anagrama de SONGI (GIA-13) · WIKIPEDIA, das sílabas dos ossos (ITC 2017 P22 Et.3) · Wallame,
  lido espelhado de `MV77VW3` (ITC 2018 P13) · TRANSE TUDO, classificado no Diarinho (ITC 2019 P19) ·
  SESC (ITC 2023 P19 Et.1) · I18N (ITC 2018 P18 Et.5) · N-F-E (ITC 2018 CG-8) · EXCEL, anagrama do
  nome do médium (ITC 2019 P14 Et.3).
- **Substantivo COMUM e comprável → é a resposta, pare.** TOPO, SAL, VENCEDOR, LÁPIS, LÂMPADA, CAFÉ,
  TAÇA, RÉGUA, TORRADEIRA, BICICLETA (GIA) · LAMEM, PIPA, ALMOFADA, CADEADO, PIPETA, ANILHA,
  CABOTIÁ (ITC).

### 3.5 Cuidado: a palavra decifrada ainda não é a entrega

- GIA-29: a cifra dá `LOUROS`; a entrega é **uma coroa de louros**.
- GIA-41: a cifra dá `TACA`, lido de trás para frente, e a acentuação é resolvida pela dica final
  ("vamos brindar sua vitória") → **taça**.
- GIA-06: o CEP dá **Rua Ilhas Malvinas**; a resposta é **ILHAS MALDIVAS** (o trocadilho é
  intencional, e está reconciliado no acervo — não é erro da CP).

---

## 4. OS DESFECHOS — onde se ganha mais tempo

### 4.1 CEP → rua (~18 usos, "o cavalo de batalha histórico")

**Testei 15 CEPs citados no acervo contra a base local: 14 resolvem offline, com rua e bairro.**
O que não resolve é `38414-561` (GIA-31, Rua Munique, Uberlândia/MG) — a base cobre SC, e nesse caso
o cartão cai no fallback por API. *(Reconferido por amostra: `89066-730` → Rua Ilhas Malvinas,
Itoupavazinha · `89035-032` → Rua Itália, Vila Nova · os três `88331-xxx` da armadilha abaixo · e o
`38414-561` segue ausente da base.)*

**Mapa de 4 dígitos na região do Challenge** (medido sobre as 40.445 linhas de `ceps.json`):

| Prefixo | Município | Linhas |
|---|---|---|
| `8830`, `8831` | **Itajaí** | 1.024 + 544 (1.565 são de Itajaí) |
| `8833` | **Balneário Camboriú** | 746 |
| `8834` | Camboriú | 665 |
| `8835` | Brusque | 1.566 |
| `8837` | Navegantes | 730 |
| `8901`–`8907` | **Blumenau** | 3.711 no total, **3.703 de Blumenau** |
| `8908` | Indaial | 745 no total, **742 de Indaial** |

> **Armadilha verificada:** `88331-430` (Rua Lindolf Bell), `88331-465` (Rua Sérgio Milliet) e
> `88331-505` (Rua Clarice Lispector) — todos do acervo do Challenge — **não são Itajaí: são Praia
> dos Amores, Balneário Camboriú.** É um bairro de ruas de escritores brasileiros, com passo de 5 no
> sufixo.

**Blumenau, 5 dígitos → bairro** (dominante medido): `89010` Centro · `89012` Victor Konder ·
`89015` Vorstadt · `89020`–`89022` Garcia · `89023` Valparaíso · `89025` Glória · `89026`–`89027`
Progresso · `89030` Itoupava Seca · `89031` Salto/Escola Agrícola · `89032` Passo Manso ·
**`89035` Vila Nova** · `89036` Velha · `89037` Escola Agrícola · `89040` Velha Central ·
`89041` Velha *(quase empatado com Água Verde: 41 × 37 — não confie neste)* · `89042` Água Verde ·
`89045` Velha *(também apertado: 37 Velha, 31 Velha Grande, 29 Velha Central)* · `89046` Velha
Central · **`89050` Ponta Aguda** ·
**`89051` Nova Esperança** (37 linhas; Ponta Aguda só 22 — o cluster dos países entra aqui, mas o
bairro dominante do prefixo **não** é Ponta Aguda) ·
`89052`–`89053` Itoupava Norte · `89055`–`89057` Tribess/Fortaleza · `89058` Fortaleza Alta ·
`89060` Fidélis · `89062`–`89063` **e `89068`–`89069`** Itoupava Central · `89065` Salto do Norte ·
**`89066` Itoupavazinha** · `89070`–`89072` Badenfurt · `89074` Testo Salto · `89075` Vila Itoupava.

**Itajaí, 5 dígitos → bairro:** `88301`/`88302` Centro/Fazenda · `88303` Centro/São Judas ·
`88304` São João · `88305` Barra do Rio · `88306` Praia Brava/Fazenda/Cabeçudas ·
`88307` Ressacada/Dom Bosco · `88308` Cidade Nova · `88309` São Vicente (151 de 151 linhas) ·
`88310`/`88311` Cordeiros · `88312` São Vicente · `88316` Itaipava · `88317` Espinheiros ·
`88318`/`88319` Limoeiro (o `88319` tem **uma** linha só). O `88313` existe com 2 linhas
(Canhanduba) — se um CEP seu cair nele, não é erro de digitação.

**Ruas temáticas que a CO reusa** (medido): o cluster de **países das Américas fica em Ponta Aguda,
`89050`/`89051`** — Porto Rico -010, Colômbia -030, Chile -040, Uruguai -060, Peru -065, Costa Rica
-090, Guatemala -110, México -130, Canadá -160, Panamá -170, Bolívia -300, Venezuela -310,
Suriname -380, Cuba 89051-010, Haiti 89051-060. Fora do cluster: **Itália 89035-032** (Vila Nova,
resposta de GIA-32) e **Ilhas Malvinas 89066-730** (Itoupavazinha, resposta de GIA-06).

**Rendimento de curinga** (`CEP curinga (SC)`, `cep-wildcard`, medido):

| Padrão | Candidatos |
|---|---|
| `xxxxx730` (só o sufixo) | 100 |
| `89xxx730` | 53 |
| `890xx730` | **10** |
| `890xxxxx` | 4.456 |
| `883xxxxx` | 5.285 |

**Regra de campo: com os 3 últimos dígitos mais o prefixo de 3, a mediana é 2 candidatos e 9 em cada
10 combinações ficam em ≤ 8.** Mas **não é um teto**: varrendo as 9.625 combinações
prefixo-3 + sufixo-3 da base, **710 (7,4%) passam de 10 e a pior chega a 64** — sufixos redondos
(`000`, `100`, `300`) em prefixos densos (`892`, `898`) são o pior caso. E **o cartão só lista 12
linhas** (o total sai no rótulo): se o rótulo disser 53 e você contar 12, faltam 41 — aperte o
padrão, não role a lista.
O padrão aceita `x`, `X`, `*`, `_` e `?` como curinga, ignora `.`, `-` e espaço; com 8 caracteres é
ancorado por posição, com menos vira busca por trecho.

**E não saia correndo ao achar o CEP.** Em pelo menos 5 cadeias o **nome da rua é a última camada**,
por trocadilho: Rua Matias Klock → *Klock ≈ clock* → entregar um **relógio** (ITC 2023 P9) · Rua
Ilhas Malvinas → Maldivas (GIA-06) · Rua Munique + "ir de **Uber**" → Uberlândia (GIA-31) ·
coordenada → **Barbearia Santa Raiz**, fechando o trocadilho "raiz" (GIA-21) · coordenada → **Rio
Nef** (GIA-07).

### 4.2 Coordenada

`Localização` (`location`) tenta nesta ordem e devolve o **primeiro** que casar: **DD → DMS → DDM →
Plus Code → UTM → Maidenhead → Quadkey → H3 → GeoHex → Geohash → GeoTude**, e depois o atalho
`Nb`+cauda (verificado em `formats.ts`). Fora dessa corrida, e por isso **cumulativos** com ela, o
mesmo decoder emite mais três cartões quando a forma bate: **Mapcode** (score 0,85, coordenada
resolvida no cartão — §2.7), **what3words** (0,85, coordenada por consulta ao backend) e **CEP** de
8 dígitos (0,92 com coordenada local, 0,70 quando cai no fallback por API). A coordenada direta sai
com 0,90. O rótulo de escopo ("Blumenau" / "Itajaí" / "Vale do Itajaí") é o juiz local de
plausibilidade.

Não existe caminho inverso na bancada — **reconferido**: nenhum decoder converte **de** coordenada
para outro código, e não há geocodificação reversa (o `municipios.json` guarda só código IBGE, nome
e UF, sem lat/lng; as linhas de `ceps.json` têm coordenada, mas nenhum decoder as lê nesse sentido).
Por isso a cadeia da GIA-40 (coordenada → cidade → DDD) tem **um** degrau manual: o primeiro.
Nomeada a cidade, `Cidade → DDD` (`ddd-cidade`) fecha o resto (§4.4).

> **A coordenada pode não fechar exata e mesmo assim estar certa.** GIA-21: *"a precisão não é das
> melhores, mas basta olhar ao redor"* — as raízes arredondam. Não rejeite uma leitura porque caiu
> 80 m ao lado.

### 4.3 Atalhos de cauda locais — Blumenau e Itajaí

Fonte única dos prefixos: `src/features/location/anchors.ts`. **Nunca redigite um prefixo de
memória; cite daqui.**

| Sistema | Blumenau | Itajaí | Quantos caracteres você pode descartar |
|---|---|---|---|
| Plus Code | `585G` | `585H` | 4 — sobram 6 a 7 (`3WJM+6H`) |
| Geohash | `6gjn` **ou `6gjp`** | `6gjq` **ou `6gjr`** | **só 3** (`6gj`) — leia o aviso abaixo |
| GeoHex | `Nb` | `Nb` | prefixo `Nb` mais os primeiros dígitos |
| UTM | zona `22J` | zona `22J` | a zona inteira |

**Medido sobre os 3.703 endereços reais de Blumenau e os 1.565 de Itajaí em `ceps.json`** (não sobre
a caixa da cidade, que é maior que a mancha urbana): Plus Code `585G` cobre **99,9%** de Blumenau e
`585H` cobre **96,4%** de Itajaí (3,6% caem em `584H`) — o atalho de 4 caracteres é seguro na
prática. Já `6gj` cobre 98,7% de Blumenau e 100% de Itajaí, mas **o 4º caractere do geohash NÃO é
constante dentro de uma cidade**: Blumenau se parte em `6gjn` (54,0%) e `6gjp` (44,7%), Itajaí em
`6gjq` (78,5%) e `6gjr` (21,5%). O 4º caractere **distingue as duas cidades** (`{n,p}` nunca cruza
com `{q,r}`) — só não identifica um ponto dentro de uma delas.

> **Armadilha, e ela é da bancada:** `Código local (cauda)` antepõe **só** `6gjn`/`6gjq`. Testei as
> 1.655 ruas de Blumenau que caem na metade `6gjp`, entregando a cauda de 4 caracteres: **nenhuma
> volta certa** — 977 devolvem um ponto **errado, rotulado "Blumenau"**, com erro de até **19,5 km**
> (ex.: Rua Ribeirão Luebke, geohash real `6gjp309y`, a bancada devolve `6gjn309y`), e as outras 678
> não devolvem nada. **Se a cauda de geohash cair num lugar que não faz sentido, troque o 4º
> caractere à mão** (`n`↔`p` em Blumenau, `q`↔`r` em Itajaí) e decode o código inteiro.

Decoders: `Código local (cauda)` (`local-geocode`) para Plus Code curto (score 0,72) e cauda de
geohash (0,50); `GeoHex curinga` (`geohex-wildcard`) aceita `Nb1145875xxxx` ou só a cauda, exigindo
≥3 dígitos fixos e ≥1 curinga, com teto de 4 curingas (0,85 quando casa um só; 0,65 quando devolve
lista). O Plus Code curto tem ainda um segundo caminho: se o atalho de 4 caracteres não fechar, a
lib oficial `open-location-code` tenta o `recoverNearest` a partir do centro de cada cidade — então
formas curtas fora do padrão `4+2/3` também podem voltar.

Exemplos verificados em runtime: `585G3WJM+6H` = centro de Blumenau · `585H38RQ+V7` = centro de
Itajaí · `38HQ+J3` completado por âncora cai em **−26,92094 / −48,66231, a poucas centenas de metros
da Rua Antonio Menezes Vasconcelos Drumond** — que é exatamente o gabarito de *Nos Desculpe*
(ITC 2017 Extra).

### 4.4 Telefone e DDD

A cadeia converge para 8–9 dígitos mais 2 de área, e *"sempre com um humano da CO na ponta"* (B4).
`DDD (área do Brasil)` (`ddd`) resolve **DDD → região**, e `Cidade → DDD` (`ddd-cidade`) faz o
caminho de volta: cole a **lista de cidades** e ele devolve os códigos concatenados, já formatados
como telefone quando fecham (score 0,85 quando fecha telefone; 0,75 com várias cidades e sem
telefone; **0,45 com uma cidade só** — abaixo disso é a gaveta). É a segunda metade de GIA-40 —
**a primeira, coordenada → cidade, continua manual** (§4.2).

Casos: GIA-09 (edições do Oscar 33/39/40/80 → Aliança Contábil, **a primeira patrocinadora do rodapé
dos 41 arquivos**) · GIA-19 (fórmulas H3PO4/H2O/HNO3 → 3142-1113; DDD 79 = Aracaju) · GIA-40
(coordenadas → DDDs 47/32/21/51/44 → Ilhatur) · ITC 2022 P18 Et.2 (nº das faixas → Museu Histórico
de Itajaí) · ITC 2018 P6 Et.1 (relógios do Instagram → (47) 99636-3636).

### 4.5 Objeto banal — o desfecho mais provável de todos

`GIA-2026.md` §3.4 é categórica — *"a resposta é quase sempre um objeto banal, não um lugar"* — e é
lá também (não no dicionário, que não tem verbete `Objeto-resposta comum`) que se registra a lógica
`Objeto-resposta comum` como *"a lógica mais frequente do nosso acervo (~40 usos)"* — a edição inteira da GIA entregou 16 objetos (lâmpada, régua, bicicleta ×2 formatos, taça,
torradeira, café, lápis, carro, caminhão de bombeiros, coroa de louros, foto de cachorro marrom,
mapa de Blumenau, DVD, título de eleitor, bandeira, sal). Se a sua cadeia produziu um substantivo
comum, o trabalho acabou — vá comprar.

---

## 5. ONDE OLHAR — checklist de inspeção

Os 17 esconderijos do guia da Biblioteca, virados do avesso e ordenados por custo de checagem.
**Dos 17, só 5 valem em qualquer suporte**; os outros 12 dependem do formato, e **8 ficam fora se a
prova veio em PDF** (pelo campo `exigeQue` do próprio guia): texto atrás da imagem, hyperlink sob a
imagem e espaços-duplos (`docx`), aba oculta (`xlsx`), EXIF e busca reversa (`imagem`), revelação
física (`impressão`) e o placar como tabela (`sistema`). Se o enunciado **exige Word por escrito**,
sete esconderijos de `docx` ficam ativos de uma vez.

### Camada 0 — grátis, faça antes de ler o enunciado

1. **Decifre o título.** É a camada 1 em 11 das 41 provas da GIA: *Ask Me* → ASCII · *Que Bom* →
   Kibon · *Prova Quadrada* → raiz · *SONGI* → SIGNO · *O Problema dos 3 Corpos ///* → what3words ·
   *###* → sintaxe do GeoTude · *Enxergar sem ver* → camada oculta · *No detalhe* → número camuflado.
2. **Não tem enunciado?** Não procure texto: o material **é** o enunciado (GIA-17 abre com "Prova sem
   t e x t o"; 24, 29 e 37 dizem só "Entreguem o que estamos pedindo!").
3. **O enunciado jura que não há cifra?** Há. GIA-41 nega em três parágrafos e esconde Braille nos
   espaços duplos daquele mesmo texto. O guia recomenda no máximo uma por edição.
4. **Procure a frase-permissão de descarte.** GIA-01: "não demos importância para as vírgulas" é
   ordem de descarte, não piada. O guia registra que a técnica *"só funciona com aviso explícito"* —
   então o aviso está lá.
5. **Negrito é ruído, sublinhado é sinal** (GIA-10).

### Camada 1 — o arquivo é o esconderijo

6. **Texto atrás da imagem** (`.docx`): mover a imagem ou Ctrl+A revela (GIA-40).
7. **Hyperlink sob a imagem**, exatamente onde ela aponta (GIA-11: a Beyoncé aponta "to the left").
8. **Aba ou célula oculta em planilha** (`.xlsx`): fonte branca, largura zero. O guia marca como
   **"ainda inédito na casa"**.
9. **EXIF da foto**: nunca usado no acervo. Só vale conferir em arquivo baixado do sistema —
   **apps de mensageria removem EXIF ao recompactar**.
10. **Logo espelhado atrás da folha**: fixa a fonte de consulta sem escrever "use a Wikipédia"
    (GIA-29, o W invertido). Procure a marca d'água antes de escolher onde pesquisar.

### Camada 2 — o suporte visual carrega o índice

11. **Número camuflado na foto** — preto sobre escuro (GIA-37). Fotos em alta resolução sem legenda
    e nenhum número no texto: o índice está na imagem.
12. **Espaçamento como bit** (GIA-41). O sinal morre em qualquer reflow — copiar de PDF apaga.
13. **Fonte tipográfica como marcador** (Wingdings em ITC 2023 P22). Contraexemplo caro: *Vamos
    Colorir o Mundo* (2018), fonte → marca → app, **0/4**.
14. **Busca reversa de imagem** (GIA-14). O aviso é histórico: *Nem Só de Hollywood* (2022) zerou
    porque busca reversa de frame era impraticável **então** — hoje não é.

### Camada 3 — fora do papel

15. **Revelação física** (calor, gelo, UV): *Abro no Fecho* Et.3/Et.4, ITC 2024, **4/4** — "quem
    revela, cumpre". Impossível em prova online.
16. **O placar da própria edição é a tabela de consulta** (GIA-05: cor = equipe, número = prova,
    pontos = índice de letra → VAMOS ARROMBAR). **Congele/printe a leitura assim que identificar a
    mecânica** — o placar muda durante a janela.
17. **O patrocinador do rodapé** (GIA-09). Quando a cadeia terminar em telefone, CNPJ ou marca,
    **cheque o rodapé antes de sair pesquisando**.

> **Metajogo:** se nada na folha fecha, a fonte é o próprio evento. Verificado em 5 provas — o crachá
> da edição (ITC 2022 P7), o placar parcial do dia 07 (GIA-05), a data de estreia da própria equipe
> (ITC 2023 P19 Et.3), as cores oficiais das equipes via Encycolorpedia (ITC 2023 P19 Et.4), o
> patrocinador do rodapé (GIA-09).

---

## 6. O QUE ABANDONAR

### 6.1 As classes de custo

**As duas primeiras colunas de número saem do guia; a terceira é minha.** `DIFICULDADE.md` (Passo 1)
publica **faixas** de piso, não um número — a coluna "Piso" abaixo é o ponto médio da faixa, e a
faixa original está ao lado justamente porque é ela que está no guia. A coluna **"Janela mínima" é
estimativa minha**, derivada da §6.2: o guia não a publica.

| Classe | O que domina o tempo | Piso do guia | Piso (ponto médio) | Janela mínima *(est.)* | Dimensiona em minutos? |
|---|---|---|---|---|---|
| **Decifração** | pensar e decodificar | 5–15 min | 10 min | 45 min | sim |
| **Deslocamento** | atravessar a cidade — **piso POR SALTO** | 25–45 min | 35 min | 90 min | sim |
| **Aquisição** | conseguir o item (raridade = filtro real) | 30–60 min | 45 min | 120 min | sim |
| **Execução presencial** | cumprir no local, gravar, falar com staff | 20–50 min | 35 min | 90 min | sim |
| **Produção (AV/palco)** | gravar, editar, ensaiar | "horas a dias" | ~240 min *(est.)* | 1440 min *(est.)* | **não** |
| **Mobilização / social** | arrecadar, engajar | "pré-evento" | 0 | 10080 min (7 dias) *(est.)* | **não** |

Piso, na definição do guia, é *"o tempo estrutural mínimo que a prova exige independente de
decifrar"* — na prática, o tempo que ela consome mesmo com a resposta na mão. E a frase que fecha a
triagem: **Decifração é a única classe em que a fração da janela consumida mede dificuldade de
verdade** (o guia diz isso duas vezes, e é a "regra de ouro do piso").

Evidência: *Scotland Yard* (CG 2019) teve **~6h de janela, a maior do dia, e 0/4** — "janela longa
não compra a sacada que ninguém teve". *Dando as Cartas* Et.2 (2018) fez **4/4** consumindo 48–73%
da janela só para comprar o camarão. *Mostra de Cinema*: janela de meses e **6/6** fácil.

### 6.2 Ler o relógio como informação sobre a prova

> **Estimativa minha, e a mais frouxa deste documento.** A tabela abaixo inverte uma heurística de
> dimensionamento de janela (margem para a pior equipe 1,5×; mínimo com pesquisa externa 90 min;
> mínimo absoluto 45 min; 10 a 40 minutos por camada conforme a dificuldade) que eu **não consegui
> reencontrar em nenhuma das cinco fontes** — procurei por grep no acervo inteiro e no
> `the-logic-lab`. O que o guia de fato registra é só o piso: *"janela < ~45 min é zona de risco"*
> (`DIFICULDADE.md`, Passo 4), e sempre no sentido criador → janela, nunca o inverso. **Use como
> intuição, nunca como argumento.**

| Janela publicada | Classe quase certa | O que se espera de você |
|---|---|---|
| ≤ 45 min | decifração, 1 camada | mecânica trivial. Se em 15 min você não tem a camada 1, o erro é de leitura, não de cifra |
| 45–75 min | decifração, 1–2 camadas | **o ponto doce** (50–75% cumprem). O título valida a camada 1 |
| **90 min exatos** | acendeu o piso de pesquisa externa | **a resposta está numa base pública.** Não tente resolver de cabeça |
| 90–120 min | deslocamento ou execução presencial | metade do relógio é rua: organize o carro antes de decifrar |
| ≥ 120 min | aquisição | o filtro é **conseguir o item**, não a cifra |
| dias / semanas | produção ou mobilização | nunca é "difícil", é demorada |

### 6.3 Ordem de descarte

1. **3+ saltos independentes e nenhum resolve para palavra reconhecível.** Nenhuma prova do acervo
   nessa condição passou de **17%** de cumprimento. É a assinatura de *Scotland Yard* (**0/4** em
   ~6h) e *Ao Vencedor as Batatas* (**0/3**). Abandone primeiro.
2. **Dois códigos burocráticos empilhados.** Isolados dão média; empilhados zeram (*De:Para* **0/3**;
   ISBN em cadeia longa **0/3**).
3. **Aquisição de item raro com janela apertada.** O piso de 45 min já queimou o relógio.
4. **Janela < 90 min com local a visitar.** O zero será de relógio, não de mérito (*Telefone sem
   fio*, 2025: **0/4** com 20 minutos, e a prova era fácil).
5. **Duas provas de rua concorrentes no mesmo slot.** As **duas únicas provas zeradas de 2024**
   (ITC24 P17 + P18) zeraram por colisão de carro, não por dificuldade. O gargalo é o veículo.
6. **Domingo 10:30–13:30** — "a zona da morte", nas palavras dos casos-teste do modelo de
   dificuldade (não do `DIFICULDADE.md`): fadiga, janelas curtas e provas disputando o mesmo carro.
   É lá que os zeros se concentram — ITC24 P17 e P18 rodaram sobrepostas nessa faixa. Hora de colher
   as garantidas, não de abrir prova densa.

### 6.4 O que NÃO abandonar

**Prova trabalhosa e determinística.** É a lição do §1 de `DIFICULDADE.md` ("Por que 'quantas
equipes cumpriram' engana"): *Dioxycide* (2023) e *Pede o VAR* (2018) deram **4/4** sendo previstas
difíceis — eram maratonas determinísticas, muito trabalho e zero enigma. O que custa é **dependência
sequencial** e **gargalo de sacada**, não volume.

E, para trilhas: com **liberação por tempo** a Et. N+1 abre mesmo sem a Et. N. **Travar numa etapa
não custa mais a etapa seguinte — abandone e espere a liberação.** *(Os números que eu citava aqui —
zeros de 15–21% para 6–7%, plenos de 27% para 71% — **não estão em nenhuma das cinco fontes**;
procurei. A regra vale; os percentuais ficam como estimativa até alguém reproduzir a medição.)*

---

## 7. O QUE A BANCADA NÃO RESOLVE

Saber isto de véspera evita queimar 15 minutos procurando um botão que não existe.

### 7.1 Fora do alcance por natureza

| Classe | Por quê | O que fazer |
|---|---|---|
| **Revelação física** (calor, gelo, UV) | não é software | secador, freezer, lanterna UV |
| **Sobreposição / overlay físico** | idem | guardar e alinhar as peças |
| **Combinação de cofre** | a cifra que gera os dígitos é outra entrada | — |
| **Áudio** | não há nada de áudio na bancada | reconhecer a música é o gargalo; `Notas musicais` (`music-notes`) só lê notas **já transcritas** |
| **Vídeo** | idem | pausar e transcrever à mão; depois o subproduto textual entra na bancada |
| **Encenação / performance** | Família D | — |

### 7.2 Ausências verificadas por grep (não encontrado no `src/`)

- **Runas, nyctográfico, gematria, Wingdings** — a entrada é imagem; não há bloco Unicode nem tabela
  de referência na Cola. ITC 2023 P22 (Wingdings) foi resolvido à mão e continuaria sendo.
  *(**Pigpen e Libras saíram desta lista**: seguem sem decoder, pelo mesmo motivo, mas a Cola hoje
  traz a legenda dos dois — ver §2.4.)*
- **Achar a fonte original de um texto adulterado** (A18) — a comparação a bancada faz (§7.2b);
  descobrir *contra o quê* comparar continua sendo busca externa manual.
- **Caça-palavras, cruzadinha, nonograma** — manuais.
- **CNAE, FIPE, Anatel, CID-10** — **nenhum decoder**, e por decisão de projeto: esses códigos não
  têm assinatura (um VM é "um número de 4 dígitos"), então um decoder que disparasse neles seria
  ruído em toda entrada numérica. *(Já a **chave de NF-e**, o **boleto**, o **rastreio dos
  Correios**, o **título de eleitor** e a **placa** entraram — esses TÊM assinatura: comprimento
  canônico mais dígito verificador, que é o que separa sinal de ruído.)* O que a
  bancada entrega no lugar é a seção **"Bases e onde consultar"** da Cola, com link oficial e selo de
  status por base — todas as citadas acima estão lá, menos a chave de NF-e. Ver §7.3.
- **Coordenada → cidade** — o `municipios.json` não tem lat/lng. *(As linhas de `ceps.json` têm
  lat/lng, mas nenhum decoder lê no sentido inverso.)* O degrau seguinte, **cidade → DDD**, a bancada
  já faz (`ddd-cidade`, §4.4).
- **Qualquer entrada por imagem** — sem OCR, sem EXIF, sem paleta, sem LSB.

### 7.2b O que você acharia que falta — e não falta mais

Seis lacunas que este documento já listou como ausência e **hoje estão fechadas**. Se a barra
lateral não as mostrar, a versão é velha (§0):

- **Cidade → DDD** — `Cidade → DDD` (`ddd-cidade`), a segunda metade de GIA-40. Ver §4.4.

- **Diff contra fonte original (A18)** — a aba **Diferenças** compara dois textos normalizados (sem
  acento, sem caixa) e devolve a grafia original em **quatro tiras copiáveis**: as palavras
  **alteradas**, as palavras **originais** correspondentes, a letra que corrige cada erro e a
  **contagem** de letras de cada trecho alterado. É o formato certo,
  porque o diff nunca é a resposta — é subproduto (A18 é explícito: *"as alterações, lidas em ordem,
  formam a resposta"*). Do acervo, `DICIONARIO-CIFRAS.md` A18 ancora *Lições de Mãe* (diff, 2022) e
  *Frases Eternas* (letras trocadas, 2023). *(O cabeçalho de `diff.ts` cita mais duas provas. Uma
  delas eu confirmei nesta conferência — ver §9.)*

- **Conversão de cor** — `Cores (hex/RGB/HSL)` (`color-convert`) casa hex/RGB/HSL contra 255 cores
  nomeadas e **encadeia as iniciais** (é o formato que o acróstico consome). Além da tabela de 11
  cores na aba Cola. Lembre que A28 tem variância brutal: Encycolorpedia calibrado deu **4/4**, HSL
  de memória deu **0/4**, no mesmo ano.
- **Faber-Castell** — `Faber-Castell (código da cor)` (`faber-castell`) resolve código de 3 dígitos →
  nome da cor, com as 12 cores conferidas contra o gabarito de GIA-39. Fora dessas 12, devolve "não
  catalogado" (o catálogo completo só existe em encarte impresso — §7.3).
- **Anagrama de duas palavras e "sobra de letras"** — a aba Anagramas tem os dois portões. Remedido:
  `ummapa` na fonte **pt** (a padrão) com o modo duas-palavras devolve **`um mapa`** entre
  **36** resultados; com pt+en são 52; ligando também a sobra de 2 letras a lista estoura para 134.
  **Ligue um portão por vez** — a sobra multiplica o ruído por quatro. O teto de sobra é 2 letras.
  GIA-18 sai hoje.
- **Whitespace-stego** — `Espaços escondidos (whitespace)` (`whitespace-stego`) perfila espaços
  duplos, tabulações e sobras de fim de linha e propõe as leituras nas duas direções. **Mas o caso
  GIA-41 é irrecuperável a partir do arquivo** (o sinal está nas *linhas renderizadas*, e o `.docx`
  só tem 7 parágrafos contra as 12 fileiras que 4 células de Braille exigem) — o decoder é honesto
  sobre isso. Depois de extraídas, as células ⠿ entram no decoder `Braille` (`braille`).

### 7.3 Bases que se consultam à mão — abra a Cola, não espere automação

**Não procure o botão: procure o link.** A aba **Cola** tem a seção **"Bases e onde consultar"**, com
o que cada base indexa, para que serve na cadeia, o link oficial e um selo de status. Os selos são a
informação de campo:

| Selo | O que significa | Quem está lá |
|---|---|---|
| **Aberta** | a bancada consulta por você | ruas de Blumenau, CEP de SC, municípios IBGE, aeroportos, ISPB do PIX, prefixos GS1 |
| **Consulta manual** | tem site oficial, quem busca é você | TSE, CBMSC, guia da Oktoberfest, HathiTrust, portal COVID, Anatel, Faber-Castell, rastreio dos Correios, FIPE, CNAE, CID-10 |
| **Bloqueada** | captcha ou login de terceiro; não automatizamos e não burlamos | Cidade Iluminada / Exati (postes) |
| **Adiada** | daria para ter offline, falta pedido oficial (LAI/dados abertos) | SIATU / planta de valores VM (WebForms, sem CORS) |

**Pantone** está fora por catálogo proprietário. **Faber-Castell** é consulta manual porque o
catálogo completo só existe em encarte impresso — as 12 cores do gabarito da GIA-39 já estão na
bancada (§7.2b). Essas bases são as fontes de GIA-25, GIA-20, GIA-34 e GIA-39; destas, `GIA-2026.md`
§3.10 nomeia **GIA-25 e GIA-34** como as duas provas mais brutais da edição (o Pantone não é fonte de
nenhuma delas).

O backlog técnico está em [`PLANO-CIFRAS.md`](PLANO-CIFRAS.md). **`TODO-CIFRAS.md` não é mais fila:**
ele próprio se declara catálogo executado — dos 19 itens, 16 entregues, 1 como documentação (esta
seção da Cola), 1 parcial e 1 descartado por projeto. **A priorização Alta/Média/Baixa que ele traz
está morta**; o que continua valendo lá são as descrições de mecânica e o mapa das bases.

---

## 8. BECOS SEM SAÍDA

### 8.1 As armadilhas do acervo

1. **ASCII lido como A1Z26.** Declarada a barreira histórica nº 1, tanto no dicionário (A12) quanto
   no farejador da bancada. Teste mecânico: **se algum número está fora de 1–26 mas dentro de
   32–126, é ASCII.**
2. **A prova mente sobre existir cifra.** GIA-41 (§5, item 3).
3. **O destaque óbvio é o ruído.** GIA-10 (negrito × sublinhado) · GIA-32 (bandeira falsa, brasão
   verdadeiro) · GIA-01 (a vírgula é descarte, não separador).
4. **O CEP resolve para outra cidade e está certo.** GIA-31 → Uberlândia/MG. Quem descarta "por ser
   de fora" perde a prova. E `88331-xxx` é Balneário Camboriú, não Itajaí (§4.1).
5. **A coordenada não fecha exata e mesmo assim está certa.** GIA-21.
6. **A cadeia pode não fechar letra a letra.** GIA-28 rende `OSEMFORSTA` e o gabarito declara "Os Sem
   Floresta"; o acervo registra a divergência como pendência não resolvida. Faltando 1–2 letras,
   **infira o alvo; não jogue a cadeia fora.**
7. **A isca plantada fora da prova.** ITC 2018 P18 Et.3: são 5 demônios, mas Berith já havia sido
   nomeado em morse num vídeo pré-Challenge e deve ser descartado — **2/4**, e exigia ter guardado
   o vídeo.
8. **O formato do arquivo mata a cifra.** GIA-11 avisa "IMPORTANTE MANDAR EM WORD": em PDF o
   hyperlink sob a imagem desaparece.
9. **O número visível não é o número certo.** GIA-42: a página #77 do scan não é a página 77 do
   livro — **o offset digitalização ↔ impresso é a cifra** (#77 → pág. 989 → A por A1Z26 cíclico).
10. **O gargalo não é decifrar, é organizar.** GIA-16 traz a nota da própria CP: *"não é difícil
    identificar o binário; o objetivo da prova é a organização das informações."*
11. **Esperar é perder.** *Cooperando Para Vencer* (2022) fez **1/3** e a resolução registra: *"a
    pegadinha era não esperar pelas ligações."*
12. **Entrega parcial existe — não zere.** ITC 2017 P25: foto genérica do bicho pontuava metade.
    ITC 2019 P20: pontuação escalonada por raridade do item de 1993.
13. **Escolha às cegas com custo assimétrico.** ITC 2017 P19 Et.4: quem **bebe** o sangue recebe só a
    etapa seguinte; quem **recusa** recebe a etapa seguinte **mais** a bônus. Parece neutro e não é.
14. **Se a resposta veio fácil demais e é "óbvia", desconfie.** O desvio plausível é projetado:
    *Parque do Atalaia* (2018) fez **0/4** com todas as equipes no mesmo personagem errado; em *#TBT*
    (2019) as duas cumpridoras erraram a primeira tentativa com o mesmo trio.
15. **A nota de dificuldade declarada não é confiável.** *Abbey Road Peixeira* levou "A" unânime dos
    conferentes ("todos matam") e fez **1/3** — o maior descolamento do ano.
16. **O erro mais caro do acervo não foi de cifra, foi de entrega:** a Seven perdeu 8 pontos em 2023
    por não subir o comprovante no sistema com a prova já cumprida na rua. E quando o tipo de
    resposta é **Protocolo**, a tentativa é única: **nunca chute.**

### 8.2 As armadilhas da própria bancada

1. **Plus Code curto lido como Plus Code cheio — e o errado ganha no ranking.** Verificado em
   runtime: `38HQ+J3` (ITC 2017 Extra) faz `Localização` devolver **−58,39875 / −44,94875** com
   score **0,90**, enquanto `Código local (cauda)` devolve o ponto certo em Itajaí com **0,72**.
   Causa: o decodificador offline aceita de 4 a 8 caracteres antes do `+`, e um Plus Code cheio tem
   exatamente 8. **Se o resultado do Plus Code caiu longe, desça um cartão.**
2. **Maidenhead colide com cauda de geohash.** `GH94RC` produz dois cartões: o Maidenhead correto
   (−15,89583 / −40,54167, a ~1.500 km daqui, score 0,90) e um falso "Blumenau" via `6gjngh94rc`
   (−26,91336 / −49,08520, score 0,50). Regra: **6 caracteres no padrão
   letra-letra-dígito-dígito-letra-letra é Maidenhead antes de ser cauda.** E se já começa com `6g`,
   não é cauda.
3. **A gaveta esconde a resposta certa.** O corte é 0,35, e o score pune saída curta e derruba saída
   só de dígitos (multiplicador 0,1). As respostas do acervo são curtas. **Abra a gaveta.**
4. **Um decoder "some" quando outro produziu a mesma saída.** O fan-out deduplica por string exata de
   saída e mantém o de maior score — ROT13 e afim `a=1, b=13` dão o mesmo texto e um dos dois
   desaparece. Se você procura um decoder específico, use o modo "uma cifra só" na barra lateral.
5. **Variantes cortadas.** `César / ROT-N` guarda 3 candidatos, `Cerca (rail fence)` 2,
   `Afim (affine)` 2, `Trithemius (César progressivo)` 2, `Deslocamento de teclado (QWERTY)` 1 —
   **e o corte não é só das cifras clássicas**: `Acróstico` guarda 2 leituras, `Leitura de grade` e
   `Reagrupar dígitos` 3 cada. O critério de corte é sempre o score de plaintext, o mesmo da §3.3:
   uma leitura certa mas curta pode ser podada por uma errada mais "legível". Quando o resultado
   certo sumiu, use `César — força bruta` (`caesar-bruteforce`), que mostra −26 a +26 numa tabela, ou
   o modo "uma cifra só".
6. **Onze decoders leem o campo de chave** (verificado por grep em `ctx.key`): `Vigenère`,
   `Vigenère autokey`, `Beaufort`, `Gronsfeld`, `Porta (Della Porta)`, `Playfair`, `Transposição
   colunar`, `XOR (com chave)`, `Bifid` (este roda sem chave também), `Letra por posição` e `Cifra
   vocálica`. Se o campo está vazio, essa fileira inteira fica fora do fan-out. E `Letra por
   posição` acende quando a chave é composta de índices — uma chave de Vigenère nunca o dispara.
7. **Sem rede, o formato é reconhecido e o detalhe some.** Nenhum `decode()` faz rede; quem faz são
   os cartões (what3words, CEP fora de SC, código de barras, ISBN, NCM, CNPJ, Registro.br). Sem o
   backend, `Participante PIX (ISPB)` não dispara — é a única base **não embarcada**. **Mapcode é a
   exceção que confunde:** ele não faz rede, mas também não é síncrono — a biblioteca entra por
   `import()` dinâmico, então o cartão nasce sem coordenada e a preenche um instante depois. Cartão
   de Mapcode "vazio" é carregamento, não falha.
8. **A base de CEP é só de SC — mas cobre SC inteiro.** São 40.445 linhas em **272 municípios**, e a
   cobertura não é só do Vale: Joinville (4.558), Florianópolis (4.041), Blumenau (3.703), Criciúma
   (2.407), Palhoça (2.011), Chapecó (1.969), São José (1.671), Lages (1.663), Jaraguá do Sul
   (1.645), Brusque (1.566), Itajaí (1.565), São Bento do Sul (1.529), Tubarão (1.108)…
   **Criciúma e Chapecó têm mais linhas que Balneário Camboriú (746) ou Camboriú (665)** — não
   presuma que um CEP "de fora do Vale" não resolve offline. O que falta mesmo é município pequeno,
   e **qualquer CEP fora de SC** (GIA-31, `38414-561`/Uberlândia, cai no fallback por API).
9. **Cauda de geohash exige ao menos uma letra** (para não engolir CEP, NCM e código de rua). Uma
   cauda puramente numérica não vai acender.
10. **Defeito de dado, sem efeito prático hoje:** `BLUMENAU.cepSede` declara a faixa
    `[89010000, 89045999]`, mas **1.730 dos 3.703 CEPs de Blumenau (47%) caem fora dela** — a faixa
    real vai até `89075685`. O campo não é lido por nenhum módulo (verificado), então nada quebra;
    mas não use esse intervalo como régua mental.

---

## 9. Lacunas das fontes — declaradas, não estimadas

- `RESOLUCOES.md` cobre 40 das 41 provas da GIA. **gia-03** não tem gabarito (a resolução FORMIGA é
  dedução do analista) e **a prova 38 não existe** no material.
- **GIA-33**: o gabarito descreve o método mas **não registra a palavra final** (16 letras).
- **GIA-30**: a regra é dada (5ª letra de trás para frente de cada título do VLAD V) mas o local
  final **não é nomeado**.
- **ITC 2018 P18 Et.4**: o CEP montado a partir dos anos-modelo **não é transcrito**.
- **GIA-09**: o áudio não veio no acervo, só o QR — a prova não é reconstituível sem ele.
- **GIA-28**: `OSEMFORSTA` ≠ `OSSEMFLORESTA`, divergência registrada e não resolvida.
- **Códigos literais das madrugadas ITC 2024 (Plus Code) e ITC 2025 (geohash)**: o dicionário cita
  que rodaram, mas nenhum código está registrado — **não encontrado**.
- **Duas provas citadas no cabeçalho de `src/features/diff/diff.ts` não constam das cinco fontes** —
  mas uma delas **está no acervo, fora delas, e a atribuição do código é correta**:
  - ***Quer Provar Isto?* — RESOLVIDO.** A prova existe: é a **P12 de 2022**, e o gabarito está em
    `itc-2022/_caderno/texto/resolucao.md`, não nos `.md` de síntese da raiz (é por isso que ela
    "sumia"). O acervo confirma o mecanismo: num trecho do IMDb em inglês, as duas únicas palavras
    fora do original são **EYELASH** (cílio) e **LIGHT** (luz) → **Rua Hercílio Luz**, e os números
    da prova são endereços nela. Note que a P12 **não tem pasta própria** em `itc-2022/` (a
    numeração pula de `p11` para `p14`) — daí a leitura anterior de que era coreografia. **As duas
    coisas são verdade:** a entrega é dançar a abertura de *Peacemaker* com a arma na cor certa; o
    diff é o que diz qual cor.
  - ***Bronquinha* — ainda em aberto.** A prova existe como registro (`dificuldade.json`,
    `2016-acervo:2016-05`, classe deslocamento), mas **não há gabarito em lugar nenhum do acervo** e
    a palavra SOCIESC não aparece em nenhum arquivo. O anagrama citado no código continua **sem
    verificação** — não o trate como acervo.
- As frequências X/N do dicionário são **conservadoras para 2024–26**: o banco de produção guarda
  dicas, não resolução. Uma cifra marcada "última 2023" pode ter reaparecido numa prova física não
  gabaritada. **Nunca trate "adormecida" como "extinta".**

### As adormecidas — o que o dicionário diz que vai voltar

Anagrama (A6, última 2019) · Base64 (A14, 2017) · fonética/transliteração (A27, 2018) · T9 (A26,
2019) · morse (A13, 2022) · Atbash (A7, 2022) · ASCII (A12, 2022) · pigpen (A9, 2023) · cores frias
(A28, 2023) · what3words/Maidenhead/Mapcode (B3) · Braille (A15, nunca no Challenge) · escansão →
CEP (A2/B1, 2019) · Kaprekar (A23, 2019).

*(Ressalva de leitura: as datas entre parênteses são da **técnica**, não da entrada A/B inteira.
A23 "Aritmética disfarçada" foi usada em 2025; foi o **Kaprekar** que parou em 2019. Idem A2, usada
em 2022, mas a **escansão** só em 2019.)*

---

> **Última conferência: 2026-08-14**, contra a árvore de trabalho sobre o commit **`ca32b11`**
> (*"docs: TODO de cifras destilado do acervo de gincanas"*). Foram remedidos em execução: a lista
> completa do registry, as 40.445 linhas e 272
> municípios de `ceps.json`, as contagens por prefixo de 4 e 5 dígitos de Blumenau e Itajaí, as
> coberturas de Plus Code e geohash, os cinco rendimentos de curinga e a varredura das 9.625
> combinações prefixo-3 + sufixo-3, os `forcedScore` citados, a resolução do Mapcode `2JF.5R` e as
> duas armadilhas de geocódigo da §8.2. O que **não** foi possível remedir está marcado
> ***(est.)*** ou dito como estimativa no corpo — em especial a tabela de janela da §6.2 e os
> percentuais de liberação por tempo da §6.4.
>
> **Segunda passagem, mesmo dia:** entrou a onda 6 (7 códigos burocráticos e 5 geocódigos vindos de
> varredura da web, não do acervo), e com ela o registry foi a **96 decoders** e a suíte a **771
> testes em 71 arquivos**. Foram reescritos por causa dela: a §0, a linha dos 44 dígitos da §2.1
> (que dizia "não encontrado" para a chave de NF-e), a tabela de geocódigos da §2.7 e a lista de
> ausências da §7.2. Se você encontrar outro "não encontrado" que já exista, ele é desta safra —
> confie na barra lateral, não no texto.
