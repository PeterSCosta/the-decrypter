/**
 * Bases públicas e onde consultar — fonte de dados única da seção "Bases e
 * onde consultar" (aba Cola).
 *
 * POR QUE ISTO É DADO E NÃO DECODER: os códigos dessas bases **não têm
 * assinatura**. Uma votação do TSE é `5356`; um VM de rua é "um número
 * arbitrário e estável de ~4 dígitos"; uma plaqueta de poste é um número. Não
 * existe regex, dígito verificador nem faixa que os separe de qualquer outro
 * número — um decoder que disparasse em "4 dígitos" seria ruído puro em toda
 * entrada numérica, e ainda sumiria no dedup do motor. O que resolve a prova
 * não é decodificar: é **saber que aquela base existe e abrir o link certo**.
 *
 * POR QUE NA COLA, E NÃO NO ROADMAP: quem está numa gincana às 23h abre a
 * Cola. O Roadmap é sobre o que a bancada vai fazer; isto é sobre o que a
 * equipe faz agora, à mão, quando a bancada não pode fazer por ela.
 *
 * REGRA QUE ESTA LISTA REGISTRA: base com captcha ou login de terceiro fica
 * `bloqueada` — não se burla nem um nem outro. Base que só existe em arquivo
 * (ZIP, PDF) fica `adiada` até virar consulta, por dados abertos ou pedido
 * oficial — o mesmo caminho que ruas e CEP já percorreram.
 *
 * O exemplo que este cabeçalho dava — "base sem CORS (SIATU) fica adiada" —
 * saiu, porque ele descrevia mal os dois lados: o SIATU manda header de CORS, e
 * o que trava ali não é rede, é o VM não estar publicado em lugar nenhum além
 * de um PDF. Ele agora é `consulta-manual`.
 *
 * CORREÇÃO DE FATO (agosto/2026): o `cid10` era, aqui, O exemplo de `adiada` —
 * "dado aberto em arquivo, pequeno o bastante para embarcar no dia em que uma
 * prova pedir". Esse dia chegou por pedido direto: os 14.233 códigos do ZIP do
 * DATASUS estão no acervo e respondem nos dois sentidos. A regra não mudou; o
 * exemplo é que deixou de ser este, e no momento a lista não tem nenhum
 * `adiada` — o selo continua valendo para a próxima base que só exista em ZIP.
 *
 * CORREÇÃO DE FATO (agosto/2026): o Cidade Iluminada estava aqui como
 * `bloqueada` por "reCAPTCHA + login". A anotação estava errada. Aquilo vale
 * para abrir chamado; a consulta do mapa é anônima e a configuração de Blumenau
 * traz `USAR_CAPTCHA: 0`. A coleta dos 45.285 postes usou o mesmo endereço
 * público que o mapa do site usa, em ritmo educado — nenhuma proteção foi
 * contornada, porque não havia proteção a contornar. A regra não mudou; o fato
 * é que mudou. Os termos do portal falam em uso pessoal e não comercial, o que
 * cobre a bancada; publicar a base pediria o caminho oficial.
 *
 * Âncoras: acervo em `the-logic-lab/scripts/import-historico/acervo`
 * (`GIA-2026.md`, `RESOLUCOES.md`). Os links marcados como conferidos saíram
 * da resolução oficial da própria prova.
 */

export type SourceStatus = "aberta" | "consulta-manual" | "bloqueada" | "adiada";

export interface DataSourceRef {
  /** Slug estável — chave de lista e alvo de link. */
  id: string;
  name: string;
  /** O que a base indexa: de que chave para que valor. */
  indexes: string;
  /** Para que serve na cadeia de uma prova. */
  use: string;
  /** Link OFICIAL de consulta. */
  url: string;
  /** Rótulo curto do link (cabe em 375 px; URL inteira não cabe). */
  urlLabel: string;
  status: SourceStatus;
  /** O que trava e qual é o caminho certo. Obrigatório fora de `aberta`. */
  note?: string;
  /** Provas do acervo que ancoram a base. */
  anchors?: string[];
}

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  aberta: "Aberta",
  "consulta-manual": "Consulta manual",
  bloqueada: "Bloqueada",
  adiada: "Adiada",
};

