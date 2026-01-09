import type { MarketData, MarketSnapshot } from "./types";

function randomBetween(min: number, max: number, digits = 0): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(digits));
}

function randomSigned(maxAbs: number, digits = 2): number {
  return Number((Math.random() * maxAbs * 2 - maxAbs).toFixed(digits));
}

function mockSnapshot(): MarketSnapshot {
  return {
    individual: randomBetween(-500000000, 500000000),
    individualQty: randomBetween(-200000, 200000),
    foreign: randomBetween(-400000000, 400000000),
    foreignQty: randomBetween(-150000, 150000),
    institution: randomBetween(-300000000, 300000000),
    institutionQty: randomBetween(-120000, 120000),
    changePct: randomSigned(3, 2),
    indexValue: randomBetween(2000, 3500, 2),
    accVolume: randomBetween(100000, 9000000),
    accAmount: randomBetween(10000, 9000000),
  };
}

export async function fetchMockData(): Promise<MarketData> {
  return {
    kospi: mockSnapshot(),
    kosdaq: mockSnapshot(),
    nasdaqChangePct: randomSigned(4, 2),
    usdkrw: randomBetween(1200, 1500, 2),
  };
}
