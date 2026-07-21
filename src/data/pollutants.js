// Range boundaries (level 0–5 upper bounds) are calibrated against the real
// distribution in hourly_taranto.csv, not an external standard — each pollutant's
// 5 internal breakpoints sit near its own ~50th/70th/85th/95th/99th percentiles,
// so every level is actually reachable by this dataset (getPollLevel only uses
// each range's upper bound; the lower bound is display-only).
// nh3 is left at its original placeholder values: the real ARPA stations report
// it as 0 in every row, so there's no real distribution to calibrate from.
// no2 is the deliberate exception to the percentile calibration above: its breakpoints
// are anchored to WHO's 2021 Global Air Quality Guidelines instead, not this dataset —
// 10 = WHO annual mean, 25 = WHO 24h mean, 200 = WHO 1h mean, with 50/100 filling the gap
// as doublings between the 24h and 1h figures. This is intentionally stricter than the
// EU/EEA regulatory bands, to make the gap between "legal" and "WHO-safe" visible.
// euLimit: the legally binding EU/EEA limit value (Directive 2008/50/EC), in the same unit
// as the pollutant's readings — the "legal" half of the WHO-vs-legal gap this app exists to
// surface. null where no EU ambient air-quality limit value is defined (nh3 has none).
export const POLLUTANTS = {
  pm25: { name: 'PM2.5', unit: 'μg/m³', category: 'particulates', ranges: [[0,2],[3,6],[7,10],[11,15],[16,22],[23,999]], euLimit: 25 },
  pm10: { name: 'PM10',  unit: 'μg/m³', category: 'particulates', ranges: [[0,8],[9,16],[17,25],[26,40],[41,65],[66,999]], euLimit: 40 },
  no2:  { name: 'NO2',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,10],[11,25],[26,50],[51,100],[101,200],[201,999]], euLimit: 40 },
  o3:   { name: 'O3',    unit: 'μg/m³', category: 'gaseous',      ranges: [[0,0],[1,20],[21,40],[41,70],[71,110],[111,999]], euLimit: 120 },
  so2:  { name: 'SO2',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,2],[2.1,4],[4.1,6],[6.1,8],[8.1,11],[11.1,999]], euLimit: 125 },
  co:   { name: 'CO',    unit: 'mg/m³', category: 'systemic',     ranges: [[0,0.2],[0.3,0.4],[0.5,0.7],[0.8,0.9],[1.0,1.2],[1.3,999]], euLimit: 10 },
  nh3:  { name: 'NH3',   unit: 'μg/m³', category: 'systemic',     ranges: [[0,10],[11,20],[21,50],[51,100],[101,200],[201,999]], euLimit: null },
  c6h6: { name: 'C6H6',  unit: 'μg/m³', category: 'systemic',     ranges: [[0,0],[0.1,0.7],[0.8,1.3],[1.4,2.2],[2.3,3.7],[3.8,999]], euLimit: 5 },
};
