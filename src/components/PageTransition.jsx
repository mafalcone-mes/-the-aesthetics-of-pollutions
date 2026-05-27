import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

const FILL_MS     = 420;
const PEAK_MS     = 80;
const DISSOLVE_MS = 380;
const SPACING     = 14;
const DOT_R       = 9; // ≥ SPACING/√3 ≈ 8.08 → guaranteed zero gaps at grid positions

const PageTransition = forwardRef(function PageTransition(_, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useImperativeHandle(ref, () => ({
    trigger(onMid) {
      const canvas = canvasRef.current;
      if (!canvas) { onMid(); return; }

      cancelAnimationFrame(rafRef.current);

      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;

      const ctx   = canvas.getContext('2d');
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary').trim() || '#B7410E';

      // Hex grid of target positions — overlapping dots give solid coverage
      const rowH = SPACING * 0.866;
      const rows = Math.ceil(H / rowH) + 2;
      const cols = Math.ceil(W / SPACING) + 2;
      const dots = [];

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          dots.push({
            gx:    c * SPACING + (r % 2) * (SPACING / 2),
            gy:    r * rowH,
            sx:    Math.random() * W,
            sy:    Math.random() * H,
            delay: Math.random() * 180, // stagger dissolve per dot
          });
        }
      }

      let startTime = null;
      let midFired  = false;

      function draw(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = color;

        if (elapsed < FILL_MS) {
          // Phase 1: dots fly from random positions to grid
          const t    = elapsed / FILL_MS;
          const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
          ctx.globalAlpha = Math.min(t * 2.5, 1);

          for (const d of dots) {
            ctx.beginPath();
            ctx.arc(
              d.sx + (d.gx - d.sx) * ease,
              d.sy + (d.gy - d.sy) * ease,
              DOT_R, 0, Math.PI * 2,
            );
            ctx.fill();
          }

        } else if (elapsed < FILL_MS + PEAK_MS) {
          // Peak: screen is solid — swap page content here
          if (!midFired) { midFired = true; onMid(); }
          ctx.globalAlpha = 1;
          for (const d of dots) {
            ctx.beginPath();
            ctx.arc(d.gx, d.gy, DOT_R, 0, Math.PI * 2);
            ctx.fill();
          }

        } else {
          // Phase 2: dots reverse — fly back to their random start positions and fade out
          const dt = elapsed - FILL_MS - PEAK_MS;
          let anyVisible = false;

          for (const d of dots) {
            const localT = Math.max(0, dt - d.delay) / DISSOLVE_MS;
            if (localT >= 1) continue;
            anyVisible = true;
            const ease = localT * localT * localT; // ease-in cubic — slow start, accelerates away
            ctx.globalAlpha = 1 - localT;
            ctx.beginPath();
            ctx.arc(
              d.gx + (d.sx - d.gx) * ease,
              d.gy + (d.sy - d.gy) * ease,
              DOT_R, 0, Math.PI * 2,
            );
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          if (!anyVisible) return; // done — no next frame
        }

        rafRef.current = requestAnimationFrame(draw);
      }

      rafRef.current = requestAnimationFrame(draw);
    },
  }));

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
    />
  );
});

export default PageTransition;
