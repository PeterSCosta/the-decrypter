/**
 * ISO 3166-1 e seus primos: as 249 entradas oficialmente atribuídas com
 * alpha-2, alpha-3, numérico, nome pt-BR, ccTLD, capital, região, e — quando
 * divergem do alpha-3 — os códigos do COI (Jogos Olímpicos), da FIFA e a placa
 * internacional de veículo. O valor aqui é a TABELA DE CONVERSÃO: a prova dá
 * um código e pede outro ("o país de GER nos Jogos", "o alpha-3 de POR").
 *
 * POR QUE ESTA TABELA E NÃO O DDI: `phone-codes.ts` mapeia país por telefone e
 * `gs1-prefixes.ts` por código de barras. Nenhum dos dois responde "qual é o
 * alpha-3", que é o que a divergência COI/ISO cobra: Alemanha é DEU no ISO e
 * GER no COI; Suíça é CHE e SUI; Portugal é PRT e POR; Eslovênia é SVN no ISO
 * e na FIFA, mas SLO no COI.
 *
 * Fontes (conferidas em 2026-08, não escritas de memória):
 * - ISO 3166-1 (alpha-2/alpha-3/numérico): mledoze/countries, batido contra
 *   lukes/ISO-3166-Countries-with-Regional-Codes — 249 linhas, zero divergência.
 * - Nome pt-BR: CLDR (unicode-org/cldr-json, locale "pt").
 * - Região: região intermediária da ONU (M49), nome pelo CLDR.
 * - Capital: Wikidata (rótulo pt-BR), com a grafia usual no Brasil onde o
 *   rótulo vinha em transliteração portuguesa europeia.
 * - COI: "List of IOC country codes" (206 CONs). FIFA: "List of FIFA country
 *   codes" (211 membros). Placa: "International vehicle registration code".
 *
 * ccTLD é ".{alpha-2}" em toda linha menos uma: o Reino Unido usa ".uk". São
 * Martinho fica com o ".mf" reservado (na prática o site usa .fr, que é da
 * França) e as Ilhas Menores dos EUA ficam sem — o ".um" foi apagado em 2008.
 * Emprestar o TLD do vizinho faria ".fr" devolver dois países.
 */

/** País: uma linha da ISO 3166-1 com os códigos irmãos resolvidos. */
export interface Country {
  /** ISO 3166-1 alpha-2 — "BR". */
  a2: string;
  /** ISO 3166-1 alpha-3 — "BRA". */
  a3: string;
  /** ISO 3166-1 numérico, sempre com 3 dígitos — "076". */
  num: string;
  name: string;
  /** ccTLD com ponto — ".br". */
  tld: string;
  capital: string;
  region: string;
  /** Código do COI. Vazio quando o país não tem comitê olímpico. */
  ioc: string;
  /** Código da FIFA. Vazio quando o país não tem federação filiada. */
  fifa: string;
  /** Placa internacional de veículo (1–3 letras). Vazio quando não existe. */
  car: string;
}

