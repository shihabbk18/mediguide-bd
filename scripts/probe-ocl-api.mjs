import { writeFile } from "node:fs/promises";
for (const [name, url] of Object.entries({
  robots: "https://api.tr.ocl.dghs.gov.bd/robots.txt",
  collection:
    "https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/collections/dgda-registered-drugs-valueset/",
})) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body = await r.text();
    await writeFile(`data-source-audit/api-${name}.txt`, body);
    console.log(name, r.status, body.slice(0, 8000));
  } catch (e) {
    console.log(name, String(e), String(e.cause));
  }
}
