/**
 * 时间格式化工具函数
 */

/**
 * 将时间戳格式化为相对时间显示
 * @param timestamp ISO时间字符串或时间戳
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(timestamp: string | number | Date): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  // 如果时间无效或是未来时间
  if (isNaN(time) || diff < 0) {
    return "时间未知";
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // 小于1分钟
  if (seconds < 60) {
    if (seconds < 10) {
      return "刚刚";
    }
    return `${seconds}秒前`;
  }

  // 小于1小时
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }

  // 小于24小时
  if (hours < 24) {
    return `${hours}小时前`;
  }

  // 超过24小时，显示具体日期时间
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  // 如果是今年，不显示年份
  const currentYear = new Date().getFullYear();
  if (year === currentYear) {
    return `${month}-${day} ${hour}:${minute}`;
  }

  return `${year}-${month}-${day} ${hour}:${minute}`;
}
