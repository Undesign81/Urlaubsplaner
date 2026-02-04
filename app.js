const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "urlaub_trips_separate_v1";

const state = {
  trips: loadTrips(),
  countries: [],
  view: "list",          // list | detail | pack | info | edit
  navStack: ["list"],
  selectedId: null,
  mode: "car",           // editor transport
};

const climateCache = new Map(); // key -> {min,max}

init().catch((e) => {
  console.error(e);
  alert("Fehler beim Start. Bitte Seite neu laden.");
});

async function init() {
  bindNav();
  bindButtons();

  await loadCountries();
  fillCountrySelect();

  renderList();
  showView("list", false);
}

/* ---------------- Navigation (Bottom) ---------------- */

function bindNav() {
  $("navHome").addEventListener("click", () => {
    showView("list");
  });

  $("navBack").addEventListener("click", () => {
    if (state.navStack.length > 1) {
      state.navStack.pop();
      const prev = state.navStack[state.navStack.length - 1];
      state.view = prev;
      syncViews();
      renderCurrentView();
    } else {
      showView("list");
    }
  });

  $("navAdd").addEventListener("click", () => {
    openNewTrip();
  });
}

function showView(view, push = true) {
  state.view = view;
  if (push) {
    const last = state.navStack[state.navStack.length - 1];
    if (last !== view) state.navStack.push(view);
  }
  syncViews();
  renderCurrentView();
}

function syncViews() {
  const map = {
    list: "Übersicht",
    detail: "Reisedetails",
    pack: "Packliste",
    info: "Hinweise",
    edit: "Bearbeiten",
  };
  $("headerSub").textContent = map[state.view] || "";

  $("viewList").classList.toggle("hidden", state.view !== "list");
  $("viewDetail").classList.toggle("hidden", state.view !== "detail");
  $("viewPack").classList.toggle("hidden", state.view !== "pack");
  $("viewInfo").classList.toggle("hidden", state.view !== "info");
  $("viewEdit").classList.toggle("hidden", state.view !== "edit");

  $("navBack").disabled = state.navStack.length <= 1;
}

function renderCurrentView() {
  if (state.view === "list") renderList();
  if (state.view === "detail") renderDetail();
  if (state.view === "pack") renderPack();
  if (state.view === "info") renderInfo();
  // edit wird beim Öffnen gefüllt
}

/* ---------------- UI bindings ---------------- */

function bindButtons() {
  $("search").addEventListener("input", renderList);

  // Detail actions
  $("btnToPack").addEventListener("click", () => {
    if (!state.selectedId) return;
    showView("pack");
  });
  $("btnToInfo").addEventListener("click", () => {
    if (!state.selectedId) return;
    showView("info");
  });
  $("btnToEdit").addEventListener("click", () => {
    if (!state.selectedId) return;
    openEditTrip(getTrip(state.selectedId));
  });

  // Editor events
  ["country", "start", "end", "tripType", "withDog"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if (state.view === "edit") updateAirlineVisibility();
    });
  });

  document.querySelectorAll(".segbtn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("btnSave").addEventListener("click", saveTripFromEditor);
  $("btnDelete").addEventListener("click", deleteCurrentTrip);

  // Pack
  $("btnPackRefresh").addEventListener("click", () => {
    const t = getTrip(state.selectedId);
    if (!t) return;
    t.packItems = recalcPackItemsForTrip(t);
    persist();
    renderPack();
    renderList();
    renderDetail();
  });

  $("btnAddPack").addEventListener("click", addCustomPackItem);
  $("packNew").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addCustomPackItem();
  });
}

/* ---------------- Data helpers ---------------- */

function getTrip(id) {
  return state.trips.find((t) => t.id === id) || null;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trips));
}

function loadTrips() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return JSON.parse(v);

    // fallback legacy keys
    const legacy = ["urlaub_trips_clean_v1", "urlaub_trips_v7", "urlaub_trips_v6", "urlaub_trips_v5"];
    for (const k of legacy) {
      const x = localStorage.getItem(k);
      if (x) return JSON.parse(x);
    }
    return [];
  } catch {
    return [];
  }
}

/* ---------------- Countries ---------------- */

