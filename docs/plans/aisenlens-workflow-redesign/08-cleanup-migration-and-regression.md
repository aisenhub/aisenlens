# P08 — 入口清理、文档同步与最终回归

状态：可执行规划，未实施。依赖P07；本轮重构的发布门禁，仅Web。

## Scope

删除已经由新工作流替代的旧一级入口与过渡宿主；核对唯一状态/保存/媒体owner；更新架构文档和TODO；完成跨阶段数据、性能、主题、无障碍回归及回滚演练。

## Non-goals

不删用户数据、IndexedDB stores或未确认废弃格式reader；不顺手重构账号/算法/引擎/原生端，不实现Coming Soon功能；不恢复废弃预览，不为了消除warning安装工具或大量依赖。

## Current Files

- `apps/web/src/features/editor/components/EditorWorkspace.tsx`：残留工具栏/旧Inspector/旧列表/过渡参数/DOM。
- `apps/web/src/features/workflow/`、`features/editor/session/`、`features/editor/stores/`和P03–07全部新增组合视图。
- `apps/web/src/app/{App,AppPages}.tsx`、`pages/EditorPage.tsx`、`index.css`。
- `apps/web/src/features/editor/shortcuts/definitions.ts`、`hooks/useEditorSaveState.ts`、`useEditorPersistence.ts`。
- `apps/web/src/features/project/services/{projectRepository,projectRecoveryService,projectBackupService}.ts`：只核对数据契约，不清理旧格式。
- `apps/web/test/`、`tests/features/workflow/`、`scripts/verify-web.mjs`、根及Web `package.json`。
- `docs/PROJECT_ARCHITECTURE.md`、`docs/DEVELOPMENT_TODO.md`、`docs/WEB_AUDIT_2026-09-07.md`、`docs/auto-shot/REGRESSION_CONTRACT.md`、`reference-projects/REFERENCE_PROJECT_INDEX.md`。

## New Files

- `tests/features/workflow/workflow-end-to-end.browser.test.js`
- `docs/plans/aisenlens-workflow-redesign/verification-record.md`：实施阶段的真实结果/版本/环境/失败；本次规划不提前填通过。

如果需统一新测试runner，放`scripts/`且只调用真实存在的tests。现有Node核心测试不为目录整齐而搬家。

## Data Changes

无schema/persistence变化。验收v15数据按迁移前后原值对比：project媒体/音轨/overlay、shot ID/range/fields/notes/screenshots/detection、group、marker、template、task/checkpoint/review、recovery。UI-only stage/selection不进入备份格式。

对主动Split/Merge/Apply产生的变化按现有业务规则单独验，不把它们混入“打开后无损”的测试。普通备份ZIP v2不包含task/研究标定/原媒体，恢复快照不包含独立Blob拷贝；验收记录必须注明。

## Component Changes

1. 搜索旧tool ids/Panel枚举/旧一级按钮和P01隐藏Editor策略，确认对应新入口已真实可用后删除。保留有消费者的基础组件与业务函数，不以文件名“旧”判断可删。
2. EditorWorkspace应只剩Analyze组合；必要时直接用AnalyzeWorkspace替代其入口并删除无消费者文件。App只保留结构/路由/provider/init，不承接被移出的业务。
3. 确认ProjectTopBar中rename/save/undo/redo/export的唯一callbacks；所有页面共享Session与task，只有一处popstate/退出守卫、一处保存协调、一组媒体生命周期。
4. 删除已失效CSS定位（如64px旧工具栏偏移）、旧重复内容和临时导航占位；保留真实Coming Soon的Pattern/Create说明。
5. 更新架构/TODO时标清完成与后续Domain，不照搬旧审计的已修复项；保留历史审计记录，不将未执行browser验证写成通过。

## User Flow

新建 → 导入 → 扫描 → 复核 → 应用 → 总览 → 手工Scene → Shot证据/事实/笔记 → Learn回看 → 导出 → 返回项目库 → reload重开继续。任意阶段均可返回先前阶段，退出保存失败可恢复；未来Create只显示准确状态。

## UI States

| 状态 | 最终核对 |
|---|---|
| Empty | 新项目/无Scene/无笔记/无音轨均有正确入口 |
| Loading | 真实任务/读取/证据加载，不能用占位阶段假进度 |
| Ready | 可用阶段都有真实操作与持久化闭环 |
| Disabled | 原因可读，操作不能靠快捷键绕过 |
| Error | 保存/媒体/任务/导出失败各自恢复，不清空用户内容 |
| Coming Soon | 仅本轮明确B/C能力，未开放按钮不写数据 |
| Experimental | 研究工具具备真实能力并与正式记录隔离 |

