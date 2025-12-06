// Piccolo helper per hashare l'IP (rate limit)
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const b = new Uint8Array(buf);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(p: string): string {
  const cleaned = (p || "").trim().split("").filter((ch) => /[\d+]/.test(ch)).join("");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 16) {
    throw new Error("INVALID_PHONE");
  }
  return cleaned;
}

export const onRequestPost: PagesFunction<{
  DB: D1Database;
  IP_HASH_SALT: string;
}> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "VALIDATION_FAILED" }, { status: 400 });
  }

  // honeypot
  if ((body.website || "").trim()) {
    return Response.json({ ok: false, error: "SPAM_DETECTED" }, { status: 400 });
  }

  const res_date = String(body.res_date || "");
  const res_time = String(body.res_time || "");
  const area = String(body.area || "").toLowerCase();
  const people = Number(body.people || 0);
  const name = String(body.name || "").trim();
  const phoneRaw = String(body.phone || "");
  const notes = body.notes ? String(body.notes).slice(0, 400) : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(res_date)) {
    return Response.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(res_time)) {
    return Response.json({ ok: false, error: "INVALID_TIME" }, { status: 400 });
  }
  if (!(area === "indoor" || area === "outdoor")) {
    return Response.json({ ok: false, error: "INVALID_AREA" }, { status: 400 });
  }
  if (!(people >= 1 && people <= 10)) {
    return Response.json({ ok: false, error: "TOO_BIG" }, { status: 400 });
  }
  if (name.length < 2 || name.length > 60) {
    return Response.json({ ok: false, error: "INVALID_NAME" }, { status: 400 });
  }

  let phone = "";
  try {
    phone = normalizePhone(phoneRaw);
  } catch {
    return Response.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
  }

  // Rate limit semplice
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const salt = env.IP_HASH_SALT || "change-me";
  const ip_hash = await sha256Hex(`${salt}|${ip}`);

  const now = new Date();
  const nowISO = now.toISOString();

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayISO = startOfDay.toISOString();

  const hourRow = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM reservations WHERE ip_hash = ? AND created_at >= ?"
  )
    .bind(ip_hash, oneHourAgo)
    .first<{ c: number }>();

  if ((hourRow?.c || 0) >= 4) {
    return Response.json({ ok: false, error: "RATE_LIMIT_HOURLY" }, { status: 429 });
  }

  const dayRow = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM reservations WHERE ip_hash = ? AND created_at >= ?"
  )
    .bind(ip_hash, startOfDayISO)
    .first<{ c: number }>();

  if ((dayRow?.c || 0) >= 8) {
    return Response.json({ ok: false, error: "RATE_LIMIT_DAILY" }, { status: 429 });
  }

  // Inserimento: il TRIGGER in schema.sql fa rispettare capienza e max 10
  const ua = (request.headers.get("user-agent") || "").slice(0, 180);

  try {
    await env.DB.prepare(
      `INSERT INTO reservations
       (created_at, res_date, res_time, area, people, name, phone, notes, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(nowISO, res_date, res_time, area, people, name, phone, notes, ip_hash, ua)
      .run();
  } catch (e: any) {
    const msg = String(e?.message || "");

    if (msg.includes("CAPACITY_SLOT_AREA")) {
      return Response.json({ ok: false, error: "CAPACITY_SLOT_AREA" }, { status: 409 });
    }
    if (msg.includes("TOO_BIG")) {
      return Response.json({ ok: false, error: "TOO_BIG" }, { status: 400 });
    }
    if (msg.includes("INVALID_AREA")) {
      return Response.json({ ok: false, error: "INVALID_AREA" }, { status: 400 });
    }

    return Response.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({ ok: true, message: "ACCEPTED" });
};
