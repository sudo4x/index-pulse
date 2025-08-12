/**
 * 数据库 decimal 字段转换工具
 * 将从数据库返回的 decimal 字符串转换为数字类型
 */

/**
 * 将单个 decimal 值转换为数字
 */
export function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value) || 0;
}

/**
 * 转换对象中的 decimal 字段
 * @param obj 包含 decimal 字段的对象
 * @param fields 需要转换的字段名数组
 */
export function parseDecimalFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj };

  for (const field of fields) {
    if (field in result) {
      result[field] = parseDecimal(result[field] as string | number) as T[keyof T];
    }
  }

  return result;
}

/**
 * 批量转换数组中每个对象的 decimal 字段
 */
export function parseDecimalFieldsArray<T extends Record<string, any>>(array: T[], fields: (keyof T)[]): T[] {
  return array.map((obj) => parseDecimalFields(obj, fields));
}
