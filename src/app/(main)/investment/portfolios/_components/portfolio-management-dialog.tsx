"use client";

import { useState, useEffect } from "react";

import { GripVertical, Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PortfolioOverview } from "@/types/investment";

interface PortfolioManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios: PortfolioOverview[];
  onPortfoliosChange: (portfolios: PortfolioOverview[]) => void;
}

interface PortfolioItem {
  id: string;
  name: string;
  sortOrder: number;
  isEditing: boolean;
  editingName: string;
}

export function PortfolioManagementDialog({
  isOpen,
  onClose,
  portfolios,
  onPortfoliosChange,
}: PortfolioManagementDialogProps) {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();

  // 初始化组合列表
  useEffect(() => {
    if (isOpen) {
      const items = portfolios.map((portfolio, index) => ({
        id: portfolio.portfolioId,
        name: portfolio.name,
        sortOrder: index,
        isEditing: false,
        editingName: portfolio.name,
      }));
      setPortfolioItems(items);
    }
  }, [isOpen, portfolios]);

  // 开始编辑
  const handleStartEdit = (id: string) => {
    setPortfolioItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEditing: true, editingName: item.name } : item)),
    );
  };

  // 取消编辑
  const handleCancelEdit = (id: string) => {
    setPortfolioItems((prev) => prev.map((item) => (item.id === id ? { ...item, isEditing: false } : item)));
  };

  // 保存编辑
  const handleSaveEdit = async (id: string) => {
    const item = portfolioItems.find((item) => item.id === id);
    if (!item || !item.editingName.trim()) {
      toast({
        title: "错误",
        description: "组合名称不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: item.editingName.trim() }),
      });

      if (!response.ok) {
        throw new Error("重命名失败");
      }

      setPortfolioItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, name: item.editingName.trim(), isEditing: false } : item)),
      );

      // 更新父组件的组合列表
      onPortfoliosChange(
        portfolios.map((portfolio) =>
          portfolio.portfolioId === id ? { ...portfolio, name: item.editingName.trim() } : portfolio,
        ),
      );

      toast({
        title: "成功",
        description: "组合重命名成功",
      });
    } catch (error) {
      console.error("Error renaming portfolio:", error);
      toast({
        title: "错误",
        description: "重命名失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 删除组合
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个组合吗？此操作将删除所有相关数据且不可恢复。")) {
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      // 更新本地状态
      setPortfolioItems((prev) => prev.filter((item) => item.id !== id));

      // 更新父组件的组合列表
      onPortfoliosChange(portfolios.filter((portfolio) => portfolio.portfolioId !== id));

      toast({
        title: "成功",
        description: "组合删除成功",
      });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      toast({
        title: "错误",
        description: "删除失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // 处理拖拽放置
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = portfolioItems.findIndex((item) => item.id === draggedItem);
    const targetIndex = portfolioItems.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // 重新排序
    const newItems = [...portfolioItems];
    const [draggedItemData] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItemData);

    // 更新排序索引
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setPortfolioItems(updatedItems);

    // TODO: 调用API保存新的排序
    saveSortOrder(updatedItems);
  };

  // 保存排序到服务器
  const saveSortOrder = async (items: PortfolioItem[]) => {
    try {
      const sortData = items.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      }));

      const response = await fetch("/api/portfolios/sort", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sortData),
      });

      if (!response.ok) {
        throw new Error("保存排序失败");
      }

      // 更新父组件的portfolios状态以匹配新的排序
      const updatedPortfolios = portfolios
        .map((portfolio) => {
          const item = items.find((item) => item.id === portfolio.portfolioId);
          return item ? { ...portfolio, sortOrder: item.sortOrder } : portfolio;
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      onPortfoliosChange(updatedPortfolios);

      toast({
        title: "成功",
        description: "组合排序已保存",
      });
    } catch (error) {
      console.error("Error saving sort order:", error);
      toast({
        title: "错误",
        description: "保存排序失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 阻止默认的拖拽行为
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto p-0">
        <DialogTitle className="sr-only">组合管理</DialogTitle>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">组合管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portfolioItems.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center">没有找到投资组合</div>
            ) : (
              portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 rounded-lg border p-3"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragOver={handleDragOver}
                >
                  {/* 拖拽手柄 */}
                  <GripVertical className="text-muted-foreground h-4 w-4 cursor-grab" />

                  {/* 组合名称 */}
                  <div className="flex-1">
                    {item.isEditing ? (
                      <Input
                        value={item.editingName}
                        onChange={(e) =>
                          setPortfolioItems((prev) =>
                            prev.map((prevItem) =>
                              prevItem.id === item.id ? { ...prevItem, editingName: e.target.value } : prevItem,
                            ),
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit(item.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit(item.id);
                          }
                        }}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <div className="font-medium">{item.name}</div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-1">
                    {item.isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleSaveEdit(item.id)}
                        >
                          保存
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleCancelEdit(item.id)}
                        >
                          取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleStartEdit(item.id)}
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          改名
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          删除
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
