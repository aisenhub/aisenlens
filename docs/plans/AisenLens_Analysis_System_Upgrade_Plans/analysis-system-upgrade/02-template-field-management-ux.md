# P2 — 任务驱动的模板与字段管理

> 前置：P1 技术验收通过。网络 push 不是技术前置。
> 类型与行为使用 [共享契约](00-shared-contracts.md)，不另定义 Profile/validator/store。

## 1. 用户目标

默认流程：选择分析目标 → 预览实际字段与填写示例 → 应用 → 开始记录。
用户可以进入“自定义字段与布局”调整结构；三栏编辑不是首次使用的必经步骤。

使用共享契约的四个真实系统 Profile 名称和覆盖范围。展示字段列表、用途和示例；没有构图/灯光字段就不声称涵盖它们，不显示未来 AI 数量或虚构能力。

## 2. 复用与组件职责

先读当前 TemplateEditorModal、ModalShell、components/ui 与相邻功能；演进现有唯一编辑入口，不再保留旧 Modal 分支。

可按职责拆：
- Profile 选择与预览；
- FieldLibraryPanel：系统/项目字段、搜索、已加入/未启用、创建；
- ProfileStructurePanel：section、顺序、core；
- ProfileFieldSettingsPanel：当前定义与 usage 设置。

不为凑文件拆分。复用 Button/Dialog/Tabs/Sonner、P1 resolver/validator/命令，不新增独立解析器或 repository。

## 3. 高级编辑布局

宽屏：字段库 → 当前模板结构 → 当前字段设置。中/窄屏使用可导航单列/双列，不硬挤三栏。

默认展示 label、说明、选项、优先展示与显示位置；semanticKey 放只读技术详情，Widget 等低频配置折叠。ai_review/report 尚无能力，不显示相应开关；AI 未接入不提供逐字段 AI mode。

required 文案“完成分析时需填写”，明确不会阻止保存；core 是优先展示，不表示高级字段价值更低。

输入/对话框采用现有主题 token，暗亮、键盘焦点、错误定位完整。description 固定存在，不重复渲染。

## 4. 字段生命周期

只操作 P1 的 definition directory + usage：
- “移出当前模板”只删 usage，目录和值保留，可从库重新加入原 ID。
- 自定义 label/说明可改；已 Apply kind 不可改，提供新建字段入口。
- 选项逐行编辑 label，ID 隐藏且稳定；新增分配 ID，移除为停用，展示使用数量。
- retired 选项可重新启用，既有值仍可读；禁止用逗号字符串重新生成全部 ID。
- 系统定义不可改，只改 usage；不能从 Registry 最新定义静默覆盖项目快照。
- 本期不提供已应用定义永久删除。新 draft 中未应用字段可直接丢弃。
- 不因同名自动合并，不在 source 切换时重建自定义 ID。

## 5. Draft / Apply / Undo

打开时 clone 当前快照并记录基线配置版本，编辑 draft 不 markDirty。切换系统 Profile 也只改 draft，不能立即保存。

Apply：
1. 校验草稿、引用、kind/widget、选项身份、数量限制。
2. 检查打开以来 applied profile.version 是否变化，防止旧 draft 覆盖。
3. 展示新增/隐藏字段、定义展示变化、已填受影响数量；提示定义和值保留。
4. 无变化不提交；有效变化通过一次领域命令进入 History 和 Editor state。
5. 全局 autosave 负责持久化，saved 后才称已保存。

Undo/Redo 一致恢复 definitions/usages/sections/相关显示配置及关联值，遵守共享契约的版本推进规则。只撤销 shotDims 不算通过。

关闭 Modal、路由跳转、切项目都保护 dirty draft；浏览器关闭使用平台允许的提示，不保证刷新后未 Apply draft 恢复。放弃不改变项目，继续编辑保留草稿。

## 6. 切模板与恢复默认

只替换当前配置，保留全部已采用定义和值。sourceProfile 更新来源标记；自定义修改后不能假装与系统 source 完全一致。

不相容定义升级显示说明并阻止直接套用，不顺便建设转换器。恢复默认同样显式 Apply 与 Diff，不删除项目数据。

## 7. 验收场景

- 自定义字段填值 → 移除 → 切系统模板 → save/reload → 字段库重新加入原 ID → 值和定义恢复。
- option label 改名不改 value；停用后旧值可读，恢复后可新选。
- 已应用 kind 锁定；同名新字段不接管原值。
- Apply 一次 Undo 恢复全部配置，一次 Redo 恢复修改，修订号按契约变化。
- no-op Apply 无版本/历史；invalid draft 无写；旧 draft 版本冲突不覆盖。
- required/core 与完成度文案正确；unknown 不显示已确认。
- 关闭/导航/切项目处理未 Apply 改动。
- 保存失败保留 applied 内存配置，真实冲突不自动覆盖。
- source 切换/恢复默认不清 Overlay 的既有 fieldIds，不丢 Research/Evidence。
- dark/light、宽中窄 Web、键盘、IME、首个错误焦点与无搜索结果。

## 8. 验证与交接

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
corepack pnpm test:editor-history
corepack pnpm test:overview-analyze
corepack pnpm test:overview-analyze-browser
```

核实 scripts 后运行，追加本阶段专项测试命令和证据。只有一个可达 Profile Editor，完整应用/撤销/恢复验证通过后进入 P3；提交与推送单独记录。

