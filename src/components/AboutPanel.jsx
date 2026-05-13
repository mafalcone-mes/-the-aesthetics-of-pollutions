import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';

const CATS = [
  { key: 'particulates', it: 'Particolato',   en: 'Particulates', pollutants: ['pm25', 'pm10'] },
  { key: 'gaseous',      it: 'Gas irritanti', en: 'Gaseous',       pollutants: ['no2', 'o3', 'so2'] },
  { key: 'systemic',     it: 'Sistemici',     en: 'Systemic',      pollutants: ['co', 'nh3', 'c6h6'] },
];

const POLLUTANT_DESCS = {
  pm25: {
    it: 'Particolato fine con diametro inferiore a 2.5 µm. Penetra profondamente nei polmoni e nel flusso sanguigno; principale causa di malattie cardiovascolari e respiratorie legate all\'inquinamento atmosferico.',
    en: 'Fine particulate matter (⌀ < 2.5 µm). Penetrates deep into lungs and bloodstream; a leading cause of pollution-related cardiovascular and respiratory disease.',
  },
  pm10: {
    it: 'Particolato con diametro inferiore a 10 µm. Emesso da traffico, cantieri e industrie; irrita le vie respiratorie superiori e gli occhi.',
    en: 'Particulate matter (⌀ < 10 µm). Emitted by traffic, construction and industry; irritates the upper airways and eyes.',
  },
  no2: {
    it: 'Biossido di azoto. Prodotto principalmente da traffico veicolare e combustioni industriali; irrita le vie respiratorie e precursore dell\'ozono troposferico.',
    en: 'Nitrogen dioxide. Mainly from vehicle traffic and industrial combustion; irritates airways and is a precursor to ground-level ozone.',
  },
  o3: {
    it: 'Ozono troposferico. Si forma per reazione fotochemica tra NO₂ e composti organici volatili (COV) sotto la luce solare; causa irritazione polmonare e riduzione della funzione respiratoria.',
    en: 'Tropospheric ozone. Forms via photochemical reaction between NO₂ and VOCs in sunlight; causes lung irritation and reduced respiratory function.',
  },
  so2: {
    it: 'Biossido di zolfo. Emesso da impianti industriali e centrali a carbone — fonte storica e attuale a Taranto; irrita le vie respiratorie e contribuisce alle piogge acide.',
    en: 'Sulphur dioxide. Emitted by industrial plants and coal-fired power stations; irritates airways and contributes to acid rain.',
  },
  co: {
    it: 'Monossido di carbonio. Gas inodore prodotto dalla combustione incompleta; si lega all\'emoglobina riducendo il trasporto di ossigeno nel sangue.',
    en: 'Carbon monoxide. Odourless gas from incomplete combustion; binds to haemoglobin reducing oxygen transport in the blood.',
  },
  nh3: {
    it: 'Ammoniaca. Emessa da allevamenti e fertilizzanti agricoli; contribuisce alla formazione di particolato secondario e all\'acidificazione degli ecosistemi.',
    en: 'Ammonia. Emitted by livestock farming and fertilisers; contributes to secondary particulate formation and ecosystem acidification.',
  },
  c6h6: {
    it: 'Benzene. Idrocarburo aromatico presente nella benzina e nei fumi industriali; classificato come cancerogeno di gruppo 1 dallo IARC, senza soglia di sicurezza nota.',
    en: 'Benzene. Aromatic hydrocarbon in petrol fumes and industrial emissions; IARC Group 1 carcinogen with no known safe threshold.',
  },
};

const LEVEL_DESCS = {
  buono:                { it: 'Nessun rischio significativo per la salute.',                                   en: 'No significant health risk.' },
  sufficiente:          { it: 'Rischio molto basso; la popolazione sensibile può avvertire lievi effetti.',    en: 'Very low risk; sensitive groups may experience mild effects.' },
  mediocre:             { it: 'Rischio moderato; le persone sensibili possono avvertire effetti sulla salute.', en: 'Moderate risk; sensitive people may experience health effects.' },
  scarso:               { it: 'La salute può risentirne; raccomandata prudenza per tutti.',                     en: 'Health may be affected; caution recommended for everyone.' },
  'molto-scarso':       { it: 'Effetti sulla salute probabili; limitare le attività all\'aperto.',             en: 'Health effects likely; limit outdoor activities.' },
  'estremamente-scarso':{ it: 'Emergenza sanitaria; evitare le attività all\'aperto.',                        en: 'Health emergency; avoid outdoor activities.' },
};

