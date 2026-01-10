"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatPercent } from "@/lib/format";
import { MARKET_HOLIDAYS } from "@/lib/market-holidays";

import PartnershipFooter from "@/components/PartnershipFooter";
import UnifiedMarketChart from "@/components/UnifiedMarketChart";

import styles from "@/app/page.module.css";

export type RecordRow = {
  date: string;
  time: string;
  kospiIndividual: number;
  kospiIndividualQty: number;
  kospiForeign: number;
  kospiForeignQty: number;
  kospiInstitution: number;
  kospiInstitutionQty: number;
  kospiChangePct: number;
  kospiIndexValue: number;
  kospiAccVolume: number;
  kospiAccAmount: number;
  kosdaqIndividual: number;
  kosdaqIndividualQty: number;
  kosdaqForeign: number;
  kosdaqForeignQty: number;
  kosdaqInstitution: number;
  kosdaqInstitutionQty: number;
  kosdaqChangePct: number;
  kosdaqIndexValue: number;
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

type HomeClientProps = {
  initialDate: string;
  initialRecords: RecordRow[];
};

type LoadOptions = {
  silent?: boolean;
};

const COPY: Record<Language, Record<string, string>> = {
  ko: {
    title: "\uC2A4\uD1A1 \uBA54\uBAA8",
    subtitle:
      "\uCF54\uC2A4\uD53C/\uCF54\uC2A4\uB2E5 \uC218\uAE09\uACFC \uD658\uC728\uC744 \uC2DC\uAC04\uB300\uBCC4\uB85C \uAE30\uB85D\uD569\uB2C8\uB2E4.\n\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD574 \uD750\uB984\uC744 \uD55C \uBC88\uC5D0 \uD655\uC778\uD558\uC138\uC694.",
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
    chartUnifiedTitle: "\uB9E4\uB9E4 \uB3D9\uD5A5 & \uC9C0\uC218",
    chartUnifiedSubtitle:
      "\uC88C: \uC21C\uB9E4\uC218 \uAE08\uC561 (\uBC31\uB9CC\uC6D0) / \uC6B0: \uC9C0\uC218 \uD3EC\uC778\uD2B8",
    chartFlowUnit: "\uC21C\uB9E4\uC218 \uAE08\uC561 (\uBC31\uB9CC\uC6D0)",
    chartIndexLabel: "\uC9C0\uC218",
    holidayLabel: "\uD734\uC7A5 \uC548\uB0B4",
    holidayWeekend: "\uC8FC\uB9D0",
    holidayOfficial: "\uACF5\uD734\uC77C",
    holidayNoData: "\uB370\uC774\uD130 \uC5C6\uC74C",
    holidayEmpty: "\uD734\uC7A5\uC77C\uC785\uB2C8\uB2E4.",
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
    chartUnifiedTitle: "Flow Trend & Index",
    chartUnifiedSubtitle: "Left: Net buy (10M KRW) / Right: Index level",
    chartFlowUnit: "Net buy amount (10M KRW)",
    chartIndexLabel: "Index",
    holidayLabel: "Market notice",
    holidayWeekend: "Weekend",
    holidayOfficial: "Holiday",
    holidayNoData: "No data",
    holidayEmpty: "Market closed.",
  },
};

function signedClass(value: number, lang: Language): string {
  if (value === 0) return styles.neutral;
  if (lang === "ko") {
    return value < 0 ? styles.pos : styles.neg;
  }
  return value > 0 ? styles.pos : styles.neg;
}

const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const KST_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});
const ENV_HOLIDAYS = (process.env.NEXT_PUBLIC_MARKET_HOLIDAYS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const HOLIDAY_SET = new Set([...MARKET_HOLIDAYS, ...ENV_HOLIDAYS]);

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

function getKstWeekday(dateText: string): string {
  const safeDate = new Date(`${dateText}T00:00:00+09:00`);
  return KST_WEEKDAY_FORMATTER.format(safeDate);
}

function isWeekendDate(dateText: string): boolean {
  const weekday = getKstWeekday(dateText);
  return weekday === "Sat" || weekday === "Sun";
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

export default function HomeClient({
  initialDate,
  initialRecords,
}: HomeClientProps) {
  const [date, setDate] = useState(initialDate);
  const [records, setRecords] = useState<RecordRow[]>(initialRecords);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialRecords.length ? "idle" : "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialRecords.length ? new Date() : null,
  );
  const [lang, setLang] = useState<Language>("ko");
  const [indexMode, setIndexMode] = useState<"kospi" | "kosdaq">("kospi");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialLoadRef = useRef(false);

  const isRefreshingRef = useRef(false);

  const loadRecords = useCallback(
    async (requestedDate?: string, options?: LoadOptions) => {
      if (!options?.silent) {
        setStatus("loading");
      }
      setErrorMessage("");

      const endpoint = requestedDate
        ? `/api/records?date=${encodeURIComponent(requestedDate)}`
        : "/api/records";

      try {
        const response = await fetch(endpoint);

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
        if (!options?.silent) {
          setStatus("error");
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load records.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    if (initialRecords.length === 0) {
      loadRecords();
    }
  }, [initialRecords.length, loadRecords]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      loadRecords(date || undefined, { silent: true }).finally(() => {
        isRefreshingRef.current = false;
      });
    }, 600_000);

    return () => clearInterval(interval);
  }, [date, loadRecords]);

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
  const holidayStatus = useMemo(() => {
    if (!date) return null;
    if (isWeekendDate(date)) {
      return { type: "holiday", label: text.holidayWeekend };
    }
    if (HOLIDAY_SET.has(date)) {
      return { type: "holiday", label: text.holidayOfficial };
    }
    if (displayRecords.length === 0) {
      return { type: "nodata", label: text.holidayNoData };
    }
    return null;
  }, [date, displayRecords.length, text]);
  const chartData = useMemo(
    () =>
      displayRecords.map((record) => ({
        time: record.time,
        individual: record.kospiIndividual,
        foreign: record.kospiForeign,
        institutional: record.kospiInstitution,
        kospiIndex: record.kospiIndexValue,
        kosdaqIndex: record.kosdaqIndexValue,
      })),
    [displayRecords],
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
        return `${sign}${jo}\uC870 ${eokThousands}\uCC9C\uC5B5 (${rawLabel})`;
      }
      return `${sign}${jo}\uC870 (${rawLabel})`;
    }
    if (eok === 0) {
      return `0\uC5B5 (${rawLabel})`;
    }
    return `${sign}${numberToKoreanUnder10000(eok)}\uC5B5 (${rawLabel})`;
  };
  const formatQtyAmount = (qty: number, amount: number) => {
    const qtyLabel = lang === "ko" ? "\uC21C\uB9E4\uC218\uC218\uB7C9 : " : "Net Qty: ";
    const qtyClass =
      qty === 0
        ? styles.qtyNeutral
        : qty < 0
          ? styles.qtyNegative
          : styles.qtyPositive;
    const amountText =
      lang === "ko"
        ? formatAmountKorean(amount)
        : `${formatAmountUnit(amount)} ${amountUnitLabel}`;
    return (
      <span className={styles.qtyAmount}>
        <span className={styles.qtyLine}>
          <span className={styles.qtyLabel}>{qtyLabel}</span>
          <span className={`${styles.qtyValue} ${qtyClass}`}>
            {formatNumberLocal(qty)}
          </span>
        </span>
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
          {holidayStatus && (
            <span className={styles.pill}>
              {text.holidayLabel}: {holidayStatus.label}
            </span>
          )}
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

        <section className={styles.chartRow}>
          <UnifiedMarketChart
            data={chartData}
            indexMode={indexMode}
            onIndexModeChange={setIndexMode}
            title={text.chartUnifiedTitle}
            subtitle={text.chartUnifiedSubtitle}
            unitLabel={text.chartFlowUnit}
            indexLabel={text.chartIndexLabel}
            labels={{
              individual: text.tableIndiv,
              foreign: text.tableForeign,
              institutional: text.tableInst,
              kospi: text.tableKospi,
              kosdaq: text.tableKosdaq,
            }}
            locale={lang === "ko" ? "ko-KR" : "en-US"}
          />
        </section>

        <section className={styles.tableShell}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2} className={styles.colTime}>
                    {text.tableTime}
                  </th>
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
                  <th className={`${styles.groupKospi} ${styles.colFlow}`}>
                    {text.tableIndiv}
                  </th>
                  <th className={`${styles.groupKospi} ${styles.colFlow}`}>
                    {text.tableForeign}
                  </th>
                  <th className={`${styles.groupKospi} ${styles.colFlow}`}>
                    {text.tableInst}
                  </th>
                  <th className={`${styles.groupKospi} ${styles.colChange}`}>
                    {text.tableChange}
                  </th>
                  <th className={`${styles.groupKosdaq} ${styles.colFlow}`}>
                    {text.tableIndiv}
                  </th>
                  <th className={`${styles.groupKosdaq} ${styles.colFlow}`}>
                    {text.tableForeign}
                  </th>
                  <th className={`${styles.groupKosdaq} ${styles.colFlow}`}>
                    {text.tableInst}
                  </th>
                  <th className={`${styles.groupKosdaq} ${styles.colChange}`}>
                    {text.tableChange}
                  </th>
                  <th className={`${styles.groupNasdaq} ${styles.colChange}`}>
                    {text.tableChange}
                  </th>
                  <th className={styles.groupUsd}>{text.tableRate}</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={styles.emptyState}>
                      {holidayStatus?.type === "holiday"
                        ? text.holidayEmpty
                        : text.empty}
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
                        className={`${styles.colKospi} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKospi} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKospi} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKospi} ${styles.colChange} ${styles.num} ${signedClass(
                          record.kospiChangePct,
                          lang,
                        )}`}
                      >
                        {formatPercent(record.kospiChangePct)}
                      </td>
                      <td
                        className={`${styles.colKosdaq} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKosdaq} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKosdaq} ${styles.colFlow} ${styles.num} ${signedClass(
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
                        className={`${styles.colKosdaq} ${styles.colChange} ${styles.num} ${signedClass(
                          record.kosdaqChangePct,
                          lang,
                        )}`}
                      >
                        {formatPercent(record.kosdaqChangePct)}
                      </td>
                      <td
                        className={`${styles.colNasdaq} ${styles.colChange} ${styles.num} ${signedClass(
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

        <PartnershipFooter />
      </main>
    </div>
  );
}
