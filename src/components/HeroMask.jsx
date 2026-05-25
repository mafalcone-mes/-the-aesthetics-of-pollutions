import { useEffect, useRef } from 'react';

const R = 8;
const SPEED = 0.55;
const COUNTS = [6, 18, 50, 120, 280, 480];

export default function HeroMask({ level = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, dpr = 1, raf;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width  = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width  = Math.round(width  * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();

    const count = COUNTS[Math.max(0, Math.min(5, level))];
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * (width  || window.innerWidth),
      y: Math.random() * (height || window.innerHeight * 0.62),
      vx: (Math.random() - 0.5) * 2 * SPEED,
      vy: (Math.random() - 0.5) * 2 * SPEED,
    }));

    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary').trim() || '#B7410E';

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = primary;
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, R, 0, Math.PI * 2);
        ctx.fill();
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -R) d.x = width + R;
        if (d.x > width + R) d.x = -R;
        if (d.y < -R) d.y = height + R;
        if (d.y > height + R) d.y = -R;
      }
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}
