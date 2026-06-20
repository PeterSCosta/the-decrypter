/**
 * Tabelas telefônicas: DDI (código de país) e DDD (código de área do Brasil).
 * Usadas pelos decoders `ddi`/`ddd` para interpretar números como países ou
 * regiões — ex.: "55 56" → Brasil, Chile; "47 48" → norte e sul de SC.
 */

/** Item de resultado genérico (código → nome, com detalhe opcional). */
export interface CodeHit {
  code: string;
  name: string;
  detail?: string;
}

// ---- DDI: código de país (pt-BR) -----------------------------------------
// biome-ignore format: tabela compacta.
const DDI: Record<string, string> = {
  "1": "Estados Unidos / Canadá", "7": "Rússia / Cazaquistão",
  "20": "Egito", "27": "África do Sul",
  "30": "Grécia", "31": "Países Baixos", "32": "Bélgica", "33": "França", "34": "Espanha",
  "36": "Hungria", "39": "Itália",
  "40": "Romênia", "41": "Suíça", "43": "Áustria", "44": "Reino Unido", "45": "Dinamarca",
  "46": "Suécia", "47": "Noruega", "48": "Polônia", "49": "Alemanha",
  "51": "Peru", "52": "México", "53": "Cuba", "54": "Argentina", "55": "Brasil", "56": "Chile",
  "57": "Colômbia", "58": "Venezuela",
  "60": "Malásia", "61": "Austrália", "62": "Indonésia", "63": "Filipinas", "64": "Nova Zelândia",
  "65": "Singapura", "66": "Tailândia",
  "81": "Japão", "82": "Coreia do Sul", "84": "Vietnã", "86": "China",
  "90": "Turquia", "91": "Índia", "92": "Paquistão", "93": "Afeganistão", "94": "Sri Lanka",
  "95": "Mianmar", "98": "Irã",
  "212": "Marrocos", "213": "Argélia", "234": "Nigéria", "244": "Angola", "258": "Moçambique",
  "351": "Portugal", "352": "Luxemburgo", "353": "Irlanda", "354": "Islândia", "358": "Finlândia",
  "359": "Bulgária", "380": "Ucrânia", "381": "Sérvia", "385": "Croácia", "386": "Eslovênia",
  "420": "Tchéquia", "421": "Eslováquia", "423": "Liechtenstein",
  "501": "Belize", "502": "Guatemala", "503": "El Salvador", "504": "Honduras", "505": "Nicarágua",
  "506": "Costa Rica", "507": "Panamá", "509": "Haiti",
  "591": "Bolívia", "592": "Guiana", "593": "Equador", "595": "Paraguai", "597": "Suriname",
  "598": "Uruguai",
  "852": "Hong Kong", "855": "Camboja", "856": "Laos", "880": "Bangladesh", "886": "Taiwan",
  "961": "Líbano", "962": "Jordânia", "964": "Iraque", "965": "Kuwait", "966": "Arábia Saudita",
  "971": "Emirados Árabes Unidos", "972": "Israel", "974": "Catar", "977": "Nepal",
};

