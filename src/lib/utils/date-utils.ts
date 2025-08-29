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
