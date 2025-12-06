let lang = "it"; // default language

const L = {
  it: {
    date: "Data",
    time: "Orario di arrivo",
    area: "Area",
    people: "Persone",
    name: "Nome",
    phone: "Telefono",
    notes: "Note (opzionale)",
    indoor: "Interno",
    outdoor: "Dehor",
    submit: "Prenota",
    success: "Prenotazione completata!",
  },
  en: {
    date: "Date",
    time: "Arrival time",
    area: "Area",
    people: "People",
    name: "Name",
    phone: "Phone",
    notes: "Notes (optional)",
    indoor: "Indoor",
    outdoor: "Outdoor",
    submit: "Book now",
    success: "Reservation confirmed!",
  }
};

function applyLang() {
  document.querySelector("html").setAttribute("lang", lang);

  document.getElementById("label-date").textContent = L[lang].date;
  document.getElementById("label-time").textContent = L[lang].time;
  document.getElementById("label-area").textContent = L[lang].area;
  document.getElementById("label-people").textContent = L[lang].people;
  document.getElementById("label-name").textContent = L[lang].name;
  document.getElementById("label-phone").textContent = L[lang].phone;
  document.getElementById("label-notes").textContent = L[lang].notes;

  document.querySelector("#submit-btn").textContent = L[lang].submit;

  // CTA text visibility
  document.getElementById("cta-text-it").classList.toggle("hidden", lang !== "it");
  document.getElementById("cta-text-en").classList.toggle("hidden", lang !== "en");
}

document.getElementById("lang-toggle").onclick = () => {
  lang = lang === "it" ? "en" : "it";
  document.getElementById("lang-toggle").textContent = lang === "it" ? "EN" : "IT";
  applyLang();
};


// Load config first
let CONFIG = null;

async function loadConfig() {
  const res = await fetch("/api/config");
  CONFIG = await res.json();

  document.getElementById("cta-whatsapp").href = CONFIG.contact.whatsappUrl;
  document.getElementById("cta-instagram").href = CONFIG.contact.instagramUrl;
}

loadConfig();


// Load event for selected date
async function loadEventBanner(date) {
  if (!date) return;

  const res = await fetch(`/api/event?res_date=${date}`);
  const data = await res.json();
  
  const banner = document.getElementById("event-banner");

  if (data.ok && data.event) {
    banner.textContent = data.event[lang] || "";
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}


// Load available time slots
async function loadTimes(date, area) {
  const timeSelect = document.getElementById("res_time");
  timeSelect.innerHTML = "";

  if (!CONFIG) return;

  // Generate slots based on config (client version)
  const step = CONFIG.slotMinutes;
  const weekday = (new Date(date + "T00:00:00")).getDay();

  // Convert JS Sunday=0 to Monday=0
  const w = (weekday + 6) % 7;
  const intervals = CONFIG.openingHours[w] || [];

  let slots = new Set();

  function hmToM(str) {
    const [h,m] = str.split(":").map(Number);
    return h*60 + m;
  }
  function mToHM(m) {
    const H = String(Math.floor(m/60)).padStart(2,"0");
    const M = String(m%60).padStart(2,"0");
    return `${H}:${M}`;
  }

  for (const [start,end] of intervals) {
    let s = hmToM(start);
    let e = hmToM(end);
    if (e <= s) e += 1440;
    s = Math.floor(s/step)*step;

    for (let t=s; t<e; t+=step) {
      slots.add(mToHM(t));
    }
  }

  slots = Array.from(slots).sort();

  for (const t of slots) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}


// Form interactions
document.getElementById("res_date").onchange = async (e) => {
  const date = e.target.value;
  const area = document.getElementById("area").value;

  loadTimes(date, area);
  loadEventBanner(date);
};

document.getElementById("area").onchange = () => {
  const date = document.getElementById("res_date").value;
  if (date) loadTimes(date);
};


// Submit reservation
document.getElementById("reservation-form").onsubmit = async (e) => {
  e.preventDefault();

  const payload = {
    res_date: document.getElementById("res_date").value,
    res_time: document.getElementById("res_time").value,
    area: document.getElementById("area").value,
    people: document.getElementById("people").value,
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    notes: document.getElementById("notes").value,
    website: document.getElementById("website").value
  };

  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  const fb = document.getElementById("feedback");

  if (data.ok) {
    fb.textContent = L[lang].success;
    fb.style.color = "#4ade80";
    fb.classList.remove("hidden");
  } else {
    fb.textContent = "Errore: " + (data.error || "UNKNOWN");
    fb.style.color = "#ef4444";
    fb.classList.remove("hidden");
  }
};

// Initialize language
applyLang();
