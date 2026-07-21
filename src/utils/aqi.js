import { POLLUTANTS } from '../data/pollutants';

export function getPollLevel(key, val) {
  const p = POLLUTANTS[key];
  if (!p) return 0;
  // Use upper-bound comparison so values that fall in the tiny
  // decimal gaps between declared ranges don't jump to worst level.
  for (let i = 0; i < p.ranges.length; i++) {
    if (val <= p.ranges[i][1]) return i;
  }
  return p.ranges.length - 1;
}

// Same bucket as getPollLevel, but interpolated within the bucket's span instead of
// snapped to its integer index — a value sitting near the next threshold renders
// near the next gridline rather than flat against the current one.
export function getContinuousPollLevel(key, val) {
  const p = POLLUTANTS[key];
  if (!p) return 0;
  const anchors = [0, ...p.ranges.slice(0, -1).map((r) => r[1])];
  if (val <= anchors[0]) return 0;
  for (let i = 1; i < anchors.length; i++) {
    if (val <= anchors[i]) {
      const lo = anchors[i - 1], hi = anchors[i];
      return (i - 1) + (hi > lo ? (val - lo) / (hi - lo) : 1);
    }
  }
  return anchors.length - 1; // beyond the worst threshold — clamp at the top gridline
}

export function getSensorAQI(s) {
  return Math.max(...Object.keys(POLLUTANTS).map((k) => getPollLevel(k, s[k] || 0)));
}
