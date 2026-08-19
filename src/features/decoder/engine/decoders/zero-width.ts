import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import { bytesToText, isUseful } from "../util";

/**
 * Caracteres invisíveis — o esconderijo que não aparece no texto.
 *
 * A versão anterior conhecia SETE pontos de código (U+200B–200F, U+2060,
 * U+FEFF). Todo o resto passava batido — e passar batido aqui é o pior defeito
 * que este decoder pode ter: a bancada respondia "não há nada escondido" e a
 * pessoa encerrava a linha de investigação. Agora são 406 pontos de código, em
 * quatro famílias que são coisas DIFERENTES e por isso saem em cards separados:
 *
 * 1. Bloco Tags (U+E0000–E007F, 128 pontos) — o esconderijo moderno. A faixa
 *    U+E0020–E007E mapeia 1:1 para ASCII 0x20–0x7E, então o texto se LÊ direto:
 *    não há convenção nossa no meio, é o mapeamento do padrão. Cabe uma frase
 *    inteira pendurada num único emoji ou numa única palavra.
 * 2. Seletores de variação (U+FE00–FE0F e U+E0100–E01EF = 16 + 240 = 256
 *    valores) — um BYTE por seletor; é o "variation selector smuggling" que
 *    apareceu em 2025.
 * 3. Bidi (U+202A–202E, U+2066–2069) — aqui o achado NÃO é "texto oculto", é
 *    "o que você lê não é o que está escrito": reordenam a tela sem mudar um
 *    byte sequer. Categoria própria, card próprio, redação própria.
 * 4. Largura zero clássico (ZWSP/ZWNJ e companhia, agora também U+00AD, U+180E
 *    e U+2061–2064) — o canal binário que já existia, preservado.
 *
 * ARMADILHAS MEDIDAS — é o que separa achado de ruído:
 * • ❤ com apresentação colorida é U+2764 U+FE0F, e ⚠ é U+26A0 U+FE0F: TODO
 *   emoji colorido carrega um seletor de variação. Seletor ISOLADO é
 *   apresentação, não payload — só corrida de 2 ou mais vira byte. O preço é
 *   assumido: um payload de um byte só é indistinguível de um emoji.
 * • A família U+1F468 U+200D U+1F469 U+200D U+1F467 tem dois ZWJ legítimos.
 *   ZWJ entre dois pictogramas não conta como suspeito.
 * • A bandeira da Escócia é U+1F3F4 seguido de 6 tags: bandeira de subdivisão
 *   É escrita em Tags. Sai rotulada como bandeira (0.5), não como contrabando.
 * • U+FEFF na posição 0 é BOM de arquivo salvo em UTF-8, não esconderijo.
 *
 * `forcedScore` por quanta evidência a GRAFIA carrega: Tags 0.97 (o mapeamento
 * é do padrão Unicode, não há palpite); seletores 0.95 quando os bytes fecham
 * UTF-8 válido, 0.7 quando só dá para mostrar hex; binário ZWSP/ZWNJ 0.95
 * (convenção nossa, porém consagrada); Bidi 0.9 (os pontos de código confirmam
 * o achado, e o achado é o texto lógico); leitura na tela 0.6 (aproximação — o
 * algoritmo Bidi completo não roda aqui); inventário 0.55/0.4 (inspeção).
 */

const ID = "zero-width";
const NAME = "Caracteres invisíveis (zero-width)";

// ---- alfabeto -------------------------------------------------------------

type Familia = "tag" | "seletor" | "bidi" | "marca" | "zw";

const TAG_INI = 0xe0000;
const TAG_FIM = 0xe007f;
const TAG_CANCEL = 0xe007f;
const TAG_IDIOMA = 0xe0001;
const TAG_ASCII_INI = 0xe0020;
const TAG_ASCII_FIM = 0xe007e;
const BANDEIRA_PRETA = 0x1f3f4;

