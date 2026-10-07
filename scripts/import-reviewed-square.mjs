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
const seen = new Set(products.map(identity));
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
  p.id =
    "bd-square-" +
    createHash("sha256").update(identity(p)).digest("hex").slice(0, 12);
  if (seen.has(identity(p))) continue;
  seen.add(identity(p));
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
