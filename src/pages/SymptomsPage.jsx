import { useState } from 'react';
import ReportPage from './ReportPage';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';

const ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente',  label_en: 'Head / Mind', desc_it: 'Mal di testa, confusione, vertigini',       desc_en: 'Headache, confusion, dizziness' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',           label_en: 'Eyes',        desc_it: 'Lacrimazione, bruciore, arrossamento',       desc_en: 'Tearing, burning, redness' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',            label_en: 'Throat',      desc_it: 'Secchezza, irritazione, tosse secca',        desc_en: 'Dryness, irritation, dry cough' },
  chest:   { primary: 'particulates', label_it: 'Torace / Petto', label_en: 'Chest',       desc_it: 'Difficoltà respiratorie, affanno',           desc_en: 'Breathing difficulty, chest tightness' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',         label_en: 'Stomach',     desc_it: 'Nausea, vomito (esposizioni acute)',         desc_en: 'Nausea, vomiting (acute exposure)' },
};

const CATS = [
  { key: 'particulates', it: 'Particolato (PM2.5/PM10)',    en: 'Particulates (PM2.5/PM10)' },
  { key: 'gaseous',      it: 'Gas irritanti (NO₂/SO₂/O₃)', en: 'Gaseous (NO₂/SO₂/O₃)' },
  { key: 'systemic',     it: 'Sistemici (CO/NH₃/C₆H₆)',    en: 'Systemic (CO/NH₃/C₆H₆)' },
];

const ZONE_Y = {
  mind:    '25%',
  eyes:    '30%',
  throat:  '45%',
  chest:   '60%',
  stomach: '75%',
};

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};
const SELECT_STYLE = {
  width: '100%',
  border: '1.5px solid rgba(255,255,255,0.55)',
  background: 'transparent',
  color: '#fff',
  fontFamily: 'Epilogue',
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  padding: '5px 10px',
  cursor: 'pointer',
};

