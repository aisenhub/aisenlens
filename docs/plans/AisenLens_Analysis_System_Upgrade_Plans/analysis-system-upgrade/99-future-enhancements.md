# 99 — 后续增强（不属于 P1–P5）

> 最小 optionId 与人工 set/unknown/not_applicable 已进入 P1，不得再推迟。完整 AI Review 已从 P4 移到本清单。
> 所有未来模块实施前仍按根 AGENTS 做定向研究与独立计划，不凭本文件启动实施。

## F1. 完整 Analysis Provenance 与字段 Evidence

在本期 entry 基础上设计来源 manual/AI/import/derived、revision history、review decision 与证据关联。description 的字段级状态/来源扩展须保持唯一物理真相，不双写。

开放 evidencePolicy=required 前，必须有证据持久化、失效判断与缺证据禁止接受的实际门槛。复用现有 EvidenceRef、整数微秒，不引入平行类型。

## F2. 专业 Taxonomy

基于已完成 optionId/label/retired 扩展标准 code、aliases、本地化、专业定义版本和明确升级 Diff。不能把本期稳定身份重新替换为 label 值。

色彩分为色相、冷暖、饱和度等明确维度；声音区分元素、主导性、叙事关系；时间段运镜/景别变化采用适合的 subject。专业定义变化使用新身份，不给既有粗粒度字段改含义。

## F3. AI Recipe / Execution

定义 input modality、frame/clip/audio/transcript/context dependencies、prompt/model/recipe version、local/cloud provider、成本和隐私提示、Run lifecycle、cancel/retry 和 Evidence extraction。敏感操作按现有后端边界执行。

能力可用性、执行状态和审阅状态分开建模，不混成一个状态枚举。候选必须经过 P4 守卫，不直接写 canonical entry。

## F4. Candidate / Decision Persistence 与完整 Review

一起设计和交付：
- run/candidate/decision/provenance 存储及清理；
- project/媒体/镜头边界/definition/profile/原值基线和过期检查；
- 人工接受、修改、拒绝、重复提交幂等；
- Current/Candidate/Evidence 对照、导航和审阅队列；
- 刷新/重开后的审阅状态恢复；
- 错误、取消、重试、过期建议与值已改变的处理。

P4 只提供最小类型与命令接缝，不代表这些 UI 已完成。不按“换数据源”估算真实 AI 接入。

## F5. 置信度校准与质量评价

没有校准数据不设通用 high/medium/low 阈值。按字段/模型/recipe 评估，记录接受、修改、拒绝率和证据质量；confidence 不是准确率。解释性判断优先 Evidence 与人工审阅，不靠分数自动确认。

## F6. 多 Subject 与 Relation

video/scene/frame/time_range/relation 每种实体都有稳定 ID、生命周期、媒体变化和结构编辑后的 stale/rebind 规则。Relation 表达视线匹配、动作匹配、图形匹配、对比、平行、声音桥等，不挤进单镜 notes 或布尔字段。

## F7. Derived Metrics

真实计算镜长分布、平均镜长、切换率、运镜占比、声音覆盖率；source=derived，不与主观节奏感受混淆。数值的时间范围、样本量、缺失值处理要明确。

## F8. 专业 Field Packs / Profiles

摄影、构图、灯光、叙事、剪辑、声音、短视频、MV、访谈等先完成定义/分类与真实用户任务评审。只有字段和交互具备时才发布模板，不以模板名称代替能力。

## F9. 更高级的录入与条件规则

多选 Batch 追加/移除、可配置快捷键、条件字段、时间段编辑等独立设计。条件隐藏只影响 UI，不删除值；循环、依赖、完成度、Undo 和性能必须有规则。

## F10. 跨项目模板与生态

模板导入导出、全局用户库、workspace/community/marketplace 需身份、词表、权限、来源版本、导入校验稳定后再做。不因该愿景提前创建云模板表或本期通用迁移器。

