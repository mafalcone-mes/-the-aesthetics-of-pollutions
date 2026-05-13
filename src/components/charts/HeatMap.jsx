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

function buildDailyGrid(readings, pollutantKey) {
  // Index readings by date-key, compute max value per day
  const dayMap = new Map();
  for (const r of readings) {
    const d = r.dateObj;
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    if (!dayMap.has(key)) dayMap.set(key, { date: d, maxVal: null, maxAQI: null });
    const val = r[pollutantKey];
    if (val !== null && val !== undefined) {
      if (dayMap.get(key).maxVal === null || val > dayMap.get(key).maxVal) {
        dayMap.get(key).maxVal = val;
        dayMap.get(key).maxAQI = getPollLevel(pollutantKey, val);
      }
    }
  }
  return [...dayMap.keys()].sort().slice(-30).map(k => dayMap.get(k));
}

export default function HeatMap({ readings = [], lang, pollutantKey = 'pm25', showLegend = false, dailyView = false }) {
  const L = lang === 'it';
  const dayNames = L
    ? ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  const grid = dailyView ? buildDailyGrid(readings, pollutantKey) : buildGrid(readings, pollutantKey);
  if (!grid.length) return null;

  if (dailyView) {
    // Daily view: 1 row × 30 days
    const cellW = 160, cellH = 120, padL = 32, padT = 40;
    const W = padL + 30 * cellW + 32;
    const H = padT + cellH + 40 + (showLegend ? 40 : 0);

    function fmtDate(d) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}/${m}`;
    }

    const getColor = (aqi) => aqi === null ? '#DDDAD3' : LEVELS[aqi].color;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Date labels */}
        {grid.map(({ date }, di) => di % 5 === 0 && (
          <text key={`label-${di}`} x={padL + di * cellW + cellW / 2} y={padT - 12}
            textAnchor="middle" fontSize="14" fontFamily="Epilogue" fill="#9B9790">
            {fmtDate(date)}
          </text>
        ))}
        {/* Cells */}
        {grid.map(({ maxAQI }, di) => (
          <rect key={`cell-${di}`}
            x={padL + di * cellW + 1} y={padT + 1}
            width={cellW - 2} height={cellH - 2}
            fill={getColor(maxAQI)} opacity={maxAQI === null ? 0.12 : 0.3 + (maxAQI / 5) * 0.7}
            rx={2}
          />
        ))}
        {/* Legend */}
        {showLegend && (
          <g transform={`translate(${padL},${padT + cellH + 8})`}>
            {LEVELS.map((lv, i) => (
              <g key={i}>
                <rect x={i * 28} y={0} width={6} height={6} fill={lv.color} opacity={0.3 + (i / 5) * 0.7} />
                <text x={10} y={5} fontSize="5" fontFamily="Epilogue" fill="#9B9790">{L ? lv.label_it : lv.label_en}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    );
  }

  // Hourly view (original)
  const allVals = grid.flatMap(d => d.hours.filter(v => v !== null));
  const maxV = Math.max(...allVals, 1);

  const cellW = 8, cellH = 9, padL = 22, padT = 14;
  const W = padL + 24 * cellW;
  const H = padT + 7 * cellH + (showLegend ? 16 : 0);

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
      {showLegend && LEVELS.map((l, i) => (
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
