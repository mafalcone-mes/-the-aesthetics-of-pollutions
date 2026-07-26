import { useEffect, useRef, useState } from 'react';

// Fade+slide-in the first time an element scrolls into view. Mirrors the
// technique already used in the Aria Bene Comune dashboard's guide page,
// kept lightweight (no animation library) since this is a content-heavy site.
export default function Reveal({ children, className = '', as: Tag = 'div', delay = 0, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ ...(delay ? { transitionDelay: `${delay}ms` } : null), ...style }}
    >
      {children}
    </Tag>
  );
}
