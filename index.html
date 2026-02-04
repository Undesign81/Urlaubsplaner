const $ = (id) => document.getElementById(id);

const state = {
  trips: loadTrips(),
  editingId: null,
  mode: "car",
  countries: [],
};

let editorPackItems = [];
let editorRemovedSuggestions = new Set();

// Cache für Klima pro (lat,lon,year,month)
const climateCache = new Map();

init().catch((e) => {
  // Wenn hier ein Fehler passiert, wären Buttons auf iOS "tot" – daher sichtbar loggen
  console.error("Init error:", e);
  alert("Fehler beim Start der App. Bitte einmal neu laden.");
});

async function init() {
  bindUI();
  renderTrips();

  await loadCountries();
  fillCountrySelect();

  setMode("car");
}

function bindUI() {
  $("fabAdd").addEventListener("click", () => openEditor());
  $("btnClose").addEventListener("click", closeEditor);
  $("sheetClose").addEventListener("click", closeEditor);

  $("btnSave").addEventListener("click", saveTrip);
  $("btnDelete").addEventListener("click", deleteTrip);

  $("search").addEventListener("input", renderTrips);

  ["start", "end", "country", "tripType", "withDog"].forEach((id) => {
    $(id).addEventListener("change", () => {
      refreshAdvice();
      recalcPackList();
      updateSheetSub();
    });
  });

  document.querySelectorAll(".segbtn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("airline").addEventListener("input", refreshAdvice);

  $("btnAddPack").addEventListener("click", addPackItemFromInput);
  $("packNew").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addPackItemFromInput();
  });

  $("btnResetPack").addEventListener("click", () => {
    editorRemovedSuggestions = new Set();
    recalcPackList(true);
  });
}

function openEditor(trip = null) {
  $("sheet").classList.remove("hidden");
  $("sheet").setAttribute("aria-hidden", "false");

  if (!trip) {
    state.editingId = null;
    $("sheetTitle").textContent = "Neue Reise";
    $("btnDelete").classList.add("hidden");

    $("title").value = "";
    $("country").value = "";
    $("start").value = "";
    $("end").value = "";
    $("tripType").value = "city";
    $("withDog").value = "no";
    $("notes").value = "";
    $("airline").value = "";

    editorRemovedSuggestions = new Set();
    setMode("car");

    editorPackItems = defaultPackItems(state.mode);
    recalcPackList();
  } else {
    state.editingId = trip.id;
    $("sheetTitle").textContent = "Reise bearbeiten";
    $("btnDelete").classList.remove("hidden");

    $("title").value = trip.title || "";
    $("country").value = trip.countryCode || "";
    $("start").value = trip.start || "";
    $("end").value = trip.end || "";
    $("tripType").value = trip.tripType || "city";
    $("withDog").value = trip.withDog ? "yes" : "no";
    $("notes").value = trip.notes || "";
    $("airline").value = trip.airline || "";

    setMode(trip.mode || "car");

    editorRemovedSuggestions = new Set(Array.isArray(trip.removedSuggestions) ? trip.removedSuggestions : []);

    const packRaw =
      Array.isArray(trip.packItems) && trip.packItems.length
        ? trip.packItems.map(ensurePackShape)
        : defaultPackItems(state.mode);

    editorPackItems = normalizePackItemsForMode(state.mode, packRaw);
    recalcPackList();
  }

  updateSheetSub();
  refreshAdvice();
}

function closeEditor() {
  $("sheet").classList.add("hidden");
  $("sheet").setAttribute("aria-hidden", "true");
}

function updateSheetSub() {
  const cc = $("country").value;
  const c = state.countries.find((x) => x.cca2 === cc);
  const name = c ? c.name : "";
  const range = [$("start").value, $("end").value].filter(Boolean).join(" – ");
  $("sheetSub").textContent = [name, range].filter(Boolean).join(" · ");
}

function setMode(mode) {
  state.mode = mode === "flight" ? "flight" : "car";

  document.querySelectorAll(".segbtn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === state.mode);
  });

  $("airlineWrap").classList.toggle("hidden", state.mode !== "flight");

  const sheetOpen = !$("sheet").classList.contains("hidden");
  if (sheetOpen) {
    editorPackItems = normalizePackItemsForMode(state.mode, editorPackItems);
    recalcPackList();
  }
}

/* ---------- Trips list ---------- */

