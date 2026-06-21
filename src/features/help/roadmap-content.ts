/**
 * Conteúdo da área "Roadmap / Melhorias" — o que queremos fazer no The
 * Decrypter e ideias já discutidas que ainda não entraram. Curado à mão.
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
  "O que queremos melhorar no The Decrypter e as ideias que já conversamos mas ainda não entraram. “Em estudo” = depende de algo externo (dado oficial, chave de API, backend).";

export const ROADMAP: RoadGroup[] = [
  {
    title: "A fazer — integrações de Blumenau",
    items: [
      {
        title: "Cidade Iluminada (postes)",
        status: "blocked",
        desc: "Buscar a placa de um poste de iluminação → localização.",
        note: "A API (Exati) tem reCAPTCHA + login e não deixa baixar em massa. Caminho certo: pedir o cadastro de postes por dados abertos / LAI à Prefeitura ou à concessionária e ligar como dataset.",
      },
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
        title: "Detector de placa de carro (offline)",
        status: "idea",
        desc: "Reconhecer o formato (antigo ABC-1234 vs Mercosul ABC1D23) e a UF pelo prefixo das placas antigas. Sem API, só lógica.",
      },
      {
        title: "SAMAE nos 5 dígitos",
        status: "idea",
        desc: "Completar a tabela de Quantidade de dígitos — o gabarito também põe SAMAE no tamanho 5.",
      },
      {
        title: "Cores como decoder",
        status: "idea",
        desc: "Nome da cor ↔ nº de letras, soma A1Z26 e HEX direto na busca (hoje só na aba Cola).",
      },
      {
        title: "Utilitários de número",
        status: "idea",
        desc: "Número por extenso e timestamp ↔ data.",
      },
      {
        title: "Compartilhar por URL",
        status: "idea",
        desc: "Link que já abre o decodificador com a entrada preenchida (útil pra mandar pista pra equipe).",
      },
    ],
  },
  {
    title: "Ideias maiores",
    items: [
      {
        title: "Consulta de placa (ao vivo)",
        status: "blocked",
        desc: "Trazer os dados do veículo pela placa.",
        note: "Não há API gratuita; os provedores exigem token pago. Dá pra ligar igual fizemos com o what3words se você criar uma chave.",
      },
      {
        title: "Inspetor de imagem",
        status: "idea",
        desc: "Upload de imagem → EXIF/metadados, paleta de cores, visualização de canais/LSB (esteganografia) e OCR.",
      },
      {
        title: "Engine esperto",
        status: "idea",
        desc: "Solver de substituição automático, quebrador de Vigenère sem chave e detector de qual cifra é.",
      },
      {
        title: "Decodificação recursiva",
        status: "idea",
        desc: "Encadear decoders automaticamente (ex.: Base64 → César → texto legível).",
      },
    ],
  },
];
