const urls = [
  "https://info.dgda.gov.bd/robots.txt",
  "https://info.dgda.gov.bd/allopathic-medicines",
  "https://tr.ocl.dghs.gov.bd/robots.txt",
  "https://tr.ocl.dghs.gov.bd/",
  "https://data.mendeley.com/datasets/3x5gsr2jm3/1",
  "https://data.mendeley.com/api/docs/",
];
for (const [i, url] of urls.entries()) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const body = await r.text();
    await (
      await import("node:fs/promises")
    ).writeFile(`data-source-audit/probe-${i}.txt`, body);
    console.log(
      JSON.stringify({
        url,
        status: r.status,
        bytes: body.length,
        headers: Object.fromEntries(
          [...r.headers].filter(([k]) => /rate|link|type/.test(k)),
        ),
      }),
    );
  } catch (e) {
    console.log(
      JSON.stringify({ url, error: String(e), cause: String(e.cause) }),
    );
  }
}
