/**
 * ISO 4217 — códigos de moeda. Fecha a cadeia "país → moeda → símbolo/valor"
 * que uma prova de gincana costuma armar: `USD` → dólar americano · $ · 840 ·
 * Estados Unidos (e mais uma dúzia de territórios que dolarizaram).
 *
 * Lista ativa em 1º de janeiro de 2026 (178 códigos, incluindo os de fundo, os
 * metais e os especiais X__). A norma muda: as mexidas recentes já estão aqui —
 * BGN saiu com a entrada da Bulgária no euro (2026-01-01), ANG virou XCG
 * (2025), ZWL virou ZWG (2024), SLL virou SLE, HRK virou EUR (2023).
 * Fonte: tabela ISO 4217 mantida pelo SIX Group (via Wikipédia, jan/2026).
 */

export interface Currency {
  /** Código alfabético de 3 letras (USD). */
  code: string;
  /** Código numérico de 3 dígitos, com zero à esquerda (840, 008). */
  num: string;
  /** Casas decimais da unidade menor; `null` = não se aplica (ouro, DES). */
  digits: number | null;
  /** Nome em pt-BR. */
  name: string;
  /** Símbolo usual; vazio nos códigos sem símbolo (fundos, metais). */
  symbol: string;
  /** Países e territórios que a usam, em pt-BR. */
  places: string;
}

