import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "IndexPulse",
  version: packageJson.version,
  copyright: `© ${currentYear}, IndexPulse.`,
  meta: {
    title: "IndexPulse - 指数投资和跟踪系统",
    description: "IndexPulse 是一个个人使用的指数投资和跟踪系统，包含指数数据、指标的跟踪与分析，以及投资组合的管理。",
  },
};
