import { defineDecoder } from "../define";
import { realWords, wordsProntas } from "../score";

/**
 * Mojibake: texto UTF-8 lido como Latin-1 (`informaÃ§Ã£o` → `informação`).
 *
 * ── POR QUE ISTO É ONDA 0, E NÃO CIFRA NOVA ─────────────────────────────────
 * Não é uma cifra que alguém escolheu — é uma corrupção de transporte, e ela
 * chega o tempo todo: PDF salvo errado, planilha exportada em Latin-1, print de
 * sistema antigo. O estrago não é o texto ficar feio. É que `informaÃ§Ã£o` **não
 * casa com a wordlist pt-BR**, então a saída perde o selo de palavra real — e o
 * selo é o que separa resposta de acaso no ranking inteiro. Uma prova pode
 * despencar por causa de um acento.
 *
 * ── A ASSINATURA É LITERAL, E É POR ISSO QUE ELE PODE EXISTIR ───────────────
 * `Ã` ou `Â` seguidos de pontuação alta, e a trinca `â€`, não aparecem em
 * português legítimo: são o primeiro byte de uma sequência UTF-8 lido como se
 * fosse letra. Não é palpite estatístico, é forma.
 *
 * ── E A SEGUNDA PORTA: A VOLTA TEM DE MELHORAR ──────────────────────────────
 * Só emite se o texto consertado produzir palavra real que o original NÃO
 * produzia. Sem isso, qualquer texto com `Ã` viraria card; com isso, o decoder
 * se autoverifica — ou devolve português, ou cala. Enquanto o vocabulário não
 * carregou, `wordsProntas()` é falso e o portão cai para "a volta tem de ser
 * UTF-8 válido e diferente da entrada": mais frouxo, mas ainda literal, e a nota
 * desce junto.
 */
const ASSINATURA = /[ÃÂ][-¿]|â€[¦]/;

/** Latin-1 de volta para bytes, e os bytes de volta para UTF-8. */
function desfaz(texto: string): string | null {
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) {
    const cp = texto.charCodeAt(i);
    // Fora de Latin-1 o texto não foi produzido pelo caminho que estamos
    // desfazendo — desistir é mais honesto que emitir metade convertida.
    if (cp > 0xff) return null;
    bytes[i] = cp;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const NAME = "Mojibake (UTF-8 lido como Latin-1)";

export const decoders = defineDecoder({
  id: "mojibake",
  name: NAME,
  category: "encoding",
  decode(input) {
    const texto = input.trim();
    if (texto.length < 4 || !ASSINATURA.test(texto)) return [];

    const volta = desfaz(texto);
    if (!volta || volta === texto || volta.includes("�")) return [];

    // A segunda porta: a volta tem de ganhar português que o original não tinha.
    const pronto = wordsProntas();
    if (pronto && realWords(volta).length <= realWords(texto).length) return [];

    return [
      {
        decoderId: "mojibake",
        decoderName: NAME,
        category: "encoding" as const,
        label: "acentos recuperados",
        output: volta,
        // Alto porque a assinatura é literal E a volta se confere sozinha; abaixo
        // de acerto em base real, que é evidência de outra natureza.
        forcedScore: pronto ? 0.9 : 0.6,
        chainValue: volta,
      },
    ];
  },
});
