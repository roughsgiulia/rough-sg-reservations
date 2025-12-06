// ---------- LINGUE ----------
let lang = "it";

const L = {
  it: {
    date: "Data",
    time: "Orario di arrivo",
    area: "Area",
    people: "Persone",
    name: "Nome",
    phone: "Telefono",
    notes: "Note (opzionale)",
    submit: "Prenota",
    success: "Prenotazione completata!",
    netError: "Errore di rete. Riprova tra poco.",
  },
  en: {
    date: "Date",
    time: "Arrival time",
    area: "Area",
    people: "People",
    name: "Name",
    phone: "Phone",
    notes: "Notes (optional)",
    submit: "Book now",
    success: "Reservation confirmed!",
    netError: "Network error. Please try again.",
  },
};

function applyLang() {
  document.documentElement.lang = lang;
  document.getElementById("label-date").textContent = L[lang].date;
  document.getElementById("label-time").textContent = L[lang].time;
  document.getElementById("label-area").textContent = L[lang].area;
  document.getElementById("label-people").textContent = L[lang].people;
  document.getElementById("label-name").textContent = L[lang].name;
  document.getElementById("label-phone").textContent = L[lang].phone;
  document.getElementById("label-notes").textContent = L[lang].notes;
  document.getElementById("submit-btn").textContent = L[lang].submit;

  document.getElementById("cta-text-it").classList.toggle("hidden", lang !== "it");
  document.getElementById("cta-text-en").classList.toggle("hidden", lang !== "en");
}

document.getElementById("lang-toggle").onclick = () => {
  lang = lang === "it" ? "en" : "it";
  document.getElementById("lang-toggle").textContent = lang === "it" ? "EN" : "IT";
  applyLang();
};

applyLang();

// ---------- CONFIG & EVENTO ----------
let CONFIG = null;

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const text = await res.text();
    CONFIG = JSON.parse(text);

    document.getElementById("cta-whatsapp").href = CONFIG.contact.whatsappUrl;
    document.getElementById("cta-instagram").href = CONFIG.contact.instagramUrl;
  } catch (e) {
    console.error("Errore caricando /api/config", e);
  }
}

loadConfig();

async function loadEventBanner(dateStr) {
  if (!dateStr) return;

  try {
    const res = await fetch(`/api/event?res_date=${encodeURIComponent(dateStr)}`);
    const text = await res.text();
    const data = JSON.parse(text);

    const banner = document.getElementById("event-banner");
    if (data.ok && data.event) {
      banner.textContent = data.event[lang] || "";
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  } catch (e) {
    console.error("Errore caricando /api/event", e);
  }
}

// ---------- SLOT ORARI ----------

function hmToM(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
function mToHM(mins) {
  const H = String(Math.floor(mins / 60)).padStart(2, "0");
  const M = String(mins % 60).padStart(2, "0");
  return `${H}:${M}`;
}

async function loadTimes(dateStr) {
  const timeSelect = document.getElementById("res_time");
  timeSelect.innerHTML = "";

  if (!CONFIG || !dateStr) return;

  const d = new Date(dateStr + "T00:00:00");
  const js = d.getDay();
  const w = (js + 6) % 7; // lun = 0

  const intervals = CONFIG.openingHours[w] || [];
  const step = CONFIG.slotMinutes || 30;
  const slotsSet = new Set();

  for (const [start, end] of intervals) {
    let s = hmToM(start);
    let e = hmToM(end);
    if (e <= s) e += 1440;
    s = Math.floor(s / step) * step;

    for (let t = s; t < e; t += step) {
      slotsSet.add(mToHM(t));
    }
  }

  const slots = Array.from(slotsSet).sort();
  for (const t of slots) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

// quando cambio data
document.getElementById("res_date").onchange = async (e) => {
  const v = e.target.value;
  await loadTimes(v);
  await loadEventBanner(v);
};

// quando cambio area (per ora gli slot non cambiano, ma in futuro si potrebbe)
document.getElementById("area").onchange = () => {
  const d = document.getElementById("res_date").value;
  if (d) loadTimes(d);
};

// ---------- SUBMIT ----------

const form = document.getElementById("reservation-form");
const feedback = document.getElementById("feedback");
const submitBtn = document.getElementById("submit-btn");

form.onsubmit = async (e) => {
  e.preventDefault();
  feedback.classList.add("hidden");

  const payload = {
    res_date: document.getElementById("res_date").value,
    res_time: document.getElementById("res_time").value,
    area: document.getElementById("area").value,
    people: Number(document.getElementById("people").value),
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    notes: document.getElementById("notes").value,
    website: document.getElementById("website").value,
  };

  submitBtn.disabled = true;

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("Risposta non JSON dal server:", text);
      feedback.textContent = "Errore server (risposta non valida).";
      feedback.style.color = "#ef4444";
      feedback.classList.remove("hidden");
      submitBtn.disabled = false;
      return;
    }

    if (data.ok) {
      feedback.textContent = L[lang].success;
      feedback.style.color = "#4ade80";
      feedback.classList.remove("hidden");
      form.reset();
    } else {
      const code = data.error || "UNKNOWN";
      feedback.textContent = "Errore: " + code;
      feedback.style.color = "#ef4444";
      feedback.classList.remove("hidden");
    }
  } catch (e) {
    console.error("Network error:", e);
    feedback.textContent = L[lang].netError;
    feedback.style.color = "#ef4444";
    feedback.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
};
