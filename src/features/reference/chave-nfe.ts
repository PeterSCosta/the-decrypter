/**
 * Chave de acesso dos documentos fiscais eletrônicos (NF-e, NFC-e, CT-e,
 * MDF-e, CF-e-SAT…): 44 posições que carregam UF, mês/ano e o CNPJ do emitente.
 *
 * Serve ao decoder `chave-nfe`. Uma única string encontrada numa nota de
 * padaria entrega três camadas de cifra — e o CNPJ extraído encadeia direto no
 * decoder `documento`.
 *
 * Fontes: manual de integração da NF-e (composição dos campos), NT Conjunta
 * 2025.001 (CNPJ alfanumérico) e o cálculo do cDV publicado pela NS Tecnologia.
 */

import { formatCnpj, isValidCnpj } from "@/features/documents/validate";
import type { CodeHit } from "./phone-codes";

/** Código de UF do IBGE (posições 1–2 da chave) → sigla e nome. */
// biome-ignore format: tabela compacta.
export const UF_BY_CUF: Record<string, [sigla: string, nome: string]> = {
  "11": ["RO", "Rondônia"],   "12": ["AC", "Acre"],      "13": ["AM", "Amazonas"],
  "14": ["RR", "Roraima"],    "15": ["PA", "Pará"],      "16": ["AP", "Amapá"],
  "17": ["TO", "Tocantins"],
  "21": ["MA", "Maranhão"],   "22": ["PI", "Piauí"],     "23": ["CE", "Ceará"],
  "24": ["RN", "Rio Grande do Norte"], "25": ["PB", "Paraíba"], "26": ["PE", "Pernambuco"],
  "27": ["AL", "Alagoas"],    "28": ["SE", "Sergipe"],   "29": ["BA", "Bahia"],
  "31": ["MG", "Minas Gerais"], "32": ["ES", "Espírito Santo"], "33": ["RJ", "Rio de Janeiro"],
  "35": ["SP", "São Paulo"],
  "41": ["PR", "Paraná"],     "42": ["SC", "Santa Catarina"], "43": ["RS", "Rio Grande do Sul"],
  "50": ["MS", "Mato Grosso do Sul"], "51": ["MT", "Mato Grosso"], "52": ["GO", "Goiás"],
  "53": ["DF", "Distrito Federal"],
};

/** Modelo do documento (posições 21–22) → sigla e nome. */
// biome-ignore format: tabela compacta.
export const MODELOS: Record<string, [sigla: string, nome: string]> = {
  "55": ["NF-e", "Nota Fiscal Eletrônica"],
  "57": ["CT-e", "Conhecimento de Transporte Eletrônico"],
  "58": ["MDF-e", "Manifesto Eletrônico de Documentos Fiscais"],
  "59": ["CF-e-SAT", "Cupom Fiscal Eletrônico (SAT)"],
  "62": ["NFCom", "Nota Fiscal de Serviços de Comunicação"],
  "63": ["BP-e", "Bilhete de Passagem Eletrônico"],
  "64": ["GTV-e", "Guia de Transporte de Valores Eletrônica"],
  "65": ["NFC-e", "Nota Fiscal de Consumidor Eletrônica"],
  "66": ["NF3e", "Nota Fiscal de Energia Elétrica Eletrônica"],
  "67": ["CT-e OS", "Conhecimento de Transporte Eletrônico para Outros Serviços"],
};

/**
 * Tipo de emissão (posição 35). Contingência varia por documento e a tabela
 * cresce a cada nota técnica — código desconhecido **não invalida** a leitura,
 * só fica sem rótulo.
 */
// biome-ignore format: tabela compacta.
export const TP_EMIS: Record<string, string> = {
  "1": "emissão normal",
  "2": "contingência FS-IA (formulário de segurança)",
  "3": "contingência SCAN",
  "4": "contingência EPEC / DPEC",
  "5": "contingência FS-DA (formulário de segurança)",
  "6": "contingência SVC-AN",
  "7": "contingência SVC-RS",
  "8": "contingência SVC-SP",
  "9": "contingência off-line (NFC-e)",
};

