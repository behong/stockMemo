"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNumber, formatPercent, getSignedColor } from "@/lib/format";

import styles from "./page.module.css";

type RecordRow = {
  date: string;
  time: string;
  kospiIndividual: number;
  kospiForeign: number;
  kospiInstitution: number;
  kospiChangePct: number;
  kosdaqIndividual: number;
  kosdaqForeign: number;
  kosdaqInstitution: number;
  kosdaqChangePct: number;
  nasdaqChangePct: number;
  usdkrw: number;
};

type RecordsResponse = {
  date: string;
  records: RecordRow[];
};

const rateFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatRate(value: number): string {
  return rateFormatter.format(value);
}

function signedClass(value: number): string {
  const tone = getSignedColor(value);
  if (tone === "red") return styles.neg;
  if (tone === "blue") return styles.pos;
  return styles.neutral;
}

export default function Home() {
  const [date, setDate] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadRecords = useCallback(async (requestedDate?: string) => {
    setStatus("loading");
    setErrorMessage("");

    const endpoint = requestedDate
      ? `/api/records?date=${encodeURIComponent(requestedDate)}`
      : "/api/records";

    try {
      const response = await fetch(endpoint, { cache: "no-store" });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.error ?? `Request failed (${response.status}).`;
        throw new Error(message);
      }

      const payload = (await response.json()) as RecordsResponse;
      setDate(payload.date ?? requestedDate ?? "");
      setRecords(payload.records ?? []);
      setLastUpdated(new Date());
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load records.",
      );
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDate(value);
    if (value) {
      loadRecords(value);
    }
  };

  const handleRefresh = () => {
    loadRecords(date || undefined);
  };

  const statusLabel = useMemo(() => {
    if (status === "loading") return "Loading";
    if (status === "error") return "Error";
    return "Ready";
  }, [status]);

  const statusClass = useMemo(() => {
    if (status === "loading") return styles.pillLoading;
    if (status === "error") return styles.pillError;
    return styles.pillReady;
  }, [status]);

  const lastRecord = records[records.length - 1];
  const latestTime = lastRecord?.time ?? "--";
  const recordCount = records.length;
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>Stock Memo</h1>
            <p className={styles.subtitle}>
              Hourly market snapshots with KOSPI/KOSDAQ flow and FX tracking.
              Pick a date to review time-series data in one view.
            </p>
          </div>
          <div className={styles.controls}>
            <label className={styles.dateControl}>
              Date
              <input
                className={styles.dateInput}
                type="date"
                value={date}
                onChange={handleDateChange}
              />
            </label>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={handleRefresh}
              disabled={status === "loading"}
            >
              Refresh
            </button>
          </div>
        </section>

        <section className={styles.statusRow}>
          <span className={`${styles.pill} ${statusClass}`}>{statusLabel}</span>
          <span className={styles.pill}>Date: {date || "--"}</span>
          <span className={styles.pill}>Records: {recordCount}</span>
          <span className={styles.pill}>Latest: {latestTime}</span>
          <span className={styles.pill}>Updated: {lastUpdatedLabel}</span>
          {status === "error" && (
            <span className={styles.errorText}>{errorMessage}</span>
          )}
        </section>

        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>KOSPI Change</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.kospiChangePct) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.kospiChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>KOSDAQ Change</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.kosdaqChangePct) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.kosdaqChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>NASDAQ Change</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.nasdaqChangePct) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.nasdaqChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>USD/KRW</div>
            <div className={styles.summaryValue}>
              {lastRecord ? formatRate(lastRecord.usdkrw) : "--"}
            </div>
          </div>
        </section>

        <section className={styles.tableShell}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2}>Time</th>
                  <th colSpan={4} className={styles.groupKospi}>
                    Kospi
                  </th>
                  <th colSpan={4} className={styles.groupKosdaq}>
                    Kosdaq
                  </th>
                  <th className={styles.groupNasdaq}>Nasdaq</th>
                  <th className={styles.groupUsd}>USD/KRW</th>
                </tr>
                <tr>
                  <th className={styles.groupKospi}>Indiv</th>
                  <th className={styles.groupKospi}>Foreign</th>
                  <th className={styles.groupKospi}>Inst</th>
                  <th className={styles.groupKospi}>Change %</th>
                  <th className={styles.groupKosdaq}>Indiv</th>
                  <th className={styles.groupKosdaq}>Foreign</th>
                  <th className={styles.groupKosdaq}>Inst</th>
                  <th className={styles.groupKosdaq}>Change %</th>
                  <th className={styles.groupNasdaq}>Change %</th>
                  <th className={styles.groupUsd}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={styles.emptyState}>
                      No records for this date.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr
                      key={`${record.date}-${record.time}`}
                      className={styles.row}
                      style={{ "--row-index": index } as CSSProperties}
                    >
                      <td className={`${styles.colTime} ${styles.num}`}>
                        {record.time}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiIndividual,
                        )}`}
                      >
                        {formatNumber(record.kospiIndividual)}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiForeign,
                        )}`}
                      >
                        {formatNumber(record.kospiForeign)}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiInstitution,
                        )}`}
                      >
                        {formatNumber(record.kospiInstitution)}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiChangePct,
                        )}`}
                      >
                        {formatPercent(record.kospiChangePct)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqIndividual,
                        )}`}
                      >
                        {formatNumber(record.kosdaqIndividual)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqForeign,
                        )}`}
                      >
                        {formatNumber(record.kosdaqForeign)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqInstitution,
                        )}`}
                      >
                        {formatNumber(record.kosdaqInstitution)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqChangePct,
                        )}`}
                      >
                        {formatPercent(record.kosdaqChangePct)}
                      </td>
                      <td
                        className={`${styles.colNasdaq} ${styles.num} ${signedClass(
                          record.nasdaqChangePct,
                        )}`}
                      >
                        {formatPercent(record.nasdaqChangePct)}
                      </td>
                      <td
                        className={`${styles.colUsd} ${styles.num} ${signedClass(
                          record.usdkrw,
                        )}`}
                      >
                        {formatRate(record.usdkrw)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
