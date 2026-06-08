# AGENTS.md

## 项目结构

- `src/app`：Next.js App Router 页面与 API Route Handlers
- `src/components`：客户端 UI 组件
- `src/lib/db`：SQLite schema、连接、仓储与 JSON 工具
- `src/lib/ai`：OpenAI client、prompt 模板、Zod schema、生成/检查/润色/抽取服务
- `src/lib/context`：Context Pack Builder
- `src/lib/retrieval`：HybridRetrievalService、VectorStore、cosine similarity
- `src/lib/characters`：角色创建与 tier 晋级逻辑
- `src/lib/graph`：三元组查询
- `src/lib/memory`：Accept Chapter 后的结构化记忆入库
- `src/lib/export`：Markdown / JSON 导出
- `scripts`：迁移和种子数据脚本

## 常用命令

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
npm test
npm run build
```

## 编码规范

- 页面不要直接调用 OpenAI，只能走 `src/lib/ai/*` 服务。
- API key 只能来自 `.env.local` 或请求头 `x-openai-api-key`，不得写入数据库或日志；OpenAI-compatible provider endpoint 通过 `OPENAI_BASE_URL` 配置。
- `generation_runs` 必须通过 `logGenerationRun` 写入，确保脱敏。
- 草稿阶段不得写入确认记忆；只有 `acceptChapter` 后才能抽取并写入 scenes、character_states、relation_triples、timeline_events、memory_chunks。
- high / critical 一致性问题存在时，不允许接受章节。
- 新的结构化模型输出必须添加 Zod schema，并经过 `structuredJsonCompletion` 校验。
- 本地数据库 schema 更新后同步考虑 seed、导出和测试。

## 测试要求

- 核心纯函数和数据库查询要优先写 Vitest 测试。
- AI 调用不要真实打到 OpenAI；测试 schema、prompt 输入或 mock 服务即可。
- 修改 Context Pack、检索、角色状态、图谱、记忆入库时必须跑：

```bash
npm test
npx tsc --noEmit
npm run build
```

## 本地数据

默认 SQLite 文件位于 `data/story-maker.sqlite`。该目录已在 `.gitignore` 中忽略。
