# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

IndexPulse 是一个基于 Next.js 15 的现代化管理后台模板，专门用于指数投资和跟踪系统。项目使用了 App Router、TypeScript、Tailwind CSS v4 和 Shadcn UI 组件库。

## 常用命令

### 开发和构建

```bash
npm run dev           # 启动开发服务器 (http://localhost:3000)
npm run build         # 构建生产版本
npm run start         # 启动生产服务器
```

### 代码质量

```bash
npm run lint          # 运行 ESLint 检查
npm run format        # 使用 Prettier 格式化代码
npm run format:check  # 检查代码格式是否符合要求
npm run build         # 构建并检查编译错误（必须！）
```

### 🔥 编译检查规则 - 极其重要！

**【必须遵守！】每次完成功能开发或修复 bug 后，都必须运行 `npm run build` 进行编译检查**

- **强制要求**：任何代码修改完成后都必须编译检查
- **检查内容**：TypeScript 类型错误、ESLint 错误、构建错误
- **处理原则**：发现编译错误必须立即修复，不能留到后面
- **质量保障**：确保代码改动不会破坏项目的整体稳定性

### Lint 和格式化工作流程

**【重要！】为避免格式化冲突和减少不必要的代码变化，必须严格按照以下步骤执行：**

1. **修复 Lint 错误的标准流程**：

   ```bash
   # 步骤1：先运行格式化，让 Prettier 统一所有格式
   npm run format

   # 步骤2：检查剩余的 lint 错误
   npm run lint

   # 步骤3：手动修复 lint 错误（仅修复逻辑问题，不调整格式）
   # 修改时要严格遵循当前文件的格式风格

   # 步骤4：最后再运行一次格式化确保一致性
   npm run format
   ```

2. **手动修改代码时的注意事项**：
   - 严格遵循 Prettier 的格式规则（缩进、换行、空格等）
   - 不要在格式化后再手动调整代码格式
   - 优先修复功能性错误，避免纯格式调整
   - 使用编辑器的自动格式化功能保持一致性

3. **避免的反模式**：
   - ❌ 先手动修改，再格式化（会导致大量格式变化）
   - ❌ 在格式化后再手动调整缩进或换行
   - ❌ 混合修复逻辑和格式问题

4. **推荐的编辑器配置**：
   - 启用保存时自动运行 Prettier
   - 配置 ESLint 自动修复简单问题
   - 使用项目的 .prettierrc 和 eslint.config.mjs 配置

### 主题预设生成

```bash
npm run generate:presets  # 生成自定义主题预设文件
```

## 项目架构

### 核心技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **组件库**: Shadcn UI
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod 验证
- **数据表格**: TanStack Table
- **图表**: Recharts
- **拖拽**: DND Kit

### 目录结构 (现代化分层架构)

项目采用现代化的清晰分层架构，将核心业务逻辑提升到顶层，实现更好的职责分离：

#### 📁 核心业务层 (顶层)
- `src/services/` - 业务服务层 (23个文件)
  - `price-manager/` - 股价管理服务
  - `transaction-handlers/` - 交易处理器
  - `types/` - 服务层类型定义
  - 包含：计算器、交易服务、持仓服务、股价服务等
- `src/utils/` - 工具函数层 (11个文件)
  - `style-utils.ts` - 样式工具 (cn函数等)
  - `format-utils.ts` - 格式化工具
  - `date-utils.ts`、`time-utils.ts` - 时间处理
  - `theme-utils.ts`、`layout-utils.ts` - 界面工具
  - `transaction-helpers.ts` - 交易辅助工具
- `src/validators/` - 数据验证层 (3个文件)
  - `portfolio-validator.ts` - 投资组合验证
  - `transaction-validator.ts` - 交易数据验证
  - `quick-entry-validator.ts` - 快速录入验证

#### 📁 应用功能层
- `src/app/` - Next.js App Router 页面
  - `(main)/dashboard/` - 仪表板页面及其组件
  - `(main)/investment/portfolios/` - 投资组合管理
  - `(main)/auth/` - 认证页面 (v1 和 v2 版本)
  - `(external)/` - 外部页面
- `src/components/` - 全局共享组件
  - `ui/` - Shadcn UI 基础组件
  - `data-table/` - 数据表格相关组件
  - `layouts/` - 布局组件

#### 📁 基础设施层
- `src/lib/` - 基础设施服务
  - `auth/` - 认证相关基础设施
  - `db/` - 数据库配置和 schema
  - `supabase/` - Supabase 客户端配置
- `src/config/` - 应用配置
- `src/stores/` - Zustand 状态管理
- `src/hooks/` - 自定义 React hooks
- `src/types/` - TypeScript 类型定义
- `src/navigation/` - 导航配置
- `src/styles/presets/` - 主题预设样式

#### 🎯 架构设计理念

新的分层架构具有以下优势：

1. **清晰的职责分离**
   - 核心业务逻辑 (`services/`) 与工具函数 (`utils/`) 分离
   - 数据验证 (`validators/`) 独立成层，便于复用和测试
   - 基础设施 (`lib/`) 专注于底层技术服务

