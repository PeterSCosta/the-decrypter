/**
 * LEGENDAS DE FORMA — para quem VÊ o traço e não tem o caractere.
 *
 * ── O BURACO QUE ELAS TAPAM ────────────────────────────────────────────────
 * A bancada já translitera runas (`alphabets.ts:513` Elder, `:573` Younger) e já
 * tem o Pigpen desenhado (`glyphs.ts`). O que faltava é o caminho inverso: a
 * prova chega como FOTO de um muro, de uma placa, de uma tábua — e quem está
 * jogando precisa achar a letra a partir do desenho, não do código.
 *
 * ── E POR QUE O CONTEÚDO É ARMADILHA, E NÃO ARTE ASCII ─────────────────────
 * Desenhar 24 runas em monoespaçada dá um resultado ruim e ocupa a Cola inteira.
 * O que de fato resolve às 23h é a lista do que **engana**: glifos que parecem
 * uma letra latina e valem outra, e pares que compartilham o traço entre os dois
 * futharks. Essa é a informação que não se deduz olhando.
 */

export interface Armadilha {
  glifo: string;
  valor: string;
  armadilha: string;
}

/**
 * RUNAS — o que engana.
 *
 * Fontes: bloco Unicode Runic (U+16A0–16FF) e a convenção de transliteração
 * acadêmica do Elder Futhark. Conferido contra `alphabets.ts`, que já está na
 * bancada — as linhas abaixo NÃO duplicam a transliteração, só a forma.
 */
export const RUNAS_ARMADILHAS: Armadilha[] = [
  {
    glifo: "ᛖ",
    valor: "E (ehwaz)",
    armadilha:
      "Desenha um M — duas hastes ligadas no topo por um V que desce entre elas. O M de verdade é ᛗ, que não parece M.",
  },
  {
    glifo: "ᛗ",
    valor: "M (mannaz)",
    armadilha: "É o que parece um M duplo, e é o M. Quem confunde troca com o ᛖ acima.",
  },
  {
    glifo: "ᛉ",
    valor: "Z no Elder (algiz)",
    armadilha:
      "O MESMO desenho — haste com dois traços saindo do topo, um pé de alce — vale M no Younger long-branch (ᛘ maðr, U+16D8). Traço igual, valor diferente, code point diferente.",
  },
  {
    glifo: "ᛒ",
    valor: "B (berkanan)",
    armadilha:
      "Parece um B latino e vale B — mas no short-twig (ᛓ) os dois triângulos não fecham, e aí já não parece.",
  },
  {
    glifo: "ᛁ",
    valor: "I (isaz)",
    armadilha:
      "Uma haste vertical sozinha. O sól do short-twig (ᛌ, U+16CC) é um traço vertical curto e solto — confundir os dois é o erro mais barato de cometer.",
  },
  {
    glifo: "ᛊ",
    valor: "S (sowilo)",
    armadilha:
      "Ziguezague reto, um raio. O sól do Younger long-branch (ᛋ, U+16CB) é o mesmo raio, com outro code point.",
  },
  {
    glifo: "ᛏ",
    valor: "T (tiwaz)",
    armadilha:
      "Flecha para cima. No short-twig só metade da seta é desenhada (ᛐ, U+16D0), com a ponta para a esquerda.",
  },
  {
    glifo: "ᛇ",
    valor: "EI na bancada · ï na convenção",
    armadilha:
      "É a única linha do Elder em que a nossa transliteração diverge da convenção acadêmica. Divergência estética — a bancada dobra tudo para ASCII, como já faz com `th` (þ) e `ng` (ŋ).",
  },
];

export const RUNAS_NOTAS: string[] = [
  "A bancada já translitera os dois futharks; esta legenda é para o caminho inverso — do desenho para a letra.",
  "Elder Futhark tem 24 runas; o Younger tem 16, e existe em duas famílias de FORMA: long-branch (dinamarquesa) e short-twig (sueco-norueguesa). O mesmo valor pode ter dois desenhos.",
  "Runa desconhecida numa foto: procure primeiro pela HASTE. Quase toda runa tem uma vertical; o que muda é o que sai dela e de que lado.",
];

/**
 * NYCTOGRÁFICO — o alfabeto que Lewis Carroll inventou para escrever no escuro
 * (1891), com o ponto de canto fixo e traços variáveis.
 *
 * **A ressalva vem antes da tabela, de propósito:** o levantamento achou
 * representações divergentes circulando, e não foi possível fixar as 26 formas
 * contra uma fonte primária. O que está aqui é a REGRA DE CONSTRUÇÃO, que é o
 * que se reconhece numa foto — e é honesto dizer que a tabela glifo a glifo
 * ficou de fora por falta de fonte, em vez de preenchê-la por semelhança.
 */
