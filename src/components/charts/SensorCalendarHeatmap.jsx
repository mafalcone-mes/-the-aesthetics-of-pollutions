import {
  HeatmapChart, HeatmapCells, HeatmapSeparator, HeatmapXAxis, HeatmapYAxis, HeatmapTooltip, HeatmapLegend,
} from './heatmap/index.js';
import { buildHeatmapColorScale } from './heatmap/heatmap-colors.js';
import { LEVELS } from '../../data/levels';
import { getPollLevel } from '../../utils/aqi';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sundayOnOrBefore(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

// GitHub-contributions-style calendar: one column per week (Sun–Sat rows), cells colored
// by that day's worst-pollutant-wins AQI score. The component (bklit's heatmap-chart) only
// supports 5 color levels, so a rare level-5 "Estremamente Scarso" day is drawn in level 4's
// color but still reported correctly by name in the tooltip.
// data = Row[] (raw filtered rows), pollutants = string[] of selected pollutant keys.
export default function SensorCalendarHeatmap({ data, pollutants, lang }) {
  const L = lang === 'it';
  if (!data.length || !pollutants.length) return null;

  const dayScores = new Map(); // day (ms, local midnight) -> worst score 0-5
  for (const r of data) {
    const day = startOfDay(r.dateObj).getTime();
    const score = Math.max(...pollutants.map(p => getPollLevel(p, r[p] ?? 0)));
    dayScores.set(day, Math.max(dayScores.get(day) ?? 0, score));
  }

  const dayKeys = [...dayScores.keys()];
  if (!dayKeys.length) return null;

  const gridStart = sundayOnOrBefore(new Date(Math.min(...dayKeys)));
  const gridEnd = addDays(sundayOnOrBefore(new Date(Math.max(...dayKeys))), 6);
  const weekCount = Math.ceil((Math.round((gridEnd - gridStart) / MS_PER_DAY) + 1) / 7);

  const columns = Array.from({ length: weekCount }, (_, w) => {
    const weekStart = addDays(gridStart, w * 7);
    const bins = Array.from({ length: 7 }, (_, d) => {
      const date = addDays(weekStart, d);
      const score = dayScores.get(date.getTime());
      return { bin: d, count: score == null ? 0 : Math.min(score, 4), date };
    });
    return { bin: w, bins };
  });

  const levelColors = [0, 1, 2, 3, 4].map(i => LEVELS[i].color);
  const colorScale = buildHeatmapColorScale(levelColors);

  function formatDayLabel(_count, date) {
    const real = dayScores.get(startOfDay(date).getTime()) ?? 0;
    const lv = LEVELS[real];
    return L ? `${lv.it} — livello ${real + 1}` : `${lv.en} — level ${real + 1}`;
  }

  return (
    <div className="bklit-theme" style={{ height: 220 }}>
      <HeatmapChart data={columns} gap={3} layout="fill" levelColors={levelColors}>
        <HeatmapCells cornerRadius={999} inactiveOpacity={0.8} inactiveScale={0.94} />
        <HeatmapSeparator
          groupBy="quarter"
          showLabels
          labelClassName="text-[var(--gray2)]"
          spacing={12}
          startOffset={14}
          strokeOpacity={0.6}
        />
        <HeatmapXAxis />
        <HeatmapYAxis tickFilter="all" labelFormat="initial" />
        <HeatmapTooltip formatLabel={formatDayLabel} />
      </HeatmapChart>
      <HeatmapLegend
        align="center"
        cornerRadius={999}
        gap={3}
        inactiveOpacity={0.8}
        inactiveScale={0.94}
        colorScale={colorScale}
        lessLabel={L ? 'Meno' : 'Less'}
        moreLabel={L ? 'Più' : 'More'}
      />
    </div>
  );
}
