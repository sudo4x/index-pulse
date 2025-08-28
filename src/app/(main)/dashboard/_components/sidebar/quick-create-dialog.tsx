"use client";

import { useState, useEffect, useCallback } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { QuickEntryForm } from "./quick-entry-form";

interface QuickCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCreateDialog({ isOpen, onClose }: QuickCreateDialogProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [portfolios, setPortfolios] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(false);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);

  // 加载投资组合列表
  const loadPortfolios = useCallback(async () => {
    try {
      setIsLoadingPortfolios(true);
      const response = await fetch("/api/portfolios");

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setPortfolios(
            result.data.map((p: { id: number; name: string }) => ({
              id: String(p.id),
              name: p.name,
            })),
          );

          // 如果只有一个投资组合，自动选中
          if (result.data.length === 1) {
            setSelectedPortfolioId(String(result.data[0].id));
          }
        }
      } else {
        console.error("Failed to load portfolios");
        toast({
          title: "加载失败",
          description: "无法加载投资组合列表",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading portfolios:", error);
      toast({
        title: "加载失败",
        description: "无法加载投资组合列表",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortfolios(false);
    }
  }, [toast]);

  // 处理对话框打开时的初始化
  useEffect(() => {
    if (isOpen) {
      loadPortfolios();
    }
  }, [isOpen, loadPortfolios]);

  // 处理成功回调
  const handleSuccess = useCallback(() => {
    setInputText("");
    setSelectedPortfolioId("");
    onClose();

    toast({
      title: "保存成功",
      description: "交易记录已成功保存",
    });
  }, [onClose, toast]);

  // 处理关闭
  const handleClose = useCallback(() => {
    setInputText("");
    onClose();
  }, [onClose]);

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="left" className="max-w-[600px] min-w-[500px] overflow-y-auto sm:min-w-[540px]">
        <SheetHeader>
          <SheetTitle>快速录入交易记录</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Card className="mt-6">
            <CardContent className="space-y-6 pt-6">
              {/* 投资组合选择 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">选择投资组合</Label>
                <Select
                  value={selectedPortfolioId}
                  onValueChange={setSelectedPortfolioId}
                  disabled={isLoadingPortfolios}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPortfolios ? "加载中..." : "请选择投资组合"} />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 快速录入文本区域 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">录入内容</Label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="示例: 买入 五粮液 SZ000858 129.06 100 白酒目前属于低位，入一手观望"
                  className="min-h-[200px] font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  每行一条记录，用空格分隔字段。备注中如需包含空格，请用双引号包围。
                </p>
              </div>

              {/* 使用QuickEntryForm组件处理解析、验证和保存 */}
              {inputText && selectedPortfolioId && (
                <QuickEntryForm
                  inputText={inputText}
                  portfolioId={selectedPortfolioId}
                  onSuccess={handleSuccess}
                  onClose={handleClose}
                />
              )}

              {/* 格式说明 - 可折叠 */}
              <Collapsible open={isFormatGuideOpen} onOpenChange={setIsFormatGuideOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start !gap-1 p-0 !px-0 text-sm font-medium hover:bg-transparent"
                  >
                    {isFormatGuideOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    格式说明
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                    <p>
                      • <strong>类型</strong>：买入、卖出、除权除息、拆股、合股
                    </p>
                    <p>
                      • <strong>股票名称</strong>：与股票代码必须二选一，可以两个都有
                    </p>
                    <p>
                      • <strong>股票代码</strong>：如SZ000858，可用&ldquo;-&rdquo;占位
                    </p>
                    <p>
                      • <strong>价格/红利</strong>：买卖时为价格，除权除息时为每10股红利
                    </p>
                    <p>
                      • <strong>数量/比例</strong>：买卖为数量，合股为比例，除权除息为&ldquo;送股|转增&rdquo;格式
                    </p>
                    <p>
                      • <strong>备注</strong>：可选，包含空格请用双引号包围
                    </p>
                    <p>
                      • <strong>日期</strong>：可选，格式YYYY-MM-DD，不填默认今天
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
