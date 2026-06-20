import { getCeps, loadCeps } from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEffect, useMemo, useState } from "react";
import { searchCeps } from "./search";
import type { CepsData } from "./types";

export function useCepSearch() {
  const [pattern, setPattern] = useState("");
  const [data, setData] = useState<CepsData | null>(getCeps);
  const [loading, setLoading] = useState(!getCeps());

  useEffect(() => {
    let alive = true;
    loadCeps()
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

  const debounced = useDebouncedValue(pattern, 160);
  const result = useMemo(
    () =>
      data && debounced.trim()
        ? searchCeps(data, debounced)
        : { hits: [], total: 0, truncated: false, valid: debounced.trim() === "" },
    [data, debounced],
  );

  return { pattern, setPattern, result, loading, total: data?.count ?? 0 };
}
