export const SYMPTOMS = {
  particulates: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Lieve tosse o leggera mancanza di respiro sotto sforzo.', en: 'Minor coughing or slight shortness of breath during exercise.' } },
    scarso:                 { gen: { it: "Tosse, sensazione di 'peso' al petto.", en: "Coughing, 'heavy' chest." }, sen: { it: "Respiro sibilante, aumento dell'uso dell'inalatore, riduzione della resistenza fisica.", en: 'Wheezing, increased inhaler use, reduced stamina.' } },
    'molto-scarso':         { gen: { it: 'Tosse intensa, costrizione toracica, affaticamento.', en: 'Significant coughing, chest tightness, fatigue.' }, sen: { it: 'Alto rischio di crisi asmatica o palpitazioni cardiache.', en: 'High risk of asthma attack or heart palpitations.' } },
    'estremamente-scarso':  { gen: { it: 'Grave mancanza di respiro, stress cardiaco.', en: 'Severe breathlessness, heart strain.' }, sen: { it: 'Possibili eventi cardiaci o respiratori acuti.', en: 'Potential for acute cardiac or respiratory events.' } },
  },
  gaseous: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Leggera secchezza alla gola o bruciore agli occhi nei soggetti più sensibili.', en: 'Slight throat dryness or eye stinging in highly sensitive individuals.' } },
    scarso:                 { gen: { it: 'Gola irritata, tosse secca, occhi brucianti.', en: 'Scratchy throat, dry cough, stinging eyes.' }, sen: { it: 'Dolore acuto nella respirazione profonda, crisi asmatiche.', en: 'Sharp pain when breathing deeply, asthma flare-ups.' } },
    'molto-scarso':         { gen: { it: 'Intensa irritazione alla gola, bruciore al petto, tosse secca persistente.', en: 'Intense throat irritation, chest burning, persistent dry cough.' }, sen: { it: 'Grave distress respiratorio; difficoltà respiratorie.', en: 'Severe respiratory distress; difficulty breathing.' } },
    'estremamente-scarso':  { gen: { it: 'Grave infiammazione delle vie aeree, sensazione di soffocamento.', en: "Severe airway inflammation, 'choking' sensation." }, sen: { it: 'Grave rischio di danni polmonari.', en: 'Severe lung damage risk.' } },
  },
  systemic: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Possibile lieve mal di testa (CO) o debole odore chimico.', en: 'Potential for slight headache (CO) or faint chemical odor.' } },
    scarso:                 { gen: { it: 'Lieve mal di testa, affaticamento o nausea.', en: 'Mild headache, fatigue, or nausea.' }, sen: { it: 'Aumento delle vertigini o irritazione di naso e gola.', en: 'Increased dizziness or irritation of nose and throat.' } },
    'molto-scarso':         { gen: { it: 'Forte mal di testa pulsante, confusione, nausea, odore pungente (NH₃).', en: 'Throbbing headache, confusion, nausea, strong pungent smell (NH₃).' }, sen: { it: 'Significativa perdita di coordinazione o bruciore alle vie respiratorie.', en: 'Significant coordination loss or respiratory burning.' } },
    'estremamente-scarso':  { gen: { it: 'Vomito, vertigini, confusione mentale, svenimento.', en: 'Vomiting, dizziness, mental confusion, fainting.' }, sen: { it: 'Avvelenamento da CO o gravi ustioni chimiche alle mucose.', en: 'CO poisoning or severe chemical mucous membrane burns.' } },
  },
};