2. **更好的可发现性**
   - 重要模块在顶层直接可见，降低寻找成本
   - 统一的导出接口 (`index.ts`)，简化导入路径
   - 模块名称语义化，见名知意

3. **符合现代前端标准**
   - 与主流 Next.js 项目结构保持一致
   - 便于团队成员快速上手和协作
   - 适合企业级项目的扩展需求

4. **统一的导入规范**
   ```typescript
   // 推荐的导入方式
   import { PortfolioCalculator } from '@/services';
   import { formatCurrency, cn } from '@/utils';
   import { PortfolioValidator } from '@/validators';
   
   // 或具体路径导入
   import { PortfolioCalculator } from '@/services/portfolio-calculator';
   import { cn } from '@/utils/style-utils';
   ```

### 关键配置文件

- `src/config/app-config.ts` - 应用主要配置
- `src/navigation/sidebar/sidebar-items.ts` - 侧边栏导航配置
- `next.config.mjs` - Next.js 配置，包含重定向规则
- `components.json` - Shadcn UI 组件配置

### 主题系统

项目支持多种主题预设：

- 默认 (Shadcn Neutral)
- Tangerine (橘色主题)
- Brutalist (野兽派风格)
- Soft Pop (柔和流行色)

主题通过 Zustand store 管理，支持亮色/暗色模式切换。

### 仪表板页面

当前可用的仪表板：

- **Default** (`/dashboard/default`) - 默认仪表板
- **CRM** (`/dashboard/crm`) - 客户关系管理
- **Finance** (`/dashboard/finance`) - 财务管理

### 认证系统

提供两个版本的登录和注册页面：

- v1: `/auth/v1/login`, `/auth/v1/register`
- v2: `/auth/v2/login`, `/auth/v2/register`

### 状态管理

使用 Zustand 进行状态管理，主要 store：

- `preferences-store.ts` - 主题和布局偏好设置

### 投资组合管理系统

项目已集成完整的投资组合管理功能：

#### 数据库设计 (Supabase + Drizzle ORM)

- **用户表** (`users`) - 基于 Supabase Auth
- **投资组合表** (`portfolios`) - 用户的投资组合
- **持仓品种表** (`holdings`) - 股票持仓信息
- **交易记录表** (`transactions`) - 买入/卖出/合股/拆股/除权除息
- **转账记录表** (`transfers`) - 资金转入转出
- **组合快照表** (`portfolio_snapshots`) - 历史数据存储
- **股票价格表** (`stock_prices`) - 实时行情缓存

#### API接口

- `/api/portfolios/*` - 组合 CRUD 操作
- `/api/holdings/*` - 持仓数据查询
- `/api/transactions/*` - 交易记录管理
- `/api/transfers/*` - 转账记录管理
- `/api/stock-info/*` - 实时行情获取

#### 核心计算逻辑

使用 `PortfolioCalculator` 服务实现财务计算：

- **持股数计算**：∑买入数量 + ∑红股数量 + ∑拆股所增数量 - ∑卖出数量 - ∑合股所减数量
- **摊薄成本**：(∑买入金额 - ∑卖出金额 - ∑现金股息) / 持股数
- **持仓成本**：∑买入金额 / (∑买入数量 + ∑红股数量 + ∑拆股所增数量 - ∑合股所减数量)
- **浮动盈亏**：(当前价 - 持仓成本) \* 多仓持股数
- **累计盈亏**：多仓市值 - ∑买入金额 + ∑卖出金额 + ∑现金股息

#### 前端页面结构

- `src/app/(main)/investment/portfolios/` - 投资组合管理主页
- 多 Tab 组合切换界面
- 组合概况信息展示（总市值、今日盈亏、浮动盈亏、累计盈亏等）
- 持仓品种数据表格（支持历史持仓查看）
- 交易记录管理界面（支持5种交易类型）
- 转账记录管理界面
- 动态交易表单（根据交易类型显示不同字段）

#### 实时行情集成

集成腾讯财经接口获取股票实时行情：

- 支持 A股、港股、美股等多市场
- 自动缓存机制（5分钟有效期）
- 批量查询优化

## 开发注意事项

### 代码规范

- 项目使用严格的 ESLint 和 Prettier 配置
- 支持 Husky git hooks 和 lint-staged
- 所有组件使用 TypeScript 严格模式
- 遵循 Next.js 15 App Router 最佳实践

### 路径别名

使用 `@/` 别名指向 `src/` 目录，在 `tsconfig.json` 中配置。

### 样式系统

- 使用 Tailwind CSS v4 进行样式编写
- 通过 CSS 变量系统支持主题切换
- 预设主题文件位于 `src/styles/presets/`

### 组件开发

- 基于 Shadcn UI 进行组件开发
- 新组件应放置在对应功能模块的 `_components/` 目录下
- 全局共享组件放在 `src/components/` 目录

### 数据表格

