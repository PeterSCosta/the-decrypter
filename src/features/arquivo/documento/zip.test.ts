import { describe, expect, it } from "vitest";
import { ehOoxml, estranhasNoOoxml, lerZip } from "./zip";

/** ZIP mínimo, com diretório central e EOCD de verdade. */
function zip(
  arquivos: { nome: string; conteudo: string; comentario?: string; nomeLocal?: string }[],
  comentarioGeral = "",
): Uint8Array {
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const txt = (s: string) => [...s].map((c) => c.charCodeAt(0));

  const locais: number[] = [];
  const offsets: number[] = [];
  for (const a of arquivos) {
    offsets.push(locais.length);
    const nomeLocal = a.nomeLocal ?? a.nome;
    const dados = txt(a.conteudo);
    locais.push(
      ...le32(0x04034b50),
      ...le16(20),
      ...le16(0),
      ...le16(0), // sig, versão, flags, método
      ...le16(0),
      ...le16(0),
      ...le32(0), // hora, data, crc
      ...le32(dados.length),
      ...le32(dados.length),
      ...le16(nomeLocal.length),
      ...le16(0),
      ...txt(nomeLocal),
      ...dados,
    );
  }

  const central: number[] = [];
  arquivos.forEach((a, i) => {
    const com = a.comentario ?? "";
    central.push(
      ...le32(0x02014b50),
      ...le16(20),
      ...le16(20),
      ...le16(0),
      ...le16(0),
      ...le16(0),
      ...le16(0),
      ...le32(0),
      ...le32(a.conteudo.length),
      ...le32(a.conteudo.length),
      ...le16(a.nome.length),
      ...le16(0),
      ...le16(com.length),
      ...le16(0),
      ...le16(0),
      ...le32(0),
      ...le32(offsets[i]),
      ...txt(a.nome),
      ...txt(com),
    );
  });

  const inicioCentral = locais.length;
  const eocd = [
    ...le32(0x06054b50),
    ...le16(0),
    ...le16(0),
    ...le16(arquivos.length),
    ...le16(arquivos.length),
    ...le32(central.length),
    ...le32(inicioCentral),
    ...le16(comentarioGeral.length),
    ...txt(comentarioGeral),
  ];
  return Uint8Array.from([...locais, ...central, ...eocd]);
}

describe("catálogo do ZIP", () => {
  it("lista as entradas com nome, tamanho e método", () => {
    const l = lerZip(
      zip([
        { nome: "a.txt", conteudo: "oi" },
        { nome: "b/c.txt", conteudo: "tchau" },
      ]),
    );
    expect(l?.entradas.map((e) => e.nome)).toEqual(["a.txt", "b/c.txt"]);
    expect(l?.entradas[0].tamanho).toBe(2);
    expect(l?.entradas[0].metodo).toBe("sem compressão");
  });

  it("acha o comentário do arquivo — o canal de texto livre do formato", () => {
    const l = lerZip(zip([{ nome: "a.txt", conteudo: "x" }], "A RESPOSTA ESTA AQUI"));
    expect(l?.comentario).toBe("A RESPOSTA ESTA AQUI");
    expect(l?.observacoes.join(" ")).toContain("comentário de arquivo");
  });

  it("acusa nome divergente entre cabeçalho local e diretório central", () => {
    // Extratores diferentes veem arquivos diferentes. É esconderijo, não bug.
    const l = lerZip(zip([{ nome: "inocente.txt", conteudo: "x", nomeLocal: "segredo.txt" }]));
    expect(l?.entradas[0].nomeDivergente).toBe("segredo.txt");
    expect(l?.observacoes.join(" ")).toContain("OUTRO no diretório central");
  });

  it("acha comentário por entrada", () => {
    const l = lerZip(zip([{ nome: "a.txt", conteudo: "x", comentario: "pista" }]));
    expect(l?.entradas[0].comentario).toBe("pista");
  });

  it("ZIP limpo não gera observação", () => {
    expect(lerZip(zip([{ nome: "a.txt", conteudo: "x" }]))?.observacoes).toEqual([]);
  });

  it("devolve null para quem não é ZIP", () => {
    expect(lerZip(new Uint8Array(100))).toBeNull();
  });
});

describe("OOXML", () => {
  it("reconhece um docx e acha a entrada que não devia estar lá", () => {
    const l = lerZip(
      zip([
        { nome: "[Content_Types].xml", conteudo: "x" },
        { nome: "word/document.xml", conteudo: "y" },
        { nome: "docProps/core.xml", conteudo: "z" },
        { nome: "segredo.png", conteudo: "aqui" },
      ]),
    );
    expect(l).not.toBeNull();
    if (!l) return;
    expect(ehOoxml(l)).toBe("word");
    // Um arquivo solto na raiz continua abrindo no Word e ninguém repara.
    expect(estranhasNoOoxml(l).map((e) => e.nome)).toEqual(["segredo.png"]);
  });

  it("um docx normal não tem entrada estranha", () => {
    const l = lerZip(
      zip([
        { nome: "[Content_Types].xml", conteudo: "x" },
        { nome: "word/document.xml", conteudo: "y" },
        { nome: "_rels/.rels", conteudo: "z" },
      ]),
    );
    expect(l && estranhasNoOoxml(l)).toEqual([]);
  });
});
