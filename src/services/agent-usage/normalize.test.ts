import { describe, expect, it } from 'vitest';
import {
  applyUsageChunk,
  createStreamUsageState,
  normalizeUsage,
  streamUsageToUsage,
  toOpenAIUsage,
} from './normalize';

describe('normalizeUsage', () => {
  it('读取 DeepSeek / OpenAI 兼容形状（命中与未命中分列）', () => {
    const usage = normalizeUsage({
      prompt_tokens: 1200,
      prompt_cache_hit_tokens: 900,
      prompt_cache_miss_tokens: 300,
      completion_tokens: 80,
      total_tokens: 1280,
    });
    expect(usage).toEqual({
      prompt_tokens: 1200,
      cache_hit_tokens: 900,
      cache_miss_tokens: 300,
      completion_tokens: 80,
      total_tokens: 1280,
      think_tokens: 0,
    });
  });

  it('读取 TauriTavern 归一后的 prompt_tokens_details.cached_tokens', () => {
    const usage = normalizeUsage({
      prompt_tokens: 1000,
      completion_tokens: 20,
      total_tokens: 1020,
      prompt_tokens_details: { cached_tokens: 700 },
    });
    expect(usage).toMatchObject({ cache_hit_tokens: 700, cache_miss_tokens: 300, total_tokens: 1020 });
  });

  it('处理 Anthropic 原生形状（input_tokens 不含缓存读写）', () => {
    const usage = normalizeUsage({
      input_tokens: 100,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 700,
      output_tokens: 50,
    });
    expect(usage).toEqual({
      prompt_tokens: 1000,
      cache_hit_tokens: 700,
      cache_miss_tokens: 300,
      completion_tokens: 50,
      total_tokens: 1050,
      think_tokens: 0,
    });
  });

  it('处理 Gemini usageMetadata', () => {
    const usage = normalizeUsage({
      usageMetadata: {
        promptTokenCount: 1000,
        candidatesTokenCount: 40,
        totalTokenCount: 1040,
        cachedContentTokenCount: 300,
      },
    });
    expect(usage).toMatchObject({ prompt_tokens: 1000, cache_hit_tokens: 300, cache_miss_tokens: 700, completion_tokens: 40 });
  });

  it('处理 OpenAI Responses 形状', () => {
    const usage = normalizeUsage({
      input_tokens: 500,
      output_tokens: 30,
      total_tokens: 530,
      input_tokens_details: { cached_tokens: 100 },
    });
    expect(usage).toMatchObject({ cache_hit_tokens: 100, cache_miss_tokens: 400, completion_tokens: 30 });
  });

  it('取思维链 token，且不超过输出 token', () => {
    expect(normalizeUsage({
      prompt_tokens: 10,
      completion_tokens: 100,
      total_tokens: 110,
      completion_tokens_details: { reasoning_tokens: 60 },
    })?.think_tokens).toBe(60);
    expect(normalizeUsage({
      prompt_tokens: 10,
      completion_tokens: 20,
      completion_tokens_details: { reasoning_tokens: 999 },
    })?.think_tokens).toBe(20);
  });

  it('缺失或全 0 的 usage 返回 null（不得写入 0 token 条目）', () => {
    expect(normalizeUsage(null)).toBeNull();
    expect(normalizeUsage(undefined)).toBeNull();
    expect(normalizeUsage({})).toBeNull();
    expect(normalizeUsage({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })).toBeNull();
    expect(normalizeUsage('nope')).toBeNull();
  });
});

describe('toOpenAIUsage', () => {
  it('合成扩展内部使用的 OpenAI 形状并保留原始 usage', () => {
    const normalized = normalizeUsage({ prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 40 })!;
    const usage = toOpenAIUsage(normalized, { prompt_tokens: 100 });
    expect(usage.prompt_tokens).toBe(100);
    expect(usage.prompt_cache_hit_tokens).toBe(40);
    expect(usage.prompt_cache_miss_tokens).toBe(60);
    expect(usage.prompt_tokens_details).toEqual({ cached_tokens: 40 });
    expect(usage.__raw).toEqual({ prompt_tokens: 100 });
  });
});

describe('流式累计器', () => {
  it('合并 Anthropic message_start 与 message_delta', () => {
    const state = createStreamUsageState();
    applyUsageChunk(state, {
      type: 'message_start',
      message: { model: 'claude-3', usage: { input_tokens: 100, cache_read_input_tokens: 900, output_tokens: 1 } },
    });
    applyUsageChunk(state, { type: 'message_delta', usage: { output_tokens: 42 } });
    const usage = streamUsageToUsage(state);
    expect(usage).toMatchObject({ prompt_tokens: 1000, prompt_cache_hit_tokens: 900, prompt_cache_miss_tokens: 100, completion_tokens: 42 });
    expect(state.model).toBe('claude-3');
  });

  it('从 Gemini 流帧读取 usageMetadata', () => {
    const state = createStreamUsageState();
    applyUsageChunk(state, { modelVersion: 'gemini-2.5', usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 10, cachedContentTokenCount: 50 } });
    expect(streamUsageToUsage(state)?.total_tokens).toBe(210);
  });

  it('只认最后一帧的 OpenAI usage', () => {
    const state = createStreamUsageState();
    applyUsageChunk(state, { choices: [{ delta: { content: 'x' } }], model: 'deepseek-chat' });
    expect(streamUsageToUsage(state)).toBeNull();
    applyUsageChunk(state, { choices: [], usage: { prompt_tokens: 30, completion_tokens: 7, total_tokens: 37 } });
    expect(streamUsageToUsage(state)?.prompt_tokens).toBe(30);
  });
});
