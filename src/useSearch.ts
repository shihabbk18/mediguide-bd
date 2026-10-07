import { useEffect, useRef, useState } from "react";
import { products, productById, searchPage } from "./catalogue";
import type { Product } from "./domain";
export function useSearch(query: string) {
  const large = products.length > 2000 && typeof Worker !== "undefined";
  const worker = useRef<Worker | null>(null),
    sequence = useRef(0);
  const [result, setResult] = useState<{
    query: string;
    items: Product[];
    total: number;
  }>({ query: "", items: [], total: 0 });
  useEffect(() => {
    if (!large) return;
    const w = new Worker(new URL("./search.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, [large]);
  useEffect(() => {
    if (!large) return;
    const w = worker.current;
    if (!w) return;
    const request = ++sequence.current;
    w.onmessage = ({ data }) => {
      if (data.request !== sequence.current) return;
      setResult({
        query,
        total: data.total,
        items: data.ids
          .map((id: string) => productById.get(id))
          .filter(Boolean),
      });
    };
    const timer = setTimeout(() => w.postMessage({ request, query }), 120);
    return () => clearTimeout(timer);
  }, [query, large]);
  return large
    ? result.query === query
      ? result
      : { items: [], total: 0 }
    : searchPage(query);
}
