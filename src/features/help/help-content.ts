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
  "O The Decrypter é uma oficina de cifras: você cola UMA entrada (texto, números, um código) e ele tenta TODAS as interpretações ao mesmo tempo — dezenas de cifras, codificações, tabelas e bases de dados — e mostra os resultados ranqueados por “o que faz sentido”.",
  "Os mais prováveis aparecem em cima; o resto fica em “pouco provável”, recolhido. Cada resultado tem um selo (codificação, cifra, transformação, base de dados) e um botão de copiar. Quando há chave (Vigenère etc.), use o campo de chave.",
  "Tudo roda no navegador. Algumas consultas usam APIs públicas e gratuitas (CNPJ, CEP, ISBN, NCM, produto pelo código de barras) e mapas (OpenStreetMap).",
];

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "codificacoes",
    title: "Codificações",
    intro: "Representações reversíveis de texto/bytes — detectadas e revertidas automaticamente.",
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
        name: "Playfair / Quadrado de Políbio / Tap code",
        desc: "Cifras de tabuleiro 5×5.",
        example: { in: "·· ··· (tap)", out: "letra" },
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
        name: "ROT5 / ROT18",
        desc: "Rotaciona dígitos (ROT5) ou letras+dígitos (ROT18).",
        example: { in: "12345", out: "67890" },
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
        desc: "Converte um número entre decimal, hex, octal e binário.",
        example: { in: "255", out: "hex FF · bin 11111111" },
      },
      {
        name: "Números romanos",
        desc: "Romano ↔ arábico.",
        example: { in: "MMXXVI", out: "2026" },
      },
      {
        name: "Tabela periódica",
        desc: "Símbolo↔número atômico↔peso; digite símbolos para ver os elementos.",
        example: { in: "H O Cu", out: "Hidrogênio · Oxigênio · Cobre" },
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
        name: "Acróstico",
        desc: "Primeiras letras de cada palavra/linha (mensagem escondida).",
        example: { in: "Sempre / Observe / Lugares", out: "SOL" },
      },
      {
        name: "Identificador de hash",
        desc: "Diz qual algoritmo o hash provavelmente é, pelo tamanho/formato.",
        example: { in: "5d41402abc4b2a76b9719d911017c592", out: "MD5 (32 hex)" },
      },
    ],
  },
  {
    id: "localizacao",
    title: "Localização e mapas",
    intro: "Reconhece coordenadas em vários formatos e plota no mapa.",
    entries: [
      {
        name: "Coordenadas (DD, DMS, DDM)",
        desc: "Graus decimais, graus/min/seg, graus e minutos.",
        example: { in: "-26.9906, -48.6356", out: "ponto no mapa" },
      },
      {
        name: "UTM · Geohash · Plus Code · Maidenhead · Quadkey · H3",
        desc: "Vários formatos de grade/índice geográfico.",
        example: { in: "89a835d5acbffff", out: "H3 → mapa" },
      },
      {
        name: "GeoHex (geohex.net)",
        desc: "Código GeoHex → mapa. Em Blumenau os códigos começam com “Nb”, então um número puro também é tentado como “Nb” + número.",
        example: { in: "Nb11458750330", out: "Blumenau no mapa" },
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
        desc: "CEP exato ou curinga (88xxx500) → logradouro e mapa.",
        example: { in: "88010500", out: "logradouro + mapa" },
      },
    ],
  },
  {
    id: "ferramentas",
    title: "Ferramentas (abas)",
    intro: "Além do Decodificador, abas com funções dedicadas.",
    entries: [
      {
        name: "Decodificador",
        desc: "A busca única: cola a entrada e vê todas as interpretações ranqueadas.",
      },
      {
        name: "Texto",
        desc: "Extrai mensagens escondidas: 1ª/última letra de linha e palavra, maiúsculas, após pontuação, espelhado, leitura em coluna/diagonal, repetidas e contagens.",
        example: { in: "bloco de texto", out: "iniciais, espelhado…" },
      },
      {
        name: "Posições",
        desc: "Pega letras por passo fixo (7, 14, 21…) ou por uma lista de posições.",
        example: { in: "texto + passo 7", out: "letras nas posições" },
      },
      {
        name: "Anagramas",
        desc: "Acha palavras (pt/en) com exatamente as mesmas letras.",
        example: { in: "amor", out: "roma · ramo · mora" },
      },
      {
        name: "Guia de Ruas",
        desc: "Busca no rol de ruas de Blumenau por código, lei, data ou nome.",
      },
      { name: "CEPs (SC)", desc: "Busca CEPs de Santa Catarina, inclusive por curinga." },
      {
        name: "Cola",
        desc: "Referência do gabarito: cores, quantidade de dígitos, A1Z26, formatos de coordenada e checklist de técnicas.",
      },
    ],
  },
];
