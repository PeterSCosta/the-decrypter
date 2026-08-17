/**
 * Conteúdo da área "Roadmap / Melhorias" — o que queremos fazer no The
 * Decrypter e ideias já discutidas que ainda não entraram. Curado à mão.
 *
 * Esta é a VITRINE: o que o usuário lê. O backlog técnico, com ondas, fichas e
 * esforço, mora em `docs/PLANO-CIFRAS.md` (e o catálogo de mecânicas do acervo
 * em `docs/TODO-CIFRAS.md`). Item entregue sai daqui — quem quer saber o que a
 * bancada já faz abre a Ajuda, não o Roadmap.
 */
export type RoadStatus = "todo" | "idea" | "blocked";

export interface RoadItem {
  title: string;
  desc: string;
  status: RoadStatus;
  /** Por que ainda não entrou / o que destrava. */
  note?: string;
}

export interface RoadGroup {
  title: string;
  items: RoadItem[];
}

export const STATUS_LABEL: Record<RoadStatus, string> = {
  todo: "A fazer",
  idea: "Ideia",
  blocked: "Em estudo",
};

export const ROADMAP_INTRO =
  "O que queremos melhorar no The Decrypter e as ideias que já conversamos mas ainda não entraram. “Em estudo” = depende de algo externo (dado oficial, chave de API, backend). Saíram desta lista porque já estão na bancada: as cores como decoder (nome ↔ HEX/RGB/HSL, faixas de resistor, catálogo Faber-Castell), a barra de Cadeia (“usar como entrada”), o campo de título, a faixa de dicas, o selo de “palavra real”, o detector de placa de carro (antiga ↔ Mercosul, com a UF pela faixa de letras) e o número por extenso.";

