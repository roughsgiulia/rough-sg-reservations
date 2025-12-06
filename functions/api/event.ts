function weekdayIndex(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00");
  const js = d.getDay();          // Sun=0..Sat=6
  return (js + 6) % 7;            // Mon=0..Sun=6
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const res_date = url.searchParams.get("res_date") || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(res_date)) {
    return new Response(JSON.stringify({ ok: false, error: "INVALID_DATE" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // recupero la config chiamando /api/config
  const cfgRes = await fetch(new URL("/api/config", request.url).toString());
  const cfg = await cfgRes.json();

  const byDate = cfg.eventsByDate?.[res_date];
  if (byDate) {
    return new Response(JSON.stringify({ ok: true, event: byDate, source: "date" }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const w = weekdayIndex(res_date);
  const ev = cfg.eventsByWeekday?.[w] || null;

  return new Response(JSON.stringify({ ok: true, event: ev, source: "weekday" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