export const NYCTOGRAFICO_NOTAS: string[] = [
  "Cada letra cabe num quadrado. Um PONTO num dos cantos marca a orientação — é ele que diz para que lado se lê, e é a primeira coisa a procurar na foto.",
  "Do ponto saem traços retos que percorrem os lados e as diagonais do quadrado. A letra é a combinação de quais traços existem.",
  "Foi desenhado para ser escrito no escuro, de memória, com um cartão perfurado — por isso todo glifo é feito de segmentos retos, sem curva.",
  "ATENÇÃO: circulam representações divergentes do nyctográfico, e esta bancada NÃO fixa uma tabela glifo a glifo — não achamos fonte primária que a sustente. Se a prova trouxer o alfabeto, use o dela.",
];

/**
 * CÓDIGO INTERNACIONAL DE SINAIS — o significado de cada bandeira içada sozinha.
 *
 * Fonte: *International Code of Signals*, Capítulo XI (significados de uma
 * letra). A redação oficial em português (Marinha do Brasil / DHN) **não foi
 * encontrada**; o que está abaixo é tradução do texto em inglês, e o selo vai
 * junto.
 *
 * **Ressalva de âncora, que é do item e não do dado:** a afirmação de que uma
 * prova do Challenge usou bandeiras existe em um lugar só do repositório
 * (`sources.ts:403`) e não foi corroborada. Isso enfraquece a prioridade do
 * item — **não** o veredito de que a capacidade não sirva: acervo não é censo, e
 * ausência nele não é evidência de ausência.
 */
export const ICS_SIGNIFICADOS: { letra: string; significado: string }[] = [
  {
    letra: "A",
    significado: "Tenho mergulhador na água; mantenha-se afastado e a baixa velocidade",
  },
  { letra: "B", significado: "Estou carregando, descarregando ou transportando carga perigosa" },
  { letra: "C", significado: "Sim (afirmativo)" },
  { letra: "D", significado: "Mantenha-se afastado; manobro com dificuldade" },
  { letra: "E", significado: "Estou guinando para boreste (direita)" },
  { letra: "F", significado: "Estou desgovernado; comunique-se comigo" },
  { letra: "G", significado: "Preciso de prático" },
  { letra: "H", significado: "Tenho prático a bordo" },
  { letra: "I", significado: "Estou guinando para bombordo (esquerda)" },
  { letra: "J", significado: "Tenho incêndio a bordo e carga perigosa; afaste-se" },
  { letra: "K", significado: "Desejo comunicar-me com você" },
  { letra: "L", significado: "Pare imediatamente o seu navio" },
  { letra: "M", significado: "Meu navio está parado, sem seguimento" },
  { letra: "N", significado: "Não (negativo)" },
  { letra: "O", significado: "Homem ao mar" },
  { letra: "P", significado: "No porto: todos a bordo, o navio vai suspender" },
  { letra: "Q", significado: "Meu navio está sadio e peço livre prática" },
  { letra: "R", significado: "não encontrado — sem significado de uma letra atribuído" },
  { letra: "S", significado: "Estou dando máquinas atrás" },
  { letra: "T", significado: "Afaste-se de mim; estou pescando com rede de arrasto em parelha" },
  { letra: "U", significado: "Você está se dirigindo para o perigo" },
  { letra: "V", significado: "Preciso de auxílio" },
  { letra: "W", significado: "Preciso de assistência médica" },
  { letra: "X", significado: "Suspenda a sua intenção e observe os meus sinais" },
  { letra: "Y", significado: "Estou garrando (a âncora está arrastando)" },
  { letra: "Z", significado: "Preciso de rebocador" },
];

export const ICS_NOTAS: string[] = [
  "Cada bandeira içada SOZINHA tem esse significado. Em grupo, o código muda: duas ou três letras formam mensagens de outra tabela.",
  "A redação oficial em português (Marinha do Brasil / DHN) não foi encontrada — o texto acima é tradução do Capítulo XI da publicação em inglês.",
  "O `R` não tem significado de uma letra atribuído na edição consultada.",
  "A âncora deste verbete no acervo é fraca: a menção a uma prova com bandeiras aparece num único lugar do repositório e não foi corroborada. Ele fica como consulta, não como aposta.",
];
