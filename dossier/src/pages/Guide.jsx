import Reveal from '../components/Reveal';
import {
  CaseHeader, SectionMarker, P, H2, UL, OL, Annex, Table, CodeBlock,
  EvidenceGrid, ChapterNav,
} from '../components/DossierUI';

const COMPONENTS = [
  { img: '/assets/components/RaspberryPi.png', name: 'Raspberry Pi', tag: 'A', role_it: 'Server + dashboard', role_en: 'Server + dashboard', detail_it: 'Pi 4 o Pi Zero 2 W con Raspberry Pi OS', detail_en: 'Pi 4 or Pi Zero 2 W with Raspberry Pi OS' },
  { img: '/assets/components/ESP32-DevKit.png', name: 'ESP32 DevKit', tag: 'B', role_it: 'Nodo sensore', role_en: 'Sensor node', detail_it: 'Legge gas e ambiente, invia JSON via USB', detail_en: 'Reads gases and environment, sends JSON via USB' },
  { img: '/assets/components/SDS011.png', name: 'SDS011', tag: 'C', role_it: 'Particolato', role_en: 'Particulate matter', detail_it: 'PM2.5 e PM10, collegato al Pi via adattatore USB', detail_en: 'PM2.5 and PM10, connected to Pi via USB adapter' },
  { img: '/assets/components/MiCS-6814.png', name: 'MiCS-6814', tag: 'D', role_it: 'Gas multipli', role_en: 'Multiple gases', detail_it: 'NH3, CO, NO2 — uscite analogiche verso ESP32', detail_en: 'NH3, CO, NO2 — analogue outputs to ESP32' },
  { img: '/assets/components/BME680.png', name: 'BME680', tag: 'E', role_it: 'Ambiente + VOC', role_en: 'Environment + VOC', detail_it: 'Temperatura, umidita, pressione, gas (kOhm) via I2C', detail_en: 'Temperature, humidity, pressure, gas (kOhm) via I2C' },
  { img: '/assets/components/USBcable.png', name: '2x USB cable', tag: 'F', role_it: 'Connessioni dati', role_en: 'Data connections', detail_it: 'ESP32 → Pi e SDS011 → Pi', detail_en: 'ESP32 → Pi and SDS011 → Pi' },
  { img: '/assets/components/Breadboard.png', name: 'Breadboard + jumper', tag: 'G', role_it: 'Cablaggio', role_en: 'Wiring', detail_it: 'Per collegare MiCS-6814 e BME680 all’ESP32', detail_en: 'To connect MiCS-6814 and BME680 to the ESP32' },
  { img: '/assets/components/PowerSupply.png', name: 'Alimentatore', tag: 'H', role_it: 'Alimentazione', role_en: 'Power', detail_it: 'Alimentatore ufficiale Raspberry Pi', detail_en: 'Official Raspberry Pi power adapter' },
];

