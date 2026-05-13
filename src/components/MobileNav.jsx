const ITEMS = [
  { id: 'home',     icon: '◈', it: 'Home',     en: 'Home' },
  { id: 'archive',  icon: '▤', it: 'Archivio', en: 'Archive' },
  { id: 'symptoms', icon: '♡', it: 'Sintomi',  en: 'Symptoms' },
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
