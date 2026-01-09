"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPercent } from "@/lib/format";

import styles from "./chart-card.module.css";

type SparkPoint = {
  time: string;
  kospiChangePct: number;
  kosdaqChangePct: number;
};

type IndexSparkCardProps = {
  data: SparkPoint[];
  mode: "kospi" | "kosdaq";
  onChange: (mode: "kospi" | "kosdaq") => void;
  title: string;
  unitLabel: string;
  labelKospi: string;
  labelKosdaq: string;
  tooltipLabel: string;
  height?: number;
};

const INDEX_COLOR = "#111827";

function SparkTooltip({
  active,
  payload,
  label,
  tooltipLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  tooltipLabel: string;
}): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value === undefined) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>{tooltipLabel}</span>
        <span>{formatPercent(value)}</span>
      </div>
    </div>
  );
}

export default function IndexSparkCard({
  data,
  mode,
  onChange,
  title,
  unitLabel,
  labelKospi,
  labelKosdaq,
  tooltipLabel,
  height = 170,
}: IndexSparkCardProps) {
  const key = mode === "kospi" ? "kospiChangePct" : "kosdaqChangePct";
  const latestValue = useMemo(() => {
    if (!data.length) return null;
    const last = data[data.length - 1];
    return last[key as keyof SparkPoint] as number;
  }, [data, key]);

  return (
    <section className={styles.sparkCard}>
      <div className={styles.sparkHeader}>
        <div>
          <div className={styles.sparkTitle}>{title}</div>
          <div className={styles.cardSub}>{unitLabel}</div>
        </div>
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.pillToggle} ${
              mode === "kospi" ? styles.pillActive : styles.pillInactive
            }`}
            style={
              mode === "kospi"
                ? {
                    borderColor: INDEX_COLOR,
                    color: INDEX_COLOR,
                    backgroundColor: `${INDEX_COLOR}1A`,
                  }
                : undefined
            }
            onClick={() => onChange("kospi")}
          >
            {labelKospi}
          </button>
          <button
            type="button"
            className={`${styles.pillToggle} ${
              mode === "kosdaq" ? styles.pillActive : styles.pillInactive
            }`}
            style={
              mode === "kosdaq"
                ? {
                    borderColor: INDEX_COLOR,
                    color: INDEX_COLOR,
                    backgroundColor: `${INDEX_COLOR}1A`,
                  }
                : undefined
            }
            onClick={() => onChange("kosdaq")}
          >
            {labelKosdaq}
          </button>
        </div>
        <div className={styles.sparkValue}>
          {latestValue === null ? "--" : formatPercent(latestValue)}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip content={<SparkTooltip tooltipLabel={tooltipLabel} />} />
          <Line
            type="monotone"
            dataKey={key}
            stroke={INDEX_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
