import { POLLUTANTS } from '../data/pollutants';

export function getPollLevel(key, val) {
  const p = POLLUTANTS[key];
  if (!p) return 0;
  for (let i = 0; i < p.ranges.length; i++) {
    if (val >= p.ranges[i][0] && val <= p.ranges[i][1]) return i;
  }
  return p.ranges.length - 1;
}

export function getSensorAQI(s) {
  return Math.max(...Object.keys(POLLUTANTS).map((k) => getPollLevel(k, s[k] || 0)));
}
