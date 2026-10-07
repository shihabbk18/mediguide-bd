import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { validateCatalogue } from "../src/domain";
export function parseImport(raw: string, format: "csv" | "json") {
  const records =
    format === "json"
      ? JSON.parse(raw)
      : parse(raw, { columns: true, skip_empty_lines: true, bom: true }).map(
          (row: Record<string, string>) => ({
            ...row,
            active_ingredients: row.active_ingredients?.startsWith("[")
              ? JSON.parse(row.active_ingredients)
              : row.active_ingredients?.split("+").map((x) => x.trim()),
            high_risk:
              row.high_risk === "true"
                ? true
                : row.high_risk === "false"
                  ? false
                  : row.high_risk,
            registration_number: row.registration_number || null,
          }),
        );
  return validateCatalogue(records);
}
if (process.argv[1]?.endsWith("import-products.ts")) {
  const path = process.argv[2];
  if (!path)
    throw new Error(
      "Usage: pnpm import:products <authorised.csv|json> [--write]",
    );
  const format = path.toLowerCase().endsWith(".csv") ? "csv" : "json";
  const rows = parseImport(readFileSync(path, "utf8"), format);
  console.log(
    `Validated ${rows.length} product records. Ensure reuse permission and source review before --write.`,
  );
  if (process.argv.includes("--write")) {
    const target = resolve("src/data/products.json");
    const temp = target + ".tmp";
    writeFileSync(temp, JSON.stringify(rows, null, 2) + "\n");
    renameSync(temp, target);
    console.log(
      "Catalogue replaced atomically. Guidance still requires an exact formulation match.",
    );
  }
}
