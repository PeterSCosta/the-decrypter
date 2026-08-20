/**
 * Conteúdo da área "Roadmap / Melhorias" — o que queremos fazer no The
 * Decrypter e ideias já discutidas que ainda não entraram. Curado à mão.
 *
 * Esta é a VITRINE: o que o usuário lê. O backlog técnico, com ondas, fichas e
 * esforço, mora em `docs/PLANO-CIFRAS.md` (e o catálogo de mecânicas do acervo
 * em `docs/TODO-CIFRAS.md`). Item entregue sai daqui — quem quer saber o que a
 * bancada já faz abre a Ajuda, não o Roadmap.
 */
/**
 * Os estados de um item da vitrine — e por que dois deles nasceram tarde.
 *
 * Até a Onda 0 a união tinha só `todo | idea | blocked`, e o efeito não era uma
 * limitação de interface: era uma **mentira estrutural**. Um item que entregou
 * não tinha como dizer isso, então ficava como *Ideia* para sempre; e um item
 * que o dono cancelou não tinha como sair, então continuava prometido ao
 * usuário. Os dois casos existiam de verdade: o "Engine esperto" seguia como
 * *Ideia* com o solver de substituição, a quebra de Vigenère e o identificador
 * de cifra **os três em produção**, e o "Compartilhar a ENTRADA por URL" seguia
 * como *A fazer* depois de cancelado.
 *
 * `done` e `wont` existem para que a vitrine possa envelhecer sem mentir.
 */
export type RoadStatus = "todo" | "idea" | "blocked" | "done" | "wont";

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
  done: "Entregue",
  wont: "Cancelado",
};

export const ROADMAP_INTRO =
  "O que queremos melhorar no The Decrypter e as ideias que já conversamos mas ainda não entraram. “Em estudo” = depende de algo externo (dado oficial, chave de API, backend). Saíram desta lista porque já estão na bancada: as cores como decoder (nome ↔ HEX/RGB/HSL, faixas de resistor, catálogo Faber-Castell), a barra de Cadeia (“usar como entrada”), o campo de título, a faixa de dicas, o selo de “palavra real”, o detector de placa de carro (antiga ↔ Mercosul, com a UF pela faixa de letras), o número por extenso, a CID-10 inteira (14.233 códigos, nos dois sentidos), a aba de Geolocalização e o reconhecimento de vídeo do YouTube pelo ID. Em 18–19/08 saíram também: as bases grandes por consulta (CNAE, FIPE e votação do TSE), o endereço de porta dos lotes de Blumenau (57.273 lotes que o cadastro não trazia) com o lote de esquina mostrando os dois, a quadra pelas ruas que a cercam, sete geocódigos novos (Geo URI, ISO 6709, link do OSM, Placekey, C-squares, estação geodésica do IBGE e CAR), o A1Z26 cíclico, os caracteres invisíveis em quatro famílias e a carta topográfica ao milionésimo com o número MI.";

export const ROADMAP: RoadGroup[] = [
  {
    title: "A fazer — integrações de Blumenau",
    items: [
      {
        title: "Consulta de imóvel (SIATU)",
        status: "blocked",
        desc: "Nº de cadastro ou inscrição cadastral → dados do imóvel (IPTU).",
        note: "A esperança era pedir o VM (valor de metro) por LAI e virar dataset. A investigação de agosto/2026 fechou essa porta: a coluna VLR_PGV existe em três camadas do geoportal público e está ZERADA nos 9.372 eixos — não é dado que falta, é dado suprimido na publicação; o VM só sai no Anexo II da LC 632/2007, em PDF. Em compensação a busca achou o que ela queria: o COD_LOG, um número de 1 a 4 dígitos por rua, público e consultável, já na Cola.",
      },
    ],
  },
  {
    title: "Ideias rápidas (sem depender de terceiros)",
    items: [
      {
        title: "Datas ao contrário",
        status: "idea",
        desc: "O serial do Excel → data. O timestamp Unix JÁ ENTROU (10 e 13 dígitos, com faixa de 2001 a 2033 e a hora do Vale ao lado do UTC); falta a volta do serial do Excel, que é a outra metade do item.",
        note: "A outra metade deste item — número por extenso ↔ dígitos — já entrou.",
      },
      {
        title: "Mais códigos com dígito verificador",
        status: "idea",
        desc: "RENAVAM, PIS/PASEP, CNH, inscrição estadual, cartão e IMEI (Luhn): a mesma família do boleto e da chave de NF-e que já estão na bancada.",
        note: "Ficaram de fora porque só respondem “é válido”. Boleto, título de eleitor e placa entraram por esconderem um campo legível — vencimento, UF, país. A inscrição estadual é a exceção do grupo (a UF sai de qual das 27 regras fecha) e é a próxima candidata.",
      },
      {
        title: "Compartilhar a ENTRADA por URL",
        status: "wont",
        desc: "A tela já vai no endereço (/geolocalizacao, /usuarios…). O conteúdo — chave, 2º campo, título e cadeia — fica só na sessão.",
        note: "Cancelado a pedido: o que se quis dos links foi o atalho para a ferramenta, não o compartilhamento do resultado — e /cifra/base64 já resolve isso. A entrada é material de prova e não tem por que viajar na barra de endereço.",
      },
      {
        title: "Runas e nyctográfico na Cola",
        status: "todo",
        desc: "FEITO: a Cola ganhou “Runas — o que engana” e “Nyctográfico — a regra de construção”. O que segue aberto é só o caminho da FOTO para o caractere. Texto antigo: completar a prateleira de alfabetos que se leem. O Pigpen e o alfabeto de Libras já estão lá — e as runas TAMBÉM já decodificam; o que falta é a legenda desenhada.",
        note: "O verbete dizia que as runas ficaram de fora “por falta de prova-âncora”, e as duas metades disso estavam erradas: o Elder e o Younger Futhark transliteram desde sempre, e a âncora existe. O buraco real é de FORMA — quem vê o traço numa foto e não tem o caractere para digitar. O nyctográfico, esse sim, falta inteiro.",
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
        title: "Arquivo — microfone e o miolo do documento",
        status: "todo",
        desc: "Capturar áudio ao vivo pelo microfone, e ler o CONTEÚDO de PDF, SVG e do miolo dos OOXML (hoje o ZIP mostra os nomes, não o que há dentro).",
        note: "O resto da aba Arquivo saiu: identidade pelos bytes, sobra depois do fim, arquivo embutido recortado, texto, entropia, hexdump ancorado, o painel de áudio inteiro (espectrograma, Morse por tom, LSB, recorte por trecho e canal), imagem com planos de bit, canais, EXIF com miniatura e leitura de QR/código de barras da foto, e vídeo com quadro por instante. Este item é só o que sobrou.",
      },
      {
        title: "Engine esperto",
        status: "done",
        desc: "Solver de substituição automático, quebrador de Vigenère sem chave e detector de qual cifra é.",
        note: "Os três entregaram. O solver de substituição decifra 90% em 200 letras e 100% em 400, e não emite abaixo de 200; a quebra de Vigenère recupera a chave inteira a partir de 150 letras; e o identificador ordena por evidência em vez de chutar um nome — inclusive dizendo quando NÃO é. Tudo pontuando em português, que é o que nenhuma ferramenta de fora faz.",
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