// [código, num, casas, nome, símbolo, países]
// biome-ignore format: tabela compacta.
const TABLE: [string, string, number | null, string, string, string][] = [
  ["AED", "784", 2, "dirham dos Emirados Árabes Unidos", "د.إ", "Emirados Árabes Unidos"],
  ["AFN", "971", 2, "afegani afegão", "؋", "Afeganistão"],
  ["ALL", "008", 2, "lek albanês", "L", "Albânia"],
  ["AMD", "051", 2, "dram armênio", "֏", "Armênia"],
  ["AOA", "973", 2, "kwanza angolano", "Kz", "Angola"],
  ["ARS", "032", 2, "peso argentino", "$", "Argentina"],
  ["AUD", "036", 2, "dólar australiano", "$", "Austrália, Ilha Christmas, Ilhas Cocos, Ilhas Heard e McDonald, Kiribati, Nauru, Ilha Norfolk, Tuvalu"],
  ["AWG", "533", 2, "florim de Aruba", "ƒ", "Aruba"],
  ["AZN", "944", 2, "manat azerbaijano", "₼", "Azerbaijão"],
  ["BAM", "977", 2, "marco conversível", "KM", "Bósnia e Herzegovina"],
  ["BBD", "052", 2, "dólar de Barbados", "$", "Barbados"],
  ["BDT", "050", 2, "taka bengalesa", "৳", "Bangladesh"],
  ["BHD", "048", 3, "dinar bareinita", "BD", "Bahrein"],
  ["BIF", "108", 0, "franco burundinês", "FBu", "Burundi"],
  ["BMD", "060", 2, "dólar bermudense", "$", "Bermudas (paridade 1:1 com o dólar americano)"],
  ["BND", "096", 2, "dólar de Brunei", "$", "Brunei"],
  ["BOB", "068", 2, "boliviano", "Bs", "Bolívia"],
  ["BOV", "984", 2, "Mvdol boliviano (código de fundo)", "", "Bolívia"],
  ["BRL", "986", 2, "real", "R$", "Brasil"],
  ["BSD", "044", 2, "dólar bahamense", "$", "Bahamas (paridade 1:1 com o dólar americano)"],
  ["BTN", "064", 2, "ngultrum butanês", "Nu", "Butão"],
  ["BWP", "072", 2, "pula botsuanesa", "P", "Botsuana"],
  ["BYN", "933", 2, "rublo bielorrusso", "Br", "Belarus (Bielorrússia)"],
  ["BZD", "084", 2, "dólar belizenho", "$", "Belize"],
  ["CAD", "124", 2, "dólar canadense", "$", "Canadá"],
  ["CDF", "976", 2, "franco congolês", "FC", "República Democrática do Congo"],
  ["CHE", "947", 2, "euro WIR (moeda complementar)", "", "Suíça"],
  ["CHF", "756", 2, "franco suíço", "Fr", "Suíça, Liechtenstein"],
  ["CHW", "948", 2, "franco WIR (moeda complementar)", "", "Suíça"],
  ["CLF", "990", 4, "Unidad de Fomento (código de fundo)", "", "Chile"],
  ["CLP", "152", 0, "peso chileno", "$", "Chile"],
  ["CNY", "156", 2, "yuan renminbi", "¥", "China"],
  ["COP", "170", 2, "peso colombiano", "$", "Colômbia"],
  ["COU", "970", 2, "Unidad de Valor Real (código de fundo)", "", "Colômbia"],
  ["CRC", "188", 2, "colón costarriquenho", "₡", "Costa Rica"],
  ["CUP", "192", 2, "peso cubano", "$", "Cuba"],
  ["CVE", "132", 2, "escudo cabo-verdiano", "$", "Cabo Verde"],
  ["CZK", "203", 2, "coroa tcheca", "Kč", "Tchéquia"],
  ["DJF", "262", 0, "franco djibutiano", "Fdj", "Djibuti"],
  ["DKK", "208", 2, "coroa dinamarquesa", "kr", "Dinamarca, Ilhas Faroé, Groenlândia"],
  ["DOP", "214", 2, "peso dominicano", "$", "República Dominicana"],
  ["DZD", "012", 2, "dinar argelino", "DA", "Argélia"],
  ["EGP", "818", 2, "libra egípcia", "E£", "Egito"],
  ["ERN", "232", 2, "nakfa eritreia", "Nkf", "Eritreia"],
  ["ETB", "230", 2, "birr etíope", "Br", "Etiópia"],
  ["EUR", "978", 2, "euro", "€", "Zona do euro: Alemanha, Áustria, Bélgica, Bulgária (desde 2026), Chipre, Croácia, Eslováquia, Eslovênia, Espanha, Estônia, Finlândia, França, Grécia, Irlanda, Itália, Letônia, Lituânia, Luxemburgo, Malta, Países Baixos e Portugal — e também Andorra, Kosovo, Mônaco, Montenegro, San Marino e Vaticano"],
  ["FJD", "242", 2, "dólar fijiano", "$", "Fiji"],
  ["FKP", "238", 2, "libra das Malvinas", "£", "Ilhas Malvinas (Falkland) (paridade 1:1 com a libra esterlina)"],
  ["GBP", "826", 2, "libra esterlina", "£", "Reino Unido, Ilha de Man, Jersey, Guernsey, Tristão da Cunha"],
  ["GEL", "981", 2, "lari georgiano", "₾", "Geórgia"],
  ["GHS", "936", 2, "cedi ganês", "₵", "Gana"],
  ["GIP", "292", 2, "libra de Gibraltar", "£", "Gibraltar (paridade 1:1 com a libra esterlina)"],
  ["GMD", "270", 2, "dalasi gambiano", "D", "Gâmbia"],
  ["GNF", "324", 0, "franco guineense", "Fr", "Guiné"],
  ["GTQ", "320", 2, "quetzal guatemalteco", "Q", "Guatemala"],
  ["GYD", "328", 2, "dólar guianense", "$", "Guiana"],
  ["HKD", "344", 2, "dólar de Hong Kong", "$", "Hong Kong"],
  ["HNL", "340", 2, "lempira hondurenha", "L", "Honduras"],
  ["HTG", "332", 2, "gourde haitiano", "G", "Haiti"],
  ["HUF", "348", 2, "florim húngaro (forint)", "Ft", "Hungria"],
  ["IDR", "360", 2, "rupia indonésia", "Rp", "Indonésia"],
  ["ILS", "376", 2, "novo shekel israelense", "₪", "Israel"],
  ["INR", "356", 2, "rupia indiana", "₹", "Índia, Butão"],
  ["IQD", "368", 3, "dinar iraquiano", "ID", "Iraque"],
  ["IRR", "364", 2, "rial iraniano", "﷼", "Irã"],
  ["ISK", "352", 0, "coroa islandesa", "kr", "Islândia"],
  ["JMD", "388", 2, "dólar jamaicano", "$", "Jamaica"],
  ["JOD", "400", 3, "dinar jordaniano", "JD", "Jordânia"],
  ["JPY", "392", 0, "iene japonês", "¥", "Japão"],
  ["KES", "404", 2, "xelim queniano", "Sh", "Quênia"],
  ["KGS", "417", 2, "som quirguiz", "⃀", "Quirguistão"],
  ["KHR", "116", 2, "riel cambojano", "៛", "Camboja"],
  ["KMF", "174", 0, "franco comorense", "FC", "Comores"],
  ["KPW", "408", 2, "won norte-coreano", "₩", "Coreia do Norte"],
  ["KRW", "410", 0, "won sul-coreano", "₩", "Coreia do Sul"],
  ["KWD", "414", 3, "dinar kuwaitiano", "KD", "Kuwait"],
  ["KYD", "136", 2, "dólar das Ilhas Cayman", "$", "Ilhas Cayman"],
  ["KZT", "398", 2, "tenge cazaque", "₸", "Cazaquistão"],
  ["LAK", "418", 2, "kip laosiano", "₭", "Laos"],
  ["LBP", "422", 2, "libra libanesa", "LL", "Líbano"],
  ["LKR", "144", 2, "rupia cingalesa", "Rs", "Sri Lanka"],
  ["LRD", "430", 2, "dólar liberiano", "$", "Libéria"],
  ["LSL", "426", 2, "loti lesotense", "L", "Lesoto"],
  ["LYD", "434", 3, "dinar líbio", "LD", "Líbia"],
  ["MAD", "504", 2, "dirham marroquino", "DH", "Marrocos, Saara Ocidental"],
  ["MDL", "498", 2, "leu moldávio", "L", "Moldávia"],
  ["MGA", "969", 2, "ariary malgaxe", "Ar", "Madagascar"],
  ["MKD", "807", 2, "denar macedônio", "DEN", "Macedônia do Norte"],
  ["MMK", "104", 2, "kyat birmanês", "K", "Mianmar"],
  ["MNT", "496", 2, "tugrik mongol", "₮", "Mongólia"],
  ["MOP", "446", 2, "pataca de Macau", "MOP$", "Macau"],
  ["MRU", "929", 2, "uguia mauritana", "UM", "Mauritânia"],
  ["MUR", "480", 2, "rupia mauriciana", "Rs", "Maurício"],
  ["MVR", "462", 2, "rupia maldiva (rufiyaa)", "Rf", "Maldivas"],
  ["MWK", "454", 2, "kwacha malauiana", "K", "Malaui"],
  ["MXN", "484", 2, "peso mexicano", "$", "México"],
  ["MXV", "979", 2, "Unidad de Inversión — UDI (código de fundo)", "", "México"],
  ["MYR", "458", 2, "ringgit malaio", "RM", "Malásia"],
  ["MZN", "943", 2, "metical moçambicano", "MT", "Moçambique"],
  ["NAD", "516", 2, "dólar namibiano", "$", "Namíbia (paridade 1:1 com o rand)"],
  ["NGN", "566", 2, "naira nigeriana", "₦", "Nigéria"],
  ["NIO", "558", 2, "córdoba nicaraguense", "C$", "Nicarágua"],
  ["NOK", "578", 2, "coroa norueguesa", "kr", "Noruega, Svalbard e Jan Mayen, Ilha Bouvet"],
  ["NPR", "524", 2, "rupia nepalesa", "रु", "Nepal"],
  ["NZD", "554", 2, "dólar neozelandês", "$", "Nova Zelândia, Ilhas Cook, Niue, Ilhas Pitcairn, Toquelau"],
  ["OMR", "512", 3, "rial omanense", "ر.ع.", "Omã"],
  ["PAB", "590", 2, "balboa panamenho", "B/", "Panamá (paridade 1:1 com o dólar americano)"],
  ["PEN", "604", 2, "sol peruano", "S/", "Peru"],
  ["PGK", "598", 2, "kina papuásia", "K", "Papua-Nova Guiné"],
  ["PHP", "608", 2, "peso filipino", "₱", "Filipinas"],
  ["PKR", "586", 2, "rupia paquistanesa", "Rs", "Paquistão"],
  ["PLN", "985", 2, "zloty polonês", "zł", "Polônia"],
  ["PYG", "600", 0, "guarani paraguaio", "₲", "Paraguai"],
  ["QAR", "634", 2, "rial catariano", "QR", "Catar"],
  ["RON", "946", 2, "leu romeno", "L", "Romênia"],
  ["RSD", "941", 2, "dinar sérvio", "DIN", "Sérvia"],
  ["RUB", "643", 2, "rublo russo", "₽", "Rússia"],
  ["RWF", "646", 0, "franco ruandês", "FRw", "Ruanda"],
  ["SAR", "682", 2, "riyal saudita", "﷼", "Arábia Saudita"],
  ["SBD", "090", 2, "dólar das Ilhas Salomão", "$", "Ilhas Salomão"],
  ["SCR", "690", 2, "rupia seichelense", "Rs", "Seicheles"],
  ["SDG", "938", 2, "libra sudanesa", "LS", "Sudão"],
  ["SEK", "752", 2, "coroa sueca", "kr", "Suécia"],
  ["SGD", "702", 2, "dólar de Singapura", "$", "Singapura"],
  ["SHP", "654", 2, "libra de Santa Helena", "£", "Santa Helena, Ilha de Ascensão"],
  ["SLE", "925", 2, "leone serra-leonês (novo leone)", "Le", "Serra Leoa"],
  ["SOS", "706", 2, "xelim somali", "Sh", "Somália"],
  ["SRD", "968", 2, "dólar surinamês", "$", "Suriname"],
  ["SSP", "728", 2, "libra sul-sudanesa", "SS£", "Sudão do Sul"],
  ["STN", "930", 2, "dobra são-tomense", "Db", "São Tomé e Príncipe"],
  ["SVC", "222", 2, "colón salvadorenho", "₡", "El Salvador"],
  ["SYP", "760", 2, "libra síria", "LS", "Síria"],
  ["SZL", "748", 2, "lilangeni suázi", "L", "Essuatíni (Suazilândia)"],
  ["THB", "764", 2, "baht tailandês", "฿", "Tailândia"],
  ["TJS", "972", 2, "somoni tadjique", "SM", "Tajiquistão"],
  ["TMT", "934", 2, "manat turcomeno", "m", "Turcomenistão"],
  ["TND", "788", 3, "dinar tunisiano", "DT", "Tunísia"],
  ["TOP", "776", 2, "paanga tonganesa", "T$", "Tonga"],
  ["TRY", "949", 2, "lira turca", "₺", "Turquia"],
  ["TTD", "780", 2, "dólar de Trinidad e Tobago", "$", "Trinidad e Tobago"],
  ["TWD", "901", 2, "novo dólar taiwanês", "$", "Taiwan"],
  ["TZS", "834", 2, "xelim tanzaniano", "Sh", "Tanzânia"],
  ["UAH", "980", 2, "hryvnia ucraniana", "₴", "Ucrânia"],
  ["UGX", "800", 0, "xelim ugandense", "Sh", "Uganda"],
  ["USD", "840", 2, "dólar americano", "$", "Estados Unidos, Equador, El Salvador, Panamá, Timor-Leste, Porto Rico, Guam, Samoa Americana, Ilhas Marshall, Micronésia, Palau, Ilhas Marianas Setentrionais, Ilhas Virgens Americanas, Ilhas Virgens Britânicas, Ilhas Turcas e Caicos, Bonaire, Território Britânico do Oceano Índico, Ilhas Menores Distantes dos EUA"],
  ["USN", "997", 2, "dólar americano — fundos do dia seguinte (código de fundo)", "", "Estados Unidos"],
  ["UYI", "940", 0, "peso uruguaio em unidades indexadas (código de fundo)", "", "Uruguai"],
  ["UYU", "858", 2, "peso uruguaio", "$", "Uruguai"],
  ["UYW", "927", 4, "unidade previsional uruguaia (código de fundo)", "", "Uruguai"],
  ["UZS", "860", 2, "sum uzbeque", "Sʻ", "Uzbequistão"],
  ["VED", "926", 2, "bolívar digital venezuelano", "Bs.D", "Venezuela"],
  ["VES", "928", 2, "bolívar soberano venezuelano", "Bs.S", "Venezuela"],
  ["VND", "704", 0, "dongue vietnamita", "₫", "Vietnã"],
  ["VUV", "548", 0, "vatu de Vanuatu", "VT", "Vanuatu"],
  ["WST", "882", 2, "tala samoana", "$", "Samoa"],
  ["XAD", "396", 2, "dinar contábil árabe", "", "Fundo Monetário Árabe"],
  ["XAF", "950", 0, "franco CFA BEAC", "F.CFA", "Camarões, República Centro-Africana, República do Congo, Chade, Guiné Equatorial, Gabão"],
  ["XAG", "961", null, "prata (uma onça troy)", "", "mercado de metais"],
  ["XAU", "959", null, "ouro (uma onça troy)", "", "mercado de metais"],
  ["XBA", "955", null, "Unidade Composta Europeia — EURCO", "", "mercado de títulos"],
  ["XBB", "956", null, "Unidade Monetária Europeia — E.M.U.-6", "", "mercado de títulos"],
  ["XBC", "957", null, "Unidade Europeia de Conta 9 — E.U.A.-9", "", "mercado de títulos"],
  ["XBD", "958", null, "Unidade Europeia de Conta 17 — E.U.A.-17", "", "mercado de títulos"],
  ["XCD", "951", 2, "dólar do Caribe Oriental", "EC$", "Anguila, Antígua e Barbuda, Dominica, Granada, Montserrat, São Cristóvão e Neves, Santa Lúcia, São Vicente e Granadinas"],
  ["XCG", "532", 2, "florim caribenho", "Cg", "Curaçao, Sint Maarten"],
  ["XDR", "960", null, "direitos especiais de saque (DES)", "", "Fundo Monetário Internacional"],
  ["XOF", "952", 0, "franco CFA BCEAO", "F.CFA", "Benin, Burkina Faso, Costa do Marfim, Guiné-Bissau, Mali, Níger, Senegal, Togo"],
  ["XPD", "964", null, "paládio (uma onça troy)", "", "mercado de metais"],
  ["XPF", "953", 0, "franco CFP", "₣", "Polinésia Francesa, Nova Caledônia, Wallis e Futuna"],
  ["XPT", "962", null, "platina (uma onça troy)", "", "mercado de metais"],
  ["XSU", "994", null, "sucre", "", "Sistema Unitário de Compensação Regional (SUCRE)"],
  ["XTS", "963", null, "código reservado para testes", "", "sem território"],
  ["XUA", "965", null, "unidade de conta do Banco Africano de Desenvolvimento", "", "Banco Africano de Desenvolvimento"],
  ["XXX", "999", null, "nenhuma moeda", "", "sem território"],
  ["YER", "886", 2, "rial iemenita", "﷼", "Iêmen"],
  ["ZAR", "710", 2, "rand sul-africano", "R", "África do Sul, Essuatíni, Lesoto, Namíbia"],
  ["ZMW", "967", 2, "kwacha zambiana", "K", "Zâmbia"],
  ["ZWG", "924", 2, "Zimbabwe Gold (ZiG)", "ZiG", "Zimbábue"],
]

