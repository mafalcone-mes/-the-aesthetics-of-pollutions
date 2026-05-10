import { LEVELS } from '../../data/levels';
import { getPollLevel } from '../../utils/aqi';

function buildGrid(readings, pollutantKey) {
  // Index readings by (date-key → hour → value)
  const dayMap = new Map();
  for (const r of readings) {
    const d = r.dateObj;
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    if (!dayMap.has(key)) dayMap.set(key, { date: d, hours: new Array(24).fill(null) });
    dayMap.get(key).hours[r.hour] = r[pollutantKey];
  }
  return [...dayMap.keys()].sort().slice(-7).map(k => dayMap.get(k));
}

export default function HeatMap({ readings = [], lang, pollutantKey = 'pm25' }) {
  const L = lang === 'it';
  const dayNames = L
    ? ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  const grid = buildGrid(readings, pollutantKey);
  if (!grid.length) return null;

  const allVals = grid.flatMap(d => d.hours.filter(v => v !== null));
  const maxV = Math.max(...allVals, 1);

  const cellW = 9, cellH = 10, padL = 24, padT = 16;
  const W = padL + 24 * cellW;
  const H = padT + 7 * cellH + 16;

  const getColor = (val) => val === null ? '#DDDAD3' : LEVELS[getPollLevel(pollutantKey, val)].color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {hourLabels.map(h => (
        <text key={h} x={padL + h * cellW + cellW / 2} y={padT - 3}
          textAnchor="middle" fontSize="5" fontFamily="Epilogue" fill="#9B9790">{h}h</text>
      ))}
      {grid.map(({ date }, di) => (
        <text key={di} x={padL - 2} y={padT + di * cellH + cellH * 0.7}
          textAnchor="end" fontSize="5.5" fontFamily="Epilogue" fill="#9B9790">
          {dayNames[date.getDay()]}
        </text>
      ))}
      {grid.map(({ hours }, di) =>
        hours.map((val, h) => (
          <rect key={`${di}-${h}`}
            x={padL + h * cellW} y={padT + di * cellH}
            width={cellW - 0.8} height={cellH - 0.8}
            fill={getColor(val)}
            opacity={val === null ? 0.15 : 0.3 + (val / maxV) * 0.7}
            rx="0.5"
          />
        ))
      )}
      {LEVELS.map((l, i) => (
        <g key={l.key}>
          <rect x={padL + i * 28} y={H - 9} width={10} height={6} fill={l.color} />
          <text x={padL + i * 28 + 12} y={H - 4} fontSize="4.5" fontFamily="Epilogue" fill="#9B9790">
            {L ? l.it.split(' ')[0] : l.en.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
