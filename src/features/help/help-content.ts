/**
 * Conteúdo da página de Ajuda — catálogo de tudo que o The Decrypter lê e
 * decodifica, com exemplos. Mantido em sincronia com os decoders/ferramentas
 * reais; ao adicionar/remover um decoder, atualize a seção correspondente
 * (veja a skill `update-help`).
 */
export interface HelpEntry {
  name: string;
  desc: string;
  example?: { in: string; out: string };
}

export interface HelpSection {
  id: string;
  title: string;
  intro?: string;
  entries: HelpEntry[];
}

export const HELP_INTRO = [
  "O The Decrypter é uma oficina de cifras: você cola UMA entrada (texto, números, um código) e ele tenta TODAS as interpretações ao mesmo tempo — 100 cifras, codificações, tabelas e bases de dados — e mostra os resultados ranqueados por “o que faz sentido”.",
  "Os mais prováveis aparecem em cima; o resto fica em “pouco provável”, recolhido. Cada resultado tem um selo (codificação, cifra, transformação, base de dados), um botão de copiar e, quando a saída bate no dicionário pt/en, o selo “palavra real”. Quando há chave (Vigenère, índices, deslocamentos), use o campo de chave; o 2º campo guarda a fonte a indexar ou a lista.",
  "Acima da entrada ficam os chips do sniffer (“isto tem cara de…”) e a barra de Cadeia, que empurra um resultado de volta para a entrada e registra a trilha. O campo de título lê o nome da prova como pista — ele só levanta chips, nunca mexe no ranking.",
  "Tudo roda no navegador. As consultas externas (CNPJ, CEP, ISBN, NCM, PIX, produto pelo código de barras, what3words, geocodificação) passam pelo backend do projeto, e os mapas vêm do OpenStreetMap.",
];

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "codificacoes",
    title: "Codificações",
    intro:
      "Representações reversíveis de texto/bytes — detectadas e revertidas automaticamente. Ao escolher uma na barra lateral, um segundo campo também CODIFICA o texto naquela cifra.",
    entries: [
      { name: "Base64", desc: "Texto em Base64.", example: { in: "SGVsbG8=", out: "Hello" } },
      {
        name: "Base32 / Base32 (hex)",
        desc: "Base32 padrão e variante hex.",
        example: { in: "JBSWY3DP", out: "Hello" },
      },
      {
        name: "Base45 / Base58 / Base85 (Ascii85)",
        desc: "Bases compactas (Base45 de QR, Base58 de cripto, Ascii85).",
        example: { in: "9xa^", out: "bytes" },
      },
      {
        name: "Base91 (basE91)",
        desc: "Binário→texto mais denso que o Base64 (~23% de inchaço contra 33%), com 91 dos 94 ASCII imprimíveis. Lê aos pares, e cada par carrega 13 ou 14 bits conforme o próprio valor.",
        example: { in: "si;ge,EI6U", out: "Blumenau" },
      },
      {
        name: "Base36 (número)",
        desc: "Um NÚMERO escrito com 0-9 e A-Z — não é binário→texto como as outras bases. Contas em BigInt: acima de 11 caracteres o número comum arredondaria e devolveria outro valor.",
        example: { in: "zik0zj", out: "2147483647" },
      },
      { name: "Hexadecimal", desc: "Bytes em hex.", example: { in: "48 69", out: "Hi" } },
      {
        name: "Binário / Octal / Decimal (ASCII)",
        desc: "Códigos numéricos de caracteres.",
        example: { in: "72 73", out: "HI" },
      },
      {
        name: "Código Morse",
        desc: "Pontos e traços.",
        example: { in: "... --- ...", out: "SOS" },
      },
      { name: "Braille", desc: "Padrões Braille (⠿) → letras.", example: { in: "⠓⠊", out: "hi" } },
      {
        name: "Baudot / ITA2",
        desc: "Teleimpressora de 5 bits.",
        example: { in: "11000 10011", out: "AE" },
      },
      {
        name: "URL (percent) / Entidades HTML",
        desc: "Decodifica %XX e &entidade;.",
        example: { in: "ol%C3%A1", out: "olá" },
      },
      {
        name: "Teclado T9 (multitap)",
        desc: "Tecla repetida = posição da letra no celular.",
        example: { in: "44 33 555 555 666", out: "hello" },
      },
      {
        name: "Caracteres invisíveis (zero-width)",
        desc: "Mensagem escondida em caracteres de largura zero (esteganografia).",
        example: { in: "texto com zero-width", out: "mensagem oculta" },
      },
      {
        name: "Espaços escondidos (whitespace)",
        desc: "Espaço duplo, tabulação e espaço no fim da linha viram um perfil linha a linha (e bits, quando fecham) — cole preservando as quebras, porque copiar de PDF/Word apaga o sinal.",
        example: { in: "4 linhas com espaços duplos", out: "perfil por linha → 2102" },
      },
    ],
  },
  {
    id: "cifras",
    title: "Cifras clássicas",
    intro: "Substituição e transposição. Algumas (Vigenère, Playfair…) usam o campo de chave.",
    entries: [
      {
        name: "César / ROT-N e ROT13",
        desc: "Desloca o alfabeto por N posições.",
        example: { in: "Khoor", out: "Hello (N=3)" },
      },
      {
        name: "César — força bruta",
        desc: "Mostra todos os deslocamentos −26 a +26 numa tabela.",
        example: { in: "Khoor", out: "tabela de 0 a 25" },
      },
      { name: "Atbash", desc: "Alfabeto invertido (A↔Z).", example: { in: "Svool", out: "Hello" } },
      {
        name: "Afim (affine)",
        desc: "Cifra afim (a·x + b).",
        example: { in: "Ihfphi", out: "texto (a,b)" },
      },
      {
        name: "Vigenère / autokey / Beaufort / Gronsfeld",
        desc: "Cifras polialfabéticas com chave.",
        example: { in: "Rijvs (chave KEY)", out: "Hello" },
      },
      {
        name: "Playfair / Quadrado de Políbio / Bifid / Tap code",
        desc: "Cifras de tabuleiro 5×5 (Bifid e Playfair usam o campo de chave).",
        example: { in: "FNNVD", out: "HELLO (Bifid)" },
      },
      {
        name: "Trithemius",
        desc: "César progressivo, sem chave: cada letra desloca pela própria posição.",
        example: { in: "HFNOS", out: "HELLO" },
      },
      {
        name: "Porta (Della Porta)",
        desc: "Polialfabética recíproca (cifra = decifra); usa o campo de chave.",
        example: { in: "texto (chave KEY)", out: "texto claro" },
      },
      {
        name: "Cerca (rail fence) / Transposição colunar",
        desc: "Transposições (ziguezague / colunas).",
        example: { in: "Hloleh", out: "Hello" },
      },
      {
        name: "Cifra de Bacon",
        desc: "Grupos de A/B (5 bits) → letra.",
        example: { in: "AABBB AABAA", out: "HE" },
      },
      {
        name: "Alfabeto fonético (NATO)",
        desc: "Alfa, Bravo, Charlie… → letras.",
        example: { in: "Alfa Bravo Charlie", out: "ABC" },
      },
      {
        name: "Deslocamento de teclado (QWERTY)",
        desc: "Lê a tecla vizinha no teclado.",
        example: { in: "tr", out: "vizinhas no QWERTY" },
      },
      {
        name: "A1Z26 (número↔letra) e invertido (1=Z)",
        desc: "Letra ↔ número da posição no alfabeto; invertido começa do Z.",
        example: { in: "8 5 12 12 15", out: "hello" },
      },
      {
        name: "ROT5 / ROT18 / ROT47",
        desc: "Rotaciona dígitos (ROT5), letras+dígitos (ROT18) ou toda a faixa imprimível do ASCII (ROT47).",
        example: { in: "12345", out: "67890" },
      },
      {
        name: "ROT8000 (Unicode)",
        desc: "O ROT13 do Unicode: gira metade do plano básico (63.404 posições), então texto latino vira ideograma e vice-versa — aplicar de novo devolve o original.",
        example: { in: "籋籵籾籶籮籷籪籾", out: "Blumenau" },
      },
      {
        name: "Cifra vocálica (deslocamento com sinal)",
        desc: "Lista de deslocamentos COM sinal (o sinal é o portão): aplicada a A E I O U dá a palavra das imagens das vogais; aplicada posição a posição, cada letra anda o seu próprio valor.",
        example: { in: "+11 -4 +7 -6 -2", out: "LAPIS (A+11=L · E-4=A · I+7=P · O-6=I · U-2=S)" },
      },
      {
        name: "Roda alfabética (disco cifrante)",
        desc: "A1Z26 parametrizado: varre as 26 origens na linha vermelha, os dois sentidos e a 1ª casa valendo 0 ou 1, e desenha o disco lido.",
        example: {
          in: "16 8 22 / 23 4 24 / 4 24 7 / 26 15 22",
          out: "umabicicleta (origem F · horário · 1ª casa = 1)",
        },
      },
      {
        name: "Valor das letras (gematria, primos, redução)",
        desc: "Letra ↔ número por tabela: gematria clássica (A=1, J=10, S=100), primos (A=2, B=3, C=5…) e redução 1–9; também volta de números para letras.",
        example: { in: "scotland", out: "primos: 67 5 47 71 37 2 43 7" },
      },
    ],
  },
  {
    id: "transformacoes",
    title: "Transformações e tabelas",
    intro: "Conversões e tabelas de referência aplicadas à entrada.",
    entries: [
      {
        name: "Conversor de base",
        desc: "Converte um número entre decimal, hex, octal e binário (e o caminho de volta: um binário solto também sai como número).",
        example: { in: "255", out: "hex FF · bin 11111111" },
      },
      {
        name: "Números romanos",
        desc: "Romano ↔ arábico.",
        example: { in: "MMXXVI", out: "2026" },
      },
      {
        name: "Número por extenso (pt-BR)",
        desc: "Número escrito por extenso → dígitos, com ordinais e gênero; o caminho inverso (dígitos → extenso) só roda quando você escolhe esta cifra na barra lateral.",
        example: { in: "quatrocentos e vinte e três", out: "423" },
      },
      {
        name: "Texto invertido",
        desc: "Lê a entrada de trás para frente.",
        example: { in: "olleh", out: "hello" },
      },
      {
        name: "Tabela periódica",
        desc: "Quatro leituras: símbolo→número atômico, número→símbolo, peso atômico e fórmula molecular (os subscritos em ordem, com o ausente valendo 1) — esta última também pelo nome do composto em pt-BR.",
        example: { in: "H3PO4 H2O HNO3", out: "31421113 (subscritos da fórmula)" },
      },
      {
        name: "Alfabetos do mundo",
        desc: "A1Z26 no alfabeto CERTO: escolhido um alfabeto no campo de chave, número vira letra e letra vira número dentro dele — o havaiano tem 13 letras, o espanhol põe o Ñ depois do N, o português antigo para no 23. Sem chave, reconhece a escrita (grego, cirílico, hebraico, árabe, georgiano, rúnico, hangul, kana), diz quantas letras ela tem e translitera.",
        example: { in: "5 (alfabeto: havaiano)", out: "U — 5ª de 13 (no latino seria E)" },
      },
      {
        name: "Notas musicais",
        desc: "Cifra anglo (C D E…) ou solfejo (Dó Ré Mi…) → letras e números.",
        example: { in: "Dó Ré Mi Fá", out: "CDEF" },
      },
      {
        name: "Leetspeak",
        desc: "Normaliza leet para letras.",
        example: { in: "l33t h4x0r", out: "leet haxor" },
      },
      {
        name: "Texto estilizado (Unicode)",
        desc: "𝐧𝐞𝐠𝐫𝐢𝐭𝐨, 𝔣𝔯𝔞𝔨𝔱𝔲𝔯, ⓒⓘⓡⓒⓤⓛⓞ, ｆｕｌｌｗｉｄｔｈ, ᴠᴇʀꜱᴀʟᴇᴛᴇ, ᵖʳᵒᵛᵃ sobrescrita e ʇǝxʇo de cabeça para baixo não são fonte, são outro bloco Unicode — 24 tabelas devolvidas ao ASCII, para a bancada voltar a casar. Bandeira também: cada uma é o par de indicadores regionais do código ISO 3166 do país.",
        example: { in: "🇧🇷 🇦🇷 🇺🇾 🇵🇾", out: "BR AR UY PY (indicador regional)" },
      },
      {
        name: "Acróstico",
        desc: "Primeiras letras de cada palavra/linha (mensagem escondida).",
        example: { in: "Sempre / Observe / Lugares", out: "SOL" },
      },
      {
        name: "Acróstico posicional",
        desc: "A k-ésima letra (do início ou do fim) de cada linha/palavra, as linhas alternadas e a junção nome↔sobrenome.",
        example: {
          in: "6 títulos, um por linha",
          out: "5ª letra do fim de cada linha → TEatro",
        },
      },
      {
        name: "Letra por posição",
        desc: "Uma fonte por linha e os índices na chave (aceita romanos, negativo para contar do fim e pares fonte→letra): cada fonte entrega uma letra.",
        example: { in: "6 imperadores + chave “I V II IV IV III”", out: "Louros" },
      },
      {
        name: "Contagem como chave",
        desc: "A resposta não está no que o texto diz, e sim em quantas coisas ele tem: palavras por parágrafo/linha, itens por bloco, ocorrências de um caractere (2º campo) — com a leitura A1Z26 ao lado.",
        example: { in: "8 parágrafos", out: "22 5 14 3 5 4 15 18 → vencedor" },
      },
      {
        name: "Reagrupar dígitos",
        desc: "Junta TODOS os dígitos da entrada (ignorando vírgulas e prosa) e reparte em blocos fixos: ASCII de 7/8 bits, ASCII decimal de 2/3 e A1Z26 aos pares.",
        example: { in: "22 05 14 03 05 04 15 18", out: "VENCEDOR (A1Z26, blocos de 2)" },
      },
      {
        name: "Leitura de grade",
        desc: "Cinco caminhos sobre a mesma grade (markdown, espaçada ou contígua): quatro braços a partir dos cantos, espiral horária e anti-horária, serpentina por linhas e por colunas.",
        example: { in: "grade 8×8 colada", out: "quatro braços → PARACUMPRIRESSAPROVAVOCESDEV…" },
      },
      {
        name: "Data como chave",
        desc: "Lista de datas → inicial do signo de cada uma; data sozinha abre o painel (signo, dia da semana, dia do ano, serial do Excel, Unix e fase da lua).",
        example: {
          in: "11/07-29/03-23/11-17/01-13/02-02/09-07/11-05/10",
          out: "CASCAVEL (iniciais dos signos)",
        },
      },
      {
        name: "Aritmética escondida",
        desc: "MDC, MMC, raiz, divisão, resto e Kaprekar sobre os números da entrada, com a leitura A1Z26 de cada linha; em prosa só dispara com palavra-dica (“em comum”, “raiz”, “dividir”…).",
        example: { in: "21 15 45 60 63 12 15", out: "MDC = 3 → 7 5 15 20 21 4 5 → GEOTUDE" },
      },
      {
        name: "Cores (hex/RGB/HSL)",
        desc: "Hex, rgb(), hsl() ou uma lista de triplas → nome aproximado na Lista de cores da Wikipédia em português, com as iniciais e os valores nos outros espaços.",
        example: {
          in: "245-245-220 · 244-196-48 · 0-0-128 · 0-0-255 · 255-250-250 · 153-102-204",
          out: "Bege · Açafrão · Naval · Azul · Neve · Ametista → BANANA",
        },
      },
      {
        name: "Código de cores de resistor",
        desc: "3 a 6 faixas → valor, tolerância e ppm (e só os dígitos, que é o que costuma encadear); também lê ao contrário e faz o caminho inverso, de ohms para cores.",
        example: { in: "marrom preto vermelho ouro", out: "1000 Ω ±5%" },
      },
      {
        name: "Faber-Castell (código da cor)",
        desc: "Código de 3 dígitos do lápis → nome da cor (as 12 conferidas do gabarito), uma por linha, pronto para indexar.",
        example: { in: "015", out: "Laranja escuro" },
      },
      {
        name: "Identificador de hash",
        desc: "Diz qual algoritmo o hash provavelmente é, pelo tamanho/formato.",
        example: { in: "5d41402abc4b2a76b9719d911017c592", out: "MD5 (32 hex)" },
      },
      {
        name: "XOR (com chave)",
        desc: "XOR de chave repetida (entrada em hex ou texto); usa o campo de chave. Clássico de CTF.",
        example: { in: "hex + chave", out: "texto claro" },
      },
    ],
  },
  {
    id: "localizacao",
    title: "Localização e mapas",
    intro:
      "Reconhece coordenadas em vários formatos e plota no mapa. Muitos sistemas têm prefixo fixo por cidade — então um código PARCIAL (só a cauda) já é localizado, assumindo Blumenau ou Itajaí (como o atalho “Nb” do GeoHex, a zona 22J do MGRS e o “JE” do GEOREF). Quando é localização, o card também mostra o membro da frota mais próximo.",
    entries: [
      {
        name: "Coordenadas (DD, DMS, DDM)",
        desc: "Graus decimais, graus/min/seg, graus e minutos.",
        example: { in: "-26.9906, -48.6356", out: "ponto no mapa" },
      },
      {
        name: "Grades globais: UTM · Geohash · Plus Code · Maidenhead · Quadkey · H3",
        desc: "Código completo de qualquer um desses formatos → ponto no mapa.",
        example: { in: "89a835d5acbffff", out: "H3 → mapa" },
      },
      {
        name: "MGRS / USNG (militar)",
        desc: "Referência de grade militar (zona + quadrado de 100 km + par de coordenadas), de 100 km a 1 m de precisão.",
        example: { in: "22JGR3221221631", out: "Itajaí (-26,9078 · -48,6618)" },
      },
      {
        name: "GEOREF (aeronáutico)",
        desc: "World Geographic Reference System: dois pares de letras para a célula de 1° e os minutos ao lado.",
        example: { in: "JEMD2005", out: "Itajaí (-26,9083 · -48,6583)" },
      },
      {
        name: "GARS (célula de 30′/15′/5′)",
        desc: "Global Area Reference System: três dígitos de longitude, duas letras de latitude e os dígitos que dividem a célula em quadrantes e áreas.",
        example: { in: "262FG49", out: "célula de 5′ sobre Blumenau (-26,9583 · -49,0417)" },
      },
      {
        name: "Carta IBGE/DSG (articulação MI)",
        desc: "Nomenclatura das cartas topográficas: cada sufixo desce uma escala, de 1:1.000.000 até a quadrícula de 7,5′.",
        example: { in: "SG-22-Z-B-IV-4-SE", out: "quadrícula 1:25.000 de Blumenau" },
      },
      {
        name: "Grade estatística IBGE",
        desc: "Identificador das células do Censo (Albers/SIRGAS 2000), de 1 km ou 200 m — sai como ponto no mapa.",
        example: {
          in: "1KME5499000N8337000",
          out: "célula de 1 km em Blumenau (-26,9197 · -49,0704)",
        },
      },
      {
        name: "GeoHex — código, cauda “Nb” ou curinga",
        desc: "Código GeoHex completo, OU só os números: Blumenau e Itajaí começam com “Nb”, então a cauda numérica é completada como “Nb”+número (Vale do Itajaí). Casa desconhecida aceita curinga (x, ?, * ou _).",
        example: { in: "11478825612", out: "Itajaí no mapa (Nb11478825612)" },
      },
      {
        name: "GeoTude (“GeoCoding ###”)",
        desc: "Grade decimal aninhada: um índice de 4–6 dígitos dá a célula de 1° e cada par de dois dígitos refina um decimal — o ponto é o canto noroeste da célula, não o centro.",
        example: { in: "68130.89.91.15.12", out: "-26.8911, -49.0848 (Blumenau)" },
      },
      {
        name: "Mapcode (reconhecido pela forma)",
        desc: "A bancada identifica a forma e avisa por um chip; a coordenada ainda não vai ao mapa, porque mapcode local não decodifica sem território (2JF.5R vale em 467 dos 533 territórios — assumindo BR-SC, cai na Prefeitura de Blumenau).",
        example: { in: "2JF.5R", out: "chip “tem cara de Mapcode”" },
      },
      {
        name: "Atalho local: Plus Code curto",
        desc: "Plus Code sem o “area code” (4 chars): completa com o de Blumenau (585G) ou Itajaí (585H) e escolhe o que cai na cidade.",
        example: { in: "38RQ+V7", out: "Itajaí (585H38RQ+V7)" },
      },
      {
        name: "Atalho local: cauda de Geohash",
        desc: "Cauda de Geohash (com letra): antepõe o prefixo da cidade — Blumenau 6gjn / Itajaí 6gjq.",
        example: { in: "g7rpj", out: "Blumenau (6gjng7rpj)" },
      },
      {
        name: "Atalho local: cauda de MGRS",
        desc: "MGRS sem a zona: completa com a 22J do Vale do Itajaí e só aceita o que cai na região.",
        example: { in: "FR9203021024", out: "Blumenau (22JFR9203021024)" },
      },
      {
        name: "Atalho local: cauda de GEOREF",
        desc: "GEOREF sem o par de 15° inicial: completa com o “JE” do Vale do Itajaí.",
        example: { in: "LD5604", out: "Blumenau (JELD5604)" },
      },
      {
        name: "what3words",
        desc: "Endereço de 3 palavras (precisa de chave de API).",
        example: { in: "///palavra.palavra.palavra", out: "ponto no mapa" },
      },
      {
        name: "Aeroporto (IATA/ICAO)",
        desc: "Código de aeroporto → nome, cidade, país e mapa (base mundial OpenFlights).",
        example: { in: "GRU", out: "Guarulhos · São Paulo, Brasil" },
      },
    ],
  },
  {
    id: "documentos",
    title: "Documentos e códigos brasileiros",
    intro: "Valida e, quando dá, consulta o significado do número.",
    entries: [
      {
        name: "CPF / CNPJ",
        desc: "Valida (inclui CNPJ alfanumérico) e consulta a empresa de CNPJ válido.",
        example: { in: "11.222.333/0001-81", out: "CNPJ válido + razão social" },
      },
      {
        name: "ISBN",
        desc: "Valida ISBN-10/13 (978/979) e busca o título do livro.",
        example: { in: "9788535902778", out: "título do livro" },
      },
      {
        name: "NCM",
        desc: "Código de mercadoria → descrição oficial.",
        example: { in: "22030000", out: "Cervejas de malte" },
      },
      {
        name: "Código de barras (EAN-13/8, UPC-A)",
        desc: "Valida o dígito, identifica o país (prefixo GS1) e busca o produto.",
        example: { in: "7891000053508", out: "EAN-13 · Brasil · produto" },
      },
      {
        name: "Boleto / conta de consumo",
        desc: "Código de barras (44), linha digitável bancária (47) ou de arrecadação (48) → banco, valor e o vencimento escondido no fator — mostrado nas DUAS leituras, porque o fator reiniciou em 22/02/2025.",
        example: {
          in: "34191153800000157351234567890123456789012345",
          out: "Itaú · R$ 157,35 · vence 14/08/2026 (ou 23/12/2001)",
        },
      },
      {
        name: "Chave de acesso (NF-e)",
        desc: "As 44 posições da nota fiscal eletrônica fatiadas nos nove campos oficiais, com o CNPJ do emitente pronto para encadear.",
        example: {
          in: "43171207364617000135550000000120141000120146",
          out: "NF-e nº 12.014 · RS · 12/2017 · CNPJ 07.364.617/0001-35",
        },
      },
      {
        name: "Título de eleitor (UF)",
        desc: "12 dígitos com os dois verificadores conferidos: os dígitos 9–10 dizem o estado onde a pessoa vota.",
        example: { in: "123456780990", out: "Santa Catarina (SC)" },
      },
      {
        name: "Placa de veículo",
        desc: "Converte antiga ↔ Mercosul (o 5º caractere é o 2º dígito virado letra) e aponta a UF pela faixa de letras — a Mercosul nativa não codifica estado nenhum.",
        example: { in: "ABC-1234", out: "ABC1C34 · Paraná (PR)" },
      },
      {
        name: "Rastreio postal (Correios / UPU S10)",
        desc: "Confere o dígito verificador do código de 13 caracteres, classifica o tipo de serviço pela norma e resolve o país de postagem pelo sufixo.",
        example: { in: "PB123456785BR", out: "DV confere · postado no Brasil" },
      },
      {
        name: "Quantidade de dígitos",
        desc: "Diz que documentos/códigos têm aquele tamanho.",
        example: { in: "12345678901", out: "11 díg.: CPF · PIS · título…" },
      },
      {
        name: "Município (IBGE)",
        desc: "Código IBGE → município e UF.",
        example: { in: "4202404", out: "Blumenau — SC" },
      },
      {
        name: "DDI (código de país)",
        desc: "Número de país → nome.",
        example: { in: "55 56", out: "Brasil · Chile" },
      },
      {
        name: "DDD (área do Brasil)",
        desc: "Código de área → UF, região e cidades.",
        example: { in: "47 48", out: "SC norte · SC sul" },
      },
      {
        name: "Cidade → DDD",
        desc: "Caminho inverso: a lista de cidades vira a sequência de códigos de área, que costuma montar um telefone (a UF vai visível para você flagrar homônimo).",
        example: { in: "Blumenau, Porto Alegre", out: "47 · 51 → 4751" },
      },
      {
        name: "Domínio .br (Registro.br)",
        desc: "Domínio terminando em .br → status (registrado/disponível) e expiração, via BrasilAPI.",
        example: { in: "uol.com.br", out: "Registrado · expira em…" },
      },
      {
        name: "Participante PIX (ISPB)",
        desc: "ISPB de 8 dígitos → instituição participante do PIX (lista do BrasilAPI).",
        example: { in: "60746948", out: "BANCO BRADESCO S.A." },
      },
    ],
  },
  {
    id: "mundo",
    title: "Países e moedas",
    intro:
      "Tabelas fechadas do mundo, embutidas e sem rede — a prova dá um código e pede outro. O portão é a própria tabela: sigla que não é código não acende cartão nenhum.",
    entries: [
      {
        name: "País (ISO 3166 · COI · FIFA · ccTLD · placa)",
        desc: "Converte nos dois sentidos entre alpha-2, alpha-3, numérico, domínio, o código dos Jogos, o da FIFA e a placa internacional; aceita lista (“SUI POR NED”), confronto com hífen, o nome, o apelido (“Holanda”) e a capital. Quando o código tem duas leituras, mostra as duas — ROU é Romênia no ISO e Uruguai na placa.",
        example: {
          in: "GER",
          out: "Alemanha · DEU · 276 · .de · placa D (GER é o COI, não o ISO)",
        },
      },
      {
        name: "Moeda (ISO 4217)",
        desc: "Código alfabético (USD), numérico (840) ou símbolo (R$, €, ¥) → nome em pt-BR, símbolo, casas decimais e os países que usam. Aceita vários de uma vez (BRL USD EUR), avisa quando o símbolo tem mais de um dono e ainda reconhece moeda retirada (BGN, HRK, DEM), dizendo por qual foi substituída. Atenção às casas: o iene tem 0, não 2.",
        example: { in: "986", out: "BRL → real · R$ — 2 casas decimais · Brasil" },
      },
    ],
  },
  {
    id: "bases-blumenau",
    title: "Bases de Blumenau / Santa Catarina",
    intro: "Dados locais embutidos, usados nas provas da Equipe Arromba.",
    entries: [
      {
        name: "Código de rua (Blumenau)",
        desc: "Número de cadastro da rua → nome, bairro, lei.",
        example: { in: "3722", out: "Rua ABACATE…" },
      },
      {
        name: "Nome de rua (Blumenau)",
        desc: "Trecho do nome → ruas que combinam (exato e parcial, ignora acentos).",
        example: { in: "abacate", out: "Rua ABACATE…" },
      },
      {
        name: "Nº da Lei (Blumenau)",
        desc: "Número da lei → rua correspondente.",
        example: { in: "6416", out: "rua da lei 6416" },
      },
      {
        name: "Data da Lei (Blumenau)",
        desc: "Data → ruas oficializadas naquele dia.",
        example: { in: "09/02/2004", out: "ruas dessa data" },
      },
      {
        name: "CEP (Santa Catarina)",
        desc: "CEP exato ou curinga (88xxx500) → logradouro e mapa; com só os 6 dígitos finais, testa os dois prefixos de SC (88 e 89).",
        example: { in: "010000", out: "88010-000 Florianópolis · 89010-000 Blumenau" },
      },
      {
        name: "Poste (Cidade Iluminada)",
        desc: "Número da plaqueta → o poste: rua, número, bairro, luminária e coordenada. Só aparece quando existe um poste com aquela plaqueta — não é palpite pela forma do número, e por isso plaqueta curta pontua menos que longa.",
        example: { in: "65299", out: "Rua XV de Novembro, 920 · Centro" },
      },
      {
        name: "Ponte / passarela (Blumenau)",
        desc: 'Nome ou apelido de ponte, passarela ou viaduto → a lei que a nomeou, a data, o que ela transpõe, comprimento e coordenada. Precisa da palavra escrita ("ponte", "passarela", "viaduto", "pontilhão") — sem ela o nome sozinho viraria ruído. Metade das estruturas só existe na lei, sem geometria: o card mostra a lei e diz que não há mapa, em vez de esconder a resposta.',
        example: {
          in: "ponte de ferro",
          out: "Ponte Aldo Pereira de Andrade · Lei 3721/1990 · transpõe o Rio Itajaí-Açu",
        },
      },
    ],
  },
  {
    id: "ferramentas",
    title: "Ferramentas (abas)",
    intro: "Além do Decodificador, abas com funções dedicadas.",
    entries: [
      {
        name: "Arquivo",
        desc: "Solte QUALQUER arquivo e descubra o que ele esconde. Ele identifica o que o arquivo é pelos BYTES (não pela extensão, que qualquer um renomeia), mede quantos bytes existem depois do fim declarado, procura outros arquivos embutidos e os RECORTA para você abrir e baixar, extrai o texto legível de dentro do binário e desenha o mapa de entropia. Cada achado leva ao byte exato no hexdump, para você conferir em vez de acreditar. Um recorte vira arquivo novo e volta ao topo da análise, com trilha de migalhas. Tudo local: nada é enviado para lugar nenhum.",
        example: {
          in: "um .wav com uma foto colada no fim",
          out: "“Este arquivo contém um JPEG inteiro dentro dele” — 9 KB a partir do byte 176.444",
        },
      },
      {
        name: "Arquivo · Áudio",
        desc: "Espectrograma com três vistas de canal (Esquerdo, Direito e Diferença E−D, que revela mensagem em antifase — a que some quando o som vira mono), com piso de dB e faixa de frequência ajustáveis. Lê Morse por tom, DTMF e notas musicais, sempre CANAL A CANAL e sempre no áudio original a 1,0× — velocidade e modo fita são para o ouvido e nunca alimentam detector. Extrai os bits menos significativos com o corte na tela. E recorta trecho e canal para levar a outra ferramenta.",
        example: {
          in: "um WAV com Morse só no canal esquerdo",
          out: "PONTE DE FERRO · 802 Hz · 11 WPM",
        },
      },
      {
        name: "Arquivo · Imagem",
        desc: "Planos de bit (é onde se esconde: o bit menos significativo muda 1/255 da cor e some a olho nu), canais isolados, canal alfa forçado a opaco — pixel transparente ainda carrega cor — e EXIF, com a MINIATURA embutida, que costuma ser do original não editado e revela o que foi apagado da foto grande.",
        example: {
          in: "um PNG com texto no bit 0 do azul",
          out: "a frase aparece nítida no plano isolado",
        },
      },
      {
        name: "Arquivo · Vídeo",
        desc: "Quadro de um segundo específico e tira de miniaturas para achar o instante. Mostra o segundo REAL entregue ao lado do pedido, porque o navegador salta para o quadro decodificável mais próximo. Cada quadro extraído vira um PNG e volta ao topo da análise.",
        example: { in: "1:23,4", out: "o quadro, com aviso se o vídeo entregou 1:22,9" },
      },
      {
        name: "Arquivo · YouTube",
        desc: "Cole o link: título, canal, formato, o player pulando para o segundo, e os quadros que o YouTube publica (dois deles em 1920×1080), analisáveis como imagem. NÃO baixa vídeo nem áudio — é regra dos termos de uso deles, não limitação técnica. E não rode análise de bits nesses quadros: são recomprimidos a partir de vídeo já com perdas.",
        example: { in: "youtu.be/dQw4w9WgXcQ", out: "ficha do vídeo + 7 quadros publicados" },
      },
      {
        name: "Decodificador",
        desc: "A busca única: cola a entrada e vê todas as interpretações ranqueadas. Tem campo de chave, 2º campo (a fonte a indexar, a lista, o texto original), ruas e CEP de Blumenau/SC (com curinga, ex.: 88xxx500) e uma barra lateral pra rodar só uma cifra — que, quando ela sabe, também CODIFICA.",
      },
      {
        name: "Cadeia (usar como entrada)",
        desc: "Todo resultado encadeável tem “usar como entrada”: o valor volta para o campo de entrada e a barra de Cadeia guarda a trilha (até 8 passos), com desfazer e limpar — as provas são cadeias de 2 a 4 camadas.",
        example: {
          in: "Base64 → contagem → A1Z26",
          out: "trilha clicável de volta a qualquer passo",
        },
      },
      {
        name: "Título da prova",
        desc: "O nome da prova entra como pista e levanta chips de sugestão; nunca altera o ranking, e nada é selecionado sozinho.",
        example: { in: "Químico maluco", out: "chip → tabela periódica (fórmula molecular)" },
      },
      {
        name: "Chips do sniffer",
        desc: "Faixa de “isto tem cara de…” acima dos resultados, fora da corrida: o diagnóstico negativo que nenhum decoder dá (DV que não fecha, ASCII confundido com A1Z26, MDC latente, forma de GeoTude/Mapcode/what3words). Alguns chips rodam a cifra sugerida ou já encadeiam o valor.",
        example: { in: "70 79 82 84 65", out: "“é ASCII, não A1Z26” (valores 65–84)" },
      },
      {
        name: "Selo “palavra real”",
        desc: "Quando a saída de texto bate no dicionário pt/en, o cartão ganha o selo com as palavras reconhecidas — é o autocheck de que a leitura fechou.",
        example: { in: "+11 -4 +7 -6 -2", out: "LAPIS com selo “palavra real”" },
      },
      {
        name: "Texto",
        desc: "Extrai mensagens escondidas: 1ª/última letra de linha e palavra, maiúsculas, após pontuação, espelhado, leitura em coluna/diagonal e repetidas — mais as séries de contagem (palavras por parágrafo/linha, itens por bloco, ocorrências de um caractere), cada uma com a leitura A1Z26 ao lado.",
        example: { in: "bloco de texto", out: "iniciais, espelhado, contagens…" },
      },
      {
        name: "Posições",
        desc: "Quatro modos: passo fixo (7, 14, 21…), lista de posições, N fontes × N índices e N fontes × 1 índice (uma fonte por linha, cada uma entregando uma letra). Posições começam em 1; índice negativo conta do fim.",
        example: { in: "3 fontes + índices 1 5 2", out: "uma letra por fonte" },
      },
      {
        name: "Matriz",
        desc: "Uma grade N×M e regras que decidem o que pintar — por elemento, linha, coluna ou matriz inteira, em camadas ou primeira-que-casa, cada regra dizendo quantas células pegou. Pinta também por lista de células (A1/B1/C1), lê a grade pintada em blocos (dígito na fonte 3×5, Braille 2×3, binário) e exporta desenho, 0/1, coordenadas ou PNG. É a aba que devolve FORMA em vez de texto; a ordem de leitura (espiral, quatro braços) continua sendo do Decodificador.",
        example: {
          in: "A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5",
          out: "grade 3×5 pintada = o algarismo 8 (runas do ITC 2019)",
        },
      },
      {
        name: "Diferenças",
        desc: "Compara o texto da prova com a fonte original (sem acento e sem caixa, devolvendo a grafia certa) e entrega quatro tiras copiáveis: palavras trocadas, originais correspondentes, letras que mudaram e contagem de letras de cada trecho.",
        example: { in: "texto alterado + original", out: "as palavras que não estão no original" },
      },
      {
        name: "Anagramas",
        desc: "Acha o que o dicionário forma com as mesmas letras: fonte pt, en, pt+en ou bairros e ruas de Blumenau; em uma palavra ou em duas; e com sobra de 1 ou 2 letras quando não fecha exato.",
        example: { in: "amor", out: "roma · ramo · mora" },
      },
      {
        name: "Fontes",
        desc: "O lado “vejo um símbolo, que letra é essa?”. Separa as duas famílias que a prova confunde: FONTE DE SÍMBOLO do sistema (Wingdings, Webdings, Symbol, Zapf Dingbats) é desenho que a fonte dá para a letra — só existe se estiver instalada e não se copia (copiar devolve a letra), então a aba MEDE a disponibilidade e diz “não instalada” em vez de mostrar letras latinas caladamente; ESTILO UNICODE é code point, funciona em qualquer máquina e se copia. Traz a grade de referência letra→glifo (é assim que se lê a P22 de 2023, escrita em Wingdings), os 24 estilos copiáveis e o conversor Symbol ⇄ grego.",
        example: {
          in: "SOMA + fonte Symbol",
          out: "ΣΟΜΑ (copiável: grego é caractere de verdade)",
        },
      },
      {
        name: "Cola",
        desc: "Referência do gabarito: cores, quantidade de dígitos, A1Z26, formatos de coordenada, checklist de técnicas, “Bases e onde consultar” (com o selo de aberta/manual/bloqueada/adiada), alfabeto Pigpen, alfabeto manual de Libras e compostos químicos (nome → fórmula).",
      },
      {
        name: "Triangulação",
        desc: "Vários pontos digitados em qualquer forma — coordenada (todos os formatos da bancada), CEP, endereço com número, nome de rua ou nome de ponte, inclusive pelo apelido — viram mapa. Com três, dá os quatro centros que não são a mesma coisa: o CENTROIDE (média das posições), o EQUIDISTANTE (circuncentro — à mesma distância dos três, que é o que “triangular” costuma querer dizer), o INCENTRO (equidistante dos lados) e a MENOR SOMA (mediana geométrica: o encontro mais curto para todos, e o único que não é arrastado por um ponto muito distante), mais os lados, ângulos e área do triângulo. Com qualquer quantidade, desenha a rota na ordem digitada, com distância e rumo de cada perna, e reordena pelo trajeto mais curto sem mexer no ponto de partida. Distâncias em linha reta, não pela malha viária. No mapa dá para clicar para marcar um ponto novo e arrastar os pinos para ajustar — a coordenada volta sozinha para o campo. Digitando um nome, ele sugere ruas e pontes da base local, sem consultar nada na rede.",
        example: {
          in: "Ponte dos Arcos · Ponte de Ferro · Ponte do Salto",
          out: "equidistante −26.876451, −49.060724 · rota 5,89 km",
        },
      },
      {
        name: "Postes",
        desc: "Os 45.285 pontos de iluminação pública de Blumenau, com plaqueta, coordenada, rua, bairro e luminária. Busque pelo número da plaqueta, por rua ou por bairro — ou navegue no mapa, que carrega conforme você arrasta. Clicando num poste sai a ficha e o botão de compartilhar, que no celular abre direto o WhatsApp.",
        example: { in: "Itoupava Central", out: "postes do bairro, no mapa e na lista" },
      },
      {
        name: "Biblioteca",
        desc: "Tudo que a bancada conhece, com o tamanho real de cada base (a contagem vem do banco, não de um número escrito à mão), e embaixo as bases públicas que ainda se consultam à mão, com o link oficial. Cada base abre para navegar; a de postes abre no mapa.",
      },
      {
        name: "Frota",
        desc: "Mapa ao vivo dos celulares da equipe (Traccar): posição, status, bateria e quem está mais perto — o mesmo cálculo que aparece no cartão de localização.",
      },
      {
        name: "Entrar e aprovar acesso",
        desc: "A bancada pede login. Quem se cadastra entra como “aguardando aprovação” e só usa depois que um administrador liberar — não há confirmação por e-mail, a porta é a aprovação. Quem é admin tem o botão de usuários no topo, para aprovar, bloquear, criar e remover contas.",
      },
    ],
  },
  {
    id: "apis",
    title: "APIs utilizadas",
    intro:
      "Consultas externas que o app faz. Quase tudo passa pelo backend do projeto (the-decrypter-api), que cacheia, limita a taxa e guarda as chaves — o navegador só fala direto com o OpenStreetMap. Mantida em sincronia com o que é realmente chamado.",
    entries: [
      {
        name: "Backend (the-decrypter-api)",
        desc: "Porta de entrada das consultas externas (/cnpj, /isbn, /ncm, /registrobr, /pix, /produto, /what3words, /geocode, /fleet) e, agora, das bases grandes: CEP, municípios, aeroportos e postes vêm dele em vez de serem baixados pelo navegador. Toda chamada leva o token da sessão.",
        example: { in: "/api/lookup?q=…", out: "uma resposta só, com o que a entrada podia ser" },
      },
      {
        name: "BrasilAPI (via backend)",
        desc: "CNPJ, CEP, ISBN, NCM, participantes do PIX (ISPB) e domínios .br (Registro.br).",
        example: { in: "brasilapi.com.br", out: "grátis · sem chave" },
      },
      {
        name: "Open Food Facts (via backend)",
        desc: "Nome do produto pelo código de barras (EAN/UPC).",
        example: { in: "world.openfoodfacts.org", out: "grátis · alimentos" },
      },
      {
        name: "what3words (via backend)",
        desc: "Endereço de 3 palavras → coordenada; a chave fica no servidor.",
        example: { in: "api.what3words.com", out: "precisa de chave" },
      },
      {
        name: "Nominatim / OSM (via backend)",
        desc: "Geocodificação de endereço e CEP quando a base local não resolve.",
        example: { in: "/geocode?q=…", out: "coordenada" },
      },
      {
        name: "OpenStreetMap (direto do navegador)",
        desc: "Tiles e mapa embutido dos cartões de localização e da aba Frota.",
        example: { in: "tile.openstreetmap.org", out: "grátis" },
      },
      {
        name: "Traccar (via backend)",
        desc: "Posições dos celulares da equipe que alimentam a aba Frota.",
        example: { in: "/fleet", out: "só com o Traccar configurado no backend" },
      },
      {
        name: "Bases embutidas (sem rede)",
        desc: "Ruas de Blumenau, as 94 pontes/passarelas/viadutos nomeados de Blumenau (lei de denominação + geometria do OSM), CEPs de SC, municípios do IBGE, aeroportos do OpenFlights, as tabelas de país (ISO 3166/COI/FIFA), moeda (ISO 4217), alfabetos do mundo e estilos Unicode e as listas de palavras pt/en vêm empacotados; boleto, chave de NF-e, título de eleitor, placa, rastreio S10 e todas as grades de coordenada (MGRS, GEOREF, GARS, carta e grade do IBGE) são conta local, sem rede; o Mapcode carrega a lib por import dinâmico, também sem consulta externa.",
        example: { in: "/data/*.json", out: "offline" },
      },
    ],
  },
];
