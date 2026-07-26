import { useState } from 'react';
import { POLLUTANTS } from '../../data/pollutants';
import { LEVELS } from '../../data/levels';

// sensors: [{ id, name, pollutantLevels: { pm25: 2, ... }, overallAqi: 3 }]
// Renders on a dark (var(--primary)) background with screen-blended glowing blobs.
export default function RadarChart({ sensors, pollutants, lang, width = 900, height = 420, decorative = false }) {
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
  const r = Math.min(cx, cy) * (decorative ? 0.72 : 0.62);
  const labelPad = 32;

  const blob = decorative
    ? { haloR: 90, midR: 48, coreR: 18, haloBlur: 45, midBlur: 18, coreBlur: 6, haloOp: 0.55, midOp: 0.65, polyHaloOp: 0.5, polyMidOp: 0.55 }
    : { haloR: 20, midR: 6,  coreR: 6,  haloBlur: 18, midBlur: 7,  coreBlur: 2.5, haloOp: 0.35, midOp: 0.9, polyHaloOp: 0.3, polyMidOp: 0.45 };

  const axisAngle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const axisPoint = (i, level) => {
    const a = axisAngle(i);
    const d = (level / 5) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };

  const rings = [1, 2, 3, 4, 5];

  return (
    <svg
        className={decorative ? undefined : 'chart-fade-in'}
        width="100%"
        height={decorative ? '100%' : undefined}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio={decorative ? 'xMidYMid meet' : undefined}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id="rdr-halo" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation={blob.haloBlur} />
          </filter>
          <filter id="rdr-mid" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={blob.midBlur} />
          </filter>
          <filter id="rdr-core" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={blob.coreBlur} />
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
                style={{ opacity: !decorative && hovered !== null && !isHov ? 0.15 : 1, transition: 'opacity 0.25s' }}
                onMouseEnter={decorative ? undefined : () => setHovered(sensor.id)}
                onMouseLeave={decorative ? undefined : () => setHovered(null)}>

                {/* Outer halo */}
                <polygon points={polyPts} fill={overallColor}
                  fillOpacity={isHov ? 0.55 : blob.polyHaloOp} filter="url(#rdr-halo)" stroke="none" />

                {/* Per-vertex blobs — colored by each pollutant's own AQI level */}
                {dataPoints.map(([x, y], i) => {
                  const key = pollutants[i];
                  const lvl = sensor.pollutantLevels[key] ?? 0;
                  const color = LEVELS[lvl]?.color || '#888';
                  return (
                    <g key={key}>
                      <circle cx={x} cy={y} r={blob.haloR} fill={color}
                        fillOpacity={blob.haloOp} filter="url(#rdr-halo)" />
                      <circle cx={x} cy={y} r={blob.midR} fill={color}
                        fillOpacity={blob.haloOp} filter="url(#rdr-mid)" />
                      <circle cx={x} cy={y} r={blob.coreR} fill={color}
                        fillOpacity={blob.midOp} filter="url(#rdr-core)" />
                    </g>
                  );
                })}

                {/* Mid polygon */}
                <polygon points={polyPts} fill={overallColor}
                  fillOpacity={blob.polyMidOp} filter="url(#rdr-mid)" stroke="none" />
              </g>
            );
          })}
        </g>

        {/* Ring level numbers — top axis */}
        {!decorative && rings.map(ring => {
          const [x, y] = axisPoint(0, ring);
          return (
            <text key={ring} x={x + 5} y={y} textAnchor="start" dominantBaseline="central"
              style={{ fontFamily: 'Epilogue', fontSize: 9, fill: 'var(--gray2)' }}>
              {ring}
            </text>
          );
        })}

        {/* Axis labels */}
        {!decorative && pollutants.map((key, i) => {
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
        {!decorative && hovered !== null && (() => {
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
        {!decorative && sensors.length > 1 && sensors.map((sensor, si) => {
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
