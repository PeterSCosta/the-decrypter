import { analisarContainer } from "@/features/audio/container";
import type { Identidade } from "./identidade";

/**
 * A ficha do arquivo — os metadados, e os detalhes que ninguém olha.
 *
 * A "primeira olhada" responde "tem algo estranho aqui?". Esta responde a
 * pergunta anterior, e igualmente importante: **o que exatamente é este
 * arquivo?** Dimensão, taxa, duração, tags, data de modificação, hash.
 *
 * Duas coisas aqui costumam resolver prova sozinhas: uma senha esquecida num
 * comentário de tag, e a **data de modificação**, que é o único metadado de
 * sistema que o navegador entrega e que quase todo mundo esquece de limpar.
 */

export interface Campo {
  rotulo: string;
  valor: string;
  /** Quando o campo merece o olho — divergência, valor fora do comum. */
  atencao?: string;
}

export interface Ficha {
  /** Grupos na ordem em que devem aparecer. */
  grupos: { titulo: string; campos: Campo[] }[];
  /** Texto encontrado em tags e chunks, separado do texto solto do binário. */
  tags: { fonte: string; texto: string }[];
}

const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32le = (b: Uint8Array, o: number) =>
  b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);
const u32be = (b: Uint8Array, o: number) =>
  b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);

const bytes = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(2)} MB`
    : n >= 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${n} bytes`;

/** Dimensão declarada no cabeçalho — que pode divergir do que a imagem desenha. */
function dimensaoDeclarada(b: Uint8Array, tipo: string | null): { w: number; h: number } | null {
  if (tipo === "PNG" && b.length > 24) return { w: u32be(b, 16), h: u32be(b, 20) };
  if (tipo === "GIF" && b.length > 10) return { w: u16le(b, 6), h: u16le(b, 8) };
  if (tipo === "BMP" && b.length > 26) return { w: u32le(b, 18), h: u32le(b, 22) };
  if (tipo === "JPEG") {
    // Percorre os segmentos até um SOF (C0-CF, exceto C4/C8/CC).
    let p = 2;
    while (p + 9 < b.length) {
      if (b[p] !== 0xff) break;
      const m = b[p + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: (b[p + 5] << 8) | b[p + 6], w: (b[p + 7] << 8) | b[p + 8] };
      }
      p += 2 + ((b[p + 2] << 8) | b[p + 3]);
    }
  }
  return null;
}

export function montarFicha(
  b: Uint8Array,
  nome: string,
  identidade: Identidade,
  modificadoEm: number | null,
): Ficha {
  const grupos: Ficha["grupos"] = [];

  // ── o arquivo ────────────────────────────────────────────────────────────
  const doArquivo: Campo[] = [
    { rotulo: "Nome", valor: nome },
    { rotulo: "Tamanho", valor: `${bytes(b.length)} (${b.length.toLocaleString("pt-BR")} bytes)` },
    { rotulo: "Tipo real", valor: identidade.tipo ?? "não reconhecido" },
    {
      rotulo: "Extensão",
      valor: identidade.extensao ? `.${identidade.extensao}` : "(sem extensão)",
      atencao: identidade.extensaoBate ? undefined : "não corresponde ao conteúdo",
    },
  ];
  if (identidade.mimeDeclarado) {
    doArquivo.push({ rotulo: "MIME declarado", valor: identidade.mimeDeclarado });
  }
  if (modificadoEm) {
    // Único metadado de sistema que o navegador entrega — e quase ninguém limpa.
    doArquivo.push({
      rotulo: "Modificado em",
      valor: new Date(modificadoEm).toLocaleString("pt-BR"),
    });
  }
  // Nome com caractere invisível é disfarce, e passa despercebido por definição.
  const invisiveis = [...nome].filter((c) => {
    const n = c.codePointAt(0) ?? 0;
    return (
      n === 0x200b || n === 0x200c || n === 0x200d || n === 0xfeff || (n >= 0x202a && n <= 0x202e)
    );
  });
  if (invisiveis.length) {
    doArquivo.push({
      rotulo: "Nome do arquivo",
      valor: `${invisiveis.length} caractere(s) invisível(is)`,
      atencao: "zero-width ou marca de direção no nome — é esconderijo conhecido",
    });
  }
  grupos.push({ titulo: "O arquivo", campos: doArquivo });

  // ── por formato ──────────────────────────────────────────────────────────
  const ficha = analisarContainer(b, nome);

  if (identidade.familia === "imagem") {
    const d = dimensaoDeclarada(b, identidade.tipo);
    if (d) {
      grupos.push({
        titulo: "Imagem",
        campos: [{ rotulo: "Dimensão declarada", valor: `${d.w} × ${d.h} px` }],
      });
    }
  }

  if (identidade.tipo === "WAV" && ficha.taxaDeclarada) {
    const bitsPorAmostra = ficha.bitsPorAmostra ?? 16;
    const canais = ficha.canaisDeclarados ?? 1;
    const dados = ficha.fimDeclarado ? ficha.fimDeclarado - 44 : b.length - 44;
    const segundos = dados / (ficha.taxaDeclarada * canais * (bitsPorAmostra / 8));
    grupos.push({
      titulo: "Áudio (do cabeçalho)",
      campos: [
        { rotulo: "Taxa", valor: `${ficha.taxaDeclarada.toLocaleString("pt-BR")} Hz` },
        {
          rotulo: "Canais",
          valor: canais === 1 ? "mono" : canais === 2 ? "estéreo" : String(canais),
        },
        { rotulo: "Bits por amostra", valor: String(bitsPorAmostra) },
        { rotulo: "Duração", valor: `${segundos.toFixed(2)} s` },
      ],
    });
  }

  // ── chunks e estrutura ───────────────────────────────────────────────────
  if (ficha.chunks.length) {
    grupos.push({
      titulo: "Estrutura interna",
      campos: ficha.chunks.map((c) => ({
        rotulo: `chunk "${c.id}"`,
        valor: `${bytes(c.tamanho)} no byte ${c.offset.toLocaleString("pt-BR")}`,
        atencao: c.conhecido ? undefined : "não faz parte do formato padrão",
      })),
    });
  }

  return { grupos, tags: ficha.textos };
}

/**
 * Hashes do arquivo, para comparar com outro ou procurar na internet.
 *
 * `crypto.subtle` é do navegador e não custa bundle nenhum. SHA-256 é o que se
 * usa hoje; SHA-1 entra porque muita base pública ainda indexa por ele.
 */
export async function calcularHashes(b: Uint8Array): Promise<{ sha1: string; sha256: string }> {
  const hex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  const dados = b.slice().buffer as ArrayBuffer;
  const [s1, s256] = await Promise.all([
    crypto.subtle.digest("SHA-1", dados),
    crypto.subtle.digest("SHA-256", dados),
  ]);
  return { sha1: hex(s1), sha256: hex(s256) };
}
