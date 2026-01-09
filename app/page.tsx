"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  kospiAccVolume: number;
  kospiAccAmount: number;
  kosdaqIndividual: number;
  kosdaqIndividualQty: number;
  kosdaqForeign: number;
  kosdaqForeignQty: number;
  kosdaqInstitution: number;
  kosdaqInstitutionQty: number;
  kosdaqChangePct: number;
  kosdaqAccVolume: number;
  kosdaqAccAmount: number;
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
    title: "\uC2A4\uD1A1 \uBA54\uBAA8",
    subtitle:
      "\uCF54\uC2A4\uD53C/\uCF54\uC2A4\uB2E5 \uC218\uAE09\uACFC \uD658\uC728\uC744 \uC2DC\uAC04\uB300\uBCC4\uB85C \uAE30\uB85D\uD569\uB2C8\uB2E4. \uB0A0\uC9DC\uB97C \uC120\uD0DD\uD574 \uD750\uB984\uC744 \uD55C \uBC88\uC5D0 \uD655\uC778\uD558\uC138\uC694.",
    date: "\uB0A0\uC9DC",
    refresh: "\uC0C8\uB85C\uACE0\uCE68",
    statusReady: "\uC900\uBE44\uB428",
    statusLoading: "\uBD88\uB7EC\uC624\uB294 \uC911",
    statusError: "\uC624\uB958",
    statusDate: "\uB0A0\uC9DC",
    statusRecords: "\uB808\uCF54\uB4DC",
    statusLatest: "\uCD5C\uADFC",
    statusUpdated: "\uC5C5\uB370\uC774\uD2B8",
    summaryKospi: "\uCF54\uC2A4\uD53C",
    summaryKosdaq: "\uCF54\uC2A4\uB2E5",
    summaryNasdaq: "\uB098\uC2A4\uB2E5",
    summaryUsd: "\uC6D0/\uB2EC\uB7EC",
    summaryOverseas: "\uD574\uC678",
    summaryVolume: "\uAC70\uB798\uB7C9",
    summaryAmount: "\uAC70\uB798\uB300\uAE08",
    tableTime: "\uC2DC\uAC04",
    tableKospi: "\uCF54\uC2A4\uD53C",
    tableKosdaq: "\uCF54\uC2A4\uB2E5",
    tableNasdaq: "\uB098\uC2A4\uB2E5",
    tableUsd: "\uC6D0/\uB2EC\uB7EC",
    tableIndiv: "\uAC1C\uC778",
    tableForeign: "\uC678\uC778",
    tableInst: "\uAE30\uAD00",
    tableChange: "\uBCC0\uB3D9 %",
    tableRate: "\uD658\uC728",
    empty: "\uD574\uB2F9 \uB0A0\uC9DC\uC5D0 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
    languageLabel: "\uC5B8\uC5B4",
    langKo: "\uD55C\uAD6D\uC5B4",
    langEn: "\uC601\uC5B4",
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
    summaryNasdaq: "NASDAQ",
    summaryUsd: "USD/KRW",
    summaryOverseas: "Global",
    summaryVolume: "Volume",
    summaryAmount: "Turnover",
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

function timeToMinutes(value: string): number | null {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return hour * 60 + minute;
}

const KOREAN_DIGITS = ["", "\uC77C", "\uC774", "\uC0BC", "\uC0AC", "\uC624", "\uC721", "\uCE60", "\uD314", "\uAD6C"];
const KOREAN_UNITS = ["", "\uC2ED", "\uBC31", "\uCC9C"];

