/**
 * build-words.ts — gera listas de palavras (pt + en) para o resolvedor de
 * anagramas. Saída: public/data/words-pt.txt e words-en.txt (uma por linha).
 *
 *  - pt: https://github.com/pythonprobr/palavras  (override: $WORDS_PT)
 *  - en: /usr/share/dict/words                    (override: $WORDS_EN)
 *
 * Run: pnpm build:words   (en exige o dicionário local; o pt é baixado)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

async function main() {
  const pt = await getPt();
  writeFileSync(resolve(ROOT, "public/data/words-pt.txt"), pt.join("\n"));
  const en = getEn();
  if (en.length) writeFileSync(resolve(ROOT, "public/data/words-en.txt"), en.join("\n"));
  console.log(`words: pt ${pt.length}, en ${en.length || "(mantido)"}`);
}

main();
