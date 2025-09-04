# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 项目概述

IndexPulse 是一个基于 Next.js 15 的现代化管理后台模板，专门用于指数投资和跟踪系统。项目使用了 App Router、TypeScript、Tailwind CSS v4 和 Shadcn UI 组件库。

## ⚡ 核心技术栈

- **框架**: Next.js 15 (App Router) 
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS v4
- **组件库**: Shadcn UI
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod 验证
- **数据表格**: TanStack Table
- **图表**: Recharts
- **拖拽**: DND Kit
- **数据库**: Supabase + Drizzle ORM

### 版本要求
- Next.js 强制使用 v15.4+
- React 强制使用 v19+
- Tailwind CSS 强制使用 v4+
- 严禁使用 CommonJS 模块系统
- 优先使用 `??` 替代 `||` 操作符

## 🚀 开发工作流程

### 标准化代码修改流程 (必须严格执行)

**每次新增或修改代码后，必须按顺序执行以下命令：**

```bash
# 步骤1：代码格式化 (解决格式问题)
npm run format

# 步骤2：修复 ESLint 问题 (解决代码规范问题，包括导入顺序)
npx eslint --fix src/

# 步骤3：编译检查 (确保无类型错误和构建错误)
npm run build
```

**一键执行（推荐）：**
```bash
npm run format && npx eslint --fix src/ && npm run build
```

**重要说明：**
- **顺序不可颠倒**：format → eslint fix → build
- **每步都必须执行**：任何步骤失败都要先解决再继续
- **适用所有场景**：新增功能、修复 bug、重构代码

### 常用开发命令

```bash
# 开发和构建
npm run dev           # 启动开发服务器 (http://localhost:3000)
npm run build         # 构建生产版本
npm run start         # 启动生产服务器

# 代码质量
npm run lint          # 运行 ESLint 检查
npm run format        # 使用 Prettier 格式化代码
npm run format:check  # 检查代码格式

# 主题预设
npm run generate:presets  # 生成自定义主题预设文件
```

## 🏗️ 项目架构

### 目录结构 (现代化分层架构)

项目采用清晰的分层架构，将核心业务逻辑提升到顶层：

```
src/
├── 📁 核心业务层 (顶层)
│   ├── services/      # 业务服务层 (23个文件)
│   │   ├── price-manager/
│   │   ├── transaction-handlers/
│   │   └── types/
│   ├── utils/         # 工具函数层 (11个文件)
│   │   ├── style-utils.ts
│   │   ├── format-utils.ts
│   │   ├── date-utils.ts, time-utils.ts
│   │   ├── theme-utils.ts, layout-utils.ts
│   │   └── transaction-helpers.ts
│   └── validators/    # 数据验证层 (3个文件)
│       ├── portfolio-validator.ts
│       ├── transaction-validator.ts
│       └── quick-entry-validator.ts
├── 📁 应用功能层
│   ├── app/          # Next.js App Router 页面
│   │   ├── (main)/dashboard/
│   │   ├── (main)/investment/portfolios/
│   │   └── (main)/auth/
│   └── components/   # 全局共享组件
│       ├── ui/       # Shadcn UI 基础组件
│       ├── data-table/
│       └── layouts/
└── 📁 基础设施层
    ├── lib/          # 基础设施服务
    │   ├── auth/     # 认证相关
    │   ├── db/       # 数据库配置
    │   └── supabase/ # Supabase 客户端
    ├── config/       # 应用配置
    ├── stores/       # Zustand 状态管理
    ├── hooks/        # 自定义 React hooks
    ├── types/        # TypeScript 类型定义
    └── navigation/   # 导航配置
```

### 导入规范

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

## 💼 投资组合管理系统

### 数据库设计 (Supabase + Drizzle ORM)

- **用户表** (`users`) - 基于 Supabase Auth
- **投资组合表** (`portfolios`) - 用户的投资组合
- **持仓品种表** (`holdings`) - 股票持仓信息
- **交易记录表** (`transactions`) - 买入/卖出/合股/拆股/除权除息
- **转账记录表** (`transfers`) - 资金转入转出
- **组合快照表** (`portfolio_snapshots`) - 历史数据存储
- **股票价格表** (`stock_prices`) - 实时行情缓存

### 核心计算逻辑