// a2|a3|num|nome|ccTLD|capital|região|COI|FIFA|placa
// COI e FIFA vazios = iguais ao alpha-3 (só a divergência ocupa espaço);
// "-" = o país não tem comitê olímpico / federação filiada.
// biome-ignore format: tabela compacta.
const RAW: string[] = [
  "AD|AND|020|Andorra|.ad|Andorra-a-Velha|Europa Meridional|||AND",
  "AE|ARE|784|Emirados Árabes Unidos|.ae|Abu Dhabi|Ásia Ocidental|UAE|UAE|UAE",
  "AF|AFG|004|Afeganistão|.af|Cabul|Ásia Meridional|||AFG",
  "AG|ATG|028|Antígua e Barbuda|.ag|Saint John's|Caribe|ANT||",
  "AI|AIA|660|Anguila|.ai|The Valley|Caribe|-||AXA",
  "AL|ALB|008|Albânia|.al|Tirana|Europa Meridional|||AL",
  "AM|ARM|051|Armênia|.am|Erevan|Ásia Ocidental|||AM",
  "AO|AGO|024|Angola|.ao|Luanda|África Central|ANG|ANG|",
  "AQ|ATA|010|Antártida|.aq||Antártida|-|-|",
  "AR|ARG|032|Argentina|.ar|Buenos Aires|América do Sul|||RA",
  "AS|ASM|016|Samoa Americana|.as|Pago Pago|Polinésia|ASA|ASA|",
  "AT|AUT|040|Áustria|.at|Viena|Europa Ocidental|||A",
  "AU|AUS|036|Austrália|.au|Camberra|Australásia|||AUS",
  "AW|ABW|533|Aruba|.aw|Oranjestad|Caribe|ARU|ARU|",
  "AX|ALA|248|Ilhas Aland|.ax|Mariehamn|Europa Setentrional|-|-|AX",
  "AZ|AZE|031|Azerbaijão|.az|Baku|Ásia Ocidental|||AZ",
  "BA|BIH|070|Bósnia e Herzegovina|.ba|Sarajevo|Europa Meridional|||BIH",
  "BB|BRB|052|Barbados|.bb|Bridgetown|Caribe|BAR||BDS",
  "BD|BGD|050|Bangladesh|.bd|Dhaka|Ásia Meridional|BAN|BAN|BD",
  "BE|BEL|056|Bélgica|.be|Bruxelas|Europa Ocidental|||B",
  "BF|BFA|854|Burquina Faso|.bf|Ouagadougou|África Ocidental|BUR||BF",
  "BG|BGR|100|Bulgária|.bg|Sófia|Europa Oriental|BUL|BUL|BG",
  "BH|BHR|048|Bahrein|.bh|Manama|Ásia Ocidental|BRN||BRN",
  "BI|BDI|108|Burundi|.bi|Gitega|África Oriental|||RU",
  "BJ|BEN|204|Benin|.bj|Porto Novo|África Ocidental|||DY",
  "BL|BLM|652|São Bartolomeu|.bl|Gustavia|Caribe|-|-|",
  "BM|BMU|060|Bermudas|.bm|Hamilton|América Setentrional|BER|BER|",
  "BN|BRN|096|Brunei|.bn|Bandar Seri Begawan|Sudeste Asiático|BRU|BRU|BRU",
  "BO|BOL|068|Bolívia|.bo|Sucre|América do Sul|||BOL",
  "BQ|BES|535|Países Baixos Caribenhos|.bq|Kralendijk|Caribe|-|-|",
  "BR|BRA|076|Brasil|.br|Brasília|América do Sul|||BR",
  "BS|BHS|044|Bahamas|.bs|Nassau|Caribe|BAH|BAH|BS",
  "BT|BTN|064|Butão|.bt|Thimphu|Ásia Meridional|BHU|BHU|",
  "BV|BVT|074|Ilha Bouvet|.bv||América do Sul|-|-|",
  "BW|BWA|072|Botsuana|.bw|Gaborone|África Meridional|BOT|BOT|BW",
  "BY|BLR|112|Bielorrússia|.by|Minsk|Europa Oriental|||BY",
  "BZ|BLZ|084|Belize|.bz|Belmopan|América Central|BIZ||BH",
  "CA|CAN|124|Canadá|.ca|Ottawa|América Setentrional|||CDN",
  "CC|CCK|166|Ilhas Cocos (Keeling)|.cc|West Island|Australásia|-|-|",
  "CD|COD|180|República Democrática do Congo|.cd|Kinshasa|África Central|||CGO",
  "CF|CAF|140|República Centro-Africana|.cf|Bangui|África Central||CTA|RCA",
  "CG|COG|178|República do Congo|.cg|Brazzaville|África Central|CGO|CGO|RCB",
  "CH|CHE|756|Suíça|.ch|Berna|Europa Ocidental|SUI|SUI|CH",
  "CI|CIV|384|Costa do Marfim|.ci|Yamoussoukro|África Ocidental|||CI",
  "CK|COK|184|Ilhas Cook|.ck|Avarua|Polinésia|||",
  "CL|CHL|152|Chile|.cl|Santiago|América do Sul|CHI|CHI|RCH",
  "CM|CMR|120|Camarões|.cm|Yaoundé|África Central|||CAM",
  "CN|CHN|156|China|.cn|Pequim|Ásia Oriental|||",
  "CO|COL|170|Colômbia|.co|Bogotá|América do Sul|||CO",
  "CR|CRI|188|Costa Rica|.cr|San José|América Central|CRC|CRC|CR",
  "CU|CUB|192|Cuba|.cu|Havana|Caribe|||CU",
  "CV|CPV|132|Cabo Verde|.cv|Praia|África Ocidental|||",
  "CW|CUW|531|Curaçao|.cw|Willemstad|Caribe|-||",
  "CX|CXR|162|Ilha Christmas|.cx|Flying Fish Cove|Australásia|-|-|",
  "CY|CYP|196|Chipre|.cy|Nicósia|Ásia Ocidental|||CY",
  "CZ|CZE|203|Tchéquia|.cz|Praga|Europa Oriental|||CZ",
  "DE|DEU|276|Alemanha|.de|Berlim|Europa Ocidental|GER|GER|D",
  "DJ|DJI|262|Djibuti|.dj|Djibuti|África Oriental|||",
  "DK|DNK|208|Dinamarca|.dk|Copenhague|Europa Setentrional|DEN|DEN|DK",
  "DM|DMA|212|Dominica|.dm|Roseau|Caribe|||WD",
  "DO|DOM|214|República Dominicana|.do|São Domingos|Caribe|||DOM",
  "DZ|DZA|012|Argélia|.dz|Argel|África Setentrional|ALG|ALG|DZ",
  "EC|ECU|218|Equador|.ec|Quito|América do Sul|||EC",
  "EE|EST|233|Estônia|.ee|Tallinn|Europa Setentrional|||EST",
  "EG|EGY|818|Egito|.eg|Cairo|África Setentrional|||EG",
  "EH|ESH|732|Saara Ocidental|.eh|El Aaiún|África Setentrional|-|-|",
  "ER|ERI|232|Eritreia|.er|Asmara|África Oriental|||ER",
  "ES|ESP|724|Espanha|.es|Madri|Europa Meridional|||E",
  "ET|ETH|231|Etiópia|.et|Adis Abeba|África Oriental|||ETH",
  "FI|FIN|246|Finlândia|.fi|Helsinque|Europa Setentrional|||FIN",
  "FJ|FJI|242|Fiji|.fj|Suva|Melanésia|FIJ|FIJ|FJI",
  "FK|FLK|238|Ilhas Malvinas|.fk|Stanley|América do Sul|-|-|",
  "FM|FSM|583|Micronésia|.fm|Palikir|Região da Micronésia||-|",
  "FO|FRO|234|Ilhas Faroé|.fo|Tórshavn|Europa Setentrional|-||FO",
  "FR|FRA|250|França|.fr|Paris|Europa Ocidental|||F",
  "GA|GAB|266|Gabão|.ga|Libreville|África Central|||G",
  "GB|GBR|826|Reino Unido|.uk|Londres|Europa Setentrional||-|UK",
  "GD|GRD|308|Granada|.gd|São Jorge|Caribe|GRN|GRN|WG",
  "GE|GEO|268|Geórgia|.ge|Tiblíssi|Ásia Ocidental|||GE",
  "GF|GUF|254|Guiana Francesa|.gf|Caiena|América do Sul|-|-|",
  "GG|GGY|831|Guernsey|.gg|Saint Peter Port|Europa Setentrional|-|-|GBG",
  "GH|GHA|288|Gana|.gh|Acra|África Ocidental|||GH",
  "GI|GIB|292|Gibraltar|.gi|Gibraltar|Europa Meridional|-||GBZ",
  "GL|GRL|304|Groenlândia|.gl|Nuuk|América Setentrional|-|-|",
  "GM|GMB|270|Gâmbia|.gm|Banjul|África Ocidental|GAM|GAM|WAG",
  "GN|GIN|324|Guiné|.gn|Conacri|África Ocidental|GUI|GUI|RG",
  "GP|GLP|312|Guadalupe|.gp|Basse-Terre|Caribe|-|-|",
  "GQ|GNQ|226|Guiné Equatorial|.gq|Malabo|África Central|GEQ|EQG|",
  "GR|GRC|300|Grécia|.gr|Atenas|Europa Meridional|GRE|GRE|GR",
  "GS|SGS|239|Ilhas Geórgia do Sul e Sandwich do Sul|.gs|King Edward Point|América do Sul|-|-|",
  "GT|GTM|320|Guatemala|.gt|Cidade da Guatemala|América Central|GUA|GUA|GCA",
  "GU|GUM|316|Guam|.gu|Hagåtña|Região da Micronésia|||",
  "GW|GNB|624|Guiné-Bissau|.gw|Bissau|África Ocidental|GBS||",
  "GY|GUY|328|Guiana|.gy|Georgetown|América do Sul|||GUY",
  "HK|HKG|344|Hong Kong|.hk||Ásia Oriental|||HK",
  "HM|HMD|334|Ilhas Heard e McDonald|.hm||Australásia|-|-|",
  "HN|HND|340|Honduras|.hn|Tegucigalpa|América Central|HON|HON|HN",
  "HR|HRV|191|Croácia|.hr|Zagreb|Europa Meridional|CRO|CRO|HR",
  "HT|HTI|332|Haiti|.ht|Porto Príncipe|Caribe|HAI|HAI|RH",
  "HU|HUN|348|Hungria|.hu|Budapeste|Europa Oriental|||H",
  "ID|IDN|360|Indonésia|.id|Jacarta|Sudeste Asiático|INA||RI",
  "IE|IRL|372|Irlanda|.ie|Dublin|Europa Setentrional|||IRL",
  "IL|ISR|376|Israel|.il|Jerusalém|Ásia Ocidental|||IL",
  "IM|IMN|833|Ilha de Man|.im|Douglas|Europa Setentrional|-|-|GBM",
  "IN|IND|356|Índia|.in|Nova Deli|Ásia Meridional|||IND",
  "IO|IOT|086|Território Britânico do Oceano Índico|.io|Diego Garcia|África Oriental|-|-|",
  "IQ|IRQ|368|Iraque|.iq|Bagdá|Ásia Ocidental|||IRQ",
  "IR|IRN|364|Irã|.ir|Teerã|Ásia Meridional|IRI||IR",
  "IS|ISL|352|Islândia|.is|Reykjavík|Europa Setentrional|||IS",
  "IT|ITA|380|Itália|.it|Roma|Europa Meridional|||I",
  "JE|JEY|832|Jersey|.je|Saint Helier|Europa Setentrional|-|-|GBJ",
  "JM|JAM|388|Jamaica|.jm|Kingston|Caribe|||JA",
  "JO|JOR|400|Jordânia|.jo|Amã|Ásia Ocidental|||HKJ",
  "JP|JPN|392|Japão|.jp|Tóquio|Ásia Oriental|||J",
  "KE|KEN|404|Quênia|.ke|Nairóbi|África Oriental|||EAK",
  "KG|KGZ|417|Quirguistão|.kg|Bishkek|Ásia Central|||KG",
  "KH|KHM|116|Camboja|.kh|Phnom Penh|Sudeste Asiático|CAM|CAM|KH",
  "KI|KIR|296|Kiribati|.ki|Tarawa do Sul|Região da Micronésia||-|",
  "KM|COM|174|Comores|.km|Moroni|África Oriental|||",
  "KN|KNA|659|São Cristóvão e Névis|.kn|Basseterre|Caribe|SKN|SKN|",
  "KP|PRK|408|Coreia do Norte|.kp|Pyongyang|Ásia Oriental|||",
  "KR|KOR|410|Coreia do Sul|.kr|Seul|Ásia Oriental|||ROK",
  "KW|KWT|414|Kuwait|.kw|Kuwait|Ásia Ocidental|KUW|KUW|KWT",
  "KY|CYM|136|Ilhas Cayman|.ky|George Town|Caribe|CAY|CAY|",
  "KZ|KAZ|398|Cazaquistão|.kz|Astana|Ásia Central|||KZ",
  "LA|LAO|418|Laos|.la|Vientiane|Sudeste Asiático|||LAO",
  "LB|LBN|422|Líbano|.lb|Beirute|Ásia Ocidental|||RL",
  "LC|LCA|662|Santa Lúcia|.lc|Castries|Caribe|||WL",
  "LI|LIE|438|Liechtenstein|.li|Vaduz|Europa Ocidental|||FL",
  "LK|LKA|144|Sri Lanka|.lk|Sri Jayawardenapura Kotte|Ásia Meridional|SRI|SRI|CL",
  "LR|LBR|430|Libéria|.lr|Monróvia|África Ocidental|||LB",
  "LS|LSO|426|Lesoto|.ls|Maseru|África Meridional|LES|LES|LS",
  "LT|LTU|440|Lituânia|.lt|Vilnius|Europa Setentrional|||LT",
  "LU|LUX|442|Luxemburgo|.lu|Luxemburgo|Europa Ocidental|||L",
  "LV|LVA|428|Letônia|.lv|Riga|Europa Setentrional|LAT||LV",
  "LY|LBY|434|Líbia|.ly|Trípoli|África Setentrional|LBA||LAR",
  "MA|MAR|504|Marrocos|.ma|Rabat|África Setentrional|||MA",
  "MC|MCO|492|Mônaco|.mc|Mônaco|Europa Ocidental|MON|-|MC",
  "MD|MDA|498|Moldávia|.md|Chişinău|Europa Oriental|||MD",
  "ME|MNE|499|Montenegro|.me|Podgorica|Europa Meridional|||MNE",
  "MF|MAF|663|São Martinho|.mf|Marigot|Caribe|-|-|",
  "MG|MDG|450|Madagascar|.mg|Antananarivo|África Oriental|MAD|MAD|RM",
  "MH|MHL|584|Ilhas Marshall|.mh|Majuro|Região da Micronésia||-|",
  "MK|MKD|807|Macedônia do Norte|.mk|Skopje|Europa Meridional|||NMK",
  "ML|MLI|466|Mali|.ml|Bamako|África Ocidental|||RMM",
  "MM|MMR|104|Mianmar|.mm|Naypyidaw|Sudeste Asiático|MYA|MYA|MYA",
  "MN|MNG|496|Mongólia|.mn|Ulan Bator|Ásia Oriental|MGL||MGL",
  "MO|MAC|446|Macau|.mo||Ásia Oriental|-||",
  "MP|MNP|580|Ilhas Marianas do Norte|.mp|Saipan|Região da Micronésia|-|-|",
  "MQ|MTQ|474|Martinica|.mq|Fort-de-France|Caribe|-|-|",
  "MR|MRT|478|Mauritânia|.mr|Nouakchott|África Ocidental|MTN|MTN|RIM",
  "MS|MSR|500|Montserrat|.ms|Plymouth|Caribe|-||",
  "MT|MLT|470|Malta|.mt|Valeta|Europa Meridional|||M",
  "MU|MUS|480|Maurício|.mu|Port Louis|África Oriental|MRI|MRI|MS",
  "MV|MDV|462|Maldivas|.mv|Malé|Ásia Meridional|||MV",
  "MW|MWI|454|Malaui|.mw|Lilongwe|África Oriental|MAW||MW",
  "MX|MEX|484|México|.mx|Cidade do México|América Central|||MEX",
  "MY|MYS|458|Malásia|.my|Kuala Lumpur|Sudeste Asiático|MAS|MAS|MAL",
  "MZ|MOZ|508|Moçambique|.mz|Maputo|África Oriental|||MOC",
  "NA|NAM|516|Namíbia|.na|Windhoek|África Meridional|||NAM",
  "NC|NCL|540|Nova Caledônia|.nc|Nouméa|Melanésia|-||",
  "NE|NER|562|Níger|.ne|Niamey|África Ocidental|NIG|NIG|RN",
  "NF|NFK|574|Ilha Norfolk|.nf|Kingston|Australásia|-|-|",
  "NG|NGA|566|Nigéria|.ng|Abuja|África Ocidental|NGR||WAN",
  "NI|NIC|558|Nicarágua|.ni|Managua|América Central|NCA|NCA|NIC",
  "NL|NLD|528|Países Baixos|.nl|Amsterdã|Europa Ocidental|NED|NED|NL",
  "NO|NOR|578|Noruega|.no|Oslo|Europa Setentrional|||N",
  "NP|NPL|524|Nepal|.np|Catmandu|Ásia Meridional|NEP|NEP|NEP",
  "NR|NRU|520|Nauru|.nr|Yaren|Região da Micronésia||-|NAU",
  "NU|NIU|570|Niue|.nu|Alofi|Polinésia|-|-|",
  "NZ|NZL|554|Nova Zelândia|.nz|Wellington|Australásia|||NZ",
  "OM|OMN|512|Omã|.om|Mascate|Ásia Ocidental|OMA|OMA|OM",
  "PA|PAN|591|Panamá|.pa|Cidade do Panamá|América Central|||PA",
  "PE|PER|604|Peru|.pe|Lima|América do Sul|||PE",
  "PF|PYF|258|Polinésia Francesa|.pf|Papeete|Polinésia|-|TAH|",
  "PG|PNG|598|Papua-Nova Guiné|.pg|Port Moresby|Melanésia|||PNG",
  "PH|PHL|608|Filipinas|.ph|Manila|Sudeste Asiático|PHI|PHI|RP",
  "PK|PAK|586|Paquistão|.pk|Islamabad|Ásia Meridional|||PK",
  "PL|POL|616|Polônia|.pl|Varsóvia|Europa Oriental|||PL",
  "PM|SPM|666|São Pedro e Miquelão|.pm|Saint-Pierre|América Setentrional|-|-|",
  "PN|PCN|612|Ilhas Pitcairn|.pn|Adamstown|Polinésia|-|-|",
  "PR|PRI|630|Porto Rico|.pr|San Juan|Caribe|PUR|PUR|",
  "PS|PSE|275|Palestina|.ps|Ramallah|Ásia Ocidental|PLE|PLE|",
  "PT|PRT|620|Portugal|.pt|Lisboa|Europa Meridional|POR|POR|P",
  "PW|PLW|585|Palau|.pw|Ngerulmud|Região da Micronésia||-|",
  "PY|PRY|600|Paraguai|.py|Assunção|América do Sul|PAR|PAR|PY",
  "QA|QAT|634|Catar|.qa|Doha|Ásia Ocidental|||Q",
  "RE|REU|638|Reunião|.re|Saint-Denis|África Oriental|-|-|",
  "RO|ROU|642|Romênia|.ro|Bucareste|Europa Oriental|||RO",
  "RS|SRB|688|Sérvia|.rs|Belgrado|Europa Meridional|||SRB",
  "RU|RUS|643|Rússia|.ru|Moscou|Europa Oriental|||RUS",
  "RW|RWA|646|Ruanda|.rw|Kigali|África Oriental|||RWA",
  "SA|SAU|682|Arábia Saudita|.sa|Riade|Ásia Ocidental|KSA|KSA|KSA",
  "SB|SLB|090|Ilhas Salomão|.sb|Honiara|Melanésia|SOL|SOL|",
  "SC|SYC|690|Seicheles|.sc|Victoria|África Oriental|SEY|SEY|SY",
  "SD|SDN|729|Sudão|.sd|Cartum|África Setentrional|SUD||SUD",
  "SE|SWE|752|Suécia|.se|Estocolmo|Europa Setentrional|||S",
  "SG|SGP|702|Singapura|.sg|Singapura|Sudeste Asiático|||SGP",
  "SH|SHN|654|Santa Helena|.sh|Jamestown|África Ocidental|-|-|",
  "SI|SVN|705|Eslovênia|.si|Liubliana|Europa Meridional|SLO||SLO",
  "SJ|SJM|744|Svalbard e Jan Mayen|.sj|Longyearbyen|Europa Setentrional|-|-|",
  "SK|SVK|703|Eslováquia|.sk|Bratislava|Europa Oriental|||SK",
  "SL|SLE|694|Serra Leoa|.sl|Freetown|África Ocidental|||WAL",
  "SM|SMR|674|San Marino|.sm|San Marino|Europa Meridional|||RSM",
  "SN|SEN|686|Senegal|.sn|Dakar|África Ocidental|||SN",
  "SO|SOM|706|Somália|.so|Mogadíscio|África Oriental|||SO",
  "SR|SUR|740|Suriname|.sr|Paramaribo|América do Sul|||SME",
  "SS|SSD|728|Sudão do Sul|.ss|Juba|África Oriental|||",
  "ST|STP|678|São Tomé e Príncipe|.st|São Tomé|África Central|||",
  "SV|SLV|222|El Salvador|.sv|San Salvador|América Central|ESA||ES",
  "SX|SXM|534|Sint Maarten|.sx|Philipsburg|Caribe|-|-|",
  "SY|SYR|760|Síria|.sy|Damasco|Ásia Ocidental|||SYR",
  "SZ|SWZ|748|Essuatíni|.sz|Mbabane|África Meridional|||SD",
  "TC|TCA|796|Ilhas Turcas e Caicos|.tc|Cockburn Town|Caribe|-||",
  "TD|TCD|148|Chade|.td|N'Djamena|África Central|CHA|CHA|TCH",
  "TF|ATF|260|Territórios Franceses do Sul|.tf|Port-aux-Français|África Oriental|-|-|",
  "TG|TGO|768|Togo|.tg|Lomé|África Ocidental|TOG|TOG|TG",
  "TH|THA|764|Tailândia|.th|Bangkok|Sudeste Asiático|||T",
  "TJ|TJK|762|Tadjiquistão|.tj|Duchambe|Ásia Central|||TJ",
  "TK|TKL|772|Tokelau|.tk|Fakaofo|Polinésia|-|-|",
  "TL|TLS|626|Timor-Leste|.tl|Díli|Sudeste Asiático|||",
  "TM|TKM|795|Turcomenistão|.tm|Asgabat|Ásia Central|||TM",
  "TN|TUN|788|Tunísia|.tn|Túnis|África Setentrional|||TN",
  "TO|TON|776|Tonga|.to|Nuku'alofa|Polinésia|TGA|TGA|TO",
  "TR|TUR|792|Turquia|.tr|Ancara|Ásia Ocidental|||TR",
  "TT|TTO|780|Trinidad e Tobago|.tt|Port of Spain|Caribe||TRI|TT",
  "TV|TUV|798|Tuvalu|.tv|Funafuti|Polinésia||-|",
  "TW|TWN|158|Taiwan|.tw|Taipé|Ásia Oriental|TPE|TPE|RC",
  "TZ|TZA|834|Tanzânia|.tz|Dodoma|África Oriental|TAN|TAN|EAT",
  "UA|UKR|804|Ucrânia|.ua|Kiev|Europa Oriental|||UA",
  "UG|UGA|800|Uganda|.ug|Kampala|África Oriental|||EAU",
  "UM|UMI|581|Ilhas Menores Distantes dos EUA|||Região da Micronésia|-|-|",
  "US|USA|840|Estados Unidos|.us|Washington, D.C.|América Setentrional|||USA",
  "UY|URY|858|Uruguai|.uy|Montevidéu|América do Sul|URU|URU|ROU",
  "UZ|UZB|860|Uzbequistão|.uz|Tashkent|Ásia Central|||UZ",
  "VA|VAT|336|Cidade do Vaticano|.va|Vaticano|Europa Meridional|-|-|V",
  "VC|VCT|670|São Vicente e Granadinas|.vc|Kingstown|Caribe|VIN|VIN|WV",
  "VE|VEN|862|Venezuela|.ve|Caracas|América do Sul|||YV",
  "VG|VGB|092|Ilhas Virgens Britânicas|.vg|Road Town|Caribe|IVB||BVI",
  "VI|VIR|850|Ilhas Virgens Americanas|.vi|Charlotte Amalie|Caribe|ISV||",
  "VN|VNM|704|Vietnã|.vn|Hanói|Sudeste Asiático|VIE|VIE|VN",
  "VU|VUT|548|Vanuatu|.vu|Port Vila|Melanésia|VAN|VAN|",
  "WF|WLF|876|Wallis e Futuna|.wf|Mata-Utu|Polinésia|-|-|",
  "WS|WSM|882|Samoa|.ws|Apia|Polinésia|SAM|SAM|WS",
  "YE|YEM|887|Iêmen|.ye|Saná|Ásia Ocidental|||YAR",
  "YT|MYT|175|Mayotte|.yt|Mamoudzou|África Oriental|-|-|",
  "ZA|ZAF|710|África do Sul|.za|Pretória|África Meridional|RSA|RSA|ZA",
  "ZM|ZMB|894|Zâmbia|.zm|Lusaca|África Oriental|ZAM|ZAM|Z",
  "ZW|ZWE|716|Zimbábue|.zw|Harare|África Oriental|ZIM|ZIM|ZW",
];

