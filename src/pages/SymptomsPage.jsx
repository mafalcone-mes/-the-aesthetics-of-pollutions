import { useState } from 'react';
import { LEVELS } from '../data/levels';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI } from '../utils/aqi';

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

function BodyFigure({ activeZone, setActiveZone, levelColor }) {
  return (
    <svg viewBox="0 0 120 300" style={{ width: '100%', maxWidth: 160, height: 'auto' }}>
      <ellipse cx="60" cy="34" rx="22" ry="26"
        fill={activeZone === 'mind' ? levelColor : '#DDDAD3'} stroke="#111010" strokeWidth="2"
        opacity={activeZone === 'mind' ? 0.75 : 1} style={{ cursor: 'pointer' }} onClick={() => setActiveZone('mind')} />
      <ellipse cx="51" cy="30" rx="5" ry="5"
        fill={activeZone === 'eyes' ? levelColor : '#111010'} opacity="0.85"
        style={{ cursor: 'pointer' }} onClick={() => setActiveZone('eyes')} />
      <ellipse cx="69" cy="30" rx="5" ry="5"
        fill={activeZone === 'eyes' ? levelColor : '#111010'} opacity="0.85"
        style={{ cursor: 'pointer' }} onClick={() => setActiveZone('eyes')} />
      <rect x="52" y="58" width="16" height="14"
        fill={activeZone === 'throat' ? levelColor : '#DDDAD3'} stroke="#111010" strokeWidth="1.5"
        opacity={activeZone === 'throat' ? 0.7 : 1} style={{ cursor: 'pointer' }} onClick={() => setActiveZone('throat')} />
      <path d="M30,72 L90,72 L90,127 L30,127 Z"
        fill={activeZone === 'chest' ? levelColor : '#DDDAD3'} stroke="#111010" strokeWidth="2"
        opacity={activeZone === 'chest' ? 0.65 : 1} style={{ cursor: 'pointer' }} onClick={() => setActiveZone('chest')} />
      <path d="M30,127 L90,127 L88,170 L32,170 Z"
        fill={activeZone === 'stomach' ? levelColor : '#DDDAD3'} stroke="#111010" strokeWidth="1.5"
        opacity={activeZone === 'stomach' ? 0.65 : 1} style={{ cursor: 'pointer' }} onClick={() => setActiveZone('stomach')} />
      <path d="M30,72 L8,148 L20,152 L36,86" fill="#DDDAD3" stroke="#111010" strokeWidth="1.5" />
      <path d="M90,72 L112,148 L100,152 L84,86" fill="#DDDAD3" stroke="#111010" strokeWidth="1.5" />
      <path d="M42,170 L36,265 L52,265 L60,188 L68,265 L84,265 L78,170 Z" fill="#DDDAD3" stroke="#111010" strokeWidth="1.5" />
      {activeZone === 'chest'   && <path d="M30,72 L90,72 L90,127 L30,127 Z"     fill="none" stroke={levelColor} strokeWidth="2.5" opacity="0.6" />}
      {activeZone === 'stomach' && <path d="M30,127 L90,127 L88,170 L32,170 Z"  fill="none" stroke={levelColor} strokeWidth="2.5" opacity="0.6" />}
    </svg>
  );
}

