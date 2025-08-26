## 请严格按照开发规范完善功能和修改BUG

## BUG修复

### transaction-dialog的bug修复

- 当我选择交易类型为拆股，合股，除权除息时会报错错误内容如下

```
Console Error

A component is changing an uncontrolled input to be controlled. This is likely caused by the value changing from undefined to a defined value, which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component. More info: https://react.dev/link/controlled-components

src/components/ui/input.tsx (7:5) @ Input


   5 | function Input({ className, type, ...props }: React.ComponentProps<"input">) {
   6 |   return (
>  7 |     <input
     |     ^
   8 |       type={type}
```

- 当我点击买入/卖出按钮弹出对话框时，交易类型要默认选择相应的买入/卖出，而且变成disabled状态，不可再选其他

- 股票那栏当输入多次代码时，会把之前的输入都显示在待选列表中，而不是完全匹配的那一个代码数据

- 委托日期需要选择具体的天之后就关掉日期控件，再次点开时，日期要对应选中到上一次选择的日期

### portfolio-tabs的bug修复

- 显示历史持仓这个checkbox控件，只需要显示在持仓tab被选中时，交易记录和转账记录tab被选中时不显示
- 交易记录的table中名称和代码要和持仓中的名称和代码显示一样，即合并显示
- 持仓，交易记录，转账记录这三个table的样式看起来不太美观，参考一下 @src/app/(main)/dashboard/crm/\_components/table-cards.tsx 的样式

###

## 功能完善

### transfer-dialog功能完善

- 转账对话框样式参考交易对话框的样式，优化一下

### portfolio-tabs功能完善

- 持仓，交易记录，转账记录 这三个表格的操作菜单改成平铺开，而不是三个点隐藏，文字可以简短点或者用合适的图标代替

### 组合页面功能完善

- 组合管理这个按钮的功能开发一下要求如下
  1.  点击组合管理这个按钮，弹出一个对话框，列出所有组合，然后在这个列表中支持对组合的排序，改名，删除操作，具体交互你帮我设计一下，要求简洁易用。
  2.  组合排序的的实现需要后端API和结构的支持，你需要修改数据结构，并能能修改到线上的结构，你可以把修改的sql给到我，我来修改
  3.  删除组合操作需要注意，要级联删除组合相关的所有数据
