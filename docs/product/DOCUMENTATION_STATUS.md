# AisenLens 文档现状与事实索引

> 最后核对：2026-09-14（Asia/Shanghai）
>
> 本文是文档治理索引，不替代具体架构、运维或功能计划。它记录当前事实、各类文档的权威来源和仍未完成的验证，防止历史执行计划被误读为当前实现。

## 当前产品事实

| 范围 | 当前结论 |
| --- | --- |
| Web 发布单元 | `apps/webhome` 负责公开内容；`apps/webapp` 负责项目库、编辑器、媒体、分析和导出。两者独立构建、独立部署。 |
| 生产公开站 | [`https://lens.aisenhub.com`](https://lens.aisenhub.com)，公开页面可索引。 |
| 生产产品站 | [`https://app.lens.aisenhub.com`](https://app.lens.aisenhub.com)，产品页面保持 `noindex,nofollow,noarchive`。 |
| 本地数据 | 浏览器 IndexedDB `aisenlens-projects`，当前仓库 schema version 17。产品从未有生产项目，因此不实现旧项目迁移、旧格式兼容或跨 origin fallback。 |
| 数据清理约束 | 不调用 `indexedDB.deleteDatabase`、`localStorage.clear` 或其他清理旧 origin 数据的操作。 |
| 当前验收范围 | Web；Desktop/Mobile 目录和构建链保留，但不是当前 Web 交付的阻塞门。 |
| 当前功能边界 | 当前代码没有 Auth、登录、密码重置、Support 或 Feedback 路由；不要从历史计划中恢复这些功能。 |

## 线上只读核查

2026-09-14 通过 HTTP 只读检查了以下事实：

- `https://lens.aisenhub.com/` 返回 200、公开站标题正确，robots 为
  `index,follow,max-image-preview:large`。
- `https://lens.aisenhub.com/projects` 跳转到产品域后返回产品端 200，并保持 noindex。
- `https://app.lens.aisenhub.com/` 与 `/projects` 返回产品端 200，robots 为
  `noindex,nofollow,noarchive`。

这些检查只证明域名、路由、标题和索引边界可达，不等于完整产品验收。以下仍需真实浏览器或发布平台证据：项目创建、媒体导入、编辑器打开、刷新恢复、自动分镜、导出、真实长视频性能，以及可执行的回滚 deployment anchor。

## 文档权威顺序

遇到不同文档的路径、状态或范围描述冲突时，按以下顺序处理：

1. `AGENTS.md`：仓库级 Agent 行为和安全约束。
2. `docs/architecture/PROJECT_ARCHITECTURE.md`：当前代码架构、数据边界和依赖职责。
3. `docs/operations/OPERATIONS.md`：当前发布单元、外部平台门禁和线上验证。
4. `docs/seo/SEO_DISCOVERABILITY_PLAN.md`：公开站 SEO、索引和 canonical 事实。
5. `docs/development/DEVELOPMENT_TODO.md`：当前后续工作，不代表任务已实现。
6. `docs/features/auto-shot/README.md` 及其索引下的长期引擎文档：自动分镜生产基线与研究范围；历史实施计划位于 `docs/archive/auto-shot/`。
7. `docs/archive/**`：阶段计划和执行记录，只用于历史追溯；不得作为当前执行指令。
8. `reference-projects/**`：仅为参考项目资料，不是当前实现来源。

## 拆分执行包的当前状态

归档的 `docs/archive/chaifen/AISENLENS_WEB_SPLIT_AGENT_EXECUTION_PACKAGE/aisenlens_web_split_agent_execution/`
中的 Phase 0–4 代码拆分与本地 release gate 已完成；Phase 5 的本地数据决策已明确为
`NONE_CONFIRMED`，不执行迁移 rehearsal；公开站和产品站生产域名已经可达。Phase 6 的完整产品 smoke、发布平台回滚锚点和稳定窗口清理仍需补证，因此不能仅凭 HTTP 200 将整个 Phase 6 标记为完全通过。

该归档执行包中的 `/reset-password`、`/support`、`/feedback`、Auth 和 Supabase
allow-list 流程属于原始方案中的条件分支；它们不属于当前代码范围。原始方案中的
`apps/web`、`@aisenlens/web` 和 `apps/web/dist` 只在“拆分前基线”语境下保留，不能作为当前路径使用。

## 文档审计规则

- 本次审计扫描仓库内 86 个 Markdown/MDX 文件；本次整理后，过程性资料集中在 `docs/archive/`。
- 根 README、`docs/README.md`、架构、运维、SEO、开发待办和本索引是当前规范入口；原 Web 审计、拆分执行包、旧计划与设计提案已经归档。
- 阶段计划中的旧路径、条件分支、失败记录和历史 commit 不机械改写；它们通过“历史/参考/当前事实”边界保留证据，避免把计划重写成虚假的完成记录。
- 每次代码、路由、数据 schema 或部署状态变化时，先更新对应的权威文档，再更新本索引的日期和事实表。

## 当前待办

- 使用真实浏览器完成公开站 CTA、项目创建、媒体导入、编辑器刷新恢复、自动分镜和导出 smoke。
- 记录 webhome 与 webapp 的可回滚 production deployment ID/URL，并补齐发布平台配置核对。
- 完成分享封面图、Schema Markup Validator、Google/Bing/百度 sitemap 提交与监测。
- 继续处理已记录的编辑器保存一致性、媒体时序、性能和构建 warning 优化；完成后同步相应计划的验证记录。
