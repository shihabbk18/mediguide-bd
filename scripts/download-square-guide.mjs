import { writeFile, mkdir } from "node:fs/promises";
const base = "https://squarepharma.com.bd";
const r = await fetch(base + "/robots.txt", {
  signal: AbortSignal.timeout(15000),
});
console.log("robots", r.status, (await r.text()).slice(0, 1500));
const pdf = await fetch(base + "/product_guide/Product%20Guide%209th_SPL.pdf", {
  signal: AbortSignal.timeout(30000),
});
if (!pdf.ok) throw Error("PDF " + pdf.status);
const bytes = new Uint8Array(await pdf.arrayBuffer());
if (
  !pdf.headers.get("content-type")?.includes("application/pdf") ||
  new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
)
  throw Error("Expected PDF; refusing an HTML redirect");
await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/square-guide.pdf", bytes);
console.log(
  "Downloaded manufacturer product guide; parser output must be reviewed",
);
