/**
 * Fichas de Identificação da Comissão de Provas (GCB 2026).
 *
 * ── O QUE ESTA BASE RESPONDE ────────────────────────────────────────────────
 * `ZAZ` → Carlos Eduardo Hoepers, fobia Fronemofobia, alvo "equipes que tentam
 * interpretar o regulamento". São as 17 fichas que a CP publicou de si mesma no
 * Instagram em 21/08/2026, com a arte inteira guardada em `public/fichas/`.
 *
 * Vale para a bancada por dois motivos práticos: a prova cita os codinomes
 * deles, e a própria ficha esconde coisa — o `ALVO` do DIOGO é `MCACLCAS`, que
 * não é palavra de língua nenhuma, e o `ARQUIVO N` é o MESMO nas 17
 * (`R325B4915`), o que faz dele um número de arte, não um identificador.
 *
 * ── POR QUE O CASAMENTO É EXATO, E NÃO POR SUBSTRING ────────────────────────
 * Os codinomes são nomes próprios curtos e comuns — DIEGO, RENATA, ADRI, TATI,
 * SUZI, CARMO. Uma porta por substring acenderia em prosa: qualquer texto
 * decifrado que contivesse "diego" ganharia um card de ficha. Então o
 * `casar()` exige que a ENTRADA INTEIRA seja o termo, que é o mesmo desenho da
 * porta completa do decoder de loja. Busca larga (nome no meio da frase,
 * pedaço de diagnóstico) existe, mas mora no `buscar()` — a Biblioteca, onde
 * quem pergunta já escolheu o contexto.
 */

import { stripDiacritics } from "@/features/decoder/engine/util";

export interface Ficha {
  slug: string;
  /** O nome de guerra impresso em IDENTIFICAÇÃO. */
  codinome: string;
  nomeCivil: string;
  /** A frase entre aspas no topo de INFORMAÇÕES GERAIS. */
  frase: string;
  fobia: string;
  alvo: string;
  diagnostico: string;
  prognostico: string;
  /** Leitura NOSSA da foto do polaroide — não está escrito na ficha. */
  personagem: string;
  shortcode: string;
  url: string;
  publicadoEm: string;
  /** Caminho do dossiê inteiro (735×1072). */
  imagem: string;
  /** Caminho do polaroide do personagem (216×304). */
  mini: string;
}

export interface FichasData {
  source: string;
  generatedAt: string;
  coletadoEm: string;
  /** `R325B4915` — igual nas 17. Ver o aviso. */
  arquivoN: string;
  periculosidade: string;
  aviso: string;
  normalizacao: string;
  personagem: string;
  /** A ficha do ANDY foi publicada e removida antes da coleta. */
  lacuna: string;
  count: number;
  fichas: Ficha[];
}

/** Em que campo a entrada bateu — o card diz isso, porque muda o que ele mostra. */
export type CampoDaFicha = "codinome" | "nome" | "arquivo" | "fobia" | "alvo" | "personagem";

export interface AcertoFicha {
  ficha: Ficha;
  campo: CampoDaFicha;
}

const dobra = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Os termos de fobia de uma ficha, separados.
 *
 * A do CRISTIAN é "Aracnofobia e irritar Fabíola": quem digita `aracnofobia`
 * tem de achar a ficha, e quem digita a frase inteira também. Sem isto, só a
 * frase inteira casaria — e ninguém digita a frase inteira.
 */
export function termosDeFobia(fobia: string): string[] {
  const inteiro = dobra(fobia);
  const partes = inteiro
    .split(/\s+/)
    .filter((p) => /(fobia|phobia|filia)$/.test(p))
    .filter((p) => p.length > 4);
  return [...new Set([inteiro, ...partes])];
}

/**
 * A entrada INTEIRA é o termo? Devolve todas as fichas que casam.
 *
 * Devolve lista, e não a primeira: o `arquivoN` é o mesmo nas 17, então quem
 * digita `R325B4915` recebe as 17 — que é a resposta verdadeira, e é
 * exatamente o que o card precisa dizer.
 */
export function casar(data: FichasData | null, texto: string): AcertoFicha[] {
  if (!data) return [];
  const q = dobra(texto);
  if (!q) return [];

  if (q === dobra(data.arquivoN)) {
    return data.fichas.map((ficha) => ({ ficha, campo: "arquivo" as const }));
  }

  const acertos: AcertoFicha[] = [];
  for (const ficha of data.fichas) {
    if (dobra(ficha.codinome) === q) acertos.push({ ficha, campo: "codinome" });
    else if (dobra(ficha.nomeCivil) === q) acertos.push({ ficha, campo: "nome" });
    else if (termosDeFobia(ficha.fobia).includes(q)) acertos.push({ ficha, campo: "fobia" });
    else if (dobra(ficha.alvo) === q) acertos.push({ ficha, campo: "alvo" });
    else if (ficha.personagem && dobra(ficha.personagem) === q)
      acertos.push({ ficha, campo: "personagem" });
  }
  return acertos;
}

/**
 * Busca larga, para a Biblioteca — qualquer pedaço de qualquer campo.
 *
 * Generosa de propósito, pelo mesmo motivo do `buscar` das lojas: quem chega na
 * Biblioteca já escolheu o contexto. Termo vazio devolve as 17.
 */
export function buscar(data: FichasData | null, termo: string): Ficha[] {
  if (!data) return [];
  const q = dobra(termo);
  if (!q) return data.fichas;
  return data.fichas.filter((f) =>
    dobra(
      [
        f.codinome,
        f.nomeCivil,
        f.personagem,
        f.frase,
        f.fobia,
        f.alvo,
        f.diagnostico,
        f.prognostico,
      ].join(" "),
    ).includes(q),
  );
}
