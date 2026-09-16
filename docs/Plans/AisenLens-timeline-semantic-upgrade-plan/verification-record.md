# Verification Record — AisenLens Semantic Timeline Upgrade

> 计划状态：仅模板，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 规则：本文件只记录后续真实执行事实；计划阶段不得预填“测试通过”“阶段完成”“commit SHA”“push 成功”。


## 1. 项目与基线

| 字段 | 实际值 |
|---|---|
| 本次目标 | AisenLens Semantic Timeline Upgrade |
| 第一期范围 | Phase 01–06 |
| 第二期/后续 | Phase 07–09；未获明确授权时不实施 |
| GitHub 仓库 | `aisenhub/aisenlens` |
| 本地项目绝对路径 | 未开始 |
| Git remote 名称/URL | 未开始 |
| 工作分支 | 未开始 |
| 起始 commit | 未开始 |
| 本次规划参考 commit | `28d8263d627778194b92ee86160e14fee7b26997`，仅规划参考，不是执行时事实 |
| 初始工作区状态 | 未开始 |
| 初始已有修改及归属 | 未开始 |
| OS | 未开始 |
| Node | 未开始 |
| pnpm/Corepack | 未开始 |
| Browser/version | 未开始 |
| 已知基线失败 | 未验证 |

执行 agent 开始时必须先填写本节，不能直接把“规划参考 commit”复制为“起始 commit”。

## 2. 阶段状态总表

允许状态：

- 未开始
- 进行中
- 已阻塞
- 验证失败
- 验收通过待推送
- 已交付

“已交付”必须同时满足：

1. 阶段实施完成。
2. 阶段必要验证实际通过。
3. 阶段必要 commit 已创建。
4. commit 已成功 push。
5. 远程 branch 已确认包含 commit。
6. 本记录已写入实际证据。

| 阶段 | 名称 | 状态 | 已完成内容 | 剩余/阻塞 | 前置依赖 | Code commit | Push | GitHub link |
|---|---|---|---|---|---|---|---|---|
| 01 | Contract / Marker v2 / Persistence | 未开始 | 无 | 全部 | 无 | 未开始 | 未开始 | 未开始 |
| 02 | Track System / Visual Backbone | 未开始 | 无 | 全部 | 01 | 未开始 | 未开始 | 未开始 |
| 03 | Structure Boundary First | 未开始 | 无 | 全部 | 01,02 | 未开始 | 未开始 | 未开始 |
| 04 | Marker Context / Scope | 未开始 | 无 | 全部 | 01–03 | 未开始 | 未开始 | 未开始 |
| 05 | Semantic Zoom / Navigation | 未开始 | 无 | 全部 | 01–04 | 未开始 | 未开始 | 未开始 |
| 06 | Integration / Cleanup / Final Gate | 未开始 | 无 | 全部 | 01–05 | 未开始 | 未开始 | 未开始 |
| 07 | AI Structural Suggestions | 未开始 | 无 | 第二期 | 01–06 | 未开始 | 未开始 | 未开始 |
| 08 | Dialogue / Emotion | 未开始 | 无 | 第二期 | 01–06，建议在 07 可独立研究 | 未开始 | 未开始 | 未开始 |
| 09 | Future Analysis Tracks | 未开始 | 无 | 后续 | 08 至少验证 2 类真实轨 | 未开始 | 未开始 | 未开始 |

## 3. 每阶段实施记录

后续每个阶段收尾时复制并填写以下模板。

### Phase XX — [阶段名称]

**状态：** 未开始  
**开始日期：** 未开始  
**完成/停止日期：** 未开始  
**开始时 HEAD：** 未开始  
**最终验证 HEAD：** 未验证  
**工作区开始状态：** 未开始

#### 3.1 实际修改文件

| 文件 | 新增/修改/删除 | 实际职责 | 归属 Agent |
|---|---|---|---|
| 未开始 | 未开始 | 未开始 | 未开始 |

不得把“计划建议修改文件”直接复制成“实际修改文件”。

#### 3.2 已实现的用户行为/系统行为

未开始。

填写时应具体，例如：

```text
- M 在当前 frame 打开自由文本 Marker draft。
- 保存后 Marker 进入 editor state，400ms autosave 后可 reload 恢复。
- Structure boundary drag 在 pointerup 仅产生 1 个 history entry。
```

