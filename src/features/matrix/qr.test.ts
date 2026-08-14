import { describe, expect, it } from "vitest";
import {
  LADO_MINIMO_QR,
  acharMarcadores,
  avisoDeMargem,
  decodeQr,
  diagnosticar,
  versaoDeDimensao,
} from "./qr";
import type { Bitmap } from "./render";

/** Arte ASCII → matriz. `#` é módulo aceso; qualquer outra coisa é apagado. */
const arte = (linhas: string[]): Bitmap => linhas.map((l) => [...l].map((c) => c === "#"));

/** QR versão 1 (21×21) contendo o texto `ITC`. */
const QR_ITC = arte([
  "#######..###..#######",
  "#.....#...#...#.....#",
  "#.###.#.##.##.#.###.#",
  "#.###.#.#.##..#.###.#",
  "#.###.#.#.#.#.#.###.#",
  "#.....#.#..#..#.....#",
  "#######.#.#.#.#######",
  "........#............",
  "#.#####...##..#####..",
  "###.#..###.####..###.",
  "###.#.#.##..#.##..##.",
  "####.#..#######..###.",
  "#.#.#.#..#..#..#..#.#",
  "........#...#..#..#..",
  "#######..###.#..##.#.",
  "#.....#.###....##.###",
  "#.###.#.#.##.#..#.#..",
  "#.###.#.#..####..#...",
  "#.###.#.#...#.##.....",
  "#.....#...#####..#...",
  "#######.#...#..#..##.",
]);

/** QR versão 2 (25×25) com a URL da bancada — para provar que a versão sobe. */
const QR_URL = arte([
  "#######...##..##..#######",
  "#.....#.#...##.#..#.....#",
  "#.###.#...#.#.....#.###.#",
  "#.###.#..#.#..#...#.###.#",
  "#.###.#.#####.##..#.###.#",
  "#.....#..####..##.#.....#",
  "#######.#.#.#.#.#.#######",
  "..........#.##...........",
  "#.#.#.#..##..##.#...#..#.",
  "####.#.#..#.#...###.....#",
  ".#...##.#....#......#.###",
  "#..###.#....##.#.#.....#.",
  "#...###.#..###.#####.#.##",
  ".##....#...#.#..###..#..#",
  "#...###...#.###..###..###",
  ".####..####..##.#...#..#.",
  "#.#...#.#....#..######...",
  "........###.#..##...##.##",
  "#######..#..##.##.#.##.##",
  "#.....#..#...##.#...##.##",
  "#.###.#.###.##..######...",
  "#.###.#..#..#...#..####..",
  "#.###.#.#.#.#..#....#...#",
  "#.....#..#..#####.#.##.#.",
  "#######.#..######.##...##",
]);

/** Troca aceso por apagado — o erro de pintura "fiz o negativo". */
const inverter = (b: Bitmap): Bitmap => b.map((l) => l.map((c) => !c));

/** Envolve a matriz numa moldura apagada: o QR remontado com sobra em volta. */
function emoldurar(b: Bitmap, n: number): Bitmap {
  const largura = b[0].length + 2 * n;
  const vazia = () => Array.from({ length: largura }, () => false);
  return [
    ...Array.from({ length: n }, vazia),
    ...b.map((l) => [
      ...Array.from({ length: n }, () => false),
      ...l,
      ...Array.from({ length: n }, () => false),
    ]),
    ...Array.from({ length: n }, vazia),
  ];
}

/**
 * Suja a faixa entre os marcadores (linhas 8..n-9, colunas 8 em diante), que é
 * miolo puro: os três marcadores e o timing pattern ficam intactos, então a
 * matriz continua PARECENDO um QR — é exatamente o erro de pintura que o
 * Reed-Solomon não dá conta e que o diagnóstico precisa saber nomear.
 */
function estragarMiolo(b: Bitmap): Bitmap {
  const copia = b.map((l) => [...l]);
  for (let r = 8; r <= copia.length - 9; r++) {
    for (let c = 8; c < copia[r].length; c++) copia[r][c] = !copia[r][c];
  }
  return copia;
}

