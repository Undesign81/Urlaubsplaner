const $ = (id) => document.getElementById(id);

const state = {
  trips: loadTrips(),
  editingId: null,
  mode: "car",
  countries: [], // { cca2, name, lat, lon }
};

let editorPackItems = [];
let editorRemovedSuggestions = new Set(); // Texte (lowercase) die bewusst entfernt wurden

init();

async function init() {
  bindUI();
  renderTrips();

  await loadCountries();
  fillCountrySelect();

  setMode("car");
}

function bindUI() {
  $("btnAdd").addEventListener("click", () => openEditor());
  $("btnClose").addEventListener("click", closeEditor);
  $("btnSave").addEventListener("click", saveTrip);
  $("btnDelete").addEventListener("click", deleteTrip);

  ["start", "end", "country", "tripType"].forEach((id) => {
    $(id).addEventListener("change", () => {
      refreshAdvice();
      recalcPackList();
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
  $("editor").classList.remove("hidden");

  if (!trip) {
    state.editingId = null;
    $("editorTitle").textContent = "Neue Reise";
    $("title").value = "";
    $("country").value = "";
    $("start").value = "";
    $("end").value = "";
    $("tripType").value = "city";
    $("notes").value = "";
    $("airline").value = "";
    $("btnDelete").classList.add("hidden");

    editorRemovedSuggestions = new Set();
    setMode("car");

    editorPackItems = defaultPackItems(state.mode);
    recalcPackList();
  } else {
    state.editingId = trip.id;
    $("editorTitle").textContent = "Reise bearbeiten";
    $("title").value = trip.title || "";
    $("country").value = trip.countryCode || "";
    $("start").value = trip.start || "";
    $("end").value = trip.end || "";
    $("tripType").value = trip.tripType || "city";
    $("notes").value = trip.notes || "";
    $("airline").value = trip.airline || "";
    $("btnDelete").classList.remove("hidden");

    setMode(trip.mode || "car");

    editorRemovedSuggestions = new Set(
      Array.isArray(trip.removedSuggestions) ? trip.removedSuggestions : []
    );

    const packRaw =
      Array.isArray(trip.packItems) && trip.packItems.length
        ? trip.packItems.map(ensurePackShape)
        : defaultPackItems(state.mode);

    editorPackItems = normalizePackItemsForMode(state.mode, packRaw);
    recalcPackList();
  }

  refreshAdvice();
}

function closeEditor() {
  $("editor").classList.add("hidden");
}

function setMode(mode) {
  state.mode = mode === "flight" ? "flight" : "car";

  document.querySelectorAll(".segbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === state.mode)
  );

  $("airlineWrap").classList.toggle("hidden", state.mode !== "flight");

  const editorOpen =
    document.getElementById("editor") &&
    !document.getElementById("editor").classList.contains("hidden");

  if (editorOpen) {
    editorPackItems = normalizePackItemsForMode(state.mode, editorPackItems);
    recalcPackList();
  }

  refreshAdvice();
}

/* ---------------- Übersicht ---------------- */

function renderTrips() {
  const wrap = $("tripList");
  wrap.innerHTML = "";
  $("emptyTrips").classList.toggle("hidden", state.trips.length !== 0);

  const sorted = [...state.trips].sort((a, b) =>
    (a.start || "").localeCompare(b.start || "")
  );

  for (const t of sorted) {
    const el = document.createElement("div");
    el.className = "item";

    const openInfo = buildOpenPackInfo(t);
    const typeLabel = tripTypeLabel(t.tripType);

    el.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(t.title || "Reise")}</div>
        <div class="sub">${escapeHtml(fmtTripSub(t))}${typeLabel ? " · " + escapeHtml(typeLabel) : ""}</div>
        ${openInfo ? `<div class="sub">${escapeHtml(openInfo)}</div>` : ``}
      </div>
      <div class="sub">${t.mode === "flight" ? "✈️" : "🚗"}</div>
    `;

    el.addEventListener("click", () => openEditor(t));
    wrap.appendChild(el);
  }
}

function buildOpenPackInfo(trip) {
  const items = Array.isArray(trip.packItems) ? trip.packItems.map(ensurePackShape) : [];
  if (!items.length) return "";

  const open = items.filter((x) => !x.done);
  if (!open.length) return "✅ Alles erledigt (Packliste)";

  const names = open.slice(0, 3).map((x) => x.text);
  const more = open.length > 3 ? ` +${open.length - 3} mehr` : "";
  return `Offen: ${open.length} – ${names.join(", ")}${more}`;
}

function fmtTripSub(t) {
  const c = state.countries.find((x) => x.cca2 === t.countryCode);
  const name = c ? c.name : t.countryCode || "";
  const range = [t.start, t.end].filter(Boolean).join(" – ");
  return `${name}${range ? " · " + range : ""}`;
}

function tripTypeLabel(v) {
  const m = {
    city: "Städtetrip",
    beach: "Strand",
    hiking: "Wandern/Natur",
    ski: "Ski/Winter",
    roadtrip: "Roadtrip",
    camping: "Camping",
  };
  return m[v] || "";
}

/* ---------------- Länder ---------------- */

async function loadCountries() {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,capitalInfo,latlng"
    );
    const data = await res.json();

    state.countries = data
      .filter((x) => x.cca2 && x.name && x.name.common)
      .map((x) => {
        const ll =
          (x.capitalInfo &&
            Array.isArray(x.capitalInfo.latlng) &&
            x.capitalInfo.latlng.length === 2)
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

/* ---------------- Speichern / Laden ---------------- */

function saveTrip() {
  const title = $("title").value.trim();
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const tripType = $("tripType").value;
  const notes = $("notes").value.trim();
  const airline = ($("airline").value || "").trim();

  if (!countryCode) {
    alert("Bitte ein Land auswählen.");
    return;
  }

  recalcPackList();

  const trip = {
    id: state.editingId || crypto.randomUUID(),
    title: title || "Urlaub",
    countryCode,
    start,
    end,
    tripType,
    mode: state.mode,
    airline: state.mode === "flight" ? airline : "",
    notes,
    packItems: normalizePackItemsForMode(state.mode, editorPackItems),
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
  localStorage.setItem("urlaub_trips_v6", JSON.stringify(state.trips));
}

function loadTrips() {
  try {
    const v6 = localStorage.getItem("urlaub_trips_v6");
    if (v6) return JSON.parse(v6);

    const v5 = localStorage.getItem("urlaub_trips_v5");
    if (v5) return JSON.parse(v5);

    const v4 = localStorage.getItem("urlaub_trips_v4");
    if (v4) return JSON.parse(v4);

    return [];
  } catch {
    return [];
  }
}

/* ---------------- Hinweise ---------------- */

async function refreshAdvice() {
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const airline = ($("airline").value || "").trim();

  const c = state.countries.find((x) => x.cca2 === countryCode);
  const countryName = c ? c.name : countryCode;

  const box = $("advice");
  if (!countryCode) {
    box.innerHTML = `<p class="muted">Wähle ein Land, dann erscheinen die Hinweise.</p>`;
    return;
  }

  const general = [
    "Reisepass/Personalausweis prüfen (Gültigkeit, Kopie)",
    "Auslandskrankenversicherung / Notfallnummern",
    "Zahlungsmittel (Karte/Bargeld), Adapter/Stecker",
  ];

  const transport =
    state.mode === "car"
      ? [
          "Maut/Vignette im Zielland prüfen",
          "Umweltzonen/City-Maut prüfen (falls Stadtfahrt)",
          "Pflichtausrüstung (Warnweste, Warndreieck etc.) prüfen",
        ]
      : [
          "Einreise-/Dokumentencheck (je nach Route/Stopps)",
          `Gepäckregeln prüfen${airline ? " (Airline: " + airline + ")" : ""}`,
          "Flüssigkeiten/Powerbanks/Check-in Zeiten beachten",
        ];

  box.innerHTML = `
    <p><strong>${escapeHtml(countryName)}</strong> · ${escapeHtml(
      [start, end].filter(Boolean).join(" – ") || "Datum noch offen"
    )}</p>
    <ul>${general.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>
    <p><strong>${state.mode === "flight" ? "Flug" : "Auto"}</strong></p>
    <ul>${transport.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>
  `;
}

/* ---------------- Packliste: Reiseart + Land + Saison + Transport ---------------- */

function recalcPackList(force = false) {
  const countryCode = $("country")?.value || "";
  const startStr = $("start")?.value || "";
  const endStr = $("end")?.value || "";
  const tripType = $("tripType")?.value || "city";

  const current = (editorPackItems || []).map(ensurePackShape);
  const customs = current.filter((x) => x.custom === true);

  const doneMap = new Map();
  for (const it of current) doneMap.set(normKey(it.text), !!it.done);

  const base = defaultPackItems(state.mode);

  const suggestions = suggestedPackTexts(countryCode, startStr, endStr, state.mode, tripType)
    .filter((t) => t && t.trim().length)
    .filter((t) => !editorRemovedSuggestions.has(normKey(t)));

  const suggestedItems = suggestions.map((text) => ({
    id: crypto.randomUUID(),
    text,
    done: false,
    custom: false,
  }));

  const merged = [];
  const seen = new Set();

  function pushItem(it) {
    const k = normKey(it.text);
    if (!k) return;
    if (seen.has(k)) return;
    seen.add(k);
    const done = doneMap.has(k) ? doneMap.get(k) : !!it.done;
    merged.push({ id: it.id || crypto.randomUUID(), text: it.text.trim(), done, custom: it.custom === true });
  }

  for (const it of base) pushItem(it);
  for (const it of suggestedItems) pushItem(it);
  for (const it of customs) pushItem(it);

  editorPackItems = normalizePackItemsForMode(state.mode, merged);
  renderPackList();
}

function suggestedPackTexts(countryCode, startStr, endStr, mode, tripType) {
  const out = [];

  // Saison (grob) aus Start/End
  const ref = startStr || endStr;
  const month = ref ? safeMonth(ref) : null;

  if (month != null && month >= 5 && month <= 9) out.push("Sonnencreme", "Sonnenbrille/Kappe");
  if (month != null && (month === 11 || month === 12 || month <= 3)) out.push("Warme Jacke / Layering", "Mütze/Handschuhe");

  // Reiseart
  if (tripType === "beach") out.push("Badesachen", "Badelatschen", "After-Sun", "Schnorchel (optional)");
  if (tripType === "city") out.push("Bequeme Schuhe", "Tagesrucksack", "Powerbank");
  if (tripType === "hiking") out.push("Wanderschuhe", "Regenjacke", "Trinkflasche", "Blasenpflaster");
  if (tripType === "ski") out.push("Skibrille", "Handwärmer", "Thermounterwäsche", "Sonnencreme (Schnee)");
  if (tripType === "roadtrip") out.push("Kfz-Ladegerät", "Offline-Karten", "Snacks/Wasser", "Playlist/Podcasts");
  if (tripType === "camping") out.push("Taschenlampe/Stirnlampe", "Powerbank", "Mückenschutz", "Campingbesteck");

  // Transport
  if (mode === "flight") out.push("Reise-Kopien (digital/offline)", "Kopfhörer");
  if (mode === "car") out.push("Tanken/Ladestopps planen", "Notfall-Kleingeld für Parken/Maut");

  const cc = (countryCode || "").toUpperCase();

  // Adapter
  if (["GB", "IE", "MT", "CY"].includes(cc)) out.push("Reiseadapter Typ G (UK)");
  if (["US", "CA", "MX"].includes(cc)) out.push("Reiseadapter Typ A/B (USA/Kanada)");
  if (["AU", "NZ"].includes(cc)) out.push("Reiseadapter Typ I (AU/NZ)");
  if (["CH"].includes(cc)) out.push("Steckeradapter Typ J (Schweiz)");

  // Visa/ESTA Reminder (grob)
  if (cc === "US") out.push("ESTA prüfen/beantragen (falls nötig)");
  if (cc === "GB") out.push("Reisepass erforderlich (UK) – Einreisebestimmungen prüfen");

  // Auto Länderhinweise
  if (mode === "car") {
    if (cc === "CH") out.push("Schweiz: Vignette (Autobahn) prüfen");
    if (cc === "AT") out.push("Österreich: Vignette / Streckenmaut prüfen");
    if (cc === "FR") out.push("Frankreich: Umweltplakette (Crit’Air) ggf. nötig");
    if (cc === "IT") out.push("Italien: ZTL-Zonen (Innenstädte) beachten");
    if (cc === "ES") out.push("Spanien: Umweltzonen in Städten prüfen");
  }

  // Nicht-EU Reminder (grob)
  if (cc && !EU_LIKE.has(cc)) out.push("Einreisebestimmungen/Visa prüfen (Nicht-EU)");

  return uniqText(out);
}

const EU_LIKE = new Set([
  "DE","AT","CH","FR","IT","ES","NL","BE","LU","DK","SE","NO","FI","IS","IE","PT","GR",
  "CZ","PL","SK","HU","SI","HR","RO","BG","LT","LV","EE","CY","MT"
]);

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

/* ---------------- Packliste UI ---------------- */

function defaultPackItems(mode) {
  const general = [
    "Reisepass/Personalausweis",
    "Krankenversicherungskarte / Auslandsschutz",
    "EC-/Kreditkarte + etwas Bargeld",
    "Handy + Ladekabel/Powerbank",
    "Adapter (falls nötig)",
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
    "Koffer/Handgepäck: Gewicht/Größe (Airline)",
    "Flüssigkeiten-Beutel (100ml-Regel)",
  ];

  const merged = mode === "flight" ? general.concat(flight) : general.concat(car);

  return merged.map((text) => ({
    id: crypto.randomUUID(),
    text,
    done: false,
    custom: false,
  }));
}

function normalizePackItemsForMode(mode, items) {
  const shaped = (Array.isArray(items) ? items : []).map(ensurePackShape);

  const carDefaults = new Set(defaultPackItems("car").map((x) => normKey(x.text)));
  const flightDefaults = new Set(defaultPackItems("flight").map((x) => normKey(x.text)));

  const dropSet = mode === "flight" ? carDefaults : flightDefaults;
  const keepSet = mode === "flight" ? flightDefaults : carDefaults;

  const out = [];
  const seen = new Set();

  for (const it of shaped) {
    const key = normKey(it.text);
    if (dropSet.has(key) && !keepSet.has(key) && it.custom !== true) continue;

    if (!carDefaults.has(key) && !flightDefaults.has(key) && it.custom !== true) {
      it.custom = true;
    }

    if (!seen.has(key)) {
      out.push(it);
      seen.add(key);
    }
  }

  return out;
}

function ensurePackShape(item) {
  return {
    id: item?.id || crypto.randomUUID(),
    text: String(item?.text || "").trim(),
    done: !!item?.done,
    custom: item?.custom === true,
  };
}

function renderPackList() {
  const wrap = $("packList");
  wrap.innerHTML = "";

  const items = editorPackItems || [];
  if (!items.length) {
    wrap.innerHTML = `<p class="muted">Noch keine Items. „Standard laden“ oder eigene Items hinzufügen.</p>`;
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
      const k = normKey(item.text);
      if (item.custom !== true) editorRemovedSuggestions.add(k);

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

  editorPackItems.push({
    id: crypto.randomUUID(),
    text: val,
    done: false,
    custom: true,
  });

  inp.value = "";
  renderPackList();
}

/* ---------------- Helpers ---------------- */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[m]);
}
