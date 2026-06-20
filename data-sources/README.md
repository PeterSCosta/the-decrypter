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