describe("versaoDeDimensao", () => {
  it("todo QR é 21+4k, de 21 (v1) a 177 (v40)", () => {
    expect(versaoDeDimensao(21)).toBe(1);
    expect(versaoDeDimensao(25)).toBe(2);
    expect(versaoDeDimensao(29)).toBe(3);
    expect(versaoDeDimensao(177)).toBe(40);
  });

  it("recusa dimensão que não fecha na progressão", () => {
    // 23 é o erro clássico de quem colou o QR com 1 módulo de sobra de cada lado.
    expect(versaoDeDimensao(23)).toBeNull();
    expect(versaoDeDimensao(20)).toBeNull();
    expect(versaoDeDimensao(181)).toBeNull();
    expect(versaoDeDimensao(24.5)).toBeNull();
  });
});

describe("acharMarcadores", () => {
  it("acha os três marcadores nos cantos de um QR de verdade", () => {
    const m = acharMarcadores(QR_ITC);
    expect(m).toHaveLength(3);
    expect(m.map((x) => x.canto).sort()).toEqual([
      "baixo-esquerdo",
      "topo-direito",
      "topo-esquerdo",
    ]);
  });

  it("acha os marcadores fora do canto quando sobra moldura", () => {
    const m = acharMarcadores(emoldurar(QR_ITC, 4));
    expect(m).toHaveLength(3);
    expect(m.every((x) => x.canto === null)).toBe(true);
    expect(m[0]).toMatchObject({ linha: 4, coluna: 4 });
  });

  it("na polaridade errada não acha nada — e acha com as cores trocadas", () => {
    expect(acharMarcadores(inverter(QR_ITC))).toHaveLength(0);
    expect(acharMarcadores(inverter(QR_ITC), true)).toHaveLength(3);
  });

  it("desenho livre não tem marcador nenhum", () => {
    expect(acharMarcadores(arte(["###", "#.#", "###", "#.#", "###"]))).toHaveLength(0);
  });
});

describe("diagnosticar", () => {
  it("reconhece o QR e diz a versão pela dimensão", () => {
    const d = diagnosticar(QR_ITC);
    expect(d.forma).toBe("qr");
    expect(d.versao).toBe(1);
    expect(d.marcadoresNoCanto).toBe(3);
    expect(d.errosDeTiming).toBe(0);
    expect(d.invertida).toBe(false);
    expect(d.podeTentar).toBe(true);
    expect(d.resumo).toBe("21×21 = QR versão 1; os 3 marcadores de canto estão presentes.");
  });

  it("na versão 2 sobe a versão", () => {
    expect(diagnosticar(QR_URL).resumo).toContain("25×25 = QR versão 2");
  });

  it("denuncia a matriz invertida em vez de dizer que não é QR", () => {
    const d = diagnosticar(inverter(QR_ITC));
    expect(d.forma).toBe("qr");
    expect(d.invertida).toBe(true);
    expect(d.motivos.join(" ")).toContain("invertida");
  });

  it("com moldura, manda recortar", () => {
    const d = diagnosticar(emoldurar(QR_ITC, 4));
    expect(d.forma).toBe("qr");
    expect(d.marcadoresNoCanto).toBe(0);
    expect(d.motivos.join(" ")).toContain("recorte");
  });

  it("aponta o marcador quebrado por canto", () => {
    const torto = QR_ITC.map((l) => [...l]);
    torto[1][1] = true; // um módulo errado dentro do marcador superior esquerdo
    const d = diagnosticar(torto);
    expect(d.errosPorCanto.topoEsquerdo).toBe(1);
    expect(d.marcadoresNoCanto).toBe(2);
    expect(d.motivos.join(" ")).toContain("superior esquerdo");
  });

  it("colunas chapadas viram código de barras", () => {
    const barras = arte(Array.from({ length: 6 }, () => "##..#..##.#..##..#.#"));
    const d = diagnosticar(barras);
    expect(d.forma).toBe("codigo-de-barras");
    expect(d.orientacao).toBe("vertical");
    expect(d.resumo).toContain("código de barras");
  });

  it("o dígito 3×5 do acervo é desenho, não código de barras", () => {
    // Duas das três colunas do `8` são chapadas — sem o piso de faixas isto
    // viraria "código de barras", que é a resposta errada para a prova certa.
    const d = diagnosticar(arte(["###", "#.#", "###", "#.#", "###"]));
    expect(d.forma).toBe("desenho");
    expect(d.podeTentar).toBe(false);
    expect(d.resumo).toContain("desenho livre");
  });

  it("dimensão de QR sem marcador nenhum continua sendo desenho", () => {
    const ruido = arte(
      Array.from({ length: 21 }, (_, r) =>
        Array.from({ length: 21 }, (_, c) => ((r * 7 + c * 3) % 5 === 0 ? "#" : ".")).join(""),
      ),
    );
    const d = diagnosticar(ruido);
    expect(d.forma).toBe("desenho");
    expect(d.motivos.join(" ")).toContain("versão 1");
  });

  it("matriz vazia não explode", () => {
    const d = diagnosticar([]);
    expect(d.resumo).toBe("matriz vazia");
    expect(d.podeTentar).toBe(false);
  });
});