function renderTrips() {
  const list = $("tripList");
  const empty = $("emptyTrips");
  const stats = $("stats");
  list.innerHTML = "";

  const q = ($("search").value || "").trim().toLowerCase();

  const items = [...state.trips].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  const filtered = q
    ? items.filter((t) => {
        const c = state.countries.find((x) => x.cca2 === t.countryCode);
        const name = c ? c.name : t.countryCode || "";
        return `${t.title || ""} ${name}`.toLowerCase().includes(q);
      })
    : items;

  stats.textContent = filtered.length ? `${filtered.length} Reise(n)` : "";

  empty.style.display = filtered.length ? "none" : "block";

  for (const t of filtered) {
    const c = state.countries.find((x) => x.cca2 === t.countryCode);
    const countryName = c ? c.name : t.countryCode || "";

    const typeLabel = tripTypeLabel(t.tripType);
    const dogLabel = t.withDog ? "🐶" : "";
    const modePill = t.mode === "flight" ? "✈️ Flug" : "🚗 Auto";

    const openInfo = buildOpenPackInfo(t);

    const el = document.createElement("div");
    el.className = "trip";
    el.innerHTML = `
      <div class="left">
        <div class="t1">${escapeHtml(t.title || "Urlaub")}</div>
        <div class="t2">${escapeHtml(countryName)}${t.start ? " · " + escapeHtml([t.start, t.end].filter(Boolean).join(" – ")) : ""}</div>
        <div class="t2">${escapeHtml([typeLabel, dogLabel, openInfo].filter(Boolean).join(" · "))}</div>
      </div>
      <div class="right">
        <div class="pill">${modePill}</div>
      </div>
    `;
    el.addEventListener("click", () => openEditor(t));
    list.appendChild(el);
  }
}

function buildOpenPackInfo(trip) {
  const items = Array.isArray(trip.packItems) ? trip.packItems.map(ensurePackShape) : [];
  if (!items.length) return "";
  const open = items.filter((x) => !x.done);
  if (!open.length) return "✅ alles gepackt";
  return `⏳ offen: ${open.length}`;
}

function tripTypeLabel(v) {
  const m = {
    city: "Stadt",
    beach: "Strand",
    hiking: "Natur",
    ski: "Ski",
    roadtrip: "Roadtrip",
    camping: "Camping",
  };
  return m[v] || "";
}

/* ---------- Countries ---------- */

