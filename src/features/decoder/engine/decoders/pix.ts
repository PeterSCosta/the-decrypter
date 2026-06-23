import { defineDecoder } from "../define";

/**
 * ISPB (8 dígitos) → participante do PIX. Lê a lista do BrasilAPI carregada no
 * contexto sob demanda. Só dispara quando o número casa um ISPB conhecido,
 * então não atrapalha CEP/NCM/EAN de 8 dígitos.
 */
export const decoders = defineDecoder({
  id: "pix-participant",
  name: "Participante PIX (ISPB)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.pix) return [];
    const code = input.trim();
    if (!/^\d{8}$/.test(code)) return [];

    const p = ctx.pix.find((x) => x.ispb === code);
    if (!p) return [];

    return [
      {
        decoderId: "pix-participant",
        decoderName: "Participante PIX (ISPB)",
        category: "lookup",
        label: `ISPB ${code}`,
        output: p.nome,
        notes: `Participação ${p.tipo} · ISPB ${code}`,
        forcedScore: 0.9,
      },
    ];
  },
});
