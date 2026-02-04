const $ = (id) => document.getElementById(id);

const state = {
  trips: loadTrips(),
  editingId: null,
  mode: "car",
  countries: [], // { cca2, name, lat, lon }
};

// Packlisten-Zustand (nur im Editor)
let editorPackItems = [];

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

  ["start", "end", "country"].forEach((id) => {
    $(id).addEventListener("change", () => {
      refreshAdvice();
      // Temperaturen aktualisieren
    });
  });

  document.querySelectorAll(".segbtn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("airline").addEventListener("input", refreshAdvice);

  // Packliste
  $("btnAddPack").addEventListener("click", addPackItemFromInput);
  $("packNew").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addPackItemFromInput();
  });
  $("btnResetPack").addEventListener("click", () => {
    setEditorPackItems(defaultPackItems(state.mode));
    renderPackList();
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
    $("notes").value = "";
    $("airline").value = "";
    $("btnDelete").classList.add("hidden");

    setMode("car");
    setEditorPackItems(defaultPackItems(state.mode));
    renderPackList();
  } else {
    state.editingId = trip.id;
    $("editorTitle").textContent = "Reise bearbeiten";
    $("title").value = trip.title || "";
    $("country").value = trip.countryCode || "";
    $("start").value = trip.start || "";
    $("end").value = trip.end || "";
    $("notes").value = trip.notes || "";
    $("airline").value = trip.airline || "";
    $("btnDelete").classList.remove("hidden");

    setMode(trip.mode || "car");

    // Packliste: Migration/Filter, damit bei Flug nicht noch "Maut" etc. drin ist
    const packRaw =
      Array.isArray(trip.packItems) && trip.packItems.length
        ? trip.packItems
        : defaultPackItems(state.mode);

    const packClean = normalizePackItemsForMode(state.mode, packRaw);
    setEditorPackItems(packClean);
    renderPackList();
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

  // Wenn Editor offen ist: Packliste automatisch passend machen
  const editorOpen =
    document.getElementById("editor") &&
    !document.getElementById("editor").classList.contains("hidden");

  if (editorOpen) {
    const current = getEditorPackItems();
    if (!current || current.length === 0) {
      setEditorPackItems(defaultPackItems(state.mode));
    } else {
      // behalten: eigene Items (custom=true)
      const customs = current.map(ensurePackShape).filter((x) => x.custom === true);

      // Standard neu laden je nach Modus
      const base = defaultPackItems(state.mode);

      // merge: base + customs (keine doppelten Texte)
      const seen = new Set(base.map((x) => x.text.toLowerCase().trim()));
      for (const c of customs) {
        const k = c.text.toLowerCase().trim();
        if (!seen.has(k)) {
          base.push(c);
          seen.add(k);
        }
      }
      setEditorPackItems(base);
    }

    // zusätzliche Reinigung (verhindert "Maut" im Flugmodus)
    setEditorPackItems(normalizePackItemsForMode(state.mode, getEditorPackItems()));
    renderPackList();
  }

  refreshAdvice();
}

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
    el.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(t.title || "Reise")}</div>
        <div class="sub">${fmtTripSub(t)}</div>
      </div>
      <div class="sub">${t.mode === "flight" ? "✈️" : "🚗"}</div>
    `;
    el.addEventListener("click", () => openEditor(t));
    wrap.appendChild(el);
  }
}

function fmtTripSub(t) {
  const c = state.countries.find((x) => x.cca2 === t.countryCode);
  const name = c ? c.name : t.countryCode || "";
  const range = [t.start, t.end].filter(Boolean).join(" – ");
  return `${name}${range ? " · " + range : ""}`;
}

async function loadCountries() {
  try {
    // Wir holen zusätzlich Koordinaten, damit wir Temperaturen anzeigen können
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,capitalInfo,latlng"
    );
    const data = await res.json();

    state.countries = data
      .filter((x) => x.cca2 && x.name && x.name.common)
      .map((x) => {
        // bevorzugt capitalInfo.latlng, sonst latlng
        const ll =
          (x.capitalInfo && Array.isArray(x.capitalInfo.latlng) && x.capitalInfo.latlng.length === 2)
            ? x.capitalInfo.latlng
            : (Array.isArray(x.latlng) && x.latlng.length === 2 ? x.latlng : [null, null]);
        return { cca2: x.cca2, name: x.name.common, lat: ll[0], lon: ll[1] };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  } catch (e) {
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

function saveTrip() {
  const title = $("title").value.trim();
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const notes = $("notes").value.trim();
  const airline = $("airline").value.trim();

  if (!countryCode) {
    alert("Bitte ein Land auswählen.");
    return;
  }

  const trip = {
    id: state.editingId || crypto.randomUUID(),
    title: title || "Urlaub",
    countryCode,
    start,
    end,
    mode: state.mode,
    airline: state.mode === "flight" ? airline : "",
    notes,
    packItems: normalizePackItemsForMode(state.mode, getEditorPackItems()),
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
  localStorage.setItem("urlaub_trips_v3", JSON.stringify(state.trips));
}

function loadTrips() {
  try {
    // v3 neu; falls leer, versuchen wir v2/v1 zu laden und weiter zu nutzen
    const v3 = localStorage.getItem("urlaub_trips_v3");
    if (v3) return JSON.parse(v3);

    const v2 = localStorage.getItem("urlaub_trips_v2");
    if (v2) return JSON.parse(v2);

    const v1 = localStorage.getItem("urlaub_trips_v1");
    if (v1) return JSON.parse(v1);

    return [];
  } catch {
    return [];
  }
}

/**
 * LIVE-DATEN + CHECKLISTE + TEMPERATUR
 */
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

  // Basis-Checkliste (immer)
  const general = [
    "Reisepass/Personalausweis prüfen (Gültigkeit, Kopie)",
    "Auslandskrankenversicherung / Notfallnummern",
    "Zahlungsmittel (Karte/Bargeld), Adapter/Stecker",
  ];

  // Transport-Checkliste (WICHTIG: Auto != Flug)
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

    <p class="muted">Checkliste:</p>
    <ul>${general.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>

    <p><strong>${state.mode === "flight" ? "Flug" : "Auto"}</strong></p>
    <ul>${transport.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>

    <div id="tempBlock"><p class="muted">Lade ungefähre Temperatur…</p></div>
    <div id="aaBlock"><p class="muted">Lade Live-Daten (Auswärtiges Amt)…</p></div>
  `;

  // 1) Temperaturen (ungefähr): Startmonat (falls vorhanden)
  const tempBlock = $("tempBlock");
  try {
    const tempText = await getApproxTemperatureText(countryCode, start || end);
    tempBlock.innerHTML = tempText
      ? `<p><strong>Ungefähre Temperaturen</strong></p><p class="muted">${escapeHtml(tempText)}</p>`
      : `<p class="muted">Temperatur: bitte ein Start- oder Enddatum setzen.</p>`;
  } catch {
    tempBlock.innerHTML = `<p class="muted">Konnte Temperatur gerade nicht laden.</p>`;
  }

  // 2) Live-Daten: Auswärtiges Amt (über travelwarning.api.bund.dev)
  const aaBlock = $("aaBlock");
  try {
    const url = `https://travelwarning.api.bund.dev/country/${encodeURIComponent(countryCode)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("AA API not ok");
    const data = await res.json();

    // Robust lesen (Struktur kann variieren)
    const title = data?.title || data?.country?.name || "Reise- & Sicherheitshinweise";
    const updated = data?.date || data?.updatedAt || "";
    const link = data?.url || data?.link || data?.source || "";

    // Häufig: sehr langer Text -> gekürzt
    const text =
      data?.content ||
      data?.warning ||
      data?.text ||
      data?.data ||
      "";

    aaBlock.innerHTML = `
      <p><strong>Live-Daten: ${escapeHtml(title)}</strong> ${
        updated ? `<span class="muted">(${escapeHtml(updated)})</span>` : ""
      }</p>
      <p class="muted">${escapeHtml(shorten(cleanText(text), 700))}</p>
      ${
        link
          ? `<p><a href="${escapeAttr(link)}" target="_blank" rel="noopener">Quelle öffnen</a></p>`
          : `<p class="muted">Quelle: Auswärtiges Amt (OpenData)</p>`
      }
    `;
  } catch (e) {
    aaBlock.innerHTML = `
      <p class="muted">
        Konnte Live-Daten gerade nicht laden (Netz/CORS/Service).
        Die Checklisten & Packliste funktionieren trotzdem.
      </p>
    `;
  }
}

// ----------------- Temperaturen (Open-Meteo) -----------------

async function getApproxTemperatureText(countryCode, dateStr) {
  if (!dateStr) return "";
  const c = state.countries.find((x) => x.cca2 === countryCode);
  if (!c || c.lat == null || c.lon == null) return "";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const month = d.getMonth() + 1;

  // Wenn Datum innerhalb der nächsten 16 Tage liegt -> Forecast (genauer)
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays >= -1 && diffDays <= 16) {
    return await getForecastTempText(c.lat, c.lon, dateStr);
  }

  // Sonst: "ungefähr" über Climate API (repräsentativer Monat im Jahr 2020)
  return await getClimateMonthTempText(c.lat, c.lon, month);
}

async function getForecastTempText(lat, lon, dateStr) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("forecast not ok");
  const data = await res.json();

  const times = data?.daily?.time || [];
  const tmax = data?.daily?.temperature_2m_max || [];
  const tmin = data?.daily?.temperature_2m_min || [];

  const idx = times.indexOf(dateStr);
  if (idx === -1) {
    // wenn nicht exakt: nimm ersten Tag der Liste
    if (times.length && tmax.length && tmin.length) {
      return `In den nächsten Tagen etwa ${Math.round(tmin[0])}–${Math.round(tmax[0])}°C (Vorhersage).`;
    }
    return "";
  }

  return `Am ${dateStr} etwa ${Math.round(tmin[idx])}–${Math.round(tmax[idx])}°C (Vorhersage).`;
}

async function getClimateMonthTempText(lat, lon, month) {
  const year = 2020; // Referenzjahr (nur als "ungefähre" Orientierung)
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

  const url =
    `https://climate-api.open-meteo.com/v1/climate?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&start_date=${start}&end_date=${end}` +
    `&models=MPI_ESM1_2_XR` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("climate not ok");
  const data = await res.json();

  const tmax = data?.daily?.temperature_2m_max || [];
  const tmin = data?.daily?.temperature_2m_min || [];

  if (!tmax.length || !tmin.length) return "";

  const avgMax = average(tmax);
  const avgMin = average(tmin);

  return `Im Reise-Monat ungefähr ${Math.round(avgMin)}–${Math.round(avgMax)}°C (grobe Orientierung).`;
}

