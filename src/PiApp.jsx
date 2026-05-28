import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveDataProvider, useLiveData } from './contexts/LiveDataContext';
import RecordPage from './pages/RecordPage';
import { LEVELS } from './data/levels';
import { SUGGESTIONS } from './data/symptoms';
import { getSensorAQI } from './utils/aqi';
import { SENSORS } from './data/sensors';

const SENSOR_META = {
  street:    'Piazza Fontana',
  owner:     'Tonio Baghdad',
  installed: '28.05.2026',
};

const IMG_W = 320;
const IMG_H = 460;

function SensorCard({ sensor, lang }) {
  const L = lang === 'it';

  const ai = sensor ? getSensorAQI(sensor) : 0;
  const lv = LEVELS[ai];
  const suggestions = SUGGESTIONS[lv.key];

  const LABEL = {
    fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.4)', marginBottom: 3,
  };
  const VALUE = {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
    textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.01em',
    color: 'var(--black)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)' }}>

      {/* 1 — Piazza Fontana */}
      <div style={{ width: IMG_W, height: IMG_H, flexShrink: 0, overflow: 'hidden', borderRight: '1px solid var(--gray)' }}>
        <img src="/assets/Piazza-Fontana-1.jpg" alt="Piazza Fontana"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
      </div>

      {/* 2 — Map */}
      <div style={{ width: IMG_W, height: IMG_H, flexShrink: 0, borderRight: '1px solid var(--gray)' }}>
        <MapContainer
          center={[40.4760, 17.2270]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {SENSORS.map(s => {
            const slv = LEVELS[getSensorAQI(s)];
            return (
              <CircleMarker key={s.id} center={[s.lat, s.lon]} radius={8}
                pathOptions={{ fillColor: slv.color, fillOpacity: 0.75, color: '#111', weight: 1.5 }} />
            );
          })}
        </MapContainer>
      </div>

      {/* 3 — Sensor metadata + AQI scale */}
      <div style={{
        flex: 1, padding: '28px 32px', borderRight: '1px solid var(--gray)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 24,
      }}>
        <div>
          <div style={LABEL}>{L ? 'Sensore' : 'Sensor'}</div>
          <div style={VALUE}>{sensor?.name ?? '—'}</div>
        </div>
        <div>
          <div style={LABEL}>{L ? 'Strada' : 'Street'}</div>
          <div style={VALUE}>{SENSOR_META.street}</div>
        </div>
        <div>
          <div style={LABEL}>{L ? 'Proprietario' : 'Owner'}</div>
          <div style={VALUE}>{SENSOR_META.owner}</div>
        </div>
        <div>
          <div style={LABEL}>{L ? 'Installazione' : 'Installed'}</div>
          <div style={VALUE}>{SENSOR_META.installed}</div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ ...LABEL, marginBottom: 8 }}>{L ? 'Scala AQI' : 'AQI Scale'}</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {LEVELS.map(l => (
              <div key={l.key} style={{
                flex: 1, height: 10, background: l.color,
                outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                outlineOffset: 2,
                opacity: l.key === lv.key ? 1 : 0.45,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
            <span>1 — {L ? 'Buono' : 'Good'}</span>
            <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
          </div>
        </div>
      </div>

      {/* 4 — Health recommendation */}
      <div style={{
        flex: 1, background: lv.color, padding: '28px 32px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
            {L ? "Qualità dell'aria" : 'Air Quality'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
            {L ? lv.it : lv.en}
          </div>
        </div>

        {[
          { who: L ? 'Popolazione generale' : 'General population', text: suggestions?.gen },
          { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: suggestions?.sen },
        ].map((s, i) => s.text && (
          <div key={i}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>{s.who}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: '#fff' }}>{s.text}</div>
          </div>
        ))}
      </div>

    </div>
  );
}


function LiveBadge({ liveAge }) {
  const isLive = liveAge !== null && liveAge < 90;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: isLive ? '#22c55e' : 'rgba(0,0,0,0.35)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isLive ? '#22c55e' : 'rgba(0,0,0,0.25)',
        display: 'inline-block',
        animation: isLive ? 'pi-pulse 2s infinite' : 'none',
      }} />
      {isLive ? 'Live' : 'Offline'}
    </div>
  );
}

function PiNav({ page, setPage, lang, setLang, liveAge }) {
  const L = lang === 'it';
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--white)', borderBottom: '1px solid var(--gray)',
      display: 'flex', alignItems: 'center', padding: '0 16px', height: 52, gap: 8,
    }}>
      <span style={{
        fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: 8,
        whiteSpace: 'nowrap',
      }}>
        Aria Bene Comune
      </span>

      <div style={{ flex: 1 }} />

      <button onClick={() => setLang(l => l === 'it' ? 'en' : 'it')} style={{
        padding: '4px 10px', background: 'transparent', cursor: 'pointer',
        border: '1px solid rgba(0,0,0,0.22)',
        fontFamily: 'Epilogue', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)',
      }}>
        {lang === 'it' ? 'EN' : 'IT'}
      </button>

      <LiveBadge liveAge={liveAge} />
    </div>
  );
}

function PiDashboard() {
  const [lang, setLang] = useState('it');
  const { liveSensor, liveHistory, liveAge } = useLiveData();

  const ai = liveSensor ? getSensorAQI(liveSensor) : 0;
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--font-display', "'Ronzino Variable', sans-serif");
    el.style.setProperty('--font-blend', String(ai * 200));
  }, [ai]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--white)', color: 'var(--black)' }}>
      <style>{`
        @keyframes pi-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <PiNav page="record" setPage={() => {}} lang={lang} setLang={setLang} liveAge={liveAge} />

      <RecordPage
        lang={lang}
        sensor={liveSensor}
        liveHistory={liveHistory.length > 0 ? liveHistory : undefined}
        afterTitle={<SensorCard sensor={liveSensor} lang={lang} />}
        hideAqiRow
        hideMap
        titleStyle={{ fontFamily: "'Ronzino Variable', sans-serif", fontVariationSettings: `"BLND" ${Math.max(50, ai * 200)}` }}
      />
    </div>
  );
}

export default function PiApp() {
  return (
    <LiveDataProvider>
      <PiDashboard />
    </LiveDataProvider>
  );
}
