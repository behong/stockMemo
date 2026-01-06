import type { MarketData } from "./types";
import { fetchMockData } from "./mock";
import { fetchRealData } from "./real";

export async function fetchMarketData(): Promise<MarketData> {
  const mode = (process.env.FETCH_MODE || "mock").toLowerCase();

  if (mode === "real") {
    return fetchRealData();
  }

  return fetchMockData();
}
