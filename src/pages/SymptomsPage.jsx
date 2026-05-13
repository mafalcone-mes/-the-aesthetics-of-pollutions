import { useState } from 'react';
import ReportPage from './ReportPage';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';

const ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente',    label_en: 'Head / Mind', desc_it: 'Mal di testa, confusione, vertigini',       desc_en: 'Headache, confusion, dizziness' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',             label_en: 'Eyes',        desc_it: 'Lacrimazione, bruciore, arrossamento',       desc_en: 'Tearing, burning, redness' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',              label_en: 'Throat',      desc_it: 'Secchezza, irritazione, tosse secca',        desc_en: 'Dryness, irritation, dry cough' },
  chest:   { primary: 'particulates', label_it: 'Torace / Petto',   label_en: 'Chest',       desc_it: 'Difficoltà respiratorie, affanno',           desc_en: 'Breathing difficulty, chest tightness' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',           label_en: 'Stomach',     desc_it: 'Nausea, vomito (esposizioni acute)',         desc_en: 'Nausea, vomiting (acute exposure)' },
};

const CATS = [
  { key: 'particulates', it: 'Particolato (PM2.5/PM10)',    en: 'Particulates (PM2.5/PM10)' },
  { key: 'gaseous',      it: 'Gas irritanti (NO₂/SO₂/O₃)', en: 'Gaseous (NO₂/SO₂/O₃)' },
  { key: 'systemic',     it: 'Sistemici (CO/NH₃/C₆H₆)',    en: 'Systemic (CO/NH₃/C₆H₆)' },
];

const ORGAN_LAYOUT = [
  { key: 'mind', svg: 'mind', top: '19%', left: '53%', width: '33%', ratio: '50.29 / 60.19', zIndex: 2 },
  { key: 'eyes', svg: 'eyes', top: '22%', left: '31%', width: '10%', ratio: '12.09 / 7.35', zIndex: 4 },
  { key: 'throat', svg: 'throat', top: '35%', left: '39%', width: '16%', ratio: '33.57 / 43.16', zIndex: 3 },
  { key: 'chest', svg: 'lungs', top: '59%', left: '52%', width: '40%', ratio: '73.59 / 72.97', zIndex: 2 },
  { key: 'stomach', svg: 'stomach', top: '77%', left: '55%', width: '25%', ratio: '129.77 / 159.73', zIndex: 2 },
];