const fRange = ([lo, hi]) => `${lo}–${hi >= 999 ? '∞' : hi}`;

function ThresholdTable({ cat, L }) {
  const pollKeys = cat.pollutants;
  return (
    <table className="about-table">
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>{L ? 'Livello' : 'Level'}</th>
          {pollKeys.map((k) => (
            <th key={k}>{POLLUTANTS[k].name}<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{POLLUTANTS[k].unit}</span></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {LEVELS.map((lv, i) => (
          <tr key={lv.key}>
            <td>
              <span className="about-level-cell">
                <span className="about-level-dot" style={{ background: lv.color }} />
                <span>{lv.index + 1} — {L ? lv.it : lv.en}</span>
              </span>
            </td>
            {pollKeys.map((k) => (
              <td key={k}>{fRange(POLLUTANTS[k].ranges[i])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AboutPanel({ open, onClose, lang }) {
  const L = lang === 'it';
  return (
    <>
      <div className={`about-overlay${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`about-panel${open ? ' open' : ''}`} role="dialog" aria-modal="true">
        <button className="about-panel-close" onClick={onClose} aria-label="Chiudi">✕</button>
        <div className="about-panel-body">

          <div className="about-panel-intro">
            <div className="about-panel-intro-title">
              {L ? 'Limiti\nInquinanti' : 'Pollutant\nThresholds'}
            </div>
          </div>

          {/* WHO methodology */}
          <div className="about-panel-section">
            <h2>{L ? 'Metodologia' : 'Methodology'}</h2>
            <p>
              {L
                ? 'Le soglie utilizzate si basano sulle linee guida dell\'Organizzazione Mondiale della Sanità (WHO Air Quality Guidelines, 2021), adattate a un sistema a 6 livelli per facilitare la comunicazione del rischio alla popolazione.'
                : 'The thresholds used are based on the World Health Organisation guidelines (WHO Air Quality Guidelines, 2021), adapted into a 6-level system to communicate risk clearly to the public.'}
            </p>
            <p>
              {L
                ? 'Il livello complessivo di un sensore è determinato dall\'inquinante con il valore più critico (worst-case): se anche un solo inquinante risulta scarso, l\'indice generale riflette quella criticità.'
                : 'A sensor\'s overall level is set by the single worst-performing pollutant: if even one pollutant reads Poor, the overall index reflects that.'}
            </p>
          </div>

          {/* Color scale */}
          <div className="about-panel-section">
            <h2>{L ? 'Scala cromatica' : 'Colour scale'}</h2>
            <div className="about-scale-list">
              {LEVELS.map((lv) => (
                <div key={lv.key} className="about-scale-row">
                  <span className="about-scale-swatch" style={{ background: lv.color }} />
                  <div className="about-scale-text">
                    <span className="about-scale-label">{lv.index + 1} — {L ? lv.it : lv.en}</span>
                    <span className="about-scale-desc">{L ? LEVEL_DESCS[lv.key].it : LEVEL_DESCS[lv.key].en}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threshold tables */}
          <div className="about-panel-section">
            <h2>{L ? 'Soglie per inquinante (µg/m³ · mg/m³)' : 'Thresholds by pollutant (µg/m³ · mg/m³)'}</h2>
            {CATS.map((cat) => (
              <div key={cat.key} className="about-table-block">
                <div className="about-table-cat">{L ? cat.it : cat.en}</div>
                <ThresholdTable cat={cat} L={L} />
              </div>
            ))}
          </div>

          {/* Pollutant descriptions */}
          <div className="about-panel-section">
            <h2>{L ? 'Gli inquinanti monitorati' : 'Monitored pollutants'}</h2>
            {Object.entries(POLLUTANT_DESCS).map(([key, desc]) => (
              <div key={key} className="about-pollutant-row">
                <div className="about-pollutant-name">{POLLUTANTS[key].name}</div>
                <p>{L ? desc.it : desc.en}</p>
              </div>
            ))}
          </div>

        </div>
      </aside>
    </>
  );
}
