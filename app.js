const $ = (id) => document.getElementById(id);

const state = {
  trips: loadTrips(),
  editingId: null,
  mode: "car",
  countries: [],
};

init();

async function init(){
  bindUI();
  renderTrips();

  // Länder laden (alle)
  await loadCountries();
  fillCountrySelect();

  // Default Transport UI
  setMode("car");
}

function bindUI(){
  $("btnAdd").addEventListener("click", () => openEditor());
  $("btnClose").addEventListener("click", closeEditor);
  $("btnSave").addEventListener("click", saveTrip);
  $("btnDelete").addEventListener("click", deleteTrip);

  ["start","end","country"].forEach(id => {
    $(id).addEventListener("change", refreshAdvice);
  });

  document.querySelectorAll(".segbtn").forEach(btn => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("airline").addEventListener("input", refreshAdvice);
}

function openEditor(trip=null){
  $("editor").classList.remove("hidden");
  if(!trip){
    state.editingId = null;
    $("editorTitle").textContent = "Neue Reise";
    $("title").value = "";
    $("start").value = "";
    $("end").value = "";
    $("notes").value = "";
    $("airline").value = "";
    $("btnDelete").classList.add("hidden");
    setMode("car");
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
  }
  refreshAdvice();
}

function closeEditor(){
  $("editor").classList.add("hidden");
}

function setMode(mode){
  state.mode = mode;
  document.querySelectorAll(".segbtn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("airlineWrap").classList.toggle("hidden", mode !== "flight");
  refreshAdvice();
}

function renderTrips(){
  const wrap = $("tripList");
  wrap.innerHTML = "";
  $("emptyTrips").classList.toggle("hidden", state.trips.length !== 0);

  const sorted = [...state.trips].sort((a,b) => (a.start||"").localeCompare(b.start||""));
  for(const t of sorted){
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

function fmtTripSub(t){
  const c = state.countries.find(x => x.cca2 === t.countryCode);
  const name = c ? c.name : (t.countryCode || "");
  const range = [t.start, t.end].filter(Boolean).join(" – ");
  return `${name}${range ? " · " + range : ""}`;
}

async function loadCountries(){
  try{
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
    const data = await res.json();
    state.countries = data
      .filter(x => x.cca2 && x.name && x.name.common)
      .map(x => ({ cca2: x.cca2, name: x.name.common }))
      .sort((a,b) => a.name.localeCompare(b.name, "de"));
  }catch(e){
    state.countries = [];
  }
}

function fillCountrySelect(){
  const sel = $("country");
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Bitte wählen…";
  sel.appendChild(opt0);

  for(const c of state.countries){
    const o = document.createElement("option");
    o.value = c.cca2;
    o.textContent = c.name;
    sel.appendChild(o);
  }
}

function saveTrip(){
  const title = $("title").value.trim();
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const notes = $("notes").value.trim();
  const airline = $("airline").value.trim();

  if(!countryCode){
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
    updatedAt: new Date().toISOString()
  };

  const idx = state.trips.findIndex(t => t.id === trip.id);
  if(idx >= 0) state.trips[idx] = trip;
  else state.trips.push(trip);

  persistTrips();
  renderTrips();
  refreshAdvice();
  closeEditor();
}

function deleteTrip(){
  if(!state.editingId) return;
  state.trips = state.trips.filter(t => t.id !== state.editingId);
  persistTrips();
  renderTrips();
  closeEditor();
}

function persistTrips(){
  localStorage.setItem("urlaub_trips_v1", JSON.stringify(state.trips));
}
function loadTrips(){
  try{
    return JSON.parse(localStorage.getItem("urlaub_trips_v1") || "[]");
  }catch{
    return [];
  }
}

/**
 * Hinweise laden:
 * - Basis: Auswärtiges Amt OpenData (über eine öffentliche API, die die OpenData nutzt).
 *   Falls das bei dir wegen CORS/Netz nicht klappt, zeigt die App trotzdem Checklisten.
 */
async function refreshAdvice(){
  const countryCode = $("country").value;
  const start = $("start").value;
  const end = $("end").value;
  const airline = $("airline").value.trim();

  const c = state.countries.find(x => x.cca2 === countryCode);
  const countryName = c ? c.name : countryCode;

  const box = $("advice");
  if(!countryCode){
    box.innerHTML = `<p class="muted">Wähle ein Land, dann erscheinen die Hinweise.</p>`;
    return;
  }

  // Grund-Checkliste (immer)
  const general = [
    "Reisepass/Personalausweis prüfen (Gültigkeit, Kopie)",
    "Auslandskrankenversicherung / Notfallnummern",
    "Zahlungsmittel (Karte/Bargeld), Adapter/Stecker"
  ];

  let transport = [];
  if(state.mode === "car"){
    transport = [
      "Maut/Vignette im Zielland prüfen",
      "Umweltzonen/City-Maut prüfen (falls Stadtfahrt)",
      "Pflichtausrüstung (Warnweste, Warndreieck etc.) prüfen"
    ];
  } else {
    transport = [
      "Einreise-/Dokumentencheck (je nach Route/Stopps)",
      `Gepäckregeln prüfen${airline ? " (Airline: " + airline + ")" : ""}`,
      "Flüssigkeiten/Powerbanks/Check-in Zeiten beachten"
    ];
  }

  box.innerHTML = `
    <p><strong>${escapeHtml(countryName)}</strong> · ${escapeHtml([start,end].filter(Boolean).join(" – ") || "Datum noch offen")}</p>
    <p class="muted">Automatische Hinweise (Sicherheit/Einreise/Regeln) + transportabhängige Checkliste:</p>
    <ul>
      ${general.map(li => `<li>${escapeHtml(li)}</li>`).join("")}
    </ul>
    <p><strong>${state.mode === "flight" ? "Flug" : "Auto"}</strong></p>
    <ul>
      ${transport.map(li => `<li>${escapeHtml(li)}</li>`).join("")}
    </ul>
    <div id="aaBlock"><p class="muted">Lade Auswärtiges Amt Hinweise…</p></div>
  `;

  // Auswärtiges Amt Hinweise (über bundesAPI travelwarning-api, nutzt AA OpenData)
  // Je nach Umgebung kann CORS blockieren. Dann fällt es elegant zurück.
  const aaBlock = $("aaBlock");
  try{
    // Diese API ist ein Wrapper für die OpenData (bundesAPI / travelwarning-api)
    const url = `https://travelwarning.api.bund.dev/country/${encodeURIComponent(countryCode)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error("AA API not ok");
    const data = await res.json();

    // Struktur kann sich ändern – robust lesen:
    const title = data?.title || data?.country?.name || "Reise- & Sicherheitshinweise";
    const updated = data?.date || data?.updatedAt || "";
    const text = data?.content || data?.warning || data?.text || "";

    aaBlock.innerHTML = `
      <p><strong>${escapeHtml(title)}</strong> ${updated ? `<span class="muted">(${escapeHtml(updated)})</span>` : ""}</p>
      <p class="muted">Quelle: Auswärtiges Amt (OpenData)</p>
      <div class="muted" style="white-space:pre-wrap; line-height:1.4">${escapeHtml(shorten(text, 1200))}</div>
      ${text && text.length > 1200 ? `<p class="muted">…gekürzt. (Du kannst später „Mehr anzeigen“ ergänzen.)</p>` : ""}
    `;
  }catch(e){
    aaBlock.innerHTML = `
      <p class="muted">
        Konnte Live-Hinweise gerade nicht laden (z.B. Netz/CORS).
        Die Checkliste oben funktioniert trotzdem.
      </p>
    `;
  }
}

function shorten(s, n){
  s = (s || "").trim();
  if(s.length <= n) return s;
  return s.slice(0, n).trim() + " …";
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
