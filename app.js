const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "urlaub_trips_citytemp_autocomplete_v1";

const state = {
  trips: loadTrips(),
  countries: [],
  view: "list",
  navStack: ["list"],
  selectedId: null,
  mode: "car",
  cityPick: null,            // {name, lat, lon, admin1, country}
  cityReqToken: 0,
};

const geoCache = new Map();   // key -> {lat,lon,name}
const histCache = new Map();  // key -> array of daily max temps
const avgCache = new Map();   // key -> avg number

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
  $("navHome").addEventListener("click", () => showView("list"));

  $("navBack").addEventListener("click", () => {
    if (state.navStack.length > 1) {
      state.navStack.pop();
      state.view = state.navStack[state.navStack.length - 1];
      syncViews();
      renderCurrentView();
    } else {
      showView("list");
    }
  });

  $("navAdd").addEventListener("click", openNewTrip);
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
}

/* ---------------- UI bindings ---------------- */

function bindButtons() {
  $("search").addEventListener("input", renderList);

  $("btnToPack").addEventListener("click", () => state.selectedId && showView("pack"));
  $("btnToInfo").addEventListener("click", () => state.selectedId && showView("info"));
  $("btnToEdit").addEventListener("click", () => {
    if (!state.selectedId) return;
    openEditTrip(getTrip(state.selectedId));
  });

  // Transport toggle
  document.querySelectorAll(".segbtn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  // Editor actions
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
  $("packNew").addEventListener("keydown", (e) => e.key === "Enter" && addCustomPackItem());

  // City autocomplete
  const cityInput = $("city");
  const suggestBox = $("citySuggest");

  // hide suggestions on outside click
  document.addEventListener("click", (e) => {
    if (!suggestBox) return;
    if (suggestBox.contains(e.target) || cityInput.contains(e.target)) return;
    hideCitySuggest();
  });

  // Country change: clear city pick and refresh hint
  $("country").addEventListener("change", () => {
    state.cityPick = null;
    $("city").value = "";
    $("cityHint").textContent = "";
    hideCitySuggest();
  });

  cityInput.addEventListener("input", debounce(async () => {
    await onCityInput();
  }, 220));

  cityInput.addEventListener("focus", () => {
    // if already typed, show again
    if (($("city").value || "").trim().length >= 2) onCityInput();
  });

  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideCitySuggest();
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

    const legacy = [
      "urlaub_trips_citytemp_autocomplete_v0",
      "urlaub_trips_citytemp_v2",
      "urlaub_trips_citytemp_v1",
      "urlaub_trips_separate_v3",
      "urlaub_trips_separate_v2",
      "urlaub_trips_separate_v1",
    ];
    for (const k of legacy) {
      const x = localStorage.getItem(k);
      if (x) return JSON.parse(x);
    }
    return [];
  } catch {
    return [];
  }
}

/* ---------------- Countries (robust) ---------------- */

