/**
 * Boleto bancário e conta de consumo (arrecadação) — padrão FEBRABAN.
 *
 * O que interessa numa gincana não é o boleto: é o que ele carrega. Um código
 * de barras de 44 dígitos é a única "cifra burocrática" brasileira que guarda
 * DINHEIRO e DATA ao mesmo tempo, e a data vem disfarçada num contador de 4
 * dígitos (o *fator de vencimento*), que é o que a prova quer.
 *
 * ARMADILHA CENTRAL — o fator é AMBÍGUO desde 22/02/2025. Ele conta dias desde
 * 07/10/1997 e a faixa útil ia de 1000 (03/07/2000) a 9999 (21/02/2025). Em
 * 22/02/2025 a FEBRABAN reiniciou o contador em 1000. Logo o mesmo "1538" lê
 * 23/12/2001 pela base velha e 14/08/2026 pela base nova. Este módulo devolve
 * SEMPRE as duas leituras: escolher uma seria chutar por conta da equipe.
 *
 * Verificado por cálculo: fator 1000 → 03/07/2000 e fator 9999 → 21/02/2025,
 * batendo com a data-base e o estouro documentados pela FEBRABAN.
 */

// ── Tabela de bancos (código de compensação de 3 dígitos) ──────────────────
// Só os que aparecem em boleto de verdade; nomes conferidos contra o cadastro
// de instituições do BC (via BrasilAPI /banks/v1). Fora da tabela o decoder
// mostra o número cru — mentir o nome do banco seria pior que não dizer nada.
// biome-ignore format: tabela compacta.
const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil", "003": "Banco da Amazônia", "004": "Banco do Nordeste",
  "021": "Banestes (ES)", "033": "Santander", "037": "Banpará", "041": "Banrisul",
  "047": "Banese (SE)", "070": "BRB — Banco de Brasília", "077": "Banco Inter",
  "084": "Sisprime do Brasil", "085": "Ailos", "097": "Credisis",
  "104": "Caixa Econômica Federal", "121": "Agibank", "133": "Cresol",
  "136": "Unicred", "208": "BTG Pactual", "212": "Banco Original", "218": "BS2",
  "237": "Bradesco", "246": "ABC Brasil", "260": "Nubank", "280": "Will Financeira",
  "290": "PagBank (PagSeguro)", "318": "Banco BMG", "323": "Mercado Pago",
  "336": "Banco C6", "341": "Itaú Unibanco", "355": "Ótimo SCD",
  "364": "Efí (ex-Gerencianet)", "380": "PicPay", "389": "Mercantil do Brasil",
  "399": "HSBC / Kirton Bank", "403": "Cora", "422": "Banco Safra", "461": "Asaas",
  "473": "Banco Caixa Geral", "479": "ItaúBank", "600": "Banco Luso Brasileiro",
  "604": "Banco Industrial do Brasil", "611": "Banco Paulista", "623": "Banco Pan",
  "633": "Banco Rendimento", "637": "Sofisa", "643": "Banco Pine",
  "652": "Itaú Unibanco Holding", "653": "Banco Pleno (ex-Voiter)",
  "655": "Banco BV (ex-Votorantim)", "707": "Daycoval", "741": "Banco Ribeirão Preto",
  "745": "Citibank", "748": "Sicredi", "752": "BNP Paribas Brasil", "756": "Sicoob",
};

/** Nenhum código de compensação chega a 800 — por isso o "8" inicial é livre
 *  para marcar arrecadação sem ambiguidade nenhuma. */
export function nomeDoBanco(code: string): string | null {
  return BANCOS[code] ?? null;
}

// ── Arrecadação: segmento (2ª posição) e identificação de valor (3ª) ───────
const SEGMENTOS: Record<string, string> = {
  "1": "Prefeituras (IPTU, ISS, taxas)",
  "2": "Saneamento (água e esgoto)",
  "3": "Energia elétrica e gás",
  "4": "Telecomunicações",
  "5": "Órgãos governamentais (DARF, FGTS, Simples…)",
  "6": "Carnês e demais empresas identificadas por CNPJ",
  "7": "Multas de trânsito",
  "9": "Uso exclusivo do banco",
};

