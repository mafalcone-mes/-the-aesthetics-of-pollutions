import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { getPollLevel } from '../../utils/aqi';

const POLL_COLORS = {
  pm25: '#E05A2B', pm10: '#F0A500', no2: '#4CAF6F', co: '#B5213D',
  o3: '#C8D43A', so2: '#6B1540', nh3: '#9B6B3A', c6h6: '#3A7B9B',
};

const SENSOR_COLORS = ['#E05A2B', '#3A7B9B', '#4CAF6F', '#F0A500', '#B5213D', '#9B6B3A', '#C8D43A', '#6B1540'];

const PAD_FULL    = { top: 16, right: 16, bottom: 44, left: 44 };
const PAD_COMPACT = { top:  8, right:  8, bottom: 18, left: 28 };

// mode='pollutant': data = Row[] for a single sensor, draws one line per pollutant
// mode='sensor':    data = { sensorId, sensorName, rows: Row[] }[], draws one line
//                   per sensor where Y = max getPollLevel across selected pollutants
// compact: smaller padding, no legend, 1px dots
export default function MultiLineChart({ data, pollutants, mode = 'pollutant', width = 800, height = 220, pollutantColors = {}, compact = false }) {
  const PAD = compact ? PAD_COMPACT : PAD_FULL;
  const [tooltip, setTooltip] = useState(null);

  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  if (!data || !data.length) return null;

  // ── SENSOR MODE ──────────────────────────────────────────────────────────────
  if (mode === 'sensor') {
    const sensors = data.filter(s => s.rows.length > 0);
    if (!sensors.length) return null;

    // Build a sorted list of all unique timestamps across all sensors
    const tsSet = new Set();
    sensors.forEach(s => s.rows.forEach(r => tsSet.add(r.dateObj.getTime())));
    const allTs = [...tsSet].sort((a, b) => a - b);
    if (allTs.length < 2) return null;

    const minTs = allTs[0];
    const maxTs = allTs[allTs.length - 1];
    const xScale = (ts) => PAD.left + ((ts - minTs) / (maxTs - minTs)) * W;
    const yScale = (level) => PAD.top + H - (level / 5) * H;

    // X labels every ~6 hours
    const xLabels = [];
    let lastTs = -Infinity;
    allTs.forEach(ts => {
      if (ts - lastTs >= 6 * 3600000) {
        const r = sensors[0].rows.find(r => r.dateObj.getTime() === ts)
          || sensors.flatMap(s => s.rows).find(r => r.dateObj.getTime() === ts);
        if (r) { xLabels.push({ ts, label: r.hourStr === '00:00' ? r.dateStr.slice(0, 5) : r.hourStr }); lastTs = ts; }
      }
    });

    // Y axis: AQI levels 0–5
    const yTicks = [0, 1, 2, 3, 4, 5];

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {yTicks.map(lv => (
          <line key={lv} x1={PAD.left} y1={yScale(lv)} x2={PAD.left + W} y2={yScale(lv)} stroke="#DDDAD3" strokeWidth="1" />
        ))}
        {yTicks.map(lv => (
          <text key={lv} x={PAD.left - 4} y={yScale(lv) + 3} textAnchor="end" fontSize="8" fontFamily="Epilogue" fill="#9B9790">{lv}</text>
        ))}
        {xLabels.map(({ ts, label }) => (
          <text key={ts} x={xScale(ts)} y={PAD.top + H + 14} textAnchor="middle" fontSize="7" fontFamily="Epilogue" fill="#9B9790">{label}</text>
        ))}

        {sensors.map((sensor, si) => {
          const color = SENSOR_COLORS[si % SENSOR_COLORS.length];
          const pts = sensor.rows.map(r => ({
            ...r,
            ts: r.dateObj.getTime(),
            score: Math.max(...pollutants.map(p => getPollLevel(p, r[p] ?? 0))),
          }));
          const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xScale(pt.ts)},${yScale(pt.score)}`).join(' ');
          return (
            <g key={sensor.sensorId}>
              <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" />
              {pts.map((pt, i) => {
                const cx = xScale(pt.ts);
                const cy = yScale(pt.score);
                return (
                  <circle key={i} cx={cx} cy={cy} r={3}
                    fill={color} stroke="var(--white)" strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ cx, cy, color, sensor, row: pt })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {tooltip && (() => {
          const lines = pollutants.map(p => ({ p, label: `${POLLUTANTS[p]?.name}: ${tooltip.row[p]} ${POLLUTANTS[p]?.unit}` }));
          const tw = 148;
          const th = 30 + lines.length * 14;
          const tx = Math.min(tooltip.cx + 8, width - tw - 4);
          const ty = Math.max(tooltip.cy - th - 6, PAD.top);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#111" opacity="0.93" />
              <text x={tx + 7} y={ty + 13} fontSize="8.5" fontFamily="Epilogue" fontWeight="700" fill={tooltip.color}>{tooltip.sensor.sensorName}</text>
              <text x={tx + 7} y={ty + 25} fontSize="7.5" fontFamily="Epilogue" fill="#9B9790">{tooltip.row.dateStr} {tooltip.row.hourStr}</text>
              {lines.map(({ p, label }, i) => (
                <text key={p} x={tx + 7} y={ty + 39 + i * 14} fontSize="8.5" fontFamily="Epilogue" fill={POLL_COLORS[p] || '#fff'}>{label}</text>
              ))}
            </g>
          );
        })()}

        {/* Legend */}
        {sensors.map((sensor, i) => (
          <g key={sensor.sensorId} transform={`translate(${PAD.left + i * 80}, ${height - 10})`}>
            <rect width="12" height="3" y="-2" fill={SENSOR_COLORS[i % SENSOR_COLORS.length]} />
            <text x="15" fontSize="7" fontFamily="Epilogue" fill="#9B9790">{sensor.sensorName}</text>
          </g>
        ))}
      </svg>
    );
  }

  // ── POLLUTANT MODE (single sensor) ───────────────────────────────────────────
  const rows = data;
  if (!rows.length) return null;

  const scales = {};
  for (const p of pollutants) {
    const vals = rows.map(r => r[p]);
    scales[p] = { min: Math.min(...vals), max: Math.max(...vals, 1) };
  }

  const xScale = (i) => PAD.left + (i / Math.max(rows.length - 1, 1)) * W;
  const yScale = (p, v) => PAD.top + H - ((v - scales[p].min) / (scales[p].max - scales[p].min || 1)) * H;

  const xLabels = rows.reduce((acc, r, i) => {
    if (i % 6 === 0) acc.push({ i, label: r.hourStr === '00:00' ? r.dateStr.slice(0, 5) : r.hourStr });
    return acc;
  }, []);

  const primary = pollutants[0];
  const yTicks = primary
    ? Array.from({ length: 5 }, (_, i) => scales[primary].min + (scales[primary].max - scales[primary].min) * i / 4)
    : [];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {yTicks.map((_, i) => (
        <line key={i} x1={PAD.left} y1={PAD.top + H - (i / 4) * H} x2={PAD.left + W} y2={PAD.top + H - (i / 4) * H}
          stroke="#DDDAD3" strokeWidth="1" />
      ))}
      {primary && yTicks.map((v, i) => (
        <text key={i} x={PAD.left - 4} y={PAD.top + H - (i / 4) * H + 3} textAnchor="end"
          fontSize="8" fontFamily="Epilogue" fill="#9B9790">{Math.round(v)}</text>
      ))}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={xScale(i)} y={PAD.top + H + 14} textAnchor="middle"
          fontSize="7" fontFamily="Epilogue" fill="#9B9790">{label}</text>
      ))}

      {pollutants.map(p => {
        const seriesColor = pollutantColors[p] || POLL_COLORS[p] || '#111';
        const d = rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(p, r[p])}`).join(' ');
        return <path key={p} d={d} fill="none" stroke={seriesColor} strokeWidth="1.5" opacity="0.85" />;
      })}

      {pollutants.map(p =>
        rows.map((r, i) => {
          const cx = xScale(i);
          const cy = yScale(p, r[p]);
          const seriesColor = pollutantColors[p] || POLL_COLORS[p] || '#111';
          return (
            <circle key={`${p}-${i}`} cx={cx} cy={cy} r={compact ? 1 : 3}
              fill={seriesColor} stroke="var(--white)" strokeWidth={compact ? 0 : 1}
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
            <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#111" opacity="0.93" />
            <text x={tx + 7} y={ty + 13} fontSize="7.5" fontFamily="Epilogue" fill="#9B9790">{tooltip.dateStr} {tooltip.hourStr}</text>
            <text x={tx + 7} y={ty + 28} fontSize="9.5" fontFamily="Epilogue" fontWeight="700" fill={pollutantColors[tooltip.pollutant] || POLL_COLORS[tooltip.pollutant] || '#fff'}>
              {POLLUTANTS[tooltip.pollutant]?.name}: {tooltip.value} {POLLUTANTS[tooltip.pollutant]?.unit}
            </text>
          </g>
        );
      })()}

      {!compact && pollutants.map((p, i) => (
        <g key={p} transform={`translate(${PAD.left + i * 90}, ${height - 10})`}>
          <rect width="12" height="3" y="-2" fill={pollutantColors[p] || POLL_COLORS[p] || '#111'} />
          <text x="15" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
            {POLLUTANTS[p]?.name} ({POLLUTANTS[p]?.unit})
          </text>
        </g>
      ))}
    </svg>
  );
}
