import { describe, expect, it } from 'vitest';
import { INCLUDE_USAGE_YAML, mergeIncludeUsage } from './include-usage';

describe('mergeIncludeUsage', () => {
  it('空值直接写入 stream_options', () => {
    const r = mergeIncludeUsage('');
    expect(r.changed).toBe(true);
    expect(r.value).toBe(`${INCLUDE_USAGE_YAML}\n`);
  });

  it('块状 YAML 映射保持原内容并追加', () => {
    const r = mergeIncludeUsage('thinking: disabled');
    expect(r.changed).toBe(true);
    expect(r.value).toContain('thinking: disabled\n');
    expect(r.value).toContain(INCLUDE_USAGE_YAML);
  });

  it('方法4 的 JSON 参数被解析合并而不是拼接', () => {
    const r = mergeIncludeUsage('{"thinking":{"type":"disabled"}}');
    expect(r.changed).toBe(true);
    expect(JSON.parse(r.value)).toEqual({
      thinking: { type: 'disabled' },
      stream_options: { include_usage: true },
    });
  });

  it('方法3 的嵌套 JSON 参数同样保持合法', () => {
    const raw = '{"providerOptions": {"gateway": {"only": ["deepseek"]}, "deepseek": {"thinking": {"type": "disabled"}}}}';
    const r = mergeIncludeUsage(raw);
    expect(r.changed).toBe(true);
    const parsed = JSON.parse(r.value);
    expect(parsed.providerOptions.deepseek.thinking.type).toBe('disabled');
    expect(parsed.stream_options).toEqual({ include_usage: true });
  });

  it('JSON 前有注释或文档起始标记时仍能合并', () => {
    const r = mergeIncludeUsage('# 关闭原生思考\n---\n{"thinking":{"type":"disabled"}}');
    expect(r.changed).toBe(true);
    expect(JSON.parse(r.value)).toEqual({
      thinking: { type: 'disabled' },
      stream_options: { include_usage: true },
    });
  });

  it('JSON 已有 stream_options 时不介入', () => {
    const raw = '{"thinking":{"type":"disabled"},"stream_options":{"include_usage":false}}';
    const r = mergeIncludeUsage(raw);
    expect(r.changed).toBe(false);
    expect(r.value).toBe(raw);
  });

  it('非 JSON 的 flow 写法不注入，保留原值', () => {
    const raw = '{ thinking: { type: disabled } }';
    const r = mergeIncludeUsage(raw);
    expect(r.changed).toBe(false);
    expect(r.value).toBe(raw);
  });

  it('数组或列表写法不注入', () => {
    for (const raw of ['[{"thinking": {"type": "disabled"}}]', '- thinking: disabled']) {
      const r = mergeIncludeUsage(raw);
      expect(r.changed).toBe(false);
      expect(r.value).toBe(raw);
    }
  });

  it('已有 stream_options 的块状 YAML 不重复注入', () => {
    const raw = 'thinking: disabled\nstream_options:\n  include_usage: false';
    const r = mergeIncludeUsage(raw);
    expect(r.changed).toBe(false);
    expect(r.value).toBe(raw);
  });

  it('存在 YAML 文档结束标记时不追加出第二个文档', () => {
    const raw = 'thinking: disabled\n...';
    const r = mergeIncludeUsage(raw);
    expect(r.changed).toBe(false);
    expect(r.value).toBe(raw);
  });
});
