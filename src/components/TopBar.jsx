const NAV = [
  { id: 'map',      it: 'Mappa',    en: 'Map' },
  { id: 'archive',  it: 'Archivio', en: 'Archive' },
  { id: 'symptoms', it: 'Sintomi',  en: 'Symptoms' },
  { id: 'report',   it: 'Segnala',  en: 'Report' },
];

export default function TopBar({ page, setPage, lang, setLang }) {
  const now = new Date();
  return (
    <nav className="topbar">
      <div className="topbar-logo" onClick={() => setPage('home')}>
        <span>ARIA</span><span>BENE</span><span>COMUNE</span>
      </div>
      <div className="topbar-center">
        <div className="topbar-weather">
          <div>20°C · 56% Hum.</div>
          <div>{now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
        </div>
        <div className="lang-toggle">
          <button className={lang === 'it' ? 'active' : ''} onClick={() => setLang('it')}>IT</button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
      <div className="topbar-nav">
        {NAV.map((n) => (
          <a key={n.id} className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>
            {lang === 'it' ? n.it : n.en}
          </a>
        ))}
      </div>
    </nav>
  );
}
