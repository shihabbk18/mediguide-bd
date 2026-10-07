const base = "https://shihabbk18.github.io/mediguide-bd/";
async function get(path) {
  const r = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return {
    status: r.status,
    type: r.headers.get("content-type"),
    text: await r.text(),
  };
}
const page = await get("");
if (!page.text.includes("MediGuide BD")) throw new Error("Missing app title");
const scripts = [...page.text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
  (x) => x[1],
);
const checks = await Promise.all(
  scripts.map(async (path) => {
    const r = await get(path);
    if (!/javascript/.test(r.type))
      throw new Error(`Script returned ${r.type}`);
    return { path, status: r.status, bytes: r.text.length };
  }),
);
const manifest = JSON.parse((await get("manifest.webmanifest")).text);
if (
  manifest.start_url !== "/mediguide-bd/" ||
  manifest.scope !== "/mediguide-bd/"
)
  throw new Error("Incorrect PWA deployment scope");
for (const icon of manifest.icons) {
  const r = await fetch(new URL(icon.src, base), {
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok || !r.headers.get("content-type")?.includes("image/png"))
    throw new Error("Invalid PWA icon");
}
const sw = await get("sw.js");
if (!sw.text.includes("precacheAndRoute"))
  throw new Error("Missing precache service worker");
console.log(
  JSON.stringify(
    {
      public_url: base,
      http: page.status,
      scripts: checks,
      manifest_scope: manifest.scope,
      icons: manifest.icons.length,
      precache_service_worker: true,
    },
    null,
    2,
  ),
);
