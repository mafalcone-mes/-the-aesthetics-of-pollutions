import { useState, useEffect } from 'react';
import { LiveDataProvider, useLiveData } from './contexts/LiveDataContext';
import RecordPage from './pages/RecordPage';
import { getSensorAQI } from './utils/aqi';

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
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--white)', color: 'var(--black)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pi-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <PiNav page="record" setPage={() => {}} lang={lang} setLang={setLang} liveAge={liveAge} />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <RecordPage
          lang={lang}
          sensor={liveSensor}
          liveHistory={liveHistory.length > 0 ? liveHistory : undefined}
          hideAqiRow
          hideMap
          titleStyle={{ fontFamily: "'Ronzino Variable', sans-serif", fontVariationSettings: `"BLND" ${Math.max(50, ai * 200)}` }}
        />
      </div>
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
