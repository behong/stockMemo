import type { MarketData, MarketSnapshot } from "./types";
import { kisGet } from "@/lib/kis";
import { getKstDate } from "@/lib/time";

type InvestorTrendOutput = {
  frgn_ntby_tr_pbmn: string;
  prsn_ntby_tr_pbmn: string;
  orgn_ntby_tr_pbmn: string;
};

type OverseasDailyOutput = {
  ovrs_nmix_prpr?: string;
  ovrs_nmix_prdy_clpr?: string;
  prdy_ctrt?: string;
};

type IndexTimeOutput = {
  bstp_nmix_prdy_ctrt?: string;
};

const INVESTOR_TREND_PATH =
  "/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market";
const INVESTOR_TREND_TR_ID = "FHPTJ04030000";
const INDEX_TIME_PATH =
  "/uapi/domestic-stock/v1/quotations/inquire-index-timeprice";
const INDEX_TIME_TR_ID = "FHPUP02110200";
const OVERSEAS_DAILY_PATH =
  "/uapi/overseas-price/v1/quotations/inquire-daily-chartprice";
const OVERSEAS_DAILY_TR_ID = "FHKST03030100";
const EXCHANGE_RATE_URL =
  process.env.EXCHANGE_RATE_URL || "https://open.er-api.com/v6/latest/USD";
const FX_PROVIDER = (process.env.FX_PROVIDER || "er-api").toLowerCase();
const FX_INTERVAL = process.env.FX_INTERVAL || "5min";
const NASDAQ_PROVIDER = (process.env.NASDAQ_PROVIDER || "kis-daily").toLowerCase();
const NASDAQ_INTRADAY_SYMBOL = process.env.NASDAQ_INTRADAY_SYMBOL || "QQQ";
const NASDAQ_INTERVAL = process.env.NASDAQ_INTERVAL || "5min";
const INDEX_START_TIME = process.env.KIS_INDEX_START_TIME || "090000";
const INDEX_MARKET_CODE =
  (process.env.KIS_INDEX_MARKET_CODE || "U").toUpperCase();

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const text = String(value).replace(/,/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toKisDate(value: string): string {
  return value.replace(/-/g, "");
}

function getDateRange(daysBack: number) {
  const end = getKstDate();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const start = getKstDate(startDate);
  return {
    start: toKisDate(start),
    end: toKisDate(end),
  };
}

async function fetchInvestorTrend(
  marketCode: "KSP" | "KSQ",
  sectorCode: string,
): Promise<MarketSnapshot> {
  const output = await kisGet<InvestorTrendOutput | InvestorTrendOutput[]>(
    INVESTOR_TREND_PATH,
    INVESTOR_TREND_TR_ID,
    {
      fid_input_iscd: marketCode,
      fid_input_iscd_2: sectorCode,
    },
  );

  const latest = Array.isArray(output)
    ? output[output.length - 1]
    : output;
  if (!latest) {
    throw new Error("KIS response is empty.");
  }

  const individual = parseNumber(latest.prsn_ntby_tr_pbmn);
  const foreign = parseNumber(latest.frgn_ntby_tr_pbmn);
  const institution = parseNumber(latest.orgn_ntby_tr_pbmn);

  return {
    individual,
    foreign,
    institution,
    changePct: 0,
  };
}

async function fetchIndexChangePct(sectorCode: string): Promise<number> {
  const output = await kisGet<IndexTimeOutput | IndexTimeOutput[]>(
    INDEX_TIME_PATH,
    INDEX_TIME_TR_ID,
    {
      fid_cond_mrkt_div_code: INDEX_MARKET_CODE,
      fid_input_iscd: sectorCode,
      fid_input_hour_1: INDEX_START_TIME,
    },
  );

  const latest = Array.isArray(output)
    ? output[output.length - 1]
    : output;
  if (!latest) {
    throw new Error("Index time response is empty.");
  }

  return parseNumber(latest.bstp_nmix_prdy_ctrt);
}

async function fetchOverseasDaily(
  marketCode: "N" | "X",
  symbol: string,
) {
  const { start, end } = getDateRange(7);
  const output = await kisGet<OverseasDailyOutput>(
    OVERSEAS_DAILY_PATH,
    OVERSEAS_DAILY_TR_ID,
    {
      FID_COND_MRKT_DIV_CODE: marketCode,
      FID_INPUT_ISCD: symbol,
      FID_INPUT_DATE_1: start,
      FID_INPUT_DATE_2: end,
      FID_PERIOD_DIV_CODE: "D",
    },
  );

  const current = parseNumber(output.ovrs_nmix_prpr);
  const prevClose = parseNumber(output.ovrs_nmix_prdy_clpr);
  const fallbackPct = parseNumber(output.prdy_ctrt);
  const changePct =
    prevClose !== 0 ? ((current - prevClose) / prevClose) * 100 : fallbackPct;

  return {
    current,
    prevClose,
    changePct,
  };
}

type ExchangeRateResponse = {
  result?: string;
  success?: boolean;
  rates?: {
    KRW?: number;
  };
};

type AlphaVantageResponse = {
  Note?: string;
  "Error Message"?: string;
  [key: string]: unknown;
};

async function fetchUsdKrwDaily(): Promise<number> {
  const response = await fetch(EXCHANGE_RATE_URL, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exchange rate request failed (${response.status}). ${text}`);
  }

  const payload = (await response.json()) as ExchangeRateResponse;
  if (payload.result && payload.result !== "success") {
    throw new Error(`Exchange rate request failed: ${payload.result}`);
  }
  const rate = payload.rates?.KRW;
  if (!rate || !Number.isFinite(rate)) {
    throw new Error("Exchange rate response missing KRW rate.");
  }

  return rate;
}

async function fetchUsdKrwAlphaVantage(): Promise<number> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHAVANTAGE_API_KEY is not set.");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "FX_INTRADAY");
  url.searchParams.set("from_symbol", "USD");
  url.searchParams.set("to_symbol", "KRW");
  url.searchParams.set("interval", FX_INTERVAL);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FX intraday request failed (${response.status}). ${text}`);
  }

  const payload = (await response.json()) as AlphaVantageResponse;
  if (payload["Error Message"]) {
    throw new Error(String(payload["Error Message"]));
  }
  if (payload.Note) {
    throw new Error(String(payload.Note));
  }

  const seriesKey = Object.keys(payload).find((key) =>
    key.startsWith("Time Series FX"),
  );
  if (!seriesKey) {
    throw new Error("FX intraday response missing time series.");
  }

  const series = payload[seriesKey];
  if (!series || typeof series !== "object") {
    throw new Error("FX intraday time series is invalid.");
  }

  const entries = Object.keys(series as Record<string, unknown>).sort();
  const latestKey = entries[entries.length - 1];
  const latest = latestKey
    ? (series as Record<string, Record<string, string>>)[latestKey]
    : null;
  const close = parseNumber(latest?.["4. close"]);
  if (!close) {
    throw new Error("FX intraday response missing close value.");
  }

  return close;
}

