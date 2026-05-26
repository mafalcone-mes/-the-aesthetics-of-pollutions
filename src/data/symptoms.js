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

export const SUGGESTIONS = {
  buono:                  { gen: "La qualità dell'aria è buona. Goditi le tue attività all'aperto.", sen: "La qualità dell'aria è buona. Goditi le tue attività all'aperto." },
  sufficiente:            { gen: "Goditi le tue consuete attività all'aperto.", sen: "Goditi le tue consuete attività all'aperto." },
  mediocre:               { gen: "Goditi le tue attività all'aperto.", sen: 'Considera la possibilità di ridurre le attività intense all\'aperto in presenza di sintomi.' },
  scarso:                 { gen: 'Considera di ridurre le attività intense all\'aperto in presenza di sintomi quali occhi irritati, tosse o mal di gola.', sen: "Considera di ridurre l'attività fisica, in particolare all'aperto, in presenza di sintomi." },
  'molto-scarso':         { gen: "Considera di ridurre le attività intense all'aperto.", sen: "Riduci l'attività fisica, in particolare all'aperto." },
  'estremamente-scarso':  { gen: "Riduci l'attività fisica all'aperto.", sen: "Evita l'attività fisica all'aperto." },
};