function parse(row: string): Country {
  const [a2, a3, num, name, tld, capital, region, ioc, fifa, car] = row.split("|");
  return {
    a2,
    a3,
    num,
    name,
    tld,
    capital,
    region,
    ioc: ioc === "-" ? "" : ioc || a3,
    fifa: fifa === "-" ? "" : fifa || a3,
    car,
  };
}

export const COUNTRIES: Country[] = RAW.map(parse);

/** Em que tabela o código foi encontrado — é isso que a prova cobra. */
export type CountryScheme = "alpha-2" | "alpha-3" | "numérico" | "COI" | "FIFA" | "placa" | "ccTLD";

export interface CodeMatch {
  country: Country;
  /** Todas as tabelas em que este código vale para este país. */
  schemes: CountryScheme[];
  /** O código consultado, na forma canônica ("076", ".br", "GER"). */
  code: string;
  /** Nação do Reino Unido, quando o código é ENG/SCO/WAL/NIR da FIFA. */
  nation?: string;
}

/**
 * As quatro seleções do Reino Unido têm código FIFA próprio e o RU não tem
 * nenhum — sem isto, "ENG" não acharia país nenhum.
 */
export const UK_NATIONS: Record<string, string> = {
  ENG: "Inglaterra",
  SCO: "Escócia",
  WAL: "País de Gales",
  NIR: "Irlanda do Norte",
};

