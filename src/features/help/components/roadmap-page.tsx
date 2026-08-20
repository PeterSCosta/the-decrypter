import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ROADMAP, ROADMAP_INTRO, type RoadStatus, STATUS_LABEL } from "../roadmap-content";

const STATUS_TONE: Record<RoadStatus, BadgeProps["tone"]> = {
  todo: "brand",
  idea: "info",
  blocked: "pulse",
  done: "success",
  wont: "neutral",
};

export function RoadmapPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-2xl text-[var(--text-primary)]">Roadmap & melhorias</h1>
      <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">{ROADMAP_INTRO}</p>

      <div className="mt-8 flex flex-col gap-8">
        {ROADMAP.map((group) => (
          <section key={group.title}>
            <h2 className="font-display text-lg text-[var(--brand-strong)]">{group.title}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {group.items.map((item) => (
                <Card key={item.title} className="p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-sm text-[var(--text-primary)]">
                      {item.title}
                    </span>
                    <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{item.desc}</p>
                  {item.note ? (
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">{item.note}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