/** Uma linha explicando o selo — vira a legenda da seção. */
export const SOURCE_STATUS_HINT: Record<SourceStatus, string> = {
  aberta:
    "A bancada já consulta por você — com dado embarcado, pelo backend, ou chamando a fonte direto do navegador.",
  "consulta-manual": "Tem site oficial, mas quem busca é você: abre o link e procura.",
  bloqueada: "Exige captcha ou login de terceiro. Não automatizamos e não burlamos.",
  adiada: "Daria para ter offline, mas depende de pedido oficial (LAI/dados abertos).",
};

/** Ordem de exibição: o que resolve agora primeiro, o que não resolve por último. */
export const SOURCE_STATUS_ORDER: SourceStatus[] = [
  "aberta",
  "consulta-manual",
  "bloqueada",
  "adiada",
];

export const SOURCES_INTRO =
  "Boa parte das provas não é cifra: é “que base é essa?”. Abaixo, as bases que a GIA e o Challenge já usaram — o que cada uma indexa, para que serve na cadeia e onde consultar.";

export const SOURCES: DataSourceRef[] = [
  // ── Abertas: já respondem dentro da bancada ────────────────────────────────
  {
    id: "ruas-blumenau",
    name: "Guia de ruas de Blumenau",
    indexes: "Nome da rua → código, bairro, nº e data da lei, extensão.",
    use: "Confirmar que a rua existe, achar o bairro e usar código ou ano da lei como número.",
    url: "https://www.blumenau.sc.gov.br",
    urlLabel: "blumenau.sc.gov.br",
    status: "aberta",
    note: "4.426 ruas na bancada (3.178 com coordenada), do “Rol de Ruas com Gabaritos” da Prefeitura.",
    anchors: ["GIA-20", "GIA-34"],
  },
  {
    id: "ceps-sc",
    name: "CEP de Santa Catarina",
    indexes: "CEP → logradouro, município e coordenada.",
    use: "CEP como resposta de cadeia, e CEP → ponto no mapa.",
    url: "https://buscacepinter.correios.com.br/app/endereco/index.php",
    urlLabel: "buscacepinter.correios.com.br",
    status: "aberta",
    note: "~40 mil CEPs, só de SC (via Base dos Dados). CEP de fora do estado — como o 38414-561 de Uberlândia da GIA-31 — não está aqui: use a busca dos Correios.",
    anchors: ["GIA-31"],
  },
  {
    id: "municipios-ibge",
    name: "Municípios do IBGE",
    indexes: "Código IBGE ↔ nome do município ↔ UF (os 5.571).",
    use: "Confirmar município e código; casa com DDD e com CEP.",
    url: "https://cidades.ibge.gov.br",
    urlLabel: "cidades.ibge.gov.br",
    status: "aberta",
    note: "Sem coordenada: o cadastro do IBGE não devolve lat/lng, então coordenada → cidade não sai por aqui.",
  },
  {
    id: "cid10",
    name: "CID-10 (doenças)",
    indexes: "Código A00.0 → doença, capítulo e grupo — e o nome da doença → código.",
    use: "Letra + 2 ou 3 dígitos vira nome de doença (e daí letras, iniciais, contagem). Numa prova, o CAPÍTULO costuma ser a pista: o que liga os códigos é o agrupamento, não o diagnóstico.",
    url: "http://www2.datasus.gov.br/cid10/V2008/cid10.htm",
    urlLabel: "datasus.gov.br",
    status: "aberta",
    note: "14.233 códigos na bancada (2.045 categorias + 12.188 subcategorias), do CID10CSV.zip do DATASUS (V2008). Continua sem API — o `cid10.ia.br/api/*` devolve 404 e o portal de dados abertos exige conta no gov.br —, e foi por isso que a base virou acervo em vez de consulta: o ZIP oficial é o caminho que existe.",
  },
  {
    id: "aeroportos",
    name: "Aeroportos (IATA/ICAO)",
    indexes: "Sigla de 3 (IATA) ou 4 letras (ICAO) → aeroporto, cidade, país e coordenada.",
    use: "Trio de letras que quase forma palavra costuma ser aeroporto — e vira cidade ou coordenada.",
    url: "https://openflights.org/data.php",
    urlLabel: "openflights.org",
    status: "aberta",
    note: "7.599 aeroportos embarcados (OpenFlights).",
  },
  {
    id: "pix-ispb",
    name: "Participantes do PIX (ISPB)",
    indexes: "ISPB de 8 dígitos → instituição financeira.",
    use: "Número de 8 dígitos que não é CEP nem data: teste como ISPB → nome do banco.",
    url: "https://www.bcb.gov.br/estabilidadefinanceira/participantespix",
    urlLabel: "bcb.gov.br",
    status: "aberta",
    note: "Única base que não é embarcada: vem do backend. Sem rede, o decoder simplesmente não responde.",
  },
  {
    id: "gs1",
    name: "Prefixos GS1 (código de barras)",
    indexes:
      "3 primeiros dígitos do EAN-13 → país/organização que registrou (mais as faixas de ISBN, ISSN, cupom e uso interno).",
    use: "Código de barras → país → dígito de coordenada.",
    url: "https://www.gs1.org",
    urlLabel: "gs1.org",
    status: "aberta",
    anchors: ["GIA-07"],
  },

  // ── Consulta manual: existe site oficial, a busca é humana ─────────────────
  {
    id: "tse",
    name: "TSE — resultados eleitorais",
    indexes: "Votação exata de um candidato → nome do candidato (Blumenau).",
    use: "Número de 4-5 dígitos → candidato → índice de letra no nome dele. É a mecânica inteira da GIA-34.",
    // O link fica no SIG Eleição porque é o que a resolução da GIA-34 citou —
    // é a consulta que um humano abre. O JSON que a bancada usa está na nota.
    url: "https://sig.tse.jus.br/ords/dwapr/r/seai/sig-eleicao-resultados/home",
    urlLabel: "sig.tse.jus.br",
    status: "aberta",
    note: "A bancada responde, com UMA ressalva que importa: só a eleição de 2024 de Blumenau (188 candidatos, prefeito e vereador). Medido: o caminho `oficial/eleAAAA/…/dados/sc/sc80470-cXXXX-…-u.json` serve só o ciclo corrente — 2016, 2020 e 2022 devolvem 404 e só existem nos ZIPs nacionais. Por isso o card mostra a cobertura junto do acerto: aqui “não achei” não quer dizer “não existe”. Empate de votação é comum (17 das 171 votações distintas), e o card mostra todos os empatados em vez de fingir resposta única.",
    anchors: ["GIA-34"],
  },
  {
    id: "cbmsc",
    name: "CBMSC — mapas de batalhão",
    indexes: "Silhueta de município → região/batalhão dos bombeiros em SC.",
    use: "Mapa marcado → cidade → o nº da região indexa a letra no nome da cidade.",
    url: "https://www.cbm.sc.gov.br/index.php/estrutura/mapas",
    urlLabel: "cbm.sc.gov.br",
    status: "consulta-manual",
    note: "São imagens, não dados: a comparação é a olho, mapa por mapa.",
    anchors: ["GIA-23"],
  },
  {
    id: "oktoberfest",
    name: "Guia oficial da Oktoberfest (PDF)",
    indexes: "Nº da atração no mapa do guia → nome da atração.",
    use: "Par “atração.posição” → letra dentro do nome da atração.",
    url: "https://oktoberfestblumenau.com.br",
    urlLabel: "oktoberfestblumenau.com.br",
    status: "consulta-manual",
    note: "Efêmero: o guia muda a cada edição (o de 2025 saiu como GUIA_OKTOBER_2025_COMPLETO.pdf). Não vale dataset fixo — vale reconhecer o padrão.",
    anchors: ["GIA-33"],
  },
  {
    id: "hathitrust",
    name: "HathiTrust Digital Library",
    indexes: "Livro digitalizado → diferença entre a página do scan e a página impressa.",
    use: "Nº da página impressa → letra por A1Z26 cíclico (989 → A).",
    url: "https://catalog.hathitrust.org",
    urlLabel: "catalog.hathitrust.org",
    status: "consulta-manual",
    note: "Tem API, mas é de nicho e exige o identificador do volume: abrir o scan e conferir a página é mais rápido. O elefante do logo (hathi) é a pista visual.",
    anchors: ["GIA-42"],
  },
  {
    id: "portal-covid-blumenau",
    name: "Portal COVID da Prefeitura de Blumenau",
    indexes: "Rótulos oficiais das ilustrações de prevenção.",
    use: "Os números do enunciado indexam letras nos rótulos.",
    url: "https://www.blumenau.sc.gov.br",
    urlLabel: "blumenau.sc.gov.br",
    status: "consulta-manual",
    note: "Efêmero e já obsoleto: a aba saiu do ar com o fim da campanha. Se não achar, procure no arquivo da web. Não vale automatizar.",
    anchors: ["GIA-12"],
  },
  {
    id: "anatel-fique-ligado",
    name: "Anatel — Fique Ligado",
    indexes: "Contagem de telefones públicos por município e prestadora.",
    use: "Serve para conferir se uma cidade ainda tem orelhão, não para achar UM orelhão.",
    url: "https://informacoes.anatel.gov.br/paineis/acompanhamento-e-controle/orelhoes",
    urlLabel: "informacoes.anatel.gov.br",
    status: "consulta-manual",
    note: "CORREÇÃO (agosto/2026): o “Fique Ligado” ACABOU — a URL antiga responde 302 para este painel novo (verificado). A ficha vendia uma capacidade que morreu: o painel atual dá contagem por município e prestadora, e NÃO um mapa pesquisável por número de orelhão. Sem API: a base de estações é marcada como restrita pela própria Anatel, e o `TUP.geojson` devolve HTTP 200 com o corpo do bloqueio do WAF — status 200 ali não é sucesso.",
    anchors: ["ITC-2023"],
  },
  {
    id: "faber-castell",
    name: "Catálogo de cores Faber-Castell",
    indexes: "Código de 3 dígitos do lápis → nome da cor.",
    use: "Código → nome → contar a letra dentro do nome (sem espaços).",
    url: "https://www.faber-castell.com.br",
    urlLabel: "faber-castell.com.br",
    status: "consulta-manual",
    note: "Tente o Decodificador PRIMEIRO: as 12 cores conferidas contra o gabarito já são resolvidas na bancada, sem sair daqui. O site é para o resto do catálogo, que só sai em encarte impresso — ampliar é digitação manual, não raspagem. Pantone está fora: catálogo proprietário licenciado.",
    anchors: ["GIA-39"],
  },
  {
    id: "correios-rastreio",
    name: "Correios — rastreamento",
    indexes: "Código AA123456789BR → histórico do objeto.",
    use: "Aquele código estranho de 13 caracteres; o valor costuma estar nas letras, nas datas ou nas cidades.",
    url: "https://rastreamento.correios.com.br",
    urlLabel: "rastreamento.correios.com.br",
    status: "consulta-manual",
    note: "A consulta programática exige API autenticada dos Correios — não há dataset offline possível. Reconhecer a forma e consultar à mão.",
  },
  {
    id: "fipe",
    name: "Tabela FIPE",
    indexes: "Código FIPE (ex.: 005345-7) → marca, modelo, ano e preço médio.",
    use: "Código → modelo → nome do carro.",
    url: "https://veiculos.fipe.org.br",
    urlLabel: "veiculos.fipe.org.br",
    status: "aberta",
    note: "O Decodificador consulta sozinho: cole `005345-7` e volta VW Gol 2014 Flex com o preço do mês vigente. **CORREÇÃO da nota anterior, que estava invertida e custou meia hora:** quem aceita o código nu é o `ConsultarAnoModeloPeloCodigoFipe` — o `ConsultarValorComTodosParametros` com `tipoConsulta=codigo` sozinho responde “Parâmetros inválidos” nos três tipos de veículo. A ordem certa é: código → anos → valor. O tipo (1 carro, 2 moto, 3 caminhão) não está no código, então varre-se os três; o errado responde `nadaencontrado` na hora. Chamada do NAVEGADOR, nunca do backend: o WAF da FIPE bloqueia IP de datacenter (foi o que derrubou a BrasilAPI), e forjar cabeçalho seria driblar barreira posta de propósito. API interna e sem contrato — se o site mudar, isto quebra.",
  },
  {
    id: "cnae",
    name: "CNAE (atividades econômicas)",
    indexes: "Código 00.00-0/00 → atividade econômica, com a hierarquia até a seção.",
    use: "Número com aquela pontuação típica → texto da atividade. Numa cadeia, quem costuma ligar os códigos é a SEÇÃO, não a atividade.",
    url: "https://concla.ibge.gov.br/busca-online-cnae.html",
    urlLabel: "concla.ibge.gov.br",
    status: "aberta",
    note: "O Decodificador responde na hora: cole `62.01-5/01` (ou os 7 dígitos nus) e a bancada consulta o IBGE pelo backend, devolvendo atividade, classe, grupo, divisão e seção. A pontuação é a assinatura — os 7 dígitos nus entram com nota baixa e só sobrevivem se o IBGE confirmar. Armadilha medida da API: código inexistente devolve **HTTP 200 com `[]`**, não 404; quem desserializar direto estoura no primeiro número errado.",
  },
  {
    id: "cidade-iluminada",
    name: "Cidade Iluminada (postes, Exati)",
    indexes: "Nº da plaqueta do poste → ponto no mapa (e, com o Street View, a placa pendurada).",
    use: "Plaqueta → local → nome oficial da placa de trânsito → índice de letra.",
    url: "https://novo.cidadeiluminada.com.br/#/address",
    urlLabel: "novo.cidadeiluminada.com.br",
    status: "aberta",
    note: "A bancada já responde: 45.285 postes na aba Postes. A anotação anterior dizia 'reCAPTCHA + login' — isso vale para abrir chamado, não para a consulta do mapa, que é anônima e tem `USAR_CAPTCHA: 0` na configuração de Blumenau. Não houve bypass de nada: a coleta usou o mesmo endereço público que o mapa do site usa, num ritmo educado. A regra de não burlar captcha nem login continua valendo — o que mudou foi o fato.",
    anchors: ["GIA-25"],
  },
  {
    id: "cod-log-blumenau",
    name: "Código de logradouro de Blumenau (COD_LOG)",
    indexes: "Nome da rua ↔ COD_LOG, um número estável de 1 a 4 dígitos; e bairro e CEP do trecho.",
    use: "É o “número secreto por rua” que se procurava no VM — e este existe, é público e é consultável. Número de ~4 dígitos → rua → letra, bairro ou CEP.",
    url: "https://geo.blumenau.sc.gov.br",
    urlLabel: "geo.blumenau.sc.gov.br",
    status: "aberta",
    note: "Achado colateral da investigação do SIATU, e vale mais que ela. O geoportal da Prefeitura é ArcGIS REST público: a camada `consulta_construir/Rol_de_ruas/MapServer/0` traz `COD_LOG` em 9.370 eixos, com `DESCRICAO`, `BAIRRO_DIR` e `CEP_DIREIT`. Verificado aqui: `7 DE SETEMBRO` → 998, no Centro, CEP 89010-200. Atenção a dois detalhes: a mesma rua aparece em vários eixos (um por trecho), então o mesmo código volta repetido com bairros diferentes; e o campo do nome é `DESCRICAO`, não `NOME` — consultar `NOME` devolve erro 400, não lista vazia.",
    anchors: ["GIA-20", "GIA-34"],
  },
  {
    id: "lotes-blumenau",
    name: "Cadastro imobiliário de Blumenau",
    indexes: "Inscrição imobiliária → endereço, bairro, CEP, área e coordenada do lote.",
    use: "Número burocrático estável por PEDAÇO DE CIDADE — a mesma família do VM que a GIA-20 e a GIA-34 usaram, e esta veio inteira.",
    url: "https://geo.blumenau.sc.gov.br",
    urlLabel: "geo.blumenau.sc.gov.br",
    status: "aberta",
    note: "84.539 lotes na bancada, do geoportal da Prefeitura. O Decodificador aceita as QUATRO grafias — `412400200002000`, `4.1.24.20.2.0`, `4-1-24-20-2` e o mesmo número sem os hífens (`41241628`), que é o que se copia da tela do geoportal — e devolve o ponto no mapa. O NÚMERO DE PORTA vem de uma segunda tabela do mesmo geoportal: 57.273 lotes ganharam número que o cadastro não trazia, e o lote de esquina mostra os dois endereços. Com QUATRO grupos o número aponta a QUADRA, e aí quem responde é o card de quadra, descrita pelas ruas que a cercam; a Biblioteca lista tudo e busca por rua. Duas ressalvas honestas: a coordenada é o CENTROIDE do lote, não a porta; e a base tem 48 lotes sem inscrição, que só se acham pelo nome da rua. Armadilha do serviço: os zeros à esquerda são obrigatórios na chave, e o carnê do IPTU os omite — a bancada normaliza, quem consultar na mão precisa lembrar.",
  },

  // ── Adiada: dá para ter offline, falta o pedido oficial ────────────────────
  {
    id: "siatu-vm",
    name: "SIATU / planta de valores (VM)",
    indexes:
      "Rua de Blumenau ↔ VM (valor de metro), um número estável de ~4 dígitos; e o cadastro do imóvel (IPTU).",
    use: "VM → rua, e VM lido como ano eleitoral. É o melhor “número secreto por rua” que existe.",
    url: "https://www.blumenau.sc.gov.br/cidadao/Pages/Siatu/Imobiliario/ConsultaImovel/ConsultaImovel.aspx",
    urlLabel: "blumenau.sc.gov.br · SIATU",
    status: "consulta-manual",
    note: "CORREÇÃO (agosto/2026): o selo `adiada` supunha que bastava pedir por LAI para o VM virar dado aberto. O geoportal MOSTRA que não: a coluna `VLR_PGV` existe em três camadas do ArcGIS público e está zerada em 100% dos 9.372 eixos (verificado por estatística no servidor) — não é dado ausente, é dado suprimido na publicação. O VM só existe no Anexo II da LC 632/2007, em PDF de 202 páginas. A consulta do SIATU segue ASP.NET WebForms e continua sendo à mão. Em compensação, a caça ao VM achou o que ela queria: veja `cod-log-blumenau`.",
    anchors: ["GIA-20", "GIA-34"],
  },
];

export interface SourceGroup {
  status: SourceStatus;
  label: string;
  hint: string;
  items: DataSourceRef[];
}

/**
 * Agrupa por selo, na ordem de `SOURCE_STATUS_ORDER` e preservando a ordem
 * interna de `SOURCES`. Grupo vazio não é devolvido — a seção não deve mostrar
 * cabeçalho sem conteúdo.
 */
export function sourcesByStatus(list: DataSourceRef[] = SOURCES): SourceGroup[] {
  const groups: SourceGroup[] = [];
  for (const status of SOURCE_STATUS_ORDER) {
    const items = list.filter((s) => s.status === status);
    if (items.length === 0) continue;
    groups.push({
      status,
      label: SOURCE_STATUS_LABEL[status],
      hint: SOURCE_STATUS_HINT[status],
      items,
    });
  }
  return groups;
}