async function loadCountries() {
  const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,capitalInfo,latlng");
  const data = await res.json();

  state.countries = (Array.isArray(data) ? data : [])
    .filter((x) => x?.cca2 && x?.name?.common)
    .map((x) => {
      const ll =
        (x.capitalInfo && Array.isArray(x.capitalInfo.latlng) && x.capitalInfo.latlng.length === 2)
          ? x.capitalInfo.latlng
          : (Array.isArray(x.latlng) && x.latlng.length === 2 ? x.latlng : [null, null]);
      return { cca2: x.cca2, name: x.name.common, lat: ll[0], lon: ll[1] };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function fillCountrySelect() {
  const sel = $("country");
  sel.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Bitte wählen…";
  sel.appendChild(opt0);

  for (const c of state.countries) {
    const o = document.createElement("option");
    o.value = c.cca2;
    o.textContent = c.name;
    sel.appendChild(o);
  }
}

/* ---------- Save / Load ---------- */

function saveTrip() {
  const title = ($("title").value || "").trim();
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const tripType = $("tripType").value;
  const withDog = $("withDog").value === "yes";
  const notes = ($("notes").value || "").trim();
  const airline = ($("airline").value || "").trim();

  if (!countryCode) {
    alert("Bitte ein Land auswählen.");
    return;
  }

  recalcPackList(); // final

  const trip = {
    id: state.editingId || crypto.randomUUID(),
    title: title || "Urlaub",
    countryCode,
    start,
    end,
    tripType,
    withDog,
    mode: state.mode,
    airline: state.mode === "flight" ? airline : "",
    notes,
    packItems: editorPackItems.map(ensurePackShape),
    removedSuggestions: Array.from(editorRemovedSuggestions),
    updatedAt: new Date().toISOString(),
  };

  const idx = state.trips.findIndex((t) => t.id === trip.id);
  if (idx >= 0) state.trips[idx] = trip;
  else state.trips.push(trip);

  persistTrips();
  renderTrips();
  closeEditor();
}

function deleteTrip() {
  if (!state.editingId) return;
  if (!confirm("Diese Reise wirklich löschen?")) return;

  state.trips = state.trips.filter((t) => t.id !== state.editingId);
  persistTrips();
  renderTrips();
  closeEditor();
}

function persistTrips() {
  localStorage.setItem("urlaub_trips_clean_v1", JSON.stringify(state.trips));
}

function loadTrips() {
  try {
    const v = localStorage.getItem("urlaub_trips_clean_v1");
    if (v) return JSON.parse(v);

    // Migration fallback (alte Keys)
    const legacyKeys = ["urlaub_trips_v7","urlaub_trips_v6","urlaub_trips_v5","urlaub_trips_v4"];
    for (const k of legacyKeys) {
      const x = localStorage.getItem(k);
      if (x) return JSON.parse(x);
    }
    return [];
  } catch {
    return [];
  }
}

/* ---------- Advice + Climate averages ---------- */

async function refreshAdvice() {
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const airline = ($("airline").value || "").trim();
  const withDog = $("withDog").value === "yes";

  const box = $("advice");
  if (!countryCode) {
    box.textContent = "Wähle Land + Zeitraum.";
    return;
  }

  const c = state.countries.find((x) => x.cca2 === countryCode);
  const countryName = c ? c.name : countryCode;

  const general = [
    "Dokumente prüfen (Gültigkeit, Kopien)",
    "Zahlungsmittel & Adapter prüfen",
    "Notfallnummern / Versicherung",
  ];

  const transport =
    state.mode === "car"
      ? ["Maut/Vignette prüfen", "Umweltzonen/City-Maut prüfen", "Pflichtausrüstung prüfen"]
      : [`Gepäckregeln prüfen${airline ? " (" + airline + ")" : ""}`, "Powerbanks/Flüssigkeiten beachten", "Check-in Zeiten"];

  const dogHints = withDog ? dogTravelHints(countryCode) : [];

  // Klima: Mittelwert nach Zeitraum (Monatsmittel, ggf. mehrere Monate)
  let climateLine = "";
  try {
    climateLine = await loadClimateAverage(countryCode, start || end, end || start);
  } catch {
    climateLine = "";
  }

  const lines = [];
  lines.push(`<strong>${escapeHtml(countryName)}</strong> ${escapeHtml([start, end].filter(Boolean).join(" – "))}`);
  lines.push(`<div class="muted tiny" style="margin-top:6px">Allgemein</div><ul>${general.map(li).join("")}</ul>`);
  lines.push(`<div class="muted tiny">Transport</div><ul>${transport.map(li).join("")}</ul>`);
  if (withDog) lines.push(`<div class="muted tiny">🐶 Mit Hund</div><ul>${dogHints.map(li).join("")}</ul>`);
  if (climateLine) lines.push(`<div class="muted tiny">🌡 Typische Temperaturen (Klimamittel)</div><div>${escapeHtml(climateLine)}</div>`);

  box.innerHTML = lines.join("");

  function li(t) { return `<li>${escapeHtml(t)}</li>`; }
}

function dogTravelHints(cc) {
  cc = (cc || "").toUpperCase();
  const hints = [];
  if (EU_LIKE.has(cc)) {
    hints.push("EU-Heimtierausweis / Mikrochip / Tollwutimpfung prüfen");
    hints.push("Leinen-/Maulkorbpflicht (Land/ÖPNV) prüfen");
  } else {
    hints.push("Einreisebestimmungen für Haustiere prüfen (Dokumente/Tests/ggf. Quarantäne)");
  }
  if (["GB","IE","NO","CH"].includes(cc)) hints.push("Land kann Sonderregeln haben: Anforderungen vorher checken");
  hints.push("Tierarzt-Check vor Reise (bei langer Fahrt/Flug)");
  return hints;
}

async function loadClimateAverage(countryCode, startStr, endStr) {
  if (!countryCode || !startStr) return "";

  const c = state.countries.find((x) => x.cca2 === countryCode);
  if (!c || c.lat == null || c.lon == null) return "";

  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  // Monate im Reisezeitraum
  const months = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= last) {
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
    d.setMonth(d.getMonth() + 1);
  }

  const parts = [];
  for (const mm of months) {
    const avg = await climateMonthAvg(c.lat, c.lon, mm.y, mm.m);
    if (avg) parts.push(`${monthNameDE(mm.m)}: ${avg.min}–${avg.max}°C`);
  }
  return parts.join(" · ");
}

async function climateMonthAvg(lat, lon, year, month) {
  const key = `${lat}|${lon}|${year}|${month}`;
  if (climateCache.has(key)) return climateCache.get(key);

  const start = `${year}-${String(month).padStart(2,"0")}-01`;
  const end = `${year}-${String(month).padStart(2,"0")}-${String(new Date(year, month, 0).getDate()).padStart(2,"0")}`;

  const url =
    `https://climate-api.open-meteo.com/v1/climate?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&start_date=${start}&end_date=${end}` +
    `&models=MPI_ESM1_2_XR` +
    `&daily=temperature_2m_min,temperature_2m_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const mins = (data?.daily?.temperature_2m_min || []).map(Number).filter(Number.isFinite);
  const maxs = (data?.daily?.temperature_2m_max || []).map(Number).filter(Number.isFinite);
  if (!mins.length || !maxs.length) return null;

  const avgMin = Math.round(mins.reduce((a,b)=>a+b,0) / mins.length);
  const avgMax = Math.round(maxs.reduce((a,b)=>a+b,0) / maxs.length);

  const out = { min: avgMin, max: avgMax };
  climateCache.set(key, out);
  return out;
}

function monthNameDE(m) {
  return ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][m-1] || `M${m}`;
}

const EU_LIKE = new Set([
  "DE","AT","CH","FR","IT","ES","NL","BE","LU","DK","SE","NO","FI","IS","IE","PT","GR",
  "CZ","PL","SK","HU","SI","HR","RO","BG","LT","LV","EE","CY","MT"
]);

/* ---------- Packlist ---------- */

function recalcPackList() {
  const countryCode = $("country").value;
  const tripType = $("tripType").value || "city";
  const withDog = $("withDog").value === "yes";
  const startStr = $("start").value || $("end").value || "";
  const month = startStr ? safeMonth(startStr) : null;

  const current = (editorPackItems || []).map(ensurePackShape);
  const customs = current.filter((x) => x.custom === true);
  const doneMap = new Map(current.map((x) => [normKey(x.text), !!x.done]));

  const base = defaultPackItems(state.mode);
  const suggestions = suggestedPackTexts(countryCode, tripType, withDog, month, state.mode)
    .filter((t) => !editorRemovedSuggestions.has(normKey(t)));

  const merged = [];
  const seen = new Set();

  const push = (it) => {
    const k = normKey(it.text);
    if (!k || seen.has(k)) return;
    seen.add(k);
    merged.push({
      id: it.id || crypto.randomUUID(),
      text: it.text.trim(),
      done: doneMap.has(k) ? doneMap.get(k) : !!it.done,
      custom: it.custom === true,
    });
  };

  base.forEach(push);
  suggestions.map((text) => ({ text, done:false, custom:false })).forEach(push);
  customs.forEach(push);

  editorPackItems = normalizePackItemsForMode(state.mode, merged);
  renderPackList();
}

function suggestedPackTexts(countryCode, tripType, withDog, month, mode) {
  const out = [];

  // Saison
  if (month != null && month >= 5 && month <= 9) out.push("Sonnencreme", "Sonnenbrille/Kappe");
  if (month !=null && (month === 11 || month === 12 || month <= 3)) out.push("Warme Jacke / Layering", "Mütze/Handschuhe");

  // Reiseart
  if (tripType === "beach") out.push("Badesachen", "Badelatschen", "After-Sun");
  if (tripType === "city") out.push("Bequeme Schuhe", "Tagesrucksack", "Powerbank");
  if (tripType === "hiking") out.push("Wanderschuhe", "Regenjacke", "Trinkflasche", "Blasenpflaster");
  if (tripType === "ski") out.push("Thermounterwäsche", "Handwärmer", "Skibrille", "Sonnencreme (Schnee)");
  if (tripType === "roadtrip") out.push("Offline-Karten", "Kfz-Ladegerät", "Snacks/Wasser");
  if (tripType === "camping") out.push("Stirnlampe/Taschenlampe", "Mückenschutz", "Campingbesteck");

  // Transport
  if (mode === "flight") out.push("Reise-Kopien (offline)", "Kopfhörer");
  if (mode === "car") out.push("Tanken/Ladestopps planen", "Kleingeld für Parken/Maut");

  // Land (nur Reminder)
  const cc = (countryCode || "").toUpperCase();
  if (["GB","IE","MT","CY"].includes(cc)) out.push("Reiseadapter Typ G (UK)");
  if (["US","CA","MX"].includes(cc)) out.push("Reiseadapter Typ A/B (USA/Kanada)");
  if (["AU","NZ"].includes(cc)) out.push("Reiseadapter Typ I (AU/NZ)");
  if (cc === "CH") out.push("Steckeradapter Typ J (Schweiz)");

  if (mode === "car") {
    if (cc === "CH") out.push("Schweiz: Vignette prüfen");
    if (cc === "AT") out.push("Österreich: Vignette/Streckenmaut prüfen");
    if (cc === "FR") out.push("Frankreich: Umweltplakette (Crit’Air) prüfen");
    if (cc === "IT") out.push("Italien: ZTL-Zonen beachten");
  }

  if (cc && !EU_LIKE.has(cc)) out.push("Einreisebestimmungen/Visa prüfen (Nicht-EU)");

  // Hund
  if (withDog) {
    out.push(
      "EU-Heimtierausweis / Tierdokumente",
      "Hund: Leine + ggf. Maulkorb",
      "Kotbeutel",
      "Futter + Leckerlis",
      "Wasser & Napf",
      "Zeckenschutz/Flohschutz"
    );
    if (mode === "flight") out.push("Hundetransport/Box + Airline-Regeln prüfen");
    if (mode === "car") out.push("Hundegurt/Transportbox fürs Auto");
  }

  return uniqText(out);
}

function defaultPackItems(mode) {
  const general = [
    "Reisepass/Personalausweis",
    "Versicherung / Auslandsschutz",
    "EC-/Kreditkarte + Bargeld",
    "Handy + Ladekabel/Powerbank",
    "Medikamente / Reiseapotheke",
  ];

  const car = [
    "Führerschein + Fahrzeugschein",
    "Warnweste + Warndreieck",
    "Maut/Vignette (falls nötig)",
    "Navigation/Offline-Karten",
  ];

  const flight = [
    "Buchungsbestätigung/Boarding",
    "Handgepäck-Regeln prüfen",
    "Koffergewicht/Größe prüfen",
    "Flüssigkeiten (100ml) Beutel",
  ];

  const merged = mode === "flight" ? general.concat(flight) : general.concat(car);
  return merged.map((text) => ({ id: crypto.randomUUID(), text, done:false, custom:false }));
}

function normalizePackItemsForMode(mode, items) {
  // Nur Auto/Flug-Defaults „aufräumen“. Vorschläge bleiben Vorschläge.
  const carDefaults = new Set(defaultPackItems("car").map((x) => normKey(x.text)));
  const flightDefaults = new Set(defaultPackItems("flight").map((x) => normKey(x.text)));

  const dropSet = mode === "flight" ? carDefaults : flightDefaults;
  const keepSet = mode === "flight" ? flightDefaults : carDefaults;

  const out = [];
  const seen = new Set();

  for (const it of (items || []).map(ensurePackShape)) {
    const k = normKey(it.text);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);

    // nur falsche DEFAULTS entfernen (nicht „Strand/Ski“)
    if (dropSet.has(k) && !keepSet.has(k) && it.custom !== true) continue;

    out.push(it);
  }
  return out;
}

function renderPackList() {
  const wrap = $("packList");
  wrap.innerHTML = "";

  const items = editorPackItems || [];
  if (!items.length) {
    wrap.innerHTML = `<div class="muted">Keine Items.</div>`;
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "packitem";

    const left = document.createElement("div");
    left.className = "packleft";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.done;
    cb.addEventListener("change", () => {
      item.done = cb.checked;
      renderPackList();
    });

    const text = document.createElement("div");
    text.className = "packtext" + (item.done ? " done" : "");
    text.textContent = item.text;

    left.appendChild(cb);
    left.appendChild(text);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "packdel";
    del.textContent = "Löschen";
    del.addEventListener("click", () => {
      // wenn kein custom -> merken, damit Vorschläge nicht sofort zurückkommen
      if (item.custom !== true) editorRemovedSuggestions.add(normKey(item.text));
      editorPackItems = editorPackItems.filter((x) => x.id !== item.id);
      renderPackList();
    });

    row.appendChild(left);
    row.appendChild(del);
    wrap.appendChild(row);
  }
}

function addPackItemFromInput() {
  const inp = $("packNew");
  const val = (inp.value || "").trim();
  if (!val) return;

  editorPackItems.push({ id: crypto.randomUUID(), text: val, done:false, custom:true });
  inp.value = "";
  renderPackList();
}

/* ---------- Helpers ---------- */

function ensurePackShape(item) {
  return {
    id: item?.id || crypto.randomUUID(),
    text: String(item?.text || "").trim(),
    done: !!item?.done,
    custom: item?.custom === true,
  };
}

function safeMonth(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.getMonth() + 1;
}

function uniqText(arr) {
  const out = [];
  const seen = new Set();
  for (const t of arr) {
    const k = normKey(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function normKey(s) {
  return String(s || "").trim().toLowerCase();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[m]);
}
