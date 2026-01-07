import type { MarketData, MarketSnapshot } from "./types";
import { kisGet } from "@/lib/kis";

type InvestorTrendOutput = {
  frgn_ntby_tr_pbmn: string;
  prsn_ntby_tr_pbmn: string;
  orgn_ntby_tr_pbmn: string;
};

const INVESTOR_TREND_PATH =
  "/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market";
const INVESTOR_TREND_TR_ID = "FHPTJ04030000";

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const text = String(value).replace(/,/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
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

export async function fetchRealData(): Promise<MarketData> {
  const [kospi, kosdaq] = await Promise.all([
    fetchInvestorTrend("KSP", "0001"),
    fetchInvestorTrend("KSQ", "1001"),
  ]);

  return {
    kospi,
    kosdaq,
    nasdaqChangePct: 0,
    usdkrw: 0,
  };
}