async function loadCountries() {
  try {
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
  } catch {
    state.countries = [];
  }
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

function countryName(code) {
  const c = state.countries.find((x) => x.cca2 === code);
  return c ? c.name : (code || "");
}

/* ---------------- LIST VIEW ---------------- */

function renderList() {
  const list = $("tripList");
  const empty = $("emptyTrips");
  const stats = $("listStats");

  list.innerHTML = "";

  const q = ($("search").value || "").trim().toLowerCase();
  const sorted = [...state.trips].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  const filtered = q
    ? sorted.filter((t) => {
        const name = countryName(t.countryCode);
        return `${t.title || ""} ${name}`.toLowerCase().includes(q);
      })
    : sorted;

  stats.textContent = filtered.length ? `${filtered.length} Reise(n)` : "";
  empty.style.display = filtered.length ? "none" : "block";

  for (const t of filtered) {
    const el = document.createElement("div");
    el.className = "trip";

    const range = [t.start, t.end].filter(Boolean).join(" – ");
    const modePill = t.mode === "flight" ? "✈️ Flug" : "🚗 Auto";
    const type = tripTypeLabel(t.tripType);
    const dog = t.withDog ? "🐶" : "";

    const p = packProgress(t);
    const prog = p.total ? `${p.done}/${p.total} gepackt` : "";

    el.innerHTML = `
      <div style="min-width:0">
        <div class="tripTitle">${escapeHtml(t.title || "Urlaub")}</div>
        <div class="tripSub">${escapeHtml(countryName(t.countryCode))}${range ? " · " + escapeHtml(range) : ""}</div>
        <div class="tripSub">${escapeHtml([type, dog, prog].filter(Boolean).join(" · "))}</div>
      </div>
      <div class="pill">${modePill}</div>
    `;

    el.addEventListener("click", () => {
      state.selectedId = t.id;
      showView("detail");
    });

    list.appendChild(el);
  }
}

/* ---------------- DETAIL VIEW ---------------- */

async function renderDetail() {
  const t = getTrip(state.selectedId);
  if (!t) {
    showView("list");
    return;
  }

  $("dTitle").textContent = t.title || "Urlaub";
  const range = [t.start, t.end].filter(Boolean).join(" – ");
  $("dSub").textContent = `${countryName(t.countryCode)}${range ? " · " + range : ""}`;

  const p = packProgress(t);
  $("dProgress").textContent = p.total ? `Packliste: ${p.done}/${p.total} erledigt` : "Packliste: —";

  $("dClimate").textContent = "🌡 Klimamittel werden geladen…";
  try {
    const climate = await loadClimateAverage(t.countryCode, t.start || t.end, t.end || t.start);
    $("dClimate").textContent = climate ? `🌡 Klimamittel: ${climate}` : "🌡 Klimamittel: —";
  } catch {
    $("dClimate").textContent = "🌡 Klimamittel: —";
  }
}

/* ---------------- EDIT VIEW ---------------- */

function openNewTrip() {
  state.selectedId = null;
  state.mode = "car";

  fillEditor({
    id: null,
    title: "",
    countryCode: "",
    start: "",
    end: "",
    tripType: "city",
    withDog: false,
    mode: "car",
    airline: "",
    notes: "",
    removedSuggestions: [],
    packItems: defaultPackItems("car"),
  });

  showView("edit");
}

function openEditTrip(t) {
  if (!t) return;
  state.mode = t.mode || "car";
  fillEditor(t);
  showView("edit");
}

function fillEditor(t) {
  $("eTitle").textContent = t.id ? "Reise bearbeiten" : "Neue Reise";

  $("title").value = t.title || "";
  $("country").value = t.countryCode || "";
  $("start").value = t.start || "";
  $("end").value = t.end || "";
  $("tripType").value = t.tripType || "city";
  $("withDog").value = t.withDog ? "yes" : "no";
  $("notes").value = t.notes || "";
  $("airline").value = t.airline || "";

  setMode(state.mode);
  updateAirlineVisibility();
}

function updateAirlineVisibility() {
  $("airlineWrap").classList.toggle("hidden", state.mode !== "flight");
}

function setMode(mode) {
  state.mode = mode === "flight" ? "flight" : "car";
  document.querySelectorAll(".segbtn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === state.mode);
  });
  updateAirlineVisibility();
}