function BodyFigure({ activeZone, onSelectZone, zoneColors, categoryLevels, lang }) {
  const L = lang === 'it';
  return (
    <div className="body-callout-wrap">
      <img src="/assets/DSC01848.jpg" alt={L ? 'Figura corporea' : 'Body figure'} className="body-photo-real" />

      {/* Multi-level heatmap blobs — innermost = current level (hot/small), outermost = level 0 (cool/large) */}
      {Object.entries(ZONE_CATS).flatMap(([key, z]) => {
        const lvl = categoryLevels[z.primary];
        return Array.from({ length: lvl + 1 }, (_, blobLvl) => {
          const layerOuter = lvl - blobLvl; // 0 = innermost, lvl = outermost
          const lv = LEVELS[blobLvl];
          // Base size scales steeply with current level; outer rings add little
          const w = (8 + lvl * 5.5) + layerOuter * 4;
          const h = (4 + lvl * 2.7) + layerOuter * 2;
          const blur = 9 + layerOuter * 4;
          // Outer rings fade out fast so warm inner colors dominate
          const opacity = Math.max(0.06, 0.72 - layerOuter * 0.14);
          return (
            <div
              key={`blob-${key}-lv${blobLvl}`}
              style={{
                position: 'absolute',
                left: '38%',
                top: ZONE_Y[key],
                transform: 'translate(-50%, -50%)',
                width: `${w}vw`,
                height: `${h}vw`,
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${lv.color}ee 0%, ${lv.color}99 48%, transparent 75%)`,
                filter: `blur(${blur}px)`,
                opacity,
                mixBlendMode: 'screen',
                zIndex: 6 + blobLvl,
                pointerEvents: 'none',
              }}
            />
          );
        });
      })}

      {/* Dots */}
      {Object.entries(ZONE_CATS).map(([key, z]) => {
        const isActive = activeZone === key;
        const color = zoneColors[key];
        return (
          <button
            key={key}
            className={`body-callout-dot${isActive ? ' active' : ''}`}
            style={{
              position: 'absolute',
              left: '38%',
              top: ZONE_Y[key],
              transform: 'translate(-50%, -50%)',
              borderColor: color,
              background: isActive ? color : 'transparent',
              zIndex: 8,
            }}
            onClick={(e) => { e.stopPropagation(); onSelectZone(key); }}
            aria-label={L ? z.label_it : z.label_en}
          />
        );
      })}
    </div>
  );
}

export default function SymptomsPage({ lang }) {
  const [activeZone, setActiveZone] = useState(null);
  const [activeSensor, setActiveSensor] = useState('all');
  const L = lang === 'it';

  const availableDays = [...new Set(HOURLY_DATA.map((r) => {
    const d = r.dateObj;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }))].sort();
  const [activeDay, setActiveDay] = useState(availableDays[availableDays.length - 1]);

  const dayRows = HOURLY_DATA.filter((row) => {
    const d = row.dateObj;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key === activeDay;
  });
  const latestHourMs = dayRows.reduce((max, row) => Math.max(max, row.dateObj.getTime()), 0);
  const latestHourRows = dayRows.filter((row) => row.dateObj.getTime() === latestHourMs);
  const scopedRows = activeSensor === 'all'
    ? latestHourRows
    : latestHourRows.filter((row) => row.sensorId === Number(activeSensor));
  const rowsForCalc = scopedRows.length ? scopedRows : latestHourRows;

  const getCategoryLevel = (catKey) => {
    const keys = Object.keys(POLLUTANTS).filter((k) => POLLUTANTS[k].category === catKey);
    if (!keys.length) return 0;
    return Math.max(...keys.map((pollutantKey) => {
      const peak = Math.max(...rowsForCalc.map((row) => row[pollutantKey] || 0));
      return getPollLevel(pollutantKey, peak);
    }));
  };

  const categoryLevels = {
    particulates: getCategoryLevel('particulates'),
    gaseous:      getCategoryLevel('gaseous'),
    systemic:     getCategoryLevel('systemic'),
  };

  const zoneColors = Object.fromEntries(
    Object.entries(ZONE_CATS).map(([zoneKey, zone]) => [
      zoneKey,
      LEVELS[categoryLevels[zone.primary]].color,
    ])
  );

  const overallLevelIndex = Math.max(...Object.values(categoryLevels));
  const lvSuggestion = LEVELS[overallLevelIndex];

  const handleSelectZone = (key) => setActiveZone((prev) => (prev === key ? null : key));

  return (
    <div className="symptoms-page">

      {/* TITLE */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, padding: '24px 24px 0 24px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L ? 'Mappa Sintomi' : 'Symptoms Map'}
        </span>
      </div>

      {/* BODY PHOTO AREA */}
      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', overflow: 'hidden' }} onClick={() => setActiveZone(null)}>

        <BodyFigure activeZone={activeZone} onSelectZone={handleSelectZone} zoneColors={zoneColors} categoryLevels={categoryLevels} lang={lang} />

        {/* FLOATING OVERLAY PANEL */}
        <div
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 20, width: 'calc(100vw / 6 * 1.5)', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 'calc(100% - 40px)', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Selectors */}
          <div style={{ background: 'var(--primary)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{L ? 'Giorno' : 'Day'}</div>
            <select value={activeDay} onChange={(e) => setActiveDay(e.target.value)} style={SELECT_STYLE}>
              {availableDays.map((d) => (
                <option key={d} value={d} style={{ background: '#B7410E', color: '#fff' }}>
                  {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </option>
              ))}
            </select>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 2 }}>{L ? 'Sensore' : 'Sensor'}</div>
            <select value={activeSensor} onChange={(e) => setActiveSensor(e.target.value)} style={SELECT_STYLE}>
              <option value="all" style={{ background: '#B7410E', color: '#fff' }}>{L ? 'Tutta la rete' : 'Whole network'}</option>
              {SENSORS.map((s) => <option key={s.id} value={String(s.id)} style={{ background: '#B7410E', color: '#fff' }}>{s.name}</option>)}
            </select>
          </div>

          {/* Health rec */}
          <div style={{ background: lvSuggestion.color, padding: '12px 14px', textAlign: 'left' }}>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
              {L ? "QUALITÀ ARIA" : 'AIR QUALITY'}
            </div>
            <div style={{ fontFamily: 'Epilogue', fontSize: 52, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 14 }}>
              {L ? lvSuggestion.it : lvSuggestion.en}
            </div>
            {[
              { who: L ? 'Popolazione generale' : 'General population', text: SUGGESTIONS[lvSuggestion.key]?.gen },
              { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lvSuggestion.key]?.sen },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                <div style={{ ...SUB_LABEL, fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>{s.who}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.55, color: '#fff' }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* Organ symptoms panel */}
          {activeZone && (() => {
            const zone = ZONE_CATS[activeZone];
            const catKey = zone.primary;
            const levelIndex = categoryLevels[catKey];
            const lv = LEVELS[levelIndex];
            const sym = SYMPTOMS[catKey][lv.key];
            const noSym = !sym || (sym.gen === 'No symptoms' && sym.sen === 'No symptoms');
            return (
              <div style={{ background: lv.color, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)' }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? lv.it : lv.en}
                  </div>
                  <button onClick={() => setActiveZone(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 52, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 14 }}>
                  {L ? zone.label_it : zone.label_en}
                </div>
                {noSym ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
                    {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
                  </div>
                ) : (
                  [
                    { who: L ? 'Popolazione generale' : 'General population', text: sym.gen },
                    { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: sym.sen },
                  ].filter(s => s.text && s.text !== 'No symptoms').map((s, i) => (
                    <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                      <div style={{ ...SUB_LABEL, fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>{s.who}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.55, color: '#fff' }}>{s.text}</div>
                    </div>
                  ))
                )}
                <button
                  style={{ marginTop: 12, width: '100%', padding: '7px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                  onClick={() => document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {L ? 'SEGNALA UN SINTOMO →' : 'REPORT A SYMPTOM →'}
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* SYMPTOMS MATRIX */}
      <div className="symptoms-matrix-section">
        {CATS.map((cat) => {
          const lvIdx = categoryLevels[cat.key];
          const catLv = LEVELS[lvIdx];
          return (
            <div key={cat.key} className="symptoms-matrix-cat" style={{ borderLeft: `5px solid ${catLv.color}` }}>
              <div
                className="symptoms-matrix-cat-header"
                style={{ background: `color-mix(in srgb, ${catLv.color} 14%, var(--white))` }}
              >
                <span className="symptoms-matrix-cat-title">{L ? cat.it.split(' (')[0] : cat.en.split(' (')[0]}</span>
                <span className="symptoms-matrix-cat-sub">
                  {cat.key === 'particulates' ? 'PM2.5 · PM10' : cat.key === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}
                </span>
                <span className="symptoms-matrix-current-badge" style={{ background: catLv.color }}>
                  <span>{lvIdx + 1}</span>
                  <span>{L ? catLv.it : catLv.en}</span>
                </span>
              </div>
              <div className="symptoms-matrix-levels">
                {LEVELS.map((lv) => {
                  const sym = SYMPTOMS[cat.key][lv.key];
                  const isCurrent = categoryLevels[cat.key] === lv.index;
                  const noSym = !sym || (sym.gen === 'No symptoms' && sym.sen === 'No symptoms');
                  return (
                    <div key={lv.key} className={`symptoms-matrix-cell${isCurrent ? ' current' : ''}`} style={{ borderTop: `3px solid ${lv.color}` }}>
                      <div className="symptoms-matrix-level-badge" style={{ background: lv.color }}>
                        <span>{lv.index + 1}</span>
                        <span>{L ? lv.it : lv.en}</span>
                      </div>
                      {noSym ? (
                        <div className="symptoms-matrix-none">—</div>
                      ) : (
                        <>
                          {sym.gen !== 'No symptoms' && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">{L ? 'Gen.' : 'Gen.'}</span>
                              <span className="symptoms-matrix-text">{sym.gen}</span>
                            </div>
                          )}
                          {sym.sen !== 'No symptoms' && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">{L ? 'Sen.' : 'Sen.'}</span>
                              <span className="symptoms-matrix-text">{sym.sen}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div id="report-section">
        <ReportPage lang={lang} />
      </div>
    </div>
  );
}
