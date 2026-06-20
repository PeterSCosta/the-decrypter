/**
 * build-municipios.ts — gera a lista de municípios do IBGE (código de 7 dígitos
 * → nome + UF) a partir da API oficial de localidades (mesmos códigos da DTB).
 *
 * Saída: public/data/municipios.json
 * Run: pnpm build:municipios
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public/data/municipios.json");

// UF a partir dos 2 primeiros dígitos do código IBGE (100% confiável).
const UF_BY_CODE: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

interface ApiMun {
  id: number;
  nome: string;
}

async function main() {
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios");
  if (!res.ok) throw new Error(`IBGE API HTTP ${res.status}`);
  const data = (await res.json()) as ApiMun[];

  const rows = data
    .map((m): [string, string, string] => {
      const code = String(m.id);
      return [code, m.nome, UF_BY_CODE[code.slice(0, 2)] ?? ""];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  const payload = {
    source: "IBGE — localidades/municípios (DTB 2024)",
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));
  console.log(`municipios: ${rows.length} → ${OUT}`);
}

main();
