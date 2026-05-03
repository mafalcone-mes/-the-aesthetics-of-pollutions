export const SYMPTOMS = {
  particulates: {
    buono:                  { gen: 'No symptoms', sen: 'No symptoms' },
    sufficiente:            { gen: 'No symptoms', sen: 'No symptoms' },
    mediocre:               { gen: 'No symptoms', sen: 'Minor coughing or slight shortness of breath during exercise.' },
    scarso:                 { gen: "Coughing, 'heavy' chest.", sen: 'Wheezing, increased inhaler use, reduced stamina.' },
    'molto-scarso':         { gen: 'Significant coughing, chest tightness, fatigue.', sen: 'High risk of asthma attack or heart palpitations.' },
    'estremamente-scarso':  { gen: 'Severe breathlessness, heart strain.', sen: 'Potential for acute cardiac or respiratory events.' },
  },
  gaseous: {
    buono:                  { gen: 'No symptoms', sen: 'No symptoms' },
    sufficiente:            { gen: 'No symptoms', sen: 'No symptoms' },
    mediocre:               { gen: 'No symptoms', sen: 'Slight throat dryness or eye stinging in highly sensitive individuals.' },
    scarso:                 { gen: 'Scratchy throat, dry cough, stinging eyes.', sen: 'Sharp pain when breathing deeply, asthma flare-ups.' },
    'molto-scarso':         { gen: 'Intense throat irritation, chest burning, persistent dry cough.', sen: 'Severe respiratory distress; difficulty breathing.' },
    'estremamente-scarso':  { gen: "Severe airway inflammation, 'choking' sensation.", sen: 'Severe lung damage risk.' },
  },
  systemic: {
    buono:                  { gen: 'No symptoms', sen: 'No symptoms' },
    sufficiente:            { gen: 'No symptoms', sen: 'No symptoms' },
    mediocre:               { gen: 'No symptoms', sen: 'Potential for slight headache (CO) or faint chemical odor.' },
    scarso:                 { gen: 'Mild headache, fatigue, or nausea.', sen: 'Increased dizziness or irritation of nose and throat.' },
    'molto-scarso':         { gen: 'Throbbing headache, confusion, nausea, strong pungent smell (NH₃).', sen: 'Significant coordination loss or respiratory burning.' },
    'estremamente-scarso':  { gen: 'Vomiting, dizziness, mental confusion, fainting.', sen: 'CO poisoning or severe chemical mucous membrane burns.' },
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
