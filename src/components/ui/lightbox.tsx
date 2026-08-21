import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Uma imagem grande por cima de tudo, para ler o que a miniatura não cabe.
 *
 * Escrito à mão, e não com um Radix: esta casa não tem biblioteca de diálogo, e
 * o que se precisa aqui é pequeno e conhecido — Esc fecha, clique no fundo
 * fecha, o foco vai para o botão de fechar e VOLTA para quem abriu. O
 * `<dialog>` nativo daria os três de graça, mas o `showModal` não existe no
 * jsdom desta versão: a tela passaria a ser a única parte da bancada sem teste.
 *
 * O fundo é um `<button>` de verdade ocupando a tela inteira, e não um `div`
 * com `onClick`. Sai mais barato que a alternativa em toda medida: fecha no
 * clique, fecha no Enter, é anunciado por leitor de tela e não precisa de uma
 * única supressão de acessibilidade.
 *
 * É um `<dialog open>`, e não um `div role="dialog"`: mesmo papel de acesso,
 * elemento certo. Sem `showModal` de propósito — ele não existe no jsdom desta
 * versão, e o que ele daria de graça (foco, Esc, fundo) já está escrito acima.
 *
 * A rolagem do corpo fica travada enquanto ele está aberto. Sem isso, no
 * celular, o dedo arrastando a imagem rola a página atrás — e ao fechar a
 * pessoa está em outro ponto da lista, sem entender por quê.
 */
export function Lightbox({
  src,
  alt,
  legenda,
  aoFechar,
  className,
}: {
  src: string;
  alt: string;
  legenda?: string;
  aoFechar: () => void;
  className?: string;
}) {
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    fechar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const naTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      }
    };
    document.addEventListener("keydown", naTecla);
    return () => {
      document.removeEventListener("keydown", naTecla);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aoFechar]);

  return (
    <dialog
      open
      aria-modal="true"
      aria-label={alt}
      className={cn(
        // As seis primeiras classes existem para DESFAZER o estilo do agente:
        // um `<dialog open>` sem `showModal` nasce `position:absolute`,
        // `width/height:fit-content`, `max-width:calc(100% - 6px - 2em)`,
        // `margin:auto`, borda e `padding:1em`. Sem elas a caixa encolhe para o
        // tamanho da imagem e ancora no CANTO da página, que foi exatamente o
        // que apareceu na tela: o "diálogo" virou uma figura solta lá em cima.
        "m-0 h-full max-h-none w-full max-w-none border-0 p-3 sm:p-6",
        // z acima de tudo: o app tem `z-[400]` no mapa e `z-[500]` no combobox,
        // e um modal que passa por baixo de um dropdown não é modal.
        "fixed inset-0 z-[1000] flex items-center justify-center bg-black/85",
        className,
      )}
    >
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <button
        ref={fechar}
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-lg hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
      >
        <X className="h-5 w-5" />
      </button>

      <figure className="relative z-10 flex max-h-full flex-col items-center gap-3">
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-2xl"
        />
        {/* A legenda tem fundo PRÓPRIO, e não texto translúcido sobre o escuro:
            ela cai sobre a arte quando a imagem é alta, e ali um branco a 70%
            some contra o papel claro do dossiê. */}
        {legenda ? (
          <figcaption className="max-w-full truncate rounded-[var(--radius-md)] border border-white/15 bg-[var(--color-ink-900)] px-3 py-1.5 text-center font-mono text-sm text-white shadow-lg">
            {legenda}
          </figcaption>
        ) : null}
      </figure>
    </dialog>
  );
}
