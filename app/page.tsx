"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatPercent, getSignedColor } from "@/lib/format";

import styles from "./page.module.css";

type RecordRow = {
  date: string;
  time: string;
  kospiIndividual: number;
  kospiIndividualQty: number;
  kospiForeign: number;
  kospiForeignQty: number;
  kospiInstitution: number;
  kospiInstitutionQty: number;
  kospiChangePct: number;
  kosdaqIndividual: number;
  kosdaqIndividualQty: number;
  kosdaqForeign: number;
  kosdaqForeignQty: number;
  kosdaqInstitution: number;
  kosdaqInstitutionQty: number;
  kosdaqChangePct: number;
  nasdaqChangePct: number;
  usdkrw: number;
};

type RecordsResponse = {
  date: string;
  records: RecordRow[];
};

type Language = "ko" | "en";

const COPY: Record<Language, Record<string, string>> = {
  ko: {
    title: "스톡 메모",
    subtitle:
      "코스피/코스닥 수급과 환율을 시간대별로 기록합니다. 날짜를 선택해 흐름을 한 번에 확인하세요.",
    date: "날짜",
    refresh: "새로고침",
    statusReady: "준비됨",
    statusLoading: "불러오는 중",
    statusError: "오류",
    statusDate: "날짜",
    statusRecords: "레코드",
    statusLatest: "최근",
    statusUpdated: "업데이트",
    summaryKospi: "코스피",
    summaryKosdaq: "코스닥",
    summaryNasdaq: "나스닥",
    summaryUsd: "원/달러",
    tableTime: "시간",
    tableKospi: "코스피",
    tableKosdaq: "코스닥",
    tableNasdaq: "나스닥",
    tableUsd: "원/달러",
    tableIndiv: "개인",
    tableForeign: "외인",
    tableInst: "기관",
    tableChange: "변동 %",
    tableRate: "환율",
    empty: "해당 날짜에 데이터가 없습니다.",
    languageLabel: "언어",
    langKo: "한국어",
    langEn: "영어",
  },
  en: {
    title: "Stock Memo",
    subtitle:
      "Hourly snapshots for KOSPI/KOSDAQ flows and FX. Pick a date to review the series in one view.",
    date: "Date",
    refresh: "Refresh",
    statusReady: "Ready",
    statusLoading: "Loading",
    statusError: "Error",
    statusDate: "Date",
    statusRecords: "Records",
    statusLatest: "Latest",
    statusUpdated: "Updated",
    summaryKospi: "KOSPI Change",
    summaryKosdaq: "KOSDAQ Change",
    summaryNasdaq: "NASDAQ Change",
    summaryUsd: "USD/KRW",
    tableTime: "Time",
    tableKospi: "KOSPI",
    tableKosdaq: "KOSDAQ",
    tableNasdaq: "NASDAQ",
    tableUsd: "USD/KRW",
    tableIndiv: "Indiv",
    tableForeign: "Foreign",
    tableInst: "Inst",
    tableChange: "Change %",
    tableRate: "Rate",
    empty: "No records for this date.",
    languageLabel: "Language",
    langKo: "Korean",
    langEn: "English",
  },
};

function signedClass(value: number, lang: Language): string {
  const tone = getSignedColor(value);
  if (lang === "ko") {
    if (tone === "red") return styles.pos;
    if (tone === "blue") return styles.neg;
    return styles.neutral;
  }
  if (tone === "red") return styles.neg;
  if (tone === "blue") return styles.pos;
  return styles.neutral;
}

const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;

function isMarketTime(value: string): boolean {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return true;
  }
  const minutes = hour * 60 + minute;
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
}

const KOREAN_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const KOREAN_UNITS = ["", "십", "백", "천"];

