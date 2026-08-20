/**
 * SOLETRAÇÃO — as listas, lado a lado, com a procedência de cada uma.
 *
 * ── O QUE O LEVANTAMENTO ACHOU, E É O MOTIVO DE ISTO SER LEGENDA ────────────
 * **Não existe norma brasileira de soletração em palavras portuguesas.**
 * Conferido órgão por órgão: a ANATEL (Res. 449/2006, art. 43 — revogada) apenas
 * *permite* o "Código Fonético Internacional", sem publicar tabela; o DECEA
 * (MCA 100-16, item 2.5) publica o **ICAO, em inglês**; o manual de comunicações
 * do Exército (EB70-MC-10.246, 2020) foi lido inteiro e tem **zero** ocorrências
 * de "fonétic" ou "soletr". Marinha, PM, Correios e ABNT: nada encontrado.
 *
 * O Brasil oficializou o ICAO. Tudo em português é **uso, não norma** — e é por
 * isso que estas listas são legenda de consulta, e não a tabela de um decoder.
 * O decoder (`decoders/soletracao.ts`) lê a forma "X de Palavra", que se
 * autoverifica pela acrofonia e não depende de lista nenhuma.
 *
 * ── E A LISTA MAIS CITADA É A MENOS FUNDAMENTADA ───────────────────────────
 * "Amor, Bandeira, Cobra…" aparece em três lugares (as Wikipédias pt e en, e o
 * significados.com.br) e os três remontam ao mesmo domínio morto, nunca
 * arquivado. Ela provavelmente É o uso real; fonte, não tem. Vai com o selo.
 */

export interface LinhaSoletracao {
  letra: string;
  /** DECEA MCA 100-16 §2.5 — o único oficial no Brasil, e é em inglês. */
  icao: string;
  /** "Radiotelefônico BR" — a mais citada, e sem fonte primária. */
  br: string;
  /** ICAO 1947, versão para a América Latina. */
  latina: string;
}

export const SOLETRACAO: LinhaSoletracao[] = [
  { letra: "A", icao: "Alfa", br: "Amor", latina: "Ana" },
  { letra: "B", icao: "Bravo", br: "Bandeira", latina: "Brazil" },
  { letra: "C", icao: "Charlie", br: "Cobra", latina: "Coco" },
  { letra: "D", icao: "Delta", br: "Dado", latina: "Dado" },
  { letra: "E", icao: "Echo", br: "Estrela", latina: "Elsa" },
  { letra: "F", icao: "Foxtrot", br: "Feira", latina: "Fiesta" },
  { letra: "G", icao: "Golf", br: "Goiaba", latina: "Gato" },
  { letra: "H", icao: "Hotel", br: "Hotel", latina: "Hombre" },
  { letra: "I", icao: "India", br: "Índio", latina: "India" },
  { letra: "J", icao: "Juliett", br: "José", latina: "Julio" },
  { letra: "K", icao: "Kilo", br: "Kiwi", latina: "Kilo" },
  { letra: "L", icao: "Lima", br: "Lua", latina: "Luis" },
  { letra: "M", icao: "Mike", br: "Maria", latina: "Mama" },
  { letra: "N", icao: "November", br: "Navio", latina: "Norma" },
  { letra: "O", icao: "Oscar", br: "Ouro", latina: "Opera" },
  { letra: "P", icao: "Papa", br: "Pipa", latina: "Peru" },
  { letra: "Q", icao: "Quebec", br: "Quilombo", latina: "Quebec" },
  { letra: "R", icao: "Romeu", br: "Raiz", latina: "Rosa" },
  { letra: "S", icao: "Sierra", br: "Saci", latina: "Sara" },
  { letra: "T", icao: "Tango", br: "Tatu", latina: "Tomas" },
  { letra: "U", icao: "Uniform", br: "Uva", latina: "Uruguay" },
  { letra: "V", icao: "Victor", br: "Vitória", latina: "Victor" },
  { letra: "W", icao: "Whiskey", br: "Wilson", latina: "Whiskey" },
  { letra: "X", icao: "X-ray", br: "Xadrez", latina: "Equis" },
  { letra: "Y", icao: "Yankee", br: "Yolanda", latina: "Yolanda" },
  { letra: "Z", icao: "Zulu", br: "Zebra", latina: "Zeta" },
];

/**
 * OS DÍGITOS — e aqui existe conteúdo genuinamente brasileiro e OFICIAL.
 *
 * DECEA, MCA 100-16 "Fraseologia de Tráfego Aéreo", item 2.6, vigente desde
 * 04/01/2021. O **MEIA** para o 6 é a marca registrada do rádio brasileiro, e a
 * norma explica por quê: "6 NM deve ser pronunciada *meia dúzia de milhas*, para
 * evitar o entendimento de meia milha".
 */
export const SOLETRACAO_DIGITOS: { digito: string; brasil: string; icao: string }[] = [
  { digito: "0", brasil: "ZE-RO", icao: "Zero" },
  { digito: "1", brasil: "UNO (UMA)", icao: "One / Wun" },
  { digito: "2", brasil: "DOIS (DUAS)", icao: "Two / Too" },
  { digito: "3", brasil: "TRÊS", icao: "Three / Tree" },
  { digito: "4", brasil: "QUA-TRO", icao: "Four / Fower" },
  { digito: "5", brasil: "CIN-CO", icao: "Five / Fife" },
  { digito: "6", brasil: "MEIA", icao: "Six" },
  { digito: "7", brasil: "SE-TE", icao: "Seven" },
  { digito: "8", brasil: "OI-TO", icao: "Eight / Ait" },
  { digito: "9", brasil: "NO-VE", icao: "Nine / Niner" },
];

export const SOLETRACAO_NOTAS: string[] = [
  "Não existe norma brasileira em palavras portuguesas. O DECEA (MCA 100-16) publica o ICAO em inglês; a ANATEL só permite o “Código Fonético Internacional”, sem tabela, e a resolução está revogada; o manual do Exército não trata do assunto. Tudo em português é uso.",
  "A coluna BR é a lista mais citada e a menos fundamentada: as três fontes que a repetem remontam ao mesmo domínio morto. Provavelmente é o uso real; fonte primária, não tem.",
  "Na prática não há lista fechada. O uso é padronizado “mais ou menos até a letra E” — daí em diante cada um escolhe a palavra. Por isso a bancada lê a FORMA “X de Palavra” (o decoder confere se a palavra começa pela letra) em vez de casar contra uma tabela.",
  "Duas publicações oficiais brasileiras divergem na mesma letra: o DECEA escreve “Romeu”, a cartilha da ANATEL escreve “Romeo”.",
  "Os dígitos são a parte genuinamente brasileira e oficial. MEIA para o 6 existe para não confundir com “meia (milha)”.",
  "Existe uma quarta lista corrente (AFIR, BALA, CRUZ…) que não entrou aqui: quatro dos seus termos — AFIR, INTE, VEVÊ, YOLE — não são palavras de língua nenhuma, e um deles, NEGA, carrega carga racial hoje.",
];
