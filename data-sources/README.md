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
- **Terms:** the portal's terms grant personal, non-commercial use only. Fine for a local lookup;
  for anything public, request the dataset from the Prefeitura via LAI/dados abertos instead.