async function fetchUsdKrw(): Promise<number> {
  if (FX_PROVIDER === "alphavantage" || FX_PROVIDER === "alpha-vantage") {
    return fetchUsdKrwAlphaVantage();
  }
  return fetchUsdKrwDaily();
}

async function fetchNasdaqIntraday(): Promise<number> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHAVANTAGE_API_KEY is not set.");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol", NASDAQ_INTRADAY_SYMBOL);
  url.searchParams.set("interval", NASDAQ_INTERVAL);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NASDAQ intraday request failed (${response.status}). ${text}`);
  }

  const payload = (await response.json()) as AlphaVantageResponse;
  if (payload["Error Message"]) {
    throw new Error(String(payload["Error Message"]));
  }
  if (payload.Note) {
    throw new Error(String(payload.Note));
  }

  const seriesKey = Object.keys(payload).find((key) =>
    key.startsWith("Time Series"),
  );
  if (!seriesKey) {
    throw new Error("NASDAQ intraday response missing time series.");
  }

  const series = payload[seriesKey];
  if (!series || typeof series !== "object") {
    throw new Error("NASDAQ intraday time series is invalid.");
  }

  const timestamps = Object.keys(series as Record<string, unknown>).sort();
  const latestTimestamp = timestamps[timestamps.length - 1];
  if (!latestTimestamp) {
    throw new Error("NASDAQ intraday time series is empty.");
  }
  const latestDate = latestTimestamp.slice(0, 10);
  const dayTimestamps = timestamps.filter((ts) => ts.startsWith(latestDate));
  const firstTimestamp = dayTimestamps[0];
  if (!firstTimestamp) {
    throw new Error("NASDAQ intraday data missing latest day.");
  }

  const daySeries = series as Record<string, Record<string, string>>;
  const firstBar = daySeries[firstTimestamp];
  const latestBar = daySeries[latestTimestamp];
  const open = parseNumber(firstBar?.["1. open"]);
  const close = parseNumber(latestBar?.["4. close"]);
  if (!open) {
    throw new Error("NASDAQ intraday open price missing.");
  }

  return ((close - open) / open) * 100;
}

async function fetchNasdaqChangePct(): Promise<number> {
  if (NASDAQ_PROVIDER === "alphavantage" || NASDAQ_PROVIDER === "alpha-vantage") {
    return fetchNasdaqIntraday();
  }

  const nasdaqCode = process.env.KIS_NASDAQ_CODE;
  if (!nasdaqCode) {
    throw new Error("KIS_NASDAQ_CODE is not set.");
  }
  const nasdaq = await fetchOverseasDaily("N", nasdaqCode);
  return nasdaq.changePct;
}

export async function fetchRealData(): Promise<MarketData> {
  const [kospi, kosdaq, kospiChangePct, kosdaqChangePct] = await Promise.all([
    fetchInvestorTrend("KSP", "0001"),
    fetchInvestorTrend("KSQ", "1001"),
    fetchIndexChangePct("0001"),
    fetchIndexChangePct("1001"),
  ]);

  const [nasdaqChangePct, usdkrw] = await Promise.all([
    fetchNasdaqChangePct(),
    fetchUsdKrw(),
  ]);

  return {
    kospi: {
      ...kospi,
      changePct: kospiChangePct,
    },
    kosdaq: {
      ...kosdaq,
      changePct: kosdaqChangePct,
    },
    nasdaqChangePct,
    usdkrw,
  };
}
