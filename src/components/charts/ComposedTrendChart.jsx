import { curveCatmullRom } from '@visx/curve';
import {
  ComposedChart, Area, Bar, Line, CartesianGrid, Tooltip, XAxis, YAxis, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';
import { getPollLevel, getContinuousPollLevel } from '../../utils/aqi';

const CURVE = curveCatmullRom.alpha(0.42);
const TICK_STYLE = { fontFamily: 'Epilogue', fontSize: 10, fill: 'var(--black)' };
const EU_RED = '#951635'; // LEVELS[4] "Molto Scarso/Very Poor" red, reused for the legal-limit marker

// Trial: one combined view standing in for the four-chart grid. Always bucketed by hour of
// day (0–23) — bars are the mean score for that hour averaged across every day in the
// selected period, same worst-pollutant-wins scoring the rest of the app uses. The line is
// that hour's peak (worst single reading seen at that hour anywhere in the period), and the
// area is the same mean redrawn as a soft trend band sitting behind the bars.
// data = Row[] (raw filtered rows).
export default function ComposedTrendChart({ data, pollutants, lang, height = 320 }) {
  const L = lang === 'it';
  if (!data.length || !pollutants.length) return null;

  const buckets = Array.from({ length: 24 }, () => []);
  for (const r of data) {
    const score = Math.max(...pollutants.map(p => getPollLevel(p, r[p] ?? 0)));
    buckets[r.hour].push(score);
  }

  const chartData = buckets.map((scores, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    meanScore: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
    peakScore: scores.length ? Math.max(...scores) : null,
    count: scores.length,
  }));

  // A single selected pollutant has one comparable, real-world EU legal limit — show it
  // as the "legal" half of the WHO-vs-legal gap. Multiple pollutants share no common unit,
  // so there's no single line that would mean anything.
  const soloPollutant = pollutants.length === 1 ? pollutants[0] : null;
  const euLimitRaw = soloPollutant ? POLLUTANTS[soloPollutant]?.euLimit : null;
  const euLine = euLimitRaw != null
    ? { level: getContinuousPollLevel(soloPollutant, euLimitRaw), value: euLimitRaw, unit: POLLUTANTS[soloPollutant].unit }
    : null;

  // With one pollutant selected, each tick can show that pollutant's own real threshold value
  // (same boundary values getPollLevel/getContinuousPollLevel are built from) instead of the
  // abstract 0–5 index. With several pollutants sharing the axis, there's no single real unit
  // to show, so ticks fall back to the hazard-scale level names instead of bare numbers.
  const soloAnchors = soloPollutant
    ? [0, ...POLLUTANTS[soloPollutant].ranges.slice(0, -1).map(r => r[1])]
    : null;

  function formatYTick(v) {
    if (soloAnchors) return soloAnchors[v] ?? v;
    const lv = LEVELS[v];
    return lv ? (L ? lv.it : lv.en).split(' ')[0] : v;
  }

  // Line stroke stays a neutral identity color; each dot is colored by that hour's own peak
  // AQI level instead, same "line = who, dot = how bad" split RadarChart already uses.
  function renderPeakDot({ cx, cy, payload, index }, radius) {
    if (payload.peakScore === null) return null;
    const color = LEVELS[payload.peakScore]?.color || 'var(--black)';
    return <circle key={`peak-dot-${index}`} cx={cx} cy={cy} r={radius} fill={color} stroke="var(--white)" strokeWidth={1} />;
  }

  function renderTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    if (d.meanScore === null) return null;
    return (
      <div style={{ background: '#1A1A1A', opacity: 0.93, padding: '8px 10px', minWidth: 140, fontFamily: 'Epilogue' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{d.label}</div>
        <div style={{ fontSize: 9, color: 'var(--primary)', marginTop: 4 }}>
          {L ? 'Punteggio medio' : 'Mean score'}: {d.meanScore.toFixed(2)}
        </div>
        <div style={{ fontSize: 9, color: '#fff', marginTop: 2 }}>
          {L ? 'Punteggio peggiore' : 'Peak score'}: {d.peakScore}
        </div>
        <div style={{ fontSize: 9, color: '#9B9790', marginTop: 2 }}>
          {L ? 'Letture' : 'Readings'}: {d.count}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer className="chart-fade-in" width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barGap={0}>
        <CartesianGrid horizontal vertical={false} stroke="var(--gray)" strokeOpacity={0.6} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--gray)' }} tick={TICK_STYLE} interval={2} />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tickFormatter={formatYTick}
          tickLine={false} axisLine={false} width={soloAnchors ? 32 : 68} tick={TICK_STYLE} />
        <Tooltip content={renderTooltip} cursor={{ fill: 'var(--gray)', opacity: 0.3 }} />
        <Area type={CURVE} dataKey="meanScore" fill="var(--primary)" fillOpacity={0.16} stroke="none" />
        <Bar dataKey="meanScore" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={26} fillOpacity={0.75} />
        <Line type={CURVE} dataKey="peakScore" stroke="var(--black)" strokeWidth={2}
          dot={(props) => renderPeakDot(props, 5)} activeDot={(props) => renderPeakDot(props, 7)} />
        {euLine && (
          <ReferenceLine
            y={euLine.level}
            stroke={EU_RED}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            label={{
              value: `${L ? 'Limite UE' : 'EU limit'}: ${euLine.value} ${euLine.unit}`,
              position: 'insideTopRight',
              fill: EU_RED,
              fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700,
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
