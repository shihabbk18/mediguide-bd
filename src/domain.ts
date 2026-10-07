import { z } from "zod";
const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const releaseSchema = z.enum([
  "IMMEDIATE",
  "DELAYED",
  "EXTENDED",
  "MUPS",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);
export const sourceSchema = z
  .object({
    id: text,
    name: text,
    url: z
      .string()
      .url()
      .refine((x) => x.startsWith("https://")),
    kind: z.enum(["MANUFACTURER", "PUBLIC_HEALTH", "REGULATORY"]),
    last_verified: date,
  })
  .strict();
export const productSchema = z
  .object({
    id: text,
    brand_name: text,
    generic_name: text,
    strength: text,
    dosage_form: text,
    release_type: releaseSchema,
    manufacturer: text,
    registration_number: z.string().nullable(),
    source: text,
    source_url: z
      .string()
      .url()
      .refine((x) => x.startsWith("https://")),
    source_section: text,
    last_verified: date,
    high_risk: z.boolean(),
  })
  .strict();
export const claimSchema = z
  .object({
    en: text,
    bn: text,
    source_ids: z.array(text).min(1),
    source_section: text,
  })
  .strict();
export const foodSchema = z.enum([
  "BEFORE_FOOD",
  "WITH_FOOD",
  "AFTER_FOOD",
  "WITH_OR_WITHOUT_FOOD",
  "EMPTY_STOMACH",
  "NO_SPECIFIC_REQUIREMENT",
  "VARIABLE",
  "UNKNOWN",
]);
export const guidanceSchema = z
  .object({
    id: text,
    generic_name: text,
    dosage_form: text,
    release_type: releaseSchema,
    food_relation: foodSchema,
    food_guidance: claimSchema.nullable(),
    timing_guidance: claimSchema.nullable(),
    common_uses: z.array(claimSchema),
    administration_notes: z.array(claimSchema),
    food_drink_notes: z.array(claimSchema),
    warnings: z.array(claimSchema),
    verification_status: z.enum([
      "VERIFIED",
      "PARTIALLY_VERIFIED",
      "NOT_AVAILABLE",
    ]),
    last_verified: date,
    mapping_note: text,
  })
  .strict()
  .superRefine((g, ctx) => {
    if (g.food_relation !== "UNKNOWN" && !g.food_guidance)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Food classification requires cited evidence",
      });
    if (
      g.verification_status === "VERIFIED" &&
      (!g.food_guidance || g.food_relation === "UNKNOWN")
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Verified guidance requires food evidence",
      });
  });
export type Product = z.infer<typeof productSchema>;
export type Guidance = z.infer<typeof guidanceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Language = "en" | "bn";
export const normalize = (x: string) =>
  x
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export const formulationKey = (
  x: Pick<Product, "generic_name" | "dosage_form" | "release_type">,
) =>
  [normalize(x.generic_name), normalize(x.dosage_form), x.release_type].join(
    "|",
  );
export function validateCatalogue(input: unknown): Product[] {
  const parsed = z.array(productSchema).min(1).parse(input);
  const ids = new Set<string>();
  const identities = new Set<string>();
  for (const p of parsed) {
    const identity = [
      normalize(p.brand_name),
      normalize(p.strength),
      normalize(p.manufacturer),
      formulationKey(p),
    ].join("|");
    if (ids.has(p.id) || identities.has(identity))
      throw new Error(`Duplicate product: ${p.id}`);
    ids.add(p.id);
    identities.add(identity);
  }
  return parsed;
}
export const claimsOf = (g: Guidance) =>
  [
    g.food_guidance,
    g.timing_guidance,
    ...g.common_uses,
    ...g.administration_notes,
    ...g.food_drink_notes,
    ...g.warnings,
  ].filter((c): c is Claim => !!c);
export function validateEvidence(guidance: Guidance[], sources: Source[]) {
  const keys = new Set<string>();
  for (const g of guidance) {
    const key = formulationKey(g);
    if (keys.has(key)) throw new Error(`Duplicate formulation: ${key}`);
    keys.add(key);
    for (const c of claimsOf(g))
      for (const id of c.source_ids)
        if (!sources.some((s) => s.id === id))
          throw new Error(`Missing source: ${id}`);
  }
}
