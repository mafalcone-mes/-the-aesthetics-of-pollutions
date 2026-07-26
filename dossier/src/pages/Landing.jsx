import Reveal from '../components/Reveal';

export default function Landing({ setPage, lang }) {
  const L = lang === 'it';
  return (
    <div>
      <section className="landing-hero">
        <div>
          <h1 className="landing-title">
            Aria Bene<br /><em>Comune</em>
          </h1>
          <p className="landing-sub">
            {L
              ? <>Riconquistare la sovranità dei dati<br />e i mezzi di produzione dell'informazione<br />nella Sacrifice Zone di Taranto.</>
              : <>Reclaiming Data Sovereignty and<br />the Means of Information Production<br />in the Sacrifice Zone of Taranto.</>}
          </p>
        </div>

        <div className="landing-scroll-cue">
          <span>&darr;</span>
          <span>{L ? 'Scorri per iniziare' : 'Scroll to begin'}</span>
        </div>
      </section>

      <div className="landing-doors">
        <Reveal as="div">
          <a className="landing-door" onClick={() => setPage('research')} role="button" tabIndex={0}>
            <span className="landing-door-num">{L ? 'Sezione 01' : 'Section 01'}</span>
            <h2 className="landing-door-title">{L ? 'La Ricerca' : 'The Research'}</h2>
            <p className="landing-door-desc">
              {L
                ? "Perché monitorare dal basso, il divario tra ciò che è legale e ciò che è sicuro secondo l'OMS, e la logica dei dati posseduti dai cittadini."
                : 'Why monitor from below, the gap between what is legal and what the WHO calls safe, and the logic of citizen-owned data.'}
            </p>
            <span className="landing-door-arrow">{L ? 'Entra →' : 'Enter →'}</span>
          </a>
        </Reveal>
        <Reveal as="div" delay={80}>
          <a className="landing-door" onClick={() => setPage('guide')} role="button" tabIndex={0}>
            <span className="landing-door-num">{L ? 'Sezione 02' : 'Section 02'}</span>
            <h2 className="landing-door-title">{L ? 'Costruisci il Sensore' : 'Build the Sensor'}</h2>
            <p className="landing-door-desc">
              {L
                ? 'Una guida completa, passo per passo, per costruire il nodo sensore open-source "Aria Bene Comune" — dai componenti alla custodia fai-da-te.'
                : 'A complete, step-by-step field manual for building the open-source "Aria Bene Comune" sensor node — from parts list to DIY enclosure.'}
            </p>
            <span className="landing-door-arrow">{L ? 'Entra →' : 'Enter →'}</span>
          </a>
        </Reveal>
      </div>

      <div className="landing-footer-link">
        <span className="stamp">
          {L ? 'Realizzato da Matteo Falcone & Linux Jonix Group' : 'Made by Matteo Falcone & Linux Jonix Group'}
        </span>
        <a href="https://ariabenecomune.com" target="_blank" rel="noreferrer noopener">
          {L ? 'Vedi la dashboard dal vivo ↗' : 'View the live dashboard ↗'}
        </a>
      </div>
    </div>
  );
}