export const CURRENCIES: Currency[] = TABLE.map(([code, num, digits, name, symbol, places]) => ({
  code,
  num,
  digits,
  name,
  symbol,
  places,
}));

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));
const BY_NUM = new Map(CURRENCIES.map((c) => [c.num, c]));

/**
 * Símbolo → moedas que o usam. Só entram os símbolos que carregam algum sinal
 * gráfico (€, R$, ¥, zł): os que são só letras (kr, Rs, Sh, K, L) colidiriam
 * com palavra solta e virariam ruído. E só valem os praticamente inequívocos —
 * "$" tem 29 donos, então fica de fora pelo teto abaixo.
 */
const SYMBOL_MAX_OWNERS = 4;
const BY_SYMBOL = (() => {
  const map = new Map<string, Currency[]>();
  for (const c of CURRENCIES) {
    if (!c.symbol || /^[A-Za-z.]+$/.test(c.symbol)) continue;
    const list = map.get(c.symbol);
    if (list) list.push(c);
    else map.set(c.symbol, [c]);
  }
  for (const [symbol, list] of map) if (list.length > SYMBOL_MAX_OWNERS) map.delete(symbol);
  return map;
})();

export function currencyByCode(code: string): Currency | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function currencyByNum(num: string): Currency | undefined {
  return BY_NUM.get(num);
}

