import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI, getPollLevel } from '../utils/aqi';
import Sparkline from '../components/charts/Sparkline';
import HeatMap from '../components/charts/HeatMap';

export default function RecordPage({ lang, sensor }) {
  if (!sensor) {
    return <div style={{ padding: 40, fontFamily: 'var(--font-body)', fontSize: 14, color: '#9B9790', fontStyle: 'italic' }}>Nessun sensore selezionato.</div>;
  }

  const L = lang === 'it';
  const ai = getSensorAQI(sensor);
  const lv = LEVELS[ai];
  const hist = Array.from({ length: 24 }, (_, i) => Math.max(2, sensor.pm25 * (0.6 + Math.sin(i * 0.5) * 0.4 + (i % 3) * 0.1)));
  const now = new Date();

  return (
    <div className="record-page">
      <div className="record-left">
        <div className="record-header">
          <div className="record-header-top">
            <div>
              <div className="record-title">{sensor.name}</div>
              <div className="record-meta">{sensor.location}</div>
              <div className="record-meta">{now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          <div className="record-aqi-big" style={{ borderColor: lv.color }}>
            <div className="record-aqi-num" style={{ color: lv.color }}>{ai + 1}</div>
            <div className="record-aqi-info">
              <div className="record-aqi-level" style={{ color: lv.color }}>{L ? lv.it : lv.en}</div>
              <div className="record-aqi-date">AQI {L ? 'indice' : 'index'} · {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>

        <div className="chart-area">
          <div className="chart-title">PM2.5 μg/m³ — {L ? 'ultime 24 ore' : 'last 24 hours'}</div>
          <div className="sparkline-container"><Sparkline data={hist} color={lv.color} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map((t) => (
              <span key={t} style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontStyle: 'italic', color: '#9B9790' }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: 'var(--border)' }}>
          {/* Mini map */}
          <div style={{ borderRight: 'var(--border)', padding: '16px 20px' }}>
            <div className="chart-title" style={{ marginBottom: 10 }}>{L ? 'Posizione sensore' : 'Sensor location'}</div>
            <svg viewBox="0 0 200 160" style={{ width: '100%', border: '1.5px solid var(--gray)', background: '#E8E4DC', display: 'block' }}>
              {Array.from({ length: 9 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} stroke="#D0CBB8" strokeWidth="0.5" />)}
              {Array.from({ length: 11 }).map((_, i) => <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="160" stroke="#D0CBB8" strokeWidth="0.5" />)}
              <path d="M20,20 L80,15 L130,22 L160,35 L175,60 L170,100 L155,125 L120,138 L80,140 L40,130 L20,100 L15,60 Z" fill="#E0DBD1" stroke="#C5C0B8" strokeWidth="1" />
              <path d="M155,60 L185,70 L185,110 L160,120 L155,100 Z" fill="#C8D8E8" opacity="0.6" />
              <rect x="12" y="55" width="38" height="30" fill="#B5213D" opacity="0.08" stroke="#B5213D" strokeWidth="0.8" strokeDasharray="3,2" />
              {SENSORS.filter((s) => s.id !== sensor.id).map((s) => (
                <circle key={s.id} cx={s.x * 200} cy={s.y * 160} r="3" fill="#9B9790" opacity="0.45" />
              ))}
              <circle cx={sensor.x * 200} cy={sensor.y * 160} r="16" fill={lv.color} opacity="0.12" />
              <circle cx={sensor.x * 200} cy={sensor.y * 160} r="9"  fill={lv.color} opacity="0.3" />
              <circle cx={sensor.x * 200} cy={sensor.y * 160} r="5"  fill={lv.color} stroke="#111010" strokeWidth="1.5" />
              <text x={sensor.x * 200} y={sensor.y * 160 + 3} textAnchor="middle" fontSize="5" fontFamily="Epilogue" fontWeight="700" fill="#111010">{sensor.id}</text>
              <rect x={Math.min(Math.max(sensor.x * 200 - 24, 2), 150)} y={sensor.y * 160 - 20} width="48" height="11" fill="white" stroke="#111010" strokeWidth="0.8" />
              <text x={sensor.x * 200} y={sensor.y * 160 - 12} textAnchor="middle" fontSize="5.5" fontFamily="Epilogue" fontWeight="700" fill="#111010">{sensor.name}</text>
            </svg>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontStyle: 'italic', color: '#9B9790', marginTop: 6 }}>{sensor.district} — {sensor.location}</div>
          </div>
          {/* Heatmap */}
          <div style={{ padding: '16px 20px' }}>
            <div className="chart-title" style={{ marginBottom: 10 }}>{L ? 'Heatmap PM2.5 — 7 giorni × 24h' : 'PM2.5 Heatmap — 7 days × 24h'}</div>
            <HeatMap sensor={sensor} lang={lang} />
          </div>
        </div>

        <div className="pollutants-grid">
          {Object.entries(POLLUTANTS).map(([key, p]) => {
            const val = sensor[key] || 0;
            const li = getPollLevel(key, val);
            const lvc = LEVELS[li];
            const pct = Math.min((val / (p.ranges[p.ranges.length - 2][1] || 1)) * 100, 100);
            return (
              <div key={key} className="pollutant-cell">
                <div className="poll-name">{p.name}</div>
                <div className="poll-value" style={{ color: lvc.color }}>{val}</div>
                <div className="poll-unit">{p.unit}</div>
                <div className="poll-bar"><div className="poll-bar-fill" style={{ width: `${pct}%`, background: lvc.color }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="record-right">
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, color: '#9B9790' }}>
          {L ? 'Raccomandazioni' : 'Recommendations'}
        </div>
        <div style={{ height: 4, background: lv.color, marginBottom: 16 }} />
        {[
          { who: L ? 'Popolazione generale'  : 'General population',   text: SUGGESTIONS[lv.key]?.gen },
          { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lv.key]?.sen },
        ].map((s, i) => (
          <div key={i} className="suggestion-box" style={{ marginBottom: 10 }}>
            <div className="suggestion-box-label">{s.who}</div>
            <div>{s.text}</div>
          </div>
        ))}

        <div style={{ marginTop: 24, fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 12 }}>
          {L ? 'Sintomi associati' : 'Associated symptoms'}
        </div>
        {[
          { catKey: 'particulates', label: L ? 'Particolato (PM2.5/PM10)' : 'Particulates' },
          { catKey: 'gaseous',      label: L ? 'Gas irritanti (NO₂/SO₂/O₃)' : 'Gaseous irritants' },
          { catKey: 'systemic',     label: L ? 'Sistemici (CO/NH₃/C₆H₆)' : 'Systemic' },
        ].map(({ catKey, label }) => {
          const s = SYMPTOMS[catKey][lv.key];
          if (!s) return null;
          return (
            <div key={catKey} className="suggestion-box">
              <div className="suggestion-box-label">{label}</div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>
                <strong style={{ fontFamily: 'var(--font-title)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{L ? 'Generale' : 'General'}</strong><br />{s.gen}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                <strong style={{ fontFamily: 'var(--font-title)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#111' }}>{L ? 'Sensibile' : 'Sensitive'}</strong><br />{s.sen}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 24, fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 6 }}>
          {L ? 'Scala AQI' : 'AQI Scale'}
        </div>
        <div style={{ display: 'flex' }}>
          {LEVELS.map((l) => (
            <div key={l.key} style={{ flex: 1, height: 8, background: l.color, outline: l.key === lv.key ? '2px solid #111010' : 'none', outlineOffset: 1 }} title={L ? l.it : l.en} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontStyle: 'italic', color: '#9B9790' }}>1 — {L ? 'Buono' : 'Good'}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontStyle: 'italic', color: '#9B9790' }}>6 — {L ? 'Estremo' : 'Extreme'}</span>
        </div>
      </div>
    </div>
  );
}
