import { mapDecoder } from "../define";

/**
 * Example custom decoder (single-output style). Normalises leetspeak back to
 * letters: "l33t h4x0r" → "leet haxor". Only runs when the input has both a
 * letter and a leet character, so it doesn't mangle pure numbers.
 */
const LEET: Record<string, string> = {
  "4": "a",
  "@": "a",
  "8": "b",
  "3": "e",
  "6": "g",
  "9": "g",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "2": "z",
};

export const decoders = mapDecoder({
  id: "leetspeak",
  name: "Leetspeak",
  category: "transform",
  decode(input) {
    if (!/[a-z]/i.test(input) || !/[0-9@$!+]/.test(input)) return null;
    let out = "";
    for (const ch of input) out += LEET[ch] ?? ch;
    return out;
  },
});
