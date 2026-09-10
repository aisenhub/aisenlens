# P3 — 连续录入、Table 与 Focus

> 前置：P2 技术验收通过。遵守 [共享契约](00-shared-contracts.md) 的队列、命令和状态规则。

## 1. 本地核实

```powershell
rg -n "ShotBrowserView|ShotTable|ShotCard|selectedShotIds" apps/web/src/features
rg -n "EDITOR_SHORTCUT_DEFINITIONS|useEditorShortcuts|contentEditable|isComposing" apps/web/src
rg -n "ProjectSessionProvider|researchMode|researchTarget|analysisFields" apps/web/src/features
```

找出真实列表、selection、播放器、Research queue 和快捷键所有者，不猜文件名。复用现有组件与会话，不新建 Workflow Stage。

## 2. 组件与写入职责

- ShotInspector：按 Profile section、core/advanced 渲染。
- ShotBrowserView 及实际 table/card：读取 resolved profile 和 entries。
- AnalyzeWorkspace：Detail/Focus 入口与现有播放器协调。
- ProjectSession：缺少时才增加 inputMode、focusFieldId 和必要队列会话信息。
- EditorWorkspace：提供 P1 唯一写命令；Batch/Copy 可抽纯 analysisFieldCommands，不访问 DB。
- 可新增 FocusAnalysisMode；统一 renderer 支持 Surface variant 时不重复 FieldQuickEntry。

Detail/Table/Focus 共享真实 entry 与 option label，不能继续把 ShotData.type/motion/color 当独立人工值真相。既有展示字段应派生或退出重复来源。

## 3. Detail 与 Table

Detail 优先展开 core；高级 required 未填有提示和定位。description 保持唯一位置，notes/Research 保留。

Table 动态展示 1–3 个默认分析字段，用户可通过 column chooser 选择，宽度不足使用溢出/摘要，不挤坏主操作。字段单元格可以点击后进入 Inspector/Focus，本期不强求 inline edit。

unset、unknown、not_applicable、retired option、数据 issue 有不同文案；统计不是“全部已确认”。现有过滤/排序/列配置使用稳定 ID，不把 optionId 直接展示给用户。

## 4. Focus 状态与队列

```text
Detail → 选择已启用字段 → Focus(fieldId, queue)
Focus → 合法提交 → 保持当前/按设置下一镜
Focus → 跳过 → 只导航
Focus → 最后一镜提交 → 停留并提示本轮处理结果
Focus → usage 移除/退出 → Detail
```

遵循当前 Research sequential/range 队列，固定本轮顺序；结构/范围变化时显式协调，不在用户输入过程中因动态过滤偷换镜头。展示队列来源、位置、已处理和待判断数。

单选 auto-next 默认关；多选显式确认才前进。unknown/NA 是真实状态，清空和跳过不同；失败提交不前进。最后一镜不循环。

Copy Previous 以本轮队列上一镜为准，仅复制合法 set；0/false 不能误判为空。上一镜不存在、无有效值或含 retired option 时禁用并解释。

## 5. 快捷键与中文输入

Focus active 才启用；数字 1..9 显示映射，超过九项有搜索/点击。Arrow 导航、Enter 确认、Escape 退出均服从输入与弹层优先级。

input/textarea/select/contenteditable、isComposing、repeat、弹窗/Popover/菜单打开时不触发 Focus 快捷键；Escape 先关顶层弹层。与全局 editor shortcuts 冲突时保留现有有效定义并记录调整。

测试真实中文 IME、键盘选择多选、文本撤销、按住数字、弹层 Escape，不只派发无 composing 的简单 keydown。

## 6. 批量操作

只改显式选中集合，预览影响镜头数、已有值覆盖数和范围外对象。范围外选择须明示，不能悄悄扩大或缩小集合。

本期多选只提供“替换为所选值”，不混入追加/移除。清空独立动作。提交前重检目标存在、field/option 状态，失败不部分写入。一次 history、一次 state update、一次完整 Undo，autosave 仍统一。

## 7. 相邻模块回归

Research range/sequential、Evidence、播放器同步保持。Profile 移除字段不能自动清 Overlay 的 fieldIds；保留配置并提示未启用项。Export/Learn 显示真实 label/状态，不能崩溃或泄漏内部 optionId。

## 8. 性能验证

场景至少 10/100/1,000 shots，6/20 fields；重点运行 1,000 × 20：
- Focus 连续 20 次输入；
- 长文本和 IME；
- 100 镜批量修改与撤销；
- 表格滚动、选择、切字段；
- autosave 进行时继续输入。

记录硬件/浏览器、输入到显示延迟、长任务、History 内存、resolver 重算、序列化和事务耗时。用 profiler/performance 证据定位，优先消除每键全项目 clone、无意义渲染和重复写入。不凭感觉大重构、不声称跨设备毫秒 SLA。

## 9. 验证与完成标准

覆盖 detail/table/focus 同值、队列边界、IME/弹层、unknown/NA、false/0 copy、多选确认、最后一镜、批量覆盖与一次 Undo、保存失败、字段移除退出、长片规模。

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
corepack pnpm test:editor-history
corepack pnpm test:overview-analyze
corepack pnpm test:overview-analyze-browser
corepack pnpm test:workflow
corepack pnpm test:workflow-browser
```

本阶段涉及 session/navigation，workflow 验证不可省略；先确认 scripts。dark/light、宽中窄 Web 真实验收，记录性能证据与限制。技术通过后进入 P4。

