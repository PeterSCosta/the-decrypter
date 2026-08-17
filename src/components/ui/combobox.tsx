import { cn } from "@/lib/cn";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export interface Sugestao {
  /** Chave estável. */
  id: string;
  /** O que aparece em destaque. */
  texto: string;
  /** Segunda linha (bairro, tipo, procedência). */
  detalhe?: string;
}

/**
 * Campo com sugestões.
 *
 * O projeto não tinha nenhum: nem Radix, nem Headless UI, nem `<datalist>`. O
 * mais próximo era o filtro de cifras da bancada, que é uma lista filtrada sem
 * popover nem teclado. Aqui o teclado importa — quem está numa gincana digita
 * três letras e aperta Enter.
 *
 * O contrato de acessibilidade é o do padrão combobox: `role="combobox"` no
 * input, `aria-expanded`, `aria-activedescendant` apontando para a opção ativa,
 * e a lista com `role="listbox"`.
 */
export function Combobox({
  value,
  onChange,
  sugestoes,
  onEscolher,
  onEnterSemSugestao,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  sugestoes: Sugestao[];
  onEscolher: (s: Sugestao) => void;
  /** Enter com a lista fechada — o comportamento antigo do campo. */
  onEnterSemSugestao?: () => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);

  // Clique fora fecha. Sem isto a lista fica pendurada sobre o mapa.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  // A lista mudou: volta o destaque para a primeira. O corpo não lê `sugestoes`,
  // então o Biome a considera supérflua — mas é exatamente a mudança dela que
  // precisa disparar o reset, senão o destaque fica apontando para um item que
  // já não existe.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a troca da lista É o gatilho
  useEffect(() => setAtivo(0), [sugestoes]);

  const visiveis = aberto && sugestoes.length > 0;

  function escolher(s: Sugestao) {
    onEscolher(s);
    setAberto(false);
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && sugestoes.length) {
      e.preventDefault();
      setAberto(true);
      setAtivo((i) => (i + 1) % sugestoes.length);
      return;
    }
    if (e.key === "ArrowUp" && sugestoes.length) {
      e.preventDefault();
      setAtivo((i) => (i - 1 + sugestoes.length) % sugestoes.length);
      return;
    }
    if (e.key === "Escape") {
      setAberto(false);
      return;
    }
    if (e.key === "Enter") {
      // Enter aceita a sugestão quando a lista está aberta e resolve a lista
      // toda quando está fechada — o campo já tinha esse segundo comportamento,
      // e tirá-lo quebraria o hábito de quem usa.
      if (visiveis) {
        e.preventDefault();
        escolher(sugestoes[ativo]);
      } else {
        onEnterSemSugestao?.();
      }
    }
  }

  return (
    <div ref={raiz} className="relative flex-1">
      <input
        type="text"
        role="combobox"
        aria-expanded={visiveis}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={visiveis ? `${id}-op-${ativo}` : undefined}
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={tecla}
        className={cn(
          "h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className,
        )}
      />

      {visiveis ? (
        // As regras de a11y do Biome tratam `listbox`/`option` como widgets que
        // recebem foco. No padrão combobox da WAI-ARIA eles NÃO recebem: o foco
        // fica no input e o `aria-activedescendant` aponta a opção ativa — é
        // justamente isso que deixa a pessoa digitar e navegar ao mesmo tempo.
        // Trocar por elementos focáveis quebraria o padrão em vez de melhorá-lo.
        // biome-ignore lint/a11y/useFocusableInteractive: foco fica no input (aria-activedescendant)
        <ul
          // biome-ignore lint/a11y/useSemanticElements: não há elemento nativo de listbox
          id={`${id}-lista`}
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: papel correto no padrão combobox
          role="listbox"
          className="absolute z-[500] mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] py-1 shadow-lg"
        >
          {sugestoes.map((s, i) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: o teclado é tratado no input
            // biome-ignore lint/a11y/useFocusableInteractive: opção não recebe foco no padrão combobox
            <li
              key={s.id}
              // biome-ignore lint/a11y/useSemanticElements: não há `option` fora de <select>
              id={`${id}-op-${i}`}
              // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: papel correto no padrão combobox
              role="option"
              aria-selected={i === ativo}
              onMouseEnter={() => setAtivo(i)}
              // `mousedown` e não `click`: o `blur` do input dispara antes do
              // clique e a lista fecharia sem escolher nada.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(s);
              }}
              className={cn(
                "cursor-pointer px-3 py-1.5",
                i === ativo ? "bg-[var(--surface-sunken)]" : "",
              )}
            >
              <div className="truncate text-sm text-[var(--text-primary)]">{s.texto}</div>
              {s.detalhe ? (
                <div className="truncate text-xs text-[var(--text-muted)]">{s.detalhe}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
