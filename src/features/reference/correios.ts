/**
 * Rastreio postal no padrão S10 da UPU (União Postal Universal) — a norma
 * S10-12 (2018) que os Correios e todos os operadores designados seguem.
 *
 * Formato: 2 letras (indicador de serviço) + 8 dígitos (série) + 1 dígito
 * verificador + 2 letras (país de postagem, ISO 3166-1 alfa-2).
 *
 * O DV e o país são FATO da norma. O serviço vem da tabela 5.6 da própria S10,
 * que classifica por *tipo de produto* (EMS, carta registrada, encomenda…) —
 * não por serviço comercial: SEDEX e PAC são nomes que o operador local dá
 * dentro da faixa doméstica, e não constam da norma. Por isso a faixa
 * doméstica é rotulada como tal, sem chutar o produto dos Correios.
 */

/** Item de resultado genérico, no mesmo formato do render "code-list". */
export interface S10Hit {
  code: string;
  name: string;
  detail?: string;
}

/** Como a norma trata a faixa do indicador de serviço (tabela 5.6 + nota 1). */
export type S10Kind = "universal" | "domestic" | "reserved" | "unassigned";

export interface S10Service {
  /** Faixa como aparece na norma, ex. "RA–RZ". */
  range: string;
  label: string;
  kind: S10Kind;
  note?: string;
}

