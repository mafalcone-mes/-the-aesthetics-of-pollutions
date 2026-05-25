import { useEffect, useRef, useState } from 'react';

const SIZE = 22;

export default function CustomCursor() {
  const dotRef = useRef(null);
  const [mode, setMode] = useState('default'); // 'default' | 'hover' | 'click'

  useEffect(() => {
    const dot = dotRef.current;
    let current = 'default';

    const getMode = (el) => {
      let node = el;
      while (node && node.nodeType === 1 && node !== document.body) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'a' || tag === 'button' || node.getAttribute('role') === 'button')
          return 'click';
        if (tag === 'input' || tag === 'textarea' || tag === 'select')
          return 'hover';
        // non-semantic clickable elements marked explicitly
        const dc = node.dataset.cursor;
        if (dc === 'click') return 'click';
        if (dc === 'hover') return 'hover';
        node = node.parentElement;
      }
      return 'default';
    };

    const move = (e) => {
      dot.style.transform = `translate(${e.clientX - SIZE / 2}px, ${e.clientY - SIZE / 2}px)`;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const next = el ? getMode(el) : 'default';
      if (next !== current) { current = next; setMode(next); }
    };

    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  const isWhite = mode === 'hover' || mode === 'click';

  return (
    <div ref={dotRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: SIZE, height: SIZE, borderRadius: '50%',
      background: isWhite ? 'var(--white)' : 'var(--primary)',
      pointerEvents: 'none', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.12s',
      willChange: 'transform',
    }}>
      {mode === 'click' && (
        <span style={{
          color: 'var(--primary)', fontSize: 14, fontWeight: 900,
          lineHeight: 1, userSelect: 'none', marginTop: '-1px',
        }}>+</span>
      )}
    </div>
  );
}