interface IdentValor {
  nome: string;
  mod: 10 | 11;
  /** `false` = quantidade de moeda a reajustar, não reais na hora. */
  efetivo: boolean;
}
const IDENT_VALOR: Record<string, IdentValor> = {
  "6": { nome: "valor efetivo em reais", mod: 10, efetivo: true },
  "7": { nome: "quantidade de moeda (valor a reajustar)", mod: 10, efetivo: false },
  "8": { nome: "valor efetivo em reais", mod: 11, efetivo: true },
  "9": { nome: "quantidade de moeda (valor a reajustar)", mod: 11, efetivo: false },
};

// ── Dígitos verificadores ──────────────────────────────────────────────────

/** Módulo 10 (pesos 2,1 alternados da direita; soma os DÍGITOS do produto). */
export function mod10(bloco: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = bloco.length - 1; i >= 0; i--) {
    const p = Number(bloco[i]) * peso;
    soma += p > 9 ? p - 9 : p;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

function somaMod11(digitos: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += Number(digitos[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  return soma % 11;
}

/**
 * Módulo 11 do boleto BANCÁRIO: resto 0, 1 ou 10 (ou seja, DV 11, 10 ou 1)
 * cai em 1. Consequência prática: o DV geral de um bancário NUNCA é 0 — é o
 * primeiro teste de sanidade quando alguém digita o código errado.
 */
export function mod11Bancario(digitos: string): number {
  const dv = 11 - somaMod11(digitos);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/**
 * Módulo 11 da ARRECADAÇÃO: regra diferente do bancário — resto 0 ou 1 dá DV 0.
 * Trocar um pelo outro é o bug clássico; por isso as duas funções são separadas
 * e nomeadas pelo domínio, não por "mod11".
 */
export function mod11Arrecadacao(digitos: string): number {
  const resto = somaMod11(digitos);
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

// ── Fator de vencimento ────────────────────────────────────────────────────

const DIA_MS = 86_400_000;
/** Fator 1000 na contagem original (data-base FEBRABAN 07/10/1997 + 1000 dias). */
const BASE_ANTIGA = "2000-07-03";
/** Fator 1000 na contagem reiniciada, no dia seguinte ao estouro em 9999. */
const BASE_NOVA = "2025-02-22";

function dataDoFator(fator: number, baseISO: string): string {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + (fator - 1000) * DIA_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getUTCDate())}/${p(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
}

export interface Vencimento {
  fator: number;
  /** Leitura pela contagem reiniciada (1000 = 22/02/2025) — a de hoje. */
  atual: string | null;
  /** Leitura pela contagem original (1000 = 03/07/2000) — boletos antigos. */
  antiga: string | null;
  /** `true` quando o fator é 0000: o boleto simplesmente não tem vencimento. */
  semVencimento: boolean;
}

/** As DUAS leituras do fator. Nunca escolhe: quem escolhe é a equipe. */
export function lerFator(fator: number): Vencimento {
  if (fator === 0) return { fator, atual: null, antiga: null, semVencimento: true };
  if (fator < 1000) return { fator, atual: null, antiga: null, semVencimento: false };
  return {
    fator,
    atual: dataDoFator(fator, BASE_NOVA),
    antiga: dataDoFator(fator, BASE_ANTIGA),
    semVencimento: false,
  };
}

// ── Valor ──────────────────────────────────────────────────────────────────

/** Centavos → "R$ 1.234,56" (formatação manual: `toLocaleString` varia por ICU). */
export function formatBRL(centavos: number): string {
  const s = String(centavos).padStart(3, "0");
  const inteiro = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${inteiro},${s.slice(-2)}`;
}

// ── Conversão linha digitável ↔ código de barras ───────────────────────────

/**
 * 47 dígitos → 44. Os campos 1–3 da linha carregam um DV módulo 10 cada, que
 * NÃO existe no código de barras; o DV geral (módulo 11) mora na posição 33 da
 * linha e na 5 do código. Reordenar isso errado é o outro bug clássico.
 */
function linha47ParaBarras(l: string): string {
  const banco = l.slice(0, 4); // banco + moeda
  const livre1 = l.slice(4, 9); // campo 1 sem o DV da posição 10
  const livre2 = l.slice(10, 20); // campo 2 sem o DV da posição 21
  const livre3 = l.slice(21, 31); // campo 3 sem o DV da posição 32
  const dvGeral = l.slice(32, 33);
  const fatorValor = l.slice(33, 47);
  return banco + dvGeral + fatorValor + livre1 + livre2 + livre3;
}

/** 48 dígitos → 44: tira o DV de cada um dos 4 blocos de 11. */
function linha48ParaBarras(l: string): string {
  return l.slice(0, 11) + l.slice(12, 23) + l.slice(24, 35) + l.slice(36, 47);
}

// ── Leitura ────────────────────────────────────────────────────────────────

export interface CampoBoleto {
  code: string;
  name: string;
  detail?: string;
}

export interface BoletoInfo {
  tipo: "bancario" | "arrecadacao";
  origem: "código de barras (44)" | "linha digitável (47)" | "linha digitável (48)";
  /** Os 44 dígitos, sempre — mesmo quando a entrada foi a linha digitável. */
  barras: string;
  dvOk: boolean;
  campos: CampoBoleto[];
  resumo: string;
  /** Campo livre: a única parte que este decoder NÃO interpreta. */
  campoLivre: string;
  vencimento: Vencimento | null;
}

function lerBancario(barras: string, origem: BoletoInfo["origem"]): BoletoInfo | null {
  if (barras[3] !== "9") return null; // moeda: 9 = Real. Só isso circula.
  const dv = Number(barras[4]);
  const dvOk = mod11Bancario(barras.slice(0, 4) + barras.slice(5)) === dv;

  const banco = barras.slice(0, 3);
  const fator = Number(barras.slice(5, 9));
  const centavos = Number(barras.slice(9, 19));
  const campoLivre = barras.slice(19, 44);
  const venc = lerFator(fator);
  const nome = nomeDoBanco(banco);

  const campos: CampoBoleto[] = [
    {
      code: banco,
      name: nome ?? `banco ${banco} — fora da tabela embarcada`,
      detail: "banco emissor · posições 1–3 (código de compensação)",
    },
    { code: "9", name: "Real (R$)", detail: "código da moeda · posição 4" },
  ];

  if (venc.semVencimento) {
    campos.push({
      code: "0000",
      name: "sem vencimento",
      detail: "fator 0000 · posições 6–9: boleto sem data de vencimento",
    });
  } else if (venc.atual && venc.antiga) {
    campos.push({
      code: String(fator),
      name: `Vencimento ${venc.atual}`,
      detail: "fator reiniciado em 22/02/2025 (1000 = 22/02/2025) — leitura de hoje",
    });
    campos.push({
      code: String(fator),
      name: `ou ${venc.antiga}`,
      detail: "contagem original (1000 = 03/07/2000, esgotada em 21/02/2025)",
    });
  } else {
    campos.push({
      code: String(fator).padStart(4, "0"),
      name: "fator fora da faixa 1000–9999",
      detail: "posições 6–9: não é um fator de vencimento válido",
    });
  }

  campos.push(
    centavos === 0
      ? {
          code: "R$",
          name: "valor não informado",
          detail: "posições 10–19 zeradas: o valor é acertado na quitação",
        }
      : {
          code: "R$",
          name: formatBRL(centavos),
          detail: "valor do documento · posições 10–19 (2 casas implícitas)",
        },
  );
  campos.push({
    code: "DV",
    name: dvOk ? `dígito geral ${dv} confere` : `dígito geral ${dv} NÃO confere`,
    detail: "posição 5 · módulo 11, pesos 2–9 da direita, 0/10/11 → 1",
  });
  campos.push({
    code: "livre",
    name: campoLivre,
    detail: "campo livre · posições 20–44 (nosso-número/convênio, formato de cada banco)",
  });

  const quando = venc.semVencimento
    ? "sem vencimento"
    : venc.atual
      ? `vencimento ${venc.atual} (ou ${venc.antiga} pela contagem antiga)`
      : "fator de vencimento inválido";
  const quanto = centavos === 0 ? "valor não informado" : formatBRL(centavos);

  return {
    tipo: "bancario",
    origem,
    barras,
    dvOk,
    campos,
    campoLivre,
    vencimento: venc,
    resumo: `${nome ?? `banco ${banco}`} · ${quanto} · ${quando}`,
  };
}

function lerArrecadacao(barras: string, origem: BoletoInfo["origem"]): BoletoInfo | null {
  const seg = barras[1];
  const idv = barras[2];
  const segNome = SEGMENTOS[seg];
  const ident = IDENT_VALOR[idv];
  if (!segNome || !ident) return null;

  const dv = Number(barras[3]);
  const resto = barras.slice(0, 3) + barras.slice(4);
  const dvOk = (ident.mod === 10 ? mod10(resto) : mod11Arrecadacao(resto)) === dv;

  const centavos = Number(barras.slice(4, 15));
  const empresa = barras.slice(15, 19);
  const campoLivre = barras.slice(19, 44);

  const campos: CampoBoleto[] = [
    { code: "8", name: "conta de consumo / tributo", detail: "posição 1 · não é boleto bancário" },
    { code: seg, name: segNome, detail: "segmento · posição 2" },
    {
      code: idv,
      name: ident.nome,
      detail: `identificação de valor · posição 3 (DV por módulo ${ident.mod})`,
    },
    ident.efetivo
      ? { code: "R$", name: formatBRL(centavos), detail: "valor · posições 5–15" }
      : {
          code: "qtd",
          name: String(centavos),
          detail: "quantidade de moeda · posições 5–15 (não são reais)",
        },
    {
      code: "DV",
      name: dvOk ? `dígito geral ${dv} confere` : `dígito geral ${dv} NÃO confere`,
      detail: `posição 4 · módulo ${ident.mod}`,
    },
    { code: empresa, name: "identificação da empresa/órgão", detail: "posições 16–19" },
    {
      code: "livre",
      name: campoLivre,
      detail: "campo livre · posições 20–44 (identificador do cliente, referência, vencimento)",
    },
  ];

  const quanto = ident.efetivo ? formatBRL(centavos) : `${centavos} (quantidade de moeda)`;
  return {
    tipo: "arrecadacao",
    origem,
    barras,
    dvOk,
    campos,
    campoLivre,
    // Arrecadação NÃO tem fator de vencimento em posição fixa: quando existe,
    // o vencimento vive no campo livre, na convenção de cada concessionária.
    vencimento: null,
    resumo: `${segNome} · ${quanto} · sem fator de vencimento (a data, se houver, está no campo livre)`,
  };
}

/**
 * Lê 44 (código de barras), 47 (linha digitável bancária) ou 48 dígitos
 * (linha digitável de arrecadação). Devolve `null` quando não fecha.
 *
 * `frouxo` = modo "uma cifra só": o usuário já escolheu o boleto, então vale
 * mostrar o painel mesmo com o DV furado (prova inventada, dígito trocado).
 * No fan-out o DV é obrigatório — é ele que segura o ruído.
 */
export function lerBoleto(input: string, frouxo = false): BoletoInfo | null {
  const bruto = input.trim();
  // Só dígitos e os separadores que a linha digitável usa de verdade.
  if (!/^[\d\s.-]+$/.test(bruto)) return null;
  const d = bruto.replace(/\D/g, "");

  let barras: string;
  let origem: BoletoInfo["origem"];
  if (d.length === 44) {
    barras = d;
    origem = "código de barras (44)";
  } else if (d.length === 47) {
    if (d[3] !== "9") return null;
    const campos = [d.slice(0, 10), d.slice(10, 21), d.slice(21, 32)];
    // Os 3 DVs de campo são módulo 10 — nada de módulo 11 aqui.
    const camposOk = campos.every((c) => mod10(c.slice(0, -1)) === Number(c.slice(-1)));
    if (!camposOk && !frouxo) return null;
    barras = linha47ParaBarras(d);
    origem = "linha digitável (47)";
  } else if (d.length === 48) {
    if (d[0] !== "8") return null;
    const ident = IDENT_VALOR[d[2]];
    if (!ident) return null;
    const calc = ident.mod === 10 ? mod10 : mod11Arrecadacao;
    const blocos = [d.slice(0, 12), d.slice(12, 24), d.slice(24, 36), d.slice(36, 48)];
    const blocosOk = blocos.every((b) => calc(b.slice(0, -1)) === Number(b.slice(-1)));
    if (!blocosOk && !frouxo) return null;
    barras = linha48ParaBarras(d);
    origem = "linha digitável (48)";
  } else {
    return null;
  }

  const info = barras[0] === "8" ? lerArrecadacao(barras, origem) : lerBancario(barras, origem);
  if (!info) return null;
  if (!info.dvOk && !frouxo) return null;
  return info;
}
