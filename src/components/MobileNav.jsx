const ITEMS = [
  { id: 'home',    icon: '◈', it: 'Home',     en: 'Home' },
  { id: 'archive', icon: '▤', it: 'Archivio', en: 'Archive' },
  { id: 'about',   icon: '?', it: 'Chi siamo', en: 'About' },
];

export default function MobileNav({ page, setPage, lang }) {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {ITEMS.map((item) => (
          <button key={item.id} className={`mobile-nav-btn${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
            <span className="mobile-nav-icon">{item.icon}</span>
            {lang === 'it' ? item.it : item.en}
          </button>
        ))}
      </div>
    </nav>
  );
}
