# Data sources

Raw inputs for the bundled datasets. The large/binary originals are **gitignored**; only the
generated JSON in `public/data/` is committed. Regenerate with `pnpm build:data`.

## `rol-de-ruas.txt` / `rol-de-ruas.pdf` — Blumenau street registry

- **Origin:** Prefeitura de Blumenau — *Rol de Ruas com Gabaritos*
  (`blumenau.sc.gov.br/monitorarecurso/pdfrolderuas.aspx`).
- **Text extraction:** `pdftotext -layout "rol de ruas.pdf" rol-de-ruas.txt` (needs `poppler`:
  `brew install poppler`). The committed `.txt` lets you rebuild without poppler.
- **Parser:** [`scripts/build-streets.ts`](../scripts/build-streets.ts) → `public/data/streets.json`
  (4,426 entries). Each 3-line block yields: código, tipo, nome, bairro, Nº da Lei, Data da Lei,
  localização, ext/larg, atas.

## `ceps-sc.csv` — Santa Catarina postal codes

- **Origin:** Base dos Dados (BigQuery export of `br_bd_diretorios_brasil`-style CEP data),
  filtered to `sigla_uf = SC`. Columns: `cep, logradouro, localidade, id_municipio,
  nome_municipio, sigla_uf, estabelecimentos, centroide`.
- **Parser:** [`scripts/build-ceps.ts`](../scripts/build-ceps.ts) → `public/data/ceps.json`
  (40,445 rows, 272 municípios). Drops the heavy `estabelecimentos` column; dedupes município names
  into a lookup array; parses `centroide` (`POINT(lng lat)`) into `[lat, lng]`.
- Override the input path: `CEP_CSV=/path/to.csv pnpm build:ceps`.

## `pontes-*.json` / `bairros-blumenau.geojson` — named bridges

- **`pontes-leis.json`** — the naming laws. Origin: Câmara Municipal de Blumenau, *Leis
  Municipais* (`digital.camarablu.sc.gov.br`), full-text search for `ponte`, `passarela` and
  `viaduto`; 73 laws, 1950→2023, with ementa, integral text (when the portal publishes it) and
  permalink. **Committed** on purpose: the portal has since put a human-verification wall in front
  of the search, so this file is the only reproducible copy of the harvest.
- **`pontes-osm.json`** — OSM ways tagged `bridge` / `man_made=bridge` inside Blumenau, with
  geometry (Overpass). 426 ways; only ~40 carry a name.
- **`pontes-hidrografia.json`** — named `river`/`stream`/`canal` ways, for the "what does it cross"
  join. **`bairros-blumenau.geojson`** — bairro polygons from the city's ArcGIS
  (`geo.blumenau.sc.gov.br`, `Limites/Bairros`), trimmed to name + código.
- **Parser:** [`scripts/build-bridges.ts`](../scripts/build-bridges.ts) → `public/data/bridges.json`
  (94 structures). Joins law ↔ OSM by name and keeps rows that exist on only one side — the laws
  name ~50 bridges OSM never mapped, OSM maps a few no law we found names.
- The geoportal has **no bridge layer** (checked: Vias, Rodovias, Lotes, Bairros, Hidrografia), so
  there is no official geometry to use instead of OSM.

## `postes-raw.jsonl` — Blumenau street-lighting poles (plaquetas)

- **Origin:** *Cidade Iluminada* portal (Exati Tecnologia), Blumenau instance
  `ipbl.exati.com.br/guia/command/ipbl`, command `ConsultarPontosProximos`. Public: no login and no
  captcha (`USAR_CAPTCHA: 0` in the city config served by `central.exati.com.br`).
- **Collector:** [`scripts/build-postes.ts`](../scripts/build-postes.ts) → `public/data/postes.json`.
  The command only ever returns the **20 nearest** points to a coordinate (no bulk endpoint, and no
  parameter raises the cap), so the script sweeps the municipality with a **union-of-discs cover**:
  each response certifies that every pole within `d20` of the query point is known, so the run is
  provably complete over its bbox rather than a sample. ~5.5 poles per request.
- `pnpm build:postes` — resumable (`postes-state.json` holds the certified discs); `DELAY_MS`,
  `MAX_QUERIES` and `BBOX` tune it. The upstream instance drops out with 503/404 fairly often
  (across unrelated Exati tenants, not just this one); just run it again.
- **Mind the bbox.** "Complete sweep" is only ever complete *for the bbox given*. The first run
  stopped at lat −26.69 and clipped the north of the município (the city config from
  `central.exati.com.br` declares −26.6127); a second run over `BBOX=-26.6910,-26.5900,-49.32,-48.95`
  picked up the missing 726 poles. The script now counts poles within ~200 m of each edge when a
  sweep finishes and warns per side — extend the bbox that way and rerun; the JSONL accumulates, so
  nothing already collected is refetched.
