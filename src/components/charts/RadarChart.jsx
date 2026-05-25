import { useMemo, useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';
import { getPollLevel } from '../../utils/aqi';

export default function RadarChart({ data, pollutants, lang, width = 900, height = 300 }) {
  const L = lang === 'it';
  const n = pollutants.length;
  const [hovered, setHovered] = useState(null);

  const { axisLevels, peakValues } = useMemo(() => {
    if (!n || !data.length) return { axisLevels: [], peakValues: [] };
    const levels = [], peaks = [];
    for (const key of pollutants) {
      const peak = Math.max(...data.map(r => r[key] ?? 0));
      peaks.push(peak);
      levels.push(getPollLevel(key, peak));
    }
    return { axisLevels: levels, peakValues: peaks };
  }, [data, pollutants, n]);

  if (!n || !data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray2)', fontFamily: 'Epilogue', fontSize: 12 }}>
        {L ? 'Nessun dato' : 'No data'}
      </div>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) * 0.68;
  const labelPad = 28;

  const axisAngle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;

  const ringPoints = (ring) =>
    pollutants.map((_, i) => {
      const a = axisAngle(i);
      const d = (ring / 5) * r;
      return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
    });

  const axisPoint = (i, level) => {
    const a = axisAngle(i);
    const d = (level / 5) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };

  const dataPoints = axisLevels.map((lv, i) => axisPoint(i, Math.max(lv, 0.15)));
  const dataPolygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');
  const rings = [1, 2, 3, 4, 5];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Clean annular bands using evenodd fill rule */}
      {rings.map((ring, ri) => {
        const outerPts = ringPoints(ring);
        const outerStr = outerPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
        let d;
        if (ri === 0) {
          d = outerStr;
        } else {
          const innerPts = ringPoints(rings[ri - 1]);
          const innerStr = innerPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
          d = outerStr + ' ' + innerStr;
        }
        return (
          <path
            key={ring}
            d={d}
            fill={LEVELS[ring - 1].color}
            fillOpacity={0.22}
            fillRule="evenodd"
            stroke="none"
          />
        );
      })}

      {/* Grid ring outlines */}
      {rings.map(ring => {
        const pts = ringPoints(ring).map(([x, y]) => `${x},${y}`).join(' ');
        return (
          <polygon key={ring} points={pts} fill="none"
            stroke="var(--gray2)" strokeWidth={0.75} strokeOpacity={0.5} />
        );
      })}

      {/* Spokes */}
      {pollutants.map((_, i) => {
        const [x, y] = axisPoint(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="var(--gray2)" strokeWidth={0.75} strokeOpacity={0.5} />;
      })}

      {/* Data polygon — white line, no fill */}
      <polygon
        points={dataPolygonPoints}
        fill="var(--white)"
        fillOpacity={0.08}
        stroke="var(--white)"
        strokeWidth={2}
        strokeLinejoin="miter"
      />

      {/* Dots */}
      {dataPoints.map(([x, y], i) => {
        const isHov = hovered === i;
        return (
          <circle key={i} cx={x} cy={y} r={isHov ? 5 : 3}
            fill="var(--white)" stroke="var(--gray2)" strokeWidth={1}
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hovered !== null && (() => {
        const [x, y] = dataPoints[hovered];
        const key = pollutants[hovered];
        const poll = POLLUTANTS[key];
        const val = peakValues[hovered];
        const color = LEVELS[axisLevels[hovered]]?.color || 'var(--primary)';
        const a = axisAngle(hovered);
        const isRight = Math.cos(a) >= 0;
        const tw = 110, th = 36;
        const tx = isRight ? x + 10 : x - 10 - tw;
        const ty = y - th / 2;
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={th} rx={2}
              fill="var(--white)" stroke={color} strokeWidth={1.5} />
            <text x={tx + 8} y={ty + 12}
              style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, fill: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {poll?.name || key}
            </text>
            <text x={tx + 8} y={ty + 26}
              style={{ fontFamily: 'Epilogue', fontSize: 13, fontWeight: 700, fill: color }}>
              {val} <tspan style={{ fontSize: 9, fontWeight: 400, fill: 'var(--gray2)' }}>{poll?.unit}</tspan>
            </text>
          </g>
        );
      })()}

      {/* Ring level numbers on the top axis */}
      {rings.map(ring => {
        const [x, y] = axisPoint(0, ring);
        return (
          <text key={ring} x={x + 5} y={y} textAnchor="start" dominantBaseline="central"
            style={{ fontFamily: 'Epilogue', fontSize: 9, fill: 'var(--gray2)' }}>
            {ring}
          </text>
        );
      })}

      {/* Axis labels */}
      {pollutants.map((key, i) => {
        const a = axisAngle(i);
        const lx = cx + (r + labelPad) * Math.cos(a);
        const ly = cy + (r + labelPad) * Math.sin(a);
        const anchor = Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle';
        return (
          <text key={key} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
            style={{ fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, fill: 'var(--black)', letterSpacing: '0.05em' }}>
            {POLLUTANTS[key]?.name || key}
          </text>
        );
      })}
    </svg>
  );
}
