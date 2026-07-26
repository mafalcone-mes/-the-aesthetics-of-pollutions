import { useRef, useState } from 'react';
import Reveal from '../components/Reveal';
import ScrollyStep from '../components/ScrollyStep';
import EuWhoChart from '../components/EuWhoChart';
import { CaseHeader, P, Lede } from '../components/DossierUI';

// Pinned-background images (placeholder set — swap in the specific photos
// per block once you've picked them; see note at bottom of file). Only the
// three usable production photos we have are used here, repeated across
// thematically related blocks.
const BG = [
  { src: '/assets/photos/tamburiIlva.jpg', it: 'Ex-ILVA, quartiere Tamburi', en: 'Ex-ILVA plant, Tamburi district' },
  { src: '/assets/photos/vecchio.jpg', it: 'Taranto, il lungomare', en: 'Taranto, the waterfront' },
  { src: '/assets/photos/Sensore.png', it: 'Nodo sensore costruito dalla comunità', en: 'Community-built sensor node' },
];

// Which BG index each ScrollyStep (by its own index, in DOM order) activates.
// Only covers steps 0–10 — the pinned sequence stops before the EU/WHO data
// break (chart + scale grid sit on plain paper, then the closing statement is
// its own standalone full-bleed image moment, not part of the pinned scroll).
const STEP_BG = [0, 1, 0, 2, 0, 1, 0, 2, 2, 2, 1];

const LEVELS = [
  { n: 0, it: 'Buono', en: 'Good', color: '#77BF85' },
  { n: 1, it: 'Discreto', en: 'Fairly Good', color: '#318665' },
  { n: 2, it: 'Medio', en: 'Medium', color: '#F0A500' },
  { n: 3, it: 'Cattivo', en: 'Bad', color: '#EA5154' },
  { n: 4, it: 'Molto Cattivo', en: 'Very Bad', color: '#951635' },
  { n: 5, it: 'Estremamente Cattivo', en: 'Extremely Bad', color: '#7C2181' },
];

function ScrollCue({ L }) {
  return (
    <div className="landing-scroll-cue" style={{ margin: '8px 0 56px' }}>
      <span>&darr;</span>
      <span>{L ? 'Scorri per continuare' : 'Scroll down to continue'}</span>
    </div>
  );
}

function VideoBlock({ L }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const showMidFrame = (e) => {
    const v = e.currentTarget;
    if (!playing && v.duration) v.currentTime = v.duration / 2;
  };

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setPlaying(true);
  };

  return (
    <div className="scrolly-video-wrap">
      <video
        ref={videoRef}
        src="/assets/video/GliIncappucciati_MatteoFalcone.mp4"
        controls={playing}
        playsInline
        preload="metadata"
        onLoadedMetadata={showMidFrame}
        style={{ width: '100%', display: 'block' }}
      />
      {!playing && (
        <button
          type="button"
          onClick={start}
          aria-label={L ? 'Avvia il video' : 'Play the video'}
          className="scrolly-video-play"
        >
          <span className="scrolly-video-play-triangle" />
        </button>
      )}
    </div>
  );
}

