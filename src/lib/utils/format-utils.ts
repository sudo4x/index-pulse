/**
 * 统一的格式化工具函数
 */

/**
 * 格式化百分比数值
 * @param value 小数形式的百分比值（如 0.015 表示 1.5%）
 * @param decimalPlaces 小数位数，默认为 2
 * @returns 格式化后的百分比字符串（如 "1.50%"）
 */
export function formatPercent(value: number, decimalPlaces: number = 2): string {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
}

/**
 * 格式化金额
 * @param value 金额数值
 * @param currency 货币符号，默认为 "¥"
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(value: number, currency: string = "¥"): string {
  return `${currency}${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 格式化股数
 * @param shares 股数
 * @returns 格式化后的股数字符串
 */
export function formatShares(shares: number): string {
  return shares.toLocaleString("zh-CN");
}
