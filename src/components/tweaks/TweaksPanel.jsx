import { useState, useEffect, useRef, useCallback } from 'react';
import './tweaks.css';

export function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clamp = useCallback(() => {
    const p = dragRef.current;
    if (!p) return;
    const maxR = Math.max(PAD, window.innerWidth - p.offsetWidth - PAD);
    const maxB = Math.max(PAD, window.innerHeight - p.offsetHeight - PAD);
    offsetRef.current = {
      x: Math.min(maxR, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxB, Math.max(PAD, offsetRef.current.y)),
    };
    p.style.right = offsetRef.current.x + 'px';
    p.style.bottom = offsetRef.current.y + 'px';
  }, []);

  useEffect(() => { if (open) clamp(); }, [open, clamp]);

  useEffect(() => {
    const h = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', h);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDrag = (e) => {
    const p = dragRef.current;
    if (!p) return;
    const r = p.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const sr = window.innerWidth - r.right, sb = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = { x: sr - (ev.clientX - sx), y: sb - (ev.clientY - sy) };
      clamp();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;

  return (
    <div ref={dragRef} className="twk-panel" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
      <div className="twk-hd" onMouseDown={onDrag}>
        <b>{title}</b>
        <button className="twk-x" onMouseDown={(e) => e.stopPropagation()} onClick={dismiss}>✕</button>
      </div>
      <div className="twk-body">{children}</div>
    </div>
  );
}

export function TweakSection({ title, children }) {
  return (
    <>
      <div className="twk-sect">{title}</div>
      {children}
    </>
  );
}

export function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

export function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'} onClick={() => onChange(!value)}>
        <i />
      </button>
    </div>
  );
}

export function TweakRadio({ label, value, options, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const n = opts.length;
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const valueRef = useRef(value);
  valueRef.current = value;

  const segAt = (cx) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((cx - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPD = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} className={dragging ? 'twk-seg dragging' : 'twk-seg'} onPointerDown={onPD}>
        <div className="twk-seg-thumb" style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" aria-checked={String(o.value === value)}>{o.label}</button>
        ))}
      </div>
    </TweakRow>
  );
}
