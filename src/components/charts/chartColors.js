// Shared series-identity colors for the Archive charts. Previously each chart
// file defined its own near-identical rainbow (bright blue, bright green,
// maroon...) with no relationship to the app's actual palette or to each
// other — colliding with "the six-step status scale is the only saturated
// color" and drifting out of sync between files. Pollutants are grouped by
// their real category (particulates/gaseous/systemic, per data/pollutants.js)
// so the hue families carry meaning; sensors get a separate palette built
// from the same warm-ink/brick/slate vocabulary so the two never read as one
// arbitrary rainbow system. None of these collide with the six AQI status hues.
export const POLL_COLORS = {
  pm25: '#B7410E', pm10: '#D97A4D',
  no2: '#3E5C63', o3: '#6B8A93', so2: '#26404A',
  co: '#5C4A3A', nh3: '#8A7660', c6h6: '#1A1A1A',
};

export const SENSOR_COLORS = ['#1A1A1A', '#B7410E', '#3E5C63', '#8A7660', '#6B8A93', '#D97A4D', '#5C4A3A', '#9B9790'];
