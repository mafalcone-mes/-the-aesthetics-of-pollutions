import { useState } from 'react';
import Nav from './components/Nav';
import Landing from './pages/Landing';
import Research from './pages/Research';
import Guide from './pages/Guide';

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'research' | 'guide'
  const [lang, setLang] = useState('en'); // 'it' | 'en'

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="dossier-shell">
      <div className="grain-overlay" aria-hidden="true" />
      <Nav page={page} setPage={goTo} lang={lang} setLang={setLang} />
      <main className="dossier-main">
        {page === 'landing' && <Landing setPage={goTo} lang={lang} />}
        {page === 'research' && <Research setPage={goTo} lang={lang} />}
        {page === 'guide' && <Guide lang={lang} />}
      </main>
      <footer className="dossier-footer">
        <span>Aria Bene Comune — {lang === 'it' ? 'dati simulati/dimostrativi' : 'simulated / demonstration data'}</span>
        <span>© {new Date().getFullYear()} Matteo Falcone · Linux Jonix Group</span>
      </footer>
    </div>
  );
}