async function loadCountries() {
  // 1) Intl.supportedValuesOf (falls verfügbar)
  try {
    if (Intl && typeof Intl.supportedValuesOf === "function") {
      const regions = Intl.supportedValuesOf("region");
      const dn = new Intl.DisplayNames(["de"], { type: "region" });

      const list = regions
        .filter((code) => /^[A-Z]{2}$/.test(code))
        .map((code) => ({ cca2: code, name: dn.of(code) || code }))
        .filter((x) => x.name && x.name !== x.cca2)
        .sort((a, b) => a.name.localeCompare(b.name, "de"));

      if (list.length >= 150) {
        state.countries = list;
        return;
      }
    }
  } catch {}

  // 2) RestCountries
  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
    if (res.ok) {
      const data = await res.json();
      const list = (Array.isArray(data) ? data : [])
        .filter((x) => x?.cca2 && x?.name?.common)
        .map((x) => ({ cca2: x.cca2, name: x.name.common }))
        .sort((a, b) => a.name.localeCompare(b.name, "de"));
      if (list.length) {
        state.countries = list;
        return;
      }
    }
  } catch {}

  // 3) Fallback (garantiert)
  state.countries = FALLBACK_COUNTRIES_DE.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
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
  if (!code) return "";
  const c = state.countries.find((x) => x.cca2 === code);
  if (c?.name) return c.name;
  try {
    const dn = new Intl.DisplayNames(["de"], { type: "region" });
    return dn.of(code) || code;
  } catch {
    return code;
  }
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
    ? sorted.filter((t) => `${t.title || ""} ${countryName(t.countryCode)} ${t.city || ""}`.toLowerCase().includes(q))
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
    const city = (t.city || "").trim();

    const p = packProgress(t);
    const prog = p.total ? `${p.done}/${p.total} gepackt` : "";

    el.innerHTML = `
      <div style="min-width:0">
        <div class="tripTitle">${escapeHtml(t.title || "Urlaub")}</div>
        <div class="tripSub">${escapeHtml(countryName(t.countryCode))}${city ? " · " + escapeHtml(city) : ""}${range ? " · " + escapeHtml(range) : ""}</div>
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
  if (!t) return showView("list");

  $("dTitle").textContent = t.title || "Urlaub";

  const range = [t.start, t.end].filter(Boolean).join(" – ");
  const city = (t.city || "").trim();
  $("dSub").textContent = `${countryName(t.countryCode)}${city ? " · " + city : ""}${range ? " · " + range : ""}`;

  const p = packProgress(t);
  $("dProgress").textContent = p.total ? `Packliste: ${p.done}/${p.total} erledigt` : "Packliste: —";

  if (!t.start) {
    $("dClimate").textContent = "🌡 Ø tagsüber: bitte Startdatum setzen";
    return;
  }

  $("dClimate").textContent = "🌡 Ø tagsüber wird geladen…";
  try {
    const avg = await loadDaytimeAvgMaxForTrip(t, t.start, t.end || t.start);
    $("dClimate").textContent = Number.isFinite(avg) ? `🌡 Ø tagsüber: ${Math.round(avg)}°C` : "🌡 Ø tagsüber: nicht gefunden";
  } catch (e) {
    console.error(e);
    $("dClimate").textContent = "🌡 Ø tagsüber: Fehler beim Laden";
  }
}

/* ---------------- EDIT VIEW ---------------- */

function openNewTrip() {
  state.selectedId = null;
  state.mode = "car";
  state.cityPick = null;
  hideCitySuggest();

  fillEditor({
    id: null,
    title: "",
    countryCode: "",
    city: "",
    cityLat: null,
    cityLon: null,
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
  state.cityPick = null;
  hideCitySuggest();
  fillEditor(t);
  showView("edit");
}

function fillEditor(t) {
  $("eTitle").textContent = t.id ? "Reise bearbeiten" : "Neue Reise";

  $("title").value = t.title || "";
  $("country").value = t.countryCode || "";
  $("city").value = t.city || "";
  $("start").value = t.start || "";
  $("end").value = t.end || "";
  $("tripType").value = t.tripType || "city";
  $("withDog").value = t.withDog ? "yes" : "no";
  $("notes").value = t.notes || "";
  $("airline").value = t.airline || "";

  $("cityHint").textContent = t.cityLat && t.cityLon ? `Gespeichert: ${Math.round(t.cityLat*100)/100}, ${Math.round(t.cityLon*100)/100}` : "";

  setMode(state.mode);
  updateAirlineVisibility();
}

function updateAirlineVisibility() {
  $("airlineWrap").classList.toggle("hidden", state.mode !== "flight");
}

function setMode(mode) {
  state.mode = mode === "flight" ? "flight" : "car";
  document.querySelectorAll(".segbtn").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
  updateAirlineVisibility();
}

function saveTripFromEditor() {
  const title = ($("title").value || "").trim();
  const countryCode = $("country").value;
  const city = ($("city").value || "").trim();
  const start = $("start").value;
  const end = $("end").value;
  const tripType = $("tripType").value;
  const withDog = $("withDog").value === "yes";
  const notes = ($("notes").value || "").trim();
  const airline = ($("airline").value || "").trim();

  if (!countryCode) return alert("Bitte ein Land auswählen.");

  const existing = state.selectedId ? getTrip(state.selectedId) : null;

  const base = existing || {
    id: crypto.randomUUID(),
    removedSuggestions: [],
    packItems: defaultPackItems(state.mode),
  };

  // Wenn Stadt manuell geändert wurde, aber kein Pick erfolgt: Koordinaten löschen -> neu suchen beim Anzeigen
  const picked = state.cityPick && state.cityPick.name && city && normKey(state.cityPick.name) === normKey(city);

  const updated = {
    ...base,
    title: title || "Urlaub",
    countryCode,
    city,
    cityLat: picked ? state.cityPick.lat : (existing?.city === city ? existing?.cityLat : null),
    cityLon: picked ? state.cityPick.lon : (existing?.city === city ? existing?.cityLon : null),
    start,
    end,
    tripType,
    withDog,
    mode: state.mode,
    airline: state.mode === "flight" ? airline : "",
    notes,
    updatedAt: new Date().toISOString(),
  };

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
  if (!state.selectedId) return showView("list");
  if (!confirm("Diese Reise wirklich löschen?")) return;

  state.trips = state.trips.filter((t) => t.id !== state.selectedId);
  persist();

  state.selectedId = null;
  renderList();
  showView("list");
}

/* ---------------- City autocomplete ---------------- */

async function onCityInput() {
  const countryCode = $("country").value;
  const q = ($("city").value || "").trim();

  state.cityPick = null;
  $("cityHint").textContent = "";

  if (!countryCode) {
    showCitySuggestEmpty("Bitte zuerst ein Land auswählen.");
    return;
  }

  if (q.length < 2) {
    hideCitySuggest();
    return;
  }

  const token = ++state.cityReqToken;
  showCitySuggestEmpty("Suche…");

  try {
    const results = await geocodeCitySuggestions(q, countryCode, 6);
    if (token !== state.cityReqToken) return; // outdated request

    if (!results.length) {
      showCitySuggestEmpty("Keine Treffer. Tipp: sieh nach Schreibweise (z. B. 'Split').");
      return;
    }

    renderCitySuggest(results);
  } catch (e) {
    console.error(e);
    showCitySuggestEmpty("Fehler beim Laden der Vorschläge.");
  }
}

async function geocodeCitySuggestions(query, countryCode, limit = 6) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=${limit}&language=de&format=json&countryCode=${encodeURIComponent(countryCode)}`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const arr = Array.isArray(data?.results) ? data.results : [];

  // Sort: prefer higher population if exists, else keep
  arr.sort((a, b) => (b.population || 0) - (a.population || 0));

  return arr.map((r) => ({
    name: r.name,
    admin1: r.admin1 || "",
    country: r.country || "",
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function renderCitySuggest(items) {
  const box = $("citySuggest");
  box.innerHTML = "";

  for (const it of items) {
    const row = document.createElement("div");
    row.className = "suggestItem";
    row.innerHTML = `
      <span>${escapeHtml(it.name)}</span>
      <span class="mutedLine">${escapeHtml([it.admin1, it.country].filter(Boolean).join(" · "))}</span>
    `;
    row.addEventListener("click", () => {
      $("city").value = it.name;
      state.cityPick = it; // store coords for save
      $("cityHint").textContent = `Ausgewählt: ${it.name} (${Math.round(it.lat*100)/100}, ${Math.round(it.lon*100)/100})`;
      hideCitySuggest();
    });
    box.appendChild(row);
  }

  box.classList.remove("hidden");
}

function showCitySuggestEmpty(text) {
  const box = $("citySuggest");
  box.innerHTML = `<div class="suggestEmpty">${escapeHtml(text)}</div>`;
  box.classList.remove("hidden");
}

function hideCitySuggest() {
  const box = $("citySuggest");
  if (!box) return;
  box.classList.add("hidden");
  box.innerHTML = "";
}

/* ---------------- PACK VIEW ---------------- */

function renderPack() {
  const t = getTrip(state.selectedId);
  if (!t) return showView("list");

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
  t.packItems.push({ id: crypto.randomUUID(), text: val, done: false, custom: true });

  $("packNew").value = "";
  persist();
  renderPack();
  renderList();
  renderDetail();
}

function packProgress(t) {
  const items = Array.isArray(t.packItems) ? t.packItems : [];
  return { total: items.length, done: items.filter((x) => x.done).length };
}

/* ---------------- INFO VIEW ---------------- */

function renderInfo() {
  const t = getTrip(state.selectedId);
  if (!t) return showView("list");

  const blocks = [];
  blocks.push(`<b>${escapeHtml(countryName(t.countryCode))}${t.city ? " · " + escapeHtml(t.city) : ""}</b> · ${escapeHtml([t.start, t.end].filter(Boolean).join(" – "))}`);

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
      ${dogTravelHints(t.countryCode).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
    </ul>`);
  }

  if (t.notes) {
    blocks.push(`<b>Notizen</b><div style="margin-top:6px">${escapeHtml(t.notes).replace(/\n/g, "<br>")}</div>`);
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

  if (month != null && month >= 5 && month <= 9) out.push("Sonnencreme", "Sonnenbrille/Kappe");
  if (month != null && (month === 11 || month === 12 || month <= 3)) out.push("Warme Jacke / Layering", "Mütze/Handschuhe");

  if (tripType === "beach") out.push("Badesachen", "Badelatschen", "After-Sun");
  if (tripType === "city") out.push("Bequeme Schuhe", "Tagesrucksack", "Powerbank");
  if (tripType === "hiking") out.push("Wanderschuhe", "Regenjacke", "Trinkflasche", "Blasenpflaster");
  if (tripType === "ski") out.push("Thermounterwäsche", "Handwärmer", "Skibrille", "Sonnencreme (Schnee)");
  if (tripType === "roadtrip") out.push("Offline-Karten", "Kfz-Ladegerät", "Snacks/Wasser");
  if (tripType === "camping") out.push("Stirnlampe/Taschenlampe", "Mückenschutz", "Campingbesteck");

  if (mode === "flight") out.push("Reise-Kopien (offline)", "Kopfhörer");
  if (mode === "car") out.push("Tanken/Ladestopps planen", "Kleingeld für Parken/Maut");

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
  const m = { city: "Stadt", beach: "Strand", hiking: "Natur", ski: "Ski", roadtrip: "Roadtrip", camping: "Camping" };
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

/* ---------------- Temperature: ONLY avg daytime (daily max) ---------------- */

async function loadDaytimeAvgMaxForTrip(trip, startStr, endStr) {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NaN;

  const s = start <= end ? start : end;
  const e = start <= end ? end : start;

  // coords: prefer stored city coords, else geocode
  let coords = null;
  if (Number.isFinite(trip.cityLat) && Number.isFinite(trip.cityLon)) {
    coords = { lat: trip.cityLat, lon: trip.cityLon };
  } else {
    coords = await getCoordsFromCityOrCountry(trip.countryCode, trip.city);
  }
  if (!coords) return NaN;

  const cacheKey = `${coords.lat}|${coords.lon}|${toMD(s)}|${toMD(e)}|last10`;
  if (avgCache.has(cacheKey)) return avgCache.get(cacheKey);

  const nowY = new Date().getFullYear();
  const endYear = nowY - 1;
  const startYear = endYear - 9;

  let sum = 0;
  let n = 0;

  for (let y = startYear; y <= endYear; y++) {
    const yearStart = buildDateYMD(y, s.getMonth() + 1, s.getDate());
    const yearEnd = buildDateYMD(y, e.getMonth() + 1, e.getDate());

    if (yearEnd < yearStart) {
      const a1 = await fetchDailyMax(coords.lat, coords.lon, yearStart, buildDateYMD(y, 12, 31));
      const a2 = await fetchDailyMax(coords.lat, coords.lon, buildDateYMD(y + 1, 1, 1), yearEnd);
      for (const v of [...a1, ...a2]) if (Number.isFinite(v)) { sum += v; n++; }
    } else {
      const arr = await fetchDailyMax(coords.lat, coords.lon, yearStart, yearEnd);
      for (const v of arr) if (Number.isFinite(v)) { sum += v; n++; }
    }
  }

  const avg = n ? (sum / n) : NaN;
  avgCache.set(cacheKey, avg);
  return avg;
}

async function fetchDailyMax(lat, lon, startDate, endDate) {
  const s = toISODate(startDate);
  const e = toISODate(endDate);
  const key = `${lat}|${lon}|${s}|${e}|tmax`;
  if (histCache.has(key)) return histCache.get(key);

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&start_date=${s}&end_date=${e}` +
    `&daily=temperature_2m_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) { histCache.set(key, []); return []; }

  const data = await res.json();
  const arr = (data?.daily?.temperature_2m_max || []).map(Number);
  histCache.set(key, arr);
  return arr;
}

async function getCoordsFromCityOrCountry(countryCode, city) {
  const cityClean = (city || "").trim();
  if (cityClean) {
    // try with country filter
    let r = await geocodeOne(cityClean, countryCode, true);
    // fallback without filter
    if (!r) r = await geocodeOne(cityClean, countryCode, false);
    if (r) return { lat: r.latitude, lon: r.longitude };
  }
  // fallback country
  const name = countryName(countryCode);
  if (!name) return null;
  let r2 = await geocodeOne(name, countryCode, true);
  if (!r2) r2 = await geocodeOne(name, countryCode, false);
  if (!r2) return null;
  return { lat: r2.latitude, lon: r2.longitude };
}

async function geocodeOne(name, countryCode, withFilter) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}` +
    `&count=1&language=de&format=json` +
    (withFilter ? `&countryCode=${encodeURIComponent(countryCode)}` : "");

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.results?.[0] || null;
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

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function toMD(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${m}-${da}`;
}

function buildDateYMD(year, month, day) {
  return new Date(year, month - 1, day);
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ---------------- Fallback Countries (DE) ---------------- */
const FALLBACK_COUNTRIES_DE = [
  { cca2: "DE", name: "Deutschland" },
  { cca2: "AT", name: "Österreich" },
  { cca2: "CH", name: "Schweiz" },
  { cca2: "HR", name: "Kroatien" },
  { cca2: "IT", name: "Italien" },
  { cca2: "ES", name: "Spanien" },
  { cca2: "FR", name: "Frankreich" },
  { cca2: "GR", name: "Griechenland" },
  { cca2: "PT", name: "Portugal" },
  { cca2: "NL", name: "Niederlande" },
  { cca2: "BE", name: "Belgien" },
  { cca2: "DK", name: "Dänemark" },
  { cca2: "SE", name: "Schweden" },
  { cca2: "NO", name: "Norwegen" },
  { cca2: "FI", name: "Finnland" },
  { cca2: "PL", name: "Polen" },
  { cca2: "CZ", name: "Tschechien" },
  { cca2: "HU", name: "Ungarn" },
  { cca2: "SI", name: "Slowenien" },
  { cca2: "SK", name: "Slowakei" },
  { cca2: "RO", name: "Rumänien" },
  { cca2: "BG", name: "Bulgarien" },
  { cca2: "TR", name: "Türkei" },
  { cca2: "GB", name: "Vereinigtes Königreich" },
  { cca2: "IE", name: "Irland" },
  { cca2: "US", name: "USA" },
  { cca2: "CA", name: "Kanada" },
  { cca2: "MX", name: "Mexiko" },
  { cca2: "AE", name: "Vereinigte Arabische Emirate" },
  { cca2: "TH", name: "Thailand" },
  { cca2: "JP", name: "Japan" },
  { cca2: "AU", name: "Australien" },
  { cca2: "NZ", name: "Neuseeland" },
];
