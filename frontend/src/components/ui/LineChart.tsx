"use client";

import { useState } from 'react';

interface LineChartSeries {
  id: string;
  colorClassName: string;
  legendColorClassName?: string;
  strokeColor?: string;
  legendColor?: string;
  values: number[];
  displayValues?: number[];
  legendValueFormatter?: (value: number) => string;
}

interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
  valueFormatter?: (value: number) => string;
}

const clampToNumber = (value: number) => (Number.isFinite(value) ? value : 0);

function getSeriesPath(values: number[], minValue: number, maxValue: number) {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    const normalizedY = maxValue === minValue ? 50 : 100 - ((values[0] - minValue) / (maxValue - minValue)) * 100;
    return `M 50 ${normalizedY.toFixed(2)}`;
  }

  return values
    .map((value, index) => {
      const normalizedX = (index / (values.length - 1)) * 100;
      const normalizedY = maxValue === minValue ? 50 : 100 - ((value - minValue) / (maxValue - minValue)) * 100;
      return `${index === 0 ? 'M' : 'L'} ${normalizedX.toFixed(2)} ${normalizedY.toFixed(2)}`;
    })
    .join(' ');
}

function getPointY(value: number, minValue: number, maxValue: number) {
  return maxValue === minValue ? 50 : 100 - ((value - minValue) / (maxValue - minValue)) * 100;
}

export function LineChart({ labels, series, valueFormatter = (value) => value.toFixed(4) }: LineChartProps) {
  const flatValues = series.flatMap((entry) => entry.values).map(clampToNumber);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!labels.length || !series.length || !flatValues.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-text-secondary">
        Not enough data to render chart yet.
      </div>
    );
  }

  const minValue = Math.min(...flatValues);
  const maxValue = Math.max(...flatValues);
  const activeIndex = hoveredIndex === null ? labels.length - 1 : hoveredIndex;
  const activeLabel = labels[activeIndex] ?? labels[labels.length - 1];

  const activeValues = series.map((entry) => {
    const legendValues = entry.displayValues ?? entry.values;
    const plottedValue = clampToNumber(entry.values[activeIndex] ?? entry.values[entry.values.length - 1] ?? 0);
    const displayValue = clampToNumber(legendValues[activeIndex] ?? legendValues[legendValues.length - 1] ?? plottedValue);
    return {
      id: entry.id,
      legendColorClassName: entry.legendColorClassName ?? 'bg-text-muted',
      legendColor: entry.legendColor,
      displayValue,
      legendValueFormatter: entry.legendValueFormatter ?? valueFormatter,
      plottedY: getPointY(plottedValue, minValue, maxValue),
    };
  });

  const activeX = labels.length <= 1 ? 50 : (activeIndex / (labels.length - 1)) * 100;

  return (
    <div className="rounded-xl border border-border bg-[#111111] p-3">
      <div className="relative h-36 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) {
              return;
            }

            if (labels.length <= 1) {
              setHoveredIndex(0);
              return;
            }

            const x = event.clientX - rect.left;
            const ratio = Math.min(Math.max(x / rect.width, 0), 1);
            const nextIndex = Math.round(ratio * (labels.length - 1));
            setHoveredIndex(nextIndex);
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <line x1="0" y1="100" x2="100" y2="100" className="stroke-border" strokeWidth="1" />
          <line x1="0" y1="50" x2="100" y2="50" className="stroke-border/60" strokeWidth="0.8" />
          <line x1="0" y1="0" x2="100" y2="0" className="stroke-border/40" strokeWidth="0.8" />
          {series.map((entry) => (
            <path
              key={entry.id}
              d={getSeriesPath(entry.values.map(clampToNumber), minValue, maxValue)}
              className={entry.colorClassName}
              style={entry.strokeColor ? { stroke: entry.strokeColor } : undefined}
              strokeWidth="2"
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <line x1={activeX} y1="0" x2={activeX} y2="100" className="stroke-border/70" strokeDasharray="2 2" strokeWidth="1" />
          {activeValues.map((entry) => (
            <circle
              key={`${entry.id}-point`}
              cx={activeX}
              cy={entry.plottedY}
              r="1.8"
              className={entry.legendColorClassName}
              style={entry.legendColor ? { fill: entry.legendColor } : undefined}
            />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span>Selected: {activeLabel}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
        {activeValues.map((entry) => (
          <span key={`${entry.id}-legend`} className="inline-flex items-center gap-2">
            <span
              className={`h-0.5 w-4 rounded ${entry.legendColorClassName}`}
              style={entry.legendColor ? { backgroundColor: entry.legendColor } : undefined}
            />
            {entry.id} {entry.legendValueFormatter(entry.displayValue)}
          </span>
        ))}
      </div>
    </div>
  );
}