import rawProducts from "./data/products.json";
import rawGuidance from "./data/guidance.json";
import rawSources from "./data/sources.json";
import rawIndex from "./data/search-index.json";
import {
  validateCatalogue,
  guidanceSchema,
  sourceSchema,
  validateEvidence,
  formulationKey,
  type Product,
  type Guidance,
} from "./domain";
import { queryIndex, type SearchIndex } from "./search-engine";
export const products = validateCatalogue(rawProducts);
export const guidance = rawGuidance.map((g) => guidanceSchema.parse(g));
export const sources = rawSources.map((s) => sourceSchema.parse(s));
validateEvidence(guidance, sources);
const index = rawIndex as SearchIndex;
if (index.version !== 1 || index.count !== products.length)
  throw Error("Stale search index: run build:data");
export const productById = new Map(products.map((p) => [p.id, p]));
export const searchPage = (query: string, limit = 60) =>
  queryIndex(index, products, query, limit);
export const searchProducts = (query: string) => searchPage(query).items;
const guidanceIndex = new Map(guidance.map((g) => [formulationKey(g), g]));
export function resolveGuidance(
  product: Product,
  confirmed: boolean,
): Guidance | null {
  if (
    !confirmed ||
    product.mapping_status !== "VERIFIED" ||
    product.release_type === "UNKNOWN" ||
    product.route === "UNKNOWN"
  )
    return null;
  const record = guidanceIndex.get(formulationKey(product));
  return record &&
    ["VERIFIED", "PARTIALLY_VERIFIED"].includes(record.verification_status)
    ? record
    : null;
}
export const coveredProducts = products.filter((p) =>
  resolveGuidance(p, true),
).length;
export const coverage = {
  products: products.length,
  unique_brands: new Set(products.map((p) => p.brand_name.toLowerCase())).size,
  unique_formulations: new Set(products.map(formulationKey)).size,
  verified_products: products.filter(
    (p) => resolveGuidance(p, true)?.verification_status === "VERIFIED",
  ).length,
  partial_products: products.filter(
    (p) =>
      resolveGuidance(p, true)?.verification_status === "PARTIALLY_VERIFIED",
  ).length,
  unavailable_products: products.length - coveredProducts,
};
