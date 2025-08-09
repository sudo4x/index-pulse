import {
  ShoppingBag,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Gauge,
  GraduationCap,
  TrendingUp,
  PieChart,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "仪表板",
    items: [
      {
        title: "默认",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "财务",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        title: "分析",
        url: "/dashboard/analytics",
        icon: Gauge,
        comingSoon: true,
      },
      {
        title: "电商",
        url: "/dashboard/e-commerce",
        icon: ShoppingBag,
        comingSoon: true,
      },
      {
        title: "学院",
        url: "/dashboard/academy",
        icon: GraduationCap,
        comingSoon: true,
      },
      {
        title: "物流",
        url: "/dashboard/logistics",
        icon: Forklift,
        comingSoon: true,
      },
    ],
  },
  {
    id: 2,
    label: "投资管理",
    items: [
      {
        title: "投资组合",
        url: "/investment/portfolios",
        icon: PieChart,
        isNew: true,
      },
    ],
  },
  {
    id: 3,
    label: "页面",
    items: [
      {
        title: "邮件",
        url: "/mail",
        icon: Mail,
        comingSoon: true,
      },
      {
        title: "聊天",
        url: "/chat",
        icon: MessageSquare,
        comingSoon: true,
      },
      {
        title: "日历",
        url: "/calendar",
        icon: Calendar,
        comingSoon: true,
      },
      {
        title: "看板",
        url: "/kanban",
        icon: Kanban,
        comingSoon: true,
      },
      {
        title: "发票",
        url: "/invoice",
        icon: ReceiptText,
        comingSoon: true,
      },
      {
        title: "用户",
        url: "/users",
        icon: Users,
        comingSoon: true,
      },
      {
        title: "角色",
        url: "/roles",
        icon: Lock,
        comingSoon: true,
      },
      {
        title: "认证",
        url: "/auth",
        icon: Fingerprint,
        subItems: [
          { title: "登录", url: "/auth/v1/login", newTab: true },
          { title: "注册", url: "/auth/v1/register", newTab: true },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "其他",
    items: [
      {
        title: "其他",
        url: "/others",
        icon: SquareArrowUpRight,
        comingSoon: true,
      },
    ],
  },
];
