import { describe, expect, it } from "vitest";
import {
  SOURCES,
  SOURCE_STATUS_HINT,
  SOURCE_STATUS_LABEL,
  SOURCE_STATUS_ORDER,
  type SourceStatus,
  sourcesByStatus,
} from "./sources";

const byId = new Map(SOURCES.map((s) => [s.id, s]));
const get = (id: string) => {
  const s = byId.get(id);
  if (!s) throw new Error(`fonte ausente: ${id}`);
  return s;
};

describe("catálogo de bases", () => {
  it("todo campo obrigatório está preenchido e o id é um slug único", () => {
    const seen = new Set<string>();
    for (const s of SOURCES) {
      expect(s.id, `id de ${s.name}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(seen.has(s.id), `id repetido: ${s.id}`).toBe(false);
      seen.add(s.id);
      for (const [field, value] of [
        ["name", s.name],
        ["indexes", s.indexes],
        ["use", s.use],
        ["urlLabel", s.urlLabel],
      ] as const) {
        expect(value.trim(), `${s.id}.${field}`).not.toBe("");
      }
      expect(s.url, `${s.id}.url`).toMatch(/^https?:\/\//);
      // rótulo curto porque a Cola precisa caber em ~375 px
      expect(s.urlLabel.length, `${s.id}.urlLabel curto`).toBeLessThanOrEqual(40);
    }
  });

  it("toda base que não é aberta explica o que trava (o gate é o valor da ficha)", () => {
    for (const s of SOURCES) {
      if (s.status === "aberta") continue;
      expect(s.note?.trim(), `${s.id} sem nota de gate`).toBeTruthy();
    }
  });

  it("os selos são só os quatro previstos, e todos têm rótulo e legenda", () => {
    const allowed = new Set<SourceStatus>(SOURCE_STATUS_ORDER);
    expect(SOURCE_STATUS_ORDER).toEqual(["aberta", "consulta-manual", "bloqueada", "adiada"]);
    for (const status of SOURCE_STATUS_ORDER) {
      expect(SOURCE_STATUS_LABEL[status]).toBeTruthy();
      expect(SOURCE_STATUS_HINT[status]).toBeTruthy();
    }
    for (const s of SOURCES) expect(allowed.has(s.status), `${s.id}: ${s.status}`).toBe(true);
  });
});

describe("agrupamento por selo", () => {
  it("cobre todas as bases, na ordem dos selos e sem grupo vazio", () => {
    const groups = sourcesByStatus();
    expect(groups.flatMap((g) => g.items)).toHaveLength(SOURCES.length);
    expect(groups.map((g) => g.status)).toEqual(
      SOURCE_STATUS_ORDER.filter((st) => SOURCES.some((s) => s.status === st)),
    );
    for (const g of groups) {
      expect(g.items.length, `grupo ${g.status} vazio`).toBeGreaterThan(0);
      expect(g.label).toBe(SOURCE_STATUS_LABEL[g.status]);
    }
  });

  it("preserva a ordem interna de SOURCES dentro do grupo", () => {
    const abertas = sourcesByStatus().find((g) => g.status === "aberta");
    expect(abertas?.items.map((s) => s.id)).toEqual(
      SOURCES.filter((s) => s.status === "aberta").map((s) => s.id),
    );
  });

  it("uma lista filtrada não inventa grupo", () => {
    expect(sourcesByStatus([get("hathitrust")]).map((g) => g.status)).toEqual(["consulta-manual"]);
  });
});

describe("âncoras do acervo", () => {
  // Provas conferidas em GIA-2026.md ("Códigos burocráticos e catálogos do
  // mundo real") e nas resoluções de cada prova.
  const EXPECTED: [id: string, anchors: string[]][] = [
    ["gs1", ["GIA-07"]],
    ["faber-castell", ["GIA-39"]],
    ["portal-covid-blumenau", ["GIA-12"]],
    ["cbmsc", ["GIA-23"]],
    ["cidade-iluminada", ["GIA-25"]],
    ["oktoberfest", ["GIA-33"]],
    ["tse", ["GIA-34"]],
    ["siatu-vm", ["GIA-20", "GIA-34"]],
    ["hathitrust", ["GIA-42"]],
    ["anatel-fique-ligado", ["ITC-2023"]],
  ];

  it.each(EXPECTED)("%s ancora em %s", (id, anchors) => {
    expect(get(id).anchors).toEqual(anchors);
  });

  it("toda âncora tem forma de prova do acervo", () => {
    for (const s of SOURCES) {
      for (const a of s.anchors ?? []) {
        expect(a, `${s.id}: ${a}`).toMatch(/^(GIA-\d{2}|ITC-\d{4})$/);
      }
    }
  });
});

describe("links oficiais conferidos na resolução da própria prova", () => {
  it("TSE aponta para o SIG Eleição citado na GIA-34", () => {
    expect(get("tse").url).toBe(
      "https://sig.tse.jus.br/ords/dwapr/r/seai/sig-eleicao-resultados/home",
    );
  });

  it("CBMSC aponta para a página de mapas citada na GIA-23", () => {
    expect(get("cbmsc").url).toBe("https://www.cbm.sc.gov.br/index.php/estrutura/mapas");
  });

  it("Oktoberfest aponta para o site da festa, não para o PDF do ano (é efêmero)", () => {
    const s = get("oktoberfest");
    expect(s.url).toBe("https://oktoberfestblumenau.com.br");
    expect(s.url).not.toMatch(/\.pdf$/i);
    expect(s.note).toMatch(/2025/);
  });

  /**
   * ESTE CASO FOI REESCRITO, e a razão é constrangedora: ele travava um LINK
   * MORTO no lugar. O "Fique Ligado" acabou — `sistemas.anatel.gov.br/fiqueligado`
   * responde 302 para o painel novo (verificado em agosto/2026). O teste estava
   * cumprindo o papel oposto ao que devia: garantia fidelidade ao caderno do
   * ITC-2023 e, com isso, garantia que a equipe fosse mandada a lugar nenhum.
   *
   * A âncora do ITC-2023 continua na ficha; o que muda é para onde o link vai.
   * O teste passa a exigir que a nota EXPLIQUE o desaparecimento, para ninguém
   * "consertar" isto de volta olhando só o caderno antigo.
   */
  it("Anatel aponta para o painel vivo, e a nota registra que o Fique Ligado acabou", () => {
    const s = get("anatel-fique-ligado");
    expect(s.url).toMatch(/^https:\/\/informacoes\.anatel\.gov\.br/);
    expect(s.url).not.toMatch(/fiqueligado/);
    expect(s.note).toMatch(/acabou|302/i);
    expect(s.anchors).toContain("ITC-2023");
  });
});

describe("decisões registradas — não regredir", () => {
  /**
   * ESTE CASO FOI REESCRITO, e a razão importa.
   *
   * A versão anterior travava o Cidade Iluminada como `bloqueada` porque a nota
   * dizia "reCAPTCHA + login". A **política** que ela protege continua valendo
   * inteira: não se burla captcha nem login de terceiro. O que mudou foi o
   * fato — aquilo vale para abrir chamado no portal; a consulta do mapa é
   * anônima, e a configuração de Blumenau servida pela própria Exati traz
   * `USAR_CAPTCHA: 0`. Os 45.285 postes vieram do mesmo endereço público que o
   * mapa do site usa, em ritmo educado.
   *
   * O teste passa a exigir que a nota **explique a correção**, para ninguém
   * reler o histórico e concluir que a regra foi afrouxada.
   */
  it("Cidade Iluminada está aberta, e a nota explica por que a regra não mudou", () => {
    const s = get("cidade-iluminada");
    expect(s.status).toBe("aberta");
    expect(s.note).toMatch(/USAR_CAPTCHA|anônima/i);
    expect(s.note).toMatch(/não houve bypass|não burlar|continua valendo/i);
  });

  /**
   * REESCRITO. `adiada` aqui queria dizer "é só pedir por LAI e vira dado
   * aberto". O geoportal desmentiu: `VLR_PGV` existe em três camadas do ArcGIS
   * público e está ZERADA nos 9.372 eixos — não é dado que falta, é dado
   * suprimido na publicação, e pedir de novo o mesmo canal não muda isso. O VM
   * só existe no Anexo II da LC 632/2007, em PDF.
   *
   * A política não mudou: continua valendo que dado em arquivo vira consulta
   * quando dá — e o `cid10` é a prova disso, tendo percorrido o caminho inteiro
   * de `adiada` a acervo. O que mudou é o fato sobre esta base.
   */
  it("SIATU é consulta manual, e a nota explica por que não é só pedir", () => {
    const s = get("siatu-vm");
    expect(s.status).toBe("consulta-manual");
    expect(s.note).toMatch(/VLR_PGV/);
    expect(s.note).toMatch(/zerada|suprimido/i);
    expect(s.note).toMatch(/LC 632|PDF/);
  });

  /**
   * REESCRITO. A regra que este caso protegia era "reconhecer e linkar, nunca
   * raspar", e ela continua inteira — o que mudou é que NÃO É RASPAGEM: o TSE
   * publica os resultados como JSON estático com `Access-Control-Allow-Origin: *`,
   * ou seja, oferece a consulta de propósito. A nota anterior dizia "sem JSON
   * aberto amigável" e era simplesmente falsa.
   *
   * O que despistava era o caminho: `dados-simplificados/…-r.json` dá 404 por
   * município. O certo é `dados/…-u.json`.
   */
  /**
   * CORRIGIDO NO MESMO DIA, e a lição vale mais que o teste: eu marquei TSE,
   * FIPE e CNAE como `aberta` porque os endpoints existem — mas `aberta` aqui
   * significa "A BANCADA já consulta por você", e nenhum decoder chama nenhum
   * dos três. O selo passou a mentir na cara de quem lê.
   *
   * O selo descreve o que a bancada FAZ, não o que a fonte PERMITE. As duas
   * coisas divergem, e é justamente essa divergência que vira item de plano.
   */
  it("fonte consultável mas não implementada NÃO é aberta — o selo é sobre nós", () => {
    // O CNAE SAIU desta lista em ago/2026, e por ter mudado o fato, não a
    // régua: agora existe o decoder `cnae` e a rota `/api/cnae/{codigo}` no
    // backend, então a bancada de fato consulta por você. TSE e FIPE seguem
    // aqui — os endpoints existem, mas ninguém os chama.
    // A lista esvaziou em ago/2026: TSE, FIPE e CNAE viraram consulta de
    // verdade. A REGRA continua valendo e é o que este caso guarda — se uma
    // fonte nova entrar como `aberta` sem decoder que a chame, aqui é onde a
    // mentira aparece.
    for (const s of SOURCES.filter((x) => x.status === "consulta-manual")) {
      expect(s.note, s.id).toBeTruthy();
    }
  });

  it("FIPE registra a correção que custou meia hora: a ordem dos endpoints", () => {
    // A nota antiga dizia o contrário do que o teste ao vivo mostrou. Quem
    // aceita o código nu é o ConsultarAnoModeloPeloCodigoFipe.
    const s = get("fipe");
    expect(s.status).toBe("aberta");
    expect(s.note).toMatch(/ConsultarAnoModeloPeloCodigoFipe/);
    expect(s.note).toMatch(/Parâmetros inválidos/);
    // E o motivo de não passar pelo backend fica escrito.
    expect(s.note).toMatch(/WAF|datacenter/i);
  });

  it("TSE declara a COBERTURA, porque 'não achei' não é 'não existe'", () => {
    const s = get("tse");
    expect(s.status).toBe("aberta");
    expect(s.note).toMatch(/2024/);
    expect(s.note).toMatch(/404|ZIP/);
  });

  it("CNAE virou aberta porque a bancada passou a consultar — e a nota diz a armadilha", () => {
    const s = get("cnae");
    expect(s.status).toBe("aberta");
    // A armadilha medida: a API do IBGE devolve 200 com [] quando não existe.
    expect(s.note).toMatch(/200/);
    expect(s.note).toMatch(/\[\]/);
  });

  /**
   * O CID-10 ERA o caso legítimo de `adiada` — "dado aberto em arquivo, pequeno
   * o bastante para embarcar no dia em que uma prova pedir". Esse dia chegou
   * por pedido direto, e os 14.233 códigos entraram no acervo.
   *
   * O caso continua aqui, invertido, porque o que ele guarda não é o selo: é a
   * REGRA de que arquivo aberto vira consulta quando alguém precisa. A nota
   * segue obrigada a dizer que não existe API — é isso que explica por que a
   * base é acervo e não chamada externa.
   */
  it("CID-10 virou acervo: aberta, com a contagem e o porquê de não ser API", () => {
    const s = get("cid10");
    expect(s.status).toBe("aberta");
    expect(s.note).toMatch(/14\.233/);
    expect(s.note).toMatch(/ZIP|DATASUS/);
    expect(s.note).toMatch(/404|gov\.br/);
  });

  it("Faber-Castell é consulta manual e declara que Pantone não entra", () => {
    const s = get("faber-castell");
    expect(s.status).toBe("consulta-manual");
    expect(s.note).toMatch(/Pantone/);
    expect(s.note).toMatch(/12 cores/);
  });

  /**
   * A lista encolheu duas vezes, e nas duas por FATO, não por conveniência:
   * `cidade-iluminada` saiu porque a barreira não existia (ver acima), e agora
   * `tse` e `fipe` saem porque as duas fontes oferecem consulta — o TSE em JSON
   * com CORS, a FIPE pela API que o próprio site dela usa.
   *
   * O que este caso guarda é o que importa: `siatu-vm` e `correios-rastreio`
   * exigem sessão/formulário e continuam fora. E a nota da FIPE registra a
   * regra que sobra: a chamada sai do NAVEGADOR do usuário, nunca do backend,
   * porque o WAF de lá bloqueia IP de datacenter e forjar cabeçalho para
   * escapar seria driblar barreira posta de propósito.
   */
  it("nenhuma base com gate aparece como aberta", () => {
    for (const id of ["siatu-vm", "correios-rastreio"]) {
      expect(get(id).status, id).not.toBe("aberta");
    }
    expect(get("fipe").note).toMatch(/forjar|driblar/i);
  });

  it("as bases que já respondem na bancada estão todas listadas como abertas", () => {
    const abertas = SOURCES.filter((s) => s.status === "aberta").map((s) => s.id);
    expect(abertas).toEqual([
      // As duas bases EMBARCADAS que faltavam na Cola: a bancada as consulta
      // todo dia e, quando elas calam, não havia link para conferir por fora —
      // e calar sem caminho manual é meio silêncio, que a casa não aceita.
      "estacoes-ibge",
      "articulacao-blumenau",
      "ruas-blumenau",
      "ceps-sc",
      "municipios-ibge",
      "cid10",
      "aeroportos",
      "pix-ispb",
      "gs1",
      // Os três que eram "consultável mas não implementado" viraram consulta de
      // verdade em ago/2026 — e cada um por um caminho diferente: o TSE por
      // base local (só 2024), a FIPE pelo navegador (o WAF barra datacenter) e
      // o CNAE pelo backend.
      "tse",
      "fipe",
      "cnae",
      // A bancada passou a responder plaqueta de poste (aba Postes, 45.285
      // pontos pela API). A ordem aqui é a do arquivo, e o Cidade Iluminada
      // ficou no bloco que era o das bloqueadas.
      // 372 lojas dos quatro shoppings, 119 com o número publicado. Ela entra
      // como `aberta` porque o decoder responde — a regra do selo é sobre nós.
      "lojas-shoppings-blumenau",
      "cidade-iluminada",
      // Achado colateral da investigação do SIATU: o COD_LOG, que é o "número
      // por rua" que se procurava lá, e este é público e consultável.
      "cod-log-blumenau",
      // 84.539 lotes do geoportal — a maior base do acervo, e a que fecha o
      // caso que o SIATU não fechava (número burocrático → pedaço de cidade).
      "lotes-blumenau",
    ]);
    /**
     * O CID-10 fica junto das outras bases EMBARCADAS, e não no fim da lista.
     *
     * Isto era um índice fixo (`toBe(3)`), e o índice quebrou na primeira vez
     * que duas bases embarcadas entraram antes dele — sem que nada de errado
     * tivesse acontecido. Um teste que falha quando o código está certo é um
     * teste que alguém apaga na primeira pressa. A afirmação passou a ser a
     * INTENÇÃO: o embarcado vem antes do que depende de rede de terceiro.
     */
    expect(abertas.indexOf("cid10")).toBeLessThan(abertas.indexOf("tse"));
  });

  it("as ressalvas honestas dos datasets embarcados continuam escritas", () => {
    // municípios do IBGE não trazem lat/lng: coordenada → cidade não sai daqui
    expect(get("municipios-ibge").note).toMatch(/[Ss]em coordenada/);
    // CEP é só de SC — a GIA-31 fecha num CEP de MG
    expect(get("ceps-sc").note).toMatch(/SC/);
    expect(get("ceps-sc").note).toMatch(/38414-561/);
    // PIX depende do backend
    expect(get("pix-ispb").note).toMatch(/backend/);
  });

  /**
   * AJUSTADO junto com as fichas. Duas das três premissas caducaram:
   *
   * - A FIPE saiu de "descartada": ela continua sem ser EMBARCADA (o motivo do
   *   mês segue valendo, e o teste continua exigindo que a nota o diga), mas
   *   passou a ser consultada ao vivo.
   * - A nota da Anatel não fala mais em "download em lote", porque o problema
   *   deixou de ser esse: o produto que a ficha descrevia deixou de existir.
   */
  it("os descartados sob demanda dizem por que não viram dataset", () => {
    // Não embarcar segue valendo — o preço tem mês de referência.
    expect(get("fipe").note).toMatch(/m[eê]s/i);
    expect(get("correios-rastreio").note).toMatch(/autenticada/);
    // A Anatel agora justifica pela restrição da própria fonte, não pela falta
    // de download em lote.
    expect(get("anatel-fique-ligado").note).toMatch(/restrita|WAF/i);
  });
});
