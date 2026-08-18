/**
 * CAR — Cadastro Ambiental Rural.
 *
 * ── A MELHOR ASSINATURA DO LEVANTAMENTO ─────────────────────────────────────
 * `SC-4202404-D9ADE9…485A` junta TRÊS travas independentes numa string só:
 *   1. sigla de UF válida;
 *   2. sete dígitos que formam um geocódigo do IBGE **com dígito verificador
 *      conferível** — e cujo prefixo tem de bater com a UF;
 *   3. exatamente 32 caracteres hexadecimais em maiúscula.
 * Nada mais no mundo tem essa forma. Não é preciso base nenhuma para afirmar
 * "isto é um imóvel rural em Blumenau".
 *
 * ── O QUE ELE **NÃO** DÁ ────────────────────────────────────────────────────
 * A coordenada. O polígono do imóvel vive na base do SICAR, e a consulta
 * pública dele redireciona para captcha — o que, pela regra da casa, encerra o
 * assunto. Meia resposta certa e honesta: município sim, ponto não.
 *
 * ── A ARMADILHA QUE O DV **NÃO** PEGA ───────────────────────────────────────
 * O dígito verificador protege contra número digitado errado, não contra
 * município trocado: `4208203` (Itajaí) e `4208302` (Itapema) são AMBOS
 * DV-válidos. Quem responde qual é qual é a tabela de municípios, nunca o DV.
 */

export interface Car {
  uf: string;
  /** Geocódigo IBGE de 7 dígitos, com o DV já conferido. */
  ibge: string;
  /** Os 32 hexadecimais que identificam o imóvel. */
  imovel: string;
}

const UFS = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

/** Os dois primeiros dígitos do geocódigo dizem a UF. */
const CODIGO_UF: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

/**
 * O dígito verificador do geocódigo do IBGE.
 *
 * Pesos 1,2,1,2,1,2 sobre os seis primeiros; soma os ALGARISMOS de cada
 * produto (não o produto); o dígito é o que completa a dezena. Conferido
 * contra Blumenau, Itajaí, Itapema, São Paulo e Florianópolis.
 */
export function dvIbge(seisDigitos: string): number | null {
  if (!/^\d{6}$/.test(seisDigitos)) return null;
  const pesos = [1, 2, 1, 2, 1, 2];
  let soma = 0;
  for (let i = 0; i < 6; i++) {
    const p = Number(seisDigitos[i]) * pesos[i];
    soma += Math.floor(p / 10) + (p % 10);
  }
  return (10 - (soma % 10)) % 10;
}

/** O geocódigo de 7 dígitos fecha? */
export function geocodigoIbgeValido(sete: string): boolean {
  if (!/^\d{7}$/.test(sete)) return false;
  return dvIbge(sete.slice(0, 6)) === Number(sete[6]);
}

export function decodeCar(raw: string): Car | null {
  const m = raw
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2})-(\d{7})-([0-9A-F]{32})$/);
  if (!m) return null;

  const [, uf, ibge, imovel] = m;
  if (!UFS.has(uf)) return null;
  if (!geocodigoIbgeValido(ibge)) return null;
  // A UF escrita tem de ser a mesma que o geocódigo declara — é a trava que
  // separa um CAR de verdade de um número montado.
  if (CODIGO_UF[ibge.slice(0, 2)] !== uf) return null;

  return { uf, ibge, imovel };
}
