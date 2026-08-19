import { runDecoders } from "@/features/decoder/engine/run";
import type { DecodeContext } from "@/features/decoder/engine/types";
import { prepararDeteccao } from "@/features/location/formats";
import { useEffect, useState } from "react";

export interface LeituraDoExemplo {
  decoder: string;
  saida: string;
}

/**
 * Roda um exemplo do guia no motor DE VERDADE.
 *
 * ── POR QUE ISTO EXISTE ─────────────────────────────────────────────────────
 * A saída de cada exemplo era escrita à mão, e mentia. A auditoria de 18/08
 * rodou os 105 exemplos de decoder e achou quatro que não funcionavam — um
 * deles (`Hloleh` → `Hello`) impossível por construção, porque transposição não
 * muda o comprimento da palavra. Um guia que DESCREVE a saída envelhece no
 * primeiro commit; um guia que a CALCULA não tem como envelhecer.
 *
 * ── O QUE ELE MOSTRA, E O QUE ELE NÃO PODE MOSTRAR ──────────────────────────
 * Mostra as três primeiras leituras do fan-out, com o nome do decoder em cada
 * uma. Não é só a "certa": ver o Afim ganhar do Atbash na mesma entrada ensina
 * como o ranking funciona, que é metade da habilidade de usar esta bancada.
 *
 * O que ele NÃO alcança é a metade que depende de rede: CEP, lote, CNAE, FIPE e
 * companhia resolvem por `ctx.hits`, a resposta do `/api/lookup`, e disparar 109
 * consultas ao abrir a Ajuda seria abusar do backend para enfeitar um documento.
 * Nesses casos o campo `esperado` do verbete diz o que sai com a consulta, e a
 * tela avisa que é expectativa — nunca finge que mediu.
 */
export function useExemploVivo(entrada: string, ativo: boolean): LeituraDoExemplo[] | null {
  const [leituras, setLeituras] = useState<LeituraDoExemplo[] | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;

    // O H3 e o Placekey moram numa lib que entra por `import()`. Sem esperar por
    // ela, o primeiro passe devolve null e o exemplo aparece como se estivesse
    // quebrado — foi o que já aconteceu na aba de Geolocalização.
    void prepararDeteccao(entrada).then(() => {
      if (!vivo) return;
      const r = runDecoders(entrada, {
        key: "",
        streets: null,
      } as unknown as DecodeContext) as unknown as {
        results: { decoderName: string; output: string }[];
      };
      setLeituras(r.results.slice(0, 3).map((c) => ({ decoder: c.decoderName, saida: c.output })));
    });

    return () => {
      vivo = false;
    };
  }, [entrada, ativo]);

  return leituras;
}

/**
 * Código longo encurtado para caber na linha, SEM perder o que se digita.
 *
 * O CAR tem 42 caracteres e a chave de NF-e, 44. O que a Ajuda fazia antes era
 * pior que encurtar: ela PUBLICAVA o valor truncado (`SC-4202404-D9ADE9…`), e
 * quem copiasse recebia "não reconheci". Aqui o corte é só de exibição — o
 * valor inteiro continua no botão de copiar e no de testar.
 */
export function encurtar(codigo: string, teto = 28): string {
  if (codigo.length <= teto) return codigo;
  const cabeca = Math.ceil((teto - 1) / 2);
  const cauda = Math.floor((teto - 1) / 2);
  return `${codigo.slice(0, cabeca)}…${codigo.slice(-cauda)}`;
}
