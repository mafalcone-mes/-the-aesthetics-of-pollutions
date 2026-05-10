import { useState, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';
import MultiLineChart from '../components/charts/MultiLineChart';

const PAGE_SIZE = 50;

function pillStyle(active, color) {
  return {
    padding: '3px 10px',
    border: '1.5px solid ' + (active ? color || '#111' : '#DDDAD3'),
    background: active ? (color || '#111') : 'transparent',
    color: active ? '#fff' : '#111',
    fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

function toggleSet(set, setFn, val, allVal) {
  const s = new Set(set);
  if (val === allVal) { setFn(new Set([allVal])); return; }
  s.delete(allVal);
  if (s.has(val)) { s.delete(val); if (!s.size) s.add(allVal); } else s.add(val);
  setFn(s);
}

export default function ArchivePage({ lang, setPage, setSelectedSensor }) {
  const L = lang === 'it';

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [fSensors, setFSensors]   = useState(new Set(['all']));
  const [fDistricts, setFDistricts] = useState(new Set(['all']));
  const [fAqi, setFAqi]           = useState(new Set([0, 1, 2, 3, 4, 5]));
  const [fDateFrom, setFDateFrom] = useState('2026-04-26');
  const [fDateTo, setFDateTo]     = useState('2026-05-03');
  const [chartPolls, setChartPolls] = useState(new Set(['pm25', 'pm10', 'no2', 'co']));
  const [currentPage, setCurrentPage] = useState(1);

  const districts = [...new Set(SENSORS.map((s) => s.district))];

  const filtered = useMemo(() => {
    const from = new Date(fDateFrom);
    const to = new Date(fDateTo + 'T23:59:59');
    return HOURLY_DATA.filter((r) => {
      if (r.dateObj < from || r.dateObj > to) return false;
      if (!fSensors.has('all') && !fSensors.has(String(r.sensorId))) return false;
      if (!fDistricts.has('all') && !fDistricts.has(r.district)) return false;
      if (!fAqi.has(r.aqi)) return false;
      return true;
    });
  }, [fSensors, fDistricts, fAqi, fDateFrom, fDateTo]);

  const chartSensorId = fSensors.has('all') ? SENSORS[0].id : Number([...fSensors][0]);
  const chartData = filtered.filter((r) => r.sensorId === chartSensorId).slice(-168);
  const pagedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const cols = ['data', 'ora', 'sensore', 'posizione', 'distretto', 'pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'c6h6', 'temp', 'hum', 'aqi'];
    const rows = [cols.join(',')];
    for (const r of filtered) {
      rows.push([r.dateStr, r.hourStr, r.sensorName, `"${r.location}"`, r.district,
        r.pm25, r.pm10, r.no2, r.o3, r.so2, r.co, r.nh3, r.c6h6, r.temp, r.hum, r.aqi + 1].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aria-bene-comune-${fDateFrom}-${fDateTo}.csv`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 48px)' }}>

      {/* FILTER PANEL */}
      <div style={{ borderBottom: 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setFiltersOpen((o) => !o)}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {L ? 'Filtri' : 'Filters'} — <span style={{ color: '#9B9790', fontWeight: 400 }}>{filtered.length.toLocaleString()} {L ? 'letture orarie' : 'hourly readings'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); exportCSV(); }}
              style={{ padding: '5px 14px', background: '#111', color: '#fff', border: '1.5px solid #111', fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ↓ CSV
            </button>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: 12 }}>{filtersOpen ? '▲' : '▼'}</span>
          </div>
        </div>

        {filtersOpen && (
          <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--gray)' }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--gray)' }}>
              {/* DATE */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>{L ? 'Periodo' : 'Period'}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)}
                    style={{ border: '1.5px solid #111', fontFamily: 'Source Serif 4', fontSize: 12, padding: '4px 8px', background: 'var(--white)' }} />
                  <span style={{ fontSize: 10, color: '#9B9790' }}>→</span>
                  <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)}
                    style={{ border: '1.5px solid #111', fontFamily: 'Source Serif 4', fontSize: 12, padding: '4px 8px', background: 'var(--white)' }} />
                </div>
              </div>
              {/* SENSORS */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>{L ? 'Sensore' : 'Sensor'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={pillStyle(fSensors.has('all'), '#111')} onClick={() => setFSensors(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
                  {SENSORS.map((s) => (
                    <span key={s.id} style={pillStyle(fSensors.has(String(s.id)), '#111')} onClick={() => toggleSet(fSensors, setFSensors, String(s.id), 'all')}>{s.name}</span>
                  ))}
                </div>
              </div>
              {/* DISTRICTS */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>{L ? 'Quartiere' : 'District'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={pillStyle(fDistricts.has('all'), '#111')} onClick={() => setFDistricts(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
                  {districts.map((d) => (
                    <span key={d} style={pillStyle(fDistricts.has(d), '#111')} onClick={() => toggleSet(fDistricts, setFDistricts, d, 'all')}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {/* AQI */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>AQI</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {LEVELS.map((l) => (
                    <span key={l.key} style={pillStyle(fAqi.has(l.index), l.color)}
                      onClick={() => { const s = new Set(fAqi); s.has(l.index) ? s.delete(l.index) : s.add(l.index); setFAqi(s.size ? s : new Set([0, 1, 2, 3, 4, 5])); }}>
                      {L ? l.it : l.en}
                    </span>
                  ))}
                </div>
              </div>
              {/* CHART POLLUTANTS */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>{L ? 'Inquinanti nel grafico' : 'Chart pollutants'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.keys(POLLUTANTS).map((k) => (
                    <span key={k} style={pillStyle(chartPolls.has(k), '#111')}
                      onClick={() => { const s = new Set(chartPolls); s.has(k) ? (s.size > 1 && s.delete(k)) : s.add(k); setChartPolls(s); }}>
                      {POLLUTANTS[k].name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHART */}
      <div style={{ padding: '16px 24px', borderBottom: 'var(--border)' }}>
        <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 10 }}>
          {L ? 'Andamento orario — ' : 'Hourly trend — '}
          {fSensors.has('all') ? SENSORS[0].name : SENSORS.find((s) => s.id === [...fSensors][0] * 1)?.name || SENSORS[0].name}
          {L ? ' · ultimi 7 giorni' : ' · last 7 days'}
        </div>
        <MultiLineChart data={chartData} pollutants={[...chartPolls]} width={900} height={220} />
      </div>

      {/* TABLE */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        <table className="archive-table">
          <thead>
            <tr>
              <th style={{ minWidth: 40 }}>#</th>
              <th style={{ minWidth: 70 }}>{L ? 'Sensore' : 'Sensor'}</th>
              <th style={{ minWidth: 90 }}>{L ? 'Quartiere' : 'District'}</th>
              <th style={{ minWidth: 80 }}>{L ? 'Data' : 'Date'}</th>
              <th style={{ minWidth: 50 }}>{L ? 'Ora' : 'Hour'}</th>
              <th style={{ minWidth: 70 }}>AQI</th>
              <th style={{ minWidth: 60 }}>PM2.5<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
              <th style={{ minWidth: 60 }}>PM10<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
              <th style={{ minWidth: 60 }}>NO₂<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
              <th style={{ minWidth: 60 }}>CO<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>mg/m³</span></th>
              <th style={{ minWidth: 50 }}>Temp<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>°C</span></th>
              <th style={{ minWidth: 50 }}>Hum<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>%</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedData.map((r, i) => {
              const lv = LEVELS[r.aqi];
              const isDark = r.aqi <= 1;
              return (
                <tr key={`${r.sensorId}-${r.dateObj}`} onClick={() => { setSelectedSensor(SENSORS.find((s) => s.id === r.sensorId)); setPage('record'); }}>
                  <td style={{ color: '#9B9790', fontSize: 11 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td><span style={{ fontFamily: 'Epilogue', fontWeight: 700 }}>{r.sensorName}</span></td>
                  <td><span style={{  }}>{r.district}</span></td>
                  <td>{r.dateStr}</td>
                  <td style={{ fontFamily: 'Epilogue', fontWeight: 600 }}>{r.hourStr}</td>
                  <td><span className={`aqi-pill${isDark ? ' dark' : ''}`} style={{ background: lv.color }}>{L ? lv.it : lv.en}</span></td>
                  <td style={{ color: LEVELS[getPollLevel('pm25', r.pm25)].color, fontFamily: 'Epilogue', fontWeight: 700 }}>{r.pm25}</td>
                  <td style={{ color: LEVELS[getPollLevel('pm10', r.pm10)].color, fontFamily: 'Epilogue', fontWeight: 700 }}>{r.pm10}</td>
                  <td style={{ color: LEVELS[getPollLevel('no2',  r.no2)].color,  fontFamily: 'Epilogue', fontWeight: 700 }}>{r.no2}</td>
                  <td style={{ color: LEVELS[getPollLevel('co',   r.co)].color,   fontFamily: 'Epilogue', fontWeight: 700 }}>{r.co}</td>
                  <td style={{ fontFamily: 'Epilogue' }}>{r.temp}°</td>
                  <td style={{ fontFamily: 'Epilogue' }}>{r.hum}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: 'var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#9B9790' }}>
          {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {L ? 'di' : 'of'} {filtered.length.toLocaleString()} {L ? 'letture' : 'readings'}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const p = i + 1;
            return (
              <button key={p} onClick={() => setCurrentPage(p)}
                style={{ padding: '6px 12px', border: '1.5px solid #111', borderRight: p < Math.min(totalPages, 7) ? 'none' : '1.5px solid #111', background: p === currentPage ? '#111' : 'transparent', color: p === currentPage ? '#fff' : '#111', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {p}
              </button>
            );
          })}
          {totalPages > 7 && <span style={{ padding: '6px 10px', fontFamily: 'Epilogue', fontSize: 11, color: '#9B9790' }}>…{totalPages}</span>}
        </div>
      </div>
    </div>
  );
}

