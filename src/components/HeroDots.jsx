import { useEffect, useRef } from 'react';

export default function HeroDots({ level = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const count = 30 + level * 30;   // 30 (good) → 180 (extreme)
    const speed = 0.3;
    const r     = 7;

    let width, height, dots, animId;

    function init() {
      width  = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width  = width;
      canvas.height = height;

      dots = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        return {
          x:  Math.random() * width,
          y:  Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r,
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

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
        opacity: 0.7,
        filter: 'blur(3px)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
