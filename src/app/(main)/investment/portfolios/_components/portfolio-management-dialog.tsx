"use client";

import { useState, useEffect } from "react";

import { GripVertical, Trash2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PortfolioOverview } from "@/types/investment";

import { PortfolioFormDialog } from "./portfolio-form-dialog";
import { usePortfolioDragSort } from "./use-portfolio-drag-sort";
import { usePortfolioEdit } from "./use-portfolio-edit";

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

  // 拖拽排序功能
  const { handleDragStart, handleDragEnd, handleDrop, handleDragOver } = usePortfolioDragSort(
    portfolioItems,
    setPortfolioItems,
    portfolios,
    onPortfoliosChange,
  );

  // 编辑功能
  const { handleStartEdit, handleCancelEdit, handleSaveEdit, handleDelete } = usePortfolioEdit(
    portfolioItems,
    setPortfolioItems,
    portfolios,
    onPortfoliosChange,
  );

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
                      <div
                        className="cursor-pointer font-medium transition-colors hover:text-blue-600"
                        onDoubleClick={() => handleStartEdit(item.id)}
                        title="双击快速重命名"
                      >
                        {item.name}
                      </div>
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
                        <PortfolioFormDialog
                          editMode={true}
                          portfolioData={{
                            id: item.id,
                            name: item.name,
                          }}
                          onPortfolioUpdated={(updatedPortfolio) => {
                            // 更新本地状态
                            setPortfolioItems((prev) =>
                              prev.map((prevItem) =>
                                prevItem.id === item.id ? { ...prevItem, name: updatedPortfolio.name } : prevItem,
                              ),
                            );
                            // 更新父组件状态
                            onPortfoliosChange(
                              portfolios.map((portfolio) =>
                                portfolio.portfolioId === item.id
                                  ? { ...portfolio, name: updatedPortfolio.name }
                                  : portfolio,
                              ),
                            );
                          }}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                              <Settings className="mr-1 h-3 w-3" />
                              编辑
                            </Button>
                          }
                        />
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
