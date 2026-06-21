import { useState } from 'react';
import { SENSORS } from '../data/sensors';
import { LEVELS } from '../data/levels';
import { getSensorAQI } from '../utils/aqi';

const DISTRICTS = [...new Set(SENSORS.map((s) => s.district))].sort((a, b) => a.localeCompare(b));

const SYMPTOM_OPTIONS = [
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

const EMPTY_FORM = { name: '', district: '', symptoms: new Set(), note: '' };

function formatTime(date) {
  return (
    date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
}

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 400,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)',
};

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid rgba(0,0,0,0.22)',
  background: 'transparent', color: 'var(--black)',
  fontFamily: 'var(--font-body)', fontSize: 14,
  padding: '7px 10px', outline: 'none',
};

function pillStyle(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.22)'),
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

export default function ReportPage({ lang }) {
  const L = lang === 'it';
  const [form, setForm] = useState(EMPTY_FORM);
  const [reports, setReports] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lvl = LEVELS[globalAQI];

  const toggleSymptom = (key) => {
    const next = new Set(form.symptoms);
    next.has(key) ? next.delete(key) : next.add(key);
    setForm((f) => ({ ...f, symptoms: next }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.district || !form.symptoms.size) return;
    const entry = {
      id: Date.now(),
      name: form.name.trim(),
      district: form.district,
      symptoms: [...form.symptoms],
      note: form.note.trim(),
      time: new Date(),
    };
    setReports((prev) => [entry, ...prev].slice(0, 10));
    setForm(EMPTY_FORM);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const valid = form.name.trim() && form.district && form.symptoms.size > 0;

  return (
    <div className="report-page">

      {/* TITLE — same treatment as the home page hero */}
      <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--gray)' }}>
        <span style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(48px, 6vw, 96px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L ? 'Segnala un Sintomo' : 'Report a Symptom'}
        </span>
      </div>

      {/* BODY: form + history */}
      <div className="report-page-body">

        {/* FORM */}
        <form className="report-form" onSubmit={handleSubmit} noValidate>

          {/* Name */}
          <div className="report-form-row">
            <div style={SUB_LABEL}>{L ? 'Nome o pseudonimo' : 'Name or pseudonym'}</div>
            <input
              id="r-name"
              type="text"
              placeholder={L ? 'Es. Mario R.' : 'E.g. Mario R.'}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={60}
              style={INPUT_STYLE}
            />
          </div>

          {/* District */}
          <div className="report-form-row">
            <div style={SUB_LABEL}>{L ? 'Quartiere' : 'Neighbourhood'}</div>
            <select
              id="r-district"
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              style={INPUT_STYLE}
            >
              <option value="">{L ? '— Seleziona —' : '— Select —'}</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Symptoms */}
          <div className="report-form-row">
            <div style={SUB_LABEL}>{L ? 'Sintomi avvertiti' : 'Symptoms experienced'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SYMPTOM_OPTIONS.map((s) => {
                const active = form.symptoms.has(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSymptom(s.key)}
                    aria-pressed={active}
                    style={pillStyle(active)}
                  >
                    {L ? s.it : s.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="report-form-row">
            <div style={SUB_LABEL}>{L ? 'Note aggiuntive (facoltativo)' : 'Additional notes (optional)'}</div>
            <textarea
              id="r-note"
              rows={4}
              placeholder={L ? 'Descrivi quando e come hai avvertito i disturbi...' : 'Describe when and how you experienced the discomfort...'}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              maxLength={500}
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 96 }}
            />
          </div>

          {/* Submit */}
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={!valid}
              style={{
                padding: '8px 24px',
                background: valid ? 'var(--black)' : 'transparent',
                color: valid ? 'var(--white)' : 'var(--black)',
                border: '1.5px solid ' + (valid ? 'var(--black)' : 'rgba(0,0,0,0.22)'),
                fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: valid ? 'pointer' : 'not-allowed',
              }}
            >
              {L ? 'INVIA SEGNALAZIONE →' : 'SUBMIT REPORT →'}
            </button>
            {submitted && (
              <span style={{ ...SUB_LABEL, color: lvl.color }}>
                ✓ {L ? 'Segnalazione inviata. Grazie.' : 'Report submitted. Thank you.'}
              </span>
            )}
          </div>
        </form>

        {/* HISTORY */}
        <div className="report-history">
          <div style={{ ...SUB_LABEL, padding: '14px 24px', borderBottom: '1px solid var(--gray)' }}>
            {reports.length === 0
              ? (L ? 'Segnalazioni recenti' : 'Recent reports')
              : (L ? `Ultime ${reports.length} segnalazioni` : `Last ${reports.length} reports`)}
          </div>

          {reports.length === 0 ? (
            <div style={{ padding: '32px 24px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6 }}>
              {L
                ? 'Le segnalazioni inviate in questa sessione appariranno qui.'
                : 'Reports submitted in this session will appear here.'}
            </div>
          ) : (
            <div className="report-history-list">
              {reports.map((r) => (
                <div key={r.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontStyle: 'italic', color: 'var(--gray2)' }}>{r.district}</span>
                    <span style={{ fontFamily: 'Epilogue', fontSize: 10, color: 'var(--gray2)', marginLeft: 'auto', letterSpacing: '0.04em' }}>{formatTime(r.time)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {r.symptoms.map((k) => {
                      const opt = SYMPTOM_OPTIONS.find((o) => o.key === k);
                      return opt ? (
                        <span key={k} style={{
                          padding: '3px 10px',
                          border: '1.5px solid rgba(0,0,0,0.22)',
                          fontFamily: 'Epilogue', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                          {L ? opt.it : opt.en}
                        </span>
                      ) : null;
                    })}
                  </div>
                  {r.note && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--black)', fontStyle: 'italic' }}>
                      {r.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
