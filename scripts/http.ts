import { setTimeout as pause } from "node:timers/promises";
let lastRequest = 0;
export async function responsibleFetch(
  url: string,
  intervalMs = 1500,
): Promise<Response> {
  if (!url.startsWith("https://"))
    throw Error("HTTPS required; certificate checks are never disabled");
  for (let attempt = 0; attempt < 4; attempt++) {
    await pause(Math.max(0, intervalMs - (Date.now() - lastRequest)));
    lastRequest = Date.now();
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent":
            "MediGuideBD-data-import/2.0 (source review; no clinical inference)",
        },
      });
      if ([401, 403, 451].includes(r.status))
        throw Error(`ACCESS_RESTRICTED ${r.status}`);
      if (r.status === 429 || r.status >= 500) {
        const retry = Number(r.headers.get("retry-after"));
        if (attempt === 3) throw Error(`HTTP ${r.status}`);
        await pause(
          Number.isFinite(retry) && retry > 0
            ? Math.min(retry * 1000, 60000)
            : 1500 * 2 ** attempt,
        );
        continue;
      }
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (
        /ACCESS_RESTRICTED|certificate|HTTP 4/.test(String(e)) ||
        attempt === 3
      )
        throw e;
      await pause(1500 * 2 ** attempt);
    }
  }
  throw Error("Retry budget exhausted");
}