// Per-organ symptom text, used by the body-figure callouts (RecordPage, SymptomsPage detail panel).
// Severity per organ is still driven by its pollutant category's level (see REC_ZONE_CATS / ZONE_CATS),
// but unlike SYMPTOMS above, the text here is specific to one organ instead of blending several.
export const ORGAN_SYMPTOMS = {
  mind: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Possibile lieve mal di testa, soprattutto in presenza di monossido di carbonio (CO).', en: 'Possible mild headache, especially with elevated carbon monoxide (CO).' } },
    scarso:                 { gen: { it: 'Lieve mal di testa e affaticamento.', en: 'Mild headache and fatigue.' }, sen: { it: 'Aumento di vertigini o difficoltà di concentrazione.', en: 'Increased dizziness or difficulty concentrating.' } },
    'molto-scarso':         { gen: { it: 'Forte mal di testa pulsante e confusione, spesso con odore pungente (NH₃).', en: 'Throbbing headache and confusion, often with a strong pungent smell (NH₃).' }, sen: { it: 'Significativa perdita di coordinazione o capogiri intensi.', en: 'Significant loss of coordination or intense dizziness.' } },
    'estremamente-scarso':  { gen: { it: 'Vertigini severe, confusione mentale, rischio di svenimento.', en: 'Severe dizziness, mental confusion, risk of fainting.' }, sen: { it: 'Possibile avvelenamento da monossido di carbonio (CO).', en: 'Possible carbon monoxide (CO) poisoning.' } },
  },
  eyes: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Leggero bruciore o lacrimazione agli occhi nei soggetti più sensibili.', en: 'Slight eye stinging or watering in highly sensitive individuals.' } },
    scarso:                 { gen: { it: 'Occhi brucianti e arrossati.', en: 'Burning, reddened eyes.' }, sen: { it: 'Lacrimazione persistente e fastidio alla luce.', en: 'Persistent watering and light sensitivity.' } },
    'molto-scarso':         { gen: { it: 'Bruciore intenso agli occhi, visione temporaneamente offuscata.', en: 'Intense eye burning, temporarily blurred vision.' }, sen: { it: 'Forte irritazione congiuntivale.', en: 'Severe conjunctival irritation.' } },
    'estremamente-scarso':  { gen: { it: 'Dolore oculare acuto, arrossamento severo.', en: 'Acute eye pain, severe redness.' }, sen: { it: 'Rischio di danni alla cornea con esposizione prolungata.', en: 'Risk of corneal damage with prolonged exposure.' } },
  },
  throat: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Leggera secchezza alla gola nei soggetti più sensibili.', en: 'Slight throat dryness in highly sensitive individuals.' } },
    scarso:                 { gen: { it: 'Gola irritata e tosse secca.', en: 'Scratchy throat and dry cough.' }, sen: { it: 'Dolore acuto nella respirazione profonda, possibili crisi asmatiche.', en: 'Sharp pain when breathing deeply, possible asthma flare-ups.' } },
    'molto-scarso':         { gen: { it: 'Intensa irritazione alla gola, tosse secca persistente.', en: 'Intense throat irritation, persistent dry cough.' }, sen: { it: 'Grave difficoltà respiratoria.', en: 'Severe difficulty breathing.' } },
    'estremamente-scarso':  { gen: { it: 'Grave infiammazione della gola, sensazione di soffocamento.', en: 'Severe throat inflammation, choking sensation.' }, sen: { it: 'Rischio elevato di crisi respiratoria acuta.', en: 'High risk of acute respiratory crisis.' } },
  },
  chest: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Lieve tosse o leggera mancanza di respiro sotto sforzo.', en: 'Minor coughing or slight shortness of breath during exercise.' } },
    scarso:                 { gen: { it: "Tosse e sensazione di 'peso' al petto.", en: "Coughing and a 'heavy' chest feeling." }, sen: { it: "Respiro sibilante, aumento dell'uso dell'inalatore.", en: 'Wheezing, increased inhaler use.' } },
    'molto-scarso':         { gen: { it: 'Tosse intensa, costrizione toracica.', en: 'Intense coughing, chest tightness.' }, sen: { it: 'Alto rischio di crisi asmatica.', en: 'High risk of asthma attack.' } },
    'estremamente-scarso':  { gen: { it: 'Grave mancanza di respiro, stress cardiaco.', en: 'Severe breathlessness, heart strain.' }, sen: { it: 'Possibili eventi respiratori acuti.', en: 'Potential for acute respiratory events.' } },
  },
  stomach: {
    buono:                  { gen: null, sen: null },
    sufficiente:            { gen: null, sen: null },
    mediocre:               { gen: null, sen: { it: 'Possibile leggero senso di nausea nei soggetti più sensibili.', en: 'Possible mild nausea in highly sensitive individuals.' } },
    scarso:                 { gen: { it: 'Leggera nausea.', en: 'Mild nausea.' }, sen: { it: "Crampi addominali o perdita di appetito.", en: 'Abdominal cramps or loss of appetite.' } },
    'molto-scarso':         { gen: { it: 'Nausea persistente, malessere addominale.', en: 'Persistent nausea, abdominal discomfort.' }, sen: { it: 'Rischio di vomito con esposizione prolungata.', en: 'Risk of vomiting with prolonged exposure.' } },
    'estremamente-scarso':  { gen: { it: 'Vomito, forte malessere.', en: 'Vomiting, significant malaise.' }, sen: { it: 'Possibili gravi disturbi gastrointestinali.', en: 'Potential for severe gastrointestinal distress.' } },
  },
};

