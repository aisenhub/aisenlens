# Agent Handoff — AisenLens Semantic Timeline Upgrade

> 计划状态：仅计划，未实施  
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

不要重新发散已确定的架构方向。

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
- Sequence 优先 Scene cut，缺 Scene 才 Shot。
- Section 优先 Sequence，缺时 Scene，再 Shot。
- Promote 是增加高一级 boundary，不是改 lower group kind。
- Demote 只移除/合并高一级 boundary。
- Marker 正式模型 = frame + content + scope；不保留 category/label/note/shotId。
- Marker context 全部 derived，不持久化 parent。
- Track 是 View，不把 domain data 命名成 TrackRecord。
- Track Registry 是唯一轨道定义源。
- 不添加假 Dialogue/Emotion/Music/AI/confidence。
- Semantic Zoom 使用单一 resolver。
- Structure focus Enter = drill-down；其他 Enter 保留 Shot split。
- Esc 先 local cancel，再 Go Up。
- UI/Track 组件不直接写 IndexedDB/repository。
- 继续使用现有 EditorHistory + 400ms autosave + single-flight + expectedUpdatedAt。
- Boundary drag pointermove 只 preview；pointerup 单次 history commit。

第一期严格顺序：
01 → 02 → 03 → 04 → 05 → 06。

Phase 07–09 是第二期/后续。Phase 06 后除非用户明确要求继续，否则停止。

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
12. git diff --check。
13. 检查 staged diff，只包含本阶段及必要依赖。
14. 不提交 secrets、env、用户媒体、browser profile、cache、dist、无关改动。
15. 创建有阶段含义的 commit。
16. push 到同一个任务 branch。
17. 核实 remote branch 已包含 commit。
18. 更新 verification-record.md 写 commit SHA / push result / GitHub link。
19. 单独提交并 push record update；不要反复 amend 追逐自己的 SHA。
20. 只有 implementation + required validation + push 都完成，状态才可写“已交付”。

允许状态：
- 未开始
- 进行中
- 已阻塞
- 验证失败
- 验收通过待推送
- 已交付

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

开始：

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short
```

如果任务已经有 branch：

- 继续使用。
- 不另开每阶段 branch。

如果没有 branch 且仓库没有更具体规范：

```powershell
git branch --list
git switch -c feat/semantic-timeline-upgrade
```

先确认同名不存在/不会覆盖别人工作。

### 每阶段 commit

示例：

```text
feat(annotation): phase 01 migrate timeline markers
feat(timeline): phase 02 merge visual tracks
feat(structure): phase 03 add boundary editing
feat(annotation): phase 04 derive marker context
feat(timeline): phase 05 add semantic zoom navigation
test(timeline): phase 06 close semantic timeline verification
```

示例不意味着每阶段只能一个 commit。

### Commit 前

```powershell
git diff --check
git status --short
git diff
git diff --cached
```

检查：

- stage 是否只有当前 Phase。
- no secrets。
- no `.env`。
- no media。
- no browser profiles/cache/dist。
- no unrelated user changes。

### Push 后

至少核实：

```powershell
git rev-parse HEAD
git ls-remote --heads <remote> <branch>
```

可使用仓库/平台更合适命令，但必须在 verification record 留实际证据。

push 失败：

- 保留本地成果。
- 写原因。
- Phase 状态不能“已交付”。

## 6. 多 Agent 协作与文件所有权

如果一个 Phase 使用多个 agent，先声明文件 owner。

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
- final stage commit/push。

不要让两个 agent 同时改同一个 integration file 再“手工拼”。

如使用 worktree：

- record 每个 worktree branch/HEAD。
- integration owner 只集成已审查 commit。
- 进入下一 Phase 前当前 Phase 必要 commit 全部进入任务 branch 并 push。

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
- remote 是否包含。
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
- Git push gate。

若必须改变冻结契约：

- 先写 evidence/impact。
- 请求用户决定。
