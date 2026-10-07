import { products, guidance, sources, coveredProducts } from "../src/catalogue";
import { readFileSync } from "node:fs";
import { buildSearchIndex } from "../src/search-engine";
const stored = JSON.parse(readFileSync("src/data/search-index.json", "utf8"));
if (JSON.stringify(stored) !== JSON.stringify(buildSearchIndex(products)))
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
