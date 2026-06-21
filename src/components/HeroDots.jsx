import { useEffect, useRef } from 'react';

export default function HeroDots({ level = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const count = 30 + level * 30;   // 30 (good) → 180 (extreme)
    const baseSpeed = 0.28;

    let width, height, dots, animId;

    // depth (0 = far/small/slow/faint, 1 = near/big/fast/bold) drives a simple
    // parallax — closer "particles" rise faster and read more solid.
    function spawnDot(fromBottom) {
      const depth = Math.random();
      const r = 2.5 + depth * 6.5;
      return {
        x: Math.random() * width,
        y: fromBottom ? height + r : Math.random() * height,
        vy: -(baseSpeed * (0.45 + depth * 0.9)),
        vx: (Math.random() - 0.5) * 0.16,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.008 + Math.random() * 0.014,
        swayAmp: 0.2 + depth * 0.5,
        r,
        alpha: 0.22 + depth * 0.58,
      };
    }

    function init() {
      width  = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width  = width;
      canvas.height = height;
      dots = Array.from({ length: count }, () => spawnDot(false));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

      for (const d of dots) {
        d.swayPhase += d.swaySpeed;
        d.x += d.vx + Math.sin(d.swayPhase) * d.swayAmp * 0.05;
        d.y += d.vy;

        if (d.x < -d.r) d.x = width + d.r;
        if (d.x > width + d.r) d.x = -d.r;
        if (d.y < -d.r) Object.assign(d, spawnDot(true));

        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

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
        opacity: 0.85,
        filter: 'blur(2px)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
