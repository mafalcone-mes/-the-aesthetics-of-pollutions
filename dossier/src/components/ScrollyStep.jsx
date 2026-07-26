import { useEffect, useRef, useState } from 'react';

// One step of a pinned-background scrollytelling sequence (FA-Louisiana style):
// a thin trigger band near the vertical center of the viewport decides which
// step is "active" (drives the background image behind it), separately from
// a wider fade-in-on-scroll for the text itself.
export default function ScrollyStep({ index, onActive, children, className = '', style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fade-in once, same generous threshold as the rest of the site.
    const fadeObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          fadeObs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    fadeObs.observe(el);

    // Active/"in focus" band — a thin strip near the viewport's vertical
    // center. Whichever step is crossing it right now owns the background.
    const activeObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onActive(index);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    activeObs.observe(el);

    return () => {
      fadeObs.disconnect();
      activeObs.disconnect();
    };
  }, [index, onActive]);

  return (
    <div ref={ref} className={`scrolly-step reveal ${visible ? 'is-visible' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}
