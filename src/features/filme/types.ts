/**
 * A ficha de um filme — e a REGRA de qual título mostrar.
 *
 * ── POR QUE QUATRO TÍTULOS, E POR QUE ISSO É O ITEM INTEIRO ─────────────────
 * A prova de gincana cita o filme pelo nome que ele tem no Brasil. Trocar esse
 * nome pelo original, ou pelo de Portugal, é a resposta errada com melhor
 * disfarce que esta bancada pode dar: soa certo, está em português, e encerra a
 * linha de investigação de quem confiou.
 *
 * ── A COBERTURA, MEDIDA NO WIKIDATA EM 2026-08-20 ──────────────────────────
 * Dos filmes de 2019 com ID da IMDb, quantos têm título pt-BR (rótulo OU
 * apelido): **6,2%** no geral · 11,7% com ≥10 wikis · 35,6% com ≥25 · **66,7%
 * com ≥50**. Ou seja: um terço dos filmes mais conhecidos daquele ano não tem
 * título brasileiro na fonte. `tituloBr` ausente é o caso COMUM — e é por isso
 * que a tela precisa saber dizer "não sei o título daqui" em vez de preencher
 * o campo com o que sobrou.
 */
export interface Filme {
  imdbId: string;
  /** O nome no Brasil. Ausente na maioria das vezes — ver o cabeçalho. */
  tituloBr: string | null;
  /** O nome em PORTUGAL. Nunca serve como substituto do de cima. */
  tituloPt: string | null;
  tituloOriginal: string | null;
  tituloIngles: string | null;
  ano: number | null;
  duracaoMin: number | null;
  direcao: string[] | null;
  generos: string[] | null;
  paises: string[] | null;
  wikidataId: string | null;
  fonte: string;
}

/**
 * As DUAS leituras que a tela sempre mostra quando existem.
 *
 * Pedido do dono, e ele tem razão: numa prova, o título em inglês e o
 * brasileiro servem a coisas diferentes — um casa com o que está escrito no
 * enunciado, o outro com o que está escrito no cartaz. Escolher um e esconder o
 * outro obriga a pessoa a adivinhar qual a bancada escolheu.
 */
export interface Titulos {
  /** Marcado `pt-br`: é o daqui, sem ambiguidade. */
  br: string | null;
  /** Marcado só `pt`: português, SEM marca de país — ver abaixo. */
  pt: string | null;
  /** O original, e o inglês quando o original não é em inglês. */
  original: string | null;
  ingles: string | null;
}

/** De onde veio o título que a tela está mostrando. */
export type OrigemTitulo = "br" | "original" | "nenhum";

export interface TituloEscolhido {
  texto: string;
  origem: OrigemTitulo;
  /** O que a tela escreve embaixo do título, para ele não passar por outro. */
  ressalva: string | null;
}

/**
 * Qual título mostrar, e com que ressalva.
 *
 * A ordem NÃO é "brasileiro, senão português, senão inglês". O título de
 * Portugal jamais entra nesta escada: "Regresso ao Futuro" no lugar de "De
 * Volta Para o Futuro" é um nome plausível, em português, e errado. Ele existe
 * na ficha, aparece rotulado como de Portugal, e não substitui nada.
 */
export function tituloPrincipal(f: Filme): TituloEscolhido {
  if (f.tituloBr) return { texto: f.tituloBr, origem: "br", ressalva: null };

  const original = f.tituloOriginal ?? f.tituloIngles;
  if (original) {
    return {
      texto: original,
      origem: "original",
      // A frase importa: ela distingue "o filme se chama assim no Brasil" de
      // "a fonte não sabe como ele se chama no Brasil". São coisas diferentes
      // e a fonte não permite decidir entre elas.
      ressalva: "título original — o Wikidata não registra um título marcado como brasileiro",
    };
  }
  return { texto: f.imdbId, origem: "nenhum", ressalva: "sem título registrado na fonte" };
}

/**
 * Os títulos que a tela deve listar, sempre que existirem e forem diferentes.
 *
 * Nada é escondido por ser redundante: quando o filme se chama igual nos dois
 * lados (Skyfall, Oppenheimer), a linha some sozinha porque os valores
 * coincidem — mas quando diferem, as duas aparecem.
 */
export function titulosDe(f: Filme): Titulos {
  return {
    br: f.tituloBr,
    pt: f.tituloPt,
    original: f.tituloOriginal,
    ingles: f.tituloIngles && f.tituloIngles !== f.tituloOriginal ? f.tituloIngles : null,
  };
}

/** `181` → `3 h 1 min`. Duração de filme se lê em horas. */
export function duracaoLegivel(min: number | null): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min (${min} min)` : `${min} min`;
}

/**
 * Um item QUALQUER do Wikidata — o que sobra quando o `Q…` não é filme.
 *
 * ── POR QUE ISTO EXISTE, E POR QUE NÃO CONTRADIZ A ONDA 10 ────────────────
 * A avaliação da Onda 10 recusou resolver NOME → entidade, e a razão era a
 * ambiguidade: "Bacurau" é filme e é ave, "Maria" são 113 candidatos. Um QID
 * não tem esse problema — ele identifica **um** item e só um, por construção.
 * É acerto exato, não triagem.
 *
 * E o que ele devolve cai no domínio central desta casa: quando o item tem
 * COORDENADA, o card vira ponto no mapa. `Q155` é o Brasil.
 */
export interface ItemWikidata {
  qid: string;
  rotulo: string | null;
  /** A língua do rótulo — a tela diz de onde o nome veio, em vez de fingir. */
  lingua: string | null;
  descricao: string | null;
  tipos: string[] | null;
  /** `tt…` para título, `nm…` para pessoa. O prefixo diz o que é. */
  imdbId: string | null;
  lat: number | null;
  lng: number | null;
  ehFilme: boolean;
}
