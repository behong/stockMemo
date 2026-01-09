"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./chart-card.module.css";

type ChartPoint = {
  time: string;
  individual: number;
  foreign: number;
  institutional: number;
  kospiIndex?: number;
  kosdaqIndex?: number;
};

type UnifiedMarketChartProps = {
  data: ChartPoint[];
  indexMode: "kospi" | "kosdaq";
  onIndexModeChange: (mode: "kospi" | "kosdaq") => void;
  title: string;
  subtitle: string;
  unitLabel: string;
  indexLabel: string;
  labels: {
    individual: string;
    foreign: string;
    institutional: string;
    kospi: string;
    kosdaq: string;
  };
  locale: "ko-KR" | "en-US";
  height?: number;
};

const COLORS = {
  individual: "#E24A3B",
  foreign: "#2563EB",
  institutional: "#10B981",
  index: "#111827",
};

function formatAxisValue(value: number, locale: "ko-KR" | "en-US"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10_000) {
    const compact = abs / 10_000;
    const fixed = Number.isInteger(compact) ? 0 : 1;
    const label = locale === "ko-KR" ? "\uB9CC" : "10k";
    return `${sign}${compact.toFixed(fixed)}${label}`;
  }
  return new Intl.NumberFormat(locale).format(value);
}

function formatIndexValue(value: number, withUnit = false): string {
  const text = value.toFixed(2);
  return withUnit ? `${text}%` : text;
}

function UnifiedTooltip({
  active,
  payload,
  label,
  labelMap,
  unitLabel,
  indexLabel,
  locale,
  indexKey,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  labelMap: Record<string, string>;
  unitLabel: string;
  indexLabel: string;
  locale: "ko-KR" | "en-US";
  indexKey: string;
}): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  const numberFormatter = new Intl.NumberFormat(locale);
  const flowRows = payload.filter(
    (entry) =>
      entry.value !== undefined && entry.dataKey && entry.dataKey !== indexKey,
  );
  const indexRow = payload.find((entry) => entry.dataKey === indexKey);

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      <div className={styles.tooltipUnit}>{unitLabel}</div>
      {flowRows.map((entry) => (
        <div className={styles.tooltipRow} key={entry.dataKey ?? label}>
          <span className={styles.tooltipLabel}>
            <span
              className={styles.dot}
              style={{ background: entry.color ?? "#111827" }}
            />
            {entry.dataKey ? labelMap[entry.dataKey] ?? entry.dataKey : ""}
          </span>
          <span>{numberFormatter.format(entry.value ?? 0)}</span>
        </div>
      ))}
      {indexRow?.value !== undefined && (
        <>
          <div className={styles.tooltipDivider} />
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>
              <span
                className={styles.dot}
                style={{ background: COLORS.index }}
              />
              {indexLabel}
            </span>
            <span>{formatIndexValue(indexRow.value)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function UnifiedMarketChart({
  data,
  indexMode,
  onIndexModeChange,
  title,
  subtitle,
  unitLabel,
  indexLabel,
  labels,
  locale,
  height,
}: UnifiedMarketChartProps) {
  const [visible, setVisible] = useState({
    individual: true,
    foreign: true,
    institutional: true,
  });
  const indexKey = indexMode === "kosdaq" ? "kosdaqIndex" : "kospiIndex";
  const indexLabelText =
    indexMode === "kosdaq"
      ? `${labels.kosdaq} ${indexLabel}`
      : `${labels.kospi} ${indexLabel}`;

  const labelMap = useMemo(
    () => ({
      individual: labels.individual,
      foreign: labels.foreign,
      institutional: labels.institutional,
    }),
    [labels.foreign, labels.individual, labels.institutional],
  );

  const legendItems = useMemo(
    () => [
      { key: "individual", label: labels.individual, color: COLORS.individual },
      { key: "foreign", label: labels.foreign, color: COLORS.foreign },
      {
        key: "institutional",
        label: labels.institutional,
        color: COLORS.institutional,
      },
    ],
    [labels.foreign, labels.individual, labels.institutional],
  );

  const toggleSeries = (key: keyof typeof visible) => {
    setVisible((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[key]) {
        return prev;
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const chartBodyStyle = height ? { height } : undefined;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>{title}</div>
          <div className={styles.cardSub}>{subtitle}</div>
        </div>
        <div className={styles.chartHeaderActions}>
          <div className={styles.legend}>
            {legendItems.map((item) => {
              const isActive = visible[item.key as keyof typeof visible];
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.pillToggle} ${
                    isActive ? styles.pillActive : styles.pillInactive
                  }`}
                  onClick={() =>
                    toggleSeries(item.key as keyof typeof visible)
                  }
                  style={
                    isActive
                      ? {
                          borderColor: item.color,
                          color: item.color,
                          backgroundColor: `${item.color}1A`,
                        }
                      : undefined
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.pillToggle} ${
                indexMode === "kospi" ? styles.pillActive : styles.pillInactive
              }`}
              onClick={() => onIndexModeChange("kospi")}
              style={
                indexMode === "kospi"
                  ? {
                      borderColor: COLORS.index,
                      color: COLORS.index,
                      backgroundColor: `${COLORS.index}1A`,
                    }
                  : undefined
              }
            >
              {labels.kospi}
            </button>
            <button
              type="button"
              className={`${styles.pillToggle} ${
                indexMode === "kosdaq" ? styles.pillActive : styles.pillInactive
              }`}
              onClick={() => onIndexModeChange("kosdaq")}
              style={
                indexMode === "kosdaq"
                  ? {
                      borderColor: COLORS.index,
                      color: COLORS.index,
                      backgroundColor: `${COLORS.index}1A`,
                    }
                  : undefined
              }
            >
              {labels.kosdaq}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.chartBody} style={chartBodyStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, left: 6, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(17,24,39,0.06)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: "rgba(17,24,39,0.55)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "rgba(17,24,39,0.55)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(value, locale)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: "rgba(17,24,39,0.55)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatIndexValue(value)}
            />
            <Tooltip
              content={
                <UnifiedTooltip
                  labelMap={labelMap}
                  unitLabel={unitLabel}
                  indexLabel={indexLabelText}
                  locale={locale}
                  indexKey={indexKey}
                />
              }
            />
            {visible.individual && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="individual"
                stroke={COLORS.individual}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            )}
            {visible.foreign && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="foreign"
                stroke={COLORS.foreign}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            )}
            {visible.institutional && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="institutional"
                stroke={COLORS.institutional}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={indexKey}
              stroke={COLORS.index}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
