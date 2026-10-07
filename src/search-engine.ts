import { normalize, type Product } from "./domain";
export type SearchIndex = {
  version: 1;
  count: number;
  postings: Record<string, number[]>;
  fields: string[];
};
const tokensOf = (s: string) =>
  normalize(s)
    .replace(/(\d)(mg|ml|mcg)\b/g, "$1 $2")
    .match(/[\p{L}\p{N}%.]+/gu) ?? [];
export function buildSearchIndex(products: Product[]): SearchIndex {
  const postings: Record<string, number[]> = {};
  const fields = products.map((p) =>
    normalize(
      [
        p.brand_name,
        p.generic_name,
        p.strength,
        p.dosage_form,
        p.manufacturer,
      ].join(" "),
    ),
  );
  fields.forEach((s, i) => {
    for (const token of new Set(tokensOf(s))) (postings[token] ??= []).push(i);
  });
  return { version: 1, count: products.length, postings, fields };
}
export function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a.length === b.length)
      return (
        a.slice(i + 1) === b.slice(i + 1) ||
        (a[i] === b[i + 1] &&
          a[i + 1] === b[i] &&
          a.slice(i + 2) === b.slice(i + 2))
      );
    return a.length > b.length
      ? a.slice(i + 1) === b.slice(i)
      : a.slice(i) === b.slice(i + 1);
  }
  return true;
}
export function queryIndex(
  index: SearchIndex,
  products: Product[],
  query: string,
  limit = 60,
): { items: Product[]; total: number } {
  const tokens = tokensOf(query).slice(0, 12);
  if (!tokens.length) return { items: [], total: 0 };
  const vocabulary = Object.keys(index.postings);
  let candidates: Map<number, number> | null = null;
  for (const token of tokens) {
    const matches = new Map<number, number>();
    // Exact ingredient tokens outrank substrings (omeprazole versus esomeprazole).
    const words = index.postings[token]
      ? [token]
      : vocabulary.filter((w) =>
          /\d/.test(token) ? w === token : w.includes(token),
        );
    const fuzzy = words.length === 0 && token.length >= 3 && !/\d/.test(token);
    for (const word of fuzzy
      ? vocabulary.filter((w) => oneEdit(token, w))
      : words)
      for (const i of index.postings[word])
        matches.set(i, fuzzy ? 2 : word === token ? 0 : 1);
    if (candidates === null) candidates = matches;
    else {
      const next = new Map<number, number>();
      for (const [i, s] of candidates)
        if (matches.has(i)) next.set(i, s + matches.get(i)!);
      candidates = next;
    }
    if (!candidates.size) break;
  }
  const q = normalize(query),
    ranked = [...(candidates ?? [])].sort(([a, sa], [b, sb]) => {
      const score = (i: number, s: number) =>
        normalize(products[i].brand_name) === q
          ? s - 10
          : normalize(`${products[i].brand_name} ${products[i].strength}`) === q
            ? s - 5
            : s;
      return (
        score(a, sa) - score(b, sb) ||
        products[a].brand_name.localeCompare(products[b].brand_name) ||
        products[a].id.localeCompare(products[b].id, undefined, {
          numeric: true,
        })
      );
    });
  return {
    total: ranked.length,
    items: ranked.slice(0, Math.min(limit, 100)).map(([i]) => products[i]),
  };
}
