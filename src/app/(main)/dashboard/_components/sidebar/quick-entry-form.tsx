"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import { LoaderIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { QuickEntryParser } from "@/lib/services/quick-entry-parser";
import type { QuickEntryParseResult, BulkTransactionRequest, BulkTransactionResponse } from "@/types/quick-entry";

interface QuickEntryFormProps {
  inputText: string;
  portfolioId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QuickEntryForm({ inputText, portfolioId, onSuccess, onClose }: QuickEntryFormProps) {
  const { toast } = useToast();
  const [parseResults, setParseResults] = useState<QuickEntryParseResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // 使用自定义 hooks 减少组件复杂度
  const { parseInput } = useParseLogic(inputText, setParseResults, setIsParsing, toast);
  const { handleSave } = useSaveLogic(portfolioId, parseResults, setIsSaving, setSaveProgress, toast, onSuccess);

  // 当输入文本变化时自动解析
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      parseInput();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [parseInput]);

  // 计算解析统计
  const parseStats = useMemo(() => {
    const total = parseResults.length;
    const success = parseResults.filter((r) => r.success).length;
    const failed = total - success;

    return { total, success, failed };
  }, [parseResults]);

  if (!inputText.trim()) {
    return null;
  }

  return (
    <QuickEntryFormContent
      parseResults={parseResults}
      isParsing={isParsing}
      isSaving={isSaving}
      saveProgress={saveProgress}
      parseStats={parseStats}
      onSave={handleSave}
      onClose={onClose}
    />
  );
}

// 解析逻辑 Hook
function useParseLogic(
  inputText: string,
  setParseResults: React.Dispatch<React.SetStateAction<QuickEntryParseResult[]>>,
  setIsParsing: React.Dispatch<React.SetStateAction<boolean>>,
  toast: ReturnType<typeof useToast>["toast"],
) {
  const parseInput = useCallback(async () => {
    if (!inputText.trim()) {
      setParseResults([]);
      return;
    }

    setIsParsing(true);
    try {
      const results = await QuickEntryParser.parseLines(inputText);
      setParseResults(results);
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "解析失败",
        description: "文本解析过程中发生错误",
        variant: "destructive",
      });
      setParseResults([]);
    } finally {
      setIsParsing(false);
    }
  }, [inputText, toast, setParseResults, setIsParsing]);

  return { parseInput };
}

// 保存逻辑 Hook
function useSaveLogic(
  portfolioId: string,
  parseResults: QuickEntryParseResult[],
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>,
  setSaveProgress: React.Dispatch<React.SetStateAction<number>>,
  toast: ReturnType<typeof useToast>["toast"],
  onSuccess: () => void,
) {
  const handleSave = useCallback(async () => {
    // 前置验证
    if (!portfolioId) {
      toast({
        title: "保存失败",
        description: "请先选择投资组合",
        variant: "destructive",
      });
      return;
    }

    const successfulResults = parseResults.filter((r) => r.success && r.data);
    if (successfulResults.length === 0) {
      toast({
        title: "保存失败",
        description: "没有可保存的有效数据",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      const transactions = successfulResults.map((r) => r.data!);
      const request: BulkTransactionRequest = {
        portfolioId,
        transactions,
      };

      // 启动进度模拟
      const progressInterval = setInterval(() => {
        setSaveProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      clearInterval(progressInterval);
      setSaveProgress(100);

      const result: BulkTransactionResponse = await response.json();

      if (result.success) {
        toast({
          title: "保存成功",
          description: `成功保存 ${result.successCount} 条交易记录${result.failureCount > 0 ? `，${result.failureCount} 条失败` : ""}`,
        });

        if (result.failureCount === 0) {
          onSuccess();
        }
      } else {
        toast({
          title: "保存失败",
          description: result.errors?.[0]?.error ?? "批量保存时发生错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "保存失败",
        description: "网络错误或服务器异常",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  }, [portfolioId, parseResults, toast, onSuccess, setIsSaving, setSaveProgress]);

  return { handleSave };
}

// 表单内容组件
interface QuickEntryFormContentProps {
  parseResults: QuickEntryParseResult[];
  isParsing: boolean;
  isSaving: boolean;
  saveProgress: number;
  parseStats: { total: number; success: number; failed: number };
  onSave: () => void;
  onClose: () => void;
}

function QuickEntryFormContent({
  parseResults,
  isParsing,
  isSaving,
  saveProgress,
  parseStats,
  onSave,
  onClose,
}: QuickEntryFormContentProps) {
  // 获取失败的行号
  const failedLines = parseResults
    .filter((r) => !r.success)
    .map((r) => r.line)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* 简化的解析状态 */}
      <div className="text-sm">
        {isParsing ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            正在解析...
          </div>
        ) : parseResults.length > 0 ? (
          <div className="space-y-1">
            <p className="text-green-600">成功 {parseStats.success} 条</p>
            {parseStats.failed > 0 && (
              <p className="text-red-600">
                失败 {parseStats.failed} 条 (第{failedLines.join(",")}行)
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* 保存进度 */}
      {isSaving && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>保存进度</span>
                <span>{saveProgress}%</span>
              </div>
              <Progress value={saveProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 pt-4">
        <Button onClick={onSave} disabled={parseStats.success === 0 || isParsing || isSaving} className="w-full">
          {isSaving ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            `保存 ${parseStats.success} 条记录`
          )}
        </Button>

        <Button variant="outline" onClick={onClose} disabled={isSaving} className="w-full">
          取消
        </Button>
      </div>
    </div>
  );
}