function numberToKoreanUnder10000(value: number): string {
  if (value === 0) return "영";
  const text = String(value).padStart(4, "0");
  let output = "";
  for (let i = 0; i < text.length; i += 1) {
    const digit = Number(text[i]);
    if (!digit) continue;
    const unitIndex = text.length - 1 - i;
    const digitText = digit === 1 && unitIndex > 0 ? "" : KOREAN_DIGITS[digit];
    output += `${digitText}${KOREAN_UNITS[unitIndex]}`;
  }
  return output;
}

export default function Home() {
  const [date, setDate] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lang, setLang] = useState<Language>("ko");

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

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (stored === "ko" || stored === "en") {
      setLang(stored);
      return;
    }
    const browser = navigator.language.toLowerCase();
    setLang(browser.startsWith("ko") ? "ko" : "en");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", lang);
    }
  }, [lang]);

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

  const text = COPY[lang];
  const displayRecords = useMemo(
    () => records.filter((record) => isMarketTime(record.time)),
    [records],
  );

  const statusLabel = useMemo(() => {
    if (status === "loading") return text.statusLoading;
    if (status === "error") return text.statusError;
    return text.statusReady;
  }, [status, text]);

  const statusClass = useMemo(() => {
    if (status === "loading") return styles.pillLoading;
    if (status === "error") return styles.pillError;
    return styles.pillReady;
  }, [status]);

  const lastRecord = displayRecords[displayRecords.length - 1];
  const latestTime = lastRecord?.time ?? "--";
  const recordCount = displayRecords.length;
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "en-US"),
    [lang],
  );
  const rateFormatter = useMemo(
    () =>
      new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [lang],
  );
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";
  const formatNumberLocal = (value: number) => numberFormatter.format(value);
  const formatRateLocal = (value: number) => rateFormatter.format(value);
  const amountUnitLabel = "10M";
  const formatAmountUnit = (value: number) =>
    rateFormatter.format(value / 10_000_000);
  const formatAmountKorean = (value: number) => {
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(Math.trunc(value));
    const jo = Math.floor(abs / 1_000_000);
    const eok = Math.floor((abs % 1_000_000) / 100);
    const rawLabel = `${sign}${formatNumberLocal(abs)}`;
    if (jo > 0) {
      const eokThousands = Math.floor(eok / 1000);
      if (eokThousands > 0) {
        return `${sign}${jo}조 ${eokThousands}천억 (${rawLabel})`;
      }
      return `${sign}${jo}조 (${rawLabel})`;
    }
    if (eok === 0) {
      return `0억 (${rawLabel})`;
    }
    return `${sign}${numberToKoreanUnder10000(eok)}억 (${rawLabel})`;
  };
  const formatQtyAmount = (qty: number, amount: number) => (
    <span className={styles.qtyAmount}>
      <span>{formatNumberLocal(qty)}</span>
      <span className={styles.amountValue}>
        {lang === "ko"
          ? formatAmountKorean(amount)
          : `${formatAmountUnit(amount)} ${amountUnitLabel}`}
      </span>
    </span>
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>{text.title}</h1>
            <p className={styles.subtitle}>{text.subtitle}</p>
          </div>
          <div className={styles.controls}>
            <label className={styles.dateControl}>
              {text.date}
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
              {text.refresh}
            </button>
          </div>
          <div className={styles.langTop}>
            <div
              className={styles.langToggle}
              role="group"
              aria-label={text.languageLabel}
            >
              <button
                type="button"
                className={`${styles.langButton} ${
                  lang === "ko" ? styles.langActive : ""
                }`}
                onClick={() => setLang("ko")}
              >
                {text.langKo}
              </button>
              <button
                type="button"
                className={`${styles.langButton} ${
                  lang === "en" ? styles.langActive : ""
                }`}
                onClick={() => setLang("en")}
              >
                {text.langEn}
              </button>
            </div>
          </div>
        </section>

        <section className={styles.statusRow}>
          <span className={`${styles.pill} ${statusClass}`}>{statusLabel}</span>
          <span className={styles.pill}>
            {text.statusDate}: {date || "--"}
          </span>
          <span className={styles.pill}>
            {text.statusRecords}: {recordCount}
          </span>
          <span className={styles.pill}>
            {text.statusLatest}: {latestTime}
          </span>
          <span className={styles.pill}>
            {text.statusUpdated}: {lastUpdatedLabel}
          </span>
          {status === "error" && (
            <span className={styles.errorText}>{errorMessage}</span>
          )}
        </section>

        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{text.summaryKospi}</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.kospiChangePct, lang) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.kospiChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{text.summaryKosdaq}</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.kosdaqChangePct, lang) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.kosdaqChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{text.summaryNasdaq}</div>
            <div
              className={`${styles.summaryValue} ${
                lastRecord ? signedClass(lastRecord.nasdaqChangePct, lang) : ""
              }`}
            >
              {lastRecord ? formatPercent(lastRecord.nasdaqChangePct) : "--"}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{text.summaryUsd}</div>
            <div className={styles.summaryValue}>
              {lastRecord ? formatRateLocal(lastRecord.usdkrw) : "--"}
            </div>
          </div>
        </section>

        <section className={styles.tableShell}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2}>{text.tableTime}</th>
                  <th colSpan={4} className={styles.groupKospi}>
                    {text.tableKospi}
                  </th>
                  <th colSpan={4} className={styles.groupKosdaq}>
                    {text.tableKosdaq}
                  </th>
                  <th className={styles.groupNasdaq}>{text.tableNasdaq}</th>
                  <th className={styles.groupUsd}>{text.tableUsd}</th>
                </tr>
                <tr>
                  <th className={styles.groupKospi}>{text.tableIndiv}</th>
                  <th className={styles.groupKospi}>{text.tableForeign}</th>
                  <th className={styles.groupKospi}>{text.tableInst}</th>
                  <th className={styles.groupKospi}>{text.tableChange}</th>
                  <th className={styles.groupKosdaq}>{text.tableIndiv}</th>
                  <th className={styles.groupKosdaq}>{text.tableForeign}</th>
                  <th className={styles.groupKosdaq}>{text.tableInst}</th>
                  <th className={styles.groupKosdaq}>{text.tableChange}</th>
                  <th className={styles.groupNasdaq}>{text.tableChange}</th>
                  <th className={styles.groupUsd}>{text.tableRate}</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={styles.emptyState}>
                      {text.empty}
                    </td>
                  </tr>
                ) : (
                  displayRecords.map((record, index) => (
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
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kospiIndividualQty,
                          record.kospiIndividual,
                        )}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiForeign,
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kospiForeignQty,
                          record.kospiForeign,
                        )}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiInstitution,
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kospiInstitutionQty,
                          record.kospiInstitution,
                        )}
                      </td>
                      <td
                        className={`${styles.colKospi} ${styles.num} ${signedClass(
                          record.kospiChangePct,
                          lang,
                        )}`}
                      >
                        {formatPercent(record.kospiChangePct)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqIndividual,
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kosdaqIndividualQty,
                          record.kosdaqIndividual,
                        )}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqForeign,
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kosdaqForeignQty,
                          record.kosdaqForeign,
                        )}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqInstitution,
                          lang,
                        )}`}
                      >
                        {formatQtyAmount(
                          record.kosdaqInstitutionQty,
                          record.kosdaqInstitution,
                        )}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.num} ${signedClass(
                          record.kosdaqChangePct,
                          lang,
                        )}`}
                      >
                        {formatPercent(record.kosdaqChangePct)}
                      </td>
                      <td
                        className={`${styles.colNasdaq} ${styles.num} ${signedClass(
                          record.nasdaqChangePct,
                          lang,
                        )}`}
                      >
                        {formatPercent(record.nasdaqChangePct)}
                      </td>
                      <td
                        className={`${styles.colUsd} ${styles.num} ${signedClass(
                          record.usdkrw,
                          lang,
                        )}`}
                      >
                        {formatRateLocal(record.usdkrw)}
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