function saveTripFromEditor() {
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

  const existing = state.selectedId ? getTrip(state.selectedId) : null;

  const base = existing || {
    id: crypto.randomUUID(),
    removedSuggestions: [],
    packItems: defaultPackItems(state.mode),
  };

  const updated = {
    ...base,
    title: title || "Urlaub",
    countryCode,
    start,
    end,
    tripType,
    withDog,
    mode: state.mode,
    airline: state.mode === "flight" ? airline : "",
    notes,
    updatedAt: new Date().toISOString(),
  };

  // Packliste neu berechnen, aber Done/Custom behalten
  updated.packItems = recalcPackItemsForTrip(updated);

  if (existing) {
    const idx = state.trips.findIndex((x) => x.id === existing.id);
    state.trips[idx] = updated;
  } else {
    state.trips.push(updated);
  }

  persist();
  state.selectedId = updated.id;

  renderList();
  showView("detail");
}

function deleteCurrentTrip() {
  if (!state.selectedId) {
    showView("list");
    return;
  }
  if (!confirm("Diese Reise wirklich löschen?")) return;

  state.trips = state.trips.filter((t) => t.id !== state.selectedId);
  persist();

  state.selectedId = null;
  renderList();
  showView("list");
}

/* ---------------- PACK VIEW ---------------- */

function renderPack() {
  const t = getTrip(state.selectedId);
  if (!t) {
    showView("list");
    return;
  }

  const list = $("packList");
  list.innerHTML = "";

  if (!Array.isArray(t.packItems) || !t.packItems.length) {
    t.packItems = recalcPackItemsForTrip(t);
    persist();
  }

  const p = packProgress(t);
  $("pProgress").textContent = p.total ? `${p.done} von ${p.total} erledigt` : "—";

  for (const item of t.packItems) {
    const row = document.createElement("div");
    row.className = "packItem";

    const left = document.createElement("div");
    left.className = "packLeft";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.done;
    cb.addEventListener("change", () => {
      item.done = cb.checked;
      persist();
      renderPack();
      renderList();
      renderDetail();
    });

    const text = document.createElement("div");
    text.className = "packText" + (item.done ? " done" : "");
    text.textContent = item.text;

    left.appendChild(cb);
    left.appendChild(text);

    const del = document.createElement("button");
    del.className = "packDel";
    del.type = "button";
    del.textContent = "Löschen";
    del.addEventListener("click", () => {
      if (!item.custom) {
        const k = normKey(item.text);
        if (!Array.isArray(t.removedSuggestions)) t.removedSuggestions = [];
        if (!t.removedSuggestions.includes(k)) t.removedSuggestions.push(k);
      }
      t.packItems = t.packItems.filter((x) => x.id !== item.id);
      persist();
      renderPack();
      renderList();
      renderDetail();
    });

    row.appendChild(left);
    row.appendChild(del);
    list.appendChild(row);
  }
}

function addCustomPackItem() {
  const t = getTrip(state.selectedId);
  if (!t) return;

  const val = ($("packNew").value || "").trim();
  if (!val) return;

  if (!Array.isArray(t.packItems)) t.packItems = [];
  t.packItems.push({
    id: crypto.randomUUID(),
    text: val,
    done: false,
    custom: true,
  });

  $("packNew").value = "";
  persist();
  renderPack();
  renderList();
  renderDetail();
}

function packProgress(t) {
  const items = Array.isArray(t.packItems) ? t.packItems : [];
  const total = items.length;
  const done = items.filter((x) => x.done).length;
  return { done, total };
}

/* ---------------- INFO VIEW ---------------- */

