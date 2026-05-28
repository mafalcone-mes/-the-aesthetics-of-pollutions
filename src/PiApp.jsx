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

const IMG_W = 180;
const IMG_H = 120;

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
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 400,
    textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.01em',
    color: 'var(--black)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)' }}>

      {/* Col 1 — Image */}
      <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid var(--gray)' }}>
        <img src="/assets/Piazza-Fontana-1.jpg" alt="Piazza Fontana"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
      </div>

      {/* Col 2 — Map */}
      <div style={{ flex: 1, borderRight: '1px solid var(--gray)' }}>
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

      {/* Col 3 — Labels on top, health rec below */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Labels + AQI scale */}
        <div style={{
          flex: 1, padding: '14px 18px', borderBottom: '1px solid var(--gray)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: L ? 'Sensore' : 'Sensor', value: sensor?.name ?? '—' },
              { label: L ? 'Strada' : 'Street', value: SENSOR_META.street },
              { label: L ? 'Proprietario' : 'Owner', value: SENSOR_META.owner },
              { label: L ? 'Installazione' : 'Installed', value: SENSOR_META.installed },
            ].map((item, i) => (
              <div key={i}>
                <div style={LABEL}>{item.label}</div>
                <div style={VALUE}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ ...LABEL, marginBottom: 5 }}>{L ? 'Scala AQI' : 'AQI Scale'}</div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
              {LEVELS.map(l => (
                <div key={l.key} style={{
                  flex: 1, height: 8, background: l.color,
                  outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                  outlineOffset: 2, opacity: l.key === lv.key ? 1 : 0.45,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
              <span>1 — {L ? 'Buono' : 'Good'}</span>
              <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
            </div>
          </div>
        </div>

        {/* Health rec — general pop top, sensitive pop bottom */}
        <div style={{ flex: 1, background: lv.color, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
              {L ? "Qualità dell'aria" : 'Air Quality'} — {L ? lv.it : lv.en}
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
              {L ? 'Popolazione generale' : 'General population'}
            </div>
            {suggestions?.gen && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{suggestions.gen}</div>
            )}
          </div>
          <div style={{ flex: 1, padding: '10px 18px' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
              {L ? 'Popolazione sensibile' : 'Sensitive population'}
            </div>
            {suggestions?.sen && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{suggestions.sen}</div>
            )}
          </div>
        </div>

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
