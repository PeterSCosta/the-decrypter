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
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6",
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
        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-black/50 text-white hover:bg-black/70"
      >
        <X className="h-5 w-5" />
      </button>

      <figure className="relative z-10 flex max-h-full flex-col items-center gap-2">
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-2xl"
        />
        {legenda ? (
          <figcaption className="text-center font-mono text-xs text-white/70">{legenda}</figcaption>
        ) : null}
      </figure>
    </dialog>
  );
}