export const ROADMAP: RoadGroup[] = [
  {
    title: "A fazer — integrações de Blumenau",
    items: [
      {
        title: "Consulta de imóvel (SIATU)",
        status: "blocked",
        desc: "Nº de cadastro ou inscrição cadastral → dados do imóvel (IPTU).",
        note: "A página da Prefeitura é ASP.NET WebForms, sem CORS. Precisa de um pequeno backend proxy, ou pegar o cadastro imobiliário via LAI como dataset (melhor).",
      },
    ],
  },
  {
    title: "Ideias rápidas (sem depender de terceiros)",
    items: [
      {
        title: "SAMAE nos 5 dígitos",
        status: "idea",
        desc: "Completar a tabela de Quantidade de dígitos — o gabarito também põe SAMAE no tamanho 5.",
      },
      {
        title: "Datas ao contrário",
        status: "idea",
        desc: "Timestamp Unix ou serial do Excel → data. Hoje a bancada só vai da data para eles.",
        note: "A outra metade deste item — número por extenso ↔ dígitos — já entrou.",
      },
      {
        title: "Mais códigos com dígito verificador",
        status: "idea",
        desc: "RENAVAM, PIS/PASEP, CNH, inscrição estadual, cartão e IMEI (Luhn): a mesma família do boleto e da chave de NF-e que já estão na bancada.",
        note: "Ficaram de fora porque só respondem “é válido”. Boleto, título de eleitor e placa entraram por esconderem um campo legível — vencimento, UF, país. A inscrição estadual é a exceção do grupo (a UF sai de qual das 27 regras fecha) e é a próxima candidata.",
      },
      {
        title: "Compartilhar por URL",
        status: "idea",
        desc: "Link que já abre o decodificador com a entrada preenchida (útil pra mandar pista pra equipe). Vale mais agora que a bancada guarda chave, 2º campo, título e cadeia — tudo isso se perde ao recarregar.",
      },
      {
        title: "Runas e nyctográfico na Cola",
        status: "idea",
        desc: "Completar a prateleira de alfabetos que se leem: o Pigpen e o alfabeto de Libras já estão lá.",
        note: "Ficaram de fora por falta de prova-âncora: a “prova de runas” de 2019 não usa alfabeto rúnico — cada runa é um desenho de dígito feito com células de planilha. Entra quando aparecer uma prova de verdade.",
      },
    ],
  },
  {
    // A bancada acabou de ganhar cinco sistemas de geocódigo de uma vez (MGRS,
    // GEOREF, GARS, carta e grade do IBGE), pela aposta de que a gincana troca
    // de sistema a cada madrugada. Este grupo registra o que a mesma leva
    // deixou de fora — e, principalmente, POR QUÊ, para ninguém refazer a
    // busca daqui a seis meses achando que foi esquecimento.
    title: "Geocódigos que ficaram de fora",
    items: [
      {
        title: "S2 cell ID (Google)",
        status: "idea",
        desc: "Identificador de célula usado por vários serviços de mapa.",
        note: "É um número de 64 bits sem nenhuma assinatura: não dá pra distinguir de qualquer outro número comprido, e o decodificador dispararia em tudo. Só entra no modo “uma cifra só”, se um dia fizer falta.",
      },
      {
        title: "Setor censitário do IBGE",
        status: "idea",
        desc: "O código de 15 dígitos que o IBGE usa para cada setor do Censo → o pedaço de bairro correspondente.",
        note: "Diferente da carta e da grade, que são conta pura, este exige a malha de setores — centenas de MB de polígono. Só vale se virar prova.",
      },
      {
        title: "Grades nacionais de fora do Brasil",
        status: "idea",
        desc: "British National Grid, grade irlandesa, suíça e afins.",
        note: "Baixo valor aqui: a gincana acontece no Vale do Itajaí, e nenhuma dessas grades cai na região. O MGRS, que é mundial, já cobre o caso genérico.",
      },
    ],
  },
  {
    title: "Ideias maiores",
    items: [
      {
        title: "Consulta de placa (ao vivo)",
        status: "blocked",
        desc: "Trazer os dados do veículo pela placa. A leitura offline (formato, conversão antiga ↔ Mercosul e UF) já está na bancada; o que falta é o cadastro do veículo.",
        note: "Não há API gratuita; os provedores exigem token pago. Dá pra ligar igual fizemos com o what3words se você criar uma chave.",
      },
      {
        title: "Bases grandes por consulta (CID-10, CNAE, FIPE)",
        status: "idea",
        desc: "Código de doença, de atividade econômica ou de veículo → o nome correspondente.",
        note: "Não é dificuldade técnica, é peso: cada uma é uma base de centenas de KB embarcada na bancada, e nenhuma prova pediu nenhuma delas até hoje. A FIPE ainda muda todo mês, então nasceria desatualizada. Entram quando uma prova pedir.",
      },
      {
        title: "Inspetor de imagem",
        status: "idea",
        desc: "Upload de imagem → EXIF/metadados, paleta de cores, visualização de canais/LSB (esteganografia) e OCR.",
        note: "É o que falta para as cifras que chegam desenhadas: Pigpen, Libras, disco de setores, faixas de resistor fotografadas. Hoje a Cola dá a legenda e a leitura é no olho.",
      },
      {
        title: "Engine esperto",
        status: "idea",
        desc: "Solver de substituição automático, quebrador de Vigenère sem chave e detector de qual cifra é.",
        note: "A parte barata já entrou: a faixa de dicas diz o que a entrada parece ser (ASCII e não A1Z26, MDC latente, DV que não fecha) e o selo marca a saída que é palavra real.",
      },
      {
        title: "Cadeia automática",
        status: "idea",
        desc: "A bancada tentar sozinha duas camadas (ex.: Base64 → César) e mostrar só o que termina em palavra real.",
        note: "A cadeia manual já existe — botão “usar como entrada” em cada resultado e barra de passos com volta e ramificação. O que falta é a busca automática, que só faz sentido com o selo de palavra real como filtro.",
      },
      {
        title: "Catálogo Faber-Castell completo",
        status: "blocked",
        desc: "Hoje a bancada só conhece as 12 cores conferidas no gabarito; código de 3 dígitos fora dessa lista responde “não catalogado”.",
        note: "A tabela da fabricante só existe em encarte impresso e em digitalizações hospedadas por terceiros — mesma regra do SIATU: não raspar. Caminho: ampliar por digitação manual a partir do encarte oficial.",
      },
    ],
  },
];
