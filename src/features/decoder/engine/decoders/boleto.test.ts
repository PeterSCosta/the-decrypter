import {
  formatBRL,
  lerBoleto,
  lerFator,
  mod10,
  mod11Arrecadacao,
  mod11Bancario,
} from "@/features/reference/boleto";
import type { CampoBoleto } from "@/features/reference/boleto";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as boleto } from "./boleto";

const ctx = (only?: string): DecodeContext => ({ key: "", streets: null, ceps: null, only });
const decode = (input: string, only?: string) => boleto.decode(input, ctx(only));
const campos = (input: string) => decode(input)[0].data as CampoBoleto[];
const nomes = (input: string) => campos(input).map((c) => c.name);

// Âncoras CONFERIDAS por cálculo (não copiadas de blog):
// – Itaú: DV geral 1 fecha em módulo 11, pesos 2–9 da direita, 0/10/11 → 1.
// – Arrecadação módulo 10: linha digitável real (exemplo público do BoletoNet),
//   com os 4 DVs de bloco e o DV geral reproduzidos pelo algoritmo daqui.
const ITAU_44 = "34191153800000157351234567890123456789012345";
const ITAU_47 = "34191234546789012345767890123457115380000015735";
const ARREC_MOD10_44 = "89610000000599800010110533320100626000015744";
const ARREC_MOD10_48 = "896100000000599800010119053332010064260000157446";
const ARREC_MOD11_44 = "83870000009876500031234567890123456789012345";
const ARREC_MOD11_48 = "838700000095876500031232456789012341567890123457";

describe("dígitos verificadores", () => {
  it("módulo 11 do bancário nunca devolve 0 e fecha o exemplo do Itaú", () => {
    expect(mod11Bancario(ITAU_44.slice(0, 4) + ITAU_44.slice(5))).toBe(1);
    // A regra 0/10/11 → 1 tira o zero do contradomínio: é o teste de sanidade
    // mais barato contra um código digitado errado.
    for (let i = 0; i < 200; i++) {
      expect(mod11Bancario(String(i).padStart(43, "7"))).not.toBe(0);
    }
  });

  it("módulo 11 da arrecadação usa a OUTRA regra (resto 0 ou 1 → DV 0)", () => {
    // As duas funções TÊM de discordar em algum caso: se fossem iguais, o bug
    // clássico (usar o módulo 11 do bancário na arrecadação) passaria batido.
    const algumaDivergencia = Array.from({ length: 60 }, (_, i) =>
      String(i).padStart(43, "3"),
    ).some((d) => mod11Bancario(d) !== mod11Arrecadacao(d));
    expect(algumaDivergencia).toBe(true);
  });

  it("módulo 10 reproduz os 4 DVs de bloco de uma linha de arrecadação real", () => {
    const blocos = [
      ARREC_MOD10_44.slice(0, 11),
      ARREC_MOD10_44.slice(11, 22),
      ARREC_MOD10_44.slice(22, 33),
      ARREC_MOD10_44.slice(33, 44),
    ];
    expect(blocos.map((b) => b + mod10(b)).join("")).toBe(ARREC_MOD10_48);
  });
});

describe("fator de vencimento", () => {
  it("ancora as duas contagens nas datas documentadas pela FEBRABAN", () => {
    expect(lerFator(1000).antiga).toBe("03/07/2000");
    expect(lerFator(9999).antiga).toBe("21/02/2025");
    expect(lerFator(1000).atual).toBe("22/02/2025");
  });

  it("devolve SEMPRE as duas leituras — escolher uma zeraria a prova", () => {
    const v = lerFator(1538);
    expect(v.atual).toBe("14/08/2026");
    expect(v.antiga).toBe("23/12/2001");
  });

  it("fator 0000 é boleto sem vencimento, não 03/07/2000", () => {
    const v = lerFator(0);
    expect(v.semVencimento).toBe(true);
    expect(v.atual).toBeNull();
  });
});

