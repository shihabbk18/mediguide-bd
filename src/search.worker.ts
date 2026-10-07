import products from "./data/products.json";
import index from "./data/search-index.json";
import { queryIndex, type SearchIndex } from "./search-engine";
import type { Product } from "./domain";
// Large catalogues search outside the UI thread. No medical guidance is resolved here.
self.onmessage = ({ data }: { data: { request: number; query: string } }) => {
  const result = queryIndex(
    index as SearchIndex,
    products as Product[],
    data.query,
  );
  self.postMessage({
    request: data.request,
    total: result.total,
    ids: result.items.map((p) => p.id),
  });
};
