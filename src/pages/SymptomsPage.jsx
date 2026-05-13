import { useState } from 'react';
import ReportPage from './ReportPage';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';

const ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente',   label_en: 'Head / Mind', desc_it: 'Mal di testa, confusione, vertigini',       desc_en: 'Headache, confusion, dizziness' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',            label_en: 'Eyes',        desc_it: 'Lacrimazione, bruciore, arrossamento',       desc_en: 'Tearing, burning, redness' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',             label_en: 'Throat',      desc_it: 'Secchezza, irritazione, tosse secca',        desc_en: 'Dryness, irritation, dry cough' },
  chest:   { primary: 'particulates', label_it: 'Torace / Petto',  label_en: 'Chest',       desc_it: 'Difficoltà respiratorie, affanno',           desc_en: 'Breathing difficulty, chest tightness' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',          label_en: 'Stomach',     desc_it: 'Nausea, vomito (esposizioni acute)',         desc_en: 'Nausea, vomiting (acute exposure)' },
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

function BodyFigure({ activeZone, onSelectZone, zoneColors, lang }) {
  const L = lang === 'it';
  return (
    <div className="body-callout-wrap">
      <img
        src="/assets/DSC01848.jpg"
        alt={L ? 'Figura corporea' : 'Body figure'}
        className="body-photo-real"
      />
      {Object.entries(ZONE_CATS).map(([key, z]) => {
        const isActive = activeZone === key;
        const color = zoneColors[key];
        return (
          <div key={key} className="body-callout-row" style={{ top: ZONE_Y[key] }}>
            <button
              className={`body-callout-dot${isActive ? ' active' : ''}`}
              style={{ borderColor: color, background: isActive ? color : 'transparent' }}
              onClick={(e) => { e.stopPropagation(); onSelectZone(key); }}
              aria-label={L ? z.label_it : z.label_en}
            />
            <div className="body-callout-line" style={{ background: color, opacity: isActive ? 1 : 0.45 }} />
          </div>
        );
      })}
    </div>
  );
}

function ZonePopup({ zoneKey, zoneColors, categoryLevels, lang, onClose, onReport }) {
  const L = lang === 'it';
  const zone = ZONE_CATS[zoneKey];
  const catKey = zone.primary;
  const catObj = CATS.find((c) => c.key === catKey);
  const levelIndex = categoryLevels[catKey];
  const lv = LEVELS[levelIndex];
  const sym = SYMPTOMS[catKey][lv.key];
  const noSymptoms = sym?.gen === 'No symptoms';

  return (
    <div className="zone-popup" onClick={(e) => e.stopPropagation()}>

        <div className="zone-popup-header" style={{ borderBottom: `2px solid ${lv.color}` }}>
          <div>
            <div className="zone-popup-organ" style={{ color: lv.color }}>
              {L ? zone.label_it : zone.label_en}
            </div>
            <div className="zone-popup-cat">{L ? catObj.it : catObj.en}</div>
          </div>
          <button className="zone-popup-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="zone-popup-level" style={{ background: lv.color }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
          <span>{L ? lv.it : lv.en}</span>
          <span style={{ opacity: 0.7 }}>— {L ? 'Livello' : 'Level'} {lv.index + 1}</span>
        </div>

        <div className="zone-popup-symptoms">
          {noSymptoms ? (
            <div className="zone-popup-sym-empty">
              {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
            </div>
          ) : (
            <div className="zone-popup-sym-cols">
              <div className="zone-popup-sym-col">
                <div className="zone-popup-sym-label">{L ? 'Popolazione generale' : 'General population'}</div>
                <div className="zone-popup-sym-text">{sym?.gen}</div>
              </div>
              <div className="zone-popup-sym-col">
                <div className="zone-popup-sym-label">{L ? 'Popolazione sensibile' : 'Sensitive population'}</div>
                <div className="zone-popup-sym-text">{sym?.sen}</div>
              </div>
            </div>
          )}
        </div>

        <div className="zone-popup-footer">
          <div className="zone-popup-desc">{L ? zone.desc_it : zone.desc_en}</div>
          <button className="report-btn" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={onReport}>
            {L ? 'SEGNALA UN SINTOMO' : 'REPORT A SYMPTOM'}
            <span>→</span>
          </button>
        </div>
    </div>
  );
}

export default function SymptomsPage({ lang }) {
  const [activeZone, setActiveZone] = useState(null);
  const [popupZone, setPopupZone] = useState(null);
  const [activeDistrict, setActiveDistrict] = useState('all');
  const L = lang === 'it';

  const districts = [...new Set(SENSORS.map((s) => s.district))].sort((a, b) => a.localeCompare(b));

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
  const scopedRows = activeDistrict === 'all'
    ? latestHourRows
    : latestHourRows.filter((row) => row.district === activeDistrict);
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

  const handleSelectZone = (key) => {
    setActiveZone(key);
    setPopupZone(key);
  };

  const closePopup = () => setPopupZone(null);

  const handleReport = () => {
    closePopup();
    document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const SUB_LABEL_STYLE = {
    fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)',
  };

  return (
    <div className="symptoms-page">

      {/* TOP BAR */}
      <div style={{ padding: '24px 28px 0 28px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L ? 'Mappa Sintomi' : 'Symptoms Map'}
        </span>
      </div>

      <div className="map-page" style={{ minHeight: 0, height: 'calc(100vh - 160px)' }}>

        {/* SIDEBAR */}
        <div className="map-sidebar">

          {/* Description + selectors */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--gray)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65, color: 'var(--black)', margin: '0 0 12px 0' }}>
              {L
                ? "Seleziona un'area del corpo per scoprire come gli inquinanti nell'aria influenzano la tua salute. Ogni zona è colorata in base al livello attuale degli inquinanti che la colpiscono."
                : 'Select a body area to discover how air pollutants affect your health. Each zone is coloured by the current level of the pollutants that impact it most.'}
            </p>
            <div style={{ ...SUB_LABEL_STYLE, marginBottom: 4 }}>{L ? 'Quartiere' : 'Neighbourhood'}</div>
            <select
              value={activeDistrict}
              onChange={(e) => setActiveDistrict(e.target.value)}
              style={{ width: '100%', border: '1.5px solid var(--gray2)', fontFamily: 'Epilogue', fontSize: 11, padding: '6px 10px', background: 'var(--white)', letterSpacing: '0.04em', cursor: 'pointer', marginBottom: 10 }}
              aria-label={L ? 'Seleziona quartiere' : 'Select neighborhood'}
            >
              <option value="all">{L ? 'Tutta la rete' : 'Whole network'}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ ...SUB_LABEL_STYLE, marginBottom: 4 }}>{L ? 'Giorno' : 'Day'}</div>
            <select
              value={activeDay}
              onChange={(e) => setActiveDay(e.target.value)}
              style={{ width: '100%', border: '1.5px solid var(--gray2)', fontFamily: 'Epilogue', fontSize: 11, padding: '6px 10px', background: 'var(--white)', letterSpacing: '0.04em', cursor: 'pointer' }}
              aria-label={L ? 'Seleziona giorno' : 'Select day'}
            >
              {availableDays.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </option>
              ))}
            </select>
          </div>

          {/* Health recommendations — colored background */}
          <div style={{ background: lvSuggestion.color, borderBottom: '1px solid var(--gray)' }}>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ ...SUB_LABEL_STYLE, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                {L ? 'Raccomandazioni salute' : 'Health recommendations'}
              </div>
              {[
                { who: L ? 'Popolazione generale' : 'General population', text: SUGGESTIONS[lvSuggestion.key]?.gen },
                { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lvSuggestion.key]?.sen },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                  <div style={{ ...SUB_LABEL_STYLE, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{s.who}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Organ list */}
          <div style={{ ...SUB_LABEL_STYLE, padding: '12px 16px 8px', borderBottom: '1px solid var(--gray)' }}>
            {L ? 'Zone del corpo' : 'Body zones'}
          </div>
          <div className="map-sensor-list">
            {Object.entries(ZONE_CATS).map(([key, z]) => {
              const isSel = activeZone === key;
              const color = zoneColors[key];
              const lv = LEVELS[categoryLevels[z.primary]];
              return (
                <div
                  key={key}
                  className={`map-sensor-item${isSel ? ' selected' : ''}`}
                  onClick={() => handleSelectZone(key)}
                >
                  <div className="map-sensor-dot" style={{ background: color, borderRadius: '50%' }} />
                  <div className="map-sensor-info">
                    <div className="map-sensor-title">{L ? z.label_it : z.label_en}</div>
                    <div className="map-sensor-sub">{L ? z.desc_it : z.desc_en}</div>
                  </div>
                  <div className="map-sensor-aqi" style={{ color: isSel ? '#fff' : color }}>
                    {L ? lv.it : lv.en}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', padding: '16px 16px 24px', borderTop: '1px solid var(--gray)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, lineHeight: 1.6, color: 'var(--gray2)' }}>
              {L
                ? 'I sintomi indicati sono indicativi e basati su letteratura scientifica. In caso di sintomi gravi consultare un medico.'
                : 'Symptoms listed are indicative and based on scientific literature. In case of severe symptoms, consult a doctor.'}
            </div>
          </div>

        </div>

        {/* RIGHT: body photo with callout + popup */}
        <div
          className="map-area"
          style={{ background: 'var(--gray)', display: 'flex', flexDirection: 'column' }}
          onClick={closePopup}
        >
          <BodyFigure activeZone={activeZone} onSelectZone={handleSelectZone} zoneColors={zoneColors} lang={lang} />
          {popupZone && (
            <ZonePopup
              zoneKey={popupZone}
              zoneColors={zoneColors}
              categoryLevels={categoryLevels}
              lang={lang}
              onClose={closePopup}
              onReport={handleReport}
            />
          )}
        </div>

      </div>

      {/* SYMPTOMS MATRIX */}
      <div className="symptoms-matrix-section">
        {CATS.map((cat) => (
          <div key={cat.key} className="symptoms-matrix-cat">
            <div className="symptoms-matrix-cat-header">
              <span className="symptoms-matrix-cat-title">{L ? cat.it.split(' (')[0] : cat.en.split(' (')[0]}</span>
              <span className="symptoms-matrix-cat-sub">
                {cat.key === 'particulates' ? 'PM2.5 · PM10' : cat.key === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}
              </span>
            </div>
            <div className="symptoms-matrix-levels">
              {LEVELS.map((lv) => {
                const sym = SYMPTOMS[cat.key][lv.key];
                const isCurrent = categoryLevels[cat.key] === lv.index;
                const noSym = !sym || sym.gen === 'No symptoms';
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
                        <div className="symptoms-matrix-row">
                          <span className="symptoms-matrix-who">{L ? 'Gen.' : 'Gen.'}</span>
                          <span className="symptoms-matrix-text">{sym.gen}</span>
                        </div>
                        <div className="symptoms-matrix-row">
                          <span className="symptoms-matrix-who">{L ? 'Sen.' : 'Sen.'}</span>
                          <span className="symptoms-matrix-text">{sym.sen}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div id="report-section">
        <ReportPage lang={lang} />
      </div>
    </div>
  );
}
