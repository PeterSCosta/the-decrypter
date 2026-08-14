import { UNICODE_STYLE_BY_ID, normalizeUnicodeStyles } from "@/features/reference/unicode-styles";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

/**
 * Texto estilizado → ASCII.
 *
 * O par decodificador da aba Fontes. 𝐧𝐞𝐠𝐫𝐢𝐭𝐨, 𝓈𝒸𝓇𝒾𝓅𝓉, 𝔣𝔯𝔞𝔨𝔱𝔲𝔯, ⓒⓘⓡⓒⓤⓛⓞ,
 * ｆｕｌｌｗｉｄｔｈ, sᴍᴀʟʟ ᴄᴀᴘs, ⁿᵃ ᵃˡᵗᵘʳᵃ e ∀ǝɹʇıqoɹ **não são fontes**: são code points
 * de outros blocos. Colado de rede social, esse texto entra na bancada como
 * lixo — nenhum decoder casa, o scorer não acha uma palavra, e o usuário não
 * entende por quê. Normalizar devolve o texto ao ASCII e a bancada volta a
 * funcionar (inclusive para encadear noutra cifra).
 *
 * POR QUE SEM `forcedScore`: a saída é texto legível. Se a normalização acertou,
 * virou palavra e o scorer sobe sozinho; se não, tem de afundar como qualquer
 * outro palpite. Pontuação fixa aqui competiria com a resposta de verdade.
 *
 * O caso de ouro é 🇧🇷 → "BR": bandeira não é desenho, é o par de indicadores
 * regionais do código ISO 3166. Prova de países vira prova de siglas.
 */

const ID = "unicode-styles";
const NAME = "Texto estilizado (Unicode)";

/**
 * Fração dos caracteres visíveis que precisa casar numa tabela. Segura os dois
 * ruídos reais: uma letra exótica solta no meio de prosa (IPA, grego, hebraico)
 * e o "km²" honesto. As âncoras passam folgadas — 5/5 no negrito, 2/2 na
 * bandeira, 3/5 no de cabeça para baixo.
 */
const COBERTURA_MINIMA = 0.3;

const NOTA_BASE =
  "não é fonte: são code points de outro bloco Unicode, por isso nenhum decoder casava. Normalizado para ASCII.";
const NOTA_BANDEIRA =
  "Indicador regional: cada bandeira é o par de letras do código ISO 3166 do país (🇧🇷 = BR).";

const inverterOrdem = (s: string) => [...s].reverse().join("");

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input, ctx) {
    const norm = normalizeUnicodeStyles(input);
    if (norm === null) return [];

    // ---- portão anti-ruído -------------------------------------------------
    // `normalizeUnicodeStyles` já exige que algum estilo bata o próprio mínimo
    // (2 caracteres, 3 no sobrescrito/subscrito). Falta o peso: dois glifos
    // casados no meio de um parágrafo são coincidência, não estilo.
    if (ctx.only !== ID && norm.cobertura < COBERTURA_MINIMA) return [];

    const nomes = norm.estilos.map((e) => e.nome).join(" + ");
    const temBandeira = norm.estilos.some((e) => e.id === "indicador-regional");
    const notes = temBandeira ? `${NOTA_BASE} ${NOTA_BANDEIRA}` : NOTA_BASE;

    // O de cabeça para baixo é o único que também gira a ORDEM. Como o texto
    // colado tanto pode vir girado quanto só trocado glifo a glifo, as duas
    // leituras entram e quem decide é o scorer — não a nossa aposta.
    const leituras = norm.estilos.some((e) => e.inverteOrdem)
      ? [
          { texto: inverterOrdem(norm.texto), sufixo: " — ordem invertida" },
          { texto: norm.texto, sufixo: " — mantendo a ordem" },
        ]
      : [{ texto: norm.texto, sufixo: "" }];

    const vistos = new Set<string>();
    const candidatos: DecodeCandidate[] = [];
    for (const { texto, sufixo } of leituras) {
      if (texto.trim().length === 0 || texto.trim() === input.trim()) continue;
      if (vistos.has(texto)) continue;
      vistos.add(texto);
      candidatos.push({
        decoderId: ID,
        decoderName: NAME,
        category: "transform",
        label: `${nomes}${sufixo}`,
        output: texto,
        notes,
        chainValue: texto,
      });
    }
    return candidatos;
  },
  /**
   * Inverso do modo "uma cifra só". Aqui só cabe UM estilo, e o negrito é o que
   * o mundo usa; a aba Fontes é que oferece os 24.
   */
  encode(input) {
    return UNICODE_STYLE_BY_ID.get("negrito")?.apply(input) ?? null;
  },
});
