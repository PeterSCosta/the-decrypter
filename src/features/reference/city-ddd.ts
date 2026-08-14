/**
 * Índice cidade → DDD. O caminho inverso do `ddd.ts` (DDD → região) e o que a
 * bancada de fato não sabia fazer: a prova dá nomes de cidade e a resposta é o
 * telefone que os DDDs montam (GIA-40, "Enxergar sem ver" → 47 3221-5144).
 *
 * Por que uma tabela própria e não `municipios.json` + UF: **16 UFs têm mais de
 * um DDD**, então derivar o código da UF erra em silêncio — Teresópolis (21)
 * cairia no 21? só por sorte; Petrópolis, a 60 km, é 24. E `municipios.json`
 * não tem centroide, então também não dá para inferir por proximidade.
 *
 * Escopo: capitais, regiões metropolitanas, cidades grandes e **todo o Vale do
 * Itajaí/SC** (casa do evento). Cidade fora da lista simplesmente não resolve —
 * é melhor não responder do que responder errado.
 */

/** Uma cidade resolvida a partir de um token da entrada. */
export interface CityDDDMatch {
  /** Token como o usuário digitou (para ele conferir o que casou). */
  token: string;
  /** Nome canônico, acentuado. */
  city: string;
  uf: string;
  /** DDD de 2 dígitos. */
  ddd: string;
}

/**
 * `[DDD, UF, "Cidade|Cidade|…"]`. Agrupar por DDD evita repetir o código 400
 * vezes e deixa o erro visível: uma cidade no grupo errado salta aos olhos.
 * O 61 aparece duas vezes de propósito (DF + entorno goiano).
 */
