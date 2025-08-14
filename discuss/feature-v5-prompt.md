# 佣金和税费第二次优化

## portfolio-form-dialog 以及 portfolio数据结构 修改

- 最低佣金和佣金率应该是分成两部分设置，一部分是个股，一部分是ETF，两个是不同的设置
- 修改portfolio数据结构，新增ETF最低佣金和ETF佣金率
- 修改portfolio-form-dialog UI 改成

```
组合名称 input
个股佣金 最低佣金 input 佣金率 input
ETF佣金 最低佣金 input 佣金率 input
```

- 最低佣金 和 佣金率的input 不需要右侧的增减按钮，直接输入即可

## 佣金计算的算法修改

- 关于佣金计算的算法，需要区分个股和ETF，两个计算取各自的最低佣金和佣金率配置
- 个股和ETF可以通过代码区别判断

```
A股​：ETF（51/15/588开头） vs 个股（60/00/30/688/8开头）
​港股​：ETF（03/08开头） vs 个股（5位数字）
```

## 交易记录金额计算逻辑

- amount 交易金额字段，纯粹就是记录股票买卖发生金额，或者股票分红发生金额 （现在amount把所有费用都计算在上面，这个不对）
- commission 佣金发生金额
- tax 税费发生金额
- 佣金和税费是会影响盈亏的计算方法，需要扣除掉所有这些佣金和税费，这些都算成本。所以对应的算法需要修改。

## 补充prompt

- portfolio-form-dialog的UI布局没按我的要求来，我重新描述一下。要求整体是三行布局，组合名称，个股佣金，ETF佣金各一行，布局示例如下

```
组合名称 input （input撑满剩余宽度）
个股佣金 最低(元) input 佣金率 input
ETF佣金 最低(元) input 佣金率 input
```

- FeeCalculator.calculateFees 方法是你修改后的最新版本，你还保留了历史版本。 其实历史版本不需要保留，删掉。然后这个方法的相关引用你并没有修改到，编辑器有提示变异错误，你修复一下
- amount 交易金额字段，纯粹就是记录股票买卖发生金额，或者股票分红发生金额 （现在amount把所有费用都计算在上面，这个不对） 这部分看起来没有修改到

- fee-preview组件太占空间，没必要，删掉吧。相关引用也要一并清理掉
- 交易记录对话框 买入价/卖出价 输入框很难修改值，填入马上会被修正成三位小数，整数很难修改，这个改一下，可以让用户输入，你要做小数点修正可以在保存之前做


- 两个复杂度问题
src/app/api/portfolios/[portfolioId]/route.ts  Error: Function 'validateUpdateData' has a complexity of 15. Maximum allowed is 10.
src/app/api/portfolios/route.ts Error: Function 'validatePortfolioData' has a complexity of 14. Maximum allowed is 10
我发现这两个代码中功能相似度很高，你解决复杂度的同时要考虑重构复用代码，两个都属于验证逻辑，应该有专门的验证代码文件来实现


请把以下要求加入到项目记忆中，级别为重要，必须准守
- 开发新功能或者修改重构原有代码时，必须先查看是否已有类似实现，要尽量复用代码，用到哪写到哪，要考虑良好的设计模式
- 开发中遵循良好设计规范，做到用途清晰明了，比如类型定义要统一到一起，其他的比如validator，helper，calaculator也要做到分门别类，归类清晰