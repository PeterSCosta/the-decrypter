import { getStreets, loadStreets } from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEffect, useMemo, useState } from "react";
import { searchStreets } from "./search";
import type { StreetsData } from "./types";

export function useStreetSearch() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<StreetsData | null>(getStreets);
  const [loading, setLoading] = useState(!getStreets());

  useEffect(() => {
    let alive = true;
    loadStreets()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const debounced = useDebouncedValue(query, 160);
  const matches = useMemo(
    () => (data ? searchStreets(data, debounced, 300) : []),
    [data, debounced],
  );

  return { query, setQuery, matches, loading, total: data?.count ?? 0 };
}