const ESP32_SKETCH = `#include <Wire.h>
#include <ArduinoJson.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>

const char* SENSOR_ID = "S1";
const int PIN_NH3 = 1;
const int PIN_NO2 = 2;
const int PIN_CO  = 3;

const int  BURST_SAMPLES   = 5;
const long SAMPLE_GAP_MS   = 2000;
const long CYCLE_PERIOD_MS = 300000;

Adafruit_BME680 bme;
bool bmeFound = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(12, 13);
  if (bme.begin(0x76, &Wire)) {
    bme.setTemperatureOversampling(BME680_OS_8X);
    bme.setHumidityOversampling(BME680_OS_2X);
    bme.setPressureOversampling(BME680_OS_4X);
    bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme.setGasHeater(320, 150);
    bmeFound = true;
    Serial.println("BME680 OK.");
  } else {
    Serial.println("BME680 not found - sending gas sensors only.");
  }
  Serial.println("Waiting 30s for MICS-6814 heaters...");
  delay(30000);
  Serial.println("Starting.");
}

void loop() {
  double nh3Sum=0, no2Sum=0, coSum=0;
  double tSum=0, hSum=0, pSum=0, gSum=0;
  int gasCount=0, bmeCount=0;

  for (int i = 0; i < BURST_SAMPLES; i++) {
    nh3Sum += (analogRead(PIN_NH3) / 4095.0) * 100.0;
    no2Sum += (analogRead(PIN_NO2) / 4095.0) * 100.0;
    coSum  += (analogRead(PIN_CO)  / 4095.0) * 100.0;
    gasCount++;
    if (bmeFound && bme.performReading()) {
      tSum += bme.temperature;
      hSum += bme.humidity;
      pSum += bme.pressure / 100.0;
      gSum += bme.gas_resistance / 1000.0;
      bmeCount++;
    }
    if (i < BURST_SAMPLES - 1) delay(SAMPLE_GAP_MS);
  }

  StaticJsonDocument<300> doc;
  doc["sensor_id"] = SENSOR_ID;
  doc["samples"]   = gasCount;
  doc["nh3"] = nh3Sum / gasCount;
  doc["no2"] = no2Sum / gasCount;
  doc["co"]  = coSum  / gasCount;
  if (bmeCount > 0) {
    doc["temperature"] = tSum / bmeCount;
    doc["humidity"]    = hSum / bmeCount;
    doc["pressure"]    = pSum / bmeCount;
    doc["gas_kohm"]    = gSum / bmeCount;
  }

  String payload;
  serializeJson(doc, payload);
  Serial.println(payload);

  long burstElapsed = (long)(BURST_SAMPLES - 1) * SAMPLE_GAP_MS;
  long wait = CYCLE_PERIOD_MS - burstElapsed;
  if (wait < 0) wait = 0;
  delay(wait);
}`;

const CHAPTERS = [
  { id: 'g1', it: 'Introduzione', en: 'Introduction' },
  { id: 'g2', it: 'I componenti', en: 'The Components' },
  { id: 'g3', it: 'Costruire il nodo (ESP32)', en: 'Building the Node (ESP32)' },
  { id: 'g4', it: 'Il server (Raspberry Pi)', en: 'The Server (Raspberry Pi)' },
  { id: 'g5', it: 'Calibrazione e problemi', en: 'Calibration & Troubleshooting' },
  { id: 'g6', it: 'La custodia fai-da-te', en: 'The DIY Enclosure' },
];

function nav(L, i) {
  const prev = i > 0 ? { id: CHAPTERS[i - 1].id, title: `${String(i).padStart(2, '0')} · ${L ? CHAPTERS[i - 1].it : CHAPTERS[i - 1].en}` } : null;
  const next = i < CHAPTERS.length - 1 ? { id: CHAPTERS[i + 1].id, title: `${String(i + 2).padStart(2, '0')} · ${L ? CHAPTERS[i + 1].it : CHAPTERS[i + 1].en}` } : null;
  return { prev, next };
}

