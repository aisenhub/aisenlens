# P1 — 安全数据契约与真实字段闭环

> 前置：本地事实、研究和数据范围核实。完成标准是可编辑、可保存、可重载的真实 Analyze 闭环，不能仅交类型或静态 UI。
> 读取 [总计划](00-master-plan.md)、[共享契约](00-shared-contracts.md)、[架构](../AisenLens_Analysis_System_Architecture.md)、[验证记录](verification-record.md) 和适用 AGENTS。

## 1. 目标流程

打开当前格式项目 → Analyze/Shots → 选择 Shot → 显示 Profile 字段 → 编辑值或人工判断状态 → History/autosave → IndexedDB 原子事务 → 重开恢复。

同时修复普通保存的会话基线与故障边界。这是后续模板编辑的安全前置。

## 2. 本地核查

记录 cwd、Git status/branch/HEAD/remote、已有改动归属和 package scripts。

```powershell
rg -n "ProjectTemplateSnapshot|TemplateField|normalizeShotAnalysisFields|normalizeProjectTemplate" apps/web/src tests
rg -n "saveProjectEditorState|saveProjectTemplate|expectedUpdatedAt|template-write" apps/web/src tests
rg -n "EditorHistorySnapshot|saveDataSignature|setAnalysisField|TemplateEditorModal|DIM_REFS" apps/web/src
rg -n "analysisFields|shotDims|confirmed|createProjectRecoverySnapshot|restoreProjectRecoverySnapshot" apps/web/src tests
```

输出实际消费者清单，包含 bootstrap、Overlay、Export、Learn、Recovery、shot status 与校准应用。不要根据文件名或 import 猜可达入口。

只读确认是否存在必须保留的旧用户数据。当前代码处于开发中不代表可以清除本地用户数据库；按共享契约第 4 节处理，默认不建设迁移器。

公开研究先复核 JSON Forms 语义/UI 分离及校验、属性录入模式，再形成此项目初案，依 OpenReel → OpenCut 定向看 Inspector/property/command 相关文件，写 reference index。只记录实际确认事实，不发散到云模板系统。

## 3. 类型与职责

修改现有 features/template/types.ts：
- 定义目录 fieldDefinitions 与当前 fieldUsages 分离。
- 引入稳定 FieldOption.id/label/retired。
- 非 description entry 使用 set/unknown/not_applicable；不存在 key 为 unset。
- 冻结定义版本、配置版本和 per-surface settings。

修改 defaultTemplate.ts：从 Registry 构造快照，不重复维护语义。新增 fieldRegistry.ts（如无适合文件），承载六个字段的准确说明、主要观察规则、例子/反例和默认 usage。color/sound 使用“色彩印象/声音概况”，不伪装为严谨多维测量。

修改 templateValidation.ts：分开 draft 验证、新写入校验、已有数据无损读取与诊断。不能复用当前“无效已知 option 清空”行为。直接替换 raw writer，不留生产双轨。

按需新增 resolveAnalysisProfile.ts，解析冻结定义；Registry 缺字段但快照完整仍可读，损坏时保留原值并限制受影响操作。

修改 templateService.ts：复用 load/create seam，保留已有并发 bootstrap 修复；开始前检查工作区 diff。当前格式走唯一 parser，旧格式不默认升级或清空。

## 4. 保存与并发修复

修改 useEditorPersistence/useEditorSaveState 及必要的会话集成：
1. 从会话加载或成功提交记录持有 expectedUpdatedAt。
2. 删除“保存前读 latestProject.updatedAt 作为旧内存校验令牌”的逻辑。
3. 保存串行化，成功才推进令牌；保存期间新增输入继续 dirty。
4. 清点 Research/校准/项目元数据等同会话直写如何与基线协调；只接受自己已同步写入的版本。
5. stale 冲突保留输入，不自动取新令牌重试覆盖。
6. 令牌每次提交必须变化，包括同毫秒连续提交。
7. 保持现有聚合存储，不新增 autosave/store。

修改 projectRepository.saveProjectEditorState：
- 在普通路径加入测试可达 fault points，覆盖项目、镜头、模板及相关聚合写入。
- 写前绑定事务 completion；同步异常、注入/请求错误显式 abort，避免部分提交及未处理 rejection。
- 失败前后 DB 全部旧状态一致、内存可重试。
- 不把 applyCalibrationDraft 的 template-write 测试当普通保存证明。

## 5. 唯一字段命令与 History

统一 write/clear/unknown/not_applicable 校验和 no-op。命令适配 description 唯一存储，其余写 entries。UI 不能碰 repository。

在当前 History snapshot/restore 中纳入 Profile 定义与 usage 内容，P2 可直接接 Apply。文本 history 合并按字段编辑会话，保留 autosave 体验，处理 IME 和原生文本撤销。配置 Undo 的版本规则遵守共享契约。

停止以 required completeness 自动覆盖 Shot.status。核实保留原状态来源和新镜头创建路径；界面展示填写/待判断数量，不能显示没有人工操作依据的“已复核”。

## 6. 真实 UI 接入

先检查 components/ui 和相邻业务组件。演进旧 AnalysisFieldInput/AnalysisDimensionCard 为 analysis feature 下统一输入体系，支持五种类型、人工判断状态、停用 option 展示和 issue 提示。

EditorWorkspace → AnalyzeWorkspace → ContextInspector → ShotInspector 透传 resolved profile、values 与唯一写命令。description 继续复用已有 textarea，不双渲染/双写。保留 notes/Research/Evidence。

只有 description 时提示“当前模板未配置额外字段”，提供真实设置入口；profile 加载中禁用输入，不能渲染伪默认值。故障使用全局保存状态，重载失败不清内容。

## 7. 现有消费者适配

追踪所有 analysisFields/TemplateField 消费者，更新读取新 entry、option label、定义目录和 usage 的逻辑。Overlay/Export/Learn/Recovery 必须维持现有功能，不能输出 [object Object]、optionId 或丢弃未启用字段配置。

不新增报告 schema 或额外产品功能，但必要的类型/格式适配在 P1 完成。DB version 仅在实际结构需要时改变，不能机械升级版本号。

## 8. 必须通过的专项测试

- 两镜值独立；set/clear/unknown/NA/false/0/多选保存重载。
- option label 变化保持值，retired 值可读；无效已有值不因无关 autosave 消失。
- Registry 更新/移除定义后完整快照仍可解释。
- description 不在 analysisFields 出现。
- 两会话 A/B 同基线 → B 保存 → A 经真实 hook 保存被拒；不能仅直调 repository 模拟旧令牌。
- 同会话连续保存、保存中继续输入、失败重试基线正确。
- 普通保存 project/shot/template fault：异常后 DB 完整旧状态；无 partial commit/unhandled rejection。
- Profile 在 history 可一致恢复；文本不是逐字符全项目快照。
- 当前格式 Recovery 恢复完整定义/entries/Research；旧格式按数据范围决定，不冒称支持。
- required 不阻止保存、不自动确认镜头。

## 9. 命令与验收

先核实 scripts，再运行：
```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
corepack pnpm test:editor-history
corepack pnpm test:overview-analyze
corepack pnpm test:overview-analyze-browser
```

补保存链/模型专项测试并记录真实命令。改组件后必须 build。浏览器实际测两镜编辑重载、未知状态、保存冲突/失败、Research Evidence。

技术验收通过后可进入 P2，Git 状态单独记录。交接包含新 types/resolver/命令、基线所有者、消费者清单、测试证据、旧数据范围与未验证项。

