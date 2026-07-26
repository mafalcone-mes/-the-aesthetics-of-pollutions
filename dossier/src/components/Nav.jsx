export default function Nav({ page, setPage, lang, setLang }) {
  const L = lang === 'it';
  return (
    <nav className="dossier-nav">
      <div className="dossier-nav-mark" onClick={() => setPage('landing')}>
        <span>The Aesthetics</span><span className="dot">&middot;</span><span>of Pollution</span>
      </div>
      <div className="dossier-nav-links">
        <button className={page === 'research' ? 'active' : ''} onClick={() => setPage('research')}>
          {L ? 'La Ricerca' : 'The Research'}
        </button>
        <button className={page === 'guide' ? 'active' : ''} onClick={() => setPage('guide')}>
          {L ? 'Costruisci il Sensore' : 'Build the Sensor'}
        </button>
        <a href="https://ariabenecomune.com" target="_blank" rel="noreferrer noopener">
          {L ? 'Dashboard ↗' : 'Dashboard ↗'}
        </a>
        <div className="dossier-nav-lang">
          <button className={L ? 'active' : ''} onClick={() => setLang('it')}>IT</button>
          <button className={!L ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
    </nav>
  );
}