export default function SymptomsPage({ lang }) {
  const [activeCat, setActiveCat] = useState('particulates');
  const [activeZone, setActiveZone] = useState('chest');
  const L = lang === 'it';

  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lv = LEVELS[globalAQI];
  const zoneInfo = ZONE_CATS[activeZone];

  const handleZone = (key) => {
    setActiveZone(key);
    setActiveCat(ZONE_CATS[key].primary);
  };

  const LEFT_LABELS = [
    { key: 'mind',   it: 'Mente', en: 'Mind' },
    { key: 'eyes',   it: 'Occhi', en: 'Eyes' },
    { key: 'throat', it: 'Gola',  en: 'Throat' },
  ];
  const RIGHT_LABELS = [
    { key: 'chest',   it: 'Petto',   en: 'Chest' },
    { key: 'stomach', it: 'Stomaco', en: 'Stomach' },
  ];

  return (
    <div className="symptoms-page">
      {/* TOP BAR */}
      <div className="symptoms-top-bar">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.01em', fontSize: '50px' }}>
            {L ? 'Mappa Sintomi' : 'Symptoms Map'}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontStyle: 'italic', color: '#9B9790' }}>
            {L ? "Seleziona un'area del corpo" : 'Select a body area'}
          </div>
        </div>
        <div className="symptoms-aqi-center" style={{ borderColor: lv.color }}>
          <div className="symptoms-aqi-num" style={{ color: lv.color }}>{globalAQI + 1}</div>
          <div>
            <div className="symptoms-aqi-text" style={{ color: lv.color }}>{L ? lv.it : lv.en}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontStyle: 'italic', color: '#9B9790' }}>
              {L ? 'Media rete · Live' : 'Network avg · Live'}
            </div>
          </div>
        </div>
        <div className="symptoms-suggestion-mini">
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 4 }}>
            {L ? 'Raccomandazione' : 'Recommendation'}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.55 }}>{SUGGESTIONS[lv.key]?.gen}</div>
        </div>
      </div>

      {/* 3-COLUMN BODY AREA */}
      <div className="symptoms-body-area">
        {/* LEFT: zone selector */}
        <div className="symptoms-left-panel">
          <div style={{ padding: '12px 20px', borderBottom: 'var(--border)', fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790' }}>
            {L ? 'Aree del corpo' : 'Body areas'}
          </div>
          <div className="symptoms-zone-list">
            {Object.entries(ZONE_CATS).map(([key, z]) => (
              <button key={key} className={`symptoms-zone-btn${activeZone === key ? ' active' : ''}`} onClick={() => handleZone(key)}>
                <div className="zone-indicator" />
                <div>
                  <div>{L ? z.label_it : z.label_en}</div>
                  <div className="zone-desc">{L ? z.desc_it : z.desc_en}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ borderTop: 'var(--border)' }}>
            <div style={{ padding: '10px 16px 0', fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790' }}>
              {L ? 'Comportamento consigliato' : 'Recommended behavior'}
            </div>
            <div className="suggestion-mini-box" style={{ borderColor: lv.color + '80' }}>
              <div className="suggestion-mini-label">{L ? 'Popolazione generale' : 'General population'}</div>
              <div className="suggestion-mini-text">{SUGGESTIONS[lv.key]?.gen}</div>
            </div>
            <div className="suggestion-mini-box" style={{ marginTop: -6, borderColor: lv.color + '80' }}>
              <div className="suggestion-mini-label">{L ? 'Popolazione sensibile' : 'Sensitive population'}</div>
              <div className="suggestion-mini-text">{SUGGESTIONS[lv.key]?.sen}</div>
            </div>
          </div>
        </div>

        {/* CENTER: body figure */}
        <div className="symptoms-figure-col">
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790' }}>
              {L ? zoneInfo.label_it : zoneInfo.label_en}
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingLeft: 12 }}>
              {LEFT_LABELS.map((z) => (
                <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: activeZone === z.key ? 1 : 0.4, transition: 'opacity 0.15s' }} onClick={() => handleZone(z.key)}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: activeZone === z.key ? lv.color : 'var(--black)' }}>
                    {L ? z.it : z.en}
                  </div>
                  <div style={{ width: 24, height: 1, background: activeZone === z.key ? lv.color : '#9B9790' }} />
                </div>
              ))}
            </div>
            <BodyFigure activeZone={activeZone} setActiveZone={handleZone} levelColor={lv.color} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingRight: 12 }}>
              {RIGHT_LABELS.map((z) => (
                <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: activeZone === z.key ? 1 : 0.4, transition: 'opacity 0.15s' }} onClick={() => handleZone(z.key)}>
                  <div style={{ width: 24, height: 1, background: activeZone === z.key ? lv.color : '#9B9790' }} />
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: activeZone === z.key ? lv.color : 'var(--black)' }}>
                    {L ? z.it : z.en}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontStyle: 'italic', color: '#9B9790', textAlign: 'center', maxWidth: 200 }}>
              {L ? zoneInfo.desc_it : zoneInfo.desc_en}
            </div>
          </div>
        </div>

        {/* RIGHT: symptom matrix */}
        <div className="symptoms-right-panel">
          <div className="symptoms-cat-tabs">
            {CATS.map((c) => (
              <button key={c.key} className={`symptom-cat-btn${activeCat === c.key ? ' active' : ''}`} onClick={() => setActiveCat(c.key)}>
                {L ? c.it.split(' (')[0] : c.en.split(' (')[0]}
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--gray)', fontFamily: 'var(--font-body)', fontSize: 11, fontStyle: 'italic', color: '#9B9790' }}>
            {activeCat === 'particulates' ? 'PM2.5 / PM10' : activeCat === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}
          </div>
          <div className="symptom-matrix">
            {LEVELS.map((l) => {
              const sym = SYMPTOMS[activeCat][l.key];
              const isCurrent = l.key === lv.key;
              const isFuture = l.index > lv.index;
              return (
                <div key={l.key} className={`matrix-row${isCurrent ? ' current-level' : isFuture ? ' faded' : ''}`}>
                  <div className="matrix-level" style={{ background: l.color }} />
                  <div className="matrix-level-label">
                    <div className="matrix-level-num" style={{ color: isCurrent ? '#fff' : l.color }}>{l.index + 1}</div>
                    <div className="matrix-level-name">{L ? l.it : l.en}</div>
                  </div>
                  <div className="matrix-content">
                    {sym?.gen === 'No symptoms'
                      ? <div className="matrix-sym" style={{ fontStyle: 'italic' }}>—</div>
                      : <>
                          <div>
                            <div className="matrix-who">{L ? 'Generale' : 'General'}</div>
                            <div className="matrix-sym">{sym?.gen}</div>
                          </div>
                          <div>
                            <div className="matrix-who">{L ? 'Sensibile' : 'Sensitive'}</div>
                            <div className="matrix-sym sensitive">{sym?.sen}</div>
                          </div>
                        </>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="symptoms-bottom">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, color: '#9B9790', fontStyle: 'italic' }}>
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
  );
}
