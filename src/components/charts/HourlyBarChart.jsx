import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { getPollLevel } from '../../utils/aqi';

const POLL_COLORS = {
  pm25: '#E05A2B', pm10: '#F0A500', no2: '#4CAF6F', co: '#B5213D',
  o3: '#C8D43A', so2: '#6B1540', nh3: '#9B6B3A', c6h6: '#3A7B9B',
};

const PAD = { top: 16, right: 16, bottom: 44, left: 44 };

// Vertical bar chart: mean AQI level per pollutant, grouped by hour of day (0–23).
// data = Row[] (all filtered rows), pollutants = string[] of selected pollutant keys.
export default function HourlyBarChart({ data, pollutants, lang, width = 900, height = 220 }) {
  const [tooltip, setTooltip] = useState(null);
  const L = lang === 'it';

  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  if (!data.length || !pollutants.length) return null;

  // Group by hour-of-day: mean AQI level and mean raw value per pollutant
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const rows = data.filter(r => r.hour === h);
    const entry = { hour: h, count: rows.length };
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

  const groupW = W / 24;
  const barW = Math.max(1, (groupW - 2) / pollutants.length);
  const xGroupLeft = (h) => PAD.left + h * groupW;
  const yScale = (level) => PAD.top + H - (level / 5) * H;

  const yTicks = [0, 1, 2, 3, 4, 5];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {yTicks.map(lv => (
        <line key={lv} x1={PAD.left} y1={yScale(lv)} x2={PAD.left + W} y2={yScale(lv)}
          stroke="#DDDAD3" strokeWidth="1" />
      ))}
      {yTicks.map(lv => (
        <text key={lv} x={PAD.left - 4} y={yScale(lv) + 3} textAnchor="end"
          fontSize="8" fontFamily="Epilogue" fill="#9B9790">{lv}</text>
      ))}

      {hourly.filter(d => d.hour % 3 === 0).map(d => (
        <text key={d.hour} x={xGroupLeft(d.hour) + groupW / 2} y={PAD.top + H + 14}
          textAnchor="middle" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
          {String(d.hour).padStart(2, '0')}:00
        </text>
      ))}

      {hourly.map(d =>
        pollutants.map((p, pi) => {
          const val = d[p];
          if (val === null || val === 0) return null;
          const x = xGroupLeft(d.hour) + pi * barW + 1;
          const barH = (val / 5) * H;
          const y = PAD.top + H - barH;
          return (
            <rect key={`${d.hour}-${p}`}
              x={x} y={y} width={Math.max(barW - 1, 1)} height={barH}
              fill={POLL_COLORS[p] || '#111'} opacity={0.82} rx={1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: xGroupLeft(d.hour) + groupW / 2, y, hour: d.hour, data: d })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })
      )}

      {tooltip && (() => {
        const lines = pollutants
          .filter(p => tooltip.data[p] !== null)
          .map(p => ({ p, level: tooltip.data[p].toFixed(2), raw: tooltip.data[`${p}_raw`]?.toFixed(1) ?? '—' }));
        const tw = 168;
        const th = 22 + lines.length * 14;
        const tx = Math.min(tooltip.x + 6, width - tw - 4);
        const ty = Math.max(tooltip.y - th - 6, PAD.top);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#111" opacity="0.93" />
            <text x={tx + 7} y={ty + 13} fontSize="8.5" fontFamily="Epilogue" fontWeight="700" fill="#fff">
              {String(tooltip.hour).padStart(2, '0')}:00–{String(tooltip.hour + 1).padStart(2, '0')}:00
              <tspan fontSize="7.5" fontWeight="400" fill="#9B9790"> ({tooltip.data.count} {L ? 'letture' : 'readings'})</tspan>
            </text>
            {lines.map(({ p, level, raw }, i) => (
              <text key={p} x={tx + 7} y={ty + 27 + i * 14} fontSize="8" fontFamily="Epilogue" fill={POLL_COLORS[p] || '#fff'}>
                {POLLUTANTS[p]?.name}: {raw} {POLLUTANTS[p]?.unit}
                <tspan fill="#9B9790"> · L{level}</tspan>
              </text>
            ))}
          </g>
        );
      })()}

      {pollutants.map((p, i) => (
        <g key={p} transform={`translate(${PAD.left + i * 90}, ${height - 10})`}>
          <rect width="12" height="8" fill={POLL_COLORS[p] || '#111'} opacity={0.82} rx={1} />
          <text x="15" y="7" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
            {POLLUTANTS[p]?.name} ({POLLUTANTS[p]?.unit})
          </text>
        </g>
      ))}
    </svg>
  );
}