describe("boleto bancário", () => {
  it("lê banco, moeda, valor e as duas datas dos 44 dígitos", () => {
    const c = decode(ITAU_44)[0];
    expect(c.render).toBe("code-list");
    expect(c.output).toContain("Itaú Unibanco");
    expect(c.output).toContain("R$ 157,35");
    expect(nomes(ITAU_44)).toContain("Vencimento 14/08/2026");
    expect(nomes(ITAU_44)).toContain("ou 23/12/2001");
    expect(nomes(ITAU_44)).toContain("dígito geral 1 confere");
  });

  it("a linha digitável de 47 cai no mesmo código de barras", () => {
    const c = decode(ITAU_47)[0];
    expect(c).toBeDefined();
    expect(c.label).toContain("linha digitável (47)");
    expect(c.notes).toContain(ITAU_44);
    expect(c.output).toBe(decode(ITAU_44)[0].output);
  });

  it("aceita a linha impressa com pontos e espaços", () => {
    const impressa = "34191.23454 67890.123457 67890.123457 1 15380000015735";
    expect(decode(impressa)[0].output).toBe(decode(ITAU_47)[0].output);
  });

  it("encadeia o campo livre — a parte que não é interpretada", () => {
    expect(decode(ITAU_44)[0].chainValue).toBe("1234567890123456789012345");
  });

  it("valor zerado vira 'valor não informado', não R$ 0,00", () => {
    const semValor = `${"00195"}0000${"0".repeat(35)}`;
    expect(semValor).toHaveLength(44);
    expect(nomes(semValor)).toContain("valor não informado");
    expect(nomes(semValor)).toContain("sem vencimento");
  });

  it("banco fora da tabela é dito como número, nunca inventado", () => {
    // Banco 919 não existe; o DV 1 continua fechando (conferido por cálculo).
    const bc = "91991153800000157351234567890123456789012345";
    expect(campos(bc)[0].name).toBe("banco 919 — fora da tabela embarcada");
    expect(decode(bc)[0].output).toContain("banco 919");
  });
});

describe("arrecadação (conta de consumo)", () => {
  it("lê a linha de 48 com DV de bloco em módulo 10", () => {
    const c = decode(ARREC_MOD10_48)[0];
    expect(c.label).toContain("arrecadação");
    expect(c.notes).toContain(ARREC_MOD10_44);
    expect(nomes(ARREC_MOD10_48)).toContain("Uso exclusivo do banco");
  });

  it("lê a linha de 48 com DV de bloco em módulo 11 e nomeia o segmento", () => {
    const c = decode(ARREC_MOD11_48)[0];
    expect(c).toBeDefined();
    expect(nomes(ARREC_MOD11_48)).toContain("Energia elétrica e gás");
    expect(c.output).toContain("R$ 987,65");
  });

  it("os 44 dígitos da arrecadação também abrem", () => {
    expect(decode(ARREC_MOD11_44)[0].label).toContain("código de barras (44)");
  });

  it("avisa que arrecadação não tem fator de vencimento", () => {
    expect(decode(ARREC_MOD11_44)[0].notes).toContain("campo livre");
  });

  it("não confunde os dois módulos: trocar a 3ª posição quebra o DV", () => {
    // Mesmo código, identificação de valor 6 (módulo 10) em vez de 8 (módulo 11).
    const trocado = `838${ARREC_MOD11_44.slice(3)}`.replace(/^838/, "836");
    expect(decode(trocado)).toEqual([]);
  });
});

describe("gate anti-ruído", () => {
  it("não dispara em CEP, CPF, telefone, coordenada, data, Base64 nem prosa", () => {
    for (const ruido of [
      "89010203", // CEP
      "111.444.777-35", // CPF válido
      "47999887766", // telefone com DDD
      "-26.9194, -49.0661", // coordenada
      "07/10/1997", // data (a própria data-base)
      "SGVsbG8gbXVuZG8=", // Base64
      "o rato roeu a roupa do rei de roma", // prosa
      "3419115380000015735", // pedaço do boleto
      "", // vazio
    ]) {
      expect(decode(ruido)).toEqual([]);
    }
  });

  it("44/47/48 dígitos aleatórios não passam: o DV é obrigatório", () => {
    expect(decode("12345678901234567890123456789012345678901234")).toEqual([]);
    expect(decode("12345678901234567890123456789012345678901234567")).toEqual([]);
    expect(decode("812345678901234567890123456789012345678901234567")).toEqual([]);
  });

  it("um dígito trocado derruba o resultado", () => {
    const furado = `${ITAU_44.slice(0, 20)}9${ITAU_44.slice(21)}`;
    expect(furado).toHaveLength(44);
    expect(decode(furado)).toEqual([]);
  });

  it("comprimento 43 ou 45 não é boleto", () => {
    expect(decode(ITAU_44.slice(0, 43))).toEqual([]);
    expect(decode(`${ITAU_44}0`)).toEqual([]);
  });

  it("no modo 'uma cifra só' o painel abre mesmo com DV furado, e diz isso", () => {
    const furado = `${ITAU_44.slice(0, 20)}9${ITAU_44.slice(21)}`;
    const c = decode(furado, "boleto")[0];
    expect(c).toBeDefined();
    expect(c.label).toContain("DV não confere");
    // Abaixo do corte do partition: é diagnóstico, não resposta.
    expect(c.forcedScore).toBeLessThan(0.35);
  });

  it("moeda diferente de 9 não é boleto bancário", () => {
    expect(lerBoleto(`3410${ITAU_44.slice(4)}`, true)).toBeNull();
  });
});

describe("formatação", () => {
  it("centavos viram reais com separador de milhar", () => {
    expect(formatBRL(15735)).toBe("R$ 157,35");
    expect(formatBRL(5)).toBe("R$ 0,05");
    expect(formatBRL(123456789)).toBe("R$ 1.234.567,89");
  });
});
