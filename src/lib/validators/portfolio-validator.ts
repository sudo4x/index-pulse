/**
 * 投资组合验证器
 * 统一管理创建和更新投资组合时的验证逻辑
 */

export interface PortfolioValidationData {
  name?: string;
  stockCommissionMinAmount?: number;
  stockCommissionRate?: number;
  etfCommissionMinAmount?: number;
  etfCommissionRate?: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class PortfolioValidator {
  // 默认值常量
  private static readonly DEFAULT_COMMISSION_MIN_AMOUNT = 5.0;
  private static readonly DEFAULT_COMMISSION_RATE = 0.0003;
  private static readonly MAX_COMMISSION_RATE = 0.01; // 1%

  /**
   * 创建投资组合时的验证
   */
  static validateForCreate(data: PortfolioValidationData): ValidationResult {
    // 创建时 name 是必填的
    const nameValidation = this.validateName(data.name, true);
    if (!nameValidation.isValid) {
      return nameValidation;
    }

    // 获取实际值（包含默认值）
    const actualValues = this.getActualValues(data);

    // 验证佣金最低金额
    const minAmountValidation = this.validateCommissionMinAmounts(
      actualValues.stockCommissionMinAmount,
      actualValues.etfCommissionMinAmount
    );
    if (!minAmountValidation.isValid) {
      return minAmountValidation;
    }

    // 验证佣金费率
    const rateValidation = this.validateCommissionRates(
      actualValues.stockCommissionRate,
      actualValues.etfCommissionRate
    );
    if (!rateValidation.isValid) {
      return rateValidation;
    }

    return { isValid: true };
  }

  /**
   * 更新投资组合时的验证
   */
  static validateForUpdate(data: PortfolioValidationData): ValidationResult {
    // 更新时 name 可选，但如果提供了就必须有效
    if (data.name !== undefined) {
      const nameValidation = this.validateName(data.name, true);
      if (!nameValidation.isValid) {
        return nameValidation;
      }
    }

    // 验证佣金最低金额（只验证提供的字段）
    const minAmountValidation = this.validateOptionalCommissionMinAmounts(
      data.stockCommissionMinAmount,
      data.etfCommissionMinAmount
    );
    if (!minAmountValidation.isValid) {
      return minAmountValidation;
    }

    // 验证佣金费率（只验证提供的字段）
    const rateValidation = this.validateOptionalCommissionRates(data.stockCommissionRate, data.etfCommissionRate);
    if (!rateValidation.isValid) {
      return rateValidation;
    }

    return { isValid: true };
  }

  /**
   * 获取包含默认值的实际值
   */
  static getActualValues(data: PortfolioValidationData) {
    return {
      stockCommissionMinAmount: data.stockCommissionMinAmount ?? this.DEFAULT_COMMISSION_MIN_AMOUNT,
      stockCommissionRate: data.stockCommissionRate ?? this.DEFAULT_COMMISSION_RATE,
      etfCommissionMinAmount: data.etfCommissionMinAmount ?? this.DEFAULT_COMMISSION_MIN_AMOUNT,
      etfCommissionRate: data.etfCommissionRate ?? this.DEFAULT_COMMISSION_RATE,
    };
  }

  /**
   * 验证组合名称
   */
  private static validateName(name?: string, isRequired = false): ValidationResult {
    if (isRequired && (!name || typeof name !== "string" || name.trim().length === 0)) {
      return { isValid: false, error: "组合名称不能为空" };
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return { isValid: false, error: "组合名称不能为空" };
    }

    return { isValid: true };
  }

  /**
   * 验证佣金最低金额（必填场景）
   */
  private static validateCommissionMinAmounts(stockMinAmount: number, etfMinAmount: number): ValidationResult {
    if (stockMinAmount < 0 || etfMinAmount < 0) {
      return { isValid: false, error: "佣金最低金额不能为负数" };
    }
    return { isValid: true };
  }

  /**
   * 验证佣金最低金额（可选场景）
   */
  private static validateOptionalCommissionMinAmounts(
    stockMinAmount?: number,
    etfMinAmount?: number
  ): ValidationResult {
    if ((stockMinAmount !== undefined && stockMinAmount < 0) || 
        (etfMinAmount !== undefined && etfMinAmount < 0)) {
      return { isValid: false, error: "佣金最低金额不能为负数" };
    }
    return { isValid: true };
  }

  /**
   * 验证佣金费率（必填场景）
   */
  private static validateCommissionRates(stockRate: number, etfRate: number): ValidationResult {
    if (stockRate < 0 || stockRate > this.MAX_COMMISSION_RATE || etfRate < 0 || etfRate > this.MAX_COMMISSION_RATE) {
      return { isValid: false, error: "佣金费率必须在0-1%之间" };
    }
    return { isValid: true };
  }

  /**
   * 验证佣金费率（可选场景）
   */
  private static validateOptionalCommissionRates(stockRate?: number, etfRate?: number): ValidationResult {
    if (
      (stockRate !== undefined && (stockRate < 0 || stockRate > this.MAX_COMMISSION_RATE)) ||
      (etfRate !== undefined && (etfRate < 0 || etfRate > this.MAX_COMMISSION_RATE))
    ) {
      return { isValid: false, error: "佣金费率必须在0-1%之间" };
    }
    return { isValid: true };
  }
}