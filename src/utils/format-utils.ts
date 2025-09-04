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
 * 格式化金额（中文版本）
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
 * 格式化货币（国际化版本）
 * @param amount 金额数值
 * @param opts 格式化选项
 * @returns 格式化后的货币字符串
 */
export function formatCurrencyIntl(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

/**
 * 格式化股数
 * @param shares 股数
 * @returns 格式化后的股数字符串
 */
export function formatShares(shares: number): string {
  return shares.toLocaleString("zh-CN");
}

/**
 * 计算涨跌幅
 * @param currentPrice 当前价格
 * @param basePrice 基准价格
 * @returns 涨跌幅（小数形式，如 0.05 表示 5%）
 */
export function calculateChangePercent(
  currentPrice: number | string | null,
  basePrice: number | string | null,
): number {
  const current = typeof currentPrice === "string" ? parseFloat(currentPrice) : currentPrice;
  const base = typeof basePrice === "string" ? parseFloat(basePrice) : basePrice;

  if (!current || !base || base === 0) return 0;

  return (current - base) / base;
}

/**
 * 格式化涨跌幅显示
 * @param changePercent 涨跌幅（小数形式）
 * @param decimalPlaces 小数位数，默认为 2
 * @returns 格式化的涨跌幅字符串
 */
export function formatChangePercent(changePercent: number, decimalPlaces: number = 2): string {
  const percentValue = changePercent * 100;
  const formatted = percentValue.toFixed(decimalPlaces);

  if (percentValue > 0) {
    return `+${formatted}%`;
  } else if (percentValue < 0) {
    return `${formatted}%`;
  } else {
    return "0.00%";
  }
}

/**
 * 获取涨跌幅颜色类名
 * @param changePercent 涨跌幅（小数形式）
 * @returns CSS 类名字符串
 */
export function getChangePercentColorClass(changePercent: number): string {
  if (changePercent > 0) return "text-red-600"; // 涨红
  if (changePercent < 0) return "text-green-600"; // 跌绿
  return "text-gray-600"; // 平盘灰
}
