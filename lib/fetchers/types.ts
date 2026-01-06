export type MarketSnapshot = {
  individual: number;
  foreign: number;
  institution: number;
  changePct: number;
};

export type MarketData = {
  kospi: MarketSnapshot;
  kosdaq: MarketSnapshot;
  nasdaqChangePct: number;
  usdkrw: number;
};
