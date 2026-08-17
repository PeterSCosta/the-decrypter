/**
 * build-cid10.ts — gera a base da CID-10 (código → doença, capítulo e grupo) a
 * partir do CID10CSV.zip do DATASUS (V2008, a edição em vigor no Brasil).
 *
 * Saída: seed-data/cid10.json  ·  Run: pnpm build:cid10
 *
 * ── POR QUE O ZIP, E NÃO A PÁGINA ───────────────────────────────────────────
 * `cid10.htm` é um frameset de 2007 que serve a tabela em HTML paginado por
 * capítulo — raspá-lo seria reconstruir à mão o que o próprio DATASUS publica
 * pronto. O ZIP tem os mesmos dados em CSV normalizado, é o arquivo oficial de
 * descarga e cabe em 300 KB.
 *
 * ── AS DUAS SUTILEZAS DO ARQUIVO ────────────────────────────────────────────
 * 1. **O arquivo de subcategorias contém categorias.** 263 das 12.451 linhas de
 *    `SUBCATEGORIAS` têm código de 3 caracteres (`A09`): são as categorias que
 *    não se subdividem, repetidas ali. Sem deduplicar contra `CATEGORIAS`, elas
 *    entrariam duas vezes — e a segunda sobrescreveria a primeira em silêncio.
 * 2. **Capítulo e grupo vêm por FAIXA**, não por coluna: `A00`–`B99` é o
 *    capítulo I. A comparação é de string porque o código tem largura fixa
 *    (letra + 2 dígitos), então `"C00" <= "D48"` responde certo — o que não
 *    valeria se o formato variasse de tamanho.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const SRC = "http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "seed-data/cid10.json");

/**
 * Extrai um ZIP sem dependência nova, pelo DIRETÓRIO CENTRAL.
 *
 * Varrer por assinatura de cabeçalho local seria mais curto e estaria errado:
 * quando o bit 3 das flags está ligado, o tamanho comprimido só existe no
 * descritor DEPOIS dos dados, e o cabeçalho local traz zero. O diretório
 * central sempre tem os tamanhos verdadeiros.
 */
function descompactar(zip: Buffer): Map<string, Buffer> {
  // O EOCD fica no fim, atrás de um comentário de até 64 KB.
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0 && i > zip.length - 65558; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP sem EOCD — download truncado?");

  const total = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const saida = new Map<string, Buffer>();

  for (let n = 0; n < total; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("diretório central corrompido");
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const nomeLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const comentLen = zip.readUInt16LE(p + 32);
    const offset = zip.readUInt32LE(p + 42);
    // Nome de arquivo em CP437/ASCII: os nomes deste ZIP são só letras e hífen.
    const nome = zip.toString("latin1", p + 46, p + 46 + nomeLen);

    // O cabeçalho local tem campos de tamanho PRÓPRIOS (o `extra` costuma
    // divergir do que está no central), então relemos os dois daqui.
    const lNomeLen = zip.readUInt16LE(offset + 26);
    const lExtraLen = zip.readUInt16LE(offset + 28);
    const inicio = offset + 30 + lNomeLen + lExtraLen;
    const bruto = zip.subarray(inicio, inicio + comprimido);
    saida.set(nome, metodo === 0 ? bruto : inflateRawSync(bruto));

    p += 46 + nomeLen + extraLen + comentLen;
  }
  return saida;
}

/** CSV do DATASUS: separador `;`, latin-1, sem aspas e com `;` sobrando no fim. */
function lerCsv(bytes: Buffer): Record<string, string>[] {
  const texto = new TextDecoder("latin1").decode(bytes);
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cabec = linhas[0].split(";");
  return linhas.slice(1).map((l) => {
    const campos = l.split(";");
    const o: Record<string, string> = {};
    cabec.forEach((c, i) => {
      if (c) o[c] = (campos[i] ?? "").trim();
    });
    return o;
  });
}

/** Acha a faixa (capítulo, grupo) que contém uma categoria de 3 caracteres. */
function daFaixa<T extends { ini: string; fim: string }>(faixas: T[], cat: string): T | undefined {
  return faixas.find((f) => cat >= f.ini && cat <= f.fim);
}

async function main() {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`DATASUS HTTP ${res.status}`);
  const arquivos = descompactar(Buffer.from(await res.arrayBuffer()));

  const pega = (nome: string) => {
    const b = arquivos.get(nome);
    if (!b) throw new Error(`${nome} não veio no ZIP (achei: ${[...arquivos.keys()].join(", ")})`);
    return lerCsv(b);
  };

  const capitulos = pega("CID-10-CAPITULOS.CSV").map((r) => ({
    ini: r.CATINIC,
    fim: r.CATFIM,
    num: Number(r.NUMCAP),
    // "Capítulo I - Algumas doenças…" → "Algumas doenças…". O algarismo romano
    // já está em `num`, e repeti-lo em toda linha da tabela é ruído.
    desc: r.DESCRICAO.replace(/^Cap[ií]tulo\s+[IVXL]+\s*-\s*/i, ""),
  }));
  const grupos = pega("CID-10-GRUPOS.CSV").map((r) => ({
    ini: r.CATINIC,
    fim: r.CATFIM,
    desc: r.DESCRICAO,
  }));

  /** codigo normalizado (sem ponto) → linha. */
  const linhas = new Map<string, [string, string, number, number, string, string, number]>();

  const juntar = (codigo: string, r: Record<string, string>) => {
    const cat = codigo.slice(0, 3);
    const cap = daFaixa(capitulos, cat);
    const gru = daFaixa(grupos, cat);
    if (!cap) throw new Error(`${codigo} não caiu em nenhum capítulo`);
    linhas.set(codigo, [
      codigo,
      r.DESCRICAO,
      cap.num,
      gru ? grupos.indexOf(gru) : -1,
      // `+` (adaga) e `*` (asterisco) são a convenção de dupla classificação da
      // CID: a mesma doença sob a etiologia e sob a manifestação.
      r.CLASSIF ?? "",
      r.RESTRSEXO ?? "",
      // "N" no arquivo = NÃO pode ser causa básica de óbito.
      r.CAUSAOBITO === "N" ? 1 : 0,
    ]);
  };

  // Categorias primeiro; as subcategorias entram por cima porque trazem as
  // restrições (sexo, causa de óbito) que o arquivo de categorias não tem.
  for (const r of pega("CID-10-CATEGORIAS.CSV")) juntar(r.CAT, r);
  for (const r of pega("CID-10-SUBCATEGORIAS.CSV")) juntar(r.SUBCAT, r);

  const rows = [...linhas.values()].sort((a, b) => a[0].localeCompare(b[0]));
  const payload = {
    source: "DATASUS — CID-10 (V2008), CID10CSV.zip",
    url: SRC,
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    capitulos: capitulos.map((c) => [c.num, c.desc]),
    grupos: grupos.map((g) => g.desc),
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));

  const sub = rows.filter((r) => r[0].length === 4).length;
  console.log(
    `cid10: ${rows.length} (${rows.length - sub} categorias · ${sub} subcategorias) → ${OUT}`,
  );
}

main();
