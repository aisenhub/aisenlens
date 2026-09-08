# P06 — Learn真实笔记与未来Create入口

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`b7c6a82`。此阶段不建立Pattern/Technique数据模型。

## Scope

提供真实Shot.notes与Scene summary聚合、筛选和回到来源的Learn页面；呈现未来Pattern/Technique/Create的准确状态。让用户能够回看已写下的理解，不能声称已经沉淀出可复用技法。

## Non-goals

不生成Pattern、不自动概括笔记、不保存新Knowledge实体、不把notes塞JSON作隐形schema；不做跨项目搜索/案例库/Storyboard/Prompt生成/云AI。无能力的按钮不弹成功提示。

## Current Files

- `apps/web/src/features/shot/types.ts`：description/notes/analysisFields。
- `apps/web/src/features/group/types.ts`：title/summary/shotIds。
- `apps/web/src/features/editor/hooks/useEditorPersistence.ts`：notes映射。
- P02 `features/editor/stores/`和selection actions，P05 `features/analysis/components/ShotInspector.tsx`、`SceneInspector.tsx`。
- `apps/web/src/features/workflow/components/{WorkflowSidebar,ProjectWorkspaceShell}.tsx`、`hooks/useWorkflowNavigation.ts`。
- `apps/web/src/components/ui/{button,tabs,input,dialog}.tsx`；不安装卡片或知识库组件。

## New Files

- `apps/web/src/features/learn/components/{LearnView,LearningSourceList,KnowledgeCapabilityState}.tsx`
- `apps/web/src/features/learn/services/deriveLearningSources.ts`
- `apps/web/src/features/workflow/components/CreateView.tsx`
- `tests/features/workflow/{learning-sources.test.ts,learn.browser.test.js}`

## Data Changes

无schema/DB。Learn只读活跃Session里的notes与group.summary，不只读旧落盘值；来源用 `{kind:shot|group,id}` 与projectId定位，可派生display title/frame range。列表数是“含笔记镜头/含摘要场景”，不是“已提取方法数”。不把描述字段自动升级为知识。

正式Pattern/Technique属于后续New Domain Required Later：需要projectId/sourceShotIds/sourceGroupIds、观察/解释/规则、来源和删除策略、备份/恢复、跨项目引用。此处不创建这些类型的空存储，以免未来实体被当前UI假数据锁死。

## Component Changes

1. Learn分“我的笔记”可用区与“方法/技法库尚未开放”紧凑说明，默认显示真实笔记。可按Shot/Scene和文字搜索，复用现有Input。
2. 每条显示项目内真实来源、范围与原文摘录；点击回Analyze明确对象，必要时滚到Interpretation/summary。返回Learn保留筛选与滚动。
3. Learn不另建笔记编辑器；“编辑原笔记”调用同一selection/navigation，让P05 Inspector负责写入。
4. ShotInspector的Learning区链接到Learn；“保存为技法”禁用并有可读说明，不能保存后只放React state或localStorage假装完成。
5. Create从Learn的次级入口打开说明页：Storyboard/拍摄镜头表/Prompt/节奏模板为Coming Soon。Export仍在Topbar可用，不能把Export按钮改成Generate。
6. 来源删除后不跳第一个镜头冒充原来源：派生列表即时移除；延迟点击旧引用显示“来源已变更，请返回列表”。缺媒体仍可读文字/持久截图。

## User Flow

在Analyze写真实笔记 → Learn看到来源与原文 → 按场景/关键词查找 → 回来源复看证据并修改 → Learn反映最新内容。访问方法库或Create时明确知道尚未开放，可返回深拆，不进入假生成流程。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | “还没有分析笔记，在深拆中记录观察与理解”；去Analyze可用 |
| Loading | 等待Session加载，不显示样例卡片或虚假计数 |
| Ready | 原文聚合和真实来源可定位，数量准确 |
| Disabled | 方法保存/创作生成不可用，显示依赖说明 |
| Error | 来源失效/会话读取失败有恢复动作，不伪造替代内容 |
| Coming Soon | Pattern/Technique/Create的真实未开放状态 |
| Experimental | 本阶段无实验生成能力，不使用该标签暗示可试用 |

## Theme Requirements

引用 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§7–10、16–22、34–35、37；impeccable以阅读原文和回证据为主任务。Cinema深中性、Studio冷灰，采用列表+section/divider，不做高饱和知识卡；蓝为来源选择，人工笔记中性，不加AI紫色来源标记。间距4/8/12/16/24，正文12–13px，数值mono，控件6px。窄屏单列可读且按钮可聚焦，禁用原因不只在hover Tooltip出现。

## Migration

替换P01 Learn占位，接同一个Session；不改notes/summary字段。Create占位内容从通用占位收敛为具体能力说明，不增加新的可用承诺。原导出/分析功能保持原位置。

## Acceptance Criteria

- [ ] 只展示真实有内容的notes/summary，统计有准确名称，未开放方法不显示假零库存证明。
- [ ] Analyze修改/撤销后Learn即时一致，reload后同源。
- [ ] 每条能定位真实Shot/Scene；来源删除或媒体缺失时安全可解释。
- [ ] 保存技法/Storyboard/Prompt均明确禁用，无假请求/假进度/假成功。
- [ ] 没有新增Project字段、表、localStorage知识记录或示例数据。
- [ ] 深浅色四尺寸和键盘返回焦点通过。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:editor-history`、`corepack pnpm build`。新增deriveLearningSources测试覆盖空/仅空白/中文/Shot与Group相同ID但不同kind/失效引用/排序稳定；browser验证来源跳转、返回筛选保留、实时编辑/撤销与禁用操作零写入。

## Manual QA

1. 无笔记项目打开Learn，去Analyze写笔记后返回。
2. Scene摘要和Shot笔记分别定位并编辑，切stage/reload核对。
3. 从Browser删除来源后访问旧列表条目，不能跳错对象。
4. 断开媒体仍读已有文字；进入Create看说明，再用Topbar真实导出。

## Regression Checklist

R06/R08/R11/R12/R13/R14/R15/R16；不改变AutoShot、Group、Template、Screenshot或原文。不存在的能力明确B/C分类，不默默遗漏也不进入本阶段实现。

## Completion Gate

原文与来源链路、无虚假能力、无隐形schema全部验证通过，进入P07。正式技法库不在此Completion Gate中，不能临时扩展任务。

## Rollback

回退Learn/Create视图即可，无数据迁移。Analyze原笔记仍在，禁止删除用户内容或将其改写成示例。