/** Moedas que usam este símbolo; `[]` quando o símbolo é ambíguo demais. */
export function currenciesBySymbol(symbol: string): Currency[] {
  return BY_SYMBOL.get(symbol) ?? [];
}

export interface RetiredCurrency {
  code: string;
  /** Nome em pt-BR. */
  name: string;
  /** Quando deixou de valer (ano ou data ISO, como a norma registra). */
  until: string;
  /** Código que a substituiu. */
  replacedBy: string;
}

/**
 * Retiradas que ainda aparecem em texto antigo — as antecessoras do euro e as
 * substituições recentes. Ficam de fora as que colidem com palavra em pt/en
 * (FIM, ROL, SIT): não vale acender um cartão porque alguém escreveu "fim".
 */
// [código, nome, até, substituída por]
// biome-ignore format: tabela compacta.
const RETIRED_TABLE: [string, string, string, string][] = [
  ["ANG", "florim das Antilhas Neerlandesas", "2025-03-31", "XCG"],
  ["ATS", "xelim austríaco", "1999-01-01", "EUR"],
  ["BEF", "franco belga", "1999-01-01", "EUR"],
  ["BGN", "lev búlgaro", "2025-12-31", "EUR"],
  ["BYR", "rublo bielorrusso (antigo)", "2016-06-30", "BYN"],
  ["CUC", "peso conversível cubano", "2021-06-30", "CUP"],
  ["CYP", "libra cipriota", "2006-01-01", "EUR"],
  ["DEM", "marco alemão", "1999-01-01", "EUR"],
  ["EEK", "coroa estoniana", "2011-01-01", "EUR"],
  ["ESP", "peseta espanhola", "1999-01-01", "EUR"],
  ["FRF", "franco francês", "1999-01-01", "EUR"],
  ["GHC", "cedi ganês (antigo)", "2007-07-01", "GHS"],
  ["GRD", "dracma grega", "2001-01-01", "EUR"],
  ["HRK", "kuna croata", "2023-01-01", "EUR"],
  ["IEP", "libra irlandesa", "1999-01-01", "EUR"],
  ["ITL", "lira italiana", "1999-01-01", "EUR"],
  ["LTL", "litas lituano", "2015-01-01", "EUR"],
  ["LUF", "franco luxemburguês", "1999-01-01", "EUR"],
  ["LVL", "lats letão", "2014-01-01", "EUR"],
  ["MRO", "uguia mauritana (antiga)", "2018-01-01", "MRU"],
  ["MTL", "lira maltesa", "2006-01-01", "EUR"],
  ["MZM", "metical moçambicano (antigo)", "2006-06-30", "MZN"],
  ["NLG", "florim neerlandês", "1999-01-01", "EUR"],
  ["PTE", "escudo português", "1999-01-01", "EUR"],
  ["SKK", "coroa eslovaca", "2009-01-01", "EUR"],
  ["SLL", "leone serra-leonês (antigo)", "2023", "SLE"],
  ["STD", "dobra são-tomense (antiga)", "2018-04-01", "STN"],
  ["TRL", "lira turca (antiga)", "2005-12-31", "TRY"],
  ["VEB", "bolívar venezuelano", "2008-01-01", "VES"],
  ["VEF", "bolívar forte venezuelano", "2018-08-20", "VES"],
  ["XEU", "ECU — unidade monetária europeia", "1998-12-31", "EUR"],
  ["ZMK", "kwacha zambiana (antiga)", "2013-01-01", "ZMW"],
  ["ZWD", "dólar zimbabuense", "2006-07-31", "ZWG"],
  ["ZWL", "dólar zimbabuense (RTGS)", "2024-09-01", "ZWG"],
];

const RETIRED = new Map(
  RETIRED_TABLE.map(([code, name, until, replacedBy]) => [
    code,
    { code, name, until, replacedBy } satisfies RetiredCurrency,
  ]),
);

export function retiredCurrency(code: string): RetiredCurrency | undefined {
  return RETIRED.get(code.toUpperCase());
}
