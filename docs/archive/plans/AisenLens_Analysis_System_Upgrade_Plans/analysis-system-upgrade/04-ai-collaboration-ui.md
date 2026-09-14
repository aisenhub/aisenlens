# P4 — 最小 AI 契约与安全写入接缝

> 文件名保留为稳定计划入口；本期范围已从完整 AI Collaboration UI 缩减。
> 前置：P3 技术验收通过。类型和语义只引用 [共享契约](00-shared-contracts.md) 第 9 节。

## 1. 本期交付

只实现：
- AICandidate domain type；
- current/proposed 集合比较、原值基线比较；
- 主体/媒体/边界/definitionVersion/profileVersion 校验；
- 合法性、stale 与重复决策守卫；
- Accept/Edit 调用现有唯一字段命令的接缝；
- 纯函数与接缝集成测试。

不新增 Review 页面、Candidate Card、AIFieldOverlay、生产候选 store、逐字段 AI mode、AI 执行按钮或高中低 confidence 展示。当前界面如已有未接入说明，可维持诚实状态，不为本阶段制造新空页面。

## 2. 职责

按实际需要在 features/analysis/ai/ 放 types 与纯 decision/validation helpers，不机械新建组件。共享契约的 AICandidate 不在本文件重抄成另一类型。

Candidate 不持久化；测试 fixture 仅 tests/test-helper，production entry 不导入。没有真实来源就没有生产候选。

## 3. 基线与决策规则

候选绑定 project、shot、mediaIdentityDigest、整数微秒边界、definitionVersion、profileVersion 和生成时 baseEntry。当前值和建议不同是 comparison；生成基线已变是 stale；reviewStatus 独立表达 pending/accepted/edited/rejected。

接受前检验：
1. 候选属于当前项目和仍存在的目标；
2. 媒体和镜头边界仍相同；
3. definition/profile 版本仍有效，field usage 仍存在；
4. 当前 entry 与 baseEntry 一致；
5. proposedEntry 对当前 kind/options/state 权限合法。

任一失败不得写入或静默转换，返回明确原因。多选用集合比较，false/0 为真实值。重复 Accept 幂等；Reject 不清人工值；Edit 验证编辑后值。最终写入只调用 P1/P3 的命令，不能调用 DB。

description AI 不是本期接缝范围，不能绕过 description 的存储契约。

## 4. Evidence 与 confidence

EvidenceRef 直接复用，时间保持整数微秒 us。confidence 仅有限 0..1 或 null，不写通用 0.85/0.60 阈值、不称准确率。

本期 Evidence policy 不开放 required。未来开放时必须连同字段证据持久化和缺证据禁止接受一起实施，不能仅显示徽章。

## 5. 测试矩阵

- current/proposed 相同、不同行为；多选重排不产生伪冲突。
- baseEntry 被人工修改后候选 stale，即使候选本身合法也不写。
- 镜头删除/改边界、换媒体、定义版本/配置版本变化、field usage 移除均拒绝。
- option retired/未知 optionId、非法 kind、非法 confidence 不被静默改值。
- 接受调用唯一命令一次；重复决策不重复写；Reject 零写入。
- 测试 fixture 未被 production import。
- 生产无 provider、候选、假请求/进度或 enabled Run AI。

## 6. 验证与交接

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
corepack pnpm test:overview-analyze
```

新增 decision/command 专项测试并记录命令；如实际改动生产 Analyze UI，则补 overview-analyze-browser。不因本期没新增页面伪造浏览器 AI 工作流验收。

交接记录 future 仍需 provider/run/candidate persistence/decision provenance/evidence/review UX 和模型校准。不能写“UI 已完成，只换数据源即可”。技术通过后进入 P5。

