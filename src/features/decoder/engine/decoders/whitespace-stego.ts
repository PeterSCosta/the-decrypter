import { letterFromRowBits } from "@/features/reference/braille";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import { isUseful } from "../util";

/**
 * Inspetor de espaços em branco: quando o recado não está nas palavras, está no
 * espaçamento entre elas — espaços duplos, tabulações, espaços sobrando no fim
 * da linha.
 *
 * Isto é um INSPETOR, não um decodificador que "resolve" a prova. O caso do
 * acervo (GIA-41 "Os olhos enganam") esconde quatro células Braille no perfil de
 * espaços duplos das LINHAS RENDERIZADAS, e o `.docx` original só tem 7
 * parágrafos (perfil 0,3,1,1,3,0,0) contra as 12 fileiras que quatro células
 * exigem: o mapeamento linha→fileira depende da largura da página e some em
 * qualquer refluxo. Ou seja, é IRRECUPERÁVEL a partir do arquivo. O que dá para
 * entregar com honestidade é o perfil linha a linha, quatro leituras plausíveis
 * (cada uma também de trás pra frente, como o gabarito manda) e o aviso
 * operacional que vale mais que o decoder: cole preservando as quebras.
 */

const ID = "whitespace-stego";
const NAME = "Espaços escondidos (whitespace)";

const AVISO =
  "O sinal é POSICIONAL na linha: cole preservando as quebras originais — copiar de PDF/Word reflowa e apaga o sinal.";

interface PerfilLinha {
  /** Corridas de 2+ espaços no MIOLO da linha (o sinal do GIA-41). */
  duplos: number;
  tabs: number;
  /** Espaços sobrando no fim da linha — invisíveis até num editor. */
  fim: number;
  /** Um bit por separador do miolo: contém tabulação = 1, só espaço = 0. */
  separadores: string;
}

function perfilar(input: string): PerfilLinha[] {
  const linhas = input.replace(/\r\n?/g, "\n").split("\n");
  // Linhas vazias no fim são artefato da colagem, não zeros do canal. As do
  // meio ficam: um parágrafo em branco É um zero e conta.
  while (linhas.length > 0 && linhas[linhas.length - 1].trim() === "") linhas.pop();

  return linhas.map((linha) => {
    const fim = (/[ \t]+$/.exec(linha)?.[0] ?? "").length;
    const miolo = linha.replace(/[ \t]+$/, "").replace(/^[ \t]+/, "");
    const runs = miolo.match(/[ \t]+/g) ?? [];
    return {
      duplos: (miolo.match(/ {2,}/g) ?? []).length,
      tabs: (miolo.match(/\t/g) ?? []).length,
      fim,
      separadores: runs.map((r) => (r.includes("\t") ? "1" : "0")).join(""),
    };
  });
}

// ---- bits → texto ---------------------------------------------------------

/** 8 bits por caractere: a convenção clássica do stego de espaços ("snow"). */
function comoAscii(bits: string): string | null {
  if (bits.length < 16 || bits.length % 8 !== 0) return null;
  let out = "";
  for (let i = 0; i < bits.length; i += 8) {
    const code = Number.parseInt(bits.slice(i, i + 8), 2);
    if (code < 32 || code > 126) return null;
    out += String.fromCharCode(code);
  }
  return /[a-z]/i.test(out) ? out : null;
}

/** 6 bits por célula Braille (3 fileiras × 2 colunas) — a convenção do GIA-41. */
function comoBraille(bits: string): string | null {
  if (bits.length < 12 || bits.length % 6 !== 0) return null;
  let out = "";
  for (let i = 0; i < bits.length; i += 6) {
    const letra = letterFromRowBits(bits.slice(i, i + 6));
    // Uma célula que não é letra derruba a leitura inteira: melhor não emitir
    // nada do que "ac?t" com um buraco no meio da palavra.
    if (letra === null) return null;
    out += letra;
  }
  return out.trim() ? out : null;
}

/** 5 bits por letra (A1Z26), para quando o texto é curto demais para bytes. */
function comoA1z26(bits: string): string | null {
  if (bits.length < 10 || bits.length % 5 !== 0) return null;
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const n = Number.parseInt(bits.slice(i, i + 5), 2);
    if (n < 1 || n > 26) return null;
    out += String.fromCharCode(96 + n);
  }
  return out;
}

interface Leitura {
  label: string;
  bits: string;
  /** Leitura por fileiras: só faz sentido agrupada em célula Braille. */
  braillePuro?: boolean;
}

function bitsParaTexto(l: Leitura): { texto: string; grupo: string } | null {
  if (l.braillePuro) {
    const texto = comoBraille(l.bits);
    return texto ? { texto, grupo: "Braille" } : null;
  }
  // Ordem deliberada: ASCII primeiro porque é a convenção do stego clássico;
  // Braille e A1Z26 só entram quando o fluxo é curto demais para virar bytes.
  const ascii = comoAscii(l.bits);
  if (ascii) return { texto: ascii, grupo: "ASCII" };
  const braille = comoBraille(l.bits);
  if (braille) return { texto: braille, grupo: "Braille" };
  const a1z26 = comoA1z26(l.bits);
  return a1z26 ? { texto: a1z26, grupo: "A1Z26" } : null;
}

// ---- as quatro leituras ---------------------------------------------------

