/**
 * build-fichas-cp.ts — as Fichas de Identificação da Comissão de Provas (2026).
 *
 * Entrada: data-sources/fichas-cp-2026.json (transcrição, versionada)
 * Saída:   public/data/fichas-cp.json       ·  Run: pnpm build:fichas
 *
 * ── POR QUE ISTO EXISTE ─────────────────────────────────────────────────────
 * Em 21/08/2026 a CP publicou, uma a uma, as fichas dos próprios integrantes:
 * codinome, nome civil, frase, fobia, alvo, diagnóstico e prognóstico. É o
 * único lugar onde a comissão que ESCREVE as provas se descreve por escrito —
 * e a gincana usa os apelidos deles em prova ("o Coringa da CP", "MCACLCAS").
 * Guardar isto aqui é a diferença entre reconhecer a referência na madrugada e
 * passar meia hora rolando o Instagram.
 *
 * ── O QUE ELE NÃO FAZ: NÃO BAIXA NEM RECORTA IMAGEM ─────────────────────────
 * As 17 imagens já estão em `public/fichas/` (o dossiê) e `public/fichas/mini/`
 * (o polaroide do personagem), recortadas dos originais 1080×1080 com caixas
 * fixas — o gabarito da arte é o mesmo nas 17. O recorte mora em
 * `scripts/fichas-cp-imagens.py` porque exige uma biblioteca de imagem, e esta
 * casa não tem nenhuma no `package.json`; pôr o `sharp` lá dentro para rodar
 * uma vez por ano seria caro pelo motivo errado.
 *
 * O que ESTE script faz sobre as imagens é o que importa no dia a dia: ele
 * CONFERE que cada ficha tem os dois arquivos e MORRE se faltar um. Uma base de
 * imagem cujo arquivo não existe não dá erro em lugar nenhum — dá um retângulo
 * vazio na Biblioteca, que é o defeito calado que esta casa não aceita.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = resolve(RAIZ, "data-sources/fichas-cp-2026.json");
const SAIDA = resolve(RAIZ, "public/data/fichas-cp.json");

interface Transcrita {
  slug: string;
  codinome: string;
  nomeCivil: string;
  shortcode: string;
  publicadoEm: string;
  personagemInferido: string;
  frase: string;
  fobia: string;
  alvo: string;
  diagnostico: string;
  prognostico: string;
}

interface Fonte {
  meta: Record<string, string>;
  fichas: Transcrita[];
}

function main() {
  if (!existsSync(ENTRADA)) throw new Error(`transcrição ausente: ${ENTRADA}`);
  const fonte = JSON.parse(readFileSync(ENTRADA, "utf8")) as Fonte;

  const faltando: string[] = [];
  const fichas = fonte.fichas.map((f) => {
    const imagem = `/fichas/${f.slug}.jpg`;
    const mini = `/fichas/mini/${f.slug}.jpg`;
    for (const rel of [imagem, mini]) {
      if (!existsSync(resolve(RAIZ, "public", rel.slice(1)))) faltando.push(rel);
    }
    return {
      slug: f.slug,
      codinome: f.codinome,
      nomeCivil: f.nomeCivil,
      frase: f.frase,
      fobia: f.fobia,
      alvo: f.alvo,
      diagnostico: f.diagnostico,
      prognostico: f.prognostico,
      personagem: f.personagemInferido,
      shortcode: f.shortcode,
      url: `https://www.instagram.com/p/${f.shortcode}/`,
      publicadoEm: f.publicadoEm,
      imagem,
      mini,
    };
  });

  // Morre, não avisa: a Biblioteca mostra a miniatura de TODA linha, e um
  // arquivo ausente vira um buraco silencioso na tela de quem está no meio de
  // uma prova.
  if (faltando.length) {
    throw new Error(
      `imagem ausente (rode scripts/fichas-cp-imagens.py):\n  ${faltando.join("\n  ")}`,
    );
  }

  // Ordem de publicação — a série foi postada de trás para a frente, e a ordem
  // cronológica é a que a pessoa viu no perfil.
  fichas.sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));

  writeFileSync(
    SAIDA,
    JSON.stringify({
      source: fonte.meta.fonte,
      generatedAt: new Date().toISOString().slice(0, 10),
      coletadoEm: fonte.meta.coletadoEm,
      arquivoN: fonte.meta.arquivoN,
      periculosidade: fonte.meta.periculosidade,
      aviso: fonte.meta.aviso,
      normalizacao: fonte.meta.normalizacao,
      personagem: fonte.meta.personagem,
      lacuna: fonte.meta.lacuna,
      count: fichas.length,
      fichas,
    }),
  );
  console.log(`fichas da CP: ${fichas.length} → ${SAIDA}`);
}

main();
