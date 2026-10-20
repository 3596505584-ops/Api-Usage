import type { HistoryConnection } from '../services/connection-identity';

/** Agent 模式一次 Run 的终态 */
export type AgentRunStatus = 'completed' | 'partial_success' | 'cancelled' | 'failed';

/** 单个模型回合（一次真实计费的模型调用） */
export type AgentTurnDetail = {
  round: number;
  invocationId: string;
  model: string;
  source: string | null;
  providerFormat: string | null;
  /** 归一化后的 token 口径 */
  hit: number;
  miss: number;
  comp: number;
  total: number;
  think: number;
  /** 该回合模型净耗时（model_completed − model_request_created） */
  durationMs: number;
  timestamp: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  priceType: string;
  pricingSource: string;
  walletId: string | null;
  /** provider 原始 usage（供 Raw Usage 页签查看，不含正文） */
  rawUsage?: unknown;
};

/** 一次 Run 内按钱包拆分的用量，供多钱包扣减与重算 */
export type AgentWalletShare = {
  walletId: string | null;
  timestamp: number;
  model: string;
  hit: number;
  miss: number;
  comp: number;
  total: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  priceType: string;
  pricingSource: string;
};

/** 采集层 → 仓储层的写入载荷：一次 Run = 一条历史 */
export type AgentRunEntryInput = {
  agentRunId: string;
  /** Run 创建时间 */
  timestamp: number;
  model: string;
  hit: number;
  miss: number;
  comp: number;
  total: number;
  thinkTokens: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  priceType: string;
  pricingSource: string;
  duration: number;
  walletId: string | null;
  walletShares: AgentWalletShare[];
  turns: AgentTurnDetail[];
  connection: HistoryConnection | null;
  chatId: string | null;
  chatName: string | null;
  status: AgentRunStatus;
  profileId: string | null;
  modelTurns: number;
  invocationCount: number;
  stableChatId: string | null;
  messageIndex: number | null;
  generationType: string | null;
  committed: boolean;
  partial: boolean;
  wallClockMs: number;
  fullRequest: unknown;
};
