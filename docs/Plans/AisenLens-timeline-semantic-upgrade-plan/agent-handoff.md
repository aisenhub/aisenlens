# Agent Handoff — AisenLens Semantic Timeline Upgrade

> 计划状态：第一期 Phase 01–06 功能验收完成；Git 未授权提交/推送
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`


## 1. 可直接复制给执行 Agent 的完整提示词

```text
你正在执行 AisenLens “Semantic Timeline Upgrade”。

仓库：aisenhub/aisenlens。

重要：先核实，不要直接改代码。

阅读顺序：
1. 根 AGENTS.md。
2. docs/architecture/PROJECT_ARCHITECTURE.md。
3. docs/development/DEVELOPMENT_GUIDE.md。
4. 本计划目录 00-master-plan.md。
5. verification-record.md。
6. 当前要执行的阶段文档。
7. 上一阶段的“交给下一阶段”。
8. reference-AisenLens-时间轴优化架构方案.md。
9. 当前阶段直接关联的实际代码。
10. UI 阶段读取 .agents/skills/impeccable/SKILL.md 和最少必要 reference。

开始实施前运行并记录：
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short

核对当前代码与计划列出的文件、命令、类型是否仍一致。
若代码已变化：
- 当前代码 = 实现事实。
- 本计划冻结契约 = 目标方向。
- 在 verification-record.md 写明差异。
- 不把旧文档“已完成”当验证证据。

保留已确定的产品原则；参数与 API 按证据验证。发现设计冲突先修正计划和记录，不因“冻结”措辞阻止必要修复。

核心冻结契约：
- Timeline 是分析/理解工具，不扩成传统 NLE。
- 默认 hierarchy：Section → Sequence → Scene → Shot+Frame。
- Shot+Frame 只在 UI 合并；Shot domain 不合并。
- 时间权威 = integer frame；range = [startFrame,endFrame)。
- Structure persistence 继续使用 ShotGroupRecord。
- 第一/二期都不新增 parentSectionId / parentSequenceId / children 树。
- Structure 编辑统一走 structureCommands + generalized validation。
- 同 kind 不 overlap；高层 overlap 低层时必须完整包含。
- Scene boundary → Shot cut。
- Sequence 优先局部合法 Scene cut；未被 Scene 覆盖的目标可用 Shot cut。
- Section 按局部合法 Sequence/Scene/Shot cut 优先级吸附，不能切穿任何低层范围。
- Promote 是增加高一级 boundary，不是改 lower group kind。
- Demote 只移除/合并高一级 boundary。
- Marker 正式模型 = frame + content + scope；不保留 category/label/note/shotId。
- Marker context 全部 derived，不持久化 parent。
- Track 是 View，不把 domain data 命名成 TrackRecord。
- Track Registry 是唯一轨道定义源。
- 不添加假 Dialogue/Emotion/Music/AI/confidence。
- 渲染细节使用单一 resolver，与导航 focus 分离；Phase 05 必须改造长片 fit 与帧级缩放可达性。
- Structure focus Enter = drill-down；其他 Enter 保留 Shot split。
- Esc 先 local cancel，再 Go Up。
- UI/Track 组件不直接写 IndexedDB/repository。
- 继续使用现有 EditorHistory + 400ms autosave + single-flight + expectedUpdatedAt。
- Boundary drag pointermove 只 preview；pointerup 单次 history commit。

第一期严格顺序：
01 → 02 → 03 → 04 → 05 → 06。

Phase 07–09 已按用户明确要求继续完成研究/准入判断；产品功能仍须满足各自真实数据源门槛，当前阻塞结论见 `verification-record.md`。不要以研究完成替代产品完成。

每个阶段：
1. 重新检查相关代码。
2. 只修改本阶段范围。
3. 优先复用现有 components/services/hooks。
4. 不引入无必要依赖。
5. 不安装依赖，除非后续任务明确授权且确实必须。
6. 不进行无关重构。
7. 新增文件必须有清晰职责。
8. 写/改 targeted tests。
9. 运行阶段计划列出的实际命令。
10. 做阶段要求的真实 Browser 验证。
11. 在 verification-record.md 记录：
   - 日期
   - HEAD
   - 命令
   - 环境
   - exit code
   - 结果
   - 失败
   - 修复
   - 复测
12. git diff --check；未授权 Git 写操作时保留本地结果，不主动提交。
13. 仅任务授权 commit 时检查 staged diff，提交本阶段必要内容，不包含 secrets/媒体/cache/dist。
14. 仅任务授权 push 时推送同一任务分支并核实本地 HEAD 与远端一致。
15. 功能状态与 Git 状态分别记录，下一阶段依赖实际代码和验收，不要求推送。
16. 验证工作区未提交内容时记录 HEAD + 文件清单/内容校验值，不能把 HEAD 当作全部验证版本。
17. 只有用户要求的功能与交付动作均完成才称已交付。

功能状态：未开始 / 进行中 / 阻塞 / 验证失败 / 验收完成。
Git 状态：未授权或未要求 / 未提交 / 已提交 / 已推送并核实 / 推送失败。

禁止：
- force push
- rewrite shared history
- merge main
- create Release
- deploy
- delete/clear IndexedDB 作为 migration 方案
- localStorage.clear 作为修复方案
- 吞掉用户已有工作区修改
- 用 build 代替 Browser/Data 验证
- 把未执行测试写成 passed
- 创建新旧双实现长期并行
- 假按钮、假数据、假进度、假 confidence

如果遇到实质 blocker：
- 先做安全、范围内诊断。
- 明确证据、影响、推荐处理。
- 继续不依赖 blocker 的工作。
- 只有无法从冻结契约推导且会改变最终实施结果的问题才询问用户。

