# Novel Studio AI

Local-first AI long-form fiction writing workbench with story bibles, outlines, character state, graph facts, retrieval memory, and continuity checks.

Novel Studio AI is not a simple chat UI. It is a local-first writing system designed for serialized novels and long manuscripts. The app helps writers keep story facts, character status, outline plans, style rules, and confirmed memory separate from temporary drafts, so later chapters can reuse structured context instead of relying on model chat history.

## Why This Exists

Long-form AI writing often breaks when the model forgets earlier chapters, moves characters to impossible locations, changes item ownership, revives dead characters casually, or drifts away from the intended style. This project treats each accepted chapter as a structured memory update:

```text
Plan
→ Build Context Pack
→ Draft Chapter
→ Check Continuity
→ Revise Style
→ Accept Chapter
→ Extract Memory
→ Reuse Memory in the Next Chapter
```

Drafts do not update canon. Only accepted chapters write summaries, character states, graph triples, timeline events, and memory chunks into the local SQLite database.

## Features

- Project list for multiple novels
- Story Bible generation and versioned editing
- Style Bible generation and versioned editing
- Volume outlines, five-chapter arc packs, chapter outlines, and scene beats
- Chapter Studio with Context Pack preview, draft generation, continuity check, style revision, and accept flow
- Character tiers and versioned character states
- Relation triples for graph-like story facts
- Hybrid retrieval with keyword search, graph facts, character states, recent timeline events, and local vector search
- Local SQLite persistence with `better-sqlite3`
- OpenAI-compatible API support through the official OpenAI JavaScript SDK
- Zod validation for structured model outputs
- Markdown and JSON exports
- API key handling through `.env.local` or browser `sessionStorage`

## Tech Stack

- TypeScript
- Next.js App Router
- React
- Tailwind CSS
- SQLite + better-sqlite3
- OpenAI official JavaScript SDK
- Zod
- Vitest

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Key

You can provide an API key in either of these ways:

1. Add it to `.env.local`:

```bash
OPENAI_API_KEY=your-provider-api-key
```

2. Enter it on the project Settings page. The browser-side key is stored only in `sessionStorage` and sent to local API routes through the `x-openai-api-key` request header.

API keys are not stored in SQLite and are redacted before generation logs are written.

### DeepSeek / OpenAI-Compatible Providers

For DeepSeek or another OpenAI-compatible provider, configure:

```bash
OPENAI_API_KEY=your-provider-api-key
OPENAI_BASE_URL=https://api.deepseek.com
DEFAULT_MODEL=deepseek-v4-pro
EMBEDDING_MODEL=local-hash
```

Use the exact model and base URL from your provider documentation.

## Writing Workflow

The recommended flow is:

1. Create a novel project.
2. Generate and review the Story Bible.
3. Generate and review the Style Bible.
4. Generate a volume outline.
5. Generate a five-chapter arc pack.
6. Generate a chapter outline.
7. Generate Scene Beats.
8. Open Chapter Studio and review the Context Pack.
9. Generate the chapter draft.
10. Run the continuity check.
11. Revise style or edit manually.
12. Run the continuity check again after any edits.
13. Accept the chapter.
14. Continue with the next chapter.

When the current five-chapter arc pack is complete, generate the next arc pack and repeat the loop.

## Context Pack

Before drafting a chapter, the backend builds a Context Pack containing:

- Story Bible
- Style Bible
- Current volume outline
- Current five-chapter arc pack
- Current chapter outline
- Scene Beats
- Latest three accepted chapter summaries
- Previous chapter ending excerpt
- Active character states
- Relation triples
- Retrieved memory chunks
- Recent timeline events
- Forbidden contradictions
- Fact priority rules

This keeps chapter generation grounded in confirmed project memory.

## Privacy and Local Data

This project is local-first:

- SQLite data is stored locally under `data/`.
- `.env.local` is ignored by git.
- API keys are not written to the database.
- `generation_runs` redacts API key-like fields.
- The default vector store is local and brute-force over JSON embeddings.
- No external database, Firebase, Supabase, Pinecone, Neo4j, or hosted vector service is required.