export default function Research({ lang, setPage }) {
  const L = lang === 'it';
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBg = STEP_BG[activeIndex] ?? 0;

  return (
    <div>
      <CaseHeader
        caseNo="ABC-2026-TA"
        location={L ? 'Taranto, Puglia, Italia' : 'Taranto, Apulia, Italy'}
        status={L ? 'Indagine in corso' : 'Ongoing investigation'}
        title={L ? <>La <em>Ricerca</em></> : <>The <em>Research</em></>}
      />

      <div className="scrolly-pin-wrap">
        <div className="scrolly-pin-media" aria-hidden="true">
          {BG.map((bg, i) => (
            <div
              key={bg.src}
              className={`scrolly-pin-layer ${activeBg === i ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${bg.src})` }}
            />
          ))}
          <div className="scrolly-pin-scrim" />
          <span className="scrolly-pin-caption">{L ? BG[activeBg].it : BG[activeBg].en}</span>
        </div>

        <div className="scrolly-pin-text dossier-col dossier-col--wide">

        <ScrollyStep index={0} onActive={setActiveIndex}>
          <P>
            {L
              ? "Taranto è una città di circa 200.000 abitanti nel sud-est dell'Italia, che ospita, tra molti altri impianti industriali, la più grande acciaieria d'Europa. Quest'area è purtroppo diventata famosa per il suo disastro ambientale, che ha portato a un aumento delle malattie e dei tassi di tumore nella popolazione locale. Da 30 anni la comunità tarantina protesta contro la convivenza forzata con gli inquinanti."
              : 'Taranto is a city of around 200,000 inhabitants in the south-east of Italy, which hosts, among many other industrial facilities, the biggest steel plant in Europe. This area has sadly become famous for its environmental disaster and destruction, which led to an increase in illnesses and cancer rates in the local population. For the past 30 years, the Tarantinian community has been protesting against the forced coexistence with the pollutants.'}
          </P>
        </ScrollyStep>

        <ScrollyStep index={1} onActive={setActiveIndex}>
          <Lede>
            {L
              ? 'Le persone del posto sono stanche di dover scegliere tra un lavoro precario e la salute dei propri figli.'
              : 'People in the area are tired of having to choose between an insecure job and the health of their kids.'}
          </Lede>
        </ScrollyStep>

        <ScrollCue L={L} />

        <ScrollyStep index={2} onActive={setActiveIndex}>
          <div style={{ marginBottom: 72 }}>
            <VideoBlock L={L} />
          </div>
        </ScrollyStep>

        <ScrollyStep index={3} onActive={setActiveIndex}>
          <P>
            {L
              ? <>Il progetto <strong>Aria Bene Comune</strong>, sviluppato da Matteo Falcone e dagli hacker etici del Jonix Lug, collabora con attivisti locali e organizzazioni di cittadini per sviluppare una rete di sensori per la qualità dell'aria come forma di resistenza contro la recinzione dell'informazione. Il progetto crea strumenti per il monitoraggio quotidiano e l'archiviazione dei dati sull'inquinamento, permettendo ai cittadini di essere consapevoli dell'aria che respirano.</>
              : <>The project <strong>Aria Bene Comune</strong>, developed by Matteo Falcone and the ethical hacker Jonix Lug, collaborates with local activists and citizens' organizations to develop an air quality sensor network as a form of resistance against informational enclosure. The project creates tools for daily monitoring and data archiving about pollution, allowing citizens to be aware of the air they breathe.</>}
          </P>
        </ScrollyStep>

        <ScrollyStep index={4} onActive={setActiveIndex}>
          <P>
            {L
              ? <>L'idea alla base di Aria Bene Comune nasce dalla sfiducia dei cittadini nelle informazioni ufficiali prodotte dall'Agenzia Regionale per l'Ambiente <strong>ARPA</strong>, e dal bisogno di risposte sulla qualità dell'aria. La sfiducia verso i dati ufficiali nasce con il processo <strong>Ambiente Svenduto</strong>, il più grande processo ambientale per numero di imputati in Europa.</>
              : <>The idea behind Aria Bene Comune is born from citizens' lack of trust in official information produced by the Regional Environmental Agency <strong>ARPA</strong>, and the need for answers about air quality. The mistrust towards official data starts with the trial <strong>Ambiente Svenduto</strong>, the biggest environmental trial for the number of defendants in Europe.</>}
          </P>
        </ScrollyStep>

        <ScrollyStep index={5} onActive={setActiveIndex}>
          <P>
            {L
              ? 'Il processo è iniziato dopo anni di proteste seguite alla morte di un pastore nel 2008. Questa morte fu particolarmente significativa perché studi di citizen science rivelarono livelli di diossina migliaia di volte superiori alle soglie legali.'
              : 'The trial started after years of protests that followed the death of a shepherd in 2008. This death was particularly significant because citizen science studies revealed levels of dioxin that were thousands of times higher than the legal thresholds.'}
          </P>
        </ScrollyStep>

        <ScrollyStep index={6} onActive={setActiveIndex}>
          <P>
            {L
              ? "Ambiente Svenduto ha dimostrato, attraverso intercettazioni, che funzionari ARPA e politici nazionali e regionali collaboravano con i proprietari dell'ex acciaieria ILVA. La collaborazione avveniva sia attraverso un quadro normativo permissivo, sia attraverso corruzione e manipolazione dell'informazione."
              : 'Ambiente Svenduto proved, through wiretaps, that ARPA officials and national and regional politicians were collaborating with the steel plant Ex-ILVA owners. The collaboration worked both on a legal framework and through corruption and manipulation of information.'}
          </P>
        </ScrollyStep>

        <ScrollyStep index={7} onActive={setActiveIndex}>
          <P>
            {L
              ? <>Il <a className="dossier-btn" style={{ fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }} href="https://ariabenecomune.com" target="_blank" rel="noreferrer noopener">portale di Monitoraggio</a> online rende i dati quotidiani sulla qualità dell'aria accessibili e gratuiti per i residenti locali, cercando di proteggere la popolazione dalla corruzione e dalla manipolazione dei dati. Puoi usarlo per verificare in quali zone della città i diversi inquinanti sono più presenti, se i sintomi fisici sono causati da alti livelli di inquinanti, e per confrontare i dati ARPA con quelli prodotti dalla comunità.</>
              : <>The online <a className="dossier-btn" style={{ fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }} href="https://ariabenecomune.com" target="_blank" rel="noreferrer noopener">Monitoring portal</a> makes daily air quality data accessible and free to local residents, seeking to protect the population from corruption and manipulation of data. You can use it to verify in which areas of the city the different pollutants are more present, whether the bodily symptoms are caused by high levels of pollutants, and to confront ARPA data with community-produced data.</>}
          </P>
        </ScrollyStep>

        <ScrollyStep index={8} onActive={setActiveIndex}>
          <P>
            {L
              ? 'Il portale di Monitoraggio si alimenta di dati prodotti da sensori di proprietà della comunità. I sensori per la qualità dell’aria sono realizzati in collaborazione con attivisti e cittadini di Taranto durante workshop, attraverso una metodologia fai-da-te e open-source.'
              : 'The Monitoring portal feeds off data that are produced by community-owned sensors. The air-quality sensors are realized in collaboration with activists and citizens of Taranto during workshops, through a DIY and open-source methodology.'}
          </P>
        </ScrollyStep>

        <ScrollyStep index={9} onActive={setActiveIndex}>
          <P>
            {L
              ? 'I sensori vengono poi posizionati sulla finestra, sul balcone o in giardino dei cittadini che li hanno costruiti, e collegati al portale di Monitoraggio.'
              : 'The sensors will then be placed on the window, balcony, or garden of the citizens who created them, and connected to the Monitoring portal.'}
          </P>
          <button type="button" className="dossier-btn dossier-btn--accent" onClick={() => setPage('guide')}>
            {L ? 'Crea il tuo sensore →' : 'Create your sensor →'}
          </button>
        </ScrollyStep>

        <ScrollyStep index={10} onActive={setActiveIndex}>
          <P>
            {L
              ? "Il progetto non si limita a dare accesso ai dati sulla qualità dell'aria, ma mette anche in discussione il modo in cui questi vengono attualmente rappresentati da ARPA e le soglie legali usate dall'UE e dallo Stato italiano. Per questo motivo, il portale di Monitoraggio legge i dati attraverso 6 livelli di inquinamento basati sulle soglie dell'OMS e allineati agli effetti degli inquinanti sul corpo."
              : "The project not only gives access to air quality data, but also questions the current way those are portrayed by ARPA and the legal thresholds used by the EU and the Italian state. For this reason, the Monitoring portal reads the data through 6 levels of pollution based on WHO thresholds and aligned with the effects of pollutants on the body."}
          </P>
        </ScrollyStep>

        </div>
      </div>

      {/* Deliberate break in the pattern: the pinned photo sequence stops here.
          Plain paper, no background image, so the EU-vs-WHO numbers and the
          six-level scale stay crisp and legible — a "data readout" beat between
          two photographic movements. */}
      <div className="dossier-col dossier-col--wide scrolly-interlude">
        <Reveal className="scrolly-block">
          <P>
            {L
              ? "Ecco cosa succede quando questi due standard vengono messi uno accanto all'altro: il limite legale imposto dall'UE e la soglia che l'OMS considera effettivamente sicura."
              : 'Here is what happens when the two standards are placed side by side: the legal limit set by the EU, and the threshold the WHO considers actually safe.'}
          </P>
        </Reveal>

        <Reveal className="scrolly-block" style={{ maxWidth: 'none' }}>
          <EuWhoChart L={L} />
        </Reveal>

        <Reveal className="scrolly-block" style={{ maxWidth: 'none', marginTop: 8 }}>
          <div className="scale-grid">
            {LEVELS.map((lv) => (
              <div key={lv.n} className="scale-swatch" style={{ borderTop: `3px solid ${lv.color}` }}>
                <div className="scale-swatch-num">{L ? 'Livello' : 'Level'} {lv.n}</div>
                <div className="scale-swatch-name" style={{ color: lv.color }}>{L ? lv.it : lv.en}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Closing statement as its own full-bleed image moment — resolves the
          sequence rather than continuing the pinned-scroll mechanism, which
          only earns its keep across several steps. */}
      <Reveal as="div" className="research-closing" style={{ backgroundImage: "linear-gradient(rgba(35,31,32,0.15), rgba(35,31,32,0.74)), url('/assets/photos/vecchio.jpg')" }}>
        <Lede>
          {L
            ? "Riappropriarsi dei mezzi di produzione dei dati e della loro rappresentazione non è solo un gesto simbolico, ma un atto di resistenza importante che mira a distruggere l'architettura del silenzio. Per lottare con consapevolezza, per vivere in uno stato di coscienza, è necessario costruire una comunità basata sul controllo dell'informazione e dei dati, con l'obiettivo di creare una società fondata sulla cura comune."
            : 'Reclaiming the means of data production and their representation is not only a symbolic gesture, but an important act of resistance that aims to destroy the architecture of silence. To struggle with consciousness, to live in an aware state, it is necessary to create a community based on control of information and data, with the aim of creating a society based on communal care.'}
        </Lede>
      </Reveal>
    </div>
  );
}
