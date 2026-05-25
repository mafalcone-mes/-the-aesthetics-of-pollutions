import { useState, useEffect } from 'react';
import { SENSORS } from './data/sensors';
import TopBar from './components/TopBar';
import MobileNav from './components/MobileNav';
import { TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakRadio } from './components/tweaks/TweaksPanel';
import useTweaks from './components/tweaks/useTweaks';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ArchivePage from './pages/ArchivePage';
import RecordPage from './pages/RecordPage';
import SymptomsPage from './pages/SymptomsPage';
import ReportPage from './pages/ReportPage';
import AboutPanel from './components/AboutPanel';

const TWEAK_DEFAULTS = {
  darkMode: false,
  fontScale: 1,
  lang: 'it',
  variant: 'brutalist',
};

export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('it');
  const [selectedSensor, setSelectedSensor] = useState(SENSORS[1]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    if (tweaks.darkMode) {
      document.documentElement.style.setProperty('--black', '#F0F0F0');
      document.documentElement.style.setProperty('--white', '#1A1A1A');
      document.documentElement.style.setProperty('--gray',  '#222');
      document.documentElement.style.setProperty('--gray2', '#666');
    } else {
      document.documentElement.style.setProperty('--black', '#1A1A1A');
      document.documentElement.style.setProperty('--white', '#F0F0F0');
      document.documentElement.style.setProperty('--gray',  '#DDDAD3');
      document.documentElement.style.setProperty('--gray2', '#9B9790');
    }
  }, [tweaks.darkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${tweaks.fontScale * 16}px`;
  }, [tweaks.fontScale]);

  return (
    <div className="app-shell">
      <TopBar page={page} setPage={setPage} lang={lang} setLang={setLang} onNavHover={setHoveredNav} />
      <main className="main-content">
        {page === 'home'     && <HomePage     lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} hoveredNav={hoveredNav} />}
        {page === 'map'      && <MapPage      lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
        {page === 'archive'  && <ArchivePage  lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
        {page === 'record'   && <RecordPage   lang={lang} sensor={selectedSensor} />}
        {page === 'symptoms' && <SymptomsPage lang={lang} setPage={setPage} />}
        {page === 'report'   && <ReportPage   lang={lang} />}
      </main>
      <footer className="footer">
        <span className="footer-text">Aria Bene Comune — Linux Group Taranto — 2026</span>
        <span className="footer-text">{lang === 'it' ? 'Dati simulati a scopo dimostrativo' : 'Simulated data for demonstration'}</span>
      </footer>
      <MobileNav page={page} setPage={setPage} lang={lang} />
      <button
        className={`about-tab${aboutOpen ? ' open' : ''}`}
        onClick={() => setAboutOpen(prev => !prev)}
        aria-label={lang === 'it' ? 'Limiti inquinanti' : 'Pollutant thresholds'}
        aria-pressed={aboutOpen}
      >
        {lang === 'it' ? 'Limiti inquinanti' : 'Thresholds'}
      </button>
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} lang={lang} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Aspetto">
          <TweakToggle label="Dark mode" value={tweaks.darkMode} onChange={(v) => setTweak('darkMode', v)} />
          <TweakSlider label="Testo" min={0.8} max={1.3} step={0.05} unit="×" value={tweaks.fontScale} onChange={(v) => setTweak('fontScale', v)} />
        </TweakSection>
        <TweakSection title="Lingua">
          <TweakRadio label="Lingua" value={lang.toUpperCase()} options={['IT', 'EN']} onChange={(v) => setLang(v.toLowerCase())} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
