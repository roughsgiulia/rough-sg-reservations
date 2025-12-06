// Ritorna la capienza residua per uno slot specifico

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const url = new URL(request.url);

  const res_date = url.searchParams.get("res_date") || "";
  const res_time = url.searchParams.get("res_time") || "";
  const area = (url.searchParams.get("area") || "").toLowerCase();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(res_date)) {
    return Response.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(res_time)) {
    return Response.json({ ok: false, error: "INVALID_TIME" }, { status: 400 });
  }
  if (!(area === "indoor" || area === "outdoor")) {
    return Response.json({ ok: false, error: "INVALID_AREA" }, { status: 400 });
  }

  // Prende la capienza configurata
  const capRow = await env.DB
    .prepare("SELECT cap_people FROM slot_caps WHERE area = ?")
    .bind(area)
    .first<{ cap_people: number }>();

  if (!capRow) {
    return Response.json({ ok: false, error: "NO_CAP_CONFIG" }, { status: 500 });
  }

  // Prende slot già occupato
  const usedRow = await env.DB
    .prepare(
      "SELECT used_people FROM slot_usage WHERE res_date = ? AND res_time = ? AND area = ?"
    )
    .bind(res_date, res_time, area)
    .first<{ used_people: number }>();

  const used = usedRow?.used_people || 0;

  return Response.json({
    ok: true,
    capacity: capRow.cap_people,
    used,
    remaining: capRow.cap_people - used,
  });
};
