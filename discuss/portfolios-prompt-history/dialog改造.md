# 弹窗交互改造
## 目的
目前弹出窗口出现了3层弹窗，本身算一层，交易记录列表对话框算一层，在这一层的编辑记录上，又有一层编辑对话框。然后删除有删除对话框。
感觉这种交互不太友好，所以我想改造成drawer和sheet来实现，看交互会不会好一些，如果你有其他建议也可以告诉我。

## 交易记录列表对话框
把 @src/app/(main)/investment/portfolios/_components/holding-dialogs-manager.tsx 中61行交易记录列表对话框 改造成 shadcn ui的drawer组件来实现，可以参考这个连接 https://ui.shadcn.com/docs/components/drawer

## 交易和转账对话框
把交易记录对话框 @src/app/(main)/investment/portfolios/_components/transaction-dialog.tsx 以及转账对话框 @src/app/(main)/investment/portfolios/_components/transfer-dialog.tsx 改造一下，原来是Dialog实现，现在改成shadcn ui的sheet组件实现，可以参考这个连接 https://ui.shadcn.com/docs/components/sheet



补充prompt
transaction-dialog.tsx 和 transfer-dialog.tsx 的表单内容应该用Card组件包围，边沿适当留一些空间，不然整体不美观

transaction-dialog.tsx 和 transfer-dialog.tsx 把form内容的布局都改成和备注字段一样是上下布局，这样会比较美观，然后两个按钮也改成上下布局的形式

transaction-dialog.tsx 股票，买入价，买入量，还有其他交易类型里面的其他字段也有一些没改成上下布局，你仔细看看

@src/app/api/holdings/route.ts 这个API中改一下以下几个点
成本：保留3位小数
当日盈亏率：保留3位小数
盈亏率：保留3位小数
