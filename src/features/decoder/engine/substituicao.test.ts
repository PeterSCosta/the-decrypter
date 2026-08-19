import { beforeAll, describe, expect, it } from "vitest";
import { QUADGRAMAS_N } from "./quadgramas-pt";
import {
  aplicarChave,
  carregarQuadgramas,
  chaveEmTexto,
  indiceCoincidencia,
  letrasDe,
  reiniciosPara,
  resolverSubstituicao,
  tabelaQuadgramas,
} from "./substituicao";

/**
 * A tabela de quadrigramas (161 KB) entra por `import()` sob demanda — no
 * navegador quem dispara é o próprio decoder, e o `use-decoder` refaz a rodada
 * quando ela chega. Aqui o teste carrega antes, senão todo caso mediria o
 * estado "tabela ainda não chegou", em que o decoder devolve vazio de propósito.
 */
beforeAll(async () => {
  await carregarQuadgramas();
});

const A = 97;
const idx = (q: string) =>
  ((q.charCodeAt(0) - A) * 26 + (q.charCodeAt(1) - A)) * 676 +
  (q.charCodeAt(2) - A) * 26 +
  (q.charCodeAt(3) - A);

/** Alfabeto de substituição determinístico, para cifrar nos testes. */
function alfabeto(semente: number): number[] {
  let s = semente >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  const a = [...Array(26).keys()];
  for (let i = 25; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cifrar(texto: string, alfa: number[]): string {
  let out = "";
  for (const ch of texto) {
    const c = ch.charCodeAt(0) - A;
    out += c >= 0 && c < 26 ? String.fromCharCode(A + alfa[c]) : ch;
  }
  return out;
}

const TEXTO =
  "a resposta desta etapa esta escondida embaixo da ponte de ferro que fica perto da " +
  "estacao central da cidade e para chegar ate ela a equipe precisa seguir pela avenida " +
  "principal ate o cruzamento com a rua das flores onde existe uma placa antiga";

describe("tabela de quadrigramas", () => {
  it("expande exatamente os quadrigramas que o build gravou", () => {
    const t = tabelaQuadgramas();
    expect(t.length).toBe(26 ** 4);
    let naoZero = 0;
    for (const v of t) if (v > 0) naoZero++;
    expect(naoZero).toBe(QUADGRAMAS_N);
  });

  it("dá peso alto ao que o português usa e zero ao que ele não usa", () => {
    const t = tabelaQuadgramas();
    // terminações e trechos correntes
    for (const q of ["ment", "ando", "esta", "ente", "para"]) {
      expect(t[idx(q)]).toBeGreaterThan(8);
    }
    // sequências que não existem em português
    for (const q of ["qxzj", "wkxq", "jjjj"]) {
      expect(t[idx(q)]).toBe(0);
    }
  });

  it("é memoizada: a segunda chamada devolve o mesmo vetor", () => {
    expect(tabelaQuadgramas()).toBe(tabelaQuadgramas());
  });
});

describe("índice de coincidência", () => {
  it("separa português de ruído, e a substituição o preserva", () => {
    const claro = letrasDe(TEXTO);
    const cifrado = letrasDe(cifrar(TEXTO, alfabeto(7)));
    const icClaro = indiceCoincidencia(claro);
    const icCifrado = indiceCoincidencia(cifrado);
    // A substituição só renomeia letras: o IC é o MESMO número.
    expect(icCifrado).toBeCloseTo(icClaro, 12);
    expect(icClaro).toBeGreaterThan(0.06);

    // xorshift, não um LCG: o resto de um LCG por 26 é enviesado nos bits
    // baixos e daria IC 0,080 — ruído que parece linguagem, e o teste passaria
    // a medir o gerador em vez do índice.
    const aleatorio = new Uint8Array(300);
    let s = 12345;
    for (let i = 0; i < aleatorio.length; i++) {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      aleatorio[i] = Math.floor((s / 4294967296) * 26);
    }
    expect(indiceCoincidencia(aleatorio)).toBeLessThan(0.05);
  });
});

describe("orçamento de trabalho", () => {
  it("troca reinícios por letras, dentro dos limites", () => {
    // texto curto: teto de reinícios
    expect(reiniciosPara(60)).toBe(200);
    // texto médio: o produto fica perto do orçamento
    expect(reiniciosPara(200) * 200).toBeLessThanOrEqual(16_600);
    expect(reiniciosPara(200)).toBeGreaterThan(50);
    // texto longo: piso de reinícios
    expect(reiniciosPara(5000)).toBe(8);
  });
});

describe("solver de substituição", () => {
  it("recupera o texto em claro de uma substituição de verdade", () => {
    const cifrado = cifrar(TEXTO, alfabeto(4242));
    const solucao = resolverSubstituicao(letrasDe(cifrado));
    expect(aplicarChave(cifrado, solucao.chave)).toBe(TEXTO);
  });

  it("é determinístico: a mesma entrada dá a mesma chave, sempre", () => {
    const cifrado = cifrar(TEXTO, alfabeto(99));
    const a = resolverSubstituicao(letrasDe(cifrado));
    const b = resolverSubstituicao(letrasDe(cifrado));
    const c = resolverSubstituicao(letrasDe(cifrado));
    expect([...b.chave]).toEqual([...a.chave]);
    expect([...c.chave]).toEqual([...a.chave]);
    expect(b.fitness).toBe(a.fitness);
  });

  it("entradas diferentes semeiam corridas diferentes", () => {
    const um = resolverSubstituicao(letrasDe(cifrar(TEXTO, alfabeto(1))));
    const dois = resolverSubstituicao(letrasDe(cifrar(TEXTO, alfabeto(2))));
    expect([...um.chave]).not.toEqual([...dois.chave]);
  });

  it("não gasta mais que a janela num texto enorme", () => {
    const longo = cifrar(`${TEXTO} `.repeat(12).trim(), alfabeto(5));
    const solucao = resolverSubstituicao(letrasDe(longo));
    expect(solucao.letrasUsadas).toBe(700);
    // a chave achada na janela decifra o texto inteiro
    expect(aplicarChave(longo, solucao.chave).startsWith("a resposta desta etapa")).toBe(true);
  });

  it("cabe no teto de tempo do fan-out", () => {
    tabelaQuadgramas(); // não medir a expansão da tabela
    const casos = [120, 300, 700, 2000].map((n) => {
      const base = `${TEXTO} `.repeat(20);
      return cifrar(base.replace(/[^a-z ]/g, "").slice(0, n), alfabeto(11));
    });
    for (const caso of casos) {
      const t0 = performance.now();
      resolverSubstituicao(letrasDe(caso));
      const gasto = performance.now() - t0;
      expect(gasto).toBeLessThan(50);
    }
  });
});

describe("aplicação da chave", () => {
  it("preserva caixa, acento posicional e pontuação", () => {
    const chave = new Uint8Array(26);
    for (let i = 0; i < 26; i++) chave[i] = (i + 1) % 26;
    expect(aplicarChave("Abc, xyz!", chave)).toBe("Bcd, yza!");
  });

  it("mostra a chave como o alfabeto que A→Z vira", () => {
    const identidade = new Uint8Array(26);
    for (let i = 0; i < 26; i++) identidade[i] = i;
    expect(chaveEmTexto(identidade)).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });
});
