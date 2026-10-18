/**
 * 流式 usage 注入的纯逻辑：把 stream_options.include_usage 合并进用户/预设自定义的请求体参数。
 *
 * 背景：酒馆只对 custom 源透传 custom_include_body（YAML 合并进上游请求体），
 * 且服务端 mergeObjectWithYaml 解析失败时会静默丢弃整段参数。
 * 因此这里不能做简单字符串拼接——预设完全可能把参数写成 JSON（如 `{"thinking":{"type":"disabled"}}`），
 * 在 JSON 后追加块状 YAML 会得到非法文档，导致预设自己的参数（例如关闭原生思考）一起失效。
 *
 * 规则：
 * - 空值直接写入 YAML；
 * - 顶层是 JSON/flow 对象时，用 JSON 解析后合并再序列化，保持合法；
 * - 无法安全解析的 flow 写法（非 JSON）、数组/列表、已有 stream_options、文档结束标记一律不介入；
 * - 顶层是块状映射时才允许追加 YAML 键。
 */

export const INCLUDE_USAGE_YAML = 'stream_options:\n  include_usage: true';

const INCLUDE_USAGE_OBJECT = { include_usage: true };

export type MergeIncludeUsageResult = { changed: boolean; value: string };

/** 跳过开头的空行、注释行与 YAML 文档起始标记，返回第一个内容字符的下标 */
function contentStart(text: string): number {
  let offset = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed === '---') {
      offset += line.length + 1;
      continue;
    }
    return offset + (line.length - line.trimStart().length);
  }
  return text.length;
}

function hasOwn(obj: any, key: string): boolean {
  return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 返回合并后的 custom_include_body 字符串。
 * changed=false 时调用方必须保持原值不变（宁可拿不到 usage，也不能破坏预设参数）。
 */
export function mergeIncludeUsage(raw: unknown): MergeIncludeUsageResult {
  const current = String(raw ?? '').trim();
  if (!current) return { changed: true, value: `${INCLUDE_USAGE_YAML}\n` };

  const head = current.slice(contentStart(current));
  if (!head) return { changed: false, value: current };

  // 顶层 JSON / flow 对象：解析后合并，避免在 JSON 尾部追加块状 YAML 造成整段解析失败
  if (head.startsWith('{')) {
    try {
      const parsed: any = JSON.parse(head);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { changed: false, value: current };
      }
      if (hasOwn(parsed, 'stream_options')) return { changed: false, value: current };
      parsed.stream_options = { ...INCLUDE_USAGE_OBJECT };
      return { changed: true, value: JSON.stringify(parsed) };
    } catch {
      // 真正的 YAML flow 写法（如 { thinking: { type: disabled } }）无法安全转成 JSON，放弃注入
      return { changed: false, value: current };
    }
  }

  // 数组/列表写法，追加会破坏结构
  if (head.startsWith('[') || head.startsWith('-')) return { changed: false, value: current };

  // 用户已自行配置 stream_options，或存在 YAML 文档结束标记（追加会变成第二个文档）
  if (/(^|\n)\s*stream_options\s*:/.test(current)) return { changed: false, value: current };
  if (/(^|\n)\s*\.\.\.\s*(\n|$)/.test(current)) return { changed: false, value: current };

  return { changed: true, value: `${current}\n${INCLUDE_USAGE_YAML}\n` };
}