function renderInfo() {
  const t = getTrip(state.selectedId);
  if (!t) {
    showView("list");
    return;
  }

  const blocks = [];
  blocks.push(`<b>${escapeHtml(countryName(t.countryCode))}</b> · ${escapeHtml([t.start,t.end].filter(Boolean).join(" – "))}`);

  blocks.push(`<br><br><b>Allgemein</b><ul>
    <li>Dokumente prüfen (Gültigkeit, Kopien)</li>
    <li>Versicherung/Notfallnummern</li>
    <li>Zahlungsmittel & Adapter</li>
  </ul>`);

  if (t.mode === "car") {
    blocks.push(`<b>Auto</b><ul>
      <li>Maut/Vignette prüfen</li>
      <li>Umweltzonen/City-Maut prüfen</li>
      <li>Pflichtausrüstung prüfen</li>
    </ul>`);
  } else {
    blocks.push(`<b>Flug</b><ul>
      <li>Gepäckregeln prüfen${t.airline ? " (" + escapeHtml(t.airline) + ")" : ""}</li>
      <li>Flüssigkeiten/Powerbanks beachten</li>
      <li>Check-in Zeiten</li>
    </ul>`);
  }

  if (t.withDog) {
    blocks.push(`<b>🐶 Hund</b><ul>
      ${dogTravelHints(t.countryCode).map(x => `<li>${escapeHtml(x)}</li>`).join("")}
    </ul>`);
  }

  if (t.notes) {
    blocks.push(`<b>Notizen</b><div style="margin-top:6px">${escapeHtml(t.notes).replace(/\n/g,"<br>")}</div>`);
  }

  $("infoBox").innerHTML = blocks.join("");
}

/* ---------------- Pack Suggestions ---------------- */

function recalcPackItemsForTrip(t) {
  const removed = new Set((t.removedSuggestions || []).map(String));

  const current = Array.isArray(t.packItems) ? t.packItems.map(ensurePackShape) : [];
  const customs = current.filter((x) => x.custom === true);

  const doneMap = new Map(current.map((x) => [normKey(x.text), !!x.done]));

  const base = defaultPackItems(t.mode || "car");
  const month = (t.start || t.end) ? safeMonth(t.start || t.end) : null;

  const suggTexts = suggestedPackTexts(t.countryCode, t.tripType, t.withDog, month, t.mode || "car")
    .filter((txt) => !removed.has(normKey(txt)));

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
      custom: !!it.custom,
    });
  };

  base.forEach(push);
  suggTexts.forEach((txt) => push({ text: txt, done: false, custom: false }));
  customs.forEach(push);

  return merged;
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
  return merged.map((text) => ({ id: crypto.randomUUID(), text, done: false, custom: false }));
}

function suggestedPackTexts(countryCode, tripType, withDog, month, mode) {
  const out = [];

  // Saison
  if (month != null && month >= 5 && month <= 9) out.push("Sonnencreme", "Sonnenbrille/Kappe");
  if (month != null && (month === 11 || month === 12 || month <= 3)) out.push("Warme Jacke / Layering", "Mütze/Handschuhe");

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

  // Land (Adapter + Auto-Reminder)
  const cc = (countryCode || "").toUpperCase();
  if (["GB", "IE", "MT", "CY"].includes(cc)) out.push("Reiseadapter Typ G (UK)");
  if (["US", "CA", "MX"].includes(cc)) out.push("Reiseadapter Typ A/B (USA/Kanada)");
  if (["AU", "NZ"].includes(cc)) out.push("Reiseadapter Typ I (AU/NZ)");
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

function dogTravelHints(cc) {
  cc = (cc || "").toUpperCase();
  const hints = [];
  if (EU_LIKE.has(cc)) {
    hints.push("EU-Heimtierausweis / Mikrochip / Tollwutimpfung prüfen");
    hints.push("Leinen-/Maulkorbpflicht (Land/ÖPNV) prüfen");
  } else {
    hints.push("Einreisebestimmungen für Haustiere prüfen (Dokumente/Tests/ggf. Quarantäne)");
  }
  if (["GB", "IE", "NO", "CH"].includes(cc)) hints.push("Land kann Sonderregeln haben: Anforderungen vorher checken");
  hints.push("Tierarzt-Check vor Reise (bei langer Fahrt/Flug)");
  return hints;
}

const EU_LIKE = new Set([
  "DE","AT","CH","FR","IT","ES","NL","BE","LU","DK","SE","NO","FI","IS","IE","PT","GR",
  "CZ","PL","SK","HU","SI","HR","RO","BG","LT","LV","EE","CY","MT"
]);

/* ---------------- Climate averages ---------------- */

async function loadClimateAverage(countryCode, startStr, endStr) {
  if (!countryCode || !startStr) return "";
  const c = state.countries.find((x) => x.cca2 === countryCode);
  if (!c || c.lat == null || c.lon == null) return "";

  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

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
    `&models=MPI_ESM1_2_XR&daily=temperature_2m_min,temperature_2m_max&timezone=auto`;

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

/* ---------------- Utils ---------------- */

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
