> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 05 — Preparation Workspace + Official Shot Authority

## 目标

建立从媒体导入到 Official Shot 的唯一真实写入闭环，并让所有结构修改经 command + revision + lineage + downstream impact 处理。

## 必读

`PREPARATION_WORKSPACE.md`、`SHOT_STRUCTURE_CONTRACT.md`、Runtime Architecture、Command/Event Map、Analysis stale/remap 相关契约、Keyframe draft（仅参考已批准内容）。

## 核心调用链

Phase 01 必须已定位并在实施记录中写出真实路径：Import → Media Identity → Auto Shot Task → Candidate → Boundary Review → Shot Command → Repository Transaction → Structure Revision/Event → downstream impact。

## 实施步骤

1. **Import**：复用现有 media/project 服务；处理可用/失败/丢失媒体/重新关联/重开项目。Media identity 不由 UI 重建。
2. **Detection**：auto-shot/scene-engine/worker 只产生 task/candidate/evidence；运行时遵循 Phase 02 task lifecycle，设置在运行中锁定或明确版本化。
3. **Candidate 与 Official 分离**：任何 detector/worker 不得直接写正式 Shot；确认入口唯一进入 Shot command。
4. **Boundary Review**：以 Boundary 为导航实体，Review Queue 优先待确认/低置信/异常；中央 frame pair + 视频/预览 + Inspector + Timeline 证据。
5. **Commands**：ConfirmBoundary、MoveBoundary、SplitShot、MergeShots（名称以真实项目冻结）统一校验 `[startFrame,endFrame)`、expected revision、identity/lineage、transaction、event、undo/redo。
6. **Impact**：结构改变后只发标准 impact/stale/remap 输入，不能直接在 Shot command 里篡改 Analysis semantic value。
7. **Recovery**：保存失败保持未保存；reload 恢复已 commit 数据和明确可恢复的 session state。
8. **Keyframe**：若当前已有明确能力，仅按现状/已批准需求修复集成；不得根据 draft 自行新增复杂方案。

## 用户状态

空态、导入中/失败、待识别、识别中（真实或不确定进度）、可取消、候选完成、review 待处理、低置信/异常、确认、修改后需重新确认、稍后处理、全部完成、保存失败、媒体丢失、重开恢复。

## 不变量

- Shot structure 只有一个 Authority。
- 正式范围是整数帧半开区间。
- Candidate 未显式确认不进入 Official Shot。
- Structure revision 单调且 expected revision 冲突不静默覆盖。
- Undo/Redo 必须与 transaction/revision/history 一致。

## 旧路径退出

查找 auto-shot、timeline、analysis、calibration 中的直接 Shot repository writes；逐个改走 command port。迁移期间可保留读 adapter，不保留双写。

## 测试场景

- detector 输出但未确认 → Official Shot 不变；
- confirm/move/split/merge 正常和非法边界；
- expected revision mismatch；
- undo/redo + reload；
- task cancel/worker late result；
- save abort/quota；
- media missing/relink；
- 浏览器键盘/鼠标 Boundary Review。

## 阶段门槛

非 Shot Authority 的 direct write 搜索结果为 0（允许只读）；完整导入→review→official shot 闭环可验证；Analysis 只读消费正式 Shot。

## Preparation UX / Shot Authority 完整优化清单

原计划对 Shot Authority 覆盖充分，但对 `PREPARATION_WORKSPACE.md` 的具体体验优化不够显式。本阶段还必须落实：

### 连续任务与状态机
- Preparation 是“导入 → 智能切分 → Boundary Review → 完成”的连续任务，不是多个平级功能 Card/仪表盘；任何时刻有明确主操作。
- 空项目、已导入、待识别、运行中、识别完成、复核中、仍有待确认、全部完成、完成态、重开项目都能从状态机解释并恢复。
- 扫描/识别运行不使用阻断式 Modal 夺走上下文；长任务状态留在 Workspace，必要设置使用 Drawer。

### Import / Detection 设置
- 导入后展示必要媒体信息、可用性与失败/丢失/重新关联状态；重开项目不重新生成 media identity。
- 切分设置使用 Drawer；参数先用用户语言呈现，低频项放入“专家设置”，避免一次暴露全部工程参数。
- 运行中：有真实进度就展示真实进度；无法精确计算时明确“不确定进度”，禁止伪百分比；运行时设置锁定或显式版本化。
- **分析 Template 与 Analysis AI 必须从 Preparation 移除**，避免职责越界。
- Detection 完成后直接形成待 Review 的 Candidate/Boundary 集合，不要求重复进行一次没有新增意义的确认。
- “未来只检查不确定切点”保持为后续智能复核方向；本期至少让 Queue 能按低置信/异常/待确认优先，而不是强制全量逐镜扫描。

### Boundary Review 具体交互
- Header 显示当前媒体/复核进度/保存或异常，但不把检测技术指标变成视觉主角。
- Queue 默认优先待确认/低置信/异常；导航实体是 Boundary，而不是含糊 Segment。
- 中央 **Boundary Frame Pair** 是主证据；同时可查看视频上下文和切点预览，Inspector 承载细节，全片 Timeline 提供定位。
- “切点正确”是显式操作；支持键盘 Next/Prev/Confirm 等真实快捷键，并与全局快捷键不冲突。
- 支持微调、把边界移动到当前帧、删除切点、补切/拆分；低频动作放上下文菜单/Inspector，不把所有控件常驻。
- “待回看/Issues”统一为“稍后处理”队列；检测详情与 Confidence 克制呈现，Confidence 不等同于正式事实质量评分。
- Auto Next 只在安全条件下推进；任何 Move/Delete/Split 等修改后该 Boundary 必须重新确认，不因旧 confirm 状态静默沿用。
- Undo/Redo、dirty/saving/saved/error、全部完成与“仍有待确认项”都有明确界面；完成后可再次进入复核而不丢状态。

### Layout / visual / responsive / migration
- 遵守 Modal/Drawer/Inspector 使用规范、信息密度、视觉层级和“减少 Border Card / 正常弱化异常突出”的设计原则。
- 桌面为核心；窄屏/移动端按架构的查看/受限编辑边界处理，不为移动端强行复制全量高密度校准体验。
- 复用/迁移现有 auto-shot、shot-calibration、scene-calibration、shot 组件；按 V1/V1.5/V2 分级，不把 V2 智能复核误当本期完成条件。

## Shot 结构影响补强

- Split/Merge/Move 除 range/revision/lineage 外，还要保留/重建 identity、成员关系与下游引用语义；Shot command 只产生标准 impact，不直接“修好” Analysis semantic value。
- 任何 detector/calibration/timeline/analysis 的 direct formal write 都必须迁移到 command port；读取兼容 adapter 有明确删除条件。

## 完整性验收

浏览器验收至少覆盖：参数 Drawer/专家设置、真实/不确定进度、运行设置锁定、Boundary Queue 优先级、Frame Pair+视频、Preview、Confirm、微调/当前帧移动/删除/补切、稍后处理、Auto Next、修改后重新确认、Undo/Redo、保存失败、全部完成、重开恢复、媒体丢失/重新关联。Traceability 中 `PREPARATION_WORKSPACE.md` 与 Shot Contract 的所有章节均须有 evidence/deferred/non-goal。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
