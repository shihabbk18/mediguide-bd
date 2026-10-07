import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  products,
  guidance,
  sources,
  resolveGuidance,
  searchProducts,
  searchPage,
  coverage,
} from "../catalogue";
import { buildSearchIndex, queryIndex } from "../search-engine";
import {
  claimSchema,
  formulationKey,
  guidanceSchema,
  type Product,
} from "../domain";
import { foodLabels, timingLabels } from "../i18n";
import {
  extractCandidates,
  uniqueFormulations,
} from "../../scripts/enrich-generic-guidance";
import { permissionSchema } from "../../scripts/import-dgda-products";
import { normalizeDgda } from "../../scripts/normalize-dgda";
import { validateReview } from "../../scripts/review-guidance";
const product = (brand: string, form?: string) =>
  products.find(
    (p) => p.brand_name === brand && (!form || p.dosage_form === form),
  )!;
describe("Upgrade acceptance A–O", () => {
  it.each([
    "Angilock",
    "Loratin",
    "Moxacil",
    "Sonap",
    "Bactrocin",
    "Sultolin 100 HFA",
  ])("A: real brand %s resolves", (brand) =>
    expect(searchProducts(brand).some((p) => p.brand_name === brand)).toBe(
      true,
    ),
  );
  it("B: generic resolves several local products", () =>
    expect(
      searchProducts("Losartan").filter((p) => p.brand_name === "Angilock"),
    ).toHaveLength(3));
  it.each(["Square", "Beximco"])("C: manufacturer %s", (company) => {
    const p = searchProducts(company);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.manufacturer.includes(company))).toBe(true);
  });
  it("D: typo search", () =>
    expect(searchProducts("Angilok")[0].brand_name).toBe("Angilock"));
  it("E: strengths remain separate and numeric typos never expand", () => {
    expect(
      searchProducts("Angilock")
        .map((p) => p.strength)
        .sort(),
    ).toEqual(["100 mg", "25 mg", "50 mg"]);
    expect(searchProducts("Angilock 51")).toEqual([]);
  });
  it("F: combinations never inherit first ingredient guidance", () => {
    const p = product("Napa Extra");
    expect(p.active_ingredients).toHaveLength(2);
    expect(resolveGuidance(p, true)).toBeNull();
  });
  it.each([
    ["Seclo", "Capsule", "BEFORE_FOOD"],
    ["Sonap", "Tablet", "WITH_FOOD"],
    ["Loratin", "Tablet", "WITH_OR_WITHOUT_FOOD"],
    ["Fusid", "Injection", "NOT_APPLICABLE"],
    ["Alarid Eye Drops", "Eye Drops", "NOT_APPLICABLE"],
    ["Bactrocin", "Ointment", "NOT_APPLICABLE"],
    ["Sultolin 100 HFA", "Inhaler", "NOT_APPLICABLE"],
  ])("G–L: %s %s => %s", (brand, form, state) => {
    const p = product(brand, form);
    expect(p).toBeDefined();
    expect(resolveGuidance(p, false)).toBeNull();
    const g = resolveGuidance(p, true)!;
    expect(g.food_relation).toBe(state);
    expect(
      g.food_guidance?.source_ids.every((id) =>
        sources.some((s) => s.id === id),
      ),
    ).toBe(true);
  });
  it("M: unknown mapping abstains even when generic matches a verified record", () => {
    const p = product("Loratin");
    expect(resolveGuidance({ ...p, release_type: "UNKNOWN" }, true)).toBeNull();
    expect(
      resolveGuidance({ ...p, mapping_status: "NEEDS_REVIEW" }, true),
    ).toBeNull();
  });
  it("N: IR, ER, routes and forms are distinct", () => {
    expect(formulationKey(product("Comet"))).not.toBe(
      formulationKey(product("Comet XR")),
    );
    expect(resolveGuidance(product("Comet XR"), true)?.timing_type).toBe(
      "EVENING",
    );
    expect(resolveGuidance(product("Fusid", "Tablet"), true)).toBeNull();
  });
  it("O: all structured states have deterministic English/Bangla templates", () => {
    for (const value of Object.values(foodLabels.bn))
      expect(value).toMatch(/[\u0980-\u09ff]/);
    for (const key of Object.keys(timingLabels.en))
      expect(timingLabels.bn[key as keyof typeof timingLabels.bn]).toMatch(
        /[\u0980-\u09ff]/,
      );
  });
});
describe("Pipeline and scale safeguards", () => {
  it("reviewed manufacturer import rejects conflicting ingredients, routes and releases", () => {
    const script = resolve("scripts/import-reviewed-square.mjs");
    for (const mismatch of [
      {
        generic_name: "Conflicting fixture",
        active_ingredients: ["Conflicting fixture"],
      },
      { route: "TOPICAL" },
      { release_type: "EXTENDED" },
    ]) {
      const folder = resolve("tmp", `import-test-${randomUUID()}`);
      mkdirSync(resolve(folder, "data"), { recursive: true });
      mkdirSync(resolve(folder, "src/data"), { recursive: true });
      const prior = {
        ...products[0],
        brand_name: "Fixture only",
        manufacturer: "Square Pharmaceuticals Ltd.",
      };
      writeFileSync(
        resolve(folder, "src/data/products.json"),
        JSON.stringify([prior]),
      );
      writeFileSync(
        resolve(folder, "data/reviewed-square-identities.json"),
        JSON.stringify([{ ...prior, ...mismatch, page: 1 }]),
      );
      expect(() =>
        execFileSync(process.execPath, [script], {
          cwd: folder,
          stdio: "pipe",
        }),
      ).toThrow(/Conflicting ingredient\/route\/release mapping/);
    }
  });
  it("does not accept absent permission or a public URL as permission", () => {
    expect(() => permissionSchema.parse({})).toThrow();
    expect(() =>
      permissionSchema.parse({ source_url: "https://api.tr.ocl.dghs.gov.bd/" }),
    ).toThrow();
  });
  it("normalization quarantines combinations and unknown routes", () => {
    const rows = [
      {
        id: "test",
        concept_class: "Drug",
        retired: false,
        extras: {
          trade_name: "Fixture only",
          company: "Fixture only",
          dosage_form: "Tablet",
          generic_content_raw: "Paracetamol 500 mg",
        },
      },
    ];
    const result = normalizeDgda(rows, "2026-10-08");
    expect(result.products[0].mapping_status).toBe("NEEDS_REVIEW");
    expect(result.products[0].route).toBe("UNKNOWN");
    expect(
      normalizeDgda(
        [
          {
            ...rows[0],
            extras: {
              ...rows[0].extras,
              generic_content_raw: "Paracetamol + Caffeine",
            },
          },
        ],
        "2026-10-08",
      ).review,
    ).toHaveLength(1);
  });
  it("automatic extraction cannot publish uncertain medical facts or dosing", () => {
    const c = extractCandidates(
      "Take with food. Take 500 mg twice daily. Swallow whole.",
    );
    expect(c).toHaveLength(2);
    expect(c.every((x) => x.verification_status === "NEEDS_REVIEW")).toBe(true);
    expect(() => validateReview({ guidance: guidance[0], sources })).toThrow();
  });
  it("schema rejects unsafe dose and unsupported specific timing", () => {
    for (const en of [
      "Take 500 mg three times daily.",
      "Increase your dose.",
      "Stop taking your medicine.",
    ])
      expect(() =>
        claimSchema.parse({ ...guidance[0].food_guidance, en }),
      ).toThrow();
    expect(() =>
      guidanceSchema.parse({
        ...guidance[0],
        timing_type: "MORNING",
        timing_guidance: null,
      }),
    ).toThrow();
  });
  it("ingredient/formulation deduplication does not merge IR with ER", () => {
    const keys = uniqueFormulations(products).map(formulationKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(formulationKey(product("Comet XR")));
    expect(keys).toContain(formulationKey(product("Comet")));
  });
  it("coverage reconciles every production product", () =>
    expect(
      coverage.verified_products +
        coverage.partial_products +
        coverage.unavailable_products,
    ).toBe(products.length));
  it("search caps renderable results and retains total", () => {
    const r = searchPage("Square");
    expect(r.items.length).toBeLessThanOrEqual(60);
    expect(r.total).toBeGreaterThan(r.items.length);
  });
  it("prebuilt retrieval scales to 40,000 synthetic records without returning thousands to UI", () => {
    const synthetic: Product[] = Array.from({ length: 40000 }, (_, i) => ({
      ...products[0],
      id: `fixture-${i}`,
      brand_name: `Fixture${i}`,
      manufacturer: "Synthetic benchmark only",
    }));
    const index = buildSearchIndex(synthetic),
      r = queryIndex(index, synthetic, "Synthetic");
    expect(r.total).toBe(40000);
    expect(r.items).toHaveLength(60);
    expect(queryIndex(index, synthetic, "Fixture1234").items[0].id).toBe(
      "fixture-1234",
    );
  });
});
