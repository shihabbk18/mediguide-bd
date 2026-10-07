import { readFileSync, writeFileSync } from "node:fs";
import {
  validateCatalogue,
  guidanceSchema,
  sourceSchema,
  validateEvidence,
  formulationKey,
  type Guidance,
} from "../src/domain";
import { buildSearchIndex } from "../src/search-engine";
const read = (n: string) =>
  JSON.parse(readFileSync(`src/data/${n}.json`, "utf8"));
const products = validateCatalogue(read("products")),
  guidance = read("guidance").map((g: unknown) => guidanceSchema.parse(g)),
  sources = read("sources").map((s: unknown) => sourceSchema.parse(s));
validateEvidence(guidance, sources);
const index = buildSearchIndex(products);
writeFileSync("src/data/search-index.json", JSON.stringify(index) + "\n");
const eligible = new Map<string, Guidance>(
  guidance
    .filter((g: Guidance) =>
      ["VERIFIED", "PARTIALLY_VERIFIED"].includes(g.verification_status),
    )
    .map((g: Guidance) => [formulationKey(g), g]),
);
const statuses = products.map((p) =>
  p.mapping_status === "VERIFIED" &&
  p.route !== "UNKNOWN" &&
  p.release_type !== "UNKNOWN"
    ? (eligible.get(formulationKey(p))?.verification_status ?? "NOT_AVAILABLE")
    : "NOT_AVAILABLE",
);
const stats = {
  built_at: new Date().toISOString(),
  products: products.length,
  unique_brands: new Set(products.map((p) => p.brand_name.toLowerCase())).size,
  unique_formulations: new Set(products.map(formulationKey)).size,
  guidance_records: guidance.length,
  verified_products: statuses.filter((s) => s === "VERIFIED").length,
  partial_products: statuses.filter((s) => s === "PARTIALLY_VERIFIED").length,
  unavailable_products: statuses.filter((s) => s === "NOT_AVAILABLE").length,
  verified_guidance: guidance.filter(
    (g: any) => g.verification_status === "VERIFIED",
  ).length,
  partial_guidance: guidance.filter(
    (g: any) => g.verification_status === "PARTIALLY_VERIFIED",
  ).length,
  needs_review_guidance: guidance.filter(
    (g: any) => g.verification_status === "NEEDS_REVIEW",
  ).length,
  sources: sources.length,
};
writeFileSync("src/data/coverage.json", JSON.stringify(stats, null, 2) + "\n");
console.log(JSON.stringify(stats, null, 2));