## Theme Requirements

引用 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md`全篇；最终用impeccable批量检查所有已改页面的层级/焦点/密度/对比度/响应式。Cinema/Studio同结构，System完整，Viewer稳定，蓝selection红playhead，Section+Divider而非SaaS卡片。检查一次桌面与窄屏批次，集中修复，再确认，不新增风格探索。

## Migration

清理前逐项对照总计划Reuse Map：原素材/AutoShot/Review/Group/Template/Overlay/Marker/Shortcuts/Developer/Settings/Export均有新位置，且功能可用。P01–07所有过渡实现移除；不允许通过新旧编辑器开关掩盖功能缺口。已有数据reader原状保留，不新增兼容层，也不进行未经明确授权的数据清理。

## Acceptance Criteria

- [ ] 无重复一级工具入口、无隐藏完整旧Editor、无双store/播放器/保存计时器。
- [ ] R01–R16全部有测试或人工证据，未通过项明确阻断；未验证不能勾完成。
- [ ] Existing project仅打开/切页/保存/reload，数据不变量全部保持。
- [ ] Snapshot前flush/Apply事务/保存失败/跨项目旧异步结果均通过故障注入。
- [ ] AutoShot输出/生产config与重构前同一fixture一致，无算法改动。
- [ ] 长片性能同条件对照通过，无主题/路由导致重复解码或每帧全局重绘。
- [ ] 双主题/System、四尺寸/键盘/200%缩放通过。
- [ ] 逆序revert演练后同格式测试项目可被阶段前代码打开。
- [ ] docs/TODO反映真实实现与未来范围，未把任务写成全部AI能力完成。

## Tests

必跑：`corepack pnpm verify:web`（现有脚本包含typecheck/lint/核心测试/build）。另外运行现有 `corepack pnpm test:auto-shot-config`、`corepack pnpm test:auto-shot-settings-store`，因为verify:web目前并不覆盖它们。将本轮新增Workflow测试的真实runner接入统一检查；不能仅在文档写一个不存在的test:workflow命令。

浏览器专项：`corepack pnpm test:auto-shot-baseline`、`corepack pnpm test:video-export`及新增端到端流程。先检查脚本所需fixture、浏览器路径、服务端口与清理机制；若出现历史记录中的无输出超时，修复测试生命周期或用等价真实浏览器证据完整覆盖后记录决定，不能记成通过。不要求Desktop/Android/iOS构建。

验证文件层级：现有`apps/web/test/`保留，新测试根`tests/features/workflow/`；纯函数用Node test、涉及事务/媒体/导航用真实浏览器及隔离DB。复用声明依赖，不安装默认到C盘的工具；确需软件遵守D:/APP/Codex/软件名、缓存E:/AppData/工具名。

## Manual QA

1. 使用独立测试profile：空项目、单镜、短片、完整注释项目、2小时/2000镜、missing-media、各task状态。
2. 按完整User Flow走一遍，测试保存拒绝/重关联不匹配/检测失败/取帧失败/导出取消。
3. 直接URL/刷新/前进后退/切项目；快速连续编辑切页，确认最后内容和history。
4. 导出报告检查字段/截图，视频检查首尾帧/音轨/overlay；备份导入新项目检查映射，不声称备份恢复task。
5. 四尺寸双主题+System、键盘与IME、200%缩放；记录固定设备/浏览器/素材下打开/seek/stage切换/10次切换后内存与掉帧。
6. 在隔离副本上回退提交后重开当前格式数据，核对关键字段和截图；不动用户浏览器数据库。

## Regression Checklist

R01项目重开、新建；R02重关联；R03检测生命周期；R04Review/Apply；R05分割合并撤销重做；R06Scene；R07Timeline；R08分析；R09截图Overlay；R10Audio；R11保存恢复；R12导出；R13主题；R14响应式无障碍；R15Learn真实性；R16路由与多项目。全部覆盖后才算完成。

## Completion Gate

实现完成且验收全部通过才可将总计划状态改为“已实施”。verification-record包含commit/环境/commands/真实结果/屏幕检查/数据对照/性能对照/回滚记录。发现可恢复性或数据丢失问题必须修复，不能以Coming Soon包装退化。发布/合并按照实际任务授权另行操作，此规划不自动部署。

## Rollback

P08清理单独提交；可先revert清理恢复上一检查点，再按依赖逆序回退出问题阶段。所有阶段数据格式未变，禁止清库或DB版本倒退。媒体/task完整保护依赖隔离DB副本，普通ZIP不是完整数据库快照。