// Faixas do indicador de serviço — S10-12, tabela 5.6 e nota de rodapé 1.
// Comparação lexical de duas letras; toda faixa começa e termina na mesma
// inicial, então "CA" <= x <= "CZ" resolve sem aritmética de alfabeto.
// biome-ignore format: tabela compacta.
const SERVICES: [lo: string, hi: string, svc: S10Service][] = [
  ["AV", "AZ", { range: "AV–AZ", label: "uso doméstico/bilateral", kind: "domestic", note: "em princípio, itens rastreados por RFID" }],
  ["BA", "BZ", { range: "BA–BZ", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["CA", "CZ", { range: "CA–CZ", label: "encomenda (parcel post)", kind: "universal", note: "CV costuma indicar encomenda com valor declarado, mas a norma não obriga" }],
  ["DA", "DZ", { range: "DA–DZ", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["EA", "EZ", { range: "EA–EZ", label: "EMS — expressa internacional", kind: "universal" }],
  ["GA", "GA", { range: "GA", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["GD", "GD", { range: "GD", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["HA", "HZ", { range: "HA–HZ", label: "encomenda ECOMPRO (comércio eletrônico)", kind: "universal" }],
  ["JA", "JZ", { range: "JA–JZ", label: "faixa reservada", kind: "reserved" }],
  ["KA", "KZ", { range: "KA–KZ", label: "faixa reservada", kind: "reserved" }],
  ["LA", "LZ", { range: "LA–LZ", label: "carta com rastreamento", kind: "universal" }],
  ["MA", "MZ", { range: "MA–MZ", label: "saca M (M bag)", kind: "universal" }],
  ["NA", "NZ", { range: "NA–NZ", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["PA", "PZ", { range: "PA–PZ", label: "uso doméstico/bilateral", kind: "domestic" }],
  ["QA", "QM", { range: "QA–QM", label: "IBRS — resposta comercial internacional", kind: "universal" }],
  ["RA", "RZ", { range: "RA–RZ", label: "carta registrada", kind: "universal" }],
  ["SA", "SZ", { range: "SA–SZ", label: "faixa reservada", kind: "reserved" }],
  ["TA", "TZ", { range: "TA–TZ", label: "faixa reservada", kind: "reserved" }],
  ["UA", "UZ", { range: "UA–UZ", label: "objeto de carta com mercadoria", kind: "universal" }],
  ["VA", "VZ", { range: "VA–VZ", label: "carta com valor declarado", kind: "universal" }],
  ["WA", "WZ", { range: "WA–WZ", label: "faixa reservada", kind: "reserved" }],
  ["ZA", "ZZ", { range: "ZA–ZZ", label: "uso doméstico/bilateral", kind: "domestic" }],
];

/** Classifica o indicador de serviço (2 letras) pela tabela 5.6 da S10. */
export function s10Service(indicator: string): S10Service {
  for (const [lo, hi, svc] of SERVICES) {
    if (indicator >= lo && indicator <= hi) return svc;
  }
  return { range: indicator, label: "faixa não atribuída", kind: "unassigned" };
}

// Países ISO 3166-1 alfa-2 (os 249 códigos atribuídos), nomes em pt-BR gerados
// a partir do ICU — tabela congelada aqui para o decoder seguir puro e síncrono.
// biome-ignore format: tabela compacta.
const COUNTRIES: Record<string, string> = {
  "AD": "Andorra", "AE": "Emirados Árabes Unidos", "AF": "Afeganistão", "AG": "Antígua e Barbuda",
  "AI": "Anguila", "AL": "Albânia", "AM": "Armênia", "AO": "Angola",
  "AQ": "Antártida", "AR": "Argentina", "AS": "Samoa Americana", "AT": "Áustria",
  "AU": "Austrália", "AW": "Aruba", "AX": "Ilhas Aland", "AZ": "Azerbaijão",
  "BA": "Bósnia e Herzegovina", "BB": "Barbados", "BD": "Bangladesh", "BE": "Bélgica",
  "BF": "Burquina Faso", "BG": "Bulgária", "BH": "Barein", "BI": "Burundi",
  "BJ": "Benin", "BL": "São Bartolomeu", "BM": "Bermudas", "BN": "Brunei",
  "BO": "Bolívia", "BQ": "Países Baixos Caribenhos", "BR": "Brasil", "BS": "Bahamas",
  "BT": "Butão", "BV": "Ilha Bouvet", "BW": "Botsuana", "BY": "Bielorrússia",
  "BZ": "Belize", "CA": "Canadá", "CC": "Ilhas Cocos (Keeling)", "CD": "Congo - Kinshasa",
  "CF": "República Centro-Africana", "CG": "República do Congo", "CH": "Suíça", "CI": "Costa do Marfim",
  "CK": "Ilhas Cook", "CL": "Chile", "CM": "Camarões", "CN": "China",
  "CO": "Colômbia", "CR": "Costa Rica", "CU": "Cuba", "CV": "Cabo Verde",
  "CW": "Curaçao", "CX": "Ilha Christmas", "CY": "Chipre", "CZ": "Tchéquia",
  "DE": "Alemanha", "DJ": "Djibuti", "DK": "Dinamarca", "DM": "Dominica",
  "DO": "República Dominicana", "DZ": "Argélia", "EC": "Equador", "EE": "Estônia",
  "EG": "Egito", "EH": "Saara Ocidental", "ER": "Eritreia", "ES": "Espanha",
  "ET": "Etiópia", "FI": "Finlândia", "FJ": "Fiji", "FK": "Ilhas Malvinas",
  "FM": "Micronésia", "FO": "Ilhas Faroé", "FR": "França", "GA": "Gabão",
  "GB": "Reino Unido", "GD": "Granada", "GE": "Geórgia", "GF": "Guiana Francesa",
  "GG": "Guernsey", "GH": "Gana", "GI": "Gibraltar", "GL": "Groenlândia",
  "GM": "Gâmbia", "GN": "Guiné", "GP": "Guadalupe", "GQ": "Guiné Equatorial",
  "GR": "Grécia", "GS": "Ilhas Geórgia do Sul e Sandwich do Sul", "GT": "Guatemala", "GU": "Guam",
  "GW": "Guiné-Bissau", "GY": "Guiana", "HK": "Hong Kong, RAE da China", "HM": "Ilhas Heard e McDonald",
  "HN": "Honduras", "HR": "Croácia", "HT": "Haiti", "HU": "Hungria",
  "ID": "Indonésia", "IE": "Irlanda", "IL": "Israel", "IM": "Ilha de Man",
  "IN": "Índia", "IO": "Território Britânico do Oceano Índico", "IQ": "Iraque", "IR": "Irã",
  "IS": "Islândia", "IT": "Itália", "JE": "Jersey", "JM": "Jamaica",
  "JO": "Jordânia", "JP": "Japão", "KE": "Quênia", "KG": "Quirguistão",
  "KH": "Camboja", "KI": "Quiribati", "KM": "Comores", "KN": "São Cristóvão e Névis",
  "KP": "Coreia do Norte", "KR": "Coreia do Sul", "KW": "Kuwait", "KY": "Ilhas Cayman",
  "KZ": "Cazaquistão", "LA": "Laos", "LB": "Líbano", "LC": "Santa Lúcia",
  "LI": "Liechtenstein", "LK": "Sri Lanka", "LR": "Libéria", "LS": "Lesoto",
  "LT": "Lituânia", "LU": "Luxemburgo", "LV": "Letônia", "LY": "Líbia",
  "MA": "Marrocos", "MC": "Mônaco", "MD": "Moldávia", "ME": "Montenegro",
  "MF": "São Martinho", "MG": "Madagascar", "MH": "Ilhas Marshall", "MK": "Macedônia do Norte",
  "ML": "Mali", "MM": "Mianmar (Birmânia)", "MN": "Mongólia", "MO": "Macau, RAE da China",
  "MP": "Ilhas Marianas do Norte", "MQ": "Martinica", "MR": "Mauritânia", "MS": "Montserrat",
  "MT": "Malta", "MU": "Maurício", "MV": "Maldivas", "MW": "Malaui",
  "MX": "México", "MY": "Malásia", "MZ": "Moçambique", "NA": "Namíbia",
  "NC": "Nova Caledônia", "NE": "Níger", "NF": "Ilha Norfolk", "NG": "Nigéria",
  "NI": "Nicarágua", "NL": "Países Baixos", "NO": "Noruega", "NP": "Nepal",
  "NR": "Nauru", "NU": "Niue", "NZ": "Nova Zelândia", "OM": "Omã",
  "PA": "Panamá", "PE": "Peru", "PF": "Polinésia Francesa", "PG": "Papua-Nova Guiné",
  "PH": "Filipinas", "PK": "Paquistão", "PL": "Polônia", "PM": "São Pedro e Miquelão",
  "PN": "Ilhas Pitcairn", "PR": "Porto Rico", "PS": "Territórios palestinos", "PT": "Portugal",
  "PW": "Palau", "PY": "Paraguai", "QA": "Catar", "RE": "Reunião",
  "RO": "Romênia", "RS": "Sérvia", "RU": "Rússia", "RW": "Ruanda",
  "SA": "Arábia Saudita", "SB": "Ilhas Salomão", "SC": "Seicheles", "SD": "Sudão",
  "SE": "Suécia", "SG": "Singapura", "SH": "Santa Helena", "SI": "Eslovênia",
  "SJ": "Svalbard e Jan Mayen", "SK": "Eslováquia", "SL": "Serra Leoa", "SM": "San Marino",
  "SN": "Senegal", "SO": "Somália", "SR": "Suriname", "SS": "Sudão do Sul",
  "ST": "São Tomé e Príncipe", "SV": "El Salvador", "SX": "Sint Maarten", "SY": "Síria",
  "SZ": "Essuatíni", "TC": "Ilhas Turcas e Caicos", "TD": "Chade", "TF": "Territórios Franceses do Sul",
  "TG": "Togo", "TH": "Tailândia", "TJ": "Tadjiquistão", "TK": "Tokelau",
  "TL": "Timor-Leste", "TM": "Turcomenistão", "TN": "Tunísia", "TO": "Tonga",
  "TR": "Turquia", "TT": "Trinidad e Tobago", "TV": "Tuvalu", "TW": "Taiwan",
  "TZ": "Tanzânia", "UA": "Ucrânia", "UG": "Uganda", "UM": "Ilhas Menores Distantes dos EUA",
  "US": "Estados Unidos", "UY": "Uruguai", "UZ": "Uzbequistão", "VA": "Cidade do Vaticano",
  "VC": "São Vicente e Granadinas", "VE": "Venezuela", "VG": "Ilhas Virgens Britânicas", "VI": "Ilhas Virgens Americanas",
  "VN": "Vietnã", "VU": "Vanuatu", "WF": "Wallis e Futuna", "WS": "Samoa",
  "YE": "Iêmen", "YT": "Mayotte", "ZA": "África do Sul", "ZM": "Zâmbia",
  "ZW": "Zimbábue",};

/** Nome pt-BR do país de postagem, ou null se as 2 letras não são ISO 3166-1. */
export function s10Country(code: string): string | null {
  return COUNTRIES[code] ?? null;
}

/** Pesos do módulo 11 ponderado da S10, cláusula 5.4. */
const WEIGHTS = [8, 6, 4, 2, 3, 5, 9, 7];

export interface S10CheckDigit {
  digit: number;
  /** Soma ponderada, para mostrar a conta na tela. */
  sum: number;
  remainder: number;
}

/**
 * DV do padrão S10 (cláusula 5.4): soma ponderada pelos pesos 8 6 4 2 3 5 9 7,
 * resto por 11, DV = 11 − resto. Os dois casos de borda são da própria norma:
 * resultado 10 vira 0, resultado 11 (resto zero) vira 5.
 */
export function s10CheckDigit(serial: string): S10CheckDigit {
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(serial[i]) * WEIGHTS[i];
  const remainder = sum % 11;
  const raw = 11 - remainder;
  return { digit: raw === 10 ? 0 : raw === 11 ? 5 : raw, sum, remainder };
}
