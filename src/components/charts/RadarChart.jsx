import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';

// sensors: [{ id, name, pollutantLevels: { pm25: 2, ... }, overallAqi: 3 }]
// Renders on a dark (var(--primary)) background with screen-blended glowing blobs.
export default function RadarChart({ sensors, pollutants, lang, width = 900, height = 420 }) {
  const L = lang === 'it';
  const [hovered, setHovered] = useState(null);
  const n = pollutants.length;

  if (!n || !sensors?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray2)', fontFamily: 'Epilogue', fontSize: 12 }}>
        {L ? 'Nessun dato' : 'No data'}
      </div>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) * 0.62;
  const labelPad = 32;

  const axisAngle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const axisPoint = (i, level) => {
    const a = axisAngle(i);
    const d = (level / 5) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };

  const rings = [1, 2, 3, 4, 5];

  return (
    <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Three-layer blur filters for the blob effect */}
          <filter id="rdr-halo" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="rdr-mid" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="rdr-core" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Circular rings — concentric circles like the reference */}
        {rings.map(ring => (
          <circle key={ring} cx={cx} cy={cy} r={(ring / 5) * r}
            fill="none" stroke="var(--gray2)" strokeWidth={0.6} strokeOpacity={0.45} />
        ))}

        {/* Spokes */}
        {pollutants.map((_, i) => {
          const [x, y] = axisPoint(i, 5);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
            stroke="var(--gray2)" strokeWidth={0.6} strokeOpacity={0.45} />;
        })}

        {/* Sensor blobs — multiply blend works on white: color×white=color, overlaps darken */}
        <g style={{ mixBlendMode: 'multiply' }}>
          {sensors.map((sensor) => {
            const isHov = hovered === sensor.id;
            const dataPoints = pollutants.map((key, i) =>
              axisPoint(i, Math.max(sensor.pollutantLevels[key] ?? 0, 0.08))
            );
            const polyPts = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');
            const overallColor = LEVELS[sensor.overallAqi]?.color || '#888';

            return (
              <g key={sensor.id}
                style={{ opacity: hovered !== null && !isHov ? 0.15 : 1, transition: 'opacity 0.25s', cursor: 'default' }}
                onMouseEnter={() => setHovered(sensor.id)}
                onMouseLeave={() => setHovered(null)}>

                {/* Outer halo — very wide blur, low opacity */}
                <polygon points={polyPts} fill={overallColor}
                  fillOpacity={isHov ? 0.45 : 0.3} filter="url(#rdr-halo)" stroke="none" />

                {/* Per-vertex blobs — colored by each pollutant's own AQI level */}
                {dataPoints.map(([x, y], i) => {
                  const key = pollutants[i];
                  const lvl = sensor.pollutantLevels[key] ?? 0;
                  const color = LEVELS[lvl]?.color || '#888';
                  return (
                    <g key={key}>
                      <circle cx={x} cy={y} r={20} fill={color}
                        fillOpacity={0.35} filter="url(#rdr-mid)" />
                      <circle cx={x} cy={y} r={6} fill={color}
                        fillOpacity={0.9} filter="url(#rdr-core)" />
                    </g>
                  );
                })}

                {/* Mid polygon — medium blur, fills the shape */}
                <polygon points={polyPts} fill={overallColor}
                  fillOpacity={0.45} filter="url(#rdr-mid)" stroke="none" />
              </g>
            );
          })}
        </g>

        {/* Ring level numbers — top axis */}
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
          const anchor = Math.cos(a) > 0.25 ? 'start' : Math.cos(a) < -0.25 ? 'end' : 'middle';
          return (
            <text key={key} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
              style={{ fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, fill: 'var(--black)', letterSpacing: '0.05em' }}>
              {POLLUTANTS[key]?.name || key}
            </text>
          );
        })}

        {/* Hover: sensor name in center */}
        {hovered !== null && (() => {
          const sensor = sensors.find(s => s.id === hovered);
          if (!sensor) return null;
          const color = LEVELS[sensor.overallAqi]?.color || 'white';
          return (
            <g pointerEvents="none">
              <text x={cx} y={cy - 9} textAnchor="middle" dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 13, fontWeight: 700, fill: color }}>
                {sensor.name}
              </text>
              <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 9, fill: 'var(--gray2)' }}>
                AQI {sensor.overallAqi + 1}
              </text>
            </g>
          );
        })()}

        {/* Legend — bottom of chart */}
        {sensors.length > 1 && sensors.map((sensor, si) => {
          const color = LEVELS[sensor.overallAqi]?.color || '#888';
          return (
            <g key={sensor.id} transform={`translate(${16 + si * 115}, ${height - 12})`}>
              <rect width={12} height={3} y={-1} fill={color} rx={1} opacity={0.8} />
              <text x={16} y={3} dominantBaseline="central"
                style={{ fontFamily: 'Epilogue', fontSize: 9, fill: 'var(--gray2)' }}>
                {sensor.name}
              </text>
            </g>
          );
        })}
      </svg>
  );
}
