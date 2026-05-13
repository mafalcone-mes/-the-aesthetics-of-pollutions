import { useState } from 'react';
import { SENSORS } from '../data/sensors';
import { LEVELS } from '../data/levels';
import { getSensorAQI } from '../utils/aqi';
import HeroDots from '../components/HeroDots';

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

      {/* HERO HEADER */}
      <div className="report-page-header">
        <HeroDots level={globalAQI} />
        <div className="report-page-header-content">
          <div className="report-page-title">
            {L ? 'Segnala un Sintomo' : 'Report a Symptom'}
          </div>
          <div className="report-page-subtitle">
            {L
              ? "Hai avvertito disturbi legati alla qualità dell'aria? Segnalacelo — ogni voce contribuisce alla mappa collettiva."
              : 'Have you experienced discomfort linked to air quality? Let us know — every report builds the collective map.'}
          </div>
          <div className="report-page-aqi-badge">
            <div className="report-page-aqi-dot" style={{ background: lvl.color }} />
            <span style={{ color: lvl.color }}>AQI {globalAQI + 1} — {L ? lvl.it : lvl.en}</span>
          </div>
        </div>
      </div>

      {/* SECTION LABEL — full-width */}
      <div className="section-label">
        <span className="section-label-text">
          {L ? 'Compila il modulo' : 'Fill in the form'}
        </span>
        {submitted && (
          <span className="report-success-inline">
            ✓ {L ? 'Segnalazione inviata. Grazie.' : 'Report submitted. Thank you.'}
          </span>
        )}
      </div>

      {/* BODY: form + history */}
      <div className="report-page-body">

        {/* FORM */}
        <form className="report-form" onSubmit={handleSubmit} noValidate>

          <div className="report-form-row">
            <label className="report-label" htmlFor="r-name">
              {L ? 'Nome o pseudonimo' : 'Name or pseudonym'}
            </label>
            <input
              id="r-name"
              className="report-input"
              type="text"
              placeholder={L ? 'Es. Mario R.' : 'E.g. Mario R.'}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={60}
            />
          </div>

          <div className="report-form-row">
            <label className="report-label" htmlFor="r-district">
              {L ? 'Quartiere' : 'Neighbourhood'}
            </label>
            <select
              id="r-district"
              className="report-select"
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            >
              <option value="">{L ? '— Seleziona —' : '— Select —'}</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="report-form-row">
            <div className="report-label">{L ? 'Sintomi avvertiti' : 'Symptoms experienced'}</div>
            <div className="report-symptoms-grid">
              {SYMPTOM_OPTIONS.map((s) => {
                const active = form.symptoms.has(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`report-symptom-chip${active ? ' active' : ''}`}
                    onClick={() => toggleSymptom(s.key)}
                    aria-pressed={active}
                  >
                    {L ? s.it : s.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="report-form-row">
            <label className="report-label" htmlFor="r-note">
              {L ? 'Note aggiuntive (facoltativo)' : 'Additional notes (optional)'}
            </label>
            <textarea
              id="r-note"
              className="report-textarea"
              rows={4}
              placeholder={L ? 'Descrivi quando e come hai avvertito i disturbi...' : 'Describe when and how you experienced the discomfort...'}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              maxLength={500}
            />
          </div>

          <div className="report-form-footer">
            <button type="submit" className="report-btn" disabled={!valid}
              style={{ opacity: valid ? 1 : 0.35, cursor: valid ? 'pointer' : 'not-allowed' }}>
              {L ? 'INVIA SEGNALAZIONE →' : 'SUBMIT REPORT →'}
            </button>
          </div>
        </form>

        {/* HISTORY */}
        <div className="report-history">
          {reports.length === 0 ? (
            <div className="report-history-empty">
              <div className="report-history-empty-text">
                {L
                  ? 'Le segnalazioni inviate in questa sessione appariranno qui.'
                  : 'Reports submitted in this session will appear here.'}
              </div>
            </div>
          ) : (
            <>
              <div className="report-history-header">
                {L ? `ULTIME ${reports.length} SEGNALAZIONI` : `LAST ${reports.length} REPORTS`}
              </div>
              <div className="report-history-list">
                {reports.map((r) => (
                  <div key={r.id} className="report-history-item">
                    <div className="report-history-meta">
                      <span className="report-history-name">{r.name}</span>
                      <span className="report-history-district">{r.district}</span>
                      <span className="report-history-time">{formatTime(r.time)}</span>
                    </div>
                    <div className="report-history-symptoms">
                      {r.symptoms.map((k) => {
                        const opt = SYMPTOM_OPTIONS.find((o) => o.key === k);
                        return opt
                          ? <span key={k} className="report-history-chip">{L ? opt.it : opt.en}</span>
                          : null;
                      })}
                    </div>
                    {r.note && <div className="report-history-note">{r.note}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
