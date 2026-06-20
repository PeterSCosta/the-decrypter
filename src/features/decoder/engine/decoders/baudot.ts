import { mapDecoder } from "../define";

// ITA2 / Baudot — código de teletipo de 5 bits, com troca LETRAS/NÚMEROS.
// biome-ignore format: tabela compacta.
const LTRS: Record<string, string> = {
  "00011":"A","11001":"B","01110":"C","01001":"D","00001":"E","01101":"F","11010":"G","10100":"H",
  "00110":"I","01011":"J","01111":"K","10010":"L","11100":"M","01100":"N","11000":"O","10110":"P",
  "10111":"Q","01010":"R","00101":"S","10000":"T","00111":"U","11110":"V","10011":"W","11101":"X",
  "10101":"Y","10001":"Z","00100":" ","00010":"\n","01000":"\n",
};
// biome-ignore format: tabela compacta.
const FIGS: Record<string, string> = {
  "00011":"-","11001":"?","01110":":","01001":"$","00001":"3","01101":"!","11010":"&","10100":"#",
  "00110":"8","01011":"'","01111":"(","10010":")","11100":".","01100":",","11000":"9","10110":"0",
  "10111":"1","01010":"4","00101":"'","10000":"5","00111":"7","11110":";","10011":"2","11101":"/",
  "10101":"6","10001":"\"","00100":" ","00010":"\n","01000":"\n",
};

export const decoders = mapDecoder({
  id: "baudot",
  name: "Baudot / ITA2",
  category: "encoding",
  decode(input) {
    const bits = input.replace(/\s+/g, "");
    if (!/^[01]+$/.test(bits) || bits.length < 5 || bits.length % 5 !== 0) return null;
    let figs = false;
    let out = "";
    for (let i = 0; i < bits.length; i += 5) {
      const code = bits.slice(i, i + 5);
      if (code === "11111") {
        figs = false;
        continue;
      }
      if (code === "11011") {
        figs = true;
        continue;
      }
      if (code === "00000") continue;
      out += (figs ? FIGS : LTRS)[code] ?? "";
    }
    return out.trim() ? out : null;
  },
});
