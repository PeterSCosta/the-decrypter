import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/**
 * Compartilha a localização via Google Maps. No celular usa o Web Share API
 * nativo (WhatsApp, etc.); no desktop copia o link pro clipboard.
 */
export function ShareLocationButton({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const share = async () => {
    const data: ShareData = {
      title: label,
      text: `${label} — ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      url,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(data);
      } catch {
        // usuário cancelou o compartilhamento nativo — não faz nada
      }
      return;
    }
    // Fallback desktop: copia o link do Google Maps.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] transition-opacity hover:opacity-90"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
