import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { TransactionService } from "@/services/transaction-service";
import { TransactionHelpers } from "@/utils/transaction-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 更新交易记录
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const idValidation = TransactionHelpers.validateTransactionId(id);
    if (!idValidation.isValid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    const transactionData = await request.json();

    // 验证交易记录所有权
    const ownershipValidation = await TransactionService.validateTransactionOwnership(
      idValidation.transactionId!,
      user.id,
    );
    if (!ownershipValidation.success) {
      return ownershipValidation.response;
    }

    // 验证交易数据并获取组合配置
    const validation = await TransactionService.validateTransactionRequest(transactionData, user);
    if (!validation.success) {
      return validation.response;
    }

    // 使用统一的处理逻辑重新计算费用
    const processResult = await TransactionService.processTransactionData(transactionData, validation.portfolio);
    if (!processResult.success) {
      return NextResponse.json({ error: processResult.error }, { status: 400 });
    }

    // 更新交易记录
    const updateResult = await TransactionService.updateTransaction(idValidation.transactionId!, processResult.data);
    if (!updateResult.success) {
      return NextResponse.json({ error: updateResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: TransactionHelpers.enrichTransactionData(updateResult.data),
    });
  } catch (error) {
    return TransactionService.handleTransactionError(error);
  }
}

// 删除交易记录
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const idValidation = TransactionHelpers.validateTransactionId(id);
    if (!idValidation.isValid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    // 验证交易记录所有权
    const ownershipValidation = await TransactionService.validateTransactionOwnership(
      idValidation.transactionId!,
      user.id,
    );
    if (!ownershipValidation.success) {
      return ownershipValidation.response;
    }

    // 保存交易信息用于后续持仓更新
    const transactionToDelete = ownershipValidation.transaction!;

    // 删除交易记录
    const deleteResult = await TransactionService.deleteTransaction(
      idValidation.transactionId!,
      transactionToDelete.portfolioId,
      transactionToDelete.symbol,
    );
    if (!deleteResult.success) {
      return NextResponse.json({ error: deleteResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "交易记录删除成功",
    });
  } catch (error) {
    return TransactionService.handleTransactionError(error);
  }
}
