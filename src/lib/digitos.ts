/**
 * Dígitos que não são `0`..`9`, e por que a bancada precisa saber disso.
 *
 * `\d` em JavaScript é **só** `[0-9]`. Então `replace(/\D/g, "")` — o jeito que
 * este repositório extrai números em 17 lugares — não deixa o dígito estrangeiro
 * de fora: ele o **apaga**. Um CEP escrito em algarismo arábico-índico
 * (`٨٩٠١٠٠٠٠`) vira string vazia, e todo decoder numérico cala em silêncio.
 * Silêncio é o segundo pior comportamento desta bancada, atrás só da resposta
 * errada — e aqui o silêncio não tem nem motivo visível para quem digitou.
 *
 * Isto é normalização de ENTRADA, não decoder: acontece uma vez, na porta,
 * antes do fan-out, e por isso não cobra pedágio no ranking nem emite cartão.
 * Consertar os 17 `replace` um a um seria consertar o sintoma e deixar o 18º
 * nascer errado.
 *
 * Os blocos cobertos são os de dígito decimal contíguo que aparecem em material
 * de prova (documento escaneado, print de site estrangeiro, fonte exótica). Não
 * é a tabela Unicode inteira de propósito: um bloco que ninguém vai digitar
 * numa gincana do Vale só aumenta a chance de converter o que não devia.
 */
const BLOCOS: [number, string][] = [
  [0x0660, "árabe-índico"],
  [0x06f0, "árabe-índico estendido (persa/urdu)"],
  [0x0966, "devanágari"],
  [0x09e6, "bengali"],
  [0x0be6, "tâmil"],
  [0x0e50, "tailandês"],
  [0xff10, "largura plena"],
];

const RE = new RegExp(
  `[${BLOCOS.map(([b]) => `\\u${b.toString(16).padStart(4, "0")}-\\u${(b + 9).toString(16).padStart(4, "0")}`).join("")}]`,
  "g",
);

/**
 * Largura plena que NÃO é dígito — letra, pontuação, o resto do bloco.
 *
 * Serve à exceção abaixo, e só a ela.
 */
const OUTRA_LARGURA_PLENA = /[\uff01-\uff0f\uff1a-\uffef]/;

/**
 * Troca dígito decimal não-ASCII pelo equivalente `0`..`9`.
 *
 * Só mexe em dígito: letra, pontuação e o resto do texto passam intactos, e uma
 * entrada que já é ASCII volta idêntica (mesma referência não, mesmo conteúdo
 * sim) — então chamar isto na porta é seguro para todo o resto da bancada.
 *
 * ── A EXCEÇÃO DA LARGURA PLENA, E POR QUE ELA EXISTE ───────────────────────
 * Dos sete blocos, a largura plena é o ÚNICO que o decoder `unicode-styles`
 * também cobre — e ele cobre a LINHA INTEIRA, letras junto. Consertar só os
 * dígitos aqui, na porta, cegava aquele decoder: `１２３ｆ` normalizado vira
 * `123ｆ`, a cobertura cai para 1 de 4 e ele não emite mais nada. Os dígitos
 * ficavam certos, o `ｆ` ficava órfão, e o único card que consertaria a string
 * inteira sumia — justamente porque a normalização o "ajudou".
 *
 * Então: havendo qualquer OUTRO caractere de largura plena no texto, a
 * normalização não toca nele e deixa o trabalho para quem faz melhor. Os outros
 * seis blocos (árabe-índico, devanágari, bengali, tâmil, tailandês) não estão
 * em tabela de estilo nenhuma e seguem sendo convertidos aqui.
 */
export function normalizaDigitos(texto: string): string {
  if (!RE.test(texto)) {
    RE.lastIndex = 0;
    return texto;
  }
  RE.lastIndex = 0;
  if (OUTRA_LARGURA_PLENA.test(texto)) return texto;
  return texto.replace(RE, (c) => {
    const cp = c.codePointAt(0) ?? 0;
    const base = BLOCOS.find(([b]) => cp >= b && cp <= b + 9);
    return base ? String(cp - base[0]) : c;
  });
}

/** Os blocos que `normalizaDigitos` conhece — usado pela Cola e pelos testes. */
export const BLOCOS_DE_DIGITO = BLOCOS.map(([base, nome]) => ({
  nome,
  exemplo: Array.from({ length: 10 }, (_, i) => String.fromCodePoint(base + i)).join(""),
}));