function BodyFigure({ activeZone, setActiveZone, zoneColors, lang }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const L = lang === 'it';

  return (
    <div className="body-image-wrap">
      <div className="body-figure-sizer">
        <img src="/assets/corpo.svg" alt={L ? 'Corpo umano con aree selezionabili' : 'Human body with selectable areas'} className="body-image body-image-base" />
        <div className="body-organs-layer">
        {ORGAN_LAYOUT.map((organ) => {
          const isActive = activeZone === organ.key;
          const isHovered = hoveredZone === organ.key;
          const zone = ZONE_CATS[organ.key];
          const zoneColor = zoneColors[organ.key];
          return (
            <button
              key={organ.key}
              type="button"
              className={`body-organ-btn${isActive ? ' active' : ''}`}
              aria-label={L ? zone.label_it : zone.label_en}
              onClick={() => setActiveZone(organ.key)}
              onMouseEnter={() => setHoveredZone(organ.key)}
              onMouseLeave={() => setHoveredZone(null)}
              style={{
                top: organ.top,
                left: organ.left,
                width: organ.width,
                aspectRatio: organ.ratio,
                zIndex: organ.zIndex,
                opacity: isActive ? 1 : 0.92,
                transform: isHovered && !isActive ? 'translate(-50%, -50%) scale(1.08)' : 'translate(-50%, -50%) scale(1)',
                filter: isActive ? `drop-shadow(0 0 8px ${zoneColor})` : 'none',
              }}
            >
              <span
                className="body-organ-fill"
                style={{
                  backgroundColor: zoneColor,
                  WebkitMaskImage: `url('/assets/${organ.svg}.svg')`,
                  maskImage: `url('/assets/${organ.svg}.svg')`,
                }}
              />
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

export default function SymptomsPage({ lang }) {
  const [activeCat, setActiveCat] = useState('particulates');
  const [activeZone, setActiveZone] = useState('chest');
  const [activeDistrict, setActiveDistrict] = useState('all');
  const L = lang === 'it';

  const districts = [...new Set(SENSORS.map((s) => s.district))].sort((a, b) => a.localeCompare(b));

  // Scope to last hour, filtered by selected neighborhood
  const latestHourMs = HOURLY_DATA.reduce((max, row) => Math.max(max, row.dateObj.getTime()), 0);
  const latestHourRows = HOURLY_DATA.filter((row) => row.dateObj.getTime() === latestHourMs);
  const scopedRows = activeDistrict === 'all'
    ? latestHourRows
    : latestHourRows.filter((row) => row.district === activeDistrict);
  const rowsForCalc = scopedRows.length ? scopedRows : latestHourRows;

  // For each category, find the highest pollutant level captured in the last hour
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

  // Each organ is colored by the level of its linked pollutant category
  const zoneColors = Object.fromEntries(
    Object.entries(ZONE_CATS).map(([zoneKey, zone]) => [
      zoneKey,
      LEVELS[categoryLevels[zone.primary]].color,
    ])
  );

  // Right panel highlights the selected category's current level
  const currentLevelIndex = categoryLevels[activeCat] ?? 0;
  const lv = LEVELS[currentLevelIndex];

  // Health suggestions always reflect the worst pollutant across all categories
  const overallLevelIndex = Math.max(...Object.values(categoryLevels));
  const lvSuggestion = LEVELS[overallLevelIndex];

  const handleZone = (key) => {
    setActiveZone(key);
    setActiveCat(ZONE_CATS[key].primary);
  };

  return (
    <div className="symptoms-page">
      {/* TOP BAR */}
      <div style={{ padding: '24px 28px 0 28px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L ? 'Mappa Sintomi' : 'Symptoms Map'}
        </span>
      </div>

      {/* STATUS BAR */}
      <div style={{ borderBottom: '1px solid var(--gray)', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)' }}>
            {L ? "Seleziona un'area del corpo" : 'Select a body area'}
            {' — '}
            <span style={{ color: lvSuggestion.color }}>{L ? lvSuggestion.it : lvSuggestion.en}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={activeDistrict}
              onChange={(e) => setActiveDistrict(e.target.value)}
              style={{ border: '1.5px solid var(--gray2)', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400, padding: '6px 12px', background: 'var(--white)', letterSpacing: '0.04em', cursor: 'pointer' }}
              aria-label={L ? 'Seleziona quartiere' : 'Select neighborhood'}
            >
              <option value="all">{L ? 'Tutta la rete' : 'Whole network'}</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <span style={{ padding: '7px 14px', background: lvSuggestion.color, color: '#fff', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {SUGGESTIONS[lvSuggestion.key]?.gen}
            </span>
          </div>
        </div>
      </div>

      {/* SINGLE BODY AREA */}
      <div className="symptoms-body-area">
        {/* Body figure with overlaid info cards */}
        <div className="symptoms-left-panel">
          {Object.entries(ZONE_CATS).map(([key, z]) => {
            const isActive = activeZone === key;
            const zoneColor = zoneColors[key];
            return (
              <button
                key={key}
                className={`symptom-zone-filter-btn${isActive ? ' active' : ''}`}
                style={isActive ? { background: zoneColor } : {}}
                onClick={() => handleZone(key)}
              >
                <div className="symptom-level-dot" style={{ background: zoneColor, opacity: isActive ? 1 : 0.8 }} />
                <div className="symptom-zone-body">
                  <div className="filter-label" style={isActive ? { color: 'var(--white)' } : {}}>{L ? z.label_it : z.label_en}</div>
                  <div className="symptom-cat-sub" style={isActive ? { color: 'rgba(255,255,255,0.65)' } : {}}>{L ? z.desc_it : z.desc_en}</div>
                </div>
              </button>
            );
          })}
          <div className="symptoms-left-footer">
            <div className="symptoms-left-disclaimer">
              {L
                ? 'I sintomi indicati sono indicativi e basati su letteratura scientifica. In caso di sintomi gravi consultare un medico.'
                : 'Symptoms listed are indicative and based on scientific literature. In case of severe symptoms, consult a doctor.'}
            </div>
            <button className="report-btn">
              <span>⚠</span>
              {L ? 'SEGNALA UN SINTOMO' : 'REPORT A SYMPTOM'}
            </button>
          </div>
        </div>

        <div className="symptoms-figure-col">
            <div className="symptoms-body-visual" style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', flex: 1, minHeight: 0, paddingTop: '10%' }}>
              <BodyFigure activeZone={activeZone} setActiveZone={handleZone} zoneColors={zoneColors} lang={lang} />
            </div>
          </div>

        {/* Symptom cards */}
        <div className="symptoms-right-panel">
          <div className="symptoms-cards-overlay">
            {/* Category selector cards */}
            <div className="symptoms-cat-cards">
              {CATS.map((c) => (
                <button key={c.key} className={`symptom-cat-filter-btn${activeCat === c.key ? ' active' : ''}`} onClick={() => setActiveCat(c.key)}>
                  <span className="filter-label">{L ? c.it.split(' (')[0] : c.en.split(' (')[0]}</span>
                  <span className="symptom-cat-sub">{c.key === 'particulates' ? 'PM2.5 / PM10' : c.key === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}</span>
                </button>
              ))}
            </div>
            {/* Level symptom list */}
            <div className="symptoms-level-list">
              {LEVELS.map((l) => {
                const sym = SYMPTOMS[activeCat][l.key];
                const isCurrent = l.key === lv.key;
                const isFuture = l.index > lv.index;
                return (
                  <div key={l.key} className={`symptom-level-row${isCurrent ? ' active' : ''}${isFuture ? ' faded' : ''}`} style={isCurrent ? { background: l.color } : {}}>
                    <div className="symptom-level-dot" style={{ background: l.color, opacity: isCurrent ? 1 : 0.85 }} />
                    <div className="symptom-level-body">
                      <div className="symptom-level-header">
                        <span style={{ fontFamily: 'var(--font-title)', fontSize: 15, fontWeight: 900, lineHeight: 1, color: isCurrent ? 'var(--white)' : l.color }}>{l.index + 1}</span>
                        <span className="map-sensor-title" style={{ color: isCurrent ? 'var(--white)' : undefined }}>{L ? l.it : l.en}</span>
                      </div>
                      {sym?.gen === 'No symptoms'
                        ? <div className="map-sensor-sub" style={{ color: isCurrent ? 'rgba(255,255,255,0.6)' : undefined }}>—</div>
                        : <>
                            <div className="map-sensor-sub" style={{ color: isCurrent ? 'rgba(255,255,255,0.75)' : undefined }}><span style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>{L ? 'Gen · ' : 'Gen · '}</span>{sym?.gen}</div>
                            <div className="map-sensor-sub" style={{ color: isCurrent ? 'rgba(255,255,255,0.75)' : undefined, marginTop: 2 }}><span style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>{L ? 'Sen · ' : 'Sen · '}</span>{sym?.sen}</div>
                          </>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ReportPage lang={lang} />
    </div>
  );
}

