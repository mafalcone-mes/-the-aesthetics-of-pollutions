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
// Laid out as two side-by-side blocks of sensor rows (same full date range in each),
// so a long sensor list reads as two shorter columns instead of one tall one.
// data = Row[] (all filtered rows).
export default function DailyHeatmap({ data, lang, width = 900, height = 220 }) {
  const [tooltip, setTooltip] = useState(null);
  const [axisHover, setAxisHover] = useState(null); // { axis: 'row' | 'col', value }
  const L = lang === 'it';

  if (!data.length) return null;

  // Row order: group by district then location, instead of first-seen-in-data order
  const sensorMeta = new Map();
  for (const r of data) {
    if (!sensorMeta.has(r.sensorId)) sensorMeta.set(r.sensorId, { location: r.location, district: r.district });
  }
  const sensorIds = [...sensorMeta.keys()].sort((a, b) => {
    const ma = sensorMeta.get(a), mb = sensorMeta.get(b);
    return ma.district.localeCompare(mb.district) || ma.location.localeCompare(mb.location);
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

  // Split sensor rows into two side-by-side blocks, each showing the full date range.
  const half = Math.ceil(sensorIds.length / 2);
  const blocks = [sensorIds.slice(0, half), sensorIds.slice(half)];
  const rowsPerBlock = Math.max(blocks[0].length, blocks[1].length, 1);

  const PL = 56, PT = 28, PB = 40, PR = 20, BLOCK_GAP = 32;
  const blockW = Math.max((width - PL * 2 - BLOCK_GAP - PR) / 2, 1);
  const gridH = height - PT - PB;
  const cellW = blockW / Math.max(dateKeys.length, 1);
  const cellH = gridH / rowsPerBlock;
  const rowGap = 3; // vertical padding between different sensors' rows
  const blockX = (bi) => PL + bi * (blockW + BLOCK_GAP + PL);
  const showPollutantLabel = (cellH - rowGap) >= 20 && cellW >= 38;

  // Skip date labels when there's not enough room per block to avoid overlap
  const maxLabels = Math.max(1, Math.floor(blockW / 24));
  const labelEvery = Math.max(1, Math.ceil(dateKeys.length / maxLabels));

  // A cell tooltip implies its row/column are also the active trace; otherwise a bare
  // header hover (no specific cell) can drive the trace on its own. Date columns are
  // shared across both blocks, so tracing a date highlights it in both at once.
  const activeRow = tooltip?.id ?? (axisHover?.axis === 'row' ? axisHover.value : null);
  const activeCol = tooltip?.dk ?? (axisHover?.axis === 'col' ? axisHover.value : null);

  return (
    <svg className="chart-fade-in" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <pattern id="heatmapNoData" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#DDDAD3" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#9B9790" strokeWidth="2" />
        </pattern>
      </defs>

      {blocks.map((blockSensors, bi) => {
        const bx = blockX(bi);
        return (
          <g key={bi}>
            {/* Column headers (dates) — repeated per block since both share the full range */}
            {dateKeys.map((dk, di) => di % labelEvery === 0 && (
              <text key={dk}
                x={bx + di * cellW + cellW / 2} y={PT - 6}
                textAnchor="middle" fontSize="9" fontFamily="Epilogue"
                fontWeight={activeCol === dk ? 700 : 400}
                fill="var(--black)"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setAxisHover({ axis: 'col', value: dk })}
                onMouseLeave={() => setAxisHover(null)}>
                {fmtDk(dk)}
              </text>
            ))}

            {/* Row headers (sensors) */}
            {blockSensors.map((id, ri) => (
              <text key={id}
                x={bx - 4} y={PT + ri * cellH + cellH / 2}
                textAnchor="end" dominantBaseline="central" fontSize="9.5" fontFamily="Epilogue"
                fontWeight={activeRow === id ? 700 : 400}
                fill="var(--black)"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setAxisHover({ axis: 'row', value: id })}
                onMouseLeave={() => setAxisHover(null)}>
                {sensorMeta.get(id)?.location ?? String(id)}
              </text>
            ))}

            {/* Cells — flush within a sensor's row, gapped between different sensors' rows */}
            {blockSensors.map((id, ri) =>
              dateKeys.map((dk, di) => {
                const cell = cellMap.get(`${id}:${dk}`);
                const x = bx + di * cellW;
                const y = PT + ri * cellH + rowGap / 2;
                const w = cellW;
                const h = Math.max(cellH - rowGap, 1);
                const isActive = activeRow === id || activeCol === dk;
                const traceStroke = isActive ? '#1A1A1A' : 'none';
                const traceWidth = isActive ? 1.4 : 0;

                if (!cell) {
                  return (
                    <rect key={`${ri}-${di}`} x={x} y={y} width={w} height={h}
                      fill="url(#heatmapNoData)" stroke={traceStroke} strokeWidth={traceWidth} />
                  );
                }

                const lv = LEVELS[cell.maxAQI];
                const textDark = cell.maxAQI <= 1; // same dark/light rule as .aqi-pill.dark elsewhere
                return (
                  <g key={`${ri}-${di}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ x: x + w / 2, y, id, dk, cell })}
                    onMouseLeave={() => setTooltip(null)}>
                    <rect x={x} y={y} width={w} height={h}
                      fill={lv.color} opacity={CELL_OPACITY}
                      stroke={traceStroke} strokeWidth={traceWidth} />
                    {showPollutantLabel && (
                      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central"
                        fontSize="8" fontFamily="Epilogue" fontWeight="700"
                        fill={textDark ? '#1A1A1A' : '#FAF8F7'} pointerEvents="none">
                        {POLLUTANTS[cell.worstPollutant]?.name}
                      </text>
                    )}
                  </g>
                );
              })
            )}
          </g>
        );
      })}

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
            <rect x={tx} y={ty} width={tw} height={th} fill="#1A1A1A" opacity="0.93" />
            <text x={tx + 7} y={ty + 13} fontSize="9.5" fontFamily="Epilogue" fontWeight="700" fill="#fff">
              {sensorMeta.get(tooltip.id)?.location ?? tooltip.id}
            </text>
            <text x={tx + 7} y={ty + 25} fontSize="8.5" fontFamily="Epilogue" fill="#fff">
              {fmtDk(tooltip.dk)}
            </text>
            <text x={tx + 7} y={ty + 39} fontSize="10" fontFamily="Epilogue" fontWeight="700" fill={lv.color}>
              {L ? lv.it : lv.en} <tspan fontSize="8.5" fontWeight="400">(AQI {tooltip.cell.maxAQI})</tspan>
            </text>
            <text x={tx + 7} y={ty + 52} fontSize="8.5" fontFamily="Epilogue" fill="#fff">
              {L ? 'Inquinante peggiore' : 'Worst pollutant'}: {POLLUTANTS[wp]?.name}
            </text>
          </g>
        );
      })()}

      {/* Legend */}
      {LEVELS.map((l, i) => (
        <g key={l.key} transform={`translate(${PL + i * 88}, ${height - 10})`}>
          <rect width="14" height="9" fill={l.color} opacity={CELL_OPACITY} />
          <text x="17" y="8" fontSize="9" fontFamily="Epilogue" fill="var(--black)">
            {L ? l.it.split(' ')[0] : l.en.split(' ')[0]}
          </text>
        </g>
      ))}
      <g transform={`translate(${PL + LEVELS.length * 88}, ${height - 10})`}>
        <rect width="14" height="9" fill="url(#heatmapNoData)" />
        <text x="17" y="8" fontSize="8" fontFamily="Epilogue" fill="var(--black)">
          {L ? 'Nessun dato' : 'No data'}
        </text>
      </g>
    </svg>
  );
}
