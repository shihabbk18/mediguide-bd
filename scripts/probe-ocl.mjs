import { writeFile } from "node:fs/promises";
for (const [name, url] of Object.entries({
  env: "https://tr.ocl.dghs.gov.bd/env-config.js",
  collection:
    "https://tr.ocl.dghs.gov.bd/orgs/MoHFW/collections/dgda-registered-drugs-valueset/",
})) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body = await r.text();
    await writeFile(`data-source-audit/${name}.txt`, body);
    console.log(name, r.status, body.slice(0, 7000));
  } catch (e) {
    console.log(name, String(e));
  }
}
