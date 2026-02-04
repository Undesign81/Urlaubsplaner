const $ = (id) => document.getElementById(id);

const state = {
  trips: loadTrips(),
  editingId: null,
  mode: "car",
  countries: [],
};

// Packlisten-Zustand (nur im Editor)
let editorPackItems = [];

init();

async function init() {
  bindUI();
  renderTrips();

  await loadCountries();
  fillCountrySelect();

  // Standardmodus setzen (markiert Buttons)
  setMode("car");
}

function bindUI() {
  $("btnAdd").addEventListener("click", () => openEditor());
  $("btnClose").addEventListener("click", closeEditor);
  $("btnSave").addEventListener("click", saveTrip);
  $("btnDelete").addEventListener("click", deleteTrip);

  ["start", "end", "country"].forEach((id) => {
    $(id).addEventListener("change", refreshAdvice);
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

    // Standard: Auto
    setMode("car");

    // Packliste sofort setzen + anzeigen
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

    // Packliste laden (falls keine gespeichert: Standard)
    const pack = Array.isArray(trip.packItems) && trip.packItems.length
      ? trip.packItems
      : defaultPackItems(state.mode);

    setEditorPackItems(pack);
    renderPackList();
  }

  refreshAdvice();
}

function closeEditor() {
  $("editor").classList.add("hidden");
}

function setMode(mode) {
  state.mode = mode;

  document.querySelectorAll(".segbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === mode)
  );

  $("airlineWrap").classList.toggle("hidden", mode !== "flight");

  // WICHTIG: Wenn du im Editor bist und wechselst Auto/Flug:
  // Packliste automatisch mit transport-spezifischen Standardpunkten ergänzen,
  // aber bestehende eigene Items behalten.
  const current = getEditorPackItems();
  if (document.getElementById("editor") && !document.getElementById("editor").classList.contains("hidden")) {
    if (!current || current.length === 0) {
      setEditorPackItems(defaultPackItems(mode));
    } else {
      // Nur Standardteile neu setzen, eigene Items behalten:
      const extras = current.filter(x => x.custom === true);
      const base = defaultPackItems(mode);
      const merged = base.concat(extras);
      setEditorPackItems(merged);
    }
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
  const name = c ? c.name : (t.countryCode || "");
  const range = [t.start, t.end].filter(Boolean).join(" – ");
  return `${name}${range ? " · " + range : ""}`;
}

async function loadCountries() {
  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
    const data = await res.json();
    state.countries = data
      .filter((x) => x.cca2 && x.name && x.name.common)
      .map((x) => ({ cca2: x.cca2, name: x.name.common }))
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
    packItems: getEditorPackItems(),
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
  localStorage.setItem("urlaub_trips_v2", JSON.stringify(state.trips));
}

function loadTrips() {
  try {
    return JSON.parse(localStorage.getItem("urlaub_trips_v2") || "[]");
  } catch {
    return [];
  }
}

// -------- Hinweise / Advice --------

async function refreshAdvice() {
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const airline = $("airline").value.trim();

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

  let transport = [];
  if (state.mode === "car") {
    transport = [
      "Maut/Vignette im Zielland prüfen",
      "Umweltzonen/City-Maut prüfen (falls Stadtfahrt)",
      "Pflichtausrüstung (Warnweste, Warndreieck etc.) prüfen",
    ];
  } else {
    transport = [
      "Einreise-/Dokumentencheck (je nach Route/Stopps)",
      `Gepäckregeln prüfen${airline ? " (Airline: " + airline + ")" : ""}`,
      "Flüssigkeiten/Powerbanks/Check-in Zeiten beachten",
    ];
  }

  box.innerHTML = `
    <p><strong>${escapeHtml(countryName)}</strong> · ${escapeHtml(
      [start, end].filter(Boolean).join(" – ") || "Datum noch offen"
    )}</p>
    <ul>${general.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>
    <p><strong>${state.mode === "flight" ? "Flug" : "Auto"}</strong></p>
    <ul>${transport.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>
    <div id="aaBlock"><p class="muted">Lade Auswärtiges Amt Hinweise…</p></div>
  `;

  const aaBlock = $("aaBlock");
  try {
    const url = `https://travelwarning.api.bund.dev/country/${encodeURIComponent(countryCode)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("AA API not ok");
    const data = await res.json();

    const title = data?.title || data?.country?.name || "Reise- & Sicherheitshinweise";
    const updated = data?.date || data?.updatedAt || "";
    const text = data?.content || data?.warning || data?.text || "";

    aaBlock.innerHTML = `
      <p><strong>${escapeHtml(title)}</strong> ${
        updated ? `<span class="muted">(${escapeHtml(updated)})</span>` : ""
      }</p>
      <p class="muted">Quelle: Auswärtiges Amt (OpenData)</p>
      <div class="muted" style="white-space:pre-wrap; line-height:1.4">${escapeHtml(shorten(text, 1200))}</div>
      ${text && text.length > 1200 ? `<p class="muted">…gekürzt.</p>` : ""}
    `;
  } catch (e) {
    aaBlock.innerHTML = `
      <p class="muted">
        Konnte Live-Hinweise gerade nicht laden (Netz/CORS). Checkliste funktioniert trotzdem.
      </p>
    `;
  }
}

// -------- Packliste --------

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

// -------- Helpers --------

function shorten(s, n) {
  s = (s || "").trim();
  if (s.length <= n) return s;
  return s.slice(0, n).trim() + " …";
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
