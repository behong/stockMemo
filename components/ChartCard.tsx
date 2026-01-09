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

type FlowPoint = {
  time: string;
  individual: number;
  foreign: number;
  institutional: number;
};

type ChartCardProps = {
  data: FlowPoint[];
  title: string;
  unitLabel: string;
  labels: {
    individual: string;
    foreign: string;
    institutional: string;
  };
  locale: "ko-KR" | "en-US";
  height?: number;
};

const COLORS = {
  individual: "#E24A3B",
  foreign: "#2B6DE0",
  institutional: "#6B7280",
};

function ChartTooltip({
  active,
  payload,
  label,
  labelMap,
  locale,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  labelMap: Record<string, string>;
  locale: "ko-KR" | "en-US";
  unitLabel: string;
}): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload.filter((entry) => entry.value !== undefined);
  if (rows.length === 0) return null;
  const numberFormatter = new Intl.NumberFormat(locale);

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      <div className={styles.tooltipUnit}>{unitLabel}</div>
      {rows.map((entry) => (
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
    </div>
  );
}

function formatAxisValue(value: number, locale: "ko-KR" | "en-US"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10_000) {
    const compact = abs / 10_000;
    const fixed = Number.isInteger(compact) ? 0 : 1;
    const label = locale === "ko-KR" ? "만" : "10k";
    return `${sign}${compact.toFixed(fixed)}${label}`;
  }
  return new Intl.NumberFormat(locale).format(value);
}

export default function ChartCard({
  data,
  title,
  unitLabel,
  labels,
  locale,
  height = 260,
}: ChartCardProps) {
  const [visible, setVisible] = useState({
    individual: true,
    foreign: true,
    institutional: true,
  });

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

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>{title}</div>
          <div className={styles.cardSub}>{unitLabel}</div>
        </div>
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
                  setVisible((prev) => ({
                    ...prev,
                    [item.key]: Object.values(prev).filter(Boolean).length > 1
                      ? !prev[item.key as keyof typeof prev]
                      : true,
                  }))
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
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 6, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="rgba(17,24,39,0.06)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12, fill: "rgba(17,24,39,0.55)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "rgba(17,24,39,0.55)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatAxisValue(value, locale)}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelMap={labelMap}
                locale={locale}
                unitLabel={unitLabel}
              />
            }
          />
          {visible.individual && (
            <Line
              type="monotone"
              dataKey="individual"
              stroke={COLORS.individual}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {visible.foreign && (
            <Line
              type="monotone"
              dataKey="foreign"
              stroke={COLORS.foreign}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {visible.institutional && (
            <Line
              type="monotone"
              dataKey="institutional"
              stroke={COLORS.institutional}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
