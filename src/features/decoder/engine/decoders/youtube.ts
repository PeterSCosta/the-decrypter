import { idDoYoutube } from "@/features/arquivo/youtube/youtube";
import { defineDecoder } from "../define";

/**
 * `b62kBXlBlyQ` → “isto é um vídeo do YouTube”.
 *
 * Um ID de vídeo é uma sequência de 11 caracteres em base64url, e é o tipo de
 * coisa que passa despercebida numa prova: parece token, hash, sobra de URL.
 * Quem já viu um reconhece; quem não viu, não.
 *
 * ── O QUE SEGURA O FALSO POSITIVO ───────────────────────────────────────────
 * Onze caracteres de `[A-Za-z0-9_-]` também é a forma de "brasileiros" e de
 * qualquer pedaço de base64. Duas guardas, uma de cada lado:
 *
 *  • **Antes**: palavra é recusada aqui. Um ID de verdade é sorteado, e a
 *    chance de sair só com letras minúsculas é (26/64)¹¹ ≈ 1 em 100 mil — então
 *    exigir pelo menos um dígito, uma maiúscula ou um `-`/`_` não custa nada e
 *    elimina o caso que apareceria todo dia.
 *  • **Depois**: o card CONFIRMA no oEmbed do YouTube. ID que não existe vira
 *    "não existe vídeo com esse ID", que é uma resposta — não um card mudo.
 *
 * O link inteiro é outra história: `youtube.com/watch?v=…` não tem como ser
 * outra coisa, e por isso pontua no teto.
 */

export interface YoutubeHint {
  id: string;
  /** Veio de um link completo (assinatura inequívoca) ou do ID solto. */
  viaUrl: boolean;
}

/** Um ID sorteado tem dígito, maiúscula ou separador; uma palavra não tem. */
function pareceSorteado(id: string): boolean {
  return /[A-Z0-9_-]/.test(id);
}

export const decoders = defineDecoder({
  id: "youtube",
  name: "Vídeo do YouTube",
  category: "lookup",
  decode(input) {
    const texto = input.trim();
    const id = idDoYoutube(texto);
    if (!id) return [];

    // `idDoYoutube` aceita o ID nu; saber se ele veio de um link muda a nota.
    const viaUrl = texto.length > 11;
    if (!viaUrl && !pareceSorteado(id)) return [];

    return [
      {
        decoderId: "youtube",
        decoderName: "Vídeo do YouTube",
        category: "lookup" as const,
        label: id,
        output: `Vídeo do YouTube: ${id}`,
        forcedScore: viaUrl ? 0.95 : 0.5,
        render: "youtube" as const,
        // Encadeia o ID, não a URL: é ele que se cola na aba Arquivo e o que
        // costuma entrar em outra cifra (11 caracteres, base64url).
        chainValue: id,
        data: { id, viaUrl } satisfies YoutubeHint,
      },
    ];
  },
});
