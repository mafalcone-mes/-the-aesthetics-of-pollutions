import { useState } from 'react';

export default function Sparkline({ data, color, labels, height = 80 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const W = 400;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = height - ((v - min) / (max - min || 1)) * (height - 10) - 5;
    return { x, y, v };
  });
  const pts = points.map((p) => `${p.x},${p.y}`);
  const path = 'M' + pts.join(' L');
  const area = path + ` L${W},${height} L0,${height} Z`;
  const gradId = `sg${color.replace('#', '')}`;

  const hoveredPoint = hoveredIdx == null ? null : points[hoveredIdx];
  const timeLabel  = hoveredIdx != null && labels ? labels[hoveredIdx] : null;
  const valueLabel = hoveredPoint
    ? (Number.isInteger(hoveredPoint.v) ? `${hoveredPoint.v}` : hoveredPoint.v.toFixed(1))
    : null;
  const tooltipText = timeLabel ? `${timeLabel} · ${valueLabel}` : valueLabel;
  const tooltipW = tooltipText && tooltipText.length > 6 ? tooltipText.length * 4.2 + 8 : 28;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />

      {points.map((p, i) => {
        const isHovered = hoveredIdx === i;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isHovered ? 4.5 : 2.5}
            fill={color}
            stroke="var(--white)"
            strokeWidth={isHovered ? 1.8 : 1.2}
            style={{ transition: 'r 0.12s ease, stroke-width 0.12s ease', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
          />
        );
      })}

      {hoveredPoint && (
        <g
          transform={`translate(${Math.min(Math.max(hoveredPoint.x, tooltipW / 2), W - tooltipW / 2)}, ${Math.max(14, hoveredPoint.y - 12)})`}
          pointerEvents="none"
        >
          <rect x={-tooltipW / 2} y={-13} width={tooltipW} height={13} rx={3} fill="var(--black)" />
          <text
            x="0"
            y="-3.5"
            textAnchor="middle"
            fontFamily="var(--font-body)"
            fontSize="6"
            fill="var(--white)"
          >
            {tooltipText}
          </text>
        </g>
      )}
    </svg>
  );
}
