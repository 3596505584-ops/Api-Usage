export type HistoryEntry = {
  timestamp: number;
  model: string;
  /** 模型原始名称；仅在与规范化名称不同时保留 */
  rawModel?: string | null;
  /** 内部请求关联标识，用于合并 fetch 与生成结束双路径 */
  requestId?: string | null;
  prompt_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  cost: number;
  /** 平台实扣总价及记录时汇率；独立保存以免重算覆盖或汇率变动 */
  reportedCost?: { amount: number; currency: 'USD' | 'CNY'; exchangeRate: number };
  cache_hit_rate: number;
  priceType: string;
  raw_usage?: unknown;
  messages?: unknown[];
  fullRequest?: unknown;
  fullResponse?: unknown;
  duration?: number;
  tokenRate?: number;
  ttft?: number;
  /** 本轮是否为真实流式；false 表示非流式或上游一次性返回，速率与 TTFT 均不可信 */
  streamed?: boolean | null;
  thinkTime?: number;
  thinkTokens?: number;
  /** SSE 最后一个非 null 的 choices[0].finish_reason；非正常结束（length / content_filter / sensitive 等）视为截断 */
  finishReason?: string | null;
  isTruncated?: boolean;
  chatId?: string | null;
  chatName?: string | null;
  /** 酒馆接入类型，对应 chat_completion_source */
  sourceType?: string | null;
  /** 接入地址的本地短哈希；旧记录为空 */
  endpointId?: string | null;
  /** 规范化后的接入地址；官方接口使用明确名称 */
  endpointLabel?: string | null;
  /** 酒馆密钥条目的本地稳定标识；未识别时为空 */
  credentialId?: string | null;
  /** 不包含明文密钥的展示名称 */
  credentialLabel?: string | null;
  /** 请求归属的钱包标识；旧记录为空 */
  walletId?: string | null;
  /** 本次费用的计价来源 */
  pricingSource?: 'api' | 'wallet' | 'builtin' | 'legacy' | 'legacy-unassigned' | 'legacy-match' | 'unpriced';
  /** 旧数据同名校验价来源钱包；仅迁移时写入，新请求不写 */
  legacyPricingWalletId?: string | null;
  /** 旧数据同名校验价来源模型名 */
  legacyPricingModel?: string | null;

  // ---- 记录来源（可选，缺省即常规对话；旧记录不迁移） ----
  /** 记录来源：常规对话 / TauriTavern Agent 模式；无值等同 'chat' */
  origin?: 'chat' | 'agent';
  /** Agent 模式 Run 标识；有值时作为唯一幂等键 */
  agentRunId?: string | null;
  agentProfileId?: string | null;
  /** Run 终态：completed / partial_success / cancelled / failed */
  agentStatus?: string | null;
  /** 实际参与计费的模型回合数 */
  agentModelTurns?: number | null;
  /** 含子 Agent 的 Invocation 数 */
  agentInvocationCount?: number | null;
  /** TauriTavern 稳定聊天 ID（重命名不变） */
  agentStableChatId?: string | null;
  /** 最后一次提交所在的聊天楼层 */
  agentMessageIndex?: number | null;
  /** 生成类型：normal / regenerate / swipe … */
  agentGenerationType?: string | null;
  /** 是否有内容提交到聊天（失败/取消可能为 false） */
  agentCommitted?: boolean | null;
  /** 采集是否不完整（超时、回合读取失败、事件截断） */
  agentPartial?: boolean | null;
  /** 耗时口径来源 */
  agentTimingSource?: 'events' | null;
};

export type Save = {
  name: string;
  character: string;
  startTime: number;
  _mtime?: number;
  total_tokens: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  input_cost: number;
  output_cost: number;
  rounds: number;
  history: HistoryEntry[];
  customBalance?: string | null;
};
