import { useState } from 'react';

export function CaseHeader({ caseNo, location, status, title, dek }) {
  return (
    <header className="case-header">
      <div className="case-header-meta">
        <div className="case-header-meta-item">
          <span className="stamp">Case No.</span>
          <span className="stamp stamp--accent">{caseNo}</span>
        </div>
        <div className="case-header-meta-item">
          <span className="stamp">Location</span>
          <span className="stamp">{location}</span>
        </div>
        <div className="case-header-meta-item">
          <span className="stamp">Status</span>
          <span className="stamp stamp--accent">{status}</span>
        </div>
      </div>
      <h1 className="case-header-title">{title}</h1>
      {dek && <p className="case-header-dek">{dek}</p>}
    </header>
  );
}

export function SectionMarker({ num, title, id }) {
  return (
    <div id={id} className="section-marker" style={{ scrollMarginTop: 68 }}>
      <span className="section-marker-num">{String(num).padStart(2, '0')}</span>
      <span className="section-marker-title">{title}</span>
    </div>
  );
}

export function P({ children }) {
  return <p className="dossier-p">{children}</p>;
}

export function Lede({ children }) {
  return <p className="dossier-lede">{children}</p>;
}

export function H2({ children }) {
  return <h2 className="dossier-h2">{children}</h2>;
}

export function UL({ items }) {
  return (
    <ul className="dossier-ul">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

export function OL({ items }) {
  return (
    <ol className="dossier-ol">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  );
}

export function Annex({ label, children }) {
  return (
    <div className="annex">
      <div className="annex-label">{label}</div>
      <div className="annex-body">{children}</div>
    </div>
  );
}

export function Table({ headers, rows }) {
  return (
    <div className="dossier-table-wrap">
      <table className="dossier-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CodeBlock({ children, label = 'terminal' }) {
  const [copied, setCopied] = useState(false);
  const code = Array.isArray(children) ? children.join('') : children;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="dossier-code-wrap">
      <div className="dossier-code-head">
        <span>{label}</span>
        <button type="button" className="dossier-code-copy" onClick={copy}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export function EvidenceGrid({ items }) {
  return (
    <div className="evidence-grid">
      {items.map((c) => (
        <div key={c.name} className="evidence-card">
          <div className="evidence-card-img-wrap">
            <img src={c.img} alt={c.name} />
            {c.tag && <span className="evidence-card-tag">{c.tag}</span>}
          </div>
          <div className="evidence-card-body">
            <div className="evidence-card-name">{c.name}</div>
            <div className="evidence-card-role">{c.role}</div>
            <div className="evidence-card-detail">{c.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChapterNav({ prev, next }) {
  return (
    <nav className="chapter-nav" aria-label="Chapter navigation">
      {prev ? (
        <a href={`#${prev.id}`}>
          <span className="chapter-nav-label">&larr; Previous</span>
          <span className="chapter-nav-title">{prev.title}</span>
        </a>
      ) : <div style={{ flex: 1 }} />}
      {next ? (
        <a href={`#${next.id}`}>
          <span className="chapter-nav-label">Next &rarr;</span>
          <span className="chapter-nav-title">{next.title}</span>
        </a>
      ) : <div style={{ flex: 1 }} />}
    </nav>
  );
}