现在开始当前阶段的“前置核对”；不要跳阶段。
```

## 2. 文档阅读顺序

每个新 agent：

1. `AGENTS.md`
2. `docs/architecture/PROJECT_ARCHITECTURE.md`
3. `docs/development/DEVELOPMENT_GUIDE.md`
4. `00-master-plan.md`
5. `verification-record.md`
6. 当前 Phase 文件
7. 上一 Phase 的交接
8. 架构 reference
9. actual code
10. applicable skill

不要先读 `docs/archive` 再把旧计划当当前事实。

## 3. 执行范围与停止边界

### 第一任务

执行：

```text
01
02
03
04
05
06
```

Phase 06 完成后停止并向用户报告。

### 第二期

只有明确继续时：

```text
07 AI Structural Suggestions
08 Dialogue / Emotion
09 Other Analysis Tracks
```

不得因为这些文档存在就自动实施。

## 4. 不得违反的关键契约

### Structure

- `ShotGroupRecord` 是第一期 persistence source。
- no parent tree。
- range-derived containment。
- generalized validation。
- Boundary First。
- split/move/merge/promote/demote identity rules遵循 master。
- lower layers optional。

### Marker

- v2 only。
- frame truth。
- content + scope。
- context derived。
- independent Track。
- no category。
- no shotId。

### Track

- registry single source。
- core six tracks only。
- no fake future tracks。
- structure relative order locked。
- preference v2 only。

### State

- EditorWorkspace 持有 persistent edit state。
- Timeline preference 是 local UI state。
- existing history/autosave/repository transaction 保留。
- no direct IDB writes from components。

### Time

- integer frame。
- half-open range。
- microseconds ResearchRange 不自动等价。

## 5. Git / Branch 规则

遵循总计划 §9。计划文件不构成提交/推送授权；任务明确要求时才执行。
读操作核实 repo/branch/HEAD/status；新分支默认 `codex/semantic-timeline-upgrade`，尊重用户指定并先查重。
提交前 diff --check、审 staged diff；推送后确认 local HEAD 与 remote branch 一致。
功能验收不依赖 push，失败推送单独记录。若用户要求远程交付而推送失败，报告剩余交付动作。
不要反复 amend 追逐验证记录自己的 SHA。

## 6. 多 Agent 协作与文件所有权

仅在用户或适用规范明确授权多 Agent 时使用以下分工；它不是自动委派指令。使用前声明文件 owner。

### Integration Owner 独占

同一时刻只由 integration owner 修改：

- `apps/webapp/src/features/editor/components/EditorWorkspace.tsx`
- `apps/webapp/src/features/editor/components/EditorTimeline.tsx`
- `apps/webapp/src/features/project/services/projectRepository.ts`
- root / webapp `package.json` 中 test script 变更
- active architecture docs
- `verification-record.md` 的最终阶段合并

### Structure Agent

优先拥有：

- `features/group/services/*`
- structure pure tests

### Timeline Agent

优先拥有：

- `features/timeline/*`
- Visual/Structure Track components
- timeline pure tests

### Annotation Agent

优先拥有：

- `features/annotation/*`
- marker pure tests

### Integration Owner 职责

- 合并各 domain 输出。
- 连接 EditorWorkspace / EditorTimeline。
- persistence/schema。
- cross-feature Browser。
- 记录最终功能验证；仅按授权执行 commit/push。

不要让两个 agent 同时改同一个 integration file 再“手工拼”。

如使用 worktree：

- record 每个 worktree branch/HEAD。
- integration owner 只集成已审查 commit。
- 下一 Phase 前将上一阶段实际代码集成并验证；提交/推送遵循任务授权。

## 7. 新 Agent 接手核对

必须先查看：

```text
verification-record.md
git log --oneline --decorate -n 20
git status --short
git branch --show-current
remote branch
```

逐项确认：

- record 最后一个“已交付” Phase。
- record 的 code SHA 是否存在于当前 branch。
- 已执行推送时核实 remote 是否包含；未要求推送不阻塞接手。
- 当前工作区是否有未提交修改。
- 未提交修改归谁。
- 上阶段 API 是否真的在代码里。
- 上阶段验证是否仍覆盖当前 HEAD。

如果后续代码改动触碰了上阶段已验证区域：

- 旧验证不自动继续有效。
- 需要复测或明确标“原结果不覆盖当前 HEAD”。

如果 record 与代码不一致：

1. 暂停受影响的续做。
2. 查 Git history / diff。
3. 修正 record。
4. 必要时补验证。
5. 再开始新阶段。

## 8. Verification 写法

错误：

```text
测试通过
```

但没有命令/exit code。

正确：

```text
2026-xx-xx
Phase 03
HEAD abc123
Command: corepack pnpm typecheck
Environment: Windows 11 / Node xx
Exit: 0
Summary: ...
```

Browser 同理写：

- Browser/version。
- viewport。
- project/fixture。
- steps。
- observable result。
- console/log/screenshot path。

失败记录不能删：

```text
第一次失败
→ 原因
→ 修复 commit
→ 复测
```

## 9. 计划变更权限

Agent 可以根据当前代码调整：

- 私有函数名。
- 文件拆分。
- props。
- CSS/className。
- test 文件组织。
- 精确 threshold 数值（Phase 05 有实际证据时）。

Agent 不可自行改变：

- frame/range contract。
- Marker v2 semantics。
- no-parent-tree。
- Promote/Demote semantics。
- Track/Data separation。
- phase delivery definition。
- 当前任务的 Git 授权边界。

若需改变产品行为或数据保留范围，先写 evidence/impact，核实已有授权；只有仍需用户决定的事项才询问。私有实现与待测参数按现有授权推进。
