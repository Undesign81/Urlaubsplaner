async function loadClimateAverage(countryCode, startStr, endStr) {
  if (!countryCode || !startStr) return "";

  const c = state.countries.find(x => x.cca2 === countryCode);
  if (!c || c.lat == null || c.lon == null) return "";

  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : start;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  // betroffene Monate ermitteln
  const months = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (d <= last) {
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    d.setMonth(d.getMonth() + 1);
  }

  const parts = [];

  for (const m of months) {
    const startDate = `${m.year}-${String(m.month).padStart(2,"0")}-01`;
    const endDate = `${m.year}-${String(m.month).padStart(2,"0")}-${new Date(m.year, m.month, 0).getDate()}`;

    const url =
      `https://climate-api.open-meteo.com/v1/climate?latitude=${c.lat}` +
      `&longitude=${c.lon}` +
      `&start_date=${startDate}&end_date=${endDate}` +
      `&models=MPI_ESM1_2_XR` +
      `&daily=temperature_2m_min,temperature_2m_max`;

    const res = await fetch(url);
    if (!res.ok) continue;

    const data = await res.json();
    const mins = data?.daily?.temperature_2m_min || [];
    const maxs = data?.daily?.temperature_2m_max || [];

    if (!mins.length || !maxs.length) continue;

    const avgMin = Math.round(mins.reduce((a,b)=>a+b,0) / mins.length);
    const avgMax = Math.round(maxs.reduce((a,b)=>a+b,0) / maxs.length);

    parts.push(`${monthNameDE(m.month)}: ${avgMin}–${avgMax} °C`);
  }

  return parts.join(" · ");
}

function monthNameDE(m) {
  return ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][m-1];
}
