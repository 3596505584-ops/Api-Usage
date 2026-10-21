# API 用量统计

> 本仓库的多平台修改版位于 **dev 分支**。酒馆安装时填写本仓库地址，并将分支设为 `dev`。
> [下载修改版 ZIP](https://github.com/3596505584-ops/Api-Usage/archive/refs/heads/dev.zip) · [查看修改版源码](https://github.com/3596505584-ops/Api-Usage/tree/dev)

> SillyTavern 扩展：为 DeepSeek 与兼容接口记录每一次调用的 Token、费用、缓存与响应表现。

自动记录请求数据，提供**用量概览、多维统计、历史明细、趋势预测与多钱包管理**。纯前端本地运行，历史与设置默认只保存在本机。

[使用文档](https://janmk1453.github.io/Api-Usage/) · [安装](#安装) · [隐私声明](https://janmk1453.github.io/Api-Usage/#privacy) · [问题反馈](https://github.com/janmk1453/Api-Usage/issues)

## 界面预览

[![用量概览](docs/images/overview.png)](docs/images/overview.png)

<p align="center"><sub>用量概览 · 余额与消费、Token 构成、8 项指标、近两年热力图与按对话统计</sub></p>

<table width="100%">
  <tr>
    <td width="50%" align="center"><a href="docs/images/stats-summary.png"><img src="docs/images/stats-summary.png" alt="用量统计 · 汇总" width="100%"></a></td>
    <td width="50%" align="center"><a href="docs/images/stats-charts.png"><img src="docs/images/stats-charts.png" alt="用量统计 · 图表" width="100%"></a></td>
  </tr>
  <tr>
    <td width="50%" align="center"><sub><b>用量统计 · 汇总</b><br>五维筛选、模型汇总与自定义图表</sub></td>
    <td width="50%" align="center"><sub><b>用量统计 · 图表</b><br>缓存命中、请求数、耗时/速率与模型占比</sub></td>
  </tr>
</table>

<table width="100%">
  <tr>
    <td width="50%" align="center"><a href="docs/images/history.png"><img src="docs/images/history.png" alt="历史记录" width="100%"></a></td>
    <td width="50%" align="center"><a href="docs/images/forecast.png"><img src="docs/images/forecast.png" alt="趋势预测" width="100%"></a></td>
  </tr>
  <tr>
    <td width="50%" align="center"><sub><b>历史记录</b><br>逐次调用明细、缓存断点对比与四类原始数据详情</sub></td>
    <td width="50%" align="center"><sub><b>趋势预测</b><br>下一轮用量与成本、压缩点、余额与上下文可支撑轮数</sub></td>
  </tr>
</table>

## 核心功能

- **用量概览**：充值余额、累计消费、Token 构成、每轮均值、近两年热力图，以及按对话汇总的轮次、费用与命中率。
- **用量统计**：按时间、模型、对话、接入类型和 API 密钥五维筛选，查看消费、请求数、模型汇总，并用自定义图表与 6 张固定图表比较不同模型和时段的表现。
- **历史记录**：逐条查看 Token、费用、耗时、速率与缓存占比；详情窗口提供请求参数、完整响应、Raw 用量与消息内容，并支持新旧记录缓存断点对比。
- **趋势预测**：以单个对话为单位拟合输入、输出、成本与命中率，给出下一轮预估与 95% 区间、上下文压缩点、余额/上下文可支撑轮数、模型效率与能耗评分。
- **多钱包**：按接入地址自动建立钱包，分别管理余额、密钥标识、模型价格与峰谷规则；支持手工余额、DeepSeek/OpenRouter/硅基流动/Moonshot 余额查询，以及自定义 JSON 接口。
- **计价与数据**：内置 DeepSeek 官方峰谷价与 2024–2026 中国法定节假日；支持 models.dev 价格同步、历史/钱包导入导出与 WebDAV 合并同步。
- **Agent 模式（TauriTavern）**：在 [TauriTavern](https://github.com/Darkatse/TauriTavern) 下自动采集 Agent 模式的模型用量，一次运行记一条历史，并在历史行标注来源为 `Agent` 或 `常规`。

## 多平台余额与实际费用

进入「钱包」展开对应接入，在「余额来源」选择自动识别、平台或自定义接口，保存该平台的校准密钥后点击「立即查询」。定时查询需要同时开启钱包的自动校准和设置中的总开关。新接入会在首次对话后自动建立钱包。

| 来源 | 余额 / 用量口径 | 密钥要求 |
| --- | --- | --- |
| DeepSeek | 账户余额（CNY/USD） | 官方 API Key |
| OpenRouter 账户 | total_credits − total_usage；显示账户累计消费（USD） | 管理密钥；403 时会提示切换 |
| OpenRouter 密钥 | 当前密钥累计消费、剩余限额；不覆盖账户余额 | 普通 API Key |
| 硅基流动（中国站） | totalBalance（CNY，含赠金与充值） | 官方 API Key |
| Moonshot 中国 / 国际 | available_balance（分别为 CNY / USD） | 对应站点 API Key |
| 自定义 JSON | 可配置余额、累计消费、总额度字段与金额乘数 | Bearer 或 x-api-key |

自定义示例：查询地址填 "https://api.example.com/balance"，响应为 "{"data":{"balance":8000,"used":2000}}" 时，余额字段填 "data.balance"，已用金额填 "data.used"，若单位为分则乘数填 "0.01"。也支持 "data.items[0].balance"；如响应给出总额度，可填写总额度与已用字段来相减。仅支持 GET JSON，不执行用户脚本。查询地址不能含账号密码、查询参数或片段；默认要求 HTTPS，本机开发服务可用 HTTP。

常规对话响应中的 "usage.cost" 优先作为实际总费用：自动识别 OpenRouter 的 USD 或明确的 "cost_currency: CNY/USD"；其他平台可在钱包的「usage.cost 计费」指定币种或关闭。没有费用字段时继续按钱包模型价格估算。实际费用保存记录时汇率，历史重算不会覆盖；仅返回总价时输入/输出费用不拆分，在明细中标为「未提供拆分」。TauriTavern Agent 通道沿用其原有按回合模型价格估算方式。

平台账户累计消费包含其他客户端的使用，独立于本插件记录的消费；不会把它补写为本机请求历史。余额耗尽、查询失败、无限密钥额度各自保留真实口径。浏览器直接查询需要平台允许 CORS；不支持的来源可使用手工余额，或自建允许跨域的 JSON 查询服务。

校准密钥与查询地址在本地绑定，密钥不导出、不同步；切换平台或地址后需重新保存对应密钥。官方接口参考：[OpenRouter 余额](https://openrouter.ai/docs/api/api-reference/credits/get-credits)、[OpenRouter 密钥](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key)、[DeepSeek 余额](https://api-docs.deepseek.com/api/get-user-balance/)、[硅基流动](https://siliconflow.readme.io/reference/user-info)、[Moonshot 中国](https://platform.kimi.com/docs/api/balance)、[Moonshot 国际](https://platform.kimi.ai/docs/api/balance)。

## TauriTavern Agent 模式

扩展会自动识别 [TauriTavern](https://github.com/Darkatse/TauriTavern) 宿主（`window.__TAURITAVERN__`），并额外采集 Agent 模式的用量：

- **数据来源**：Agent 的模型调用发生在宿主后端，前端没有请求可拦，因此改用宿主公开 ABI `api.agent.readModelTurn().provider.usage` 逐回合读取用量，再用 `listRuns` / `readEvents` 对账补采。
- **记录口径**：一次 Run 记一条历史，跨 Invocation（主 Agent 与子 Agent）与多轮模型调用聚合；Token 与费用是各回合之和，耗时是各回合模型净耗时之和。
- **来源标注**：历史记录的模型名前显示 `Agent` 或 `常规` 徽标，鼠标悬停可看到 Agent 运行的模型回合数与终态；不新增任何面板、页签或设置项。
- **隐私边界**：只读取用量数值与模型名，不采集提示词正文、工具参数或工具结果。
- **降级行为**：上游原版 SillyTavern 没有该接口，扩展不安装 Agent 通道，记录方式与本扩展之前完全一致。

如需临时关闭 Agent 采集，可在控制台执行 `localStorage.setItem('aus_agent_capture','0')`，恢复时执行 `localStorage.removeItem('aus_agent_capture')`。

## 安装

需要 SillyTavern **1.11.0** 及以上。

1. 打开酒馆「扩展程序 → 安装扩展程序」，粘贴下列仓库地址，并将分支填写为 `dev` 后安装：

   ```text
   https://github.com/3596505584-ops/Api-Usage
   ```

2. 刷新页面，在魔法棒菜单中打开「API 用量统计」。
3. 正常对话即可自动记录；如已有旧版数据，可在概览页导入。

更新本修改版时请选择 `dev` 分支；`main` 保留原版。也可在管理扩展程序中更新后刷新页面。

## 隐私与数据

本扩展是纯前端、本地运行的开源项目（MIT）。历史、设置、钱包配置保存在本机；钱包校准密钥与 WebDAV 密码仅经 XOR 混淆后本地保存，不参与导出与云同步。

默认开启的匿名使用统计只上报匿名标识、扩展版本、酒馆版本（TauriTavern 宿主下另含 TauriTavern 版本号）、浏览器环境分桶、页面使用次数、会话时长与渲染耗时分桶，**不含对话内容、模型名、密钥、余额、费用与接口地址**，可在「设置 → 匿名使用统计」随时关闭并重置匿名标识。完整字段、请求域名与保留期见[隐私声明](https://janmk1453.github.io/Api-Usage/#privacy)。

## 构建

```bash
npm install
npm run typecheck && npm test
npm run build && node --check index.js
npm run verify:ci
```

构建产物需一并提交：`index.js`、动态分包与 `style.css`。

## 致谢

部分实现参考了 [cone97218-alt/ds](https://github.com/cone97218-alt/ds)，在此致谢。

## 许可证

[MIT](LICENSE)
