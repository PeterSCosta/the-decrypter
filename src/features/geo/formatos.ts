import { BLUMENAU, ITAJAI } from "@/features/location/anchors";

/**
 * O catálogo de formatos de geolocalização — fonte única da aba Geolocalização.
 *
 * ── POR QUE ESTA ABA EXISTE ─────────────────────────────────────────────────
 * Coordenada é o assunto que mais se espalhou pela bancada: são quinze formatos
 * no Decodificador, uma aba de Triangulação, uma de Postes, uma de Frota e um
 * punhado de atalhos locais que só funcionam porque Blumenau e Itajaí têm
 * prefixo fixo. Cada peça estava documentada no seu canto, e quem chega numa
 * prova às 23h não monta esse quebra-cabeça. Aqui é o mapa do assunto: o que
 * cada formato é, como se reconhece, o que a bancada faz com ele e onde
 * conferir por fora.
 *
 * A âncora (prefixo da cidade) NÃO é repetida à mão: sai de `anchors.ts`, que é
 * onde ela foi verificada rodando encoder de verdade contra a coordenada da
 * cidade. Uma segunda cópia aqui envelheceria calada.
 */

export interface FormatoGeo {
  id: string;
  nome: string;
  /** O que é, em uma frase. */
  oQueE: string;
  /** Como se reconhece na prática — a assinatura visual. */
  cara: string;
  exemplo: { entrada: string; saida: string };
  /** O atalho local, quando o formato tem prefixo fixo por cidade. */
  atalho?: string;
  /** Precisão de cada nível, quando o formato tem níveis. */
  precisao?: string;
  link?: { url: string; rotulo: string };
}

export interface GrupoDeFormatos {
  id: string;
  titulo: string;
  intro: string;
  formatos: FormatoGeo[];
}

