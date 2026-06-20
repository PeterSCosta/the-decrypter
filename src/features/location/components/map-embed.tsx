/** Mapa OpenStreetMap embutido (sem chave de API) com um marcador no ponto. */
export function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.006; // ~600 m de margem ao redor do ponto
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      title="Mapa"
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-80 w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
    />
  );
}