describe("decodeQr", () => {
  it("lê o QR direto da matriz, sem foto", async () => {
    const r = await decodeQr(QR_ITC);
    expect(r.falha).toBeNull();
    expect(r.texto).toBe("ITC");
    expect(r.versao).toBe(1);
    expect(r.invertido).toBe(false);
  });

  it("lê a versão 2 e devolve o texto inteiro", async () => {
    const r = await decodeQr(QR_URL);
    expect(r.texto).toBe("https://thelogiclab.com.br");
    expect(r.versao).toBe(2);
  });

  it("lê a matriz invertida e CONTA que estava invertida", async () => {
    const r = await decodeQr(inverter(QR_ITC));
    expect(r.texto).toBe("ITC");
    expect(r.invertido).toBe(true);
    expect(r.motivo).toContain("cores trocadas");
  });

  it("lê mesmo com moldura sobrando, e o diagnóstico manda recortar", async () => {
    const r = await decodeQr(emoldurar(QR_ITC, 4));
    expect(r.texto).toBe("ITC");
    expect(r.diagnostico.marcadoresNoCanto).toBe(0);
  });

  it("recusa matriz não quadrada antes de baixar a lib", async () => {
    const r = await decodeQr(arte(Array.from({ length: 21 }, () => "#".repeat(25))));
    expect(r.falha).toBe("nao-quadrada");
    expect(r.motivo).toContain("não é quadrada");
  });

  it("recusa matriz quadrada menor que a versão 1", async () => {
    const r = await decodeQr(arte(Array.from({ length: 15 }, () => "#".repeat(15))));
    expect(r.falha).toBe("pequena-demais");
    expect(r.motivo).toContain(String(LADO_MINIMO_QR));
  });

  it("o dígito 3×5 do acervo cai como não quadrado, não como QR ruim", async () => {
    const r = await decodeQr(arte(["###", "#.#", "###", "#.#", "###"]));
    expect(r.falha).toBe("nao-quadrada");
  });

  it("recusa matriz vazia", async () => {
    const r = await decodeQr([]);
    expect(r.falha).toBe("vazia");
  });

  it("sem marcador em polaridade nenhuma, diz que não é QR", async () => {
    const ruido = arte(
      Array.from({ length: 25 }, (_, r) =>
        Array.from({ length: 25 }, (_, c) => ((r * 5 + c * 2) % 3 === 0 ? "#" : ".")).join(""),
      ),
    );
    const res = await decodeQr(ruido);
    expect(res.falha).toBe("sem-marcadores");
    expect(res.motivo).toContain("não parece um QR");
  });

  it("com os marcadores certos mas o miolo estragado, culpa a pintura", async () => {
    const r = await decodeQr(estragarMiolo(QR_ITC));
    expect(r.falha).toBe("nao-decodificou");
    expect(r.texto).toBeNull();
    // Os marcadores continuam perfeitos: a mensagem não pode culpar o canto.
    expect(r.diagnostico.marcadoresNoCanto).toBe(3);
    expect(r.motivo).toContain("Reed-Solomon");
  });

  it("sem quiet zone AINDA lê aqui dentro — mas avisa, em vez de mentir", async () => {
    // Medido: o jsQR lê a matriz colada sem margem nenhuma, porque recebe a
    // imagem limpa. Quem exige os 4 módulos é o leitor do celular sobre o PNG
    // exportado. Chamar isso de "falhou por falta de margem" seria invenção.
    const r = await decodeQr(QR_ITC, { margem: 0 });
    expect(r.texto).toBe("ITC");
    expect(r.avisos.join(" ")).toContain("celular");
  });

  it("na margem da norma não sobra aviso nenhum", async () => {
    const r = await decodeQr(QR_ITC);
    expect(r.avisos).toEqual([]);
  });

  it("avisoDeMargem só reclama abaixo dos 4 módulos", () => {
    expect(avisoDeMargem(4)).toBeNull();
    expect(avisoDeMargem(10)).toBeNull();
    expect(avisoDeMargem(2)).toContain("2 módulo(s)");
  });
});
