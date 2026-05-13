import { useState } from 'react';
import { LEVELS } from '../../data/levels';
import { POLLUTANTS } from '../../data/pollutants';
import { getPollLevel } from '../../utils/aqi';

const POLL_KEYS = Object.keys(POLLUTANTS);

function dateKey(r) {
  const d = r.dateObj;
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function fmtDk(dk) {
  const m = String(Math.floor((dk % 10000) / 100)).padStart(2, '0');
  const d = String(dk % 100).padStart(2, '0');
  return `${d}/${m}`;
}

// Heatmap: sensors (rows) × days (columns), colored by the max AQI level that day.
// data = Row[] (all filtered rows).
export default function DailyHeatmap({ data, lang, width = 900, height = 220 }) {
  const [tooltip, setTooltip] = useState(null);
  const L = lang === 'it';

  if (!data.length) return null;

  const sensorIds = [...new Set(data.map(r => r.sensorId))];
  const sensorName = (id) => data.find(r => r.sensorId === id)?.sensorName || String(id);

  const dateKeys = [...new Set(data.map(dateKey))].sort((a, b) => a - b);

  // Build cell map: `${sensorId}:${dateKey}` → { maxAQI, row, worstPollutant }
  const cellMap = new Map();
  for (const r of data) {
    const dk = dateKey(r);
    const k = `${r.sensorId}:${dk}`;
    const existing = cellMap.get(k);
    if (!existing || r.aqi > existing.maxAQI) {
      const worstP = POLL_KEYS.reduce(
        (best, p) => getPollLevel(p, r[p] ?? 0) > getPollLevel(best, r[best] ?? 0) ? p : best,
        POLL_KEYS[0]
      );
      cellMap.set(k, { maxAQI: r.aqi, row: r, worstPollutant: worstP });
    }
  }

  const PL = 52, PT = 24, PB = 36, PR = 16;
  const gridW = width - PL - PR;
  const gridH = height - PT - PB;
  const cellW = gridW / Math.max(dateKeys.length, 1);
  const cellH = gridH / Math.max(sensorIds.length, 1);

  // Skip date labels when there are many days to avoid overlap
  const labelEvery = dateKeys.length > 14 ? Math.ceil(dateKeys.length / 10) : 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Column headers (dates) */}
      {dateKeys.map((dk, di) => di % labelEvery === 0 && (
        <text key={dk}
          x={PL + di * cellW + cellW / 2} y={PT - 6}
          textAnchor="middle" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
          {fmtDk(dk)}
        </text>
      ))}

      {/* Row headers (sensors) */}
      {sensorIds.map((id, si) => (
        <text key={id}
          x={PL - 4} y={PT + si * cellH + cellH * 0.66}
          textAnchor="end" fontSize="7.5" fontFamily="Epilogue" fill="#9B9790">
          {sensorName(id)}
        </text>
      ))}

      {/* Cells */}
      {sensorIds.map((id, si) =>
        dateKeys.map((dk, di) => {
          const cell = cellMap.get(`${id}:${dk}`);
          const color = cell ? LEVELS[cell.maxAQI].color : '#DDDAD3';
          const opacity = cell ? 0.3 + (cell.maxAQI / 5) * 0.7 : 0.12;
          return (
            <rect key={`${si}-${di}`}
              x={PL + di * cellW + 1} y={PT + si * cellH + 1}
              width={Math.max(cellW - 2, 1)} height={Math.max(cellH - 2, 1)}
              fill={color} opacity={opacity} rx={2}
              style={{ cursor: cell ? 'pointer' : 'default' }}
              onMouseEnter={cell ? () => setTooltip({ x: PL + di * cellW + cellW / 2, y: PT + si * cellH, id, dk, cell }) : undefined}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })
      )}

      {/* Tooltip */}
      {tooltip && (() => {
        const lv = LEVELS[tooltip.cell.maxAQI];
        const wp = tooltip.cell.worstPollutant;
        const tw = 168;
        const th = 56;
        const tx = Math.min(tooltip.x + 4, width - tw - 4);
        const ty = Math.max(tooltip.y - th - 4, PT);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#111" opacity="0.93" />
            <text x={tx + 7} y={ty + 13} fontSize="8.5" fontFamily="Epilogue" fontWeight="700" fill="#fff">
              {sensorName(tooltip.id)}
            </text>
            <text x={tx + 7} y={ty + 25} fontSize="7.5" fontFamily="Epilogue" fill="#9B9790">
              {fmtDk(tooltip.dk)}
            </text>
            <text x={tx + 7} y={ty + 39} fontSize="9" fontFamily="Epilogue" fontWeight="700" fill={lv.color}>
              {L ? lv.it : lv.en} <tspan fontSize="7.5" fontWeight="400">(AQI {tooltip.cell.maxAQI})</tspan>
            </text>
            <text x={tx + 7} y={ty + 52} fontSize="7.5" fontFamily="Epilogue" fill="#9B9790">
              {L ? 'Inquinante peggiore' : 'Worst pollutant'}: {POLLUTANTS[wp]?.name}
            </text>
          </g>
        );
      })()}

      {/* Legend */}
      {LEVELS.map((l, i) => (
        <g key={l.key} transform={`translate(${PL + i * 80}, ${height - 10})`}>
          <rect width="14" height="9" fill={l.color} opacity={0.85} rx={1.5} />
          <text x="17" y="8" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
            {L ? l.it.split(' ')[0] : l.en.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
