# P5 — 全链路验证与旧路径退出

> 前置：P1–P4 技术验收通过；push 不作为本地验证前置。本阶段不扩大功能范围。
> 读取 [共享契约](00-shared-contracts.md) 和各阶段真实记录。

## 1. 唯一性审计

```powershell
rg -n "DIM_REFS|AnalysisDimensionCard|AnalysisFieldInput|TemplateEditorModal" apps/web/src tests
rg -n "analysisFields|fieldDefinitions|fieldUsages|setAnalysisField" apps/web/src
rg -n "saveProjectTemplate|saveProjectEditorState|expectedUpdatedAt" apps/web/src
rg -n "AICandidate|EvidenceRef|focusFieldId|isComposing" apps/web/src tests
```

证明：Registry 创作来源唯一、快照解释权威明确、一个 resolver/命令体系、一个可达 Profile editor、无 raw/envelope 双 writer、无模板直写旁路、Evidence 定义唯一、无生产 fixture、无第二 selection/currentShot store。

确认零生产引用后删除旧 DIM_REFS、被取代 renderer/入口和本轮临时适配。按类型拆分 renderer 是允许的，不为“唯一”强行塞回大组件。不清理无关功能或他人改动。

## 2. 数据验收矩阵

全部实际验证并记录：
- 自定义字段填值 → 移除 → 切模板 → 重载 → 原 ID 重新启用，定义/选项/值恢复。
- option 改 label、不改 ID；retired 旧值可读、不可新选，重启用后可选。
- 已 Apply kind 不可原地改；同名新字段不接管旧值。
- unknown/NA/unset 区分、false/0、空数组/文本清空，多选集合比较。
- 非法已有值不因无关保存清空，损坏定义不被默认定义替换。
- Registry 变化不改完整项目快照。
- Apply/no-op/Undo/Redo/版本、dirty draft 导航守卫。
- required 不阻止保存或自动人工确认。
- description 不双写。
- 当前格式 Recovery 完整恢复 Profile、entries、notes、Research/Evidence。
- Overlay/Export/Learn 读取真实 label/状态，配置不被静默清理。
- 真实旧数据处理范围有记录，没有默认 V1 fallback 或清库。

## 3. 真实并发与事务验收

不能仅调用 repository 传一个旧版本来替代真实链路：
1. A/B 从同基线加载；
2. B 经正常 autosave 保存；
3. A 旧内存经 useEditorPersistence 提交；
4. A 被拒且保留输入，DB 保留 B；
5. 明确用户重载/恢复流程，不自动拿最新令牌重试。

另测：同会话连续保存、保存中继续输入、失败重试、同会话 Research/元数据写入、同毫秒令牌变化。

普通 saveProjectEditorState 各 fault 点必须实际触发，包括 template-write。分别测试同步注入和请求失败，确认事务 abort、无未处理 rejection、DB 完整旧状态、基线未推进、dirty 保留。校准事务成功不能作为普通保存证据。

## 4. Web 验收矩阵

暗/亮、宽/中/窄 Web；无 shot、只有 description、自定义字段、保存失败与冲突。

核心故事：
A. 两镜人工记录不同值/unknown，保存重载。
B. 自定义定义移除再恢复，包含停用选项。
C. 模板 Apply → Undo → Redo → 保存重载。
D. Focus 范围队列，连续十镜，多选确认、跳过/清空、最后一镜。
E. 中文 IME、input/textarea/contenteditable、按住数字、弹窗/Popover Escape。
F. 显式多选含范围外镜头，预览覆盖数，替换字段，一次 Undo。
G. AI 无 provider，无 enabled Run AI、候选或假请求。
H. Research/Evidence、现有 Overlay/Export/Learn 未回归。

## 5. 自动验证

核实 scripts 后执行：
```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
corepack pnpm test:workflow
corepack pnpm test:workflow-browser
corepack pnpm test:editor-history
corepack pnpm test:overview-analyze
corepack pnpm test:overview-analyze-browser
```

执行 P1–P4 实际新增专项测试。每项记录命令、HEAD、环境、exit code、摘要；失败修复后保留历史并复测。相关代码改动使旧测试结果过期，不能复用旧通过记录。

## 6. 规模与性能

复核 P3 的 10/100/1,000 shots、6/20 fields 结果，重点 1,000 × 20。记录连续输入、100 镜批量/Undo、Table scroll、autosave 的延迟/长任务/History 内存/序列化/事务成本。

仅在新改动或未解决问题时追加 profiling；有证据才优化。不能以100镜结果宣称长片性能通过，也不承诺未经验证的跨设备 SLA。

## 7. 文档与交付

- 共享契约与实际类型一致；架构只有一份正文，入口链接有效。
- 本期/后续边界一致，P4 未扩大成完整 Review。
- verification 不预填通过，实际旧数据范围/未验证项明确。
- 不提交 cache/media/debug/env/密钥或来源不明改动。
- 技术状态与 Git 状态分别维护；按执行时授权完成提交/推送。
- 如远程交付属于范围，核实 remote 含代码提交后记录链接；网络失败可以继续有技术前置的本地工作，但不能虚报已推送。
- 不 force push、改写历史、merge main、release 或 deploy。

完成标准：必要行为与失败路径已实际验证、旧路径退出、现有功能保持、交接可追溯；Git 交付与本轮授权一致。