// biome-ignore format: tabela compacta — uma linha por DDD.
const GROUPS: [ddd: string, uf: string, cities: string][] = [
  // --- São Paulo -----------------------------------------------------------
  ["11", "SP", "São Paulo|Guarulhos|Osasco|Santo André|São Bernardo do Campo|São Caetano do Sul|Diadema|Mauá|Ribeirão Pires|Rio Grande da Serra|Barueri|Carapicuíba|Cotia|Itapevi|Jandira|Embu das Artes|Embu-Guaçu|Itapecerica da Serra|Taboão da Serra|Mogi das Cruzes|Suzano|Itaquaquecetuba|Poá|Ferraz de Vasconcelos|Guararema|Arujá|Santana de Parnaíba|Cajamar|Caieiras|Franco da Rocha|Francisco Morato|Mairiporã|Jundiaí|Várzea Paulista|Campo Limpo Paulista|Itatiba|Atibaia|Bragança Paulista|São Roque|Vargem Grande Paulista"],
  ["12", "SP", "São José dos Campos|Taubaté|Jacareí|Pindamonhangaba|Guaratinguetá|Lorena|Cruzeiro|Caçapava|Tremembé|Campos do Jordão|Aparecida|Caraguatatuba|Ubatuba|São Sebastião|Ilhabela"],
  ["13", "SP", "Santos|São Vicente|Praia Grande|Guarujá|Cubatão|Bertioga|Itanhaém|Mongaguá|Peruíbe|Registro|Iguape|Cananéia"],
  ["14", "SP", "Bauru|Marília|Jaú|Botucatu|Lençóis Paulista|Avaré|Ourinhos|Lins|Agudos|Tupã|Garça"],
  ["15", "SP", "Sorocaba|Itapetininga|Itu|Salto|Votorantim|Tatuí|Boituva|Porto Feliz|Piedade|Capão Bonito|Itapeva"],
  ["16", "SP", "Ribeirão Preto|Franca|Araraquara|São Carlos|Sertãozinho|Jaboticabal|Ibitinga|Matão|Batatais|Orlândia|Ituverava|São Joaquim da Barra"],
  ["17", "SP", "São José do Rio Preto|Catanduva|Votuporanga|Barretos|Bebedouro|Jales|Fernandópolis|Olímpia|Mirassol|José Bonifácio"],
  ["18", "SP", "Presidente Prudente|Araçatuba|Birigui|Penápolis|Andradina|Dracena|Adamantina|Assis"],
  ["19", "SP", "Campinas|Piracicaba|Limeira|Americana|Sumaré|Hortolândia|Santa Bárbara d'Oeste|Rio Claro|Indaiatuba|Paulínia|Valinhos|Vinhedo|Nova Odessa|Mogi Mirim|Mogi Guaçu|Araras|Leme|São João da Boa Vista|Amparo|Cosmópolis|Itapira"],
  // --- Rio de Janeiro ------------------------------------------------------
  ["21", "RJ", "Rio de Janeiro|Niterói|São Gonçalo|Duque de Caxias|Nova Iguaçu|São João de Meriti|Belford Roxo|Nilópolis|Mesquita|Queimados|Japeri|Magé|Guapimirim|Itaboraí|Maricá|Itaguaí|Seropédica|Paracambi|Teresópolis|Rio Bonito|Tanguá"],
  ["22", "RJ", "Campos dos Goytacazes|Macaé|Cabo Frio|Armação dos Búzios|Araruama|Rio das Ostras|São Pedro da Aldeia|Nova Friburgo|Itaperuna|Saquarema|Arraial do Cabo|Casimiro de Abreu|Bom Jesus do Itabapoana"],
  ["24", "RJ", "Volta Redonda|Petrópolis|Barra Mansa|Resende|Angra dos Reis|Paraty|Três Rios|Vassouras|Barra do Piraí|Piraí|Itatiaia|Porto Real|Miguel Pereira"],
  // --- Espírito Santo ------------------------------------------------------
  ["27", "ES", "Vitória|Vila Velha|Serra|Cariacica|Viana|Guarapari|Linhares|Colatina|São Mateus|Aracruz|Nova Venécia|Santa Teresa|Domingos Martins"],
  ["28", "ES", "Cachoeiro de Itapemirim|Itapemirim|Marataízes|Alegre|Guaçuí|Castelo|Piúma"],
  // --- Minas Gerais --------------------------------------------------------
  ["31", "MG", "Belo Horizonte|Contagem|Betim|Ribeirão das Neves|Santa Luzia|Ibirité|Sabará|Vespasiano|Nova Lima|Lagoa Santa|Pedro Leopoldo|Caeté|Sete Lagoas|Itabira|João Monlevade|Ipatinga|Coronel Fabriciano|Timóteo|Ouro Preto|Mariana|Congonhas|Conselheiro Lafaiete|Ponte Nova"],
  ["32", "MG", "Juiz de Fora|Barbacena|Muriaé|Ubá|Cataguases|São João del-Rei|Viçosa|Leopoldina|Além Paraíba|Santos Dumont"],
  ["33", "MG", "Governador Valadares|Teófilo Otoni|Caratinga|Manhuaçu|Almenara|Nanuque|Aimorés"],
  ["34", "MG", "Uberlândia|Uberaba|Araguari|Ituiutaba|Patos de Minas|Araxá|Patrocínio|Monte Carmelo|Frutal|Iturama"],
  ["35", "MG", "Poços de Caldas|Varginha|Pouso Alegre|Passos|Alfenas|Itajubá|Lavras|Três Corações|São Lourenço|Extrema|Santa Rita do Sapucaí|Guaxupé|São Sebastião do Paraíso|Boa Esperança"],
  ["37", "MG", "Divinópolis|Itaúna|Formiga|Pará de Minas|Nova Serrana|Bom Despacho|Oliveira|Campo Belo|Arcos|Lagoa da Prata"],
  ["38", "MG", "Montes Claros|Unaí|Paracatu|Janaúba|Januária|Pirapora|Diamantina|Curvelo|Salinas|Bocaiúva"],
  // --- Paraná --------------------------------------------------------------
  ["41", "PR", "Curitiba|São José dos Pinhais|Colombo|Pinhais|Araucária|Almirante Tamandaré|Campo Largo|Piraquara|Fazenda Rio Grande|Campina Grande do Sul|Quatro Barras|Paranaguá|Matinhos|Guaratuba|Pontal do Paraná|Antonina|Morretes|Lapa"],
  ["42", "PR", "Ponta Grossa|Guarapuava|Castro|Irati|Telêmaco Borba|União da Vitória|Palmeira|Prudentópolis|Pitanga"],
  // Porto União é SC mas usa o DDD do vizinho paranaense — o caso que prova que
  // DDD não se deriva de UF.
  ["42", "SC", "Porto União"],
  ["43", "PR", "Londrina|Apucarana|Arapongas|Cambé|Rolândia|Ibiporã|Cornélio Procópio|Jacarezinho|Santo Antônio da Platina|Bandeirantes"],
  ["44", "PR", "Maringá|Umuarama|Campo Mourão|Paranavaí|Cianorte|Sarandi|Paiçandu|Goioerê|Astorga|Mandaguari|Guaíra"],
  ["45", "PR", "Cascavel|Foz do Iguaçu|Toledo|Marechal Cândido Rondon|Medianeira|Santa Terezinha de Itaipu|Céu Azul"],
  ["46", "PR", "Pato Branco|Francisco Beltrão|Dois Vizinhos|Palmas|Coronel Vivida|Chopinzinho|Clevelândia"],
  // --- Santa Catarina (Vale do Itajaí completo) ----------------------------
  ["47", "SC", "Blumenau|Gaspar|Ilhota|Luiz Alves|Indaial|Timbó|Benedito Novo|Doutor Pedrinho|Rio dos Cedros|Rodeio|Ascurra|Apiúna|Ibirama|Presidente Getúlio|Witmarsum|Dona Emma|José Boiteux|Vitor Meireles|Lontras|Rio do Sul|Aurora|Presidente Nereu|Agrolândia|Agronômica|Trombudo Central|Braço do Trombudo|Pouso Redondo|Rio do Oeste|Laurentino|Rio do Campo|Salete|Taió|Mirim Doce|Santa Terezinha|Ituporanga|Petrolândia|Atalanta|Chapadão do Lageado|Imbuia|Vidal Ramos|Brusque|Guabiruba|Botuverá|Itajaí|Navegantes|Penha|Balneário Piçarras|Barra Velha|São João do Itaperiú|Balneário Camboriú|Camboriú|Itapema|Porto Belo|Bombinhas|Massaranduba|Jaraguá do Sul|Guaramirim|Schroeder|Corupá|Joinville|Araquari|Balneário Barra do Sul|São Francisco do Sul|Itapoá|Garuva|São Bento do Sul|Rio Negrinho|Campo Alegre|Mafra|Papanduva|Monte Castelo|Canoinhas|Três Barras|Major Vieira|Irineópolis"],
  ["48", "SC", "Florianópolis|São José|Palhoça|Biguaçu|Santo Amaro da Imperatriz|Águas Mornas|Antônio Carlos|Governador Celso Ramos|São Pedro de Alcântara|Angelina|Rancho Queimado|Alfredo Wagner|Tijucas|São João Batista|Nova Trento|Canelinha|Major Gercino|Garopaba|Paulo Lopes|Imbituba|Imaruí|Laguna|Tubarão|Capivari de Baixo|Jaguaruna|Gravatal|Armazém|Braço do Norte|São Ludgero|Orleans|Lauro Müller|Urussanga|Cocal do Sul|Morro da Fumaça|Içara|Criciúma|Forquilhinha|Nova Veneza|Siderópolis|Treviso|Araranguá|Sombrio|Turvo|Meleiro|Santa Rosa do Sul|Passo de Torres|Balneário Arroio do Silva|Balneário Gaivota|Balneário Rincão|Sangão"],
  ["49", "SC", "Chapecó|Lages|Xanxerê|Xaxim|Concórdia|Joaçaba|Herval d'Oeste|Luzerna|Capinzal|Ouro|Videira|Fraiburgo|Tangará|Caçador|Curitibanos|Campos Novos|Otacílio Costa|Correia Pinto|São Joaquim|Urubici|São Miguel do Oeste|Maravilha|Pinhalzinho|São Lourenço do Oeste|Palmitos|Seara|Itapiranga|Descanso|Dionísio Cerqueira|Abelardo Luz|Ponte Serrada|Água Doce|Catanduvas|Irani|Quilombo|Coronel Freitas|São Domingos"],
  // --- Rio Grande do Sul ---------------------------------------------------
  ["51", "RS", "Porto Alegre|Canoas|Gravataí|Viamão|Alvorada|Cachoeirinha|Sapucaia do Sul|Esteio|Novo Hamburgo|São Leopoldo|Campo Bom|Sapiranga|Estância Velha|Portão|Ivoti|Dois Irmãos|Taquara|Parobé|Igrejinha|Três Coroas|Guaíba|Eldorado do Sul|Nova Santa Rita|Montenegro|São Sebastião do Caí|Triunfo|Charqueadas|São Jerônimo|Butiá|Arroio dos Ratos|Camaquã|Barra do Ribeiro|Tapes|Osório|Tramandaí|Imbé|Capão da Canoa|Xangri-lá|Torres|Santo Antônio da Patrulha|Cachoeira do Sul|Rio Pardo|Santa Cruz do Sul|Vera Cruz|Venâncio Aires|Candelária|Lajeado|Estrela|Teutônia|Arroio do Meio|Encantado"],
  ["53", "RS", "Pelotas|Rio Grande|Bagé|Dom Pedrito|Canguçu|São Lourenço do Sul|Santa Vitória do Palmar|Chuí|Jaguarão|Arroio Grande|Piratini|Pinheiro Machado|Capão do Leão"],
  ["54", "RS", "Caxias do Sul|Bento Gonçalves|Farroupilha|Garibaldi|Carlos Barbosa|Flores da Cunha|São Marcos|Antônio Prado|Nova Prata|Veranópolis|Guaporé|Nova Petrópolis|Gramado|Canela|Vacaria|Bom Jesus|Lagoa Vermelha|Passo Fundo|Marau|Carazinho|Soledade|Getúlio Vargas|Erechim|Tapejara|Sananduva|Serafina Corrêa|Casca|Não-Me-Toque"],
  ["55", "RS", "Santa Maria|Uruguaiana|Santana do Livramento|Alegrete|São Borja|Itaqui|Quaraí|Rosário do Sul|São Gabriel|Santiago|Cruz Alta|Ijuí|Panambi|Santa Rosa|Santo Ângelo|São Luiz Gonzaga|Três Passos|Frederico Westphalen|Palmeira das Missões|Horizontina|Três de Maio|Santo Cristo|Crissiumal|Tenente Portela|Júlio de Castilhos|Tupanciretã|São Sepé|Cacequi"],
  // --- Centro-Oeste --------------------------------------------------------
  ["61", "DF", "Brasília|Gama|Ceilândia|Taguatinga|Sobradinho|Planaltina"],
  ["61", "GO", "Luziânia|Valparaíso de Goiás|Águas Lindas de Goiás|Novo Gama|Cidade Ocidental|Santo Antônio do Descoberto|Formosa|Cristalina"],
  ["62", "GO", "Goiânia|Aparecida de Goiânia|Anápolis|Trindade|Senador Canedo|Goianira|Nerópolis|Inhumas|Goianésia|Jaraguá|Ceres|Itaberaí|Pirenópolis|Uruaçu|Porangatu|Niquelândia"],
  ["64", "GO", "Rio Verde|Itumbiara|Catalão|Jataí|Caldas Novas|Mineiros|Quirinópolis|Morrinhos|Goiatuba|Ipameri|Pires do Rio|Santa Helena de Goiás"],
  ["63", "TO", "Palmas|Araguaína|Gurupi|Porto Nacional|Paraíso do Tocantins|Colinas do Tocantins|Guaraí|Tocantinópolis|Dianópolis|Araguatins|Miracema do Tocantins"],
  ["65", "MT", "Cuiabá|Várzea Grande|Cáceres|Tangará da Serra|Barra do Bugres|Diamantino|Poconé|Chapada dos Guimarães|Jaciara"],
  ["66", "MT", "Rondonópolis|Sinop|Sorriso|Primavera do Leste|Barra do Garças|Alta Floresta|Colíder|Juína|Água Boa|Guarantã do Norte|Peixoto de Azevedo|Confresa"],
  ["67", "MS", "Campo Grande|Dourados|Três Lagoas|Corumbá|Ponta Porã|Naviraí|Nova Andradina|Aquidauana|Sidrolândia|Paranaíba|Maracaju|Coxim|Bonito|Amambai|Rio Brilhante|Chapadão do Sul|São Gabriel do Oeste|Miranda|Jardim|Caarapó|Ivinhema|Bataguassu|Costa Rica"],
  // --- Norte ---------------------------------------------------------------
  ["68", "AC", "Rio Branco|Cruzeiro do Sul|Sena Madureira|Tarauacá|Feijó|Brasiléia|Epitaciolândia|Xapuri|Senador Guiomard"],
  ["69", "RO", "Porto Velho|Ji-Paraná|Ariquemes|Vilhena|Cacoal|Rolim de Moura|Jaru|Guajará-Mirim|Ouro Preto do Oeste|Pimenta Bueno|Machadinho d'Oeste"],
  ["91", "PA", "Belém|Ananindeua|Marituba|Benevides|Santa Izabel do Pará|Castanhal|Abaetetuba|Barcarena|Bragança|Capanema|Paragominas|Tomé-Açu|Igarapé-Miri|Cametá|Moju|Salinópolis|Vigia|Soure|Salvaterra|Breves"],
  ["93", "PA", "Santarém|Altamira|Itaituba|Oriximiná|Óbidos|Alenquer|Monte Alegre|Juruti|Novo Progresso|Uruará|Rurópolis"],
  ["94", "PA", "Marabá|Parauapebas|Redenção|Tucuruí|Xinguara|Canaã dos Carajás|Conceição do Araguaia|São Félix do Xingu|Itupiranga|Rondon do Pará|Curionópolis|Eldorado do Carajás|Dom Eliseu"],
  ["92", "AM", "Manaus|Manacapuru|Itacoatiara|Parintins|Iranduba|Presidente Figueiredo|Rio Preto da Eva|Careiro|Maués|Autazes"],
  ["97", "AM", "Coari|Tefé|Tabatinga|Manicoré|Humaitá|Eirunepé|São Gabriel da Cachoeira|Benjamin Constant|Lábrea|Carauari|Borba"],
  ["95", "RR", "Boa Vista|Rorainópolis|Caracaraí|Pacaraima|Mucajaí"],
  ["96", "AP", "Macapá|Santana|Laranjal do Jari|Oiapoque|Porto Grande|Mazagão"],
  // --- Nordeste ------------------------------------------------------------
  ["98", "MA", "São Luís|São José de Ribamar|Paço do Lumiar|Raposa|Santa Inês|Pinheiro|Chapadinha|Barreirinhas|Itapecuru-Mirim|Rosário|Zé Doca|Coroatá"],
  ["99", "MA", "Imperatriz|Timon|Caxias|Codó|Bacabal|Açailândia|Balsas|Barra do Corda|Grajaú|Presidente Dutra|Estreito"],
  ["86", "PI", "Teresina|Parnaíba|Piripiri|Campo Maior|Barras|Esperantina|José de Freitas|Altos|Luzilândia|Pedro II|Piracuruca|Batalha"],
  ["89", "PI", "Picos|Floriano|Oeiras|São Raimundo Nonato|Corrente|Uruçuí|Valença do Piauí|Paulistana|Simplício Mendes|Canto do Buriti"],
  ["85", "CE", "Fortaleza|Caucaia|Maracanaú|Maranguape|Pacatuba|Eusébio|Aquiraz|Horizonte|Pacajus|Itaitinga|Chorozinho"],
  ["88", "CE", "Juazeiro do Norte|Sobral|Crato|Barbalha|Iguatu|Quixadá|Quixeramobim|Crateús|Canindé|Itapipoca|Acaraú|Camocim|Tianguá|Ubajara|Russas|Limoeiro do Norte|Aracati|Icó|Tauá|Jaguaribe|Morada Nova"],
  ["84", "RN", "Natal|Mossoró|Parnamirim|Macaíba|Ceará-Mirim|Extremoz|Caicó|Currais Novos|Pau dos Ferros|João Câmara|Nova Cruz|Touros|Apodi|Areia Branca|Baraúna"],
  ["83", "PB", "João Pessoa|Campina Grande|Santa Rita|Bayeux|Cabedelo|Patos|Sousa|Cajazeiras|Guarabira|Sapé|Monteiro|Pombal|Esperança|Solânea|Mamanguape|Princesa Isabel|Catolé do Rocha|Areia"],
  ["81", "PE", "Recife|Jaboatão dos Guararapes|Olinda|Paulista|Camaragibe|Cabo de Santo Agostinho|São Lourenço da Mata|Igarassu|Abreu e Lima|Ipojuca|Vitória de Santo Antão|Caruaru|Garanhuns|Gravatá|Bezerros|Escada|Goiana|Carpina|Paudalho|Limoeiro|Palmares|Santa Cruz do Capibaribe|Toritama|Belo Jardim|Pesqueira|Surubim|Arcoverde|Fernando de Noronha"],
  ["87", "PE", "Petrolina|Salgueiro|Serra Talhada|Araripina|Ouricuri|Afogados da Ingazeira|Custódia|Floresta|Cabrobó"],
  ["82", "AL", "Maceió|Arapiraca|Palmeira dos Índios|Rio Largo|União dos Palmares|Penedo|São Miguel dos Campos|Coruripe|Delmiro Gouveia|Marechal Deodoro|Maragogi|Santana do Ipanema"],
  ["79", "SE", "Aracaju|Nossa Senhora do Socorro|Lagarto|Itabaiana|São Cristóvão|Estância|Tobias Barreto|Simão Dias|Propriá|Canindé de São Francisco|Barra dos Coqueiros|Nossa Senhora da Glória"],
  ["71", "BA", "Salvador|Lauro de Freitas|Camaçari|Simões Filho|Dias d'Ávila|Candeias|Madre de Deus|São Francisco do Conde|Mata de São João|Catu|Pojuca|Itaparica"],
  ["73", "BA", "Itabuna|Ilhéus|Porto Seguro|Eunápolis|Teixeira de Freitas|Itapetinga|Itamaraju|Jequié|Ipiaú|Ubaitaba|Canavieiras|Camacan|Belmonte|Santa Cruz Cabrália|Prado|Alcobaça|Caravelas"],
  ["74", "BA", "Juazeiro|Senhor do Bonfim|Jacobina|Irecê|Xique-Xique|Campo Formoso|Casa Nova|Remanso|Jaguarari"],
  ["75", "BA", "Feira de Santana|Alagoinhas|Santo Antônio de Jesus|Cruz das Almas|Serrinha|Paulo Afonso|Ribeira do Pombal|Santo Amaro|Cachoeira|Amargosa|Conceição do Coité|Euclides da Cunha|Itaberaba|Entre Rios|Esplanada|Nazaré"],
  ["77", "BA", "Barreiras|Vitória da Conquista|Luís Eduardo Magalhães|Bom Jesus da Lapa|Guanambi|Brumado|Livramento de Nossa Senhora|Caetité|Ibotirama|Santa Maria da Vitória|Correntina|Poções"],
];

