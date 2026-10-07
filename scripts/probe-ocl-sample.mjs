import { writeFile } from "node:fs/promises";
const url =
  "https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/collections/dgda-registered-drugs-valueset/concepts/?limit=2&verbose=true";
const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
const body = await r.text();
await writeFile("data-source-audit/ocl-sample.json", body);
console.log(
  r.status,
  Object.fromEntries([...r.headers].filter(([k]) => /next|num|type/.test(k))),
  body.slice(0, 12000),
);