- **Verified:** 45,285 poles, no pole within 200 m of any edge, and 25 independent probe queries
  (500 returned neighbours) found nothing missing from the dataset.
- **Terms:** the portal's terms grant personal, non-commercial use only. Fine for a local lookup;
  for anything public, request the dataset from the Prefeitura via LAI/dados abertos instead.

## `postes-fichas.jsonl` — full record per pole

- **Origin:** same instance, command `ConsultarEtiquetaPontoServico` (lookup by plaqueta). It returns
  **55 fields** against the sweep's 21 — notably `NOME_BAIRRO`, `DESC_ESTRUTURA_PS` (the actual
  fixture: arm, luminaire, lamp), `DATA_HORA_INSTALACAO` and `PONTOS_LUMINOSOS`.
- **Collector:** [`scripts/enrich-postes.ts`](../scripts/enrich-postes.ts), `pnpm enrich:postes`.
  One request per pole — `ID_ESTRUTURA_PS` is nearly unique per pole (16k distinct values across 24k
  poles), so it is not a catalogue key and no local join can stand in for the call. Resumable: it
  skips plaquetas already in the JSONL. Run it after `build:postes`.
- The lookup is fuzzy, so the collector keeps a record only when the returned `ID_PONTO_SERVICO`
  equals the one it asked for.
- **Upstream bug — 54 poles can never be enriched.** The plaqueta search eats a repeated digit:
  asking for `12222` returns the pole numbered `1222`, `22222` returns `2222`, `1118` returns
  `11118`. Every failing plaqueta has repeated digits, and the command takes no `ID_PONTO_SERVICO`
  as an alternative key, so there is no way around it. Those ids are parked in
  `postes-sem-ficha.json` and skipped on later runs (delete the file to retry them).
- **Result:** 45,285 poles, **45,186 (99.78%) with the full record**. The 99 without are 45 poles
  that carry no plaqueta at all plus the 54 above; they still have coordinates, street, type and
  status from the sweep. Field coverage in `postes.json`: `bairro`/`instalacao` 99.8%,
  `pontosLuminosos` 93.9%, `ruaNome` 82.1%, `estrutura` 29.5% and `numero` 24.9% — those last two
  are simply blank upstream for most poles, not something the collector lost.

## `fichas-cp-2026.json` / `fichas-cp/` — Fichas de Identificação da Comissão de Provas

- **Origin:** Instagram [@comissaodeprovas](https://www.instagram.com/comissaodeprovas/) (post
  colaborativo com @freinert), série *"Integrantes da CP - 2026"*, publicada em 21/08/2026 —
  17 posts, um por integrante. Cada arte é 1080×1080.
- **`fichas-cp-2026.json`** — a **transcrição**, feita à mão a partir das imagens, e a fonte de
  verdade deste dado: codinome, nome civil, frase, fobia, alvo, diagnóstico, prognóstico e o
  permalink de cada post. Versionada.
- **`fichas-cp/<slug>.jpg`** — os originais baixados, **gitignorados**. Para rebaixar:
  `https://www.instagram.com/p/<shortcode>/media/?size=l` (o shortcode está na transcrição; o
  endpoint devolve 1080×1080 sem login).
- **Recorte:** [`scripts/fichas-cp-imagens.py`](../scripts/fichas-cp-imagens.py) (Pillow do
  sistema, fora do `package.json` — é uma passada por ano) → `public/fichas/<slug>.jpg` (o dossiê,
  735×1072) e `public/fichas/mini/<slug>.jpg` (o polaroide do personagem, 216×304). As caixas são
  fixas porque o gabarito da arte é o mesmo nas 17.
- **Parser:** [`scripts/build-fichas-cp.ts`](../scripts/build-fichas-cp.ts) → `public/data/fichas-cp.json`
  (17 fichas, ~17 KB). Ele **morre** se faltar o dossiê ou a miniatura de alguma ficha — imagem
  ausente não dá erro em lugar nenhum, dá um retângulo vazio na Biblioteca.
- **Cuidados com o dado:** os campos `ID` e `NASC` vêm **tarjados** na arte e não foram lidos. O
  `ARQUIVO N` é o **mesmo nas 17** (`R325B4915`): é número da arte, não identificador de pessoa.
  O campo `personagem` é leitura nossa da foto, não está escrito na ficha.
- **Lacuna conhecida:** a série tinha **18** fichas. A do ANDY (Anderson Cesar Ignacio) foi
  publicada e depois **removida do perfil**, antes desta coleta — não está aqui.
