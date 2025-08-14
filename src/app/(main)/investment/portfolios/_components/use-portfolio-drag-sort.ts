import { useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { PortfolioOverview } from "@/types/investment";

interface PortfolioItem {
  id: string;
  name: string;
  sortOrder: number;
  isEditing: boolean;
  editingName: string;
}

export function usePortfolioDragSort(
  portfolioItems: PortfolioItem[],
  setPortfolioItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>,
  portfolios: PortfolioOverview[],
  onPortfoliosChange: (portfolios: PortfolioOverview[]) => void,
) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();

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

    // 保存排序到服务器
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

  return {
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDragOver,
  };
}
