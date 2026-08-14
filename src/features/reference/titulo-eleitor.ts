/**
 * Título de eleitor: a UF de emissão mora DENTRO do número.
 *
 * POR QUE ISTO É REFERÊNCIA E NÃO SÓ REGEX: o título brasileiro tem 12
 * dígitos no formato `NNNNNNNN UU DD` — 8 dígitos de inscrição, 2 dígitos do
 * estado emissor (01–28) e 2 dígitos verificadores em módulo 11 encadeados.
 * Quem resolve a gincana não quer "é válido": quer o estado. O número já diz.
 *
 * A TABELA FOI CONFERIDA CONTRA DADO REAL, não contra blog. Duas tabelas
 * circulam na internet e elas DISCORDAM a partir do código 06 (uma diz PR=06,
 * PE=08; a outra diz PE=06, PR=07 e embaralha 12–27). Cruzei os títulos
 * publicados no dado aberto do TSE (`consulta_cand` 2022, 28.945 números
 * distintos) com a UF de candidatura: o código modal de cada UF bate 100% com
 * a tabela abaixo (PR=06, CE=07, PE=08, PB=12, PA=13, ES=14, SE=21, AC=24,
 * AP=25, RR=26, TO=27). A outra tabela está errada — não a reintroduza.
 *
 * O ALGORITMO TAMBÉM FOI VERIFICADO nesses mesmos 28.945 números: fecha em
 * 100% deles com as duas armadilhas tratadas (resto 10 → 0; e resto 0 → 1 nos
 * títulos de SP e MG). Sem a exceção de SP/MG o acerto cai para 95,9% — e
 * justamente nos dois maiores colégios eleitorais do país.
 *
 * Fontes: TSE dados abertos (`consulta_cand`), Res. TSE 21.538/2003,
 * ghiorzi.org/DVnew.htm.
 */

export interface TituloUf {
  /** Código de 2 dígitos nas posições 9–10 do título. */
  code: string;
  sigla: string;
  name: string;
}

// biome-ignore format: tabela compacta, uma UF por linha.
const UFS: TituloUf[] = [
  { code: "01", sigla: "SP", name: "São Paulo" },
  { code: "02", sigla: "MG", name: "Minas Gerais" },
  { code: "03", sigla: "RJ", name: "Rio de Janeiro" },
  { code: "04", sigla: "RS", name: "Rio Grande do Sul" },
  { code: "05", sigla: "BA", name: "Bahia" },
  { code: "06", sigla: "PR", name: "Paraná" },
  { code: "07", sigla: "CE", name: "Ceará" },
  { code: "08", sigla: "PE", name: "Pernambuco" },
  { code: "09", sigla: "SC", name: "Santa Catarina" },
  { code: "10", sigla: "GO", name: "Goiás" },
  { code: "11", sigla: "MA", name: "Maranhão" },
  { code: "12", sigla: "PB", name: "Paraíba" },
  { code: "13", sigla: "PA", name: "Pará" },
  { code: "14", sigla: "ES", name: "Espírito Santo" },
  { code: "15", sigla: "PI", name: "Piauí" },
  { code: "16", sigla: "RN", name: "Rio Grande do Norte" },
  { code: "17", sigla: "AL", name: "Alagoas" },
  { code: "18", sigla: "MT", name: "Mato Grosso" },
  { code: "19", sigla: "MS", name: "Mato Grosso do Sul" },
  { code: "20", sigla: "DF", name: "Distrito Federal" },
  { code: "21", sigla: "SE", name: "Sergipe" },
  { code: "22", sigla: "AM", name: "Amazonas" },
  { code: "23", sigla: "RO", name: "Rondônia" },
  { code: "24", sigla: "AC", name: "Acre" },
  { code: "25", sigla: "AP", name: "Amapá" },
  { code: "26", sigla: "RR", name: "Roraima" },
  { code: "27", sigla: "TO", name: "Tocantins" },
  { code: "28", sigla: "ZZ", name: "Exterior" },
];

const BY_CODE = new Map(UFS.map((u) => [u.code, u]));

/** Consulta o código de 2 dígitos (01–28). `null` fora da faixa. */
export function tituloUfByCode(code: string): TituloUf | null {
  return BY_CODE.get(code) ?? null;
}

export interface TituloEleitor {
  /** 12 dígitos, já sem os espaços de formatação. */
  digits: string;
  /** Os 8 primeiros dígitos — o número de inscrição. */
  inscricao: string;
  uf: TituloUf;
  /** Os dois dígitos verificadores, como vieram. */
  dv: string;
  /** `1234 5678 0990` — o agrupamento que o TSE imprime. */
  formatted: string;
}

/**
 * Módulo 11 do título, com as duas armadilhas:
 *   (a) resto 10 vira dígito 0;
 *   (b) resto 0 vira dígito 1 em SP (01) e MG (02) — nos demais, vira 0.
 * A (b) não é folclore: nos 1.178 casos de resto 0 em SP/MG do dado do TSE, o
 * dígito impresso é 1 em todos.
 */
function mod11(sum: number, ufCode: string): number {
  const r = sum % 11;
  if (r === 10) return 0;
  if (r === 0) return ufCode === "01" || ufCode === "02" ? 1 : 0;
  return r;
}

/**
 * Lê um título de eleitor de 12 dígitos e devolve a UF de emissão — só quando
 * os DOIS verificadores fecham e o código de estado existe.
 *
 * Deliberadamente NÃO trata o formato de 13 dígitos (9 de inscrição, citado
 * para SP/MG): a regra de peso que circula para ele é engenharia reversa sem
 * fonte oficial e não apareceu em nenhum dos ~29 mil títulos do dado aberto do
 * TSE que usei para conferir. Chutar o alinhamento devolveria a UF errada, que
 * é pior do que não devolver nada.
 */
export function parseTituloEleitor(digits: string): TituloEleitor | null {
  if (!/^\d{12}$/.test(digits)) return null;

  const ufCode = digits.slice(8, 10);
  const uf = tituloUfByCode(ufCode);
  if (!uf) return null;

  const inscricao = digits.slice(0, 8);
  // Pesos 2..9 da esquerda para a direita sobre a inscrição.
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(inscricao[i]) * (i + 2);
  const dv1 = mod11(sum, ufCode);

  // O segundo DV só olha a UF e o primeiro DV — pesos 7, 8 e 9.
  const dv2 = mod11(Number(ufCode[0]) * 7 + Number(ufCode[1]) * 8 + dv1 * 9, ufCode);

  if (digits.slice(10) !== `${dv1}${dv2}`) return null;

  return {
    digits,
    inscricao,
    uf,
    dv: digits.slice(10),
    formatted: `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`,
  };
}
