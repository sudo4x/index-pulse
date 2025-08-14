import { useToast } from "@/hooks/use-toast";
import { PortfolioOverview } from "@/types/investment";

interface PortfolioItem {
  id: string;
  name: string;
  sortOrder: number;
  isEditing: boolean;
  editingName: string;
}

export function usePortfolioEdit(
  portfolioItems: PortfolioItem[],
  setPortfolioItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>,
  portfolios: PortfolioOverview[],
  onPortfoliosChange: (portfolios: PortfolioOverview[]) => void,
) {
  const { toast } = useToast();

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

  return {
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDelete,
  };
}
