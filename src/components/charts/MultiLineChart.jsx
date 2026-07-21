import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';
import { getPollLevel, getContinuousPollLevel } from '../../utils/aqi';
import { POLL_COLORS, SENSOR_COLORS } from './chartColors';

const PAD_FULL    = { top: 20, right: 20, bottom: 48, left: 48 };
const PAD_COMPACT = { top:  8, right:  8, bottom: 18, left: 28 };

// Catmull-Rom → cubic Bézier, low tension (/8) to smooth the line without overshooting
// the 0–5 AQI-level bounds by much on sharp jumps.
function smoothPath(points) {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 8;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 8;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 8;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 8;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// mode='pollutant': data = Row[] for a single sensor, draws one line per pollutant
// mode='sensor':    data = { sensorId, sensorName, rows: Row[] }[], draws one line
//                   per sensor where Y = max getPollLevel across selected pollutants
// compact: smaller padding, no legend, 1px dots
export default function MultiLineChart({ data, pollutants, mode = 'pollutant', width = 800, height = 220, pollutantColors = {}, compact = false, dotRadius, dotStroke = true, lang }) {
  const PAD = compact ? PAD_COMPACT : PAD_FULL;
  const L = lang === 'it';
  const [tooltip, setTooltip] = useState(null);

  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  if (!data || !data.length) return null;

  // ── SENSOR MODE ──────────────────────────────────────────────────────────────
  if (mode === 'sensor') {
    const sensors = data.filter(s => s.rows.length > 0);
    if (!sensors.length) return null;

    // A range spanning more than one calendar day is unreadable at hourly resolution,
    // so it collapses to one point per day (mean of that day's hourly scores) instead.
    const dayKeys = new Set();
    sensors.forEach(s => s.rows.forEach(r => dayKeys.add(r.dateStr)));
    const multiDay = dayKeys.size > 1;

    const seriesFor = (sensor) => {
      if (!multiDay) {
        return sensor.rows.map(r => ({
          ts: r.dateObj.getTime(),
          score: Math.max(...pollutants.map(p => getPollLevel(p, r[p] ?? 0))),
          label: r.dateStr, sub: r.hourStr,
          pollVals: Object.fromEntries(pollutants.map(p => [p, r[p]])),
        }));
      }
      const byDay = new Map();
      sensor.rows.forEach(r => {
        if (!byDay.has(r.dateStr)) byDay.set(r.dateStr, { dateObj: r.dateObj, scoreSum: 0, count: 0, pollSums: {} });
        const e = byDay.get(r.dateStr);
        e.scoreSum += Math.max(...pollutants.map(p => getPollLevel(p, r[p] ?? 0)));
        e.count += 1;
        for (const p of pollutants) e.pollSums[p] = (e.pollSums[p] ?? 0) + (r[p] ?? 0);
      });
      return [...byDay.entries()]
        .sort((a, b) => a[1].dateObj - b[1].dateObj)
        .map(([dateStr, e]) => ({
          ts: e.dateObj.getTime(),
          score: e.scoreSum / e.count,
          label: dateStr, sub: null,
          pollVals: Object.fromEntries(pollutants.map(p => [p, e.pollSums[p] / e.count])),
        }));
    };

    const seriesBySensor = sensors.map(sensor => ({ sensor, pts: seriesFor(sensor) }));

    // Build a sorted list of all unique timestamps across all sensors
    const tsSet = new Set();
    seriesBySensor.forEach(({ pts }) => pts.forEach(pt => tsSet.add(pt.ts)));
    const allTs = [...tsSet].sort((a, b) => a - b);
    if (allTs.length < 2) return null;

    const minTs = allTs[0];
    const maxTs = allTs[allTs.length - 1];
    const xScale = (ts) => PAD.left + ((ts - minTs) / (maxTs - minTs)) * W;
    const yScale = (level) => PAD.top + H - (level / 5) * H;

    const allPts = seriesBySensor.flatMap(({ pts }) => pts);
    const xLabels = [];
    if (multiDay) {
      // One label per day
      allTs.forEach(ts => {
        const pt = allPts.find(p => p.ts === ts);
        if (pt) xLabels.push({ ts, label: pt.label.slice(0, 5) });
      });
    } else {
      // X labels every ~6 hours
      let lastTs = -Infinity;
      allTs.forEach(ts => {
        if (ts - lastTs >= 6 * 3600000) {
          const pt = allPts.find(p => p.ts === ts);
          if (pt) { xLabels.push({ ts, label: pt.sub === '00:00' ? pt.label.slice(0, 5) : pt.sub }); lastTs = ts; }
        }
      });
    }

    // Y axis: AQI levels 0–5 — each gridline is an actual level boundary
    const yTicks = [0, 1, 2, 3, 4, 5];

    return (
      <svg className="chart-fade-in" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {yTicks.map(lv => (
          <line key={lv} x1={PAD.left} y1={yScale(lv)} x2={PAD.left + W} y2={yScale(lv)} stroke={LEVELS[lv]?.color || 'var(--gray)'} strokeWidth="1" strokeOpacity={0.25} />
        ))}
        {yTicks.map(lv => (
          <text key={lv} x={PAD.left - 4} y={yScale(lv) + 3} textAnchor="end" fontSize="9" fontFamily="Epilogue" fill={LEVELS[lv]?.color || 'var(--gray2)'}>{lv}</text>
        ))}
        {xLabels.map(({ ts, label }) => (
          <text key={ts} x={xScale(ts)} y={PAD.top + H + 14} textAnchor="middle" fontSize="9" fontFamily="Epilogue" fill="var(--black)">{label}</text>
        ))}

        {seriesBySensor.map(({ sensor, pts }, si) => {
          const color = SENSOR_COLORS[si % SENSOR_COLORS.length];
          const d = smoothPath(pts.map(pt => [xScale(pt.ts), yScale(pt.score)]));
          return (
            <g key={sensor.sensorId}>
              <path d={d} fill="none" stroke={color} strokeWidth="2" opacity="0.85" />
              {pts.map((pt, i) => {
                const cx = xScale(pt.ts);
                const cy = yScale(pt.score);
                return (
                  <circle key={i} cx={cx} cy={cy} r={3.5}
                    fill={color} stroke="var(--white)" strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ cx, cy, color, sensor, pt })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {tooltip && (() => {
          const lines = pollutants.map(p => ({
            p, label: `${POLLUTANTS[p]?.name}: ${tooltip.pt.pollVals[p].toFixed(1)} ${POLLUTANTS[p]?.unit}`,
          }));
          const tw = 148;
          const th = 30 + lines.length * 14;
          const tx = Math.min(tooltip.cx + 8, width - tw - 4);
          const ty = Math.max(tooltip.cy - th - 6, PAD.top);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} fill="#1A1A1A" opacity="0.93" />
              <text x={tx + 7} y={ty + 13} fontSize="9.5" fontFamily="Epilogue" fontWeight="700" fill={tooltip.color}>{tooltip.sensor.sensorName}</text>
              <text x={tx + 7} y={ty + 25} fontSize="8.5" fontFamily="Epilogue" fill="#fff">
                {tooltip.pt.label}{tooltip.pt.sub ? ` ${tooltip.pt.sub}` : (L ? ' · media giornaliera' : ' · daily mean')}
              </text>
              {lines.map(({ p, label }, i) => (
                <text key={p} x={tx + 7} y={ty + 39 + i * 14} fontSize="9.5" fontFamily="Epilogue" fill={POLL_COLORS[p] || '#fff'}>{label}</text>
              ))}
            </g>
          );
        })()}

        {/* Legend */}
        {sensors.map((sensor, i) => (
          <g key={sensor.sensorId} transform={`translate(${PAD.left + i * 88}, ${height - 10})`}>
            <rect width="12" height="3" y="-2" fill={SENSOR_COLORS[i % SENSOR_COLORS.length]} />
            <text x="15" fontSize="9" fontFamily="Epilogue" fill="var(--black)">{sensor.sensorName}</text>
          </g>
        ))}
      </svg>
    );
  }

  // ── POLLUTANT MODE (single sensor) ───────────────────────────────────────────
  const rows = data;
  if (!rows.length) return null;

  // A literal value axis only means something when one unit is on screen. With several
  // pollutants overlaid, fall back to the same shared 0–5 AQI-level axis the rest of the
  // app uses (Radar, Hourly avg, sensor mode) — each point interpolates within its bucket
  // (getContinuousPollLevel) so it still sits closer to whichever threshold it's nearer to,
  // rather than snapping flat to its integer level.
  const usesLevelAxis = pollutants.length > 1;

  const scales = {};
  if (!usesLevelAxis) {
    for (const p of pollutants) {
      const vals = rows.map(r => r[p]);
      scales[p] = { min: Math.min(...vals), max: Math.max(...vals, 1) };
    }
  }

  const xScale = (i) => PAD.left + (i / Math.max(rows.length - 1, 1)) * W;
  const levelYScale = (level) => PAD.top + H - (level / 5) * H;
  const yScale = (p, v) => usesLevelAxis
    ? levelYScale(getContinuousPollLevel(p, v))
    : PAD.top + H - ((v - scales[p].min) / (scales[p].max - scales[p].min || 1)) * H;

  const xLabels = rows.reduce((acc, r, i) => {
    if (i % 6 === 0) acc.push({ i, label: r.hourStr === '00:00' ? r.dateStr.slice(0, 5) : r.hourStr });
    return acc;
  }, []);

  // Single-pollutant gridlines mark that pollutant's actual AQI level boundaries (not even
  // splits), clipped to the visible value range — dot/line positions above are untouched.
  const primary = pollutants[0];
  const levelLines = (!usesLevelAxis && primary)
    ? (POLLUTANTS[primary]?.ranges ?? []).slice(0, -1)
        .map((range, lvl) => ({ lvl, value: range[1] }))
        .filter(({ value }) => value >= scales[primary].min && value <= scales[primary].max)
    : [];
  const levelTicks = usesLevelAxis ? [0, 1, 2, 3, 4, 5] : [];

  return (
    <svg className="chart-fade-in" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {levelTicks.map(lv => (
        <line key={lv} x1={PAD.left} y1={levelYScale(lv)} x2={PAD.left + W} y2={levelYScale(lv)}
          stroke={LEVELS[lv]?.color || 'var(--gray)'} strokeWidth="1" strokeOpacity={0.25} />
      ))}
      {levelTicks.map(lv => (
        <text key={lv} x={PAD.left - 4} y={levelYScale(lv) + 3} textAnchor="end"
          fontSize="9" fontFamily="Epilogue" fill={LEVELS[lv]?.color || 'var(--gray2)'}>{lv}</text>
      ))}
      {levelLines.map(({ lvl, value }) => (
        <line key={lvl} x1={PAD.left} y1={yScale(primary, value)} x2={PAD.left + W} y2={yScale(primary, value)}
          stroke={LEVELS[lvl + 1]?.color || 'var(--gray)'} strokeWidth="1" strokeOpacity={0.25} />
      ))}
      {levelLines.map(({ lvl, value }) => (
        <text key={lvl} x={PAD.left - 4} y={yScale(primary, value) + 3} textAnchor="end"
          fontSize="9" fontFamily="Epilogue" fill={LEVELS[lvl + 1]?.color || 'var(--gray2)'}>{Math.round(value)}</text>
      ))}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={xScale(i)} y={PAD.top + H + 14} textAnchor="middle"
          fontSize="9" fontFamily="Epilogue" fill="var(--black)">{label}</text>
      ))}

      {pollutants.map(p => {
        const seriesColor = pollutantColors[p] || POLL_COLORS[p] || '#1A1A1A';
        const d = smoothPath(rows.map((r, i) => [xScale(i), yScale(p, r[p])]));
        return <path key={p} d={d} fill="none" stroke={seriesColor} strokeWidth="2" opacity="0.85" />;
      })}

      {pollutants.map(p =>
        rows.map((r, i) => {
          const cx = xScale(i);
          const cy = yScale(p, r[p]);
          const seriesColor = pollutantColors[p] || POLL_COLORS[p] || '#1A1A1A';
          const r_ = dotRadius ?? (compact ? 1 : 3.5);
          const hasStroke = dotStroke && !compact;
          return (
            <circle key={`${p}-${i}`} cx={cx} cy={cy} r={r_}
              fill={seriesColor} stroke={hasStroke ? 'var(--white)' : 'none'} strokeWidth={hasStroke ? 1 : 0}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ cx, cy, pollutant: p, value: r[p], dateStr: r.dateStr, hourStr: r.hourStr })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })
      )}

      {tooltip && (() => {
        const tw = 124;
        const th = 38;
        const tx = Math.min(tooltip.cx + 8, width - tw - 4);
        const ty = Math.max(tooltip.cy - th - 6, PAD.top);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={th} fill="#1A1A1A" opacity="0.93" />
            <text x={tx + 7} y={ty + 13} fontSize="8.5" fontFamily="Epilogue" fill="#fff">{tooltip.dateStr} {tooltip.hourStr}</text>
            <text x={tx + 7} y={ty + 28} fontSize="10.5" fontFamily="Epilogue" fontWeight="700" fill={pollutantColors[tooltip.pollutant] || POLL_COLORS[tooltip.pollutant] || '#fff'}>
              {POLLUTANTS[tooltip.pollutant]?.name}: {tooltip.value} {POLLUTANTS[tooltip.pollutant]?.unit}
            </text>
          </g>
        );
      })()}

      {!compact && pollutants.map((p, i) => (
        <g key={p} transform={`translate(${PAD.left + i * 96}, ${height - 10})`}>
          <rect width="12" height="3" y="-2" fill={pollutantColors[p] || POLL_COLORS[p] || '#1A1A1A'} />
          <text x="15" fontSize="9" fontFamily="Epilogue" fill="var(--black)">
            {POLLUTANTS[p]?.name} ({POLLUTANTS[p]?.unit})
          </text>
        </g>
      ))}
    </svg>
  );
}
