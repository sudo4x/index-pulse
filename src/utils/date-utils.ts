/**
 * 日期相关工具函数
 */

/**
 * 计算两个日期之间的天数差
 * @param startDate 开始日期
 * @param endDate 结束日期（默认为当前日期）
 * @returns 天数差（正数表示endDate在startDate之后）
 */
export function calculateDaysDiff(startDate: Date | string | null, endDate: Date | string = new Date()): number {
  if (!startDate) return 0;

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * 格式化天数显示
 * @param days 天数
 * @returns 格式化的天数字符串
 */
export function formatDaysDisplay(days: number): string {
  if (days === 0) return "今日";
  if (days === 1) return "1天";
  if (days < 0) return `${Math.abs(days)}天前`;

  if (days < 30) return `${days}天`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months}月`;
    return `${months}月${remainingDays}天`;
  }

  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  if (remainingDays === 0) return `${years}年`;

  const months = Math.floor(remainingDays / 30);
  if (months === 0) return `${years}年${remainingDays}天`;
  return `${years}年${months}月`;
}

/**
 * 检查日期是否为有效日期
 * @param date 要检查的日期
 * @returns 是否为有效日期
 */
export function isValidDate(date: Date | string | null): date is Date | string {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return !isNaN(d.getTime());
}

/**
 * 通用日期格式化函数
 * @param date 要格式化的日期
 * @param format 格式化模式，默认为 "YYYY-MM-DD"
 * @returns 格式化后的日期字符串，无效日期返回空字符串
 */
export function formatDate(date: Date | string | null, format: string = "YYYY-MM-DD"): string {
  if (!date || !isValidDate(date)) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return formatDateParts(d, format);
}

/**
 * 根据日期部分和格式生成格式化字符串
 * @param date 有效的日期对象
 * @param format 格式化模式
 * @returns 格式化后的日期字符串
 */
function formatDateParts(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (format) {
    case "YYYY/MM/DD":
      return `${year}/${month}/${day}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY年MM月DD日":
      return `${year}年${month}月${day}日`;
    default:
      return `${year}-${month}-${day}`;
  }
}