不要写“优化了体验”。

#### 3.3 已冻结/新增的数据、接口和跨阶段契约

未开始。

只记录**已经实际落地**且下游必须依赖的事实，例如：

- Marker v2 的最终字段。
- Track Registry 最终 ID。
- structureCommands 实际 API。
- semantic zoom 实际 threshold。

若与计划不同，必须在下一节解释。

#### 3.4 与原计划的偏差

未开始。

格式：

| 偏差 | 原因 | 证据 | 对下游影响 | 是否需用户决定 |
|---|---|---|---|---|
| 无/未开始 |  |  |  |  |

不能因为“代码能跑”就不记录架构偏差。

#### 3.5 新增依赖

未开始。

如果无，明确写：

```text
无。
```

若有：

- 包名/版本。
- 为什么现有依赖不足。
- 安装命令。
- lockfile 变化。
- 是否影响 webhome/desktop/mobile。

#### 3.6 尚未完成或未验证

未开始。

必须保留：

- 未运行的平台。
- 未覆盖数据规模。
- 未验证浏览器。
- 已知非阻塞问题。

## 4. 验证记录

### 4.1 单次验证记录模板

#### [YYYY-MM-DD HH:mm] Phase XX / HEAD `[SHA]`

| 字段 | 实际值 |
|---|---|
| 验证目标 | 未验证 |
| 命令/操作 | 未验证 |
| 运行目录 | 未验证 |
| OS/Node/pnpm | 未验证 |
| Browser/version | 未验证 |
| Viewport/theme | 未验证 |
| 测试素材/fixture | 未验证 |
| Exit code | 未验证 |
| 结果摘要 | 未验证 |
| Warning | 未验证 |
| Log path | 未验证 |
| Screenshot path | 未验证 |
| 失败原因 | 未验证 |
| 修复措施 | 未验证 |
| 复测 HEAD | 未验证 |
| 复测结果 | 未验证 |

规则：

- 没有实际运行命令时，不填写 exit 0。
- UI 手测也要写具体步骤和可观察结果。
- 验证后相关代码如果发生改变，补充：
  - “原验证仅覆盖 HEAD xxx”
  - 新 HEAD 需要复测。
- 失败记录必须保留；修复后追加复测，不把失败改写成“从未失败”。

### 4.2 第一阶段数据专项

| 检查 | 状态 | 对应 HEAD | 实际命令/操作 | 证据 |
|---|---|---|---|---|
| v17→v18 Marker store migration | 未验证 | 未验证 | 未验证 | 未验证 |
| Recovery snapshot Marker migration | 未验证 | 未验证 | 未验证 | 未验证 |
| Backup v4 export/import round-trip | 未验证 | 未验证 | 未验证 | 未验证 |
| Marker save failure | 未验证 | 未验证 | 未验证 | 未验证 |
| Group save failure | 未验证 | 未验证 | 未验证 | 未验证 |
| Atomic editor transaction | 未验证 | 未验证 | 未验证 | 未验证 |
| `expectedUpdatedAt` stale conflict | 未验证 | 未验证 | 未验证 | 未验证 |
| Autosave single-flight | 未验证 | 未验证 | 未验证 | 未验证 |
| Undo Marker create/update/delete | 未验证 | 未验证 | 未验证 | 未验证 |
| Undo structure split/move/merge | 未验证 | 未验证 | 未验证 | 未验证 |
| Boundary drag cancel | 未验证 | 未验证 | 未验证 | 未验证 |
| Recovery restore Marker + Groups | 未验证 | 未验证 | 未验证 | 未验证 |

### 4.3 Browser 操作专项

| 场景 | Browser/version | Viewport/theme | 测试项目/fixture | 状态 | 证据 |
|---|---|---|---|---|---|
| Empty project | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| 1 Shot | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Multi-shot no structure | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Scene-only | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Scene + Sequence | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Full hierarchy | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Sparse legacy groups | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Marker create/edit/delete | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Marker scope + expanded track | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Boundary create/move/merge | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Promote/Demote | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Semantic zoom | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Macro collapse | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Breadcrumb | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Enter structure focus → drill | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Enter no focus → Shot split | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Esc local cancel | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Esc navigation go-up | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Track prefs reload | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Waveform unavailable | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |

### 4.4 性能专项

不得预填“60 FPS”。

