import { type S10Hit, s10CheckDigit, s10Country, s10Service } from "@/features/reference/correios";
import { defineDecoder } from "../define";

const ID = "correios";
const NAME = "Rastreio postal (Correios / UPU S10)";

// 2 letras + 8 dígitos de série + 1 DV + 2 letras de país.
const FULL = /^([A-Z]{2})(\d{8})(\d)([A-Z]{2})$/;
// Mesma coisa sem o DV: a etiqueta borrada, o dígito que ninguém anotou.
const NO_DV = /^([A-Z]{2})(\d{8})([A-Z]{2})$/;

/**
 * Só espaço e hífen saem. Normalizar mais que isso afrouxaria o portão — é o
 * formato rígido de 13 caracteres que segura o decoder longe de CEP, CPF e
 * telefone, e não custa nada exigir que o resto venha limpo.
 */
function normalize(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

/** Mostra a conta do módulo 11 inteira, inclusive os dois desvios da norma. */
function explainCheckDigit(sum: number, remainder: number, digit: number): string {
  const raw = 11 - remainder;
  const tail = raw === 10 ? " → 10 vira 0" : raw === 11 ? " → 11 vira 5" : "";
  return `pesos 8 6 4 2 3 5 9 7 · soma ${sum} · ${sum} mod 11 = ${remainder} · 11 − ${remainder} = ${raw}${tail} → DV ${digit}`;
}

/** O aviso que impede a leitura errada: a norma não conhece SEDEX nem PAC. */
const DOMESTIC_NOTE =
  "faixa reservada a uso doméstico/bilateral — o serviço comercial (SEDEX, PAC, …) é definido pelo operador local e não consta da norma";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input) {
    const code = normalize(input);

    const full = FULL.exec(code);
    if (full) {
      const [, indicator, serial, given, cc] = full;
      const country = s10Country(cc);
      // Sufixo que não é país ISO 3166-1 não é código S10 — nem vale comentar.
      if (!country) return [];

      const svc = s10Service(indicator);
      const { digit, sum, remainder } = s10CheckDigit(serial);
      const ok = digit === Number(given);

      // DV furado só interessa quando o resto do código é plausível: prefixo de
      // faixa atribuída. Sem isso, qualquer AA000000000ZZ viraria um card.
      if (!ok && (svc.kind === "reserved" || svc.kind === "unassigned")) return [];

      const notes = [
        explainCheckDigit(sum, remainder, digit),
        svc.kind === "domestic" ? DOMESTIC_NOTE : svc.note,
        cc === "BR" ? "postado no Brasil" : `postado fora do Brasil (${country})`,
        "padrão S10 da UPU (norma S10-12)",
      ].filter(Boolean);

      const items: S10Hit[] = [
        {
          code: indicator,
          name: svc.label,
          detail: `indicador de serviço · faixa ${svc.range}`,
        },
        { code: serial, name: "número de série", detail: "8 dígitos emitidos pelo operador" },
        {
          code: given,
          name: ok
            ? "dígito verificador confere"
            : `dígito verificador NÃO confere (esperado ${digit})`,
          detail: explainCheckDigit(sum, remainder, digit),
        },
        { code: cc, name: country, detail: "país de postagem · ISO 3166-1 alfa-2" },
      ];

      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup",
          label: ok
            ? `${code} · válido · ${country}`
            : `${code} · DV não confere (esperado ${digit})`,
          output: ok
            ? `${code} — DV confere · ${svc.label} · país de postagem: ${country}`
            : `${code} — formato S10, mas o DV não fecha: esperado ${digit}, veio ${given}`,
          notes: notes.join(" · "),
          // O DV fechando é prova forte; o DV furado é diagnóstico, e fica
          // abaixo do corte de 0.35 para não disputar o topo da bancada.
          forcedScore: ok ? 0.9 : 0.2,
          chainValue: serial,
          render: "code-list",
          data: items,
        },
      ];
    }

    const partial = NO_DV.exec(code);
    if (partial) {
      const [, indicator, serial, cc] = partial;
      const country = s10Country(cc);
      if (!country) return [];
      const svc = s10Service(indicator);
      // Sem DV não há prova nenhuma: aqui o prefixo precisa ser faixa atribuída.
      if (svc.kind === "reserved" || svc.kind === "unassigned") return [];

      const { digit, sum, remainder } = s10CheckDigit(serial);
      const complete = `${indicator}${serial}${digit}${cc}`;

      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup",
          label: `falta o DV → ${complete}`,
          output: complete,
          notes: [
            `12 caracteres: o dígito verificador está faltando · calculado: ${digit}`,
            explainCheckDigit(sum, remainder, digit),
            svc.kind === "domestic" ? DOMESTIC_NOTE : svc.note,
            `${svc.label} · país de postagem: ${country}`,
          ]
            .filter(Boolean)
            .join(" · "),
          forcedScore: 0.55,
          chainValue: complete,
        },
      ];
    }

    return [];
  },
});
