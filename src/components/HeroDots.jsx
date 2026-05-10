import { useEffect, useRef } from 'react';

const PRIMARY = '#b53c17';

export default function HeroDots({ level = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const count = 6 + level * 8;          // 6 (good) → 46 (extreme)
    const baseSpeed = 0.35; // slow → fast
    const baseSize  = 3  + level * 0.8;   // small → larger

    let width, height, dots, animId;

    function init() {
      width  = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width  = width;
      canvas.height = height;

      dots = Array.from({ length: count }, () => {
        const speed = baseSpeed * (0.6 + Math.random() * 0.8);
        const angle = Math.random() * Math.PI * 2;
        return {
          x:  Math.random() * width,
          y:  Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r:  baseSize * (0.5 + Math.random() * 0.5),
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = PRIMARY;

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -d.r)        d.x = width  + d.r;
        if (d.x > width  + d.r) d.x = -d.r;
        if (d.y < -d.r)        d.y = height + d.r;
        if (d.y > height + d.r) d.y = -d.r;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();

    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(animId);
      init();
      draw();
    });
    obs.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.4,
        pointerEvents: 'none',
      }}
    />
  );
}
