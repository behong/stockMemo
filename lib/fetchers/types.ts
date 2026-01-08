export type MarketSnapshot = {
  individual: number;
  individualQty: number;
  foreign: number;
  foreignQty: number;
  institution: number;
  institutionQty: number;
  changePct: number;
};

export type MarketData = {
  kospi: MarketSnapshot;
  kosdaq: MarketSnapshot;
  nasdaqChangePct: number;
  usdkrw: number;
};
