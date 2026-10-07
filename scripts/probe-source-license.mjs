import { writeFile } from "node:fs/promises";
for (const [name, url] of Object.entries({
  source: "https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/sources/DGDA-Drugs/",
  terms: "https://openconceptlab.org/terms-of-use",
})) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await r.text();
  await writeFile(`data-source-audit/${name}.txt`, body);
  console.log(
    name,
    r.status,
    name === "source"
      ? body
      : body
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .slice(-15000),
  );
}