const VS_BAIXO_INI = 0xfe00;
const VS_BAIXO_FIM = 0xfe0f;
const VS_ALTO_INI = 0xe0100;
const VS_ALTO_FIM = 0xe01ef;

const RLO = 0x202e;
const PDF = 0x202c;

/** Zero-width e afins: cada um é um bit em potencial e um esconderijo real. */
const ZW_SIMPLES = new Map<number, string>([
  [0x00ad, "hífen suave (SHY)"],
  [0x180e, "separador de vogal mongol"],
  [0x200b, "espaço de largura zero (ZWSP)"],
  [0x200c, "não-ligador de largura zero (ZWNJ)"],
  [0x200d, "ligador de largura zero (ZWJ)"],
  [0x2060, "juntador de palavras (WJ)"],
  [0x2061, "aplicação de função (invisível)"],
  [0x2062, "vezes invisível"],
  [0x2063, "separador invisível"],
  [0x2064, "mais invisível"],
  [0xfeff, "marca de ordem de bytes (BOM / ZWNBSP)"],
]);

/** Controles que REORDENAM a tela — outra categoria de achado. */
const BIDI = new Map<number, string>([
  [0x202a, "embutido da esquerda para a direita (LRE)"],
  [0x202b, "embutido da direita para a esquerda (RLE)"],
  [PDF, "fim do embutido/sobreposição (PDF)"],
  [0x202d, "sobreposição da esquerda para a direita (LRO)"],
  [RLO, "sobreposição da direita para a esquerda (RLO)"],
  [0x2066, "isolamento da esquerda para a direita (LRI)"],
  [0x2067, "isolamento da direita para a esquerda (RLI)"],
  [0x2068, "isolamento de primeiro forte (FSI)"],
  [0x2069, "fim do isolamento (PDI)"],
]);

/** Marcas de direção: fixam neutros, não viram letras. */
const MARCAS = new Map<number, string>([
  [0x200e, "marca da esquerda para a direita (LRM)"],
  [0x200f, "marca da direita para a esquerda (RLM)"],
]);

function familia(cp: number): Familia | null {
  if (cp >= TAG_INI && cp <= TAG_FIM) return "tag";
  if (cp >= VS_BAIXO_INI && cp <= VS_BAIXO_FIM) return "seletor";
  if (cp >= VS_ALTO_INI && cp <= VS_ALTO_FIM) return "seletor";
  if (BIDI.has(cp)) return "bidi";
  if (MARCAS.has(cp)) return "marca";
  if (ZW_SIMPLES.has(cp)) return "zw";
  return null;
}

const hex = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

function nomeDoPonto(cp: number): string {
  if (cp >= TAG_INI && cp <= TAG_FIM) {
    if (cp === TAG_CANCEL) return "TAG de cancelamento";
    if (cp === TAG_IDIOMA) return "TAG de idioma (obsoleta)";
    if (cp >= TAG_ASCII_INI && cp <= TAG_ASCII_FIM)
      return `tag “${String.fromCharCode(cp - TAG_INI)}”`;
    return "tag de controle";
  }
  if (cp >= VS_BAIXO_INI && cp <= VS_BAIXO_FIM)
    return `seletor de variação VS${cp - VS_BAIXO_INI + 1}`;
  if (cp >= VS_ALTO_INI && cp <= VS_ALTO_FIM)
    return `seletor de variação VS${cp - VS_ALTO_INI + 17}`;
  return BIDI.get(cp) ?? MARCAS.get(cp) ?? ZW_SIMPLES.get(cp) ?? "invisível desconhecido";
}

// ---- pictogramas (para poupar o ZWJ legítimo) -----------------------------

/**
 * Aproximação de Extended_Pictographic. Não vale a pena embarcar a tabela
 * inteira: o que precisamos é decidir se um ZWJ está costurando dois emojis
 * (legítimo) ou duas letras (suspeito), e as faixas abaixo cobrem o emoji que
 * chega colado de rede social.
 */