Files intentionally ignored before publishing:

- `.env.local`
- `data/`
- `.next/`
- `node_modules/`
- local IDE files
- local planning/session notes

## Commands

```bash
npm run dev        # Start the local dev server
npm run build      # Build the Next.js app
npm test           # Run Vitest tests
npm run db:migrate # Initialize or migrate the SQLite schema
npm run db:seed    # Create a sample fantasy novel project
```

## Exports

The project supports exporting:

- Single chapter Markdown
- Full book Markdown
- Story Bible JSON
- Character Bible JSON
- Graph Triples JSON
- Project Backup JSON

Example API routes:

```text
/api/projects/:id/export?type=chapter&chapterId=:chapterId
/api/projects/:id/export?type=book
/api/projects/:id/export?type=story-bible
/api/projects/:id/export?type=characters
/api/projects/:id/export?type=graph
/api/projects/:id/export?type=backup
```

## Test Coverage

Current tests cover:

- cosine similarity
- Context Pack recent summaries
- continuity checker schema for dead character conflicts
- memory extraction schema validation
- character tier promotion
- relation triple validity windows
- API key redaction in generation logs
- pacing checks for five-chapter arc packs
- project workflow next-step calculation
- chapter acceptance gate

## MVP Notes

- Graph visualization is table-first in the MVP.
- Embeddings can fall back to local hash embeddings.
- Vector retrieval is implemented with SQLite JSON arrays and TypeScript cosine similarity.
- Continuity checking combines model output with local hard rules.
- Draft, continuity check, style revision, and memory extraction are separate steps by design.

---

# Novel Studio AI 中文说明

Novel Studio AI 是一个本地优先的 AI 长篇小说创作工作台。它不是普通聊天界面，而是围绕“设定圣经 + 文风圣经 + 大纲系统 + 角色状态表 + 三元组图谱 + 检索记忆 + 最近三章上下文 + 一致性检查”组织长篇连载写作。

## 项目简介

这个项目用于解决 AI 写长篇时常见的问题：遗忘前文、人物状态错乱、道具归属混乱、死亡角色随意行动、角色知道不该知道的信息，以及文风越写越飘。

系统不会依赖模型聊天上下文记整本书。每章写完后，只有在用户点击“接受章节”后，系统才会把摘要、角色状态、三元组事实、时间线事件和记忆片段结构化写入本地 SQLite。下一章生成前，系统会重新组装 Context Pack。

## 中文快速开始

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## API Key 设置

支持两种方式：

1. 在 `.env.local` 中设置：

```bash
OPENAI_API_KEY=你的供应商 API key
```

2. 在项目设置页临时输入。前端输入的 key 只保存在浏览器 `sessionStorage`，不会写入数据库。

DeepSeek 示例：

```bash
OPENAI_API_KEY=你的 DeepSeek API key
OPENAI_BASE_URL=https://api.deepseek.com
DEFAULT_MODEL=deepseek-v4-pro
EMBEDDING_MODEL=local-hash
```

## 中文写作流程

推荐流程：

1. 创建小说项目。
2. 生成 Story Bible。
3. 生成 Style Bible。
4. 生成卷大纲。
5. 生成五章剧情包。
6. 生成章节细纲。
7. 生成 Scene Beats。
8. 到 Chapter Studio 查看 Context Pack。
9. 生成正文草稿。
10. 运行一致性检查。
11. 文风润色或手动修改。
12. 修改后再次运行一致性检查。
13. 接受章节并入库记忆。
14. 继续下一章。

五章包写完后，再生成下一个五章包，持续循环到目标字数。

## 隐私说明

发布到 GitHub 前请确认：

- 不提交 `.env.local`
- 不提交 `data/`
- 不提交 `.next/`
- 不提交 `node_modules/`
- 不提交本地 IDE 配置和个人工作记录

当前 `.gitignore` 已包含这些规则。

## GitHub 建议信息

推荐仓库名：

```text
novel-studio-ai
```

推荐简介：

```text
Local-first AI long-form fiction writing workbench with story bibles, outlines, character state, graph facts, retrieval memory, and continuity checks.
```
