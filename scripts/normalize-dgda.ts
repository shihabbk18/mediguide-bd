import { z } from "zod";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { productSchema, type Product } from "../src/domain";
const concept = z.object({
  id: z.string(),
  concept_class: z.literal("Drug"),
  retired: z.literal(false),
  extras: z.object({
    trade_name: z.string().min(1),
    company: z.string().min(1),
    dosage_form: z.string().min(1),
    generic_content_raw: z.string().min(1),
    dar_number: z.string().optional(),
  }),
});
export function normalizeDgda(rows: unknown[], date: string) {
  const products: Product[] = [],
    review: { row: unknown; reason: string }[] = [];
  for (const row of rows) {
    try {
      const c = concept.parse(row),
        e = c.extras;
      // Only the simplest single-ingredient identity is parseable without editorial review.
      const match = e.generic_content_raw.match(
        /^([A-Za-z][A-Za-z ()-]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|%)(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(?:ml|vial))?)$/i,
      );
      if (!match)
        throw Error(
          "Ingredient/strength expression requires review; combinations are never split blindly",
        );
      const generic = match[1].trim();
      products.push(
        productSchema.parse({
          id:
            "dgda-" +
            createHash("sha256").update(c.id).digest("hex").slice(0, 16),
          brand_name: e.trade_name,
          generic_name: generic,
          active_ingredients: [generic],
          strength: match[2],
          dosage_form: e.dosage_form,
          manufacturer: e.company,
          registration_number: e.dar_number ?? null,
          route: "UNKNOWN",
          release_type: "UNKNOWN",
          mapping_status: "NEEDS_REVIEW",
          source: "DGHS / MoHFW DGDA terminology",
          source_name: "DGHS / MoHFW DGDA terminology",
          source_url: `https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/sources/DGDA-Drugs/concepts/${encodeURIComponent(c.id)}/`,
          source_section: "Drug concept extras",
          last_verified: date,
          high_risk: true,
        }),
      );
    } catch (e) {
      review.push({ row, reason: String(e) });
    }
  }
  return { products, review };
}
if (process.argv[1]?.endsWith("normalize-dgda.ts")) {
  const [input, output, date] = process.argv.slice(2);
  if (!input || !output || !date)
    throw Error(
      "Usage: normalize-dgda.ts <permitted-page.json> <quarantine.json> <YYYY-MM-DD>",
    );
  const data = normalizeDgda(JSON.parse(readFileSync(input, "utf8")), date);
  writeFileSync(output, JSON.stringify(data, null, 2));
  console.log(
    "Quarantined identities:",
    data.products.length,
    "rejected/review:",
    data.review.length,
  );
}