const FAIXAS_PICTO: readonly (readonly [number, number])[] = [
  [0x2190, 0x21ff],
  [0x231a, 0x23ff],
  [0x25a0, 0x25ff],
  [0x2600, 0x27bf],
  [0x2934, 0x2935],
  [0x2b00, 0x2bff],
  [0x3030, 0x303d],
  [0x3297, 0x3299],
  [0x1f000, 0x1faff],
];

const ehPicto = (cp: number) => FAIXAS_PICTO.some(([a, b]) => cp >= a && cp <= b);

/** Vizinho visível mais próximo, pulando seletores (que sempre grudam atrás). */
function vizinho(pontos: number[], i: number, passo: number): number | null {
  for (let j = i + passo; j >= 0 && j < pontos.length; j += passo) {
    if (familia(pontos[j]) === "seletor") continue;
    return pontos[j];
  }
  return null;
}

const zwjDeEmoji = (pontos: number[], i: number) => {
  const e = vizinho(pontos, i, -1);
  const d = vizinho(pontos, i, 1);
  return e !== null && d !== null && ehPicto(e) && ehPicto(d);
};

// ---- corridas -------------------------------------------------------------

interface Corrida {
  inicio: number;
  /** exclusivo */
  fim: number;
}

function corridasDe(pontos: number[], f: Familia): Corrida[] {
  const out: Corrida[] = [];
  let ini = -1;
  for (let i = 0; i <= pontos.length; i++) {
    const dentro = i < pontos.length && familia(pontos[i]) === f;
    if (dentro && ini < 0) ini = i;
    if (!dentro && ini >= 0) {
      out.push({ inicio: ini, fim: i });
      ini = -1;
    }
  }
  return out;
}

// ---- leitura 1: bloco Tags ------------------------------------------------

interface LeituraTags {
  /** Texto embutido fora de sequência de bandeira. */
  texto: string;
  /** Códigos de bandeira de subdivisão (uso legítimo do bloco). */
  bandeiras: string[];
  total: number;
}

function lerTags(pontos: number[]): LeituraTags {
  let texto = "";
  const bandeiras: string[] = [];
  let total = 0;

  for (const r of corridasDe(pontos, "tag")) {
    total += r.fim - r.inicio;
    let s = "";
    for (let i = r.inicio; i < r.fim; i++) {
      const cp = pontos[i];
      if (cp >= TAG_ASCII_INI && cp <= TAG_ASCII_FIM) s += String.fromCharCode(cp - TAG_INI);
    }
    // Bandeira de subdivisão: base U+1F3F4 + tags + TAG de cancelamento. É o
    // padrão da bandeira, não contrabando — não pode se misturar ao payload.
    const ehBandeira =
      r.inicio > 0 && pontos[r.inicio - 1] === BANDEIRA_PRETA && pontos[r.fim - 1] === TAG_CANCEL;
    if (ehBandeira) {
      if (s) bandeiras.push(s);
    } else {
      texto += s;
    }
  }

  return { texto, bandeiras, total };
}

// ---- leitura 2: seletores de variação -------------------------------------

const byteDeSeletor = (cp: number) =>
  cp <= VS_BAIXO_FIM ? cp - VS_BAIXO_INI : cp - VS_ALTO_INI + 16;

/**
 * Só corrida de 2+ seletores vira byte (1+ no modo uma-cifra-só). Um seletor
 * solto é apresentação de emoji e existe aos milhares em texto colado.
 */
function lerSeletores(pontos: number[], minimo: number): number[] {
  const bytes: number[] = [];
  for (const r of corridasDe(pontos, "seletor")) {
    if (r.fim - r.inicio < minimo) continue;
    for (let i = r.inicio; i < r.fim; i++) bytes.push(byteDeSeletor(pontos[i]));
  }
  return bytes;
}

const ehImprimivel = (s: string) =>
  [...s].every((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return cp === 0x09 || cp === 0x0a || cp === 0x0d || (cp >= 0x20 && cp !== 0x7f);
  });

const emHex = (bytes: number[]) =>
  bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

