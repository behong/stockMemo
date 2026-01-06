import type { MarketData } from "./types";

export async function fetchRealData(): Promise<MarketData> {
  throw new Error("REAL fetch mode is not implemented yet.");
}
