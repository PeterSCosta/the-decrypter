import { buildVocabulary } from "./word-rules";
import { decodeWordIndex, encodeWordIndex } from "./words-packed";

/** `encodeWordIndex` devolve uma view; o decoder quer o ArrayBuffer exato. */
function round(words: readonly string[]): string[] {
  return decodeWordIndex(encodeWordIndex(words).slice().buffer);
}

describe("serialização do vocabulário", () => {
  it("volta exatamente o que entrou, na ordem", () => {
    const vocab = buildVocabulary([["casa", "lápis", "porta", "ação", "zebra", "abacaxi"]]);
    expect(round(vocab)).toEqual(vocab);
  });

  it("preserva a dobra sem acento feita no build", () => {
    const vocab = buildVocabulary([["Lápis", "AÇÃO"]]);
    expect(vocab).toEqual(["acao", "lapis"]);
    expect(round(vocab)).toEqual(["acao", "lapis"]);
  });

  it("aguenta vocabulário vazio", () => {
    expect(round([])).toEqual([]);
  });

  it("recusa palavra fora de a–z em vez de gravar lixo", () => {
    expect(() => encodeWordIndex(["cas4"])).toThrow(/fora de a–z/);
  });

  it("recusa sufixo que não cabe no nibble, apontando a causa", () => {
    // A primeira palavra do balde é gravada inteira (`u8 len`), então o nibble
    // só aperta a partir da segunda: 16 letras sem prefixo em comum.
    expect(() => encodeWordIndex(["aa", "bbbbbbbbbbbbbbbb"])).toThrow(/15 letras/);
  });

  /**
   * O teste que importa: com mais palavras que um balde (32), exercita a
   * fronteira entre baldes e a reconstrução por prefixo compartilhado. Um erro
   * de um byte no offset só aparece aqui.
   */
  it("bate com o vocabulário em escala, atravessando baldes", () => {
    const palavras: string[] = [];
    const letras = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 5000; i++) {
      let w = "";
      // Gerador determinístico: mesma sequência a cada execução.
      let seed = i * 2654435761;
      const len = 4 + (i % 9);
      for (let k = 0; k < len; k++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        w += letras[seed % 26];
      }
      palavras.push(w);
    }
    const vocab = buildVocabulary([palavras]);
    expect(vocab.length).toBeGreaterThan(4000);
    expect(round(vocab)).toEqual(vocab);
  });
});
