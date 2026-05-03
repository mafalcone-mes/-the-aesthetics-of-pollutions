export default function MiniChart({ color, values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mini-chart">
      {values.map((v, i) => (
        <div
          key={i}
          className="mini-bar"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.5 + (i / values.length) * 0.5 }}
        />
      ))}
    </div>
  );
}
