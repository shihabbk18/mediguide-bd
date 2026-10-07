// Import concise, reviewed identity facts; PDF parser output is always quarantined.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const facts = JSON.parse(
  readFileSync("data/reviewed-square-identities.json", "utf8"),
);
const products = JSON.parse(readFileSync("src/data/products.json", "utf8"));
const identity = (p) =>
  [p.brand_name, p.strength.replace(/\s/g, ""), p.dosage_form, p.manufacturer]
    .join("|")
    .toLowerCase();
const seen = new Map(products.map((p) => [identity(p), p]));
// Two reviewed spelling/salt resolutions from the existing manufacturer leaflets.
// These are brand-specific editorial mappings, never a global generic-name alias.
const reviewedNames = {
  Comet: {
    raw: "Metformin HCI",
    name: "Metformin hydrochloride",
    url: "https://squarepharma.com.bd/downloads/1587478883_pdoc_Comet%20DS2.pdf",
  },
  Alatrol: {
    raw: "Cetirizine",
    name: "Cetirizine hydrochloride",
    url: "https://squarepharma.com.bd/downloads/Alatrol.pdf",
  },
};
let added = 0;
for (const f of facts) {
  const p = {
    ...f,
    manufacturer: "Square Pharmaceuticals Ltd.",
    registration_number: null,
    source: "Square product guide, 9th edition",
    source_name: "Square product guide, 9th edition",
    source_url: `https://squarepharma.com.bd/product_guide/Product%20Guide%209th_SPL.pdf#page=${f.page}`,
    source_section: `Active ingredient and Preparation; PDF page ${f.page}`,
    last_verified: "2026-10-08",
    high_risk: true,
  };
  delete p.page;
  const resolution = reviewedNames[p.brand_name];
  if (resolution && p.generic_name === resolution.raw) {
    p.generic_name = resolution.name;
    p.active_ingredients = [resolution.name];
    p.source_section += `; generic name resolved against manufacturer leaflet ${resolution.url}`;
  }
  p.id =
    "bd-square-" +
    createHash("sha256").update(identity(p)).digest("hex").slice(0, 12);
  const prior = seen.get(identity(p));
  if (prior) {
    const ingredients = (x) =>
      x.active_ingredients
        .map((i) => i.trim().toLowerCase())
        .sort()
        .join("|");
    if (
      ingredients(prior) !== ingredients(p) ||
      prior.route !== p.route ||
      (prior.release_type !== "UNKNOWN" &&
        p.release_type !== "UNKNOWN" &&
        prior.release_type !== p.release_type)
    )
      throw Error(
        `Conflicting ingredient/route/release mapping for ${p.brand_name} ${p.strength}; review instead of merging`,
      );
    continue;
  }
  seen.set(identity(p), p);
  products.push(p);
  added++;
}
writeFileSync(
  "src/data/products.json",
  JSON.stringify(products, null, 2) + "\n",
);
console.log(
  `Added ${added} reviewed products; total ${products.length}. Unknown mappings remain unavailable.`,
);