// biome-ignore format: tabela compacta.
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * Prefixo do atributo `Id` do XML (`Id="NFe4317…"`). Aceito porque a equipe
 * costuma achar a chave dentro do arquivo, não só impressa no DANFE.
 */
const ID_PREFIX = /^(NFe|CTe|MDFe|CFe|BPe|NF3e|NFCom|GTVe)/i;

/**
 * Valor de cada caractere no módulo 11: `ASCII − 48`. Dígitos seguem valendo
 * 0–9 e as letras do CNPJ alfanumérico valem 17 (A) a 42 (Z) — a mesma regra
 * que `documents/validate.ts` já usa no DV do CNPJ.
 */
const charValue = (ch: string) => ch.charCodeAt(0) - 48;

/**
 * Dígito verificador da chave: módulo 11 sobre as 43 primeiras posições, com
 * pesos 2..9 ciclando da direita para a esquerda. Resto 0 ou 1 → DV 0.
 */
export function chaveDv(base43: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += charValue(base43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export interface ChaveAcesso {
  /** As 44 posições já limpas (maiúsculas, sem separadores). */
  raw: string;
  cUF: string;
  ufSigla: string;
  ufNome: string;
  ano: number;
  mes: number;
  /** CNPJ do emitente sem formatação (pode conter letras a partir de 2026). */
  cnpj: string;
  cnpjAlfanumerico: boolean;
  modelo: string;
  modeloSigla: string;
  /** Série + número + tipo de emissão. Ausentes no CF-e-SAT, que usa outro corte. */
  serie?: string;
  numero?: string;
  tpEmis?: string;
  /** Só no CF-e-SAT (modelo 59): nº de série do equipamento e nº do cupom. */
  serieSat?: string;
  numeroCf?: string;
  cNF: string;
  cDV: string;
  /** Uma linha por campo, pronta para o card `code-list`. */
  campos: CodeHit[];
  /** Resumo de uma linha (o que a equipe copia). */
  resumo: string;
}

/** Só dígitos até o CNPJ, que a partir de 2026 pode trazer letras (posições 7–20). */
const SHAPE = /^\d{6}[0-9A-Z]{14}\d{24}$/;

/**
 * Normaliza a entrada: tira separadores comuns (a chave é impressa em blocos
 * de quatro) e o prefixo do `Id` do XML.
 */
export function cleanChave(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(ID_PREFIX, "")
    .replace(/[\s.\-/]/g, "");
}

/**
 * Fatia a chave nos campos oficiais — ou devolve `null` quando o gate não
 * fecha.
 *
 * O gate tem cinco travas (44 posições no formato certo, cUF do IBGE, mês
 * 01–12, modelo conhecido, DV do CNPJ do emitente e cDV da chave) porque "44
 * dígitos" sozinho é também o código de barras do boleto bancário. Medido numa
 * sonda de 300 mil boletos plausíveis: sem a trava do CNPJ escapava 1 em 773
 * (o "23" do Bradesco é o código de UF do Ceará); com ela, nenhum.
 *
 * A trava do CNPJ não rejeita chave real nenhuma — toda chave emitida carrega
 * o CNPJ verdadeiro do emitente. Só recusaria uma chave inventada à mão com
 * CNPJ falso, e nesse caso o cDV também não fecharia.
 */
export function parseChaveAcesso(input: string): ChaveAcesso | null {
  const raw = cleanChave(input);
  if (raw.length !== 44 || !SHAPE.test(raw)) return null;

  const cUF = raw.slice(0, 2);
  const uf = UF_BY_CUF[cUF];
  if (!uf) return null;

  const aa = Number(raw.slice(2, 4));
  const mes = Number(raw.slice(4, 6));
  if (mes < 1 || mes > 12) return null;

  const modelo = raw.slice(20, 22);
  const mod = MODELOS[modelo];
  if (!mod) return null;

  const cnpj = raw.slice(6, 20);
  if (!isValidCnpj(cnpj)) return null;

  const cDV = raw.slice(43);
  if (String(chaveDv(raw.slice(0, 43))) !== cDV) return null;

  const cnpjAlfanumerico = /[A-Z]/.test(cnpj);
  const ano = 2000 + aa;
  const emissao = `${MESES[mes - 1]} de ${ano}`;
  const cnpjTxt = formatCnpj(cnpj) + (cnpjAlfanumerico ? " (alfanumérico)" : "");

  const campos: CodeHit[] = [
    { code: "1", name: `cUF ${cUF} — ${uf[1]} (${uf[0]})`, detail: "UF do emitente · 1–2" },
    {
      code: "2",
      name: `AAMM ${raw.slice(2, 6)} — ${emissao}`,
      detail: "ano e mês da emissão · 3–6",
    },
    { code: "3", name: `CNPJ ${cnpjTxt}`, detail: "emitente · 7–20" },
    {
      code: "4",
      name: `mod ${modelo} — ${mod[0]}, ${mod[1]}`,
      detail: "modelo do documento · 21–22",
    },
  ];

  const chave: ChaveAcesso = {
    raw,
    cUF,
    ufSigla: uf[0],
    ufNome: uf[1],
    ano,
    mes,
    cnpj,
    cnpjAlfanumerico,
    modelo,
    modeloSigla: mod[0],
    cNF: "",
    cDV,
    campos,
    resumo: "",
  };

  if (modelo === "59") {
    // O CF-e-SAT troca série/número/tpEmis pelo nº de série do equipamento SAT
    // e pelo nº do cupom — mesmo tamanho total, corte diferente.
    const serieSat = raw.slice(22, 31);
    const numeroCf = raw.slice(31, 37);
    chave.serieSat = serieSat;
    chave.numeroCf = numeroCf;
    chave.cNF = raw.slice(37, 43);
    campos.push(
      {
        code: "5",
        name: `nserieSAT ${serieSat}`,
        detail: "nº de série do equipamento SAT · 23–31",
      },
      { code: "6", name: `nCF ${fmtNum(numeroCf)}`, detail: "nº do cupom fiscal · 32–37" },
      { code: "7", name: `cNF ${chave.cNF}`, detail: "código numérico · 38–43" },
    );
    chave.resumo = `${mod[0]} nº ${fmtNum(numeroCf)} · SAT ${serieSat} · ${uf[0]} · ${emissao} · CNPJ ${formatCnpj(cnpj)}`;
  } else {
    const serie = raw.slice(22, 25);
    const numero = raw.slice(25, 34);
    const tpEmis = raw.slice(34, 35);
    chave.serie = serie;
    chave.numero = numero;
    chave.tpEmis = tpEmis;
    chave.cNF = raw.slice(35, 43);
    const tp = TP_EMIS[tpEmis];
    campos.push(
      { code: "5", name: `série ${fmtNum(serie)}`, detail: "série do documento · 23–25" },
      { code: "6", name: `nNF ${fmtNum(numero)}`, detail: "nº do documento · 26–34" },
      {
        code: "7",
        name: `tpEmis ${tpEmis}${tp ? ` — ${tp}` : ""}`,
        detail: "tipo de emissão · 35",
      },
      { code: "8", name: `cNF ${chave.cNF}`, detail: "código numérico · 36–43" },
    );
    chave.resumo = `${mod[0]} nº ${fmtNum(numero)}, série ${fmtNum(serie)} · ${uf[0]} · ${emissao} · CNPJ ${formatCnpj(cnpj)}`;
  }

  campos.push({
    code: String(campos.length + 1),
    name: `cDV ${cDV} — confere (módulo 11)`,
    detail: "dígito verificador · 44",
  });
  return chave;
}

/**
 * Zeros à esquerda somem e o milhar ganha ponto: "000012014" → "12.014".
 * Separador na mão (e não `toLocaleString`) para não depender do ICU do runtime.
 */
function fmtNum(value: string): string {
  return String(Number(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
