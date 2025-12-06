// --------------------
// LINGUE (IT / EN)
// --------------------
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
    selectDate: "Seleziona una data",
    selectTime: "Seleziona un orario",
    noSlots: "Nessun orario disponibile",
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
    selectDate: "Select a date",
    selectTime: "Select a time",
    noSlots: "No available time slots",
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

  // CTA testi IT/EN
  document.getElementById("cta-text-it").classList.toggle("hidden", lang !== "it");
  document.getElementById("cta-text-en").classList.toggle("hidden", lang !== "en");
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  lang = lang === "it" ? "en" : "it";
  document.getElementById("lang-toggle").textContent = lang === "it" ? "EN" : "IT";
  applyLang();

  // ricarica banner evento con lingua giusta
  const d = document.getElementById("res_date").value;
  if (d) loadEventBanner(d);
});

// --------------------
// CONFIG DA /api/config
// --------------------
let CONFIG = null;

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("config fetch failed");
    CONFIG = await res.json();

    // Link CTA
    document.getElementById("cta-whatsapp").href = CONFIG.contact.whatsappUrl;
    document.getElementById("cta-instagram").href = CONFIG.contact.instagramUrl;
  } catch (e) {
    // fallback minimale se /api/config non va
    CONFIG = {
      slotMinutes: 30,
      openingHours: [
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
        [["18:00", "23:30"]],
      ],
    };
  }
}

// --------------------
// DATE & SLOT UTILS
// --------------------
function weekdayIndex(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const js = d.getDay(); // Sun=0..Sat=6
  return (js + 6) % 7;   // Mon=0..Sun=6
}

function hmToM(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
function mToHM(m) {
  m = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const H = String(Math.floor(m / 60)).padStart(2, "0");
  const M = String(m % 60).padStart(2, "0");
  return `${H}:${M}`;
}

// --------------------
// POPOLA ORARI
// --------------------
async function loadTimes(dateStr) {
  const timeSelect = document.getElementById("res_time");
  timeSelect.innerHTML = "";

  if (!dateStr) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = L[lang].selectDate;
    timeSelect.appendChild(opt);
    return;
  }

  const step = (CONFIG && CONFIG.slotMinutes) || 30;
  const w = weekdayIndex(dateStr);
  const intervals =
    (CONFIG && CONFIG.openingHours && CONFIG.openingHours[w]) || [];

  const slots = new Set();

  if (intervals.length === 0) {
    // fallback generico 18:00–23:30
    let s = hmToM("18:00");
    let e = hmToM("23:30");
    for (let t = s; t <= e; t += step) slots.add(mToHM(t));
  } else {
    for (const [start, end] of intervals) {
      let s = hmToM(start);
      let e = hmToM(end);
      if (e <= s) e += 1440;
      s = Math.floor(s / step) * step;
      for (let t = s; t < e; t += step) {
        slots.add(mToHM(t));
      }
    }
  }

  const arr = Array.from(slots).sort();
  if (arr.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = L[lang].noSlots;
    timeSelect.appendChild(opt);
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = L[lang].selectTime;
  timeSelect.appendChild(placeholder);

  for (const t of arr) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

// --------------------
// EVENT BANNER
// --------------------
async function loadEventBanner(dateStr) {
  const banner = document.getElementById("event-banner");
  if (!dateStr) {
    banner.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(`/api/event?res_date=${encodeURIComponent(dateStr)}`);
    const data = await res.json();
    if (data.ok && data.event) {
      banner.textContent = data.event[lang] || "";
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  } catch {
    banner.classList.add("hidden");
  }
}

// --------------------
// SUBMIT FORM
// --------------------
async function submitForm(ev) {
  ev.preventDefault();
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;

  const payload = {
    res_date: document.getElementById("res_date").value,
    res_time: document.getElementById("res_time").value,
    area: document.getElementById("area").value,
    people: document.getElementById("people").value,
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    notes: document.getElementById("notes").value,
    website: document.getElementById("website").value,
  };

  const fb = document.getElementById("feedback");

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok) {
      fb.textContent = L[lang].success;
      fb.style.color = "#4ade80";
      fb.classList.remove("hidden");
      document.getElementById("reservation-form").reset();
      document.getElementById("special-cta").classList.add("hidden");
      // dopo reset, ricarica gli slot per la data di oggi
      initDateAndSlots();
    } else {
      fb.textContent = `Errore: ${data.error || "UNKNOWN"}`;
      fb.style.color = "#ef4444";
      fb.classList.remove("hidden");
    }
  } catch (e) {
    fb.textContent = "Errore di rete.";
    fb.style.color = "#ef4444";
    fb.classList.remove("hidden");
  }

  btn.disabled = false;
}

// --------------------
// INIZIALIZZAZIONE
// --------------------
function initDateAndSlots() {
  const dateInput = document.getElementById("res_date");
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  dateInput.value = todayISO;
  dateInput.min = todayISO;

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);
  dateInput.max = maxDate.toISOString().slice(0, 10);

  loadTimes(todayISO);
  loadEventBanner(todayISO);
}

async function init() {
  applyLang();
  await loadConfig();
  initDateAndSlots();

  // cambio data → ricarica orari + evento
  document.getElementById("res_date").addEventListener("change", (e) => {
    const d = e.target.value;
    loadTimes(d);
    loadEventBanner(d);
  });

  // cambio persone → mostra CTA tavoli grandi
  document.getElementById("people").addEventListener("input", (e) => {
    const n = Number(e.target.value || 0);
    const cta = document.getElementById("special-cta");
    if (n > 10) cta.classList.remove("hidden");
    else cta.classList.add("hidden");
  });

  // submit
  document
    .getElementById("reservation-form")
    .addEventListener("submit", submitForm);
}

init();
