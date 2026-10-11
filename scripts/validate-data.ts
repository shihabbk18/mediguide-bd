import { products, guidance, sources, coveredProducts } from "../src/catalogue";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { buildSearchIndex } from "../src/search-engine";
const stored = JSON.parse(readFileSync("data/production/search_index.json", "utf8"));
if (!isDeepStrictEqual(stored, buildSearchIndex(products)))
  throw Error("Stale or corrupt index; run build:data");
console.log(
  JSON.stringify(
    {
      products: products.length,
      guidance_records: guidance.length,
      sources: sources.length,
      products_with_guidance: coveredProducts,
      products_abstaining: products.length - coveredProducts,
    },
    null,
    2,
  ),
);
