# Agent Handoff — AisenLens Analysis System Upgrade

> 执行入口；实际进度只维护 verification-record.md。本文件不代表用户已经要求当前会话开始实施或授权 Git 发布。

## 1. 可复制的执行提示

```text
请实施 AisenLens Analysis System Upgrade 修订计划。

项目：E:\Projects\Aisenlens（执行前确认真实 cwd）
计划：docs/plans/AisenLens_Analysis_System_Upgrade_Plans/analysis-system-upgrade/

先读取：
1. 根 AGENTS.md 及目标路径适用规则。
2. 00-master-plan.md。
3. 00-shared-contracts.md。
4. verification-record.md。
5. 当前阶段和上游技术交接。
6. ../AisenLens_Analysis_System_Architecture.md（唯一正文）。
7. 涉及 UI 时读取当前项目 .agents/skills/impeccable/SKILL.md。
8. 模块相关历史记录与 reference-projects/REFERENCE_PROJECT_INDEX.md。

这是 2026-09-10 审查修订后的计划。不要执行旧版“字符串 label 枚举、
平面 fields、默认旧快照升级、完整 P4 AI Review UI、push 后才进入下一阶段”。

开始记录：
Get-Location
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v

代码是当前事实，共享契约是目标。工作区存在其它开发修改的可能，
核实归属，不覆盖/stash/提交他人或无关内容。按现有分支规范工作。

按 P1 → P2 → P3 → P4 → P5 实施。阶段技术验收通过后才能进入依赖阶段，
网络 push 不是本地技术前置。

关键目标：
- 项目 fieldDefinitions 与当前 fieldUsages 分离。
- 系统 Registry 负责创作，冻结项目定义负责运行时解释。
- 枚举存稳定 optionId；改 label 不改值；停用仍可读。
- 已 Apply kind 不原地修改；移除 usage 不删定义或值。
- 非 description 用唯一 entry，支持 unknown/not_applicable；不保留 raw 双 writer。
- shot_description 只写 description，notes 独立。
- 草稿 Apply 可完整撤销；无变化 no-op；文本 history 合并编辑会话。
- expectedUpdatedAt 用会话加载/成功提交基线，不能保存前读最新版本绕过校验。
- 普通 saveProjectEditorState 要有真实 fault/abort 验证，不能用校准事务代替。
- required 不阻止保存，不自动成为人工确认。
- Focus 复用现有 Research 队列/播放器/session，处理多选、IME、弹层、最后一镜。
- Batch 明确目标和覆盖，一次 history，首期多选只替换。
- P4 只做候选类型/守卫/唯一写接缝测试，无完整 Review 页面或生产假 AI。
- Evidence 复用现有类型和整数微秒。
- Overlay/Export/Learn/Recovery 要适配新模型，不破坏现有功能。

旧数据：
先只读核查真实需保留的项目/Recovery，不清库。
没有需求直接使用新模型，不为 fixture 加兼容层。
若有真实旧数据，按共享契约记录范围、备份、映射与具体处理授权；
继续不依赖数据转换的开发。不能默认通用迁移或默认丢弃数据。

研究：
公开成熟方案 → AisenLens 初案 → OpenReel → OpenCut 的模块相关文件；
只将本轮实际查阅与确认结论写入参考索引。

每阶段：
核实文件/脚本 → 实施 → 必要测试/浏览器 → 记录命令、环境、HEAD、exit code →
检查 diff → 更新技术状态和独立 Git 状态。
真实测试失败不能标通过；代码变化使相关旧结果过期。
P3/P5 包含 1,000 shots × 20 fields 的性能观察。

Git：
按本轮用户指令的授权执行。仅本地实现请求不视作文档已授权 push。
如果用户已授权正常 commit/push，按阶段正常执行并记录远程结果，无需重复询问。
网络失败记录待推送，继续已满足技术前置的本地工作，最终仍完成获授权远程交付。
禁止 force push、改写历史、merge main、release 或 deploy，除非另有明确请求。

现在从 P1 的本地核实开始，必要改动范围有源码证据就直接推进。
```

## 2. 协作与边界

默认串行；仅用户明确要求并行时启用多 agent。共享契约、EditorWorkspace、AnalyzeWorkspace、ProjectSession、保存与 verification 总表由集成负责人维护。合并后重跑相关验证。

阻塞仅作用于依赖该问题的工作。技术验收失败不能跳到依赖阶段；网络或 Git 授权状态不等于技术失败。数据处理范围未知时不操作真实旧数据，可继续目标模型和隔离测试。

## 3. 接手核对

检查当前 HEAD/工作区差异、前一阶段真实证据是否覆盖代码、新 types 与契约是否一致、实际未完成项和数据处理范围。

verification 声称远程交付时才核实对应 remote commit；不能把待推送或本地通过改写为已推送。记录与代码不一致先调查。

## 4. 最终交付

P1–P5 技术完成、必要测试可追溯、旧路径退出、没有假 AI、数据范围和局限清楚。Git 提交/推送按本轮授权另行收尾；不得将文档修订当成产品已完成。

