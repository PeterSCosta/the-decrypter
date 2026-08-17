/**
 * build-words.ts — gera o vocabulário do app. Duas saídas, para dois usos que
 * não são o mesmo:
 *
 *  - `public/data/words-{pt,en}.txt` — as listas cruas, **com acento**, uma
 *    palavra por linha. A aba Anagramas precisa iterar tudo e mostrar a grafia
 *    original, então não há como compactá-las.
 *  - `public/data/words-index.bin` — o índice compactado que o **score** usa. Só
 *    pertinência, então guarda a forma já dobrada (sem acento, ≥4 letras) e nem
 *    é parseado no navegador: consulta por bissecção direto nos bytes.
 *
 * O índice sai de `buildVocabulary`, a mesma função que o runtime usava para
 * montar o `Set` — é isso que garante que a dobra do build e a do score não
 * divirjam em silêncio.
 *
 *  - pt: https://github.com/pythonprobr/palavras  (override: $WORDS_PT)
 *  - en: /usr/share/dict/words                    (override: $WORDS_EN)
 *
 * Run: pnpm build:words   (en exige o dicionário local; o pt é baixado)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUZZLE_WORDS, buildVocabulary } from "../src/features/decoder/engine/word-rules";
import { encodeWordIndex } from "../src/features/decoder/engine/words-packed";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fold = (s: string) =>
  [...s.normalize("NFD")]
    .filter((c) => {
      const x = c.codePointAt(0) ?? 0;
      return x < 0x300 || x > 0x36f;
    })
    .join("")
    .toLowerCase();

function clean(lines: string[], lowerOnly: boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const w = raw.trim();
    if (!w) continue;
    if (lowerOnly && w !== w.toLowerCase()) continue; // descarta nomes próprios (en)
    const disp = w.toLowerCase();
    // 2–15 letras. O fold roda ANTES da medida, então acento não conta letra:
    // "ação" mede 4, igual à chave do anagrama (solve.ts faz a mesma dobra).
    if (!/^[a-z]{2,15}$/.test(fold(disp))) continue;
    if (!seen.has(disp)) {
      seen.add(disp);
      out.push(disp);
    }
  }
  return out;
}

async function getPt(): Promise<string[]> {
  const local = process.env.WORDS_PT;
  let text: string;
  if (local && existsSync(local)) {
    text = readFileSync(local, "utf8");
  } else {
    const res = await fetch(
      "https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt",
    );
    if (!res.ok) throw new Error(`fetch pt HTTP ${res.status}`);
    text = await res.text();
  }
  return clean(text.split(/\r?\n/), false);
}

function getEn(): string[] {
  const path = process.env.WORDS_EN || "/usr/share/dict/words";
  if (!existsSync(path)) {
    console.warn(
      `⚠ dicionário en não encontrado em ${path} — pulando (mantém o words-en.txt versionado).`,
    );
    return [];
  }
  return clean(readFileSync(path, "utf8").split(/\r?\n/), true);
}

/** Lê a lista já versionada — o índice precisa dela mesmo quando o build a pula. */
function readVersionada(nome: string): string[] {
  const path = resolve(ROOT, `public/data/${nome}`);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean);
}

async function main() {
  const pt = await getPt();
  writeFileSync(resolve(ROOT, "public/data/words-pt.txt"), pt.join("\n"));
  const en = getEn();
  if (en.length) writeFileSync(resolve(ROOT, "public/data/words-en.txt"), en.join("\n"));

  // Sem o dicionário local o `en` vem vazio e a lista versionada é mantida —
  // então o índice tem de ler do disco, senão sairia só com o português.
  const enFinal = en.length ? en : readVersionada("words-en.txt");
  const vocab = buildVocabulary([pt, enFinal, PUZZLE_WORDS]);
  const index = encodeWordIndex(vocab);
  writeFileSync(resolve(ROOT, "public/data/words-index.bin"), index);

  console.log(`words: pt ${pt.length}, en ${en.length || `${enFinal.length} (mantido)`}`);
  console.log(`índice: ${vocab.length} palavras, ${(index.length / 1024 / 1024).toFixed(2)} MB`);
}

main();
