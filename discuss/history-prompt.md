买入，卖出我希望改成图片所示的布局，整体用Card组件包围，让底色变白色比较清晰
股票那栏信息是通过填写代码来搜索，调用接口就是之前参考 @discuss/获取实时行情接口.md 实现的接口。
股票这栏要求必须在输入完整的6位代码之后才调用接口，在input下方pop展示搜索结果，结果展示格式为：五粮液(SZ00858),选中后input框填入SZ000858(五粮液),后端保存的逻辑需要做响应的映射修改。如果没有结果就显示未找到并且无法选中填入

完善stock-prices接口，通过输入的代码按照下面的规则自动组件查询参数

类别​ ​沪市标识​ ​深市标识​ ​代码示例​
​个股​ 60/688 + ​**.SH**​ 00/002/30 + ​**.SZ**​ 600519.SH（茅台）
​指数​ 000开头（无后缀） 399开头（无后缀） 000300（沪深指数）
​ETF​ 51/588 + ​**.SH**​ 15/16 + ​**.SZ**​ 510300.SH（沪深300ETF）

stock-prices接口要修复一下乱码，他是gbk编码
对话框样式不对，我是要求整体对话框有card组件包围，而不是里面的输入控件。
其他的输入控件请完全按照刚才提供的图片来设计，保持简洁紧凑

布局还是不对，要左右布局，即label在左边，input在右边结构，全部参数都这样，除了备注用上下结构
价格是买入价，不是价格
佣金和费率那边是3列布局，label input select,select有：率千分号和元两种选择
所有数字输入框都是直接输入不要有右侧的调整按钮

运行一下lint，修复一下lint error
需要非常注意，不能修改原来的功能
还有必须严格遵守项目中和用户记忆中的开发规范，这点非常重要






08-18
portfolio-calculator.ts 中 getStockPrice(symbol: string)这个函数目前是返回了模拟数据，没拿到真实数据。
需要改成获取真实数据，具体要求如下
1、获取所有持仓的品种的代码，要注意去重
2、使用1的结果一次性查询所有品种的stock_price，这个结果需要做缓存（数据库中？），缓存时间暂定5分钟
3、具体获取逻辑是先判断缓存有没有过期了，没有直接从缓存获取。要是过期了就重新获取并更新缓存。
4、需要特别注意，这些获取方式会跟stock-prices这个接口的一些方法实现重复，比如fetchStockPricesFromExternal，你需要特别注意一下设计模式和代码复用原则，好好设计一下

08-19
现在获取股票价格有两个来源，一个来自系统自身的stock-prices接口，一个是来自websocket。changePercent的目前的值是百分号后的数字，但是目前两个来源的数据对于这个值的处理并不一致，websocket那边直接认为是取百分号前的数字，而从stock-prices获取的是当成取百分号后的数据。现在我要把这个有异议的changePercent改成一致的，就是取百分号之前的数据，websokcet那边的数据我会去处理，你需要做三件事情：
1、修改获取股票实时价格那边的底层逻辑，把changePercent改成原始值 除以 100 再保存，保证数据源一致（腾讯财经接口获取到的是取百分号后的数字）。websocket那边我会自己处理掉。
2，检查并修改所有使用到changePercent进行计算和展示的地方，展示时这个字段统一格式为百分号格式


@src/app/(main)/investment/portfolios/_components/holdings-table-container.tsx 中112行开始，只是重新算了市值和浮动盈亏，累计盈亏和当日盈亏相关的没有根据当前价格重算。需要你根据计算公式 @docs/计算公式.md 还有 @src/lib/services/financial-calculator.ts 的相关实现，完善这些重算逻辑

@src/lib/services/holding-service.ts 第42、43行对dilutedCost和holdCost的计算使用了内部的私有函数，这个不对，应该使用 @src/lib/services/financial-calculator.ts 中的calculateCosts 计算成本的函数来实现才对。使用统一的方法，而不是分散在各个地方


@src/app/api/holdings/route.ts 获取投资组合持仓信息 这个接口的数据逻辑是：通过查询品种的所有交易记录重新计算得出。
其实这个没必要，可以通过holdings现有的字段配合当前最新价格就可以计算得出，不过目前holdings表缺少总税费和总佣金字段需要进行部分改造。
首先， holdings 表新增总税费和总佣金两个字段，然后在新增修改交易记录时会同步更新holdings表那些地方，也把税费和佣金计算出来保存到holdings表中
第二，修改 获取投资组合持仓信息 这个接口的数据逻辑，直接使用holdings表中的数据和当前最新价格进行计算
补充：相关计算方法参考 @src/lib/services/financial-calculator.ts 和 @docs/计算公式.md 如果我遗漏的地方，你一起帮我补充完整



@src/lib/services/stock-price-service.ts 中 getStockPrices 和 getStockPrice方法改造。
现在的逻辑是通过数据库来缓存，缓存时间5分钟。目前使用起来感觉并不好用，改造如下：
1、去掉缓存逻辑，改成每次都是直接从外部接口获取，涨停跌停价格的计算需要保留
2、去掉数据库表结构，这个表不需要了，所以也不需要这个表数据保存的相关逻辑了
3、StockPriceData和SimpleStockPrice统一成一个，就叫做StockPrice，基于SimpleStockPrice的结构，加上昨日收盘价，涨停价，跌停价
4、提供getStockPrices(symbols: string[])方法，返回StockPrice数组
5、提供getStockPrice(symbol: string)方法，返回单个StockPrice数据
6、提供getStockPriceMap(symbols: string[])方法，返回StockPrice的map形式，key是symbol，value是StockPrice对象，参考
7、6实现之后，@src/lib/services/portfolio-calculator.ts 中116行开始的priceMap的相关实现要改造成用6提供的函数来实现
8、@src/app/api/holdings/route.ts 中61行：```const prices = await StockPriceService.getMultipleStockPrices(symbols); ```这个错误也要修复，改成用上面改造后的方法来实现。