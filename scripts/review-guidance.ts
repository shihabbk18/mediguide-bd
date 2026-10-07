import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { z } from "zod";
import {
  guidanceSchema,
  sourceSchema,
  validateEvidence,
  formulationKey,
} from "../src/domain";
export const reviewSchema = z
  .object({
    reviewed_by: z.string().min(3),
    reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    formulation_checked: z.literal(true),
    bilingual_claims_checked: z.literal(true),
    permission_checked: z.literal(true),
    guidance: guidanceSchema,
    sources: z.array(sourceSchema).min(1),
  })
  .strict();
export function validateReview(input: unknown) {
  const r = reviewSchema.parse(input);
  if (
    !["VERIFIED", "PARTIALLY_VERIFIED"].includes(r.guidance.verification_status)
  )
    throw Error("An unresolved candidate cannot be published");
  validateEvidence([r.guidance], r.sources);
  return r;
}
if (process.argv[1]?.endsWith("review-guidance.ts")) {
  const path = process.argv[2];
  if (!path)
    throw Error(
      "Provide reviewed bilingual guidance and a signed review manifest. Raw retrieval candidates are not publishable.",
    );
  const r = validateReview(JSON.parse(readFileSync(path, "utf8")));
  console.log("Validated review for", r.guidance.generic_key);
  if (process.argv.includes("--write")) {
    const guides = JSON.parse(
      readFileSync("src/data/guidance.json", "utf8"),
    ).filter((g: any) => formulationKey(g) !== r.guidance.generic_key);
    guides.push(r.guidance);
    const sources = JSON.parse(readFileSync("src/data/sources.json", "utf8"));
    for (const s of r.sources) {
      const i = sources.findIndex((x: any) => x.id === s.id);
      if (i >= 0 && JSON.stringify(sources[i]) !== JSON.stringify(s))
        throw Error("Source ID conflict; use a new provenance ID");
      if (i < 0) sources.push(s);
    }
    for (const [name, data] of [
      ["guidance", guides],
      ["sources", sources],
    ] as const) {
      const target = `src/data/${name}.json`;
      writeFileSync(target + ".tmp", JSON.stringify(data, null, 2) + "\n");
      renameSync(target + ".tmp", target);
    }
  }
}
