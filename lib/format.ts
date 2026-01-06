export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getSignedColor(value: number): "red" | "blue" | "gray" {
  if (value > 0) return "blue";
  if (value < 0) return "red";
  return "gray";
}