/** UFs válidas, para reconhecer o sufixo "Cidade/UF" sem confundir com nome. */
const UFS = new Set([
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
]);

interface CityRow {
  city: string;
  uf: string;
  ddd: string;
}

/**
 * Dobra acentos, caixa e pontuação: "Maringá" ≡ "MARINGA" ≡ "maringa", e
 * "Santa Bárbara d'Oeste" ≡ "santa barbara doeste". Hífen vira espaço porque
 * ninguém digita "Embu-Guaçu" com hífen quando cola de uma lista.
 */
export function foldCityName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['`´’.]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Todas as linhas, na ordem da tabela. Exportado para os testes de sanidade. */
export const CITY_ROWS: CityRow[] = GROUPS.flatMap(([ddd, uf, cities]) =>
  cities.split("|").map((city) => ({ city, uf, ddd })),
);

/**
 * Homônimos entre UFs: quem fica com o nome nu. Escolha explícita, não ordem da
 * tabela — a bancada responder "Palmas" com o 46 do Paraná em vez do 63 da
 * capital do Tocantins seria justamente o erro silencioso que este item existe
 * para evitar. A outra cidade continua acessível por "Palmas/PR", e um teste
 * cobra que toda colisão nova apareça aqui.
 */
export const HOMONYM_UF: Record<string, string> = { palmas: "TO" };

/**
 * Nome dobrado → linha (a UF vai no resultado para o usuário conferir) e
 * "nome|UF" → linha, que é como o sufixo desambigua.
 */
const BY_NAME = new Map<string, CityRow>();
const BY_NAME_UF = new Map<string, CityRow>();
for (const row of CITY_ROWS) {
  const folded = foldCityName(row.city);
  const preferida = HOMONYM_UF[folded];
  if (preferida ? row.uf === preferida : !BY_NAME.has(folded)) BY_NAME.set(folded, row);
  BY_NAME_UF.set(`${folded}|${row.uf}`, row);
}

/**
 * Separadores aceitos: vírgula, ponto e vírgula, quebra de linha, barra
 * vertical, tabulação, ponto médio — e **dois ou mais espaços** (colagem de
 * coluna). Espaço simples nunca separa: "Juiz de Fora" é uma cidade, não três.
 */
const SEPARATORS = /[,;|\n\r\t·•]+|[ ]{2,}/;

/** "Blumenau/SC", "Blumenau (SC)" e "Blumenau - SC" → nome + UF. */
const UF_SUFFIX = /^(.+?)\s*(?:[/(]|\s[-–]\s)\s*([A-Za-z]{2})\)?\s*$/;

function resolveToken(token: string): { row: CityRow; explicitUf: boolean } | null {
  const suffix = UF_SUFFIX.exec(token);
  if (suffix) {
    const uf = suffix[2].toUpperCase();
    if (UFS.has(uf)) {
      const row = BY_NAME_UF.get(`${foldCityName(suffix[1])}|${uf}`);
      if (row) return { row, explicitUf: true };
    }
  }
  const row = BY_NAME.get(foldCityName(token));
  return row ? { row, explicitUf: false } : null;
}

/**
 * Resolve a entrada inteira. Duas regras de portão:
 *
 * 1. **Todos** os tokens precisam ser cidade conhecida — um token solto derruba
 *    a leitura toda. É o que impede que uma frase com vírgulas vire um cartão.
 * 2. Uma palavra sozinha não basta. Dezenas de municípios são palavra comum
 *    ("Aurora", "Batalha", "Descanso", "Estrela") e o texto decifrado de uma
 *    prova cai nelas o tempo todo. Sozinho, só passa nome composto ("Juiz de
 *    Fora") ou com UF explícita ("Blumenau/SC") — aí a intenção é inequívoca.
 */
export function lookupCityDDD(input: string): CityDDDMatch[] | null {
  const tokens = input
    .split(SEPARATORS)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const out: CityDDDMatch[] = [];
  let loneWord = false;
  for (const token of tokens) {
    // Duas letras não são cidade — evita que "SC" ou "RJ" soltos casem por acaso.
    if (token.length < 3) return null;
    const hit = resolveToken(token);
    if (!hit) return null;
    loneWord = !hit.explicitUf && !/\s/.test(token);
    out.push({ token, city: hit.row.city, uf: hit.row.uf, ddd: hit.row.ddd });
  }
  if (out.length === 1 && loneWord) return null;
  return out;
}

/** Formata dígitos como telefone brasileiro; null quando não tem 10 nem 11. */
export function formatPhone(digits: string): string | null {
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return null;
}
