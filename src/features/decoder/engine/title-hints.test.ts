import { describe, expect, it } from "vitest";
import { decoders } from "./registry";
import { titleHints } from "./title-hints";

const ids = (title: string) => titleHints(title).map((h) => h.id);
const targets = (title: string) =>
  titleHints(title)
    .map((h) => h.decoderId)
    .filter(Boolean);

describe("dicas do título", () => {
  // --- Família 1: o título nomeia (ou desenha) o sistema -------------------

  it("lê o título `###` como a sintaxe do GeoTude (GIA-27)", () => {
    expect(targets("###")).toContain("location");
    expect(ids("###")).toContain("titulo-sistema-geotude-hash");
  });

  it("lê as três barras como what3words (GIA-10)", () => {
    // Título verídico: "O Problema dos 3 Corpos ///".
    expect(ids("O Problema dos 3 Corpos ///")).toContain("titulo-sistema-w3w-slashes");
  });

  it("reconhece o Mapcode quando ele é nomeado (GIA-08 trazia o logo no título)", () => {
    expect(targets("Mapcode")).toContain("location");
  });

  it("reconhece Plus Code e Geohash — o `location` cobre inteiro e cauda", () => {
    // Apontavam também para `local-geocode`, que foi ABSORVIDO: os dois liam as
    // mesmas funções de cauda e emitiam o mesmo ponto duas vezes na tela.
    // O chip que aponta para dois donos do mesmo cálculo é chip que promete
    // dois caminhos e entrega um.
    expect(targets("Plus Code")).toEqual(["location"]);
    expect(targets("Geohash")).toEqual(["location"]);
  });

  it("citação de cifra clássica é citação, não palpite — e não arrasta as vizinhas", () => {
    expect(targets("Playfair")).toEqual(["playfair"]);
    expect(targets("Políbio")).toEqual(["polybius"]);
  });

  // --- Família 4: trunfos fonéticos curados --------------------------------

  it("“Ask Me” é ASCII, o trocadilho de abertura da GIA-01", () => {
    const hs = titleHints("ASK ME!");
    expect(hs.map((h) => h.decoderId)).toContain("decimal");
    expect(hs[0]?.detail).toMatch(/ASCII/);
  });

  it("“Prova quadrada” pede raiz quadrada (GIA-21)", () => {
    expect(targets("Prova quadrada")).toContain("math-helper");
  });

  it("“I lingii di i” é a cifra vocálica (GIA-22)", () => {
    expect(targets("I lingii di i")).toContain("vowel-cipher");
  });

  it("“Virada Maiúscula” é acróstico e “O poder das palavras” é contagem (GIA-03 e 04)", () => {
    expect(targets("Virada Maiúscula")).toContain("acrostic");
    expect(targets("O poder das palavras")).toContain("count-key");
  });

  it("“Químico maluco” aponta a tabela periódica (GIA-19)", () => {
    expect(targets("Químico maluco")).toContain("periodic-table");
  });

  // --- Família 3: anagrama do título --------------------------------------

  it("resolve o anagrama do título: SONGI → SIGNO (GIA-13)", () => {
    const hs = titleHints("O Código SONGI");
    const anagrama = hs.find((h) => h.id.startsWith("titulo-anagrama-songi"));
    expect(anagrama?.label).toContain("SIGNO");
    expect(anagrama?.decoderId).toBe("date-key");
  });

  it("sem alvo conhecido, a caixa alta que destoa vira só suspeita — sem decodificador", () => {
    const h = titleHints("O Código ZARVOX")?.find((x) => x.id.startsWith("titulo-anagrama-caixa"));
    expect(h?.label).toContain("destoa");
    expect(h?.decoderId).toBeUndefined();
  });

  it("sigla comum em caixa alta não vira suspeita de anagrama", () => {
    expect(ids("O enigma do CEP")).not.toContain("titulo-anagrama-caixa-cep");
  });

  it("título inteiro em caixa alta não tem destaque para detectar", () => {
    expect(ids("O CODIGO SECRETO DA GIA")).not.toContain("titulo-anagrama-caixa-codigo");
  });

  // --- Ambiguidade assumida ------------------------------------------------

  it("“Enxergar sem ver” e “Os olhos enganam” caem na MESMA regra, com vários alvos", () => {
    // Documentado no plano: 40 era texto atrás da imagem, 41 era Braille nos
    // espaços duplos. A bancada lista os dois e não escolhe por ninguém.
    const a = targets("Enxergar sem ver");
    const b = targets("Os olhos enganam");
    expect(a).toEqual(expect.arrayContaining(["whitespace-stego", "zero-width", "braille"]));
    expect(b).toEqual(expect.arrayContaining(["whitespace-stego", "zero-width", "braille"]));
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  // --- Contrato: o título não entra em decode() nem no ranking -------------

  it("nenhuma dica de título traz valor para encadear — o título nunca é entrada de cifra", () => {
    const amostra = [
      "###",
      "Ask Me!",
      "O Código SONGI",
      "Os olhos enganam",
      "Desenhar e colorir",
      "Prova quadrada",
    ];
    for (const t of amostra) {
      for (const h of titleHints(t)) expect(h.chainValue).toBeUndefined();
    }
  });

  it("todo decodificador sugerido existe de verdade no registro", () => {
    const known = new Set(decoders.map((d) => d.id));
    const amostra = [
      "###",
      "///",
      "Mapcode",
      "Geohash",
      "Plus Code",
      "GeoHex",
      "Maidenhead",
      "Ask Me!",
      "Que Bom!",
      "Virada Maiúscula",
      "O poder das palavras",
      "O Código SONGI",
      "Prova quadrada",
      "Paraíso Fiscal",
      "Químico maluco",
      "I lingii di i",
      "Sinfonia Silenciosa",
      "Engenheiro foragido",
      "Enxergar sem ver",
      "Os olhos enganam",
      "No detalhe",
      "Romanos",
      "Desenhar e colorir",
      "Código entre amigos",
      "Ponto de encontro",
      "Legado Mundial",
      "Nova Blumenau",
      "Basta isso",
      "Padrão",
      "Círculos",
      "Bandeiras",
      "Quem peleia não está morto!",
      "Proteção Diária Básica",
      "Relatório Final",
      "A Mais Amada",
      "Fragmentos do Mundo",
      "Segredos do Vale Encantado",
      "Além dos nomes",
      "Sonho perturbado",
      "Conhecendo Blumenau",
      "Origens",
      "Arte sem nome",
      "Esquentou",
      "Qual é a música?",
      "E agora?",
      "Seguindo as orientações",
      "CRJA",
    ];
    for (const t of amostra) {
      for (const h of titleHints(t)) {
        if (h.decoderId) expect(known, `${t} → ${h.decoderId}`).toContain(h.decoderId);
      }
    }
  });

  // --- Portão de ruído -----------------------------------------------------

  it("título vazio não produz palpite", () => {
    expect(titleHints("")).toEqual([]);
    expect(titleHints("   ")).toEqual([]);
  });

  it("prosa colada por engano não é título — o portão corta antes das regras", () => {
    const enunciado =
      "Nem sempre existirão mensagens ocultas escondidas no texto e gastar tempo " +
      "procurando aquilo que não existe será o maior obstáculo de vocês nesta prova " +
      "de cores palavras e espaços em branco";
    expect(titleHints(enunciado)).toEqual([]);
  });

  it("nenhum título estoura o teto de chips da coluna do mobile", () => {
    // Título deliberadamente carregado: cor, palavras, espelho, mapa, data.
    const carregado = "Cores, palavras e datas no espelho do mapa";
    expect(titleHints(carregado).length).toBeLessThanOrEqual(6);
  });

  it("um decodificador aparece uma vez só, mesmo com duas regras apontando para ele", () => {
    const hs = titleHints("Prova quadrada: some e divida");
    const math = hs.filter((h) => h.decoderId === "math-helper");
    expect(math).toHaveLength(1);
  });

  it("ids são únicos — servem de chave de lista na faixa de chips", () => {
    const hs = titleHints("Enxergar sem ver, no detalhe das cores");
    expect(new Set(hs.map((h) => h.id)).size).toBe(hs.length);
  });

  it("“Ponto de encontro” é coordenada, não valor de letra (GIA-07)", () => {
    // "ponto" era o falso positivo mais caro do lote: puxava “valor das letras”.
    expect(targets("Ponto de encontro")).toContain("location");
    expect(targets("Ponto de encontro")).not.toContain("letter-values");
  });

  it("“Romanos” é o algarismo; só quem diz César ganha a cifra de César", () => {
    expect(targets("Romanos")).toEqual(["roman"]);
    expect(targets("A cifra de César")).toContain("caesar-bruteforce");
  });

  it("um título sem tema conhecido cala a boca", () => {
    expect(titleHints("Basta isso")).toEqual([]);
    expect(titleHints("E agora?")).toEqual([]);
  });
});
