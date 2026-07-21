import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';
import { SENSOR_COLORS as SENSOR_STROKES } from './chartColors';

// sensors: [{ id, name, pollutantLevels: { pm25: 2, ... }, overallAqi: 3 }]
// Each sensor is a thin outline polygon with a dot at each vertex, dot size/color
// driven by that pollutant's own AQI level.
export default function RadarChart({ sensors, pollutants, lang, width = 900, height = 420 }) {
  const L = lang === 'it';
  const [hovered, setHovered] = useState(null);
  const n = pollutants.length;

  if (!n || !sensors?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--black)', fontFamily: 'Epilogue', fontSize: 13 }}>
        {L ? 'Nessun dato' : 'No data'}
      </div>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) * 0.62;
  const labelPad = 36;

  const axisAngle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const axisPoint = (i, level) => {
    const a = axisAngle(i);
    const d = (level / 5) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };

  const rings = [1, 2, 3, 4, 5];

  return (
    <svg
        className="chart-fade-in"
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Circular rings — concentric circles like the reference */}
        {rings.map(ring => (
          <circle key={ring} cx={cx} cy={cy} r={(ring / 5) * r}
            fill="none" stroke="var(--gray)" strokeWidth={0.6} strokeOpacity={0.8} />
        ))}

        {/* Spokes */}
        {pollutants.map((_, i) => {
          const [x, y] = axisPoint(i, 5);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
            stroke="var(--gray)" strokeWidth={0.6} strokeOpacity={0.8} />;
        })}

        {/* Sensor traces — outline polygon + a dot per pollutant, sized/colored by its level */}
        {sensors.map((sensor, si) => {
          const isHov = hovered === sensor.id;
          const dataPoints = pollutants.map((key, i) => axisPoint(i, sensor.pollutantLevels[key] ?? 0));
          const polyPts = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');
          const strokeColor = SENSOR_STROKES[si % SENSOR_STROKES.length];

          return (
            <g key={sensor.id}
              style={{ opacity: hovered !== null && !isHov ? 0.2 : 1, transition: 'opacity 0.25s' }}
              onMouseEnter={() => setHovered(sensor.id)}
              onMouseLeave={() => setHovered(null)}>

              <polygon points={polyPts} fill={strokeColor} fillOpacity={isHov ? 0.22 : 0.1}
                stroke={strokeColor} strokeWidth={isHov ? 2.2 : 1.4} strokeLinejoin="round"
                style={{ transition: 'fill-opacity 0.25s' }} />

              {dataPoints.map(([x, y], i) => {
                const key = pollutants[i];
                const lvl = sensor.pollutantLevels[key] ?? 0;
                const color = LEVELS[lvl]?.color || '#888';
                const dotR = (isHov ? 2 : 0) + 3.5 + lvl * 1.3;
                return (
                  <circle key={key} cx={x} cy={y} r={dotR}
                    fill={color} stroke="var(--white)" strokeWidth={1}
                    style={{ transition: 'r 0.2s' }} />
                );
              })}
            </g>
          );
        })}

        {/* Ring level numbers — top axis */}
        {rings.map(ring => {
          const [x, y] = axisPoint(0, ring);
          return (
            <text key={ring} x={x + 5} y={y} textAnchor="start" dominantBaseline="central"
              style={{ fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, fill: 'var(--black)' }}>
              {ring}
            </text>
          );
        })}

        {/* Axis labels */}
        {pollutants.map((key, i) => {
          const a = axisAngle(i);
          const lx = cx + (r + labelPad) * Math.cos(a);
          const ly = cy + (r + labelPad) * Math.sin(a);
          const anchor = Math.cos(a) > 0.25 ? 'start' : Math.cos(a) < -0.25 ? 'end' : 'middle';
          return (
            <text key={key} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
              style={{ fontFamily: 'Epilogue', fontSize: 12, fontWeight: 700, fill: 'var(--black)', letterSpacing: '0.05em' }}>
              {POLLUTANTS[key]?.name || key}
            </text>
          );
        })}

        {/* Hover: sensor name in center */}
        {hovered !== null && (() => {
          const sensor = sensors.find(s => s.id === hovered);
          if (!sensor) return null;
          const color = LEVELS[sensor.overallAqi]?.color || 'var(--black)';
          return (
            <g pointerEvents="none">
              <text x={cx} y={cy - 9} textAnchor="middle" dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 13, fontWeight: 700, fill: color }}>
                {sensor.name}
              </text>
              <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, fill: 'var(--black)' }}>
                AQI {sensor.overallAqi + 1}
              </text>
            </g>
          );
        })()}

        {/* Legend — bottom of chart */}
        {sensors.length > 1 && sensors.map((sensor, si) => {
          const strokeColor = SENSOR_STROKES[si % SENSOR_STROKES.length];
          return (
            <g key={sensor.id} transform={`translate(${16 + si * 115}, ${height - 12})`}>
              <line x1={0} y1={-1} x2={12} y2={-1} stroke={strokeColor} strokeWidth={2} />
              <text x={16} y={3} dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 10, fill: 'var(--black)' }}>
                {sensor.name}
              </text>
            </g>
          );
        })}
      </svg>
  );
}
