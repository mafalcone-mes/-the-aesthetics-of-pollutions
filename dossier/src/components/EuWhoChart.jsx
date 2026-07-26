// Sourced figures (checked against current published standards):
// - EU limit: legally binding Ambient Air Quality Directive value (2008/50/EC baseline,
//   the figures the ARPA/legal framework in the script text refers to).
// - WHO guideline: 2021 WHO Global Air Quality Guidelines.
// Averaging periods differ by pollutant (annual mean / 24h / 8h / peak-season) — the
// gap each row shows is real and sourced, but rows are not directly comparable to one
// another across pollutants; each bar is scaled to its own EU limit = 100%.
const ROWS = [
  { key: 'pm25', label: 'PM2.5', unit: 'μg/m³', eu: 25, who: 5 },
  { key: 'pm10', label: 'PM10', unit: 'μg/m³', eu: 40, who: 15 },
  { key: 'no2', label: 'NO2', unit: 'μg/m³', eu: 40, who: 10 },
  { key: 'o3', label: 'O3', unit: 'μg/m³', eu: 120, who: 60 },
  { key: 'so2', label: 'SO2', unit: 'μg/m³', eu: 125, who: 40 },
  { key: 'co', label: 'CO', unit: 'mg/m³', eu: 10, who: 4 },
  { key: 'c6h6', label: 'Benzene (C6H6)', unit: 'μg/m³', eu: 5, who: null },
];

export default function EuWhoChart({ L }) {
  return (
    <div className="euwho">
      <div className="euwho-head">
        <span className="euwho-legend euwho-legend--who">{L ? 'Soglia di sicurezza OMS' : 'WHO safe threshold'}</span>
        <span className="euwho-legend euwho-legend--gap">{L ? 'Legale ma non sicuro' : 'Legal, but not safe'}</span>
      </div>

      {ROWS.map((r) => {
        const pct = r.who == null ? 0 : Math.min(100, (r.who / r.eu) * 100);
        return (
          <div className="euwho-row" key={r.key}>
            <div className="euwho-label">{r.label}</div>
            <div className="euwho-track">
              <div className={`euwho-gap-fill ${r.who == null ? 'euwho-gap-fill--full' : ''}`} />
              {r.who != null && <div className="euwho-who-fill" style={{ width: `${pct}%` }} />}
              {r.who != null && <div className="euwho-tick" style={{ left: `${pct}%` }} />}
              {r.who == null && (
                <span className="euwho-nosafe">
                  {L ? 'Nessuna soglia sicura — OMS' : 'No safe threshold — WHO'}
                </span>
              )}
            </div>
            <div className="euwho-values">
              <span className="euwho-v euwho-v--who">{r.who != null ? `${r.who} ${r.unit}` : '—'}</span>
              <span className="euwho-v euwho-v--eu">{r.eu} {r.unit}<em>{L ? ' limite UE' : ' EU limit'}</em></span>
            </div>
          </div>
        );
      })}

      <p className="euwho-footnote">
        {L
          ? "I periodi di riferimento (media annuale, 24h, 8h, stagione di picco) variano per inquinante: il divario in ogni riga è reale e verificato, ma le righe non sono direttamente comparabili tra loro. Il benzene non ha una soglia di sicurezza secondo l'OMS: è un cancerogeno genotossico, per cui ogni esposizione comporta un rischio."
          : "Averaging periods (annual mean, 24h, 8h, peak-season) vary by pollutant: the gap in each row is real and sourced, but rows are not directly comparable to one another. Benzene has no WHO safe threshold: it is a genotoxic carcinogen, meaning any exposure carries risk."}
      </p>
    </div>
  );
}
