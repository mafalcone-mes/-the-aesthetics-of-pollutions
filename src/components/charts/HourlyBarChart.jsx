import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceArea, Legend, ResponsiveContainer,
} from 'recharts';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';
import { getPollLevel } from '../../utils/aqi';
import { POLL_COLORS } from './chartColors';

const TICK_STYLE = { fontFamily: 'Epilogue', fontSize: 10, fill: 'var(--black)' };

// Grouped bar chart: mean AQI level per pollutant, grouped by hour of day (0–23).
// data = Row[] (all filtered rows), pollutants = string[] of selected pollutant keys.
export default function HourlyBarChart({ data, pollutants, lang, height = 220 }) {
  const L = lang === 'it';

  if (!data.length || !pollutants.length) return null;

  // Group by hour-of-day: mean AQI level and mean raw value per pollutant
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const rows = data.filter(r => r.hour === h);
    const entry = { hour: h, hourLabel: `${String(h).padStart(2, '0')}:00`, count: rows.length };
    for (const p of pollutants) {
      entry[p] = rows.length
        ? rows.reduce((s, r) => s + getPollLevel(p, r[p] ?? 0), 0) / rows.length
        : null;
      entry[`${p}_raw`] = rows.length
        ? rows.reduce((s, r) => s + (r[p] ?? 0), 0) / rows.length
        : null;
    }
    return entry;
  });

  function renderTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const lines = pollutants.filter(p => d[p] !== null);
    return (
      <div style={{ background: '#1A1A1A', opacity: 0.93, padding: '8px 10px', minWidth: 150 }}>
        <div style={{ fontFamily: 'Epilogue', fontSize: 9.5, fontWeight: 700, color: '#fff' }}>
          {d.hourLabel}–{String((d.hour + 1) % 24).padStart(2, '0')}:00
          <span style={{ fontSize: 8.5, fontWeight: 400 }}> ({d.count} {L ? 'letture' : 'readings'})</span>
        </div>
        {lines.map(p => (
          <div key={p} style={{ fontFamily: 'Epilogue', fontSize: 9, color: POLL_COLORS[p] || '#fff', marginTop: 4 }}>
            {POLLUTANTS[p]?.name}: {d[`${p}_raw`]?.toFixed(1)} {POLLUTANTS[p]?.unit}
            <span style={{ color: '#fff' }}> · L{d[p].toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveContainer className="chart-fade-in" width="100%" height={height}>
      <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barCategoryGap="24%" barGap={2}>
        {/* Hazard-scale bands, kept very faint so they read as a reference scale rather than
            competing with the pollutant-colored bars for attention. */}
        {LEVELS.map((lv, i) => (
          <ReferenceArea key={lv.key} y1={i} y2={i + 1} fill={lv.color} fillOpacity={0.07} strokeWidth={0} />
        ))}
        <XAxis dataKey="hourLabel" interval={2} tickLine={false} axisLine={{ stroke: 'var(--gray)' }} tick={TICK_STYLE} />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tickLine={false} axisLine={false} width={20} tick={TICK_STYLE} />
        <Tooltip content={renderTooltip} cursor={{ fill: 'var(--gray)', opacity: 0.4 }} />
        <Legend
          formatter={(_value, entry) => `${POLLUTANTS[entry.dataKey]?.name} (${POLLUTANTS[entry.dataKey]?.unit})`}
          wrapperStyle={{ fontFamily: 'Epilogue', fontSize: 10, color: 'var(--black)' }}
          iconType="circle" iconSize={8}
        />
        {pollutants.map(p => (
          <Bar key={p} dataKey={p} fill={POLL_COLORS[p] || '#1A1A1A'} radius={[2, 2, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