function average(arr) {
  let s = 0;
  for (const v of arr) s += Number(v) || 0;
  return s / arr.length;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month: 1..12
}

// ----------------- Packliste -----------------

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

  const carDefaults = new Set(defaultPackItems("car").map((x) => x.text.toLowerCase().trim()));
  const flightDefaults = new Set(defaultPackItems("flight").map((x) => x.text.toLowerCase().trim()));

  // Flug: Auto-Defaults raus, wenn nicht custom
  // Auto: Flug-Defaults raus, wenn nicht custom
  const dropSet = mode === "flight" ? carDefaults : flightDefaults;
  const keepSet = mode === "flight" ? flightDefaults : carDefaults;

  const out = [];
  const seen = new Set();

  for (const it of shaped) {
    const key = it.text.toLowerCase().trim();

    // wenn ein "falscher" Default (Maut etc.) und nicht custom -> weg
    if (dropSet.has(key) && !keepSet.has(key) && it.custom !== true) continue;

    // wenn unbekannt und custom nicht gesetzt -> als custom behandeln
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

function setEditorPackItems(items) {
  editorPackItems = Array.isArray(items) ? items : [];
}

function getEditorPackItems() {
  return editorPackItems;
}

function renderPackList() {
  const wrap = $("packList");
  wrap.innerHTML = "";

  const items = getEditorPackItems();
  if (!items || items.length === 0) {
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

// ----------------- Helpers -----------------

function shorten(s, n) {
  s = (s || "").trim();
  if (s.length <= n) return s;
  return s.slice(0, n).trim() + " …";
}

function cleanText(s) {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function escapeAttr(s) {
  // minimal sicher für href (wir vertrauen dem Link, aber escapen dennoch Quotes)
  return String(s ?? "").replace(/"/g, "%22").replace(/'/g, "%27");
}