const index = (pick: (c: Country) => string) => {
  const m = new Map<string, Country[]>();
  for (const c of COUNTRIES) {
    const k = pick(c);
    if (!k) continue;
    const list = m.get(k);
    if (list) list.push(c);
    else m.set(k, [c]);
  }
  return m;
};

const BY: [CountryScheme, Map<string, Country[]>][] = [
  ["alpha-2", index((c) => c.a2)],
  ["alpha-3", index((c) => c.a3)],
  ["numérico", index((c) => c.num)],
  ["COI", index((c) => c.ioc)],
  ["FIFA", index((c) => c.fifa)],
  ["placa", index((c) => c.car)],
  ["ccTLD", index((c) => c.tld)],
];

const byA2 = new Map(COUNTRIES.map((c) => [c.a2, c]));

/** Ordem de leitura padrão: o ISO manda, o esporte e a placa desempatam. */
export const SCHEME_ORDER: CountryScheme[] = [
  "alpha-2",
  "alpha-3",
  "numérico",
  "ccTLD",
  "COI",
  "FIFA",
  "placa",
];

/**
 * Todas as leituras de um código já normalizado ("BR", "GER", "076", ".br").
 * Um código pode valer em mais de uma tabela para o MESMO país (BRA é alpha-3,
 * COI e FIFA) — aí vira um match só com três selos — ou para países
 * DIFERENTES (ROU é alpha-3 da Romênia e placa do Uruguai), e aí são dois.
 */
