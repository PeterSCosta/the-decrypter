import { describe, expect, it } from "vitest";
import { formatoDoVideo, idDoYoutube, urlDoPlayer, urlDoQuadro } from "./youtube";

describe("id do YouTube", () => {
  it("aceita todas as formas de URL", () => {
    const esperado = "dQw4w9WgXcQ";
    for (const u of [
      "dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?list=X&v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=42",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ",
    ]) {
      expect(idDoYoutube(u), u).toBe(esperado);
    }
  });

  it("recusa o que não é vídeo", () => {
    expect(idDoYoutube("")).toBeNull();
    expect(idDoYoutube("https://www.youtube.com/")).toBeNull();
    expect(idDoYoutube("https://vimeo.com/12345")).toBeNull();
    // 10 caracteres: um a menos que o formato exige.
    expect(idDoYoutube("dQw4w9WgXc")).toBeNull();
  });
});

describe("URLs", () => {
  it("o player usa nocookie e pula para o segundo", () => {
    expect(urlDoPlayer("abc12345678")).toBe("https://www.youtube-nocookie.com/embed/abc12345678");
    expect(urlDoPlayer("abc12345678", 90)).toContain("?start=90");
    // Segundo fracionário vira inteiro: o parâmetro não aceita decimal.
    expect(urlDoPlayer("abc12345678", 90.7)).toContain("?start=90");
  });

  it("o quadro vem do CDN de miniaturas", () => {
    expect(urlDoQuadro("abc12345678", "oar2")).toBe("https://i.ytimg.com/vi/abc12345678/oar2.jpg");
  });
});

describe("formato do vídeo", () => {
  it("traduz a proporção no que importa", () => {
    // Os números do oEmbed são arbitrários (356×200 num vídeo 16:9); o que
    // interessa é o formato, porque ele diz onde procurar e o que foi cortado.
    expect(formatoDoVideo(356, 200)).toBe("16:9 (widescreen)");
    expect(formatoDoVideo(1920, 1080)).toBe("16:9 (widescreen)");
    expect(formatoDoVideo(640, 480)).toBe("4:3 (formato antigo)");
    expect(formatoDoVideo(1080, 1920)).toMatch(/vertical/);
    expect(formatoDoVideo(500, 500)).toBe("quadrado (1:1)");
    expect(formatoDoVideo(0, 0)).toBe("desconhecido");
  });
});
