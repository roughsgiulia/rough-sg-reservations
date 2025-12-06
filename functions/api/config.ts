export const onRequestGet: PagesFunction = async () => {
  const openingHours = [
    [["18:00", "23:30"]],                    // 0 = Monday
    [["18:00", "23:30"]],                    // 1 = Tuesday
    [["18:00", "23:30"]],                    // 2 = Wednesday
    [["18:00", "23:30"]],                    // 3 = Thursday
    [["18:00", "23:30"]],                    // 4 = Friday
    [["12:00", "15:00"], ["18:00", "00:30"]],// 5 = Saturday
    [["12:00", "15:00"], ["18:00", "23:30"]],// 6 = Sunday
  ];

  const config = {
    venueName: "Rough Santa Giulia",
    maxGroupSize: 10,
    slotMinutes: 30,
    openingHours,
    closedDates: [] as string[],

    capacityPerSlotPeople: {
      indoor: 40,
      outdoor: 20,
    },

    contact: {
      whatsappUrl: "https://wa.me/393331112222?text=Ciao%20Rough!%20Vorrei%20informazioni%20per%20un%20tavolo%20grande%20o%20un%20evento%20privato.",
      instagramUrl: "https://www.instagram.com/roughsantagiulia/",
    },

    specialOccasions: {
      it: "Per tavoli oltre 10 persone o occasioni speciali, contattaci per un preventivo privato su WhatsApp o Instagram.",
      en: "For tables over 10 people or special occasions, contact us for a private quotation via WhatsApp or Instagram.",
    },

    eventsByWeekday: {
      0: { it: "Lunedì: Jam Session",        en: "Monday: Jam Session" },
      1: { it: "Martedì: Quiz Night",        en: "Tuesday: Quiz Night" },
      2: { it: "Mercoledì: Karaoke",         en: "Wednesday: Karaoke" },
      3: { it: "Giovedì: DJ Night",          en: "Thursday: DJ Night" },
      4: { it: "Venerdì: DJ Set / Party",    en: "Friday: DJ Set / Party" },
      5: { it: "Sabato: Main Party Night",   en: "Saturday: Main Party Night" },
      6: { it: "Domenica: Chill / Specials", en: "Sunday: Chill / Specials" },
    },

    // Se hai una serata speciale su una data precisa:
    // "2025-12-31": { it: "Capodanno Rough", en: "New Year's Eve Rough" }
    eventsByDate: {} as Record<string, { it: string; en: string }>,
  };

  return new Response(JSON.stringify(config), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
