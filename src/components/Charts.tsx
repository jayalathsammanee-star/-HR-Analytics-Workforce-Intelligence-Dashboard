import React, { useState } from 'react';
import { DailyAttendanceCell } from '../types/hr';

export const PALETTE = {
  burgundy: '#5C162E',
  burgundyLight: '#7D2442',
  roseGold: '#B76E79',
  roseGoldSoft: '#D19A9F',
  champagne: '#C8A28E',
  sage: '#2D6A4F',
  amber: '#B45309',
  crimson: '#9E1B32',
  ink: '#2A1215',
  muted: '#6E5A58',
  border: '#E7DDD1',
  surface: '#FFFDF9',
  cream: '#FAF7F2',
};

export interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  statusTag?: { text: string; tone: 'good' | 'warn' | 'risk' | 'neutral' };
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtext, statusTag, onClick }) => {
  const toneClasses = {
    good: 'text-[#2D6A4F] bg-[#2D6A4F]/8',
    warn: 'text-[#9A4B07] bg-[#B45309]/10',
    risk: 'text-[#9E1B32] bg-[#9E1B32]/10',
    neutral: 'text-[#5C162E] bg-[#5C162E]/8',
  };

  const TagWrap = onClick ? 'button' : 'div';

  return (
    <TagWrap
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 transition-colors duration-150 ${
        onClick ? 'hover:border-[#B76E79] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#5C162E]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[#6E5A58] leading-snug">{label}</span>
        {statusTag && (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
              toneClasses[statusTag.tone]
            }`}
          >
            {statusTag.text}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[28px] font-semibold tracking-tight text-[#2A1215] tabular-nums font-display leading-none">
        {value}
      </div>
      <div className="mt-2 text-xs text-[#6E5A58] tabular-nums truncate">{subtext}</div>
    </TagWrap>
  );
};

// ---------------------------------------------------------------------------
// Interactive Bar Comparison Chart (Vertical Single or Grouped)
// ---------------------------------------------------------------------------
export interface BarSeriesItem {
  label: string;
  shortLabel?: string;
  values: Array<{ name: string; value: number; color: string }>;
  metaId?: string;
}

interface BarComparisonChartProps {
  items: BarSeriesItem[];
  height?: number;
  valueSuffix?: string;
  onBarClick?: (item: BarSeriesItem) => void;
}

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  items,
  height = 240,
  valueSuffix = '',
  onBarClick,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[#6E5A58]">
        No records match the active filter selection.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...items.flatMap((it) => it.values.map((v) => v.value))
  );
  const niceMax = Math.ceil(maxVal * 1.12);
  const width = 640;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / items.length;
  const seriesCount = items[0].values.length;
  const barW = Math.min(28, (groupW * 0.66) / seriesCount);
  const innerGap = seriesCount > 1 ? 4 : 0;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Bar comparison chart"
      >
        {ticks.map((tick, idx) => {
          const y = padTop + plotH - (tick / niceMax) * plotH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#EAE0D5"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#6E5A58] text-[10px] font-mono tabular-nums"
              >
                {tick}
                {valueSuffix}
              </text>
            </g>
          );
        })}

        {items.map((item, idx) => {
          const cx = padLeft + idx * groupW + groupW / 2;
          const totalBarsW = seriesCount * barW + (seriesCount - 1) * innerGap;
          const startX = cx - totalBarsW / 2;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onBarClick?.(item)}
              className={onBarClick ? 'cursor-pointer' : undefined}
            >
              {isHovered && (
                <rect
                  x={padLeft + idx * groupW + 2}
                  y={padTop}
                  width={Math.max(4, groupW - 4)}
                  height={plotH}
                  rx={4}
                  fill="#5C162E"
                  fillOpacity={0.04}
                />
              )}

              {item.values.map((v, sIdx) => {
                const bh = Math.max(2, (v.value / niceMax) * plotH);
                const bx = startX + sIdx * (barW + innerGap);
                const by = padTop + plotH - bh;
                return (
                  <rect
                    key={v.name}
                    x={bx}
                    y={by}
                    width={barW}
                    height={bh}
                    rx={3}
                    fill={v.color}
                    opacity={hoveredIdx === null || isHovered ? 1 : 0.72}
                  />
                );
              })}

              <text
                x={cx}
                y={padTop + plotH + 18}
                textAnchor="middle"
                className="fill-[#4E3837] text-[10.5px] font-medium"
              >
                {item.shortLabel ?? item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && items[hoveredIdx] && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#2A0A14] text-[#FAF7F2] text-xs flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">{items[hoveredIdx].label}</span>
          <div className="flex items-center gap-4 tabular-nums font-mono">
            {items[hoveredIdx].values.map((v) => (
              <span key={v.name} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-xs" style={{ backgroundColor: v.color }} />
                {v.name}: {v.value}
                {valueSuffix}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Horizontal Bar Chart (for Exit Reasons, Feature Importances, Rating Dist)
// ---------------------------------------------------------------------------
export interface HorizontalBarItem {
  label: string;
  value: number;
  displayValue: string;
  color: string;
  sublabel?: string;
}

export const HorizontalBarList: React.FC<{
  items: HorizontalBarItem[];
  maxOverride?: number;
}> = ({ items, maxOverride }) => {
  const maxVal = maxOverride ?? Math.max(1, ...items.map((i) => Math.abs(i.value)));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.min(100, Math.max(3, (Math.abs(item.value) / maxVal) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-[#2A1215] truncate">{item.label}</span>
              <span className="font-mono tabular-nums text-[#5C162E] shrink-0">
                {item.displayValue}
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#F3ECE2] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
            {item.sublabel && (
              <div className="text-[11px] text-[#6E5A58]">{item.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Interactive Multi-Line Trend Chart (with Optional Forecast Band & Dashed Line)
// ---------------------------------------------------------------------------
export interface LineSeriesDef {
  id: string;
  name: string;
  color: string;
  dashed?: boolean;
  values: Array<number | null>;
}

interface MultiLineTrendChartProps {
  labels: string[];
  series: LineSeriesDef[];
  confidenceBand?: {
    lower: number[];
    upper: number[];
    forecastStartIndex: number;
  };
  height?: number;
  ySuffix?: string;
  yMinOverride?: number;
}

export const MultiLineTrendChart: React.FC<MultiLineTrendChartProps> = ({
  labels,
  series,
  confidenceBand,
  height = 250,
  ySuffix = '',
  yMinOverride,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (labels.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[#6E5A58]">
        No timeline data available.
      </div>
    );
  }

  const allNums = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (confidenceBand) {
    allNums.push(...confidenceBand.lower, ...confidenceBand.upper);
  }

  const rawMin = yMinOverride !== undefined ? yMinOverride : Math.min(...allNums);
  const rawMax = Math.max(...allNums);
  const span = Math.max(1, rawMax - rawMin);
  const minY = yMinOverride !== undefined ? yMinOverride : Math.floor(rawMin - span * 0.12);
  const maxY = Math.ceil(rawMax + span * 0.12);

  const width = 680;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (i: number) =>
    labels.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (labels.length - 1)) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minY) / Math.max(1e-6, maxY - minY)) * plotH;

  const yTicks = [0, 0.33, 0.66, 1].map((t) => Math.round((minY + (maxY - minY) * t) * 10) / 10);

  // Confidence polygon path if forecast band provided
  let bandPath = '';
  if (confidenceBand && confidenceBand.forecastStartIndex < labels.length) {
    const start = Math.max(0, confidenceBand.forecastStartIndex - 1);
    const upperPts: string[] = [];
    const lowerPts: string[] = [];
    for (let i = start; i < labels.length; i++) {
      upperPts.push(`${getX(i)},${getY(confidenceBand.upper[i])}`);
      lowerPts.unshift(`${getX(i)},${getY(confidenceBand.lower[i])}`);
    }
    bandPath = `M ${upperPts.join(' L ')} L ${lowerPts.join(' L ')} Z`;
  }

  const xLabelStep = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Trend line chart"
      >
        {yTicks.map((t, idx) => {
          const y = getY(t);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#EAE0D5"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#6E5A58] text-[10px] font-mono tabular-nums"
              >
                {t}
                {ySuffix}
              </text>
            </g>
          );
        })}

        {confidenceBand && (
          <>
            <line
              x1={getX(confidenceBand.forecastStartIndex)}
              x2={getX(confidenceBand.forecastStartIndex)}
              y1={padTop}
              y2={padTop + plotH}
              stroke="#B76E79"
              strokeDasharray="4 4"
            />
            {bandPath && <path d={bandPath} fill="#B76E79" fillOpacity={0.14} />}
          </>
        )}

        {series.map((s) => {
          let pathD = '';
          s.values.forEach((v, idx) => {
            if (v === null) return;
            const cmd = pathD === '' || s.values[idx - 1] === null ? 'M' : 'L';
            pathD += `${cmd} ${getX(idx)} ${getY(v)} `;
          });

          return (
            <g key={s.id}>
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2.25}
                strokeDasharray={s.dashed ? '6 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.values.map((v, idx) =>
                v !== null ? (
                  <circle
                    key={idx}
                    cx={getX(idx)}
                    cy={getY(v)}
                    r={hoverIdx === idx ? 4.5 : 2.5}
                    fill={hoverIdx === idx ? '#FFFDF9' : s.color}
                    stroke={s.color}
                    strokeWidth={hoverIdx === idx ? 2 : 0}
                  />
                ) : null
              )}
            </g>
          );
        })}

        {labels.map((lbl, idx) => {
          const x = getX(idx);
          const sliceW = plotW / labels.length;
          return (
            <g key={lbl + idx} onMouseEnter={() => setHoverIdx(idx)}>
              <rect
                x={x - sliceW / 2}
                y={padTop}
                width={sliceW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
              />
              {(idx % xLabelStep === 0 || idx === labels.length - 1) && (
                <text
                  x={x}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  className="fill-[#6E5A58] text-[10px] font-mono"
                >
                  {lbl}
                </text>
              )}
            </g>
          );
        })}

        {hoverIdx !== null && (
          <line
            x1={getX(hoverIdx)}
            x2={getX(hoverIdx)}
            y1={padTop}
            y2={padTop + plotH}
            stroke="#5C162E"
            strokeOpacity={0.35}
          />
        )}
      </svg>

      {hoverIdx !== null ? (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#2A0A14] text-[#FAF7F2] text-xs flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium font-mono">{labels[hoverIdx]}</span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums font-mono">
            {series.map((s) =>
              s.values[hoverIdx] !== null ? (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-xs" style={{ backgroundColor: s.color }} />
                  {s.name}: {s.values[hoverIdx]}
                  {ySuffix}
                </span>
              ) : null
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#6E5A58]">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-0.5"
                style={{
                  backgroundColor: s.color,
                  borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
                }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Interactive Donut Breakdown Chart
// ---------------------------------------------------------------------------
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export const DonutBreakdownChart: React.FC<{
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}> = ({ slices, centerLabel, centerValue }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = Math.max(1, slices.reduce((s, sl) => s + sl.value, 0));

  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution donut chart">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3ECE2" strokeWidth={20} />
          {slices.map((slice, idx) => {
            const frac = slice.value / total;
            const dash = frac * circ;
            const offset = -cumulative * circ;
            cumulative += frac;
            const isHovered = activeIdx === idx;
            return (
              <circle
                key={slice.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? 24 : 20}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
                className="transition-all duration-150 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] text-[#6E5A58]">{activeIdx !== null ? slices[activeIdx].label : centerLabel}</span>
          <span className="text-xl font-semibold text-[#2A1215] tabular-nums font-display">
            {activeIdx !== null ? slices[activeIdx].value : centerValue}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2">
        {slices.map((slice, idx) => {
          const pct = Math.round((slice.value / total) * 1000) / 10;
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
              className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-default ${
                activeIdx === idx ? 'bg-[#F3ECE2]' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-[#2A1215] font-medium truncate">{slice.label}</span>
              </div>
              <span className="font-mono tabular-nums text-[#6E5A58] shrink-0">
                {slice.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Attendance Heatmap Matrix (Department x Workdays)
// ---------------------------------------------------------------------------
export const AttendanceHeatmap: React.FC<{
  cells: DailyAttendanceCell[];
}> = ({ cells }) => {
  const [hoveredCell, setHoveredCell] = useState<DailyAttendanceCell | null>(null);

  const departments = Array.from(new Set(cells.map((c) => c.departmentName)));
  const days = Array.from(new Set(cells.map((c) => c.dayLabel)));

  const getCellColor = (rate: number) => {
    if (rate >= 95) return '#5C162E';
    if (rate >= 92) return '#84314A';
    if (rate >= 89) return '#B76E79';
    if (rate >= 86) return '#D4A39B';
    return '#ECD4D0';
  };

  const getTextColor = (rate: number) => (rate >= 92 ? '#FFFDF9' : '#2A1215');

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="text-[11px] font-medium text-[#6E5A58] py-1">Department</div>
            {days.map((d) => (
              <div key={d} className="text-[10px] font-mono text-[#6E5A58] text-center py-1">
                {d.replace('Nov ', 'N')}
              </div>
            ))}

            {departments.map((deptName) => (
              <React.Fragment key={deptName}>
                <div className="text-xs font-medium text-[#2A1215] flex items-center pr-2 truncate">
                  {deptName}
                </div>
                {days.map((day) => {
                  const cell = cells.find(
                    (c) => c.departmentName === deptName && c.dayLabel === day
                  );
                  if (!cell) return <div key={day} className="h-8 rounded bg-[#F3ECE2]" />;
                  return (
                    <button
                      key={day}
                      type="button"
                      onMouseEnter={() => setHoveredCell(cell)}
                      onFocus={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className="h-8 rounded flex items-center justify-center text-[10px] font-mono tabular-nums transition-transform duration-100 hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#2A1215]"
                      style={{
                        backgroundColor: getCellColor(cell.attendanceRatePct),
                        color: getTextColor(cell.attendanceRatePct),
                      }}
                      aria-label={`${deptName} ${day}: ${cell.attendanceRatePct}% attendance`}
                    >
                      {Math.round(cell.attendanceRatePct)}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#6E5A58]">
        <div className="flex items-center gap-2">
          <span>Attendance % scale:</span>
          {[
            { label: '<86%', bg: '#ECD4D0' },
            { label: '86-88%', bg: '#D4A39B' },
            { label: '89-91%', bg: '#B76E79' },
            { label: '92-94%', bg: '#84314A' },
            { label: '95%+', bg: '#5C162E' },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1 font-mono text-[11px]">
              <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: item.bg }} />
              {item.label}
            </span>
          ))}
        </div>

        {hoveredCell && (
          <div className="font-mono tabular-nums text-[#2A1215] bg-[#F3ECE2] px-3 py-1 rounded">
            {hoveredCell.departmentName} · {hoveredCell.dayLabel}:{' '}
            <strong>{hoveredCell.attendanceRatePct}%</strong> ({hoveredCell.presentCount}/
            {hoveredCell.totalActive} present, {hoveredCell.lateCount} late)
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scatter Cluster Chart (Workforce K-Means Segments)
// ---------------------------------------------------------------------------
export interface ScatterPoint {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  clusterLabel: string;
}

export const ScatterClusterChart: React.FC<{
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
}> = ({ points, xLabel, yLabel }) => {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const width = 620;
  const height = 250;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.floor(Math.min(...xs, 75) - 1);
  const maxX = Math.ceil(Math.max(...xs, 100) + 1);
  const minY = Math.floor(Math.min(...ys, 55) - 2);
  const maxY = Math.ceil(Math.max(...ys, 115) + 2);

  const getX = (v: number) => padLeft + ((v - minX) / Math.max(1, maxX - minX)) * plotW;
  const getY = (v: number) => padTop + plotH - ((v - minY) / Math.max(1, maxY - minY)) * plotH;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label="Workforce clustering scatter plot">
        <line x1={padLeft} x2={width - padRight} y1={padTop + plotH} y2={padTop + plotH} stroke="#D4C3BA" />
        <line x1={padLeft} x2={padLeft} y1={padTop} y2={padTop + plotH} stroke="#D4C3BA" />

        {[minX, Math.round((minX + maxX) / 2), maxX].map((t) => (
          <text
            key={t}
            x={getX(t)}
            y={padTop + plotH + 16}
            textAnchor="middle"
            className="fill-[#6E5A58] text-[10px] font-mono tabular-nums"
          >
            {t}%
          </text>
        ))}

        {[minY, Math.round((minY + maxY) / 2), maxY].map((t) => (
          <text
            key={t}
            x={padLeft - 8}
            y={getY(t) + 3}
            textAnchor="end"
            className="fill-[#6E5A58] text-[10px] font-mono tabular-nums"
          >
            {t}%
          </text>
        ))}

        <text x={padLeft + plotW / 2} y={height - 4} textAnchor="middle" className="fill-[#6E5A58] text-[11px]">
          {xLabel}
        </text>
        <text
          x={14}
          y={padTop + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${padTop + plotH / 2})`}
          className="fill-[#6E5A58] text-[11px]"
        >
          {yLabel}
        </text>

        {points.map((pt) => (
          <circle
            key={pt.id}
            cx={getX(pt.x)}
            cy={getY(pt.y)}
            r={hovered?.id === pt.id ? 6 : 3.8}
            fill={pt.color}
            fillOpacity={hovered?.id === pt.id ? 1 : 0.78}
            stroke={hovered?.id === pt.id ? '#2A1215' : '#FFFDF9'}
            strokeWidth={hovered?.id === pt.id ? 1.5 : 0.6}
            onMouseEnter={() => setHovered(pt)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer transition-all duration-100"
          />
        ))}
      </svg>

      {hovered ? (
        <div className="px-3 py-1.5 rounded-lg bg-[#2A0A14] text-[#FAF7F2] text-xs flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>{hovered.label}</strong> · {hovered.sublabel}
          </span>
          <span className="font-mono tabular-nums">
            {hovered.clusterLabel} · Att {hovered.x}% · KPI {hovered.y}%
          </span>
        </div>
      ) : (
        <div className="text-xs text-[#6E5A58]">Hover any employee node to inspect cluster membership and operational metrics.</div>
      )}
    </div>
  );
};
