import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { formulationKey, validateCatalogue, type Product } from "../src/domain";
import { responsibleFetch } from "./http";
import { z } from "zod";
const responseSchema = z.object({
  results: z.array(
    z
      .object({
        id: z.string(),
        effective_time: z.string().optional(),
        openfda: z
          .object({
            generic_name: z.array(z.string()).optional(),
            route: z.array(z.string()).optional(),
            dosage_form: z.array(z.string()).optional(),
          })
          .passthrough()
          .optional(),
        dosage_and_administration: z.array(z.string()).optional(),
        instructions_for_use: z.array(z.string()).optional(),
      })
      .passthrough(),
  ),
});
export function extractCandidates(text: string) {
  const sentences = text
    .replace(/<[^>]+>/g, " ")
    .split(/(?<=[.!?])\s+|\n/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length < 350 &&
        /\b(food|meal|empty stomach|swallow whole|crush|chew)\b/i.test(s),
    );
  // Numeric doses/frequency/duration are excluded, even from the unpublished suggestions.
  return sentences
    .filter(
      (s) =>
        !/(\d|once|twice|times daily|per day|every\s+\w+\s+hours|pregnan|pediatric|children)/i.test(
          s,
        ),
    )
    .map((evidence) => ({
      evidence,
      suggested_food_relation:
        /with or without food|without regard to (?:food|meals)/i.test(evidence)
          ? "WITH_OR_WITHOUT_FOOD"
          : /with (?:a |the )?(?:meal|food)/i.test(evidence)
            ? "WITH_FOOD"
            : /before (?:a |the )?(?:meal|food)/i.test(evidence)
              ? "BEFORE_FOOD"
              : "UNKNOWN",
      verification_status: "NEEDS_REVIEW",
    }));
}
export function uniqueFormulations(products: Product[]) {
  return [
    ...new Map(
      products
        .filter(
          (p) =>
            p.mapping_status === "VERIFIED" &&
            p.route !== "UNKNOWN" &&
            p.release_type !== "UNKNOWN",
        )
        .map((p) => [formulationKey(p), p]),
    ).values(),
  ];
}
// US search terminology only; this alias never changes a production ingredient/formulation key.
export const retrievalTerm = (name: string) =>
  name.toLowerCase() === "paracetamol" ? "acetaminophen" : name;
if (process.argv[1]?.endsWith("enrich-generic-guidance.ts")) {
  const products = validateCatalogue(
    JSON.parse(readFileSync("src/data/products.json", "utf8")),
  );
  mkdirSync("tmp/guidance-review", { recursive: true });
  const limit = Number(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 10,
  );
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw Error("Limit must be 1–100");
  for (const p of uniqueFormulations(products).slice(0, limit)) {
    const key = formulationKey(p),
      file = `tmp/guidance-review/${encodeURIComponent(key)}.json`;
    if (existsSync(file)) {
      console.log("Resume: cached", key);
      continue;
    }
    const url = new URL("https://api.fda.gov/drug/label.json");
    url.searchParams.set(
      "search",
      p.active_ingredients
        .map(
          (i) =>
            `openfda.generic_name:"${retrievalTerm(i).replace(/[^a-zA-Z +()-]/g, "")}"`,
        )
        .join(" AND "),
    );
    url.searchParams.set("limit", "3");
    try {
      const r = await responsibleFetch(url.href),
        data = responseSchema.parse(await r.json());
      const records = data.results.map((label) => ({
        label_id: label.id,
        source_url: `https://api.fda.gov/drug/label.json?search=id:${label.id}`,
        label_date: label.effective_time ?? null,
        declared_routes: label.openfda?.route ?? [],
        declared_forms: label.openfda?.dosage_form ?? [],
        candidates: extractCandidates(
          [
            ...(label.dosage_and_administration ?? []),
            ...(label.instructions_for_use ?? []),
          ].join("\n"),
        ),
      }));
      writeFileSync(
        file,
        JSON.stringify(
          {
            generic_key: key,
            generic_name: p.generic_name,
            dosage_form: p.dosage_form,
            route: p.route,
            release_type: p.release_type,
            verification_status: "NEEDS_REVIEW",
            fetched_at: new Date().toISOString(),
            source_url: url.href,
            evidence_note:
              "Retrieval is not formulation verification. A reviewer must check exact ingredients, route, release and source before publishing bilingual claims.",
            records,
          },
          null,
          2,
        ),
      );
      console.log("Retrieved for review", key);
    } catch (e) {
      console.warn("Abstaining", key, String(e));
    }
  }
}
