import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  appendFileSync,
} from "node:fs";
import { z } from "zod";
import { responsibleFetch } from "./http";
// Permission is deliberately separate from public accessibility. No permission, no bulk export.
export const permissionSchema = z
  .object({
    publisher: z.literal("DGHS / MoHFW"),
    source_url: z.literal(
      "https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/sources/DGDA-Drugs/",
    ),
    permission_url: z.string().url(),
    permission_reference: z.string().min(20),
    bulk_export_allowed: z.literal(true),
    redistribution_allowed: z.literal(true),
    reviewed_by: z.string().min(3),
    reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
const recordSchema = z
  .object({
    id: z.string(),
    concept_class: z.string(),
    retired: z.boolean(),
    url: z.string(),
    extras: z
      .object({
        company: z.string().optional(),
        dar_number: z.string().optional(),
        trade_name: z.string().optional(),
        dosage_form: z.string().optional(),
        generic_content_raw: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
export async function importDgda(permissionPath: string, output = "tmp/dgda") {
  permissionSchema.parse(JSON.parse(readFileSync(permissionPath, "utf8")));
  mkdirSync(output, { recursive: true });
  const checkpoint = `${output}/checkpoint.json`,
    log = `${output}/requests.jsonl`;
  let state: { next: string | null; pages: number; count: number } = existsSync(
    checkpoint,
  )
    ? JSON.parse(readFileSync(checkpoint, "utf8"))
    : {
        next: "https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/collections/dgda-registered-drugs-valueset/concepts/?limit=100&verbose=true&sortAsc=id",
        pages: 0,
        count: 0,
      };
  while (state.next) {
    const u = new URL(state.next);
    if (
      u.origin !== "https://api.tr.ocl.dghs.gov.bd" ||
      !u.pathname.startsWith(
        "/orgs/MoHFW/collections/dgda-registered-drugs-valueset/concepts/",
      )
    )
      throw Error("Unexpected pagination target");
    const r = await responsibleFetch(u.href, 2000),
      records = z.array(recordSchema).parse(await r.json());
    const page = state.pages + 1;
    writeFileSync(`${output}/page-${page}.json`, JSON.stringify(records));
    appendFileSync(
      log,
      JSON.stringify({
        at: new Date().toISOString(),
        url: u.href,
        status: r.status,
        returned: records.length,
        total: r.headers.get("num_found"),
      }) + "\n",
    );
    state = {
      next: r.headers.get("next") || null,
      pages: page,
      count: state.count + records.length,
    };
    writeFileSync(checkpoint + ".tmp", JSON.stringify(state, null, 2));
    renameSync(checkpoint + ".tmp", checkpoint);
    console.log(
      `Saved page ${page}; ${state.count} source concepts (not yet validated product identities)`,
    );
  }
  return state;
}
if (process.argv[1]?.endsWith("import-dgda-products.ts")) {
  const permissionPath = process.argv[2];
  if (!permissionPath)
    throw Error(
      "Bulk import gated: provide a reviewed publisher permission JSON. Public View access is not a redistribution license. See docs/DATA_PIPELINE.md.",
    );
  await importDgda(permissionPath, process.argv[3]);
}
