import { readFileSync, writeFileSync } from "node:fs";
const pages = JSON.parse(readFileSync("tmp/pdfs/square-pages.json", "utf8"));
const clean = (s) =>
  s
    .replace(/[\uFFFD®™]/g, "")
    .replace(/TM(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
const titles = new Set(
  pages.slice(6, 22).flatMap((p) =>
    p
      .split("\n")
      .map((l) => l.match(/^(.+?)\s*(\d{1,3})$/)?.[1]?.trim())
      .filter(Boolean),
  ),
);
const full = pages
  .slice(22)
  .map((p, i) => `\n#PAGE ${i + 23}\n${p}`)
  .join("\n")
  .replace(/Product Guide\s*\d+/g, "")
  .replace(/\n[A-Z]\s*\n/g, "\n");
const matches = [...full.matchAll(/Active Ingredients?\s*\n/gi)];
const result = [],
  reject = [];
const forms =
  "Tablet|Capsule|Eye Drops|Cream|Gel|Ointment|Syrup|Oral Suspension|Suspension|Suppository|Injection|Inhaler";
for (let n = 0; n < matches.length; n++) {
  const m = matches[n],
    before = full.slice(Math.max(0, m.index - 170), m.index),
    tail = clean(before);
  const brand = [...titles]
    .filter((t) => tail.endsWith(clean(t)))
    .sort((a, b) => b.length - a.length)[0];
  if (!brand) continue;
  const section = full.slice(
    m.index + m[0].length,
    matches[n + 1]?.index ?? full.length,
  );
  const ingredientRaw = clean(section.split(/\nIndication/i)[0]);
  let generic = ingredientRaw
    .replace(/\b(?:BP|USP|INN|EP|Ph\. Eur\.)\b/g, "")
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|%)(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(?:ml|g|vial|puff))?/gi,
      "",
    )
    .replace(/[.;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const ingredients = generic.split(/\s*[&+]\s*/).map((s) => s.trim());
  if (
    ingredients.length !== 1 ||
    ingredients.some(
      (i) =>
        !i ||
        i.length > 75 ||
        /tablet|capsule|equivalent|cream|syrup|each|contains|solution/i.test(
          i,
        ) ||
        !/^[a-zA-Z][a-zA-Z () ,.-]+$/.test(i),
    )
  ) {
    reject.push({ brand, reason: "ingredient ambiguity", ingredientRaw });
    continue;
  }
  generic = ingredients.join(" + ");
  const prep =
    section.match(/Preparation\s*\n([\s\S]*?)(?:\n[A-Z][^\n]*$|$)/i)?.[1] ?? "";
  const sourcePage = Number(
    [...full.slice(0, m.index).matchAll(/#PAGE (\d+)/g)].at(-1)?.[1] ?? 0,
  );
  const re = new RegExp(
    `((?:\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|gm|g)?\\s*[,/&]\\s*)*\\d+(?:\\.\\d+)?)\\s*(mg|mcg|gm|g|%)(?:\\s*\\/\\s*(\\d+(?:\\.\\d+)?\\s*(?:ml|g)))?\\s+(${forms})\\b`,
    "gi",
  );
  const facts = [...prep.matchAll(re)];
  // A percent in the composition and an explicitly named topical/ocular preparation.
  if (!facts.length) {
    const f = prep.match(/\b(Eye Drops|Cream|Gel|Ointment)\b/i),
      strength = ingredientRaw.match(/\b\d+(?:\.\d+)?\s*%/);
    if (f && strength && ingredients.length === 1)
      facts.push([
        strength[0] + " " + f[1],
        strength[0].replace(/%/g, ""),
        "%",
        undefined,
        f[1],
      ]);
  }
  for (const f of facts) {
    const form = f[4].replace(/\b\w/g, (c) => c.toUpperCase()),
      unit = f[2].toLowerCase() === "gm" ? "g" : f[2].toLowerCase();
    const route = /Eye Drops/i.test(form)
      ? "OPHTHALMIC"
      : /Cream|Gel|Ointment/.test(form)
        ? "TOPICAL"
        : form === "Injection"
          ? "INJECTION"
          : form === "Inhaler"
            ? "INHALATION"
            : form === "Suppository"
              ? "RECTAL"
              : "ORAL";
    if (["TOPICAL", "OPHTHALMIC"].includes(route) && unit !== "%") continue;
    for (const amount of f[1].matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|gm|g)?/gi)) {
      const value = amount[1],
        amountUnit = amount[2]?.toLowerCase().replace("gm", "g") ?? unit;
      const strength =
        value +
        (amountUnit === "%" ? "%" : " " + amountUnit) +
        (f[3] ? "/" + f[3].replace(/\s+/g, " ") : "");
      if (
        typeof f.index === "number" &&
        /\b(?:XR|SR|MR|DR|CR)\s*$/i.test(prep.slice(0, f.index))
      ) {
        reject.push({
          brand,
          reason: "Modified release needs explicit brand mapping",
          strength,
        });
        continue;
      }
      // Keep release unknown unless explicitly reviewable; the pipeline never assumes all tablets are interchangeable.
      let release = route === "ORAL" ? "UNKNOWN" : "NOT_APPLICABLE";
      result.push({
        brand_name: clean(brand),
        generic_name: generic,
        active_ingredients: ingredients,
        strength,
        dosage_form: form,
        route,
        release_type: release,
        ingredientRaw,
        preparation: clean(prep).slice(0, 550),
        page: sourcePage,
      });
    }
  }
  if (!facts.length)
    reject.push({
      brand,
      reason: "No unambiguous strength/form",
      ingredientRaw,
      preparation: clean(prep).slice(0, 200),
    });
}
writeFileSync(
  "tmp/pdfs/square-candidates.json",
  JSON.stringify(result, null, 2),
);
writeFileSync("tmp/pdfs/square-rejected.json", JSON.stringify(reject, null, 2));
console.log("Candidates", result.length, "rejected", reject.length);
console.log(
  result
    .map(
      (p, i) =>
        `${i}: ${p.brand_name} | ${p.generic_name} | ${p.strength} | ${p.dosage_form} | p${p.page}`,
    )
    .join("\n"),
);