// ---- leitura 3: Bidi ------------------------------------------------------

/**
 * Aproximação da ordem na TELA. Só o RLO (U+202E) força cada caractere a RTL e
 * portanto inverte texto latino; LRE/RLE e os isolamentos mudam a resolução dos
 * NEUTROS (pontuação, dígitos), não viram as letras — fingir que virariam seria
 * inventar resultado. O algoritmo Bidi completo não roda aqui.
 */
function leituraNaTela(pontos: number[]): string {
  let fora = "";
  let dentro: string | null = null;
  const fechar = () => {
    if (dentro !== null) fora += [...dentro].reverse().join("");
    dentro = null;
  };

  for (const cp of pontos) {
    if (cp === RLO) {
      fechar();
      dentro = "";
      continue;
    }
    if (cp === PDF) {
      fechar();
      continue;
    }
    if (familia(cp) !== null) continue;
    const ch = String.fromCodePoint(cp);
    if (dentro === null) fora += ch;
    else dentro += ch;
  }
  fechar();
  return fora;
}

// ---- leitura 4: binário ZWSP/ZWNJ (o que já funcionava) -------------------

/**
 * Convenção clássica: ZWSP (U+200B) = 0, ZWNJ (U+200C) = 1. Exige os DOIS
 * símbolos presentes — um fluxo de um símbolo só não carrega informação
 * nenhuma, e oito bits iguais dão 0x00 ou 0xFF, que não são texto.
 */
