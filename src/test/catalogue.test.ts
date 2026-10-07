import { describe, it, expect } from "vitest";
import {
  products,
  guidance,
  sources,
  searchProducts,
  resolveGuidance,
} from "../catalogue";
import {
  claimsOf,
  validateCatalogue,
  validateEvidence,
  guidanceSchema,
  formulationKey,
} from "../domain";
import { parseImport } from "../../scripts/import-products";
describe("Bangladesh medicine retrieval", () => {
  it("exact brand + strength resolves identity", () => {
    const result = searchProducts("Napa 500")[0];
    expect(result).toMatchObject({
      brand_name: "Napa",
      generic_name: "Paracetamol",
      strength: "500 mg",
      dosage_form: "Tablet",
      manufacturer: "Beximco Pharmaceuticals Ltd.",
    });
  });
  it("generic returns relevant local brands", () => {
    expect(
      searchProducts("Paracetamol").some((p) => p.brand_name === "Napa"),
    ).toBe(true);
    expect(
      searchProducts("Esomeprazole 20 mg").map((p) => p.brand_name),
    ).toEqual(["Nexum", "Nexum"]);
  });
  it("manufacturer search returns only matching products", () => {
    const matches = searchProducts("Beximco");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((p) => p.manufacturer.includes("Beximco"))).toBe(true);
    expect(
      searchProducts("Square").every((p) => p.manufacturer.includes("Square")),
    ).toBe(true);
  });
  it("minor typo returns candidates", () => {
    expect(searchProducts("Npaa").some((p) => p.brand_name === "Napa")).toBe(
      true,
    );
    expect(
      searchProducts("Paracetmol").some(
        (p) => p.generic_name === "Paracetamol",
      ),
    ).toBe(true);
  });
  it("is case insensitive and supports partial and mixed-field search", () => {
    expect(searchProducts("nAPA 500")[0].id).toBe(products[0].id);
    expect(searchProducts("Secl").some((p) => p.brand_name === "Seclo")).toBe(
      true,
    );
    expect(
      searchProducts("cefixime 200 tablet").every(
        (p) =>
          p.generic_name === "Cefixime" &&
          p.strength === "200 mg" &&
          p.dosage_form === "Tablet",
      ),
    ).toBe(true);
    expect(searchProducts("Napa 500mg")[0].id).toBe(products[0].id);
  });
  it("unknown medicine returns no results gracefully", () => {
    expect(searchProducts("zzzxqvnonexistent")).toEqual([]);
    expect(searchProducts("")).toEqual([]);
  });
  it("never guesses a mistyped numeric strength", () => {
    expect(searchProducts("Napa 501")).toEqual([]);
    expect(searchProducts("Cefixime 201")).toEqual([]);
  });
});
describe("Safety and provenance", () => {
  it("ambiguous search cannot yield guidance before confirmation", () => {
    const matches = searchProducts("Napa");
    expect(matches.length).toBeGreaterThan(1);
    for (const p of matches) expect(resolveGuidance(p, false)).toBeNull();
  });
  it("verified medicine has food guidance and resolvable sources", () => {
    const g = resolveGuidance(products[0], true)!;
    expect(g.verification_status).toBe("VERIFIED");
    expect(g.food_relation).toBe("WITH_OR_WITHOUT_FOOD");
    expect(g.food_guidance?.source_ids).toContain("nhs-para");
    expect(sources.find((s) => s.id === "nhs-para")?.url).toMatch(
      /^https:\/\/www.nhs.uk/,
    );
  });
  it("combination without evidence abstains", () => {
    expect(
      resolveGuidance(
        products.find((p) => p.brand_name === "Napa Extra")!,
        true,
      ),
    ).toBeNull();
  });
  it("different forms and release types are not merged", () => {
    const tablet = products[0],
      syrup = products.find(
        (p) => p.brand_name === "Napa" && p.dosage_form === "Syrup",
      )!;
    expect(formulationKey(tablet)).not.toBe(formulationKey(syrup));
    expect(resolveGuidance(syrup, true)).toBeNull();
    const ir = products.find((p) => p.brand_name === "Comet")!,
      er = products.find((p) => p.brand_name === "Comet XR")!;
    expect(resolveGuidance(ir, true)?.timing_guidance).toBeNull();
    expect(resolveGuidance(er, true)?.timing_guidance?.en).toContain("evening");
    const capsule = products.find(
      (p) => p.generic_name === "Cefixime" && p.dosage_form === "Capsule",
    )!;
    expect(resolveGuidance(capsule, true)).toBeNull();
  });
  it("no source-free medical claims or missing translations", () => {
    expect(() => validateEvidence(guidance, sources)).not.toThrow();
    for (const g of guidance)
      for (const c of claimsOf(g)) {
        expect(c.en.length).toBeGreaterThan(0);
        expect(c.bn).toMatch(/[\u0980-\u09ff]/);
        expect(c.source_ids.length).toBeGreaterThan(0);
        expect(c.source_section.length).toBeGreaterThan(0);
      }
  });
  it("never outputs patient-specific quantity, frequency, duration or treatment changes", () => {
    for (const g of guidance)
      for (const c of claimsOf(g)) {
        expect(c.en).not.toMatch(
          /\b(?:take|give|use)\s+\d|\b\d+\s*(?:mg|ml|tablets?|capsules?|days?|weeks?)\b|\b(?:once|twice|three times)\s+(?:a |per )?day|\b(?:start|stop|replace|increase|decrease|switch)\s+(?:taking|your|the|this)\b/i,
        );
        expect(c.bn).not.toMatch(
          /[০-৯\d]+\s*(?:মি\.গ্রা|মিলি|ট্যাবলেট|দিন|বার)/,
        );
      }
  });
  it("unknown time of day stays null instead of invented morning or bedtime", () => {
    for (const id of [
      "paracetamol-tablet",
      "omeprazole-capsule",
      "cefixime-tablet",
    ])
      expect(guidance.find((g) => g.id === id)?.timing_guidance).toBeNull();
  });
  it("rejects verified food classification with no evidence", () => {
    expect(() =>
      guidanceSchema.parse({ ...guidance[0], food_guidance: null }),
    ).toThrow();
  });
});
describe("Authorised import validation", () => {
  it("imports a valid JSON catalogue and preserves identities", () => {
    expect(parseImport(JSON.stringify(products), "json")).toEqual(products);
  });
  it("imports quoted CSV and converts booleans / registration null", () => {
    const p = products[0];
    const fields = Object.keys(p);
    const csv =
      fields.join(",") +
      "\n" +
      fields
        .map(
          (k) =>
            '"' +
            String(p[k as keyof typeof p] ?? "").replaceAll('"', '""') +
            '"',
        )
        .join(",");
    expect(parseImport(csv, "csv")[0]).toEqual(p);
  });
  it("rejects missing provenance, malformed rows and duplicate identities", () => {
    expect(() =>
      validateCatalogue([{ ...products[0], source_url: "not-a-url" }]),
    ).toThrow();
    expect(() =>
      validateCatalogue([products[0], { ...products[0], id: "different" }]),
    ).toThrow();
    expect(() => parseImport("brand_name\nFake", "csv")).toThrow();
  });
});