export const GRUPOS_GEO: GrupoDeFormatos[] = [
  {
    id: "angulares",
    titulo: "Coordenadas angulares",
    intro:
      "O par latitude/longitude escrito de três maneiras. É o destino de todos os outros formatos: a bancada converte tudo para graus decimais antes de plotar.",
    formatos: [
      {
        id: "dd",
        nome: "Graus decimais (DD)",
        oQueE: "Dois números com sinal. Latitude primeiro, longitude depois.",
        cara: "Dois números entre −90/90 e −180/180, separados por vírgula.",
        exemplo: { entrada: "-26.9194, -49.0661", saida: "centro de Blumenau" },
        precisao: "Cada casa decimal vale ~11 km, 1,1 km, 110 m, 11 m, 1,1 m…",
      },
      {
        id: "dms",
        nome: "Graus, minutos e segundos (DMS)",
        oQueE: "O mesmo par em base 60, com hemisfério por letra.",
        cara: "Tem ° ′ ″ e termina em N/S/E/W.",
        exemplo: { entrada: "26°55'09.8\"S 49°03'57.9\"W", saida: "centro de Blumenau" },
      },
      {
        id: "ddm",
        nome: "Graus e minutos decimais (DDM)",
        oQueE: "O formato náutico e o do GPS de mão: grau inteiro, minuto com decimais.",
        cara: "Tem ° e ′, sem segundos.",
        exemplo: { entrada: "26°55.163'S 49°03.965'W", saida: "centro de Blumenau" },
      },
    ],
  },
  {
    id: "grades",
    titulo: "Grades globais",
    intro:
      "Sistemas que trocam o par de números por um código só. Cada caractere a mais recorta a célula — e é isso que faz um código truncado ainda valer: ele localiza a região, com menos precisão.",
    formatos: [
      {
        id: "plus",
        nome: "Plus Code (Open Location Code)",
        oQueE: "O código do Google Maps: 8 caracteres, um “+” e o refino.",
        cara: 'Tem “+” no meio e usa um alfabeto sem vogais ("23456789CFGHJMPQRVWX").',
        exemplo: { entrada: BLUMENAU.plusExample, saida: "Blumenau" },
        atalho: `Cauda sem os 4 primeiros: a bancada completa com ${BLUMENAU.plusPrefix} (Blumenau) ou ${ITAJAI.plusPrefix} (Itajaí) e fica com o que cair na cidade.`,
        precisao: "10 caracteres ≈ 14 m; com mais um dígito depois do “+”, ≈ 3 m.",
        link: { url: "https://maps.google.com/pluscodes/", rotulo: "maps.google.com/pluscodes" },
      },
      {
        id: "geohash",
        nome: "Geohash",
        oQueE: "Base 32 sobre a subdivisão binária do mundo — o prefixo é a região.",
        cara: "Só letras e dígitos minúsculos, sem a, i, l e o.",
        exemplo: { entrada: "6gjng7rpj", saida: "Blumenau" },
        atalho: `Cauda sem o prefixo da cidade: ${BLUMENAU.geohashCity} (Blumenau) ou ${ITAJAI.geohashCity} (Itajaí).`,
        precisao: "5 caracteres ≈ 5 km; 7 ≈ 150 m; 9 ≈ 5 m.",
        link: { url: "https://geohash.softeng.co", rotulo: "geohash.softeng.co" },
      },
      {
        id: "utm",
        nome: "UTM",
        oQueE: "Zona + metros a leste e ao norte. O sistema dos mapas topográficos.",
        cara: "Começa com a zona (22J por aqui) e traz dois números grandes em metros.",
        exemplo: { entrada: "22J 692000 7021000", saida: "região de Blumenau" },
        atalho: `Zona ${BLUMENAU.utmZone} para o Vale do Itajaí inteiro.`,
      },
      {
        id: "mgrs",
        nome: "MGRS / USNG (militar)",
        oQueE: "UTM empacotado em letras: zona, quadrado de 100 km e o par de coordenadas.",
        cara: "Zona + duas letras + um número par de dígitos.",
        exemplo: { entrada: "22JGR3221221631", saida: "Itajaí (−26,9078 · −48,6618)" },
        atalho: `Sem a zona: a bancada completa com ${BLUMENAU.utmZone} e só aceita o que cai na região.`,
        precisao: "2 dígitos = 10 km; 4 = 1 km; 6 = 100 m; 8 = 10 m; 10 = 1 m.",
      },
      {
        id: "maidenhead",
        nome: "Maidenhead (grid locator)",
        oQueE: "A grade do radioamadorismo, em pares alternados de letras e dígitos.",
        cara: "Duas letras, dois dígitos, duas letras — GG52 no sul do Brasil.",
        exemplo: { entrada: "GG42vb", saida: "região de Blumenau" },
      },
      {
        id: "quadkey",
        nome: "Quadkey",
        oQueE: "O índice de tile do Bing Maps: cada dígito 0–3 desce um nível de zoom.",
        cara: "Só os dígitos 0, 1, 2 e 3, em sequência longa.",
        exemplo: { entrada: "211102203311", saida: "tile sobre Blumenau" },
      },
      {
        id: "h3",
        nome: "H3 (hexágonos da Uber)",
        oQueE: "Índice hexagonal de 15 resoluções, muito usado em dado de mobilidade.",
        cara: "15 caracteres hexadecimais começando por 8.",
        exemplo: { entrada: "89a835d5acbffff", saida: "hexágono no mapa" },
        link: { url: "https://h3geo.org", rotulo: "h3geo.org" },
      },
      {
        id: "geohex",
        nome: "GeoHex",
        oQueE: "Outra grade hexagonal, japonesa — a que mais aparece com prefixo local.",
        cara: "Duas letras e uma sequência de dígitos.",
        exemplo: { entrada: "11478825612", saida: `Itajaí (${ITAJAI.geohex}11478825612)` },
        atalho: `Só os números: a bancada antepõe “${BLUMENAU.geohex}”, que vale para Blumenau e Itajaí. Casa desconhecida aceita curinga (x, ?, * ou _).`,
        link: { url: "https://www.geohex.org", rotulo: "geohex.org" },
      },
      {
        id: "geotude",
        nome: "GeoTude (“GeoCoding ###”)",
        oQueE: "Grade decimal aninhada: um índice dá a célula de 1° e cada par refina um decimal.",
        cara: "Números separados por pontos, em pares.",
        exemplo: { entrada: "68130.89.91.15.12", saida: "−26.8911, −49.0848 (Blumenau)" },
        precisao: "O ponto é o canto NOROESTE da célula, não o centro.",
      },
      {
        id: "mapcode",
        nome: "Mapcode",
        oQueE: "Código curto por território — e o território é justamente o que costuma faltar.",
        cara: "Poucos caracteres com um ponto no meio (2JF.5R).",
        exemplo: { entrada: "2JF.5R", saida: "chip “tem cara de Mapcode”" },
        precisao:
          "A bancada reconhece a forma e avisa, mas não plota: “2JF.5R” vale em 467 dos 533 territórios. Assumindo BR-SC, cai na Prefeitura de Blumenau.",
        link: { url: "https://www.mapcode.com", rotulo: "mapcode.com" },
      },
    ],
  },
  {
    id: "cartograficos",
    titulo: "Aeronáutico, militar e cartográfico",
    intro:
      "Sistemas de célula que aparecem em carta, plano de voo e material oficial. Costumam vir escritos como se fossem senha — e são endereço.",
    formatos: [
      {
        id: "georef",
        nome: "GEOREF (aeronáutico)",
        oQueE: "World Geographic Reference System: dois pares de letras e os minutos.",
        cara: "Quatro letras seguidas de dígitos.",
        exemplo: { entrada: "JEMD2005", saida: "Itajaí (−26,9083 · −48,6583)" },
        atalho: "Sem o par de 15° inicial, a bancada completa com o “JE” do Vale do Itajaí.",
      },
      {
        id: "gars",
        nome: "GARS (célula de 30′/15′/5′)",
        oQueE: "Global Area Reference System, o quadriculado que a OTAN usa para dividir área.",
        cara: "Três dígitos, duas letras e mais um ou dois dígitos.",
        exemplo: { entrada: "262FG49", saida: "célula de 5′ sobre Blumenau" },
      },
      {
        id: "carta-ibge",
        nome: "Carta IBGE/DSG (articulação MI)",
        oQueE: "A nomenclatura das cartas topográficas: cada sufixo desce uma escala.",
        cara: "Letras e algarismos romanos separados por hífen.",
        exemplo: { entrada: "SG-22-Z-B-IV-4-SE", saida: "quadrícula 1:25.000 de Blumenau" },
        precisao: "De 1:1.000.000 (SG-22) até a quadrícula de 7,5′.",
      },
      {
        id: "grade-ibge",
        nome: "Grade estatística do IBGE",
        oQueE: "O identificador das células do Censo, em projeção Albers/SIRGAS 2000.",
        cara: "Começa com 1KME ou 200ME, seguido de coordenadas em metros.",
        exemplo: { entrada: "1KME5499000N8337000", saida: "célula de 1 km (−26,9197 · −49,0704)" },
        link: { url: "https://www.ibge.gov.br/geociencias", rotulo: "ibge.gov.br/geociencias" },
      },
      {
        id: "w3w",
        nome: "what3words",
        oQueE: "Três palavras para cada quadrado de 3 m do planeta.",
        cara: "Três palavras separadas por ponto, às vezes com /// na frente.",
        exemplo: { entrada: "///palavra.palavra.palavra", saida: "ponto no mapa" },
        precisao: "Depende de chave de API configurada no servidor.",
        link: { url: "https://what3words.com", rotulo: "what3words.com" },
      },
    ],
  },
];