使用 `PortfolioCalculator` 服务实现财务计算：

- **持股数计算**：∑买入数量 + ∑红股数量 + ∑拆股所增数量 - ∑卖出数量 - ∑合股所减数量
- **摊薄成本**：(∑买入金额 - ∑卖出金额 - ∑现金股息) / 持股数
- **持仓成本**：∑买入金额 / (∑买入数量 + ∑红股数量 + ∑拆股所增数量 - ∑合股所减数量)
- **浮动盈亏**：(当前价 - 持仓成本) × 多仓持股数
- **累计盈亏**：多仓市值 - ∑买入金额 + ∑卖出金额 + ∑现金股息

### API 接口

- `/api/portfolios/*` - 组合 CRUD 操作
- `/api/holdings/*` - 持仓数据查询
- `/api/transactions/*` - 交易记录管理
- `/api/transfers/*` - 转账记录管理
- `/api/stock-info/*` - 实时行情获取

### 实时行情集成

集成腾讯财经接口获取股票实时行情：
- 支持 A股、港股、美股等多市场
- 自动缓存机制（5分钟有效期）
- 批量查询优化

## 🎨 UI 设计规范

### 主题系统

项目支持多种主题预设：
- 默认 (Shadcn Neutral)
- Tangerine (橘色主题)
- Brutalist (野兽派风格)
- Soft Pop (柔和流行色)

主题通过 Zustand store 管理，支持亮色/暗色模式切换。

### 颜色规范 - 极其重要！

**【项目核心视觉规范】涨跌盈亏的颜色标准，必须严格遵守：**

**🔴 红涨绿跌**：
- 股价上涨：`text-red-600`
- 股价下跌：`text-green-600` 
- 涨跌幅正值：红色
- 涨跌幅负值：绿色

**🔴 红盈绿亏**：
- 盈利金额：`text-red-600`
- 亏损金额：`text-green-600`
- 正收益率：红色
- 负收益率：绿色

**重要提醒**：这是中国股市的传统颜色标准，与欧美市场相反。

## 📐 开发规范

### 代码架构要求

**文件大小限制：**
- TypeScript/JavaScript: 不超过 300 行
- 每层目录文件数: 不超过 8 个

**避免的代码坏味道：**
- 僵化 (Rigidity) - 难以变更的系统
- 冗余 (Redundancy) - 重复的代码逻辑
- 循环依赖 (Circular Dependency) - 模块间相互纠缠
- 脆弱性 (Fragility) - 修改引发意外损坏
- 晦涩性 (Obscurity) - 意图不明的代码
- 数据泥团 (Data Clump) - 应组合的数据项
- 不必要的复杂性 (Needless Complexity) - 过度设计

### 组件开发规范

- 基于 Shadcn UI 进行组件开发
- 新组件放在对应功能模块的 `_components/` 目录
- 全局共享组件放在 `src/components/` 目录
- 使用 TypeScript 严格模式
- 支持响应式设计

### 数据表格规范

使用 TanStack Table 构建复杂数据表格，支持：
- 排序、过滤、分页
- 列拖拽排序
- 行拖拽排序  
- 列显示/隐藏控制

## 🔧 工具配置

### 路径别名

使用 `@/` 别名指向 `src/` 目录，在 `tsconfig.json` 中配置。

### 代码质量工具

- ESLint 和 Prettier 严格配置
- Husky git hooks 和 lint-staged
- 遵循 Next.js 15 App Router 最佳实践

### 页面结构

**仪表板页面：**
- Default (`/dashboard/default`) - 默认仪表板
- CRM (`/dashboard/crm`) - 客户关系管理
- Finance (`/dashboard/finance`) - 财务管理

**认证系统：**
- v1: `/auth/v1/login`, `/auth/v1/register`
- v2: `/auth/v2/login`, `/auth/v2/register`

**投资组合页面：**
- 多 Tab 组合切换界面
- 组合概况信息展示
- 持仓品种数据表格
- 交易记录管理界面
- 转账记录管理界面

## 📝 重要提醒

- **强制编译检查**：每次代码修改后必须 `npm run build` 通过
- **类型安全优先**：避免使用 `any`，全部定义强类型
- **代码复用原则**：开发前先检查现有实现，避免重复造轮子
- **架构质量监控**：识别代码坏味道时立即询问是否需要优化