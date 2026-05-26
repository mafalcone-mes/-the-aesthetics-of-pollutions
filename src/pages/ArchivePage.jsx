import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';
import MultiLineChart from '../components/charts/MultiLineChart';
import HourlyBarChart from '../components/charts/HourlyBarChart';
import DailyHeatmap from '../components/charts/DailyHeatmap';

const PAGE_SIZE = 50;

function pillStyle(active, color) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? color || 'var(--primary)' : 'var(--gray2)'),
    background: active ? (color || 'var(--primary)') : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
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
  const [fDateFrom, setFDateFrom] = useState('2026-01-01');
  const [fDateTo, setFDateTo]     = useState('2026-01-31');
  const [chartPolls, setChartPolls] = useState(new Set(['pm25', 'pm10', 'no2', 'co']));
  const [chartType, setChartType] = useState('line');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterKey, setFilterKey] = useState(0);
  const [hoveredRow, setHoveredRow] = useState(null);

  const districts = [...new Set(SENSORS.map((s) => s.district))];

  // bump filterKey whenever filters change so rows re-animate
  const prevFilter = useRef('');
  const filterStr = fSensors.size + fDistricts.size + fAqi.size + fDateFrom + fDateTo;
  if (filterStr !== prevFilter.current) { prevFilter.current = filterStr; }
  useEffect(() => { setFilterKey(k => k + 1); setCurrentPage(1); }, [fSensors, fDistricts, fAqi, fDateFrom, fDateTo]);

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

  // Unique sensor IDs present after all filters — drives chart mode
  const chartSensorIds = [...new Set(filtered.map(r => r.sensorId))];
  const singleSensor = chartSensorIds.length === 1;

  const chartData = singleSensor
    ? filtered.filter(r => r.sensorId === chartSensorIds[0])
    : chartSensorIds.map(id => ({
        sensorId: id,
        sensorName: SENSORS.find(s => s.id === id)?.name || String(id),
        rows: filtered.filter(r => r.sensorId === id),
      }));

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

      {/* TOP BAR */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, padding: '24px 24px 0 24px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L ? 'Archivio Dati' : 'Data Archive'}
        </span>
        
      </div>

      {/* FILTER PANEL */}
      <div style={{ borderBottom: '1px solid var(--gray)', background: 'var(--white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setFiltersOpen((o) => !o)}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)' }}>
            {L ? 'Filtri' : 'Filters'} — <span style={{ color: 'var(--gray2)', fontWeight: 400 }}>{filtered.length.toLocaleString()} {L ? 'letture orarie' : 'hourly readings'}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); exportCSV(); }}
              style={{ padding: '7px 18px', background: 'var(--primary)', color: 'var(--white)', border: 'none', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ↓ CSV
            </button>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: 13, color: 'var(--black)', fontWeight: 400 }}>{filtersOpen ? '▲' : '▼'}</span>
          </div>
        </div>

        {filtersOpen && (
          <div style={{ padding: '16px 28px 20px', borderTop: '1px solid var(--gray)' }}>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--gray)' }}>
              {/* DATE */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>{L ? 'Periodo' : 'Period'}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)}
                    style={{ border: '1.5px solid var(--gray2)', fontFamily: 'Source Serif 4', fontSize: 12, padding: '4px 8px', background: 'var(--white)' }} />
                  <span style={{ fontSize: 10, color: 'var(--gray2)' }}>→</span>
                  <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)}
                    style={{ border: '1.5px solid var(--gray2)', fontFamily: 'Source Serif 4', fontSize: 12, padding: '4px 8px', background: 'var(--white)' }} />
                </div>
              </div>
              {/* SENSORS */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>{L ? 'Sensore' : 'Sensor'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={pillStyle(fSensors.has('all'))} onClick={() => setFSensors(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
                  {SENSORS.map((s) => (
                    <span key={s.id} style={pillStyle(fSensors.has(String(s.id)))} onClick={() => toggleSet(fSensors, setFSensors, String(s.id), 'all')}>{s.name}</span>
                  ))}
                </div>
              </div>
              {/* DISTRICTS */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>{L ? 'Quartiere' : 'District'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={pillStyle(fDistricts.has('all'))} onClick={() => setFDistricts(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
                  {districts.map((d) => (
                    <span key={d} style={pillStyle(fDistricts.has(d))} onClick={() => toggleSet(fDistricts, setFDistricts, d, 'all')}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              {/* AQI */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>AQI</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {LEVELS.map((l) => (
                    <span key={l.key} style={pillStyle(fAqi.has(l.index), l.color)}
                      onClick={() => { const s = new Set(fAqi); s.has(l.index) ? s.delete(l.index) : s.add(l.index); setFAqi(s.size ? s : new Set([0, 1, 2, 3, 4, 5])); }}>
                      {L ? l.it : l.en}
                    </span>
                  ))}
                </div>
              </div>
              {/* CHART POLLUTANTS — not applicable for heatmap */}
              {chartType !== 'heatmap' && (
                <div>
                  <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>{L ? 'Inquinanti nel grafico' : 'Chart pollutants'}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.keys(POLLUTANTS).map((k) => (
                      <span key={k} style={pillStyle(chartPolls.has(k))}
                        onClick={() => { const s = new Set(chartPolls); s.has(k) ? (s.size > 1 && s.delete(k)) : s.add(k); setChartPolls(s); }}>
                        {POLLUTANTS[k].name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* CHART TYPE */}
              <div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 10 }}>{L ? 'Tipo di grafico' : 'Chart type'}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { key: 'line',    it: 'Linea',         en: 'Line' },
                    { key: 'bar',     it: 'Barre orarie',  en: 'Hourly bars' },
                    { key: 'heatmap', it: 'Mappa annuale', en: 'Daily heatmap' },
                  ].map(({ key, it, en }) => (
                    <span key={key} style={pillStyle(chartType === key)} onClick={() => setChartType(key)}>
                      {L ? it : en}
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
          {chartType === 'line' && (
            <>
              {L ? 'Andamento orario — ' : 'Hourly trend — '}
              {singleSensor
                ? (SENSORS.find(s => s.id === chartSensorIds[0])?.name || '')
                : `${chartSensorIds.length} ${L ? 'sensori' : 'sensors'}`}
              {!singleSensor && <span style={{ fontWeight: 400, marginLeft: 8, color: '#BDBAB4' }}>— Y: {L ? 'livello AQI peggiore' : 'worst AQI level'} (0–5)</span>}
            </>
          )}
          {chartType === 'bar' && (
            <>{L ? 'Media per ora del giorno — ' : 'Mean by hour of day — '}{fDateFrom} → {fDateTo}</>
          )}
          {chartType === 'heatmap' && (
            <>{L ? 'AQI massimo giornaliero — ' : 'Daily max AQI — '}{fDateFrom} → {fDateTo}</>
          )}
        </div>

        {chartType === 'line' && (
          <MultiLineChart
            data={chartData}
            pollutants={[...chartPolls]}
            mode={singleSensor ? 'pollutant' : 'sensor'}
            width={900} height={220}
          />
        )}
        {chartType === 'bar' && (
          <HourlyBarChart data={filtered} pollutants={[...chartPolls]} lang={lang} width={900} height={220} />
        )}
        {chartType === 'heatmap' && (
          <DailyHeatmap data={filtered} lang={lang} width={900} height={220} />
        )}
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
              const rowKey = `${r.sensorId}-${r.dateStr}`;
              const isHovered = hoveredRow === rowKey;
              const expandBg = 'color-mix(in srgb, var(--primary) 6%, var(--white))';
              return (
                <Fragment key={`${filterKey}-${r.sensorId}-${r.dateObj}`}>
                  <tr
                    className="archive-row-animate"
                    style={{ animationDelay: `${i * 18}ms`, background: isHovered ? expandBg : '' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => { setSelectedSensor(SENSORS.find((s) => s.id === r.sensorId)); setPage('record'); }}
                  >
                    <td style={{ color: '#9B9790', fontSize: 11 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span style={{ fontFamily: 'Epilogue', fontWeight: 700 }}>{r.sensorName}</span></td>
                    <td><span>{r.district}</span></td>
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
                  {isHovered && (
                    <tr
                      onMouseEnter={() => setHoveredRow(rowKey)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td colSpan={12} style={{ padding: '0 24px 14px', background: expandBg, borderBottom: '2px solid var(--primary)' }}>
                        <div style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>
                          {r.sensorName} — {r.dateStr}
                        </div>
                        <HourlyBarChart
                          data={HOURLY_DATA.filter(d => d.sensorId === r.sensorId && d.dateStr === r.dateStr)}
                          pollutants={['pm25', 'pm10', 'no2', 'co']}
                          lang={lang}
                          width={860}
                          height={120}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
                style={{ padding: '6px 12px', border: '1.5px solid var(--gray2)', borderRight: p < Math.min(totalPages, 7) ? 'none' : '1.5px solid var(--gray2)', background: p === currentPage ? 'var(--primary)' : 'transparent', color: p === currentPage ? '#fff' : '#111', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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

