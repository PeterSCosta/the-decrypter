import type { CodeHit } from "@/features/reference/phone-codes";
import {
  lookupPlateColor,
  lookupPlateRange,
  toMercosul,
  toOldPlate,
} from "@/features/reference/placa-veiculo";
import { defineDecoder } from "../define";

const ID = "placa-veiculo";
const NAME = "Placa de veículo";

/**
 * Placa de carro: converte antiga ↔ Mercosul e aponta a UF pela faixa de letras.
 *
 * POR QUE ENTRA: a placa é o objeto de rua mais fotografável que existe numa
 * gincana de campo (o acervo tem a prova *Placas Mercosul*, 2022), e a conversão
 * antiga↔Mercosul é uma substituição de verdade, com tabela fixa de 10 linhas.
 *
 * O PORTÃO é a forma, e ela é rígida: 3 letras + 4 dígitos (antiga) ou
 * 3 letras + dígito + letra + 2 dígitos (Mercosul), a string INTEIRA. Nada de
 * CEP, CPF, telefone, coordenada, data ou Base64 tem essa cara — a sonda
 * confirmou que nenhum deles dispara. O vizinho mais próximo é o `local-geocode`,
 * e é de propósito que a placa Mercosul se pareça com um Maidenhead de 6
 * caracteres: foi exatamente a pegadinha da GIA 2026 (*Basta Isso*, GH94RC).
 * Como o Maidenhead tem 6 caracteres e a Mercosul tem 7, os dois convivem sem
 * canibalizar um ao outro.
 *
 * O QUE O CARTÃO NUNCA FAZ: afirmar a UF. A tabela de faixas é compilação de
 * terceiros (ver `reference/placa-veiculo.ts`), então a linha da faixa sai
 * sempre rotulada — e, na placa Mercosul, com o aviso de que a UF só vale se ela
 * veio de conversão. **A Mercosul nativa não codifica estado nenhum** desde a
 * Resolução CONTRAN 748/2018. Dizer isso na tela é meio caminho de uma prova.
 */

// A string inteira, com separador opcional só depois das 3 letras.
const OLD_ONE = /^([A-Za-z]{3})[\s.·•-]?(\d{4})$/;
const MERCOSUL_ONE = /^([A-Za-z]{3})[\s.·•-]?(\d)([A-Za-z])(\d{2})$/;
// Nos tokens de uma lista o espaço não pode separar letras de dígitos, senão
// "ABC 1234" viraria dois tokens inválidos em vez de uma placa só.
const OLD_TOKEN = /^([A-Za-z]{3})[.·•-]?(\d{4})$/;
const MERCOSUL_TOKEN = /^([A-Za-z]{3})[.·•-]?(\d)([A-Za-z])(\d{2})$/;

interface Plate {
  /** "antiga" quando a entrada veio no padrão de 1990, "mercosul" no de 2018. */
  kind: "antiga" | "mercosul";
  /** As 3 letras iniciais, maiúsculas — é por elas que a faixa é buscada. */
  letters: string;
  /** A placa como se escreve no padrão de origem. */
  self: string;
  /** A equivalente no outro padrão; `null` só na Mercosul nativa (5ª letra K–Z). */
  other: string | null;
}

function parsePlate(token: string, allowSpace: boolean): Plate | null {
  const t = token.trim();
  const old = (allowSpace ? OLD_ONE : OLD_TOKEN).exec(t);
  if (old) {
    const letters = old[1].toUpperCase();
    return {
      kind: "antiga",
      letters,
      self: `${letters}-${old[2]}`,
      other: toMercosul(letters, old[2]),
    };
  }
  const merc = (allowSpace ? MERCOSUL_ONE : MERCOSUL_TOKEN).exec(t);
  if (merc) {
    const letters = merc[1].toUpperCase();
    return {
      kind: "mercosul",
      letters,
      self: `${letters}${merc[2]}${merc[3].toUpperCase()}${merc[4]}`,
      other: toOldPlate(letters, merc[2], merc[3], merc[4]),
    };
  }
  return null;
}

/** A linha da faixa por UF — sempre rotulada, nunca afirmada como fato. */
function rangeItem(p: Plate): CodeHit {
  const hit = lookupPlateRange(p.letters);
  const caveat =
    p.kind === "mercosul"
      ? "só vale se a placa veio de conversão — a Mercosul nativa não codifica estado (Resolução CONTRAN 748/2018)"
      : "faixa histórica de emplacamento — confira: a tabela pública é de compilação de terceiros";
  if (!hit) {
    return {
      code: p.letters,
      name: "Faixa não consolidada",
      detail:
        "fora da tabela pública (que vai de AAA a OIQ) — combinação liberada depois, sem tabela oficial do DENATRAN em domínio público",
    };
  }
  const seq = hit.seq > 1 ? ` · ${hit.seq}ª faixa` : "";
  return {
    code: `${hit.from}–${hit.to}`,
    name: `${hit.state} (${hit.uf})${seq}`,
    detail: caveat,
  };
}