export default function Guide({ lang }) {
  const L = lang === 'it';

  return (
    <div>
      <CaseHeader
        caseNo="ABC-2026-TA / ANNEX B"
        location={L ? 'Officina & Terrazzo' : 'Workshop & Rooftop'}
        status={L ? 'Manuale operativo' : 'Field manual'}
        title={L ? <>Costruisci il <em>Sensore</em></> : <>Build the <em>Sensor</em></>}
        dek={L
          ? "Una guida completa per assemblare il nodo open-source “Aria Bene Comune” — pensata per chi parte da zero, senza esperienza di elettronica o programmazione."
          : 'A complete guide to assembling the open-source "Aria Bene Comune" node — written for people starting from zero, no electronics or coding experience required.'}
      />

      <div className="dossier-col">
        <Reveal>
          <Annex label={L ? 'Prima di iniziare' : 'Before you start'}>
            {L
              ? <><strong>Tempo:</strong> un weekend, senza fretta. <strong>Livello:</strong> principiante. <strong>Serve:</strong> un po’ di saldatura e alcuni comandi da terminale. <strong>Non farlo da solo</strong> — è un bel progetto da costruire con un vicino, un nipote, o in un makerspace locale.</>
              : <><strong>Time:</strong> a weekend, taken slowly. <strong>Skill level:</strong> beginner. <strong>Involves:</strong> a little soldering and a few terminal commands. <strong>Don't do it alone</strong> — this is a good project to build with a neighbour, a grandchild, or at a local makerspace.</>}
          </Annex>
        </Reveal>
      </div>

      {/* 01 — INTRODUCTION */}
      <SectionMarker id="g1" num={1} title={L ? 'Introduzione' : 'Introduction'} />
      <div className="dossier-col">
        <Reveal>
          <H2>{L ? '1.1 Perche monitorare dal basso' : '1.1 Why monitoring from below'}</H2>
          <P>
            {L
              ? <>Questa guida ti accompagna passo per passo nella costruzione del sensore per la qualita dell'aria <strong>"Aria Bene Comune"</strong>. Useremo materiali semplici, codice aperto e un linguaggio chiaro.</>
              : <>This guide walks you step by step through building the <strong>"Aria Bene Comune"</strong> air quality sensor. We'll use simple materials, open code, and plain language.</>}
          </P>
          <UL items={L ? [
            <><strong>Particolato PM2.5 e PM10</strong> — le polveri sottili sospese nell'aria.</>,
            <><strong>Ammoniaca (NH3), monossido di carbonio (CO) e biossido di azoto (NO2)</strong> — gas legati a traffico, combustioni e attivita agricole.</>,
            <><strong>Composti organici volatili (VOC)</strong> — vapori di vernici, solventi, detergenti.</>,
            <><strong>Temperatura, umidita e pressione</strong> — le condizioni ambientali di base.</>,
          ] : [
            <><strong>Particulate matter PM2.5 and PM10</strong> — fine dust particles suspended in the air.</>,
            <><strong>Ammonia (NH3), carbon monoxide (CO), and nitrogen dioxide (NO2)</strong> — gases linked to traffic, combustion, and agricultural activity.</>,
            <><strong>Volatile organic compounds (VOC)</strong> — vapours from paints, solvents, cleaning products.</>,
            <><strong>Temperature, humidity, and pressure</strong> — the basic environmental conditions.</>,
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? '1.2 Il tuo ruolo nella rete' : '1.2 Your role in the network'}</H2>
          <P>
            {L
              ? <>Costruendo e attivando questo sensore, diventi uno dei nodi della rete. Ogni nodo ha un proprio identificativo — nello sketch è il campo <code>SENSOR_ID</code>, ad es. "S1".</>
              : <>By building and activating this sensor, you become one of the network's nodes. Every node has its own identifier — in the sketch, it's the <code>SENSOR_ID</code> field, e.g. "S1".</>}
          </P>
          <CodeBlock label="config">{'#define SENSOR_ID "S1"\n#define WIFI_SSID "your-network"\n#define WIFI_PASS "your-password"'}</CodeBlock>
          <Annex label={L ? 'In breve' : 'In short'}>
            {L
              ? 'Il tuo sensore funziona perfettamente da solo, ma contribuisce, con molti altri, a un quadro condiviso e continuamente aggiornato.'
              : 'Your sensor works perfectly on its own, but it contributes, alongside many others, to a shared, continuously updated picture.'}
          </Annex>
        </Reveal>
        <ChapterNav {...nav(L, 0)} />
      </div>

      {/* 02 — THE COMPONENTS */}
      <SectionMarker id="g2" num={2} title={L ? 'I componenti' : 'The Components'} />
      <div className="dossier-col dossier-col--wide">
        <Reveal>
          <H2>{L ? '2.1 Cosa comprare' : '2.1 What to buy'}</H2>
          <EvidenceGrid items={COMPONENTS.map((c) => ({ ...c, role: L ? c.role_it : c.role_en, detail: L ? c.detail_it : c.detail_en }))} />
        </Reveal>
        <Reveal>
          <H2>{L ? "2.2 Cos'e una breadboard" : '2.2 What a breadboard is'}</H2>
          <P>
            {L
              ? "Una breadboard e una tavoletta piena di piccoli foretti che permette di collegare componenti senza saldare. Molti foretti sono gia collegati tra loro internamente tramite strisce metalliche nascoste."
              : 'A breadboard is a board full of small holes that lets you connect components without soldering. Many of those holes are already joined internally by hidden metal strips.'}
          </P>
          <div className="evidence-card" style={{ margin: '18px 0 22px' }}>
            <div className="evidence-card-img-wrap" style={{ background: 'var(--paper)', padding: 20, filter: 'none' }}>
              <img src="/assets/diagrams/breadboard_basics.svg" alt={L ? 'Schema di una breadboard' : 'Breadboard diagram'} />
            </div>
          </div>
          <UL items={L ? [
            <><strong>Le colonne numerate:</strong> ogni colonna di 5 foretti e collegata verticalmente; la meta superiore e quella inferiore sono separate dal canale centrale.</>,
            <><strong>Le due guide laterali (+/-):</strong> corrono in orizzontale e distribuiscono alimentazione e massa a piu componenti insieme.</>,
          ] : [
            <><strong>The numbered columns:</strong> each column of 5 holes is joined vertically; the top half and bottom half are separated by the central channel.</>,
            <><strong>The two side rails (+/-):</strong> run horizontally and distribute power and ground to many components at once.</>,
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? '2.3 Riconoscere i jumper' : '2.3 Identifying your jumper wires'}</H2>
          <UL items={L ? [
            <><strong>Maschio-maschio (M-M):</strong> pin metallico su entrambe le estremita — breadboard-breadboard.</>,
            <><strong>Maschio-femmina (M-F):</strong> pin su un lato, presa sull'altro — breadboard-pin di una scheda.</>,
            <><strong>Femmina-femmina (F-F):</strong> presa su entrambe le estremita — collega due pin direttamente.</>,
          ] : [
            <><strong>Male-male (M-M):</strong> a metal pin on both ends — breadboard-to-breadboard.</>,
            <><strong>Male-female (M-F):</strong> a pin on one end, a socket on the other — breadboard to a board's pin.</>,
            <><strong>Female-female (F-F):</strong> a socket on both ends — connects two pins directly.</>,
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? '2.4 Ordine di montaggio' : '2.4 Recommended assembly order'}</H2>
          <OL items={L ? [
            "Con l'ESP32 scollegato, cabla il BME680 (3V3, GND, SDA->GPIO12, SCL->GPIO13).",
            'Cabla il MiCS-6814 (5V, GND, tre uscite gas verso GPIO1, GPIO2, GPIO3).',
            'Ricontrolla ogni filo rispetto allo schema del capitolo 3: tensioni corrette e masse comuni.',
            'Carica lo sketch e apri il Serial Monitor a 115200 baud: verifica "BME680 OK" e le righe JSON.',
            "Collega l'ESP32 al Raspberry Pi via USB, e collega anche l'SDS011.",
            <>Avvia il server e apri <code>/api/status</code>: se entrambe le schede risultano connesse, l'assemblaggio e completo.</>,
            'Solo a questo punto, posiziona tutto nella custodia (capitolo 6).',
          ] : [
            'With the ESP32 unplugged, wire the BME680 (3V3, GND, SDA->GPIO12, SCL->GPIO13).',
            'Wire the MiCS-6814 (5V, GND, three gas outputs to GPIO1, GPIO2, GPIO3).',
            'Re-check every wire against the diagram in chapter 3: correct voltages and common grounds.',
            'Upload the sketch and open the Serial Monitor at 115200 baud: check for "BME680 OK" and the JSON lines.',
            'Connect the ESP32 to the Raspberry Pi via USB, and connect the SDS011 too.',
            <>Start the server and open <code>/api/status</code>: if both boards show connected, assembly is complete.</>,
            'Only then, place everything in the enclosure (chapter 6).',
          ]} />
        </Reveal>
        <ChapterNav {...nav(L, 1)} />
      </div>

      {/* 03 — BUILDING THE NODE */}
      <SectionMarker id="g3" num={3} title={L ? 'Costruire il nodo (ESP32)' : 'Building the Node (ESP32)'} />
      <div className="dossier-col dossier-col--wide">
        <Reveal>
          <H2>{L ? '3.1 Saldare i pin header' : '3.1 Soldering header pins'}</H2>
          <OL items={L ? [
            'Procurati strisce di pin header maschio, tagliate a misura per ogni fila di foretti.',
            'Spingi i pin dal lato inferiore: le estremita lunghe verso il basso (breadboard), quelle corte sul lato componenti.',
            'Inserisci prima le estremita lunghe nella breadboard, poi appoggia la scheda sopra: resta allineata mentre saldi.',
            'Scalda ogni pin col saldatore, poi tocca con lo stagno finche non fluisce in un cono lucido.',
            'Lascia raffreddare: la scheda ora e compatibile con la breadboard.',
          ] : [
            'Get strips of male header pins, snapped to length for each hole row.',
            'Push the pins through from the underside: long ends down (breadboard), short ends on the component side.',
            'Push the long ends into the breadboard first, then sit the board on top — it stays aligned while you solder.',
            'Heat each pin with the iron, then touch the solder until it flows into a small shiny cone.',
            'Let it cool: the board now behaves like a breadboard-friendly module.',
          ]} />
          <Annex label={L ? 'Sicurezza' : 'Safety'}>
            {L
              ? 'Un saldatore supera i 300°C. Lavora su superficie resistente al calore, in spazio ventilato, occhiali di protezione consigliati.'
              : 'A soldering iron exceeds 300°C. Work on a heat-proof surface, in a ventilated space; safety glasses recommended.'}
          </Annex>
        </Reveal>
        <Reveal>
          <H2>{L ? "3.2 Cablare i sensori all'ESP32" : '3.2 Wiring the sensors to the ESP32'}</H2>
          <div className="evidence-card" style={{ margin: '18px 0 22px' }}>
            <div className="evidence-card-img-wrap" style={{ background: 'var(--paper)', padding: 20, filter: 'none' }}>
              <img src="/assets/diagrams/wired_breadboard.svg" alt={L ? "Schema di cablaggio dell'ESP32" : 'ESP32 wiring diagram'} />
            </div>
          </div>
          <Annex label={L ? 'Sicurezza' : 'Safety'}>
            {L
              ? "Scollega sempre l'USB durante il cablaggio. BME680 = 3,3V; MiCS-6814 = 5V. Tutte le masse condividono un riferimento comune."
              : 'Always unplug the USB while wiring. BME680 = 3.3V; MiCS-6814 = 5V. All grounds share one common reference.'}
          </Annex>
          <OL items={L ? [
            <><strong>Guide di alimentazione:</strong> ESP32 3V3 → guida rossa (+); ESP32 GND → guida blu (-).</>,
            <><strong>Alimenta il BME680:</strong> rossa (+) → VCC BME680; blu (-) → GND BME680.</>,
            <><strong>Dati BME680:</strong> SDA → ESP32 GPIO12; SCL → ESP32 GPIO13.</>,
            <><strong>Alimenta il MiCS-6814 (5V, non 3.3V):</strong> ESP32 5V/VIN → VCC MiCS-6814; GND condiviso sulla guida blu.</>,
            <><strong>Uscite gas MiCS-6814:</strong> NH3 → GPIO1; NO2 → GPIO2; CO → GPIO3.</>,
            'Controllo finale: conta i fili, conferma le tensioni e la massa comune.',
          ] : [
            <><strong>Power rails:</strong> ESP32 3V3 → red (+) rail; ESP32 GND → blue (-) rail.</>,
            <><strong>Power the BME680:</strong> red (+) → BME680 VCC; blue (-) → BME680 GND.</>,
            <><strong>BME680 data:</strong> SDA → ESP32 GPIO12; SCL → ESP32 GPIO13.</>,
            <><strong>Power the MiCS-6814 (5V, not 3.3V):</strong> ESP32 5V/VIN → MiCS-6814 VCC; ground shared on the blue rail.</>,
            <><strong>MiCS-6814 gas outputs:</strong> NH3 → GPIO1; NO2 → GPIO2; CO → GPIO3.</>,
            'Final check: count the wires, confirm voltages and the common ground.',
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? "3.3 Configurare l'Arduino IDE" : '3.3 Setting up the Arduino IDE'}</H2>
          <OL items={L ? [
            'Installa Arduino IDE da arduino.cc.',
            "Aggiungi l'URL del pacchetto board ESP32 in Preferenze.",
            'In Gestore Schede, cerca "esp32" e installa.',
            'Seleziona Strumenti → Board → ESP32 Dev Module.',
            'Installa le librerie: Adafruit BME680, Adafruit Unified Sensor, ArduinoJson.',
          ] : [
            'Install the Arduino IDE from arduino.cc.',
            'Add the ESP32 board package URL in Preferences.',
            'In Boards Manager, search "esp32" and install.',
            'Select Tools → Board → ESP32 Dev Module.',
            'Install the libraries: Adafruit BME680, Adafruit Unified Sensor, ArduinoJson.',
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? "3.4 Lo sketch dell'ESP32" : '3.4 The ESP32 sketch'}</H2>
          <P>{L ? "Copia il codice e caricalo sull'ESP32 con l'Arduino IDE." : 'Copy the code and upload it to the ESP32 with the Arduino IDE.'}</P>
          <CodeBlock label="esp32_sensor.ino">{ESP32_SKETCH}</CodeBlock>
          <Annex label={L ? 'Verifica rapida' : 'Quick check'}>
            {L
              ? <>Apri il Serial Monitor a 115200 baud: vedrai una riga ogni 5 minuti come <code>{'{"sensor_id":"S1","samples":5,"nh3":21.3,...}'}</code>. Per test iniziali, abbassa <code>CYCLE_PERIOD_MS</code> a 15000.</>
              : <>Open the Serial Monitor at 115200 baud: you'll see a line every 5 minutes like <code>{'{"sensor_id":"S1","samples":5,"nh3":21.3,...}'}</code>. For initial testing, lower <code>CYCLE_PERIOD_MS</code> to 15000.</>}
          </Annex>
        </Reveal>
        <ChapterNav {...nav(L, 2)} />
      </div>

      {/* 04 — THE SERVER */}
      <SectionMarker id="g4" num={4} title={L ? 'Il server (Raspberry Pi)' : 'The Server (Raspberry Pi)'} />
      <div className="dossier-col dossier-col--wide">
        <Reveal>
          <H2>{L ? '4.1 Collegamenti USB' : '4.1 USB connections'}</H2>
          <UL items={L ? [
            <>Il sensore <strong>SDS011</strong> appare di solito come <code>/dev/ttyUSB0</code>.</>,
            <>L'<strong>ESP32</strong> appare di solito come <code>/dev/ttyACM0</code>.</>,
          ] : [
            <>The <strong>SDS011</strong> sensor usually appears as <code>/dev/ttyUSB0</code>.</>,
            <>The <strong>ESP32</strong> usually appears as <code>/dev/ttyACM0</code>.</>,
          ]} />
          <CodeBlock label="terminal">ls /dev/ttyUSB* /dev/ttyACM*</CodeBlock>
        </Reveal>
        <Reveal>
          <H2>{L ? '4.2 Installare il software' : '4.2 Installing the software'}</H2>
          <CodeBlock label="terminal">{`sudo apt update && sudo apt upgrade -y\nsudo apt install -y python3-pip\npip3 install flask flask-cors pyserial`}</CodeBlock>
          <CodeBlock label="terminal">{`sudo usermod -a -G dialout $USER\nsudo reboot`}</CodeBlock>
        </Reveal>
        <Reveal>
          <H2>{L ? '4.3 Endpoint disponibili' : '4.3 Available endpoints'}</H2>
          <Table
            headers={L ? ['Indirizzo', 'Cosa restituisce'] : ['Address', 'What it returns']}
            rows={[
              ['/api/live', L ? "L'ultimo snapshot unito." : 'The latest merged snapshot.'],
              ['/api/history', L ? 'Storia delle ultime 24 ore.' : 'History of the last 24 hours.'],
              ['/api/hourly', L ? 'Medie orarie (dato mostrato dalla piattaforma).' : 'Hourly averages (what the platform displays).'],
              ['/api/status', L ? 'Stato di connessione delle schede.' : 'Board connection status.'],
              ['/data (POST)', L ? "Permette l'invio via Wi-Fi invece che USB." : 'Allows sending data over Wi-Fi instead of USB.'],
            ]}
          />
        </Reveal>
        <Reveal>
          <H2>{L ? 'Avviare il server' : 'Starting the server'}</H2>
          <CodeBlock label="terminal">{L
            ? `cd ~/aria-bene-comune\npython3 server.py`
            : `cd ~/aria-bene-comune\npython3 server.py`}</CodeBlock>
          <P>
            {L
              ? <>Trova l'IP con <code>hostname -I</code>, poi apri <code>http://IP:5050</code> da qualsiasi dispositivo sulla stessa rete.</>
              : <>Find the IP with <code>hostname -I</code>, then open <code>http://IP:5050</code> from any device on the same network.</>}
          </P>
        </Reveal>
        <ChapterNav {...nav(L, 3)} />
      </div>

      {/* 05 — CALIBRATION & TROUBLESHOOTING */}
      <SectionMarker id="g5" num={5} title={L ? 'Calibrazione e problemi' : 'Calibration & Troubleshooting'} />
      <div className="dossier-col dossier-col--wide">
        <Reveal>
          <H2>{L ? '5.1 Prima accensione' : '5.1 First boot'}</H2>
          <OL items={L ? [
            "Collega l'SDS011 e l'ESP32 alle porte USB del Pi.",
            'Alimenta il Pi dalla rete elettrica per i primi test.',
            'Avvia il server e lascia tutto acceso 10-15 minuti (riscaldamento sensori gas).',
            <>Apri <code>/api/status</code>: entrambe le schede devono risultare <code>true</code>.</>,
          ] : [
            "Connect the SDS011 and the ESP32 to the Pi's USB ports.",
            'Power the Pi from mains for the first tests.',
            'Start the server and leave everything on for 10-15 minutes (gas sensor warm-up).',
            <>Open <code>/api/status</code>: both boards should show <code>true</code>.</>,
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? '5.2 Calibrazione di base' : '5.2 Basic calibration'}</H2>
          <UL items={L ? [
            <><strong>PM2.5 / PM10:</strong> l'SDS011 restituisce gia µg/m³, pronto all'uso.</>,
            <><strong>Gas (NH3, CO, NO2):</strong> valori ADC in percentuale (0-100), non concentrazioni reali. Annota una base in aria pulita.</>,
            <><strong>VOC (gas_kohm):</strong> resistenza in kOhm; conta la variazione rispetto alla base, non il numero assoluto.</>,
          ] : [
            <><strong>PM2.5 / PM10:</strong> the SDS011 already outputs µg/m³, ready to use.</>,
            <><strong>Gases (NH3, CO, NO2):</strong> ADC percentage values (0-100), not real concentrations. Record a clean-air baseline.</>,
            <><strong>VOC (gas_kohm):</strong> a resistance in kOhm; what matters is variation from baseline, not the absolute number.</>,
          ]} />
        </Reveal>
        <Reveal>
          <H2>{L ? '5.3 Risoluzione dei problemi' : '5.3 Troubleshooting'}</H2>
          <Table
            headers={L ? ['Problema', 'Causa probabile', 'Soluzione'] : ['Problem', 'Likely cause', 'Fix']}
            rows={L ? [
              ['"unavailable" all’avvio', 'Porta USB errata', <>Controlla con <code>ls /dev/ttyUSB* /dev/ttyACM*</code></>],
              ['Permission denied', 'Utente non nel gruppo dialout', <><code>usermod -a -G dialout</code> + riavvio</>],
              ['Dati identici', 'Sensori non riscaldati / simulazione attiva', <>Attendi 10-15 min; controlla <code>/api/status</code></>],
              ['Dashboard non si apre', 'IP errato o porta chiusa', <>Verifica con <code>hostname -I</code>, porta <code>:5050</code></>],
              ['ESP32 non riconosciuto', 'Driver USB mancante', 'Installa i driver CP210x/CH340'],
            ] : [
              ['"unavailable" on startup', 'Wrong USB port', <>Check with <code>ls /dev/ttyUSB* /dev/ttyACM*</code></>],
              ['Permission denied', 'User not in dialout group', <><code>usermod -a -G dialout</code> + reboot</>],
              ['Data always identical', 'Sensors not warmed up / simulation active', <>Wait 10-15 min; check <code>/api/status</code></>],
              ['Dashboard won’t open', 'Wrong IP or closed port', <>Verify with <code>hostname -I</code>, port <code>:5050</code></>],
              ['ESP32 not recognised', 'Missing USB driver', 'Install CP210x/CH340 drivers'],
            ]}
          />
        </Reveal>
        <ChapterNav {...nav(L, 4)} />
      </div>

      {/* 06 — ENCLOSURE */}
      <SectionMarker id="g6" num={6} title={L ? 'La custodia fai-da-te' : 'The DIY Enclosure'} />
      <div className="dossier-col dossier-col--wide">
        <Reveal>
          <P>
            {L
              ? <>Il sensore e pensato per essere davvero accessibile: open source e costruito con <strong>materiali di recupero</strong>. Va bene qualsiasi contenitore impermeabile gia in casa — una scatola di biscotti, un contenitore per alimenti, una cassetta degli attrezzi.</>
              : <>The sensor is designed to be truly accessible: open source and built with <strong>salvaged materials</strong>. Any waterproof container you already own works — a biscuit tin, a food container, a plastic toolbox.</>}
          </P>
          <Annex label={L ? 'Principio guida' : 'Guiding principle'}>
            {L
              ? "Proteggere l'elettronica dalla pioggia, permettendo all'aria di circolare liberamente."
              : 'Protect the electronics from rain, while letting air circulate freely.'}
          </Annex>
        </Reveal>
        <Reveal>
          <H2>{L ? "6.1 Foretti per l'aria" : '6.1 Air holes'}</H2>
          <UL items={L ? [
            'Gruppo di foretti vicino ai sensori (SDS011 e BME680), mai rivolti verso l’alto.',
            'Pochi foretti larghi alcuni millimetri, coperti con rete fine.',
          ] : [
            'A cluster of holes near the sensors (SDS011 and BME680), never facing upward.',
            'A few holes a few millimetres wide, covered with fine mesh.',
          ]} />
          <H2>{L ? "6.2 Foro cavi e ansa antigoccia" : '6.2 Cable hole & drip loop'}</H2>
          <P>
            {L
              ? "Un solo foro piccolo su un lato verso il basso, sigillato con colla a caldo. Crea un'ansa a U rovesciata nel cavo appena fuori dal foro: la pioggia gocciola via prima di entrare."
              : 'One small hole on a downward-facing side, sealed with hot glue. Form an inverted-U loop in the cable just outside the hole: rain drips off before it reaches the opening.'}
          </P>
          <H2>{L ? '6.3 Alimentazione solare' : '6.3 Solar power'}</H2>
          <Annex label={L ? 'Requisito essenziale' : 'Essential requirement'}>
            {L
              ? <>Il power bank deve supportare la <strong>ricarica passthrough</strong> — caricarsi e alimentare il Pi allo stesso tempo. Molti modelli economici si spengono in carica: <strong>non funzionano</strong>.</>
              : <>The power bank must support <strong>passthrough charging</strong> — charging and powering the Pi at the same time. Many cheap models shut off while charging: <strong>they won't work</strong>.</>}
          </Annex>
          <H2>{L ? '6.4 Installazione esterna' : '6.4 Outdoor installation'}</H2>
          <UL items={L ? [
            'Punto ben ventilato, lontano da fonti di calore o fumo.',
            <>Altezza tipica: <strong>1,5-3 metri</strong> da terra.</>,
            'Fissa saldamente la scatola; pannello solare orientato a sud e inclinato.',
          ] : [
            'A well-ventilated spot, away from heat sources or smoke.',
            <>Typical height: <strong>1.5-3 metres</strong> above ground.</>,
            'Secure the box firmly; solar panel facing south and tilted.',
          ]} />
        </Reveal>
        <ChapterNav {...nav(L, 5)} />
      </div>

      <div className="dossier-col" style={{ textAlign: 'center', maxWidth: 'none', padding: '48px 20px' }}>
        <p className="stamp stamp--accent" style={{ fontSize: 13, marginBottom: 10 }}>
          {L ? 'Fine del fascicolo' : 'End of dossier'}
        </p>
        <p className="dossier-p" style={{ margin: '0 auto', maxWidth: 520 }}>
          {L
            ? "Quando il tuo sensore sara acceso, avrai aggiunto una voce a un quadro condiviso e vivo dell'aria. Costruiscilo, migioralo, e passa la guida a qualcun altro."
            : "When your sensor is switched on, you've added a voice to a shared, living picture of the air. Build it, improve it, and pass the guide on."}
        </p>
      </div>
    </div>
  );
}
