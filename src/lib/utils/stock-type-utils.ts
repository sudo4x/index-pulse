/**
 * 股票类型识别工具
 * 根据股票代码区分个股和ETF
 */

export enum StockType {
  STOCK = "stock", // 个股
  ETF = "etf", // ETF
}

/**
 * 根据股票代码判断是个股还是ETF
 * @param symbol 股票代码，如 "SZ000858" 或 "00700"
 * @returns 股票类型
 */
export function getStockType(symbol: string): StockType {
  if (!symbol) {
    return StockType.STOCK;
  }

  // A股判断
  if (symbol.startsWith("SZ") || symbol.startsWith("SH")) {
    return getAShareType(symbol);
  }

  // 港股判断
  if (symbol.startsWith("HK")) {
    return getHKShareType(symbol);
  }

  // 纯数字的港股判断
  const code = symbol.replace(/^(SZ|SH|HK)/, "");
  if (/^\d{5}$/.test(code)) {
    return isHKETFCode(code) ? StockType.ETF : StockType.STOCK;
  }

  // 默认返回个股
  return StockType.STOCK;
}

/**
 * 判断A股类型
 */
function getAShareType(symbol: string): StockType {
  const code = symbol.replace(/^(SZ|SH)/, "");

  // ETF：51/15/588开头
  if (code.startsWith("51") || code.startsWith("15") || code.startsWith("588")) {
    return StockType.ETF;
  }

  // 个股：60/00/30/688/8开头
  if (isAShareStockCode(code)) {
    return StockType.STOCK;
  }

  return StockType.STOCK;
}

/**
 * 判断港股类型
 */
function getHKShareType(symbol: string): StockType {
  const code = symbol.replace(/^HK/, "");
  return isHKETFCode(code) ? StockType.ETF : StockType.STOCK;
}

/**
 * 判断是否为A股个股代码
 */
function isAShareStockCode(code: string): boolean {
  return (
    code.startsWith("60") ||
    code.startsWith("00") ||
    code.startsWith("30") ||
    code.startsWith("688") ||
    code.startsWith("8")
  );
}

/**
 * 判断是否为港股ETF代码
 */
function isHKETFCode(code: string): boolean {
  return code.startsWith("03") || code.startsWith("08");
}

/**
 * 判断是否为ETF
 * @param symbol 股票代码
 * @returns 是否为ETF
 */
export function isETF(symbol: string): boolean {
  return getStockType(symbol) === StockType.ETF;
}

/**
 * 判断是否为个股
 * @param symbol 股票代码
 * @returns 是否为个股
 */
export function isStock(symbol: string): boolean {
  return getStockType(symbol) === StockType.STOCK;
}
