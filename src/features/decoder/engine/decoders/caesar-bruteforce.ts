import { defineDecoder } from "../define";
import { shiftLetter } from "../util";

/**
 * César — força bruta. Mostra TODOS os deslocamentos de −26 a +26 numa única
 * tabela (render "caesar-table"), em vez de só os 3 melhores como o decoder
 * `caesar`. Útil pra escanear a tabela inteira na mão.
 *
 * (Lembrando: deslocamento −n é equivalente a +(26−n), então metade das linhas
 * repete — é o esperado numa tabela de força bruta de −26 a +26.)
 */
export interface CaesarShiftRow {
  shift: number;
  text: string;
}

function shiftAll(input: string, n: number): string {
  let out = "";
  for (const ch of input) out += shiftLetter(ch, n);
  return out;
}

export const decoders = defineDecoder({
  id: "caesar-bruteforce",
  name: "César — força bruta",
  category: "classical",
  decode(input) {
    if (!/[a-zA-Z]/.test(input)) return [];
    const rows: CaesarShiftRow[] = [];
    for (let n = -26; n <= 26; n++) rows.push({ shift: n, text: shiftAll(input, n) });

    const output = rows.map((r) => `${r.shift >= 0 ? "+" : ""}${r.shift}\t${r.text}`).join("\n");

    return [
      {
        decoderId: "caesar-bruteforce",
        decoderName: "César — força bruta",
        category: "classical",
        label: "−26 a +26 (todos)",
        output,
        forcedScore: 0.4, // a reference table — visible, but below genuine solves
        render: "caesar-table",
        data: rows,
      },
    ];
  },
});