// ---- DDD: código de área do Brasil ---------------------------------------
// [UF, região, principais cidades]
// biome-ignore format: tabela compacta.
const DDD: Record<string, [uf: string, area: string, cities: string]> = {
  "11": ["SP", "Grande São Paulo", "São Paulo"],
  "12": ["SP", "Vale do Paraíba", "São José dos Campos · Taubaté"],
  "13": ["SP", "Baixada Santista", "Santos · São Vicente"],
  "14": ["SP", "Centro-oeste paulista", "Bauru · Marília"],
  "15": ["SP", "Sorocaba", "Sorocaba · Itapetininga"],
  "16": ["SP", "Ribeirão Preto / Franca", "Ribeirão Preto · Franca"],
  "17": ["SP", "São José do Rio Preto", "Rio Preto · Catanduva"],
  "18": ["SP", "Oeste paulista", "Presidente Prudente · Araçatuba"],
  "19": ["SP", "Campinas", "Campinas · Piracicaba"],
  "21": ["RJ", "Grande Rio", "Rio de Janeiro · Niterói"],
  "22": ["RJ", "Norte / Serrana", "Campos dos Goytacazes · Macaé"],
  "24": ["RJ", "Sul fluminense", "Volta Redonda · Petrópolis"],
  "27": ["ES", "Grande Vitória", "Vitória · Vila Velha"],
  "28": ["ES", "Sul capixaba", "Cachoeiro de Itapemirim"],
  "31": ["MG", "Grande BH", "Belo Horizonte · Contagem"],
  "32": ["MG", "Zona da Mata", "Juiz de Fora"],
  "33": ["MG", "Vale do Rio Doce", "Governador Valadares · Teófilo Otoni"],
  "34": ["MG", "Triângulo Mineiro", "Uberlândia · Uberaba"],
  "35": ["MG", "Sul de Minas", "Poços de Caldas · Varginha · Pouso Alegre"],
  "37": ["MG", "Centro-oeste", "Divinópolis"],
  "38": ["MG", "Norte de Minas", "Montes Claros"],
  "41": ["PR", "Grande Curitiba", "Curitiba"],
  "42": ["PR", "Campos Gerais", "Ponta Grossa · Guarapuava"],
  "43": ["PR", "Norte do Paraná", "Londrina"],
  "44": ["PR", "Noroeste", "Maringá"],
  "45": ["PR", "Oeste", "Cascavel · Foz do Iguaçu"],
  "46": ["PR", "Sudoeste", "Pato Branco · Francisco Beltrão"],
  "47": ["SC", "Norte / Vale do Itajaí", "Joinville · Blumenau · Itajaí"],
  "48": ["SC", "Grande Florianópolis / Sul", "Florianópolis · Criciúma"],
  "49": ["SC", "Oeste / Serra", "Chapecó · Lages"],
  "51": ["RS", "Grande Porto Alegre", "Porto Alegre · Canoas"],
  "53": ["RS", "Sul gaúcho", "Pelotas · Rio Grande"],
  "54": ["RS", "Serra gaúcha", "Caxias do Sul · Passo Fundo"],
  "55": ["RS", "Centro / Fronteira", "Santa Maria · Uruguaiana"],
  "61": ["DF", "Distrito Federal e entorno", "Brasília"],
  "62": ["GO", "Centro goiano", "Goiânia · Anápolis"],
  "63": ["TO", "Tocantins", "Palmas · Araguaína"],
  "64": ["GO", "Sul / Sudoeste goiano", "Rio Verde · Itumbiara"],
  "65": ["MT", "Centro-sul mato-grossense", "Cuiabá · Várzea Grande"],
  "66": ["MT", "Norte / Leste", "Rondonópolis · Sinop"],
  "67": ["MS", "Mato Grosso do Sul", "Campo Grande · Dourados"],
  "68": ["AC", "Acre", "Rio Branco"],
  "69": ["RO", "Rondônia", "Porto Velho · Ji-Paraná"],
  "71": ["BA", "Grande Salvador", "Salvador"],
  "73": ["BA", "Sul da Bahia", "Itabuna · Ilhéus · Porto Seguro"],
  "74": ["BA", "Norte da Bahia", "Juazeiro"],
  "75": ["BA", "Centro / Recôncavo", "Feira de Santana"],
  "77": ["BA", "Oeste / Sudoeste", "Barreiras · Vitória da Conquista"],
  "79": ["SE", "Sergipe", "Aracaju"],
  "81": ["PE", "Grande Recife", "Recife · Jaboatão"],
  "82": ["AL", "Alagoas", "Maceió"],
  "83": ["PB", "Paraíba", "João Pessoa · Campina Grande"],
  "84": ["RN", "Rio Grande do Norte", "Natal · Mossoró"],
  "85": ["CE", "Grande Fortaleza", "Fortaleza"],
  "86": ["PI", "Norte do Piauí", "Teresina · Parnaíba"],
  "87": ["PE", "Sertão pernambucano", "Petrolina"],
  "88": ["CE", "Interior do Ceará", "Juazeiro do Norte · Sobral"],
  "89": ["PI", "Sul do Piauí", "Picos · Floriano"],
  "91": ["PA", "Nordeste paraense", "Belém"],
  "92": ["AM", "Amazonas", "Manaus"],
  "93": ["PA", "Oeste do Pará", "Santarém"],
  "94": ["PA", "Sudeste do Pará", "Marabá"],
  "95": ["RR", "Roraima", "Boa Vista"],
  "96": ["AP", "Amapá", "Macapá"],
  "97": ["AM", "Interior do Amazonas", "Coari · Tefé"],
  "98": ["MA", "Norte do Maranhão", "São Luís"],
  "99": ["MA", "Sul do Maranhão", "Imperatriz"],
};

/** Quebra a entrada em tokens (espaço, vírgula, ponto e vírgula). */
function tokenize(input: string): string[] {
  return input
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
}

/** DDI: todos os tokens precisam ser código de país. */
export function lookupDDI(input: string): CodeHit[] | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;
  const hits: CodeHit[] = [];
  for (const t of tokens) {
    const name = DDI[t];
    if (!name) return null;
    hits.push({ code: t, name });
  }
  return hits;
}

/** DDD: todos os tokens precisam ser código de área (2 dígitos) do Brasil. */
export function lookupDDD(input: string): CodeHit[] | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;
  const hits: CodeHit[] = [];
  for (const t of tokens) {
    const entry = DDD[t];
    if (!entry) return null;
    const [uf, area, cities] = entry;
    hits.push({ code: t, name: `${uf} · ${area}`, detail: cities });
  }
  return hits;
}
