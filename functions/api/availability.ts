export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);

  const res_date = url.searchParams.get("res_date") || "";
  const area = url.searchParams.get("area") || "";
  const res_time = url.searchParams.get("res_time") || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(res_date)) {
    return Response.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
  }

  // carica config
  const cfgRes = await fetch(new URL("/api/config", request.url).toString());
  const cfg = await cfgRes.json();

  // Converte domenica=0 in lunedì=0
  const dateObj = new Date(res_date + "T00:00:00");
  const jsDay = dateObj.getDay();
  const wday = (jsDay + 6) % 7;
  const intervals = cfg.openingHours[wday] || [];

  // genera slot orari (semplice)
  function hmToM(x: string) {
    const [h, m] = x.split(":").map(Number);
    return h * 60 + m;
  }
  function mToHM(m: number) {
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  const slots: string[] = [];
  const step = cfg.slotMinutes;

  for (const [start, end] of intervals) {
    let s = hmToM(start);
    let e = hmToM(end);
    if (e <= s) e += 1440; // supera mezzanotte
    while (s < e) {
      slots.push(mToHM(s));
      s += step;
    }
  }

  return Response.json({ ok: true, slots });
};
