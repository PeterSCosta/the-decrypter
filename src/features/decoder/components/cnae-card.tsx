import { CopyButton } from "@/components/ui/copy-button";
import { ApiError, apiFetch } from "@/lib/api";
import { Briefcase, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { CnaeHint } from "../engine/decoders/cnae";

interface CnaeInfo {
  codigo: string;
  codigoFormatado: string;
  descricao: string;
  classe: string | null;
  grupo: string | null;
  divisao: string | null;
  secao: string | null;
  secaoDescricao: string | null;
}

/**
 * Confirma o CNAE no IBGE e mostra a hierarquia.
 *
 * A hierarquia é o ponto, e não enfeite: numa prova, a atividade sozinha diz
 * pouco — o que costuma ligar os códigos é a SEÇÃO ("J — Informação e
 * comunicação"), do mesmo jeito que o capítulo liga os códigos da CID-10.
 *
 * A confirmação também é o que sustenta o candidato quando o número veio nu:
 * sete dígitos sem pontuação não têm assinatura, e quem separa o CNAE de um
 * telefone é o IBGE dizer que aquele código existe.
 */
export function CnaeCard({ hint }: { hint: CnaeHint }) {
  const [info, setInfo] = useState<CnaeInfo | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao-existe" | "erro">("carregando");

  useEffect(() => {
    let vivo = true;
    setEstado("carregando");
    setInfo(null);
    apiFetch<CnaeInfo>(`/cnae/${hint.codigo}`)
      .then((d) => {
        if (!vivo) return;
        setInfo(d);
        setEstado("ok");
      })
      .catch((e) => {
        if (!vivo) return;
        // 404 é resposta, não falha: aquele código não existe na tabela.
        setEstado(e instanceof ApiError && e.status === 404 ? "nao-existe" : "erro");
      });
    return () => {
      vivo = false;
    };
  }, [hint.codigo]);

  if (estado === "carregando") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Conferindo {hint.formatado} no IBGE…
      </p>
    );
  }
  if (estado === "nao-existe") {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        {hint.formatado} não consta na tabela CNAE do IBGE.
      </p>
    );
  }
  if (estado === "erro" || !info) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Não consegui conferir {hint.formatado} no IBGE agora.
      </p>
    );
  }

  const hierarquia = [
    info.secao && info.secaoDescricao ? `Seção ${info.secao} — ${info.secaoDescricao}` : null,
    info.divisao,
    info.grupo,
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-start gap-2.5">
      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-[var(--text-primary)]">
            {info.codigoFormatado}
          </span>
          <CopyButton value={info.codigoFormatado} />
        </div>
        <p className="mt-0.5 text-sm text-[var(--text-primary)]">{info.descricao}</p>
        {hierarquia.length ? (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hierarquia.join(" · ")}</p>
        ) : null}
      </div>
    </div>
  );
}
