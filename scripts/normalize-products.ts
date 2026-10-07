import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import {
  productSchema,
  validateCatalogue,
  formulationKey,
  type Product,
} from "../src/domain";
// Exported data is quarantined until composition/formulation mapping is reviewed.
export function normalizeProducts(input: unknown): {
  products: Product[];
  duplicates: string[];
} {
  const rows = z.array(productSchema).parse(input),
    seen = new Set<string>(),
    duplicates: string[] = [],
    products: Product[] = [];
  for (const p of rows) {
    const key = [
      p.brand_name.toLowerCase().trim(),
      p.strength.toLowerCase().trim(),
      p.manufacturer.toLowerCase().trim(),
      formulationKey(p),
    ].join("|");
    if (seen.has(key)) {
      duplicates.push(p.id);
      continue;
    }
    seen.add(key);
    products.push(p);
  }
  return { products: validateCatalogue(products), duplicates };
}
if (process.argv[1]?.endsWith("normalize-products.ts")) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw Error(
      "Usage: normalize-products input.json output.json (reviewed normalized schema only)",
    );
  const result = normalizeProducts(JSON.parse(readFileSync(input, "utf8")));
  writeFileSync(output, JSON.stringify(result.products, null, 2) + "\n");
  console.log({
    accepted: result.products.length,
    duplicates: result.duplicates,
  });
}
