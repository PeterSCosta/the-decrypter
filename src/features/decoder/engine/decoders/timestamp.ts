import { defineDecoder } from "../define";

/**
 * Timestamp Unix → data. A metade contrária do `date-key`.
 *
 * ── POR QUE ELE PODE EXISTIR, E POR QUE FICA NA GAVETA ─────────────────────
 * `date-key` já faz data → derivados (signo, Zeller, dia do ano, serial do
 * Excel, Unix, fase da lua). Faltava a volta: dez dígitos que são uma data.
 *
 * A assinatura é FRACA e o número diz isso. Dez dígitos são também protocolo,
 * matrícula, código de barras truncado, número de processo. A rejeição medida
 * pela varredura de catálogos foi **99,02% no corpus real e 96,30% no
 * sintético** — passa no piso de 79,8%, mas passa por causa da FAIXA, não da
 * forma: só sobrevive o que cai entre 2001 e 2033.
 *
 * Por isso ele entra com **teto de nota** e nunca lidera. É a diferença entre
 * "isto pode ser uma data" (útil) e "isto é uma data" (mentira em 1 de cada 100).
 *
 * ── E POR QUE OS DOIS FUSOS APARECEM ───────────────────────────────────────
 * Uma prova de gincana no Vale escreve a hora local. Mostrar só UTC faria a
 * bancada dizer 21h quando o enunciado diz 18h — e quem confere fecha a aba.
 */

/** A faixa que o portão aceita, e é ela que produz os 99% de rejeição. */
const MIN = Date.UTC(2001, 0, 1) / 1000; // 978.307.200
const MAX = Date.UTC(2033, 0, 1) / 1000; // 1.988.150.400

/** Fuso do Vale do Itajaí. Sem horário de verão desde 2019 (Decreto 9.772). */
const OFFSET_BR = -3;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const doisDigitos = (n: number) => String(n).padStart(2, "0");

function formata(ms: number, offsetHoras: number): string {
  const d = new Date(ms + offsetHoras * 3_600_000);
  return `${doisDigitos(d.getUTCDate())}/${doisDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())} · ${DIAS[d.getUTCDay()]}`;
}

const ID = "timestamp";
const NAME = "Timestamp Unix → data";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input) {
    const s = input.trim();
    if (!/^\d{10}$|^\d{13}$/.test(s)) return [];

    const emMs = s.length === 13;
    const segundos = emMs ? Number(s) / 1000 : Number(s);
    // Ver o bloco da faixa: é ela que separa data de matrícula.
    if (!Number.isFinite(segundos) || segundos < MIN || segundos > MAX) return [];

    const ms = segundos * 1000;
    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "transform" as const,
        label: emMs ? "milissegundos" : "segundos",
        output: `${formata(ms, OFFSET_BR)} (Brasília) · ${formata(ms, 0)} (UTC)`,
        // Teto de propósito: dez dígitos também são protocolo e matrícula, e a
        // faixa rejeita 99% mas não prova nada sobre a intenção de quem digitou.
        forcedScore: 0.45,
        chainValue: formata(ms, OFFSET_BR).split(" ")[0],
      },
    ];
  },
});
