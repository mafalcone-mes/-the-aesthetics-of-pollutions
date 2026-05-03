import { POLLUTANTS } from '../../data/pollutants';

const POLL_COLORS = {
  pm25: '#E05A2B', pm10: '#F0A500', no2: '#4CAF6F', co: '#B5213D',
  o3: '#C8D43A', so2: '#6B1540', nh3: '#9B6B3A', c6h6: '#3A7B9B',
};

export default function MultiLineChart({ data, pollutants, width = 800, height = 220 }) {
  const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;
  if (!data.length) return null;

  const scales = {};
  for (const p of pollutants) {
    const vals = data.map((r) => r[p]);
    scales[p] = { min: Math.min(...vals), max: Math.max(...vals, 1) };
  }

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * W;
  const yScale = (p, v) => PAD.top + H - ((v - scales[p].min) / (scales[p].max - scales[p].min || 1)) * H;

  const xLabels = data.reduce((acc, r, i) => {
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
        <text key={i} x={xScale(i)} y={PAD.top + H + 12} textAnchor="middle"
          fontSize="7" fontFamily="Epilogue" fill="#9B9790">{label}</text>
      ))}
      {pollutants.map((p) => {
        const pts = data.map((r, i) => `${xScale(i)},${yScale(p, r[p])}`).join(' L');
        return <polyline key={p} points={`M${pts}`} fill="none" stroke={POLL_COLORS[p] || '#111'} strokeWidth="1.5" opacity="0.85" />;
      })}
      {pollutants.map((p, i) => (
        <g key={p} transform={`translate(${PAD.left + i * 70}, ${height - 8})`}>
          <rect width="12" height="3" y="-2" fill={POLL_COLORS[p] || '#111'} />
          <text x="15" fontSize="7" fontFamily="Epilogue" fill="#9B9790">
            {POLLUTANTS[p]?.name} ({POLLUTANTS[p]?.unit})
          </text>
        </g>
      ))}
    </svg>
  );
}
