import { useState, useEffect, useRef, useCallback } from 'react';
import { SENSORS } from './data/sensors';
import { MOCK_REPORTS } from './data/reports';
import { getSensorAQI } from './utils/aqi';
import TopBar from './components/TopBar';
import MobileNav from './components/MobileNav';
import { TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakRadio } from './components/tweaks/TweaksPanel';
import useTweaks from './components/tweaks/useTweaks';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ArchivePage from './pages/ArchivePage';
import RecordPage from './pages/RecordPage';
import SymptomsPage from './pages/SymptomsPage';
import AboutPage from './pages/AboutPage';
import AboutPanel from './components/AboutPanel';
import PageTransition from './components/PageTransition';
import CustomCursor from './components/CustomCursor';

const TWEAK_DEFAULTS = {
  darkMode: false,
  fontScale: 1,
  lang: 'it',
  variant: 'brutalist',
};

const VALID_PAGES = ['home', 'map', 'archive', 'record', 'symptoms', 'about'];

// Lets external static pages (e.g. the printable guide) deep-link in via
// ?page=map&lang=en instead of always landing on Home — read once on mount,
// ignored after that.
function getInitialPage() {
  const p = new URLSearchParams(window.location.search).get('page');
  return VALID_PAGES.includes(p) ? p : 'home';
}
function getInitialLang() {
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'it';
}

export default function App() {
  const [page, setPage] = useState(getInitialPage);
  const [lang, setLang] = useState(getInitialLang);
  const [selectedSensor, setSelectedSensor] = useState(SENSORS[1]);
  const transitionRef = useRef(null);

  // Symptom reports — seeded with mock data, then live submissions (from the
  // Symptoms/Map report form) append on top so Archive's qualitative table
  // can read the same shared list for the whole session.
  const [reports, setReports] = useState(MOCK_REPORTS);
  const addReport = useCallback((entry) => setReports((prev) => [entry, ...prev]), []);
  const reportsControl = { reports, addReport };

  const navigate = useCallback((newPage, sensor = null) => {
    if (sensor) setSelectedSensor(sensor);
    transitionRef.current?.trigger(() => setPage(newPage));
  }, []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    setHeroVisible(page === 'home');
  }, [page]);

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

  useEffect(() => {
    document.documentElement.style.setProperty('--font-display', "'Epilogue', sans-serif");
    document.documentElement.style.setProperty('--font-blend', '0');
  }, []);


  return (
    <div className="app-shell">
      <CustomCursor />
      <TopBar page={page} setPage={navigate} lang={lang} setLang={setLang} onNavHover={setHoveredNav} heroVisible={heroVisible} />
      <main className="main-content">
        {page === 'home'     && <HomePage     lang={lang} hoveredNav={hoveredNav} onHeroVisible={setHeroVisible} setPage={navigate} setSelectedSensor={setSelectedSensor} reportsControl={reportsControl} />}
        {page === 'map'      && <MapPage      lang={lang} setPage={navigate} setSelectedSensor={setSelectedSensor} />}
        {page === 'archive'  && <ArchivePage  lang={lang} setPage={navigate} setSelectedSensor={setSelectedSensor} reports={reports} />}
        {page === 'record'   && <RecordPage   lang={lang} sensor={selectedSensor} hideAqiRow hideMap fitHeight="calc(100vh - 64px)" />}
        {page === 'symptoms' && <SymptomsPage lang={lang} reportsControl={reportsControl} />}
        {page === 'about'    && <AboutPage    lang={lang} />}
      </main>
      <footer className="footer">
        <span className="footer-text">Aria Bene Comune — Linux Group Taranto — 2026</span>
        <span className="footer-text">{lang === 'it' ? 'Dati simulati a scopo dimostrativo' : 'Simulated data for demonstration'}</span>
      </footer>
      <MobileNav page={page} setPage={navigate} lang={lang} />
      <PageTransition ref={transitionRef} />
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