export function matchCode(code: string): CodeMatch[] {
  const out: CodeMatch[] = [];
  const push = (country: Country, scheme: CountryScheme, nation?: string) => {
    const found = out.find((m) => m.country.a2 === country.a2);
    if (found) {
      if (!found.schemes.includes(scheme)) found.schemes.push(scheme);
      return;
    }
    out.push({ country, schemes: [scheme], code, ...(nation ? { nation } : {}) });
  };
  for (const [scheme, map] of BY) {
    for (const c of map.get(code) ?? []) push(c, scheme);
  }
  const nation = UK_NATIONS[code];
  if (nation) {
    const gb = byA2.get("GB");
    if (gb) push(gb, "FIFA", nation);
  }
  return out;
}

// ---- entrada por nome ou capital -----------------------------------------

/** Dobra acento e pontuação: "Papua-Nova Guiné" e "papua nova guine" batem. */
function fold(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x0300 || c > 0x036f) out += ch;
  }
  return out
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Como o brasileiro escreve, e o CLDR não. Sem isto "Holanda" e "EUA" — que é
 * o que o enunciado usa — não achariam país nenhum.
 */
// biome-ignore format: tabela compacta.
const ALIASES: Record<string, string> = {
  "holanda": "NL", "eua": "US", "estados unidos da america": "US", "usa": "US",
  "inglaterra": "GB", "gra bretanha": "GB", "escocia": "GB", "pais de gales": "GB",
  "irlanda do norte": "GB", "suazilandia": "SZ", "birmania": "MM", "myanmar": "MM",
  "republica tcheca": "CZ", "republica checa": "CZ", "bahrein": "BH", "qatar": "QA",
  "vaticano": "VA", "emirados arabes": "AE", "belarus": "BY", "moldova": "MD",
  "macedonia": "MK", "seychelles": "SC", "botswana": "BW", "malawi": "MW",
  "formosa": "TW", "quiribati": "KI", "vietnam": "VN", "turkiye": "TR",
  "barein": "BH", "anguilla": "AI",
  "gronelandia": "GL", "malvinas": "FK", "falkland": "FK", "ilhas mauricio": "MU",
  "congo kinshasa": "CD", "rd congo": "CD", "congo brazzaville": "CG",
  "ilhas cayman": "KY", "costa do marfim": "CI", "timor leste": "TL",
};

const byName = new Map<string, Country>();
const byCapital = new Map<string, Country>();
for (const c of COUNTRIES) {
  byName.set(fold(c.name), c);
  if (c.capital) byCapital.set(fold(c.capital), c);
}
for (const [alias, a2] of Object.entries(ALIASES)) {
  const c = byA2.get(a2);
  if (c) byName.set(alias, c);
}

export interface NameMatch {
  country: Country;
  by: "nome" | "capital";
}

/**
 * Nome do país (ou apelido, ou capital) → país. O portão é o casamento
 * EXATO da entrada inteira: "Chile" resolve, "chile e peru" não — meia
 * palavra dentro de uma frase viraria ruído em toda prosa.
 */
export function matchCountryText(text: string): NameMatch | null {
  const k = fold(text);
  if (!k) return null;
  const n = byName.get(k);
  if (n) return { country: n, by: "nome" };
  const c = byCapital.get(k);
  // O nome ganha da capital: "Singapura" e "Kuwait" são os dois.
  return c ? { country: c, by: "capital" } : null;
}