function leituras(perfil: PerfilLinha[], temTab: boolean, temFim: boolean): Leitura[] {
  const out: Leitura[] = [];

  // 1 bit por linha: a linha está marcada ou não está.
  out.push({
    label: "1 bit por linha (marcada = 1)",
    bits: perfil.map((p) => (p.duplos + p.tabs > 0 ? "1" : "0")).join(""),
  });

  // 2 bits por linha: a contagem 0..3 vira uma fileira da célula Braille
  // (bit alto = ponto esquerdo). Qual contagem acende qual ponto é convenção
  // NOSSA — o acervo não preserva essa parte, ver o cabeçalho.
  out.push({
    label: "2 bits por linha (contagem → fileira Braille)",
    bits: perfil
      .map((p) =>
        Math.min(p.duplos + p.tabs, 3)
          .toString(2)
          .padStart(2, "0"),
      )
      .join(""),
    braillePuro: true,
  });

  // Espaço = 0, tabulação = 1, um bit por separador entre palavras. Sem
  // nenhuma tabulação não existe canal aqui — e emitir um fluxo de zeros seria
  // ruído com cara de resultado.
  if (temTab) {
    out.push({
      label: "espaço = 0, tabulação = 1",
      bits: perfil.map((p) => p.separadores).join(""),
    });
  }

  // Espaços à direita: invisíveis, sobrevivem a mais colagens que os do miolo.
  if (temFim) {
    out.push({
      label: "espaços à direita da linha",
      bits: perfil.map((p) => (p.fim > 0 ? "1" : "0")).join(""),
    });
  }

  return out;
}

// ---- cartão de inspeção ---------------------------------------------------

/** Quantas linhas o perfil mostra antes de resumir — o card tem que caber no celular. */
const MAX_LINHAS = 40;

function cartaoPerfil(perfil: PerfilLinha[]): { output: string; chain: string } {
  const duplos = perfil.reduce((a, p) => a + p.duplos, 0);
  const tabs = perfil.reduce((a, p) => a + p.tabs, 0);
  const fim = perfil.reduce((a, p) => a + p.fim, 0);

  const largura = String(perfil.length).length;
  const linhas = perfil
    .slice(0, MAX_LINHAS)
    .map((p, i) => {
      const n = String(i + 1).padStart(largura, "0");
      return `L${n}  duplos ${p.duplos}  tab ${p.tabs}  fim ${p.fim}`;
    })
    .join("\n");
  const resto = perfil.length > MAX_LINHAS ? `\n… mais ${perfil.length - MAX_LINHAS} linha(s)` : "";

  const contagens = perfil.map((p) => p.duplos + p.tabs);
  const chain = contagens.every((c) => c < 10) ? contagens.join("") : contagens.join(" ");

  const cabecalho = `Perfil de espaços — ${perfil.length} linha(s), ${duplos} espaço(s) duplo(s), ${tabs} tabulação(ões), ${fim} espaço(s) à direita.`;

  return {
    output: `${cabecalho}\n\n${linhas}${resto}\n\nSequência: ${chain}\n\n${AVISO}`,
    chain,
  };
}

// ---- decoder --------------------------------------------------------------

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input, ctx) {
    const solo = ctx.only === ID;
    const perfil = perfilar(input);
    const duplos = perfil.reduce((a, p) => a + p.duplos, 0);
    const tabs = perfil.reduce((a, p) => a + p.tabs, 0);
    const fim = perfil.reduce((a, p) => a + p.fim, 0);

    // Gate por anomalia. Texto normal não tem espaço duplo sobrando; dois já são
    // sinal. Mas um perfil CONSTANTE não carrega informação nenhuma (é hábito de
    // digitação, tipo dois espaços depois de todo ponto), então também barra.
    if (!solo) {
      if (perfil.length < 3) return [];
      if (duplos + tabs < 2) return [];
      const marcas = new Set(perfil.map((p) => `${p.duplos}.${p.tabs}.${p.fim}`));
      if (marcas.size < 2) return [];
    }
    if (perfil.length === 0) return [];

    const base = { decoderId: ID, decoderName: NAME, category: "transform" as const };
    const out: DecodeCandidate[] = [];

    for (const leitura of leituras(perfil, tabs > 0, fim > 0)) {
      const lido = bitsParaTexto(leitura);
      if (!lido) continue;
      // As duas direções entram na corrida sem forcedScore: o gabarito do GIA-41
      // termina "de trás pra frente", e é o scorer quem decide qual virou palavra.
      const invertido = [...lido.texto].reverse().join("");
      for (const [texto, sufixo] of [
        [lido.texto, ""],
        [invertido, " · de trás pra frente"],
      ]) {
        if (!isUseful(texto, input)) continue;
        out.push({
          ...base,
          label: `${leitura.label} → ${lido.grupo}${sufixo}`,
          output: texto,
          notes: `${leitura.bits.length} bits lidos de ${perfil.length} linha(s)`,
          chainValue: texto,
        });
      }
    }

    // O cartão de inspeção sai sempre: mesmo (e principalmente) quando nenhuma
    // leitura fecha, o perfil linha a linha é o que a equipe precisa ver.
    const cartao = cartaoPerfil(perfil);
    out.push({
      ...base,
      label: "perfil linha a linha",
      output: cartao.output,
      notes: "inspeção, não decodificação",
      forcedScore: 0.4,
      chainValue: cartao.chain,
    });

    return out;
  },
});
