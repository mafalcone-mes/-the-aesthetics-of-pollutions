const NAV = [
  { id: 'archive', it: 'Archivio', en: 'Archive' },
  { id: 'about',   it: 'Chi siamo', en: 'About' },
];

export default function TopBar({ page, setPage, lang, setLang, onNavHover }) {
  return (
    <nav className="topbar">
      <div className="topbar-logo" onClick={() => setPage('home')}>
        <span>ARIA</span><span>BENE</span><span>COMUNE</span>
      </div>
      <div className="topbar-center">
        <div className="lang-toggle">
          <button className={lang === 'it' ? 'active' : ''} onClick={() => setLang('it')}>IT</button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
      <div className="topbar-nav">
        {NAV.map((n) => (
          <a
            key={n.id}
            className={page === n.id ? 'active' : ''}
            onClick={() => setPage(n.id)}
            onMouseEnter={() => onNavHover && onNavHover(n.id)}
            onMouseLeave={() => onNavHover && onNavHover(null)}
          >
            {lang === 'it' ? n.it : n.en}
          </a>
        ))}
      </div>
    </nav>
  );
}
