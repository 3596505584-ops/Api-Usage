import { describe, expect, it } from 'vitest';
import { extractAgentRunId } from './collector';

describe('Agent 来源判定', () => {
  it('从消息 extra 读取 Agent runId', () => {
    expect(extractAgentRunId({ extra: { tauritavern: { agent: { runId: 'run_abc' } } } })).toBe('run_abc');
  });

  it('常规消息返回 null', () => {
    expect(extractAgentRunId({ extra: {} })).toBeNull();
    expect(extractAgentRunId({})).toBeNull();
    expect(extractAgentRunId(null)).toBeNull();
    expect(extractAgentRunId(undefined)).toBeNull();
  });

  it('忽略空值与错误类型', () => {
    expect(extractAgentRunId({ extra: { tauritavern: { agent: { runId: '   ' } } } })).toBeNull();
    expect(extractAgentRunId({ extra: { tauritavern: { agent: { runId: 123 } } } })).toBeNull();
    expect(extractAgentRunId({ extra: { tauritavern: null } })).toBeNull();
  });

  it('去掉两端空白', () => {
    expect(extractAgentRunId({ extra: { tauritavern: { agent: { runId: ' run_x ' } } } })).toBe('run_x');
  });
});
