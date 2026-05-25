import { useEffect, useRef } from 'react';

const IMAGES = Array.from({ length: 57 }, (_, i) => i + 5); // Risorsa 5 … Risorsa 61

const H          = 140;
const BASE_SPEED = 0.15; // px/frame base forward motion
const SCROLL_MULT = 0.07; // scroll px → strip px amplification
const DECAY      = 0.92; // per-frame decay of scroll boost

export default function BwFilmstrip({ height = H, style }) {
  const trackRef = useRef(null);
  const stateRef = useRef({ pos: 0, boost: 0, lastY: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const s = stateRef.current;
    s.lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      s.boost += (y - s.lastY) * SCROLL_MULT;
      s.lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let raf;
    const tick = () => {
      const half = track.scrollWidth / 2;
      if (half > 0) {
        s.pos -= BASE_SPEED + s.boost;
        s.boost *= DECAY;
        if (Math.abs(s.boost) < 0.05) s.boost = 0;

        // seamless loop in both directions
        if (s.pos <= -half) s.pos += half;
        if (s.pos > 0)      s.pos -= half;

        track.style.transform = `translateX(${s.pos}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // feColorMatrix maps greyscale g: black(0)→#B7410E, white(1)→white
  // Row coefficients: R'=0.282g+0.718, G'=0.745g+0.255, B'=0.945g+0.055
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="bw-to-primary" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="
              0.282 0 0 0 0.718
              0.745 0 0 0 0.255
              0.945 0 0 0 0.055
              0     0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <div style={{ overflow: 'hidden', background: 'var(--white)', lineHeight: 0, ...style }}>
        <div ref={trackRef} style={{ display: 'flex', willChange: 'transform' }}>
          {[...IMAGES, ...IMAGES].map((num, i) => (
            <img
              key={i}
              src={`/assets/bw/Risorsa%20${num}.svg`}
              alt=""
              loading="lazy"
              style={{ height, width: 'auto', flexShrink: 0, display: 'block', filter: 'url(#bw-to-primary)' }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