// Shared options for the symptom-report form (SymptomsPage embedded form) and
// for labelling mock/live report entries (ArchivePage qualitative table).
export const SYMPTOM_OPTIONS = [
  { key: 'cough',     it: 'Tosse',                     en: 'Cough' },
  { key: 'breath',    it: 'Difficoltà respiratorie',    en: 'Breathing difficulty' },
  { key: 'eyes',      it: 'Irritazione agli occhi',     en: 'Eye irritation' },
  { key: 'throat',    it: 'Bruciore / gola secca',      en: 'Throat burning / dryness' },
  { key: 'headache',  it: 'Mal di testa',               en: 'Headache' },
  { key: 'nausea',    it: 'Nausea',                     en: 'Nausea' },
  { key: 'dizziness', it: 'Vertigini',                  en: 'Dizziness' },
  { key: 'fatigue',   it: 'Stanchezza / affaticamento', en: 'Fatigue' },
  { key: 'chest',     it: 'Oppressione al petto',       en: 'Chest tightness' },
  { key: 'other',     it: 'Altro',                      en: 'Other' },
];

export const SUGGESTIONS = {
  buono:                  { gen: { it: "La qualità dell'aria è buona. Goditi le tue attività all'aperto.", en: 'Air quality is good. Enjoy your outdoor activities.' },
                            sen: { it: "La qualità dell'aria è buona. Goditi le tue attività all'aperto.", en: 'Air quality is good. Enjoy your outdoor activities.' } },
  sufficiente:            { gen: { it: "Goditi le tue consuete attività all'aperto.", en: 'Enjoy your usual outdoor activities.' },
                            sen: { it: "Goditi le tue consuete attività all'aperto.", en: 'Enjoy your usual outdoor activities.' } },
  mediocre:               { gen: { it: "Goditi le tue attività all'aperto.", en: 'Enjoy your outdoor activities.' },
                            sen: { it: 'Considera la possibilità di ridurre le attività intense all\'aperto in presenza di sintomi.', en: 'Consider reducing intense outdoor activity if you experience symptoms.' } },
  scarso:                 { gen: { it: 'Considera di ridurre le attività intense all\'aperto in presenza di sintomi quali occhi irritati, tosse o mal di gola.', en: 'Consider reducing intense outdoor activity if you experience symptoms such as eye irritation, coughing, or sore throat.' },
                            sen: { it: "Considera di ridurre l'attività fisica, in particolare all'aperto, in presenza di sintomi.", en: 'Consider reducing physical activity, especially outdoors, if you experience symptoms.' } },
  'molto-scarso':         { gen: { it: "Considera di ridurre le attività intense all'aperto.", en: 'Consider reducing intense outdoor activity.' },
                            sen: { it: "Riduci l'attività fisica, in particolare all'aperto.", en: 'Reduce physical activity, especially outdoors.' } },
  'estremamente-scarso':  { gen: { it: "Riduci l'attività fisica all'aperto.", en: 'Reduce outdoor physical activity.' },
                            sen: { it: "Evita l'attività fisica all'aperto.", en: 'Avoid outdoor physical activity.' } },
};