function numberToKoreanUnder10000(value: number): string {
  if (value === 0) return "\uC601";
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
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
    input.focus();
  }, []);

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
  const nowMinutes = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }
    const hour = Number(values.hour ?? "0");
    const minute = Number(values.minute ?? "0");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    return hour * 60 + minute;
  }, [lastUpdated, date]);
  const currentRecord = useMemo(() => {
    if (displayRecords.length === 0) return null;
    const now = nowMinutes;
    let chosen: RecordRow | null = null;
    let chosenMinutes = -1;
    for (const record of displayRecords) {
      const minutes = timeToMinutes(record.time);
      if (minutes === null) continue;
      if (now !== null && minutes > now) continue;
      if (minutes >= chosenMinutes) {
        chosen = record;
        chosenMinutes = minutes;
      }
    }
    return chosen ?? displayRecords[displayRecords.length - 1];
  }, [displayRecords, nowMinutes]);
  const summaryRecord = currentRecord ?? lastRecord;
  const latestTime = summaryRecord?.time ?? "--";
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
        return `${sign}${jo}\uC870 ${eokThousands}\uCC9C\uC5B5 ( ${rawLabel} )`;
      }
      return `${sign}${jo}\uC870 ( ${rawLabel} )`;
    }
    if (eok === 0) {
      return `0\uC5B5 ( ${rawLabel} )`;
    }
    return `${sign}${numberToKoreanUnder10000(eok)}\uC5B5 ( ${rawLabel} )`;
  };
  const formatQtyAmount = (qty: number, amount: number) => {
    const qtyLine =
      lang === "ko"
        ? `\uC21C\uB9E4\uC218\uC218\uB7C9( ${formatNumberLocal(qty)} )`
        : `Net Qty (${formatNumberLocal(qty)})`;
    const amountText =
      lang === "ko"
        ? formatAmountKorean(amount)
        : `${formatAmountUnit(amount)} ${amountUnitLabel}`;
    return (
      <span className={styles.qtyAmount}>
        <span className={styles.qtyLine}>{qtyLine}</span>
        <span className={styles.amountValue}>{amountText}</span>
      </span>
    );
  };

  
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>{text.title}</h1>
            <p className={styles.subtitle}>{text.subtitle}</p>
          </div>
          <div className={styles.controls}>
            <label className={styles.dateControl} onClick={openDatePicker}>
              {text.date}
              <input
                className={styles.dateInput}
                type="date"
                value={date}
                ref={dateInputRef}
                onChange={handleDateChange}
                onClick={openDatePicker}
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
            <div className={styles.summaryMeta}>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryVolume}</span>
                <span className={styles.summaryMetaValue}>
                  {lastRecord
                    ? formatNumberLocal(lastRecord.kospiAccVolume)
                    : "--"}
                </span>
              </div>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryAmount}</span>
                <span className={styles.summaryMetaValue}>
                  {lastRecord
                    ? lang === "ko"
                      ? formatAmountKorean(lastRecord.kospiAccAmount)
                      : `${formatAmountUnit(lastRecord.kospiAccAmount)} ${amountUnitLabel}`
                    : "--"}
                </span>
              </div>
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
            <div className={styles.summaryMeta}>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryVolume}</span>
                <span className={styles.summaryMetaValue}>
                  {lastRecord
                    ? formatNumberLocal(lastRecord.kosdaqAccVolume)
                    : "--"}
                </span>
              </div>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryAmount}</span>
                <span className={styles.summaryMetaValue}>
                  {lastRecord
                    ? lang === "ko"
                      ? formatAmountKorean(lastRecord.kosdaqAccAmount)
                      : `${formatAmountUnit(lastRecord.kosdaqAccAmount)} ${amountUnitLabel}`
                    : "--"}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{text.summaryOverseas}</div>
            <div className={styles.summaryMeta}>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryNasdaq}</span>
                <span
                  className={`${styles.summaryMetaValue} ${
                    lastRecord
                      ? signedClass(lastRecord.nasdaqChangePct, lang)
                      : ""
                  }`}
                >
                  {lastRecord ? formatPercent(lastRecord.nasdaqChangePct) : "--"}
                </span>
              </div>
              <div className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaLabel}>{text.summaryUsd}</span>
                <span className={styles.summaryMetaValue}>
                  {lastRecord ? formatRateLocal(lastRecord.usdkrw) : "--"}
                </span>
              </div>
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