function lerBinario(pontos: number[]): { output: string; notes: string; score: number } | null {
  let bits = "";
  let zeros = 0;
  let uns = 0;
  for (const cp of pontos) {
    if (cp === 0x200b) {
      bits += "0";
      zeros++;
    } else if (cp === 0x200c) {
      bits += "1";
      uns++;
    }
  }
  if (bits.length < 8 || zeros === 0 || uns === 0) return null;

  let out = "";
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out += String.fromCharCode(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  const notes = `ZWSP = 0, ZWNJ = 1 — ${bits.length} bits lidos.`;
  if (/^[\x20-\x7e\s]+$/.test(out)) {
    return { output: out, notes: `texto oculto no canal binário. ${notes}`, score: 0.95 };
  }
  return { output: `bits ocultos: ${bits}`, notes, score: 0.7 };
}

// ---- inventário -----------------------------------------------------------

const EXPLICACAO: Record<Familia, string> = {
  tag: "Tags: a faixa U+E0020–E007E é ASCII 1:1 — é onde se embute texto inteiro dentro de um emoji ou de uma palavra.",
  seletor:
    "Seletores de variação: 16 + 240 = 256 valores, ou seja um byte por seletor. Um seletor isolado, porém, é só apresentação de emoji.",
  bidi: "Bidi: não escondem texto — reordenam o que aparece na tela sem mudar um byte. O que você lê não é o que está escrito.",
  marca:
    "Marcas de direção (LRM/RLM): fixam a direção dos neutros; sozinhas não viram as letras de lugar.",
  zw: "Largura zero: o canal binário clássico (ZWSP = 0, ZWNJ = 1) e os grãos de areia que sobrevivem a qualquer cópia.",
};

const ORDEM_FAMILIA: Familia[] = ["tag", "seletor", "bidi", "marca", "zw"];

function inventario(
  pontos: number[],
  suspeitos: boolean[],
): { linhas: string; familias: Set<Familia>; total: number } {
  const familias = new Set<Familia>();
  const porPonto = new Map<number, number>();
  let tags = 0;
  let seletores = 0;
  let total = 0;

  for (let i = 0; i < pontos.length; i++) {
    if (!suspeitos[i]) continue;
    const cp = pontos[i];
    const f = familia(cp);
    if (f === null) continue;
    familias.add(f);
    total++;
    if (f === "tag") tags++;
    else if (f === "seletor") seletores++;
    else porPonto.set(cp, (porPonto.get(cp) ?? 0) + 1);
  }

  const linhas: { ordem: number; rotulo: string; n: number }[] = [];
  if (tags > 0) linhas.push({ ordem: TAG_INI, rotulo: "bloco Tags (U+E0000–E007F)", n: tags });
  if (seletores > 0)
    linhas.push({
      ordem: VS_BAIXO_INI,
      rotulo: "seletores de variação (U+FE00–FE0F, U+E0100–E01EF)",
      n: seletores,
    });
  for (const [cp, n] of porPonto)
    linhas.push({ ordem: cp, rotulo: `${hex(cp)}  ${nomeDoPonto(cp)}`, n });
  linhas.sort((a, b) => a.ordem - b.ordem);

  const largura = Math.max(...linhas.map((l) => l.rotulo.length));
  return {
    linhas: linhas.map((l) => `${l.rotulo.padEnd(largura)}  ×${l.n}`).join("\n"),
    familias,
    total,
  };
}

// ---- decoder --------------------------------------------------------------

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "encoding",
  decode(input, ctx) {
    const solo = ctx.only === ID;
    const pontos = [...input].map((c) => c.codePointAt(0) ?? 0);

    // Corrida de seletores por índice: define o que é payload e o que é emoji.
    const tamSeletor = new Array<number>(pontos.length).fill(0);
    for (const r of corridasDe(pontos, "seletor")) {
      for (let i = r.inicio; i < r.fim; i++) tamSeletor[i] = r.fim - r.inicio;
    }

    const suspeitos = pontos.map((cp, i) => {
      const f = familia(cp);
      if (f === null) return false;
      // No modo uma-cifra-só o pedido é explícito ("varra ISTO"), então nenhuma
      // isenção se aplica: mostra-se tudo o que existe, inclusive o legítimo.
      if (solo) return true;
      if (f === "seletor") return tamSeletor[i] >= 2;
      if (cp === 0x200d) return !zwjDeEmoji(pontos, i);
      // BOM na posição 0 é o arquivo dizendo que é UTF-8, não esconderijo.
      if (cp === 0xfeff && i === 0) return false;
      return true;
    });

    const algo = suspeitos.some(Boolean);
    if (!algo && !solo) return [];

    const base = { decoderId: ID, decoderName: NAME, category: "encoding" as const };
    const out: DecodeCandidate[] = [];

    if (!algo) {
      // Modo uma-cifra-só: a AUSÊNCIA é a resposta, e ela precisa ser dita.
      // Calar aqui é justamente o falso negativo que este decoder existe para
      // não cometer.
      return [
        {
          ...base,
          label: "varredura",
          output:
            "Nenhum caractere invisível suspeito nesta entrada (406 pontos de código verificados: bloco Tags, seletores de variação, controles Bidi e largura zero).",
          notes: "inspeção, não decodificação",
          forcedScore: 0.3,
          chainValue: "",
        },
      ];
    }

    const limpo = pontos
      .filter((cp) => familia(cp) === null)
      .map((cp) => String.fromCodePoint(cp))
      .join("");

    // ---- 1. texto oculto em Tags ------------------------------------------
    const tags = lerTags(pontos);
    if (tags.texto && isUseful(tags.texto, input)) {
      out.push({
        ...base,
        label: "texto oculto em Tags",
        output: tags.texto,
        notes: `${tags.total} caractere(s) do bloco Tags. A faixa U+E0020–E007E mapeia 1:1 para ASCII 0x20–0x7E: isto É o texto embutido, não é palpite.`,
        forcedScore: 0.97,
        chainValue: tags.texto,
      });
    }
    for (const b of tags.bandeiras) {
      out.push({
        ...base,
        label: "bandeira de subdivisão — o código está nas Tags",
        output: b,
        notes:
          "Sequência U+1F3F4 + tags + TAG de cancelamento: a bandeira não é um desenho, é o código ISO 3166-2 escrito em Tags. Uso legítimo do bloco, não contrabando.",
        forcedScore: 0.5,
        chainValue: b,
      });
    }

    // ---- 2. byte a byte em seletores de variação --------------------------
    const bytes = lerSeletores(pontos, solo ? 1 : 2);
    if (bytes.length > 0) {
      const texto = bytesToText(Uint8Array.from(bytes));
      const notaBase = `${bytes.length} seletor(es) em corrida → 1 byte cada (VS1–VS16 = 0x00–0x0F, VS17–VS256 = 0x10–0xFF).`;
      if (texto && ehImprimivel(texto) && isUseful(texto, input)) {
        out.push({
          ...base,
          label: "byte a byte em seletores de variação",
          output: texto,
          notes: `${notaBase} Os bytes fecham UTF-8 válido.`,
          forcedScore: 0.95,
          chainValue: texto,
        });
      } else {
        out.push({
          ...base,
          label: "byte a byte em seletores de variação",
          output: `bytes ocultos: ${emHex(bytes)}`,
          notes: `${notaBase} Os bytes não fecham texto UTF-8 — vão em hex para você seguir de outro jeito.`,
          forcedScore: 0.7,
          chainValue: emHex(bytes),
        });
      }
    }

    // ---- 3. reordenação Bidi ----------------------------------------------
    const controles = [...new Set(pontos.filter((cp) => familia(cp) === "bidi"))];
    if (controles.length > 0) {
      const lista = controles.sort((a, b) => a - b).map((cp) => `${hex(cp)} ${nomeDoPonto(cp)}`);
      if (isUseful(limpo, input)) {
        out.push({
          ...base,
          label: "reordenação Bidi — a tela mente",
          output: limpo,
          notes: `Controles de direção presentes: ${lista.join("; ")}. Eles não escondem texto: reordenam o que APARECE, sem mudar um byte. Acima está o texto realmente escrito.`,
          forcedScore: 0.9,
          chainValue: limpo,
        });
      }
      const tela = leituraNaTela(pontos);
      if (pontos.includes(RLO) && tela !== limpo && isUseful(tela, input)) {
        out.push({
          ...base,
          label: "leitura na tela (aproximação do RLO)",
          output: tela,
          notes:
            "Só o RLO (U+202E) força cada caractere a RTL e inverte texto latino; LRE/RLE e isolamentos mexem na resolução dos neutros, não viram letras. Aproximação — o algoritmo Bidi completo não roda aqui.",
          forcedScore: 0.6,
          chainValue: tela,
        });
      }
    }

    // ---- 4. canal binário clássico ----------------------------------------
    const bin = lerBinario(pontos);
    if (bin && isUseful(bin.output, input)) {
      out.push({
        ...base,
        label: "canal binário em largura zero",
        output: bin.output,
        notes: bin.notes,
        forcedScore: bin.score,
        chainValue: bin.output,
      });
    }

    // ---- 5. inventário (sai sempre) ---------------------------------------
    const inv = inventario(pontos, suspeitos);
    const explicacoes = ORDEM_FAMILIA.filter((f) => inv.familias.has(f)).map((f) => EXPLICACAO[f]);
    const semInvisiveis = limpo.length <= 200 ? `\n\nSem os invisíveis: «${limpo}»` : "";
    out.push({
      ...base,
      label: "inventário dos invisíveis",
      output: `${inv.total} caractere(s) invisível(is) suspeito(s):\n\n${inv.linhas}\n\n${explicacoes.join("\n")}${semInvisiveis}`,
      notes: "inspeção, não decodificação",
      // A grafia de um ZWSP/tag/seletor/Bidi é assinatura por si só; hífen
      // suave, BOM e WJ aparecem em texto colado honesto e valem menos.
      forcedScore:
        inv.familias.has("tag") || inv.familias.has("seletor") || inv.familias.has("bidi")
          ? 0.55
          : pontos.some((cp) => cp === 0x200b || cp === 0x200c)
            ? 0.55
            : 0.4,
      chainValue: limpo,
    });

    return out;
  },
});