/** As duas linhas de identidade/conversão da placa. */
function conversionItems(p: Plate): CodeHit[] {
  if (p.kind === "antiga") {
    // A 5ª posição da Mercosul é o 2º dígito da antiga virado letra.
    const digit = p.self.slice(5, 6);
    const letter = p.other?.slice(4, 5) ?? "";
    return [
      { code: p.self, name: "Placa antiga (padrão 1990)", detail: "3 letras + 4 dígitos" },
      {
        code: p.other ?? "",
        name: "Equivalente Mercosul",
        detail: `o 2º dígito (${digit}) vira ${letter} — tabela 0=A, 1=B, 2=C … 9=J`,
      },
    ];
  }
  const letter = p.self.slice(4, 5);
  const identity: CodeHit = {
    code: p.self,
    name: "Placa Mercosul (padrão 2018)",
    detail: "3 letras + dígito + letra + 2 dígitos",
  };
  if (!p.other) {
    return [
      identity,
      {
        code: "—",
        name: "Sem equivalente antiga",
        detail: `a 5ª posição é ${letter}, fora da tabela 0=A … 9=J — combinação nativa, emitida já no padrão Mercosul`,
      },
    ];
  }
  return [
    identity,
    {
      code: p.other,
      name: "Equivalente antiga",
      detail: `a letra ${letter} na 5ª posição volta a ser o dígito ${p.other.slice(5, 6)}`,
    },
  ];
}

/** Cor informada no 2º campo → categoria. Some do cartão quando não é cor. */
function colorItem(aux: string | undefined): CodeHit | null {
  if (!aux?.trim()) return null;
  const hit = lookupPlateColor(aux);
  if (!hit) return null;
  return { code: hit.color, name: hit.category, detail: hit.detail };
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  inputs: { aux: { label: "Cor da placa", placeholder: "vermelha, azul, dourada…" } },
  decode(input, ctx) {
    const single = parsePlate(input, true);
    const plates = single
      ? [single]
      : (() => {
          const tokens = input
            .trim()
            .split(/[\s,;]+/)
            .filter(Boolean);
          if (tokens.length < 2) return [];
          const parsed = tokens.map((t) => parsePlate(t, false));
          // Uma sobra basta para desistir: é o que impede uma frase com
          // vírgulas de virar cartão.
          return parsed.every((p): p is Plate => p !== null) ? parsed : [];
        })();
    if (plates.length === 0) return [];

    const color = colorItem(ctx.aux);
    const known = plates.filter((p) => lookupPlateRange(p.letters) !== null).length;

    if (plates.length === 1) {
      const p = plates[0];
      const range = lookupPlateRange(p.letters);
      const items = [...conversionItems(p), rangeItem(p)];
      if (color) items.push(color);
      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup",
          label: p.self,
          output: range
            ? `${p.other ?? p.self} · ${range.state} (${range.uf})`
            : (p.other ?? p.self),
          notes:
            p.kind === "antiga"
              ? "a UF vem da faixa de letras da placa antiga; a Mercosul não identifica estado nem município"
              : "a Mercosul é sequência nacional — a faixa abaixo só descreve a placa antiga de origem",
          // Encadeia a CONTRAPARTE: é ela que a próxima camada quer (a Mercosul
          // tem cara de Maidenhead; a antiga entrega 4 dígitos limpos).
          forcedScore: range ? 0.8 : 0.7,
          chainValue: p.other ?? p.self,
          render: "code-list",
          data: items,
        },
      ];
    }

    const converted = plates.map((p) => p.other ?? p.self);
    // Na lista o cartão fica compacto: placa → contraparte, e a UF só no detalhe.
    const items: CodeHit[] = plates.map((p) => ({
      code: p.self,
      name: p.other ?? "sem equivalente antiga",
      detail: rangeItem(p).name,
    }));
    if (color) items.push(color);
    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup",
        label: `${plates.length} placas`,
        output: converted.join(" · "),
        notes: `${plates.length} placas convertidas · ${known} com faixa histórica conhecida`,
        forcedScore: 0.85,
        // Uma por linha: é o formato que "Letra por posição" e o acróstico comem.
        chainValue: converted.join("\n"),
        render: "code-list",
        data: items,
      },
    ];
  },
});