使用 TanStack Table 构建复杂数据表格，支持：

- 排序、过滤、分页
- 列拖拽排序
- 行拖拽排序
- 列显示/隐藏控制

## 项目特色

- 响应式设计，支持移动端
- 可定制的主题预设系统
- 多种布局选项 (可折叠侧边栏、内容宽度变化)
- 基于配置的 UI 系统，易于维护和扩展
- 模块化架构，便于功能扩展

## Code Architecture

- 编写代码的硬性指标，包括以下原则：
  （1）对于 Python、JavaScript、TypeScript 等动态语言，尽可能确保每个代码文件不要超过 300 行
  （2）对于 Java、Go、Rust 等静态语言，尽可能确保每个代码文件不要超过 400 行
  （3）每层文件夹中的文件，尽可能不超过 8 个。如有超过，需要规划为多层子文件夹
- 除了硬性指标以外，还需要时刻关注优雅的架构设计，避免出现以下可能侵蚀我们代码质量的「坏味道」：
  （1）僵化 (Rigidity): 系统难以变更，任何微小的改动都会引发一连串的连锁修改。
  （2）冗余 (Redundancy): 同样的代码逻辑在多处重复出现，导致维护困难且容易产生不一致。
  （3）循环依赖 (Circular Dependency): 两个或多个模块互相纠缠，形成无法解耦的"死结"，导致难以测试与复用。
  （4）脆弱性 (Fragility): 对代码一处的修改，导致了系统中其他看似无关部分功能的意外损坏。
  （5）晦涩性 (Obscurity): 代码意图不明，结构混乱，导致阅读者难以理解其功能和设计。
  （6）数据泥团 (Data Clump): 多个数据项总是一起出现在不同方法的参数中，暗示着它们应该被组合成一个独立的对象。
  （7）不必要的复杂性 (Needless Complexity): 用"杀牛刀"去解决"杀鸡"的问题，过度设计使系统变得臃肿且难以理解。
- 【非常重要！！】无论是你自己编写代码，还是阅读或审核他人代码时，都要严格遵守上述硬性指标，以及时刻关注优雅的架构设计。
- 【非常重要！！】无论何时，一旦你识别出那些可能侵蚀我们代码质量的「坏味道」，都应当立即询问用户是否需要优化，并给出合理的优化建议。

### 🔥 重要开发规范 - 必须遵守

#### 1. 代码复用和设计模式

- **开发新功能或重构时**：必须先查看是否已有类似实现，尽量复用现有代码
- **复用原则**：避免重复造轮子，用到哪写到哪，不过度设计
- **设计模式**：考虑良好的设计模式，确保代码可维护性和扩展性

#### 2. 代码组织和分类规范

- **类型定义**：统一放在 `src/types/` 目录下，按模块分类
- **验证器 (Validators)**：统一放在 `src/validators/` 目录下
  - 投资组合验证、交易验证、快速录入验证等
- **工具函数 (Utils)**：统一放在 `src/utils/` 目录下
  - 样式工具、格式化工具、时间处理、主题工具等
- **业务服务 (Services)**：统一放在 `src/services/` 目录下
  - 计算器、交易服务、持仓服务、股价服务等
- **基础设施**：统一放在 `src/lib/` 目录下
  - 数据库配置、认证服务、第三方集成等
- **分门别类**：确保每个模块职责清晰，归类明确
- **用途清晰**：代码结构和命名要做到见名知意，用途清晰明了

#### 3. UI颜色规范 - 极其重要！！

**【项目核心视觉规范】涨跌盈亏的颜色标准，必须严格遵守：**

- **🔴 红涨绿跌**：价格或数值上涨使用红色，下跌使用绿色
  - 股价上涨：`text-red-600`
  - 股价下跌：`text-green-600`
  - 涨跌幅正值：红色
  - 涨跌幅负值：绿色

- **🔴 红盈绿亏**：盈利收益使用红色，亏损使用绿色
  - 盈利金额：`text-red-600`
  - 亏损金额：`text-green-600`
  - 正收益率：红色
  - 负收益率：绿色

**重要提醒**：

- 这是中国股市的传统颜色标准，与欧美市场相反
- 所有涉及涨跌、盈亏的UI组件都必须严格遵循此规范
- 在编写新组件或修改现有组件时，务必检查颜色逻辑是否符合此标准

## React / Next.js / TypeScript / JavaScript

- Next.js 强制使用 v15.4 版本，不要再用 v15.3 或 v14 或以下版本
- React 强制使用 v19 版本，不要再用 v18 或以下版本
- Tailwind CSS 强制使用 Tailwind CSS v4。不要再用 v3 或以下版本
- 严禁使用 commonjs 模块系统
- 尽可能使用 TypeScript。只有在构建工具完全不支持 TypeScript 的时候，才使用 JavaScript
- 数据结构尽可能全部定义成强类型。如果个别场景不得不使用 any 或未经结构化定义的 json，需要先停下来征求用户的同意
- 新增或改动typescript代码时除非不得不适用否则一律用??代替||
