import { useState } from 'react';
import { LEVELS } from '../../data/levels';
import { POLLUTANTS } from '../../data/pollutants';
import { getPollLevel } from '../../utils/aqi';

const POLL_KEYS = Object.keys(POLLUTANTS);
const CELL_OPACITY = 0.92;

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
  const [axisHover, setAxisHover] = useState(null); // { axis: 'row' | 'col', value }
  const L = lang === 'it';

  if (!data.length) return null;

  // Row order: group by district then sensor name, instead of first-seen-in-data order
  const sensorMeta = new Map();
  for (const r of data) {
    if (!sensorMeta.has(r.sensorId)) sensorMeta.set(r.sensorId, { name: r.sensorName, district: r.district });
  }
  const sensorIds = [...sensorMeta.keys()].sort((a, b) => {
    const ma = sensorMeta.get(a), mb = sensorMeta.get(b);
    return ma.district.localeCompare(mb.district) || ma.name.localeCompare(mb.name);
  });

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
  const showPollutantLabel = cellH >= 18 && cellW >= 34;

  // Skip date labels when there are many days to avoid overlap
  const labelEvery = dateKeys.length > 14 ? Math.ceil(dateKeys.length / 10) : 1;

  // A cell tooltip implies its row/column are also the active trace; otherwise a bare
  // header hover (no specific cell) can drive the trace on its own.
  const activeRow = tooltip?.id ?? (axisHover?.axis === 'row' ? axisHover.value : null);
  const activeCol = tooltip?.dk ?? (axisHover?.axis === 'col' ? axisHover.value : null);

  return (
    <svg className="chart-fade-in" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <pattern id="heatmapNoData" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#F1EEE9" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#C9C5BD" strokeWidth="2" />
        </pattern>
      </defs>

      {/* Column headers (dates) */}
      {dateKeys.map((dk, di) => di % labelEvery === 0 && (
        <text key={dk}
          x={PL + di * cellW + cellW / 2} y={PT - 6}
          textAnchor="middle" fontSize="7" fontFamily="Epilogue"
          fontWeight={activeCol === dk ? 700 : 400}
          fill={activeCol === dk ? '#1A1A1A' : '#9B9790'}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setAxisHover({ axis: 'col', value: dk })}
          onMouseLeave={() => setAxisHover(null)}>
          {fmtDk(dk)}
        </text>
      ))}

      {/* Row headers (sensors) */}
      {sensorIds.map((id, si) => (
        <text key={id}
          x={PL - 4} y={PT + si * cellH + cellH * 0.66}
          textAnchor="end" fontSize="7.5" fontFamily="Epilogue"
          fontWeight={activeRow === id ? 700 : 400}
          fill={activeRow === id ? '#1A1A1A' : '#9B9790'}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setAxisHover({ axis: 'row', value: id })}
          onMouseLeave={() => setAxisHover(null)}>
          {sensorMeta.get(id)?.name ?? String(id)}
        </text>
      ))}

      {/* Cells */}
      {sensorIds.map((id, si) =>
        dateKeys.map((dk, di) => {
          const cell = cellMap.get(`${id}:${dk}`);
          const x = PL + di * cellW + 1;
          const y = PT + si * cellH + 1;
          const w = Math.max(cellW - 2, 1);
          const h = Math.max(cellH - 2, 1);
          const isActive = activeRow === id || activeCol === dk;
          const traceStroke = isActive ? '#1A1A1A' : 'none';
          const traceWidth = isActive ? 1.4 : 0;

          if (!cell) {
            return (
              <rect key={`${si}-${di}`} x={x} y={y} width={w} height={h} rx={2}
                fill="url(#heatmapNoData)" stroke={traceStroke} strokeWidth={traceWidth} />
            );
          }

          const lv = LEVELS[cell.maxAQI];
          const textDark = cell.maxAQI <= 1; // same dark/light rule as .aqi-pill.dark elsewhere
          return (
            <g key={`${si}-${di}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: PL + di * cellW + cellW / 2, y, id, dk, cell })}
              onMouseLeave={() => setTooltip(null)}>
              <rect x={x} y={y} width={w} height={h} rx={2}
                fill={lv.color} opacity={CELL_OPACITY}
                stroke={traceStroke} strokeWidth={traceWidth} />
              {showPollutantLabel && (
                <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central"
                  fontSize="7" fontFamily="Epilogue" fontWeight="700"
                  fill={textDark ? '#1A1A1A' : '#FAF8F7'} pointerEvents="none">
                  {POLLUTANTS[cell.worstPollutant]?.name}
                </text>
              )}
            </g>
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
              {sensorMeta.get(tooltip.id)?.name ?? tooltip.id}
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
          <rect width="14" height="9" fill={l.color} opacity={CELL_OPACITY} rx={1.5} />
          <text x="17" y="8" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
            {L ? l.it.split(' ')[0] : l.en.split(' ')[0]}
          </text>
        </g>
      ))}
      <g transform={`translate(${PL + LEVELS.length * 80}, ${height - 10})`}>
        <rect width="14" height="9" fill="url(#heatmapNoData)" rx={1.5} />
        <text x="17" y="8" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
          {L ? 'Nessun dato' : 'No data'}
        </text>
      </g>
    </svg>
  );
}
