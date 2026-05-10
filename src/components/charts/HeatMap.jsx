import { LEVELS } from '../../data/levels';
import { getPollLevel } from '../../utils/aqi';

export default function HeatMap({ sensor, lang, pollutantKey = 'pm25' }) {
  const days = lang === 'it'
    ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  const base = sensor[pollutantKey] || 0;

  const data = days.map((_, di) =>
    Array.from({ length: 24 }, (__, h) => {
      const rush = (h >= 7 && h <= 10) || (h >= 16 && h <= 19) ? 1.4 : 1.0;
      const night = h < 5 || h > 22 ? 0.5 : 1.0;
      const weekend = di >= 5 ? 0.75 : 1.0;
      const noise = 0.7 + (((di * 24 + h) * 1317) % 100) / 165;
      return Math.max(1, Math.round(base * rush * night * weekend * noise));
    })
  );

  const allVals = data.flat();
  const maxV = Math.max(...allVals);
  const cellW = 9, cellH = 10, padL = 24, padT = 16;
  const W = padL + 24 * cellW;
  const H = padT + 7 * cellH + 16;

  const getColor = (val) => LEVELS[getPollLevel(pollutantKey, val)].color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {hours.map((h) => (
        <text key={h} x={padL + h * cellW + cellW / 2} y={padT - 3}
          textAnchor="middle" fontSize="5" fontFamily="Epilogue" fill="#9B9790">{h}h</text>
      ))}
      {days.map((d, di) => (
        <text key={d} x={padL - 2} y={padT + di * cellH + cellH * 0.7}
          textAnchor="end" fontSize="5.5" fontFamily="Epilogue" fill="#9B9790">{d}</text>
      ))}
      {data.map((row, di) =>
        row.map((val, h) => (
          <rect key={`${di}-${h}`}
            x={padL + h * cellW} y={padT + di * cellH}
            width={cellW - 0.8} height={cellH - 0.8}
            fill={getColor(val)} opacity={0.3 + (val / maxV) * 0.7}
            rx="0.5"
          />
        ))
      )}
      {LEVELS.map((l, i) => (
        <g key={l.key}>
          <rect x={padL + i * 28} y={H - 9} width={10} height={6} fill={l.color} />
          <text x={padL + i * 28 + 12} y={H - 4} fontSize="4.5" fontFamily="Epilogue" fill="#9B9790">
            {l.it.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