/** As bases locais que respondem endereço → ponto, e o que cada uma resolve. */
export const BASES_GEO = [
  {
    id: "postes",
    nome: "Postes de iluminação",
    resolve: "Plaqueta → coordenada, rua, bairro e luminária. 45.285 pontos de Blumenau.",
    aba: "postes" as const,
  },
  {
    id: "ceps",
    nome: "CEP de Santa Catarina",
    resolve: "CEP → logradouro, município e coordenada. ~40 mil CEPs.",
    aba: "decoder" as const,
  },
  {
    id: "ruas",
    nome: "Rol de ruas de Blumenau",
    resolve: "Código, nº da lei ou nome → rua, bairro e extensão. 3.178 com coordenada.",
    aba: "decoder" as const,
  },
  {
    id: "pontes",
    nome: "Pontes, passarelas e viadutos",
    resolve: "Nome ou apelido → lei que nomeou, o que transpõe e coordenada. 94 obras.",
    aba: "decoder" as const,
  },
  {
    id: "aeroportos",
    nome: "Aeroportos (IATA/ICAO)",
    resolve: "Sigla de 3 ou 4 letras → aeroporto, cidade, país e coordenada.",
    aba: "decoder" as const,
  },
];

/** Onde conferir por fora — links que resolvem o que a bancada não resolve. */
export const LINKS_GEO = [
  {
    nome: "Geoportal de Blumenau",
    oQue: "Lotes, eixos de rua, bairros e limites — ArcGIS REST aberto, exportável em GeoJSON.",
    url: "https://geo.blumenau.sc.gov.br",
  },
  {
    nome: "IBGE — Geociências",
    oQue: "Malhas municipais, cartas topográficas e a grade estatística do Censo.",
    url: "https://www.ibge.gov.br/geociencias",
  },
  {
    nome: "OpenStreetMap",
    oQue: "Mapa base editável; o botão de compartilhar dá a coordenada em DD.",
    url: "https://www.openstreetmap.org",
  },
  {
    nome: "Plus Codes (Google)",
    oQue: "Converte endereço ↔ Plus Code e explica o “area code” de 4 caracteres.",
    url: "https://maps.google.com/pluscodes/",
  },
  {
    nome: "what3words",
    oQue: "Mapa oficial das três palavras, para conferir um endereço sem gastar a chave da API.",
    url: "https://what3words.com",
  },
  {
    nome: "Conversor MGRS/UTM (NGA)",
    oQue: "Referência para conferir uma conversão militar quando a resposta parecer estranha.",
    url: "https://coordinates-converter.com",
  },
];