每次记录真实条件：

| 字段 | 实际值 |
|---|---|
| Browser/version | 未验证 |
| CPU/device context | 未验证 |
| Viewport | 未验证 |
| Shot count | 未验证 |
| Marker count | 未验证 |
| Section/Sequence/Scene count | 未验证 |
| Visible tracks | 未验证 |
| Semantic zoom level | 未验证 |
| Frame thumbnails | 未验证 |
| Waveform | 未验证 |
| Measurement method | 未验证 |
| Long tasks / profiler finding | 未验证 |
| 实际结论 | 未验证 |

## 5. GitHub 交付记录

| Phase | Branch | Code commit SHA | Record commit SHA | Push result | Remote contains code? | GitHub link |
|---|---|---|---|---|---|---|
| 01 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 02 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 03 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 04 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 05 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 06 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 07 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 08 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 09 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |

规则：

1. 代码 commit 可以先 push。
2. 然后在本文件记录代码 SHA。
3. 再单独 commit/push verification record。
4. 不要求某个 commit 自己记录自己的最终 SHA。
5. 不要反复 amend 追逐“最新 record commit”。
6. push 失败必须保留失败原因，Phase 不能写“已交付”。

### Push 失败记录模板

```text
Phase:
Branch:
Local HEAD:
Remote:
Command:
Error:
Local work preserved: 是/否
Recommended next action:
Resolved at:
Final push result:
```

## 6. 交接信息

### 6.1 下一阶段从哪里开始

未开始。

填写时写：

- 入口文件。
- 已稳定 API。
- 最后一个已交付 commit。
- 需要先读的上游记录。

### 6.2 必须先解决的问题

未开始。

如果没有：

```text
无。
```

### 6.3 可以直接复用的接口和能力

未开始。

### 6.4 不应重复实施的工作

未开始。

例如未来可以写：

```text
- Marker legacy migration 已在 Phase 01 完成，不要再新增第二个 converter。
- Track Registry 已在 Phase 02 建立，不要在 EditorTimeline 再写 label/default map。
```

### 6.5 当前未提交修改及归属

未开始。

格式：

| 文件 | 修改归属 | 是否允许新 Agent 改动 | 说明 |
|---|---|---|---|

### 6.6 需要用户决定的事项

本计划阶段已知、但**不阻塞第一期**的未来问题：

1. **外部 Backup v3 是否必须恢复**  
   当前项目规范只承诺当前格式。本计划默认 v4 替代 v3，不维护 runtime fallback。若实施前确认已有必须恢复的 v3 外部用户备份，需要产品 owner 明确决定是否做一次性 converter。

2. **AI Structure 的真实信号与 score**  
   Phase 07 必须先研究。第一期不需要决定。

3. **Dialogue / Emotion 的 canonical 数据源**  
   Phase 08 必须先研究/决定。第一期不需要决定。

除上述外，目前：**无**。

## 7. 第一阶段总验收

状态：未验证。

- [ ] Phase 01 已交付
- [ ] Phase 02 已交付
- [ ] Phase 03 已交付
- [ ] Phase 04 已交付
- [ ] Phase 05 已交付
- [ ] Phase 06 功能、清理、文档完成
- [ ] Marker v2 / DB v18 / Recovery / Backup v4 实际验证
- [ ] Structure Boundary First 实际验证
- [ ] Marker context/scope 实际验证
- [ ] Semantic Zoom / Navigation 实际验证
- [ ] 关键 Browser matrix 实际验证
- [ ] 性能验证记录包含真实条件
- [ ] `corepack pnpm verify:web` 在最终相关 HEAD 实际执行并通过
- [ ] 相关 commit 已全部 push
- [ ] Remote branch 已核对
- [ ] Active architecture docs 已同步
- [ ] 无假 future Track / AI / confidence
- [ ] 无旧 runtime Marker/Track/Group 主路径
- [ ] verification record 没有虚假“通过”

## 8. 最终交付摘要模板

实施完成后填写：

```text
First-phase status:
Branch:
Final code HEAD:
Final record HEAD:
Remote link:

Delivered:
- ...

Verified:
- ...

Known limitations:
- ...

Not verified:
- ...

Future:
- Phase 07 ...
- Phase 08 ...
- Phase 09 ...

User decisions needed:
- 无 / ...
```
