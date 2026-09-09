# O1 — 正式结构、研究内容与存储契约

状态：验收通过待推送。前置：O0已交付。实现已落地并完成研究范围 IndexedDB round-trip 与导航恢复验证；当前阶段不换页面布局。

## 1. 冻结的产品规则

以下为落实已确认方向的计划级选择，不声称原架构已定义全部字段：

- Scene：场景组织层，允许至少一个连续镜头，同层不交叠。
- Sequence：较大的连续叙事单元，同层不交叠。可覆盖多个Scene，已有Scene与Sequence相交时应完全包含于Sequence，不允许半场跨Sequence边界。创建/调整任一层均需校验。
- Section：用户命名的功能段落层，例如开场、铺垫、收束；同层不交叠，可与Scene/Sequence交叉覆盖，不暗示父子关系。
- 三种结构都以连续正式镜头成员为权威，首版不加parentId或多方案结构树，不自动推断三幕。
- 临时/保存研究范围独立于三层结构，可重叠、跨层，按媒体时间定位。

如实际产品已有明确不同的Section定义，在O0记录真实冲突并给出调整方案；不能让不同组件各用不同语义。

## 2. 文件和职责

现有：`features/group/{types.ts,services/groupService.ts,services/reconcileShotGroups.ts}`、project types/repository、editor persistence/history、analysis viewModel、template types、shot types。完整前缀均 `apps/web/src/`。

建议新增（先检索同等职责）：

- `features/analysis/types.ts`：研究目标、范围、元信息与证据引用。
- `features/analysis/services/researchService.ts`：统一读取/修改目标内容；不复制已有Shot正文服务。
- `features/analysis/services/researchRangeService.ts`：时间范围校验、成员投影。
- `features/group/services/structureValidation.ts`：三层同一校验器。

仓储落原projectRepository；不得新建数据库或第二套项目序列化。对本期实际碰到的纯逻辑适度抽取，避免把业务继续写入EditorWorkspace。

## 3. 内容唯一权威

| 内容 | 唯一权威 | 新实体不得保存 |
| --- | --- | --- |
| Shot画面描述/解释 | StoredShotRecord.description/notes（当前会话shotNotes映射） | 相同正文副本 |
| Shot自定义字段 | StoredShotRecord.analysisFields / template快照 | 按标签猜出来的新字段集 |
| Group总结 | ShotGroupRecord.summary | 第二份Scene.summary |
| 新保存范围的内容 | ResearchRange正文 | 在每个成员Shot中复制同一范围笔记 |
| 目标问题/证据/研究状态 | ResearchContext元信息 | 复制时长/镜头列表等可推导真值 |

不废弃现有正文格式，不为页面迁移建立兼容双写。viewModel统一返回各目标需要的数据，写回按显式target路由到其权威实体。

## 4. 最小新实体（待实现类型）

### ResearchRange

- `id, projectId, mediaIdentityDigest`；必须同当前主视频身份。
- `startUs, endUs`：整数微秒 `[startUs,endUs)`，0≤start<end≤媒体结束，按源媒体时间轴。
- `title`：允许默认时间范围名称，可修改。
- `observation, interpretation, summary`：用户范围正文，允许空。
- `createdAt, updatedAt, revision`。

无需字段`shotIds`作权威；成员由当前正式镜头与范围的交集实时投影。与范围仅边界接触的Shot不算成员。

### ResearchContext

- `projectId, target: {kind:'shot'|'group'|'range', id}`，每目标一份元信息，key按project+kind+id。
- `question`：可选研究问题。
- `status:'not-started'|'in-progress'|'completed'`：用户明确状态，不根据字段比例自动完成。
- `needsReview:boolean`及原因、所依据正式结构版本；媒体/目标变化不静默维持完成状态。
- `evidence: EvidenceRef[]`、创建/更新时间、revision。

### EvidenceRef

按联合类型提供：已有截图ID、镜头ID、媒体时间点/范围、已有Marker ID、音频源时间范围。引用必须带project/media身份或经目标可验证，不保存Blob URL。

音频来源包含assetId、源起止时间及当时项目时间锚点，验证后定位；轨道移动后按同一映射解析。源被删除则显示证据不可用并保留笔记，禁止指向另一段声音。简单研究原视频声音可直接使用主视频媒体范围，不要求创建新音轨。

首版仅人工证据与已存在的检测来源；没有AI生成端就不建假AI状态。证据变成无效时保留描述与原身份，提供重新关联/移除引用，不静默删除用户分析。

## 5. 命令与保存

统一服务语义：`readTarget`、`updateTargetContent(target,patch,expectedVersion)`、`saveRange`、`updateContext`、`add/removeEvidence`、`create/update/removeStructure`。名称可适配既有代码，语义不可分叉。

正文与其元信息若在同一用户操作中提交，使用同一项目写队列与原子事务；不能先写完成状态后正文失败。expected version在仓储事务内验证，页面disabled不代替跨标签冲突控制。

范围第一次产生内容或被用户明确保存时才创建记录；纯拖选不每次写DB。临时范围进入研究并输入时先保存范围身份再写正文，失败保留草稿且不导航丢失。

新增IndexedDB stores用于research-ranges/research-contexts，名字/索引在该阶段冻结；基于O0实际版本增加schema，不硬编码v17，不清库。只有必要新增store升级，无历史模型转换或兜底双轨。

保存输入草稿按project+target隔离，串行去抖、失败保留并重试；显式切对象/保存并下一镜先await flush。快速晚到保存不能覆盖新版本；冲突展示本地内容并允许用户处理，不自动last-write-wins。

项目删除、读取、完整备份/导入、恢复快照需在本阶段接入新实体基础序列化，并做一次 round-trip；O5补完校准/导出/history端到端。新数据属于用户内容，不能被派生缓存清理。

## 6. 结构统一校验与reconcile

同步修改创建、调整范围、类别切换、导入校验、持久化和reconcile；目前getContiguousShotIds的最少两镜条件不能继续偷偷过滤单镜Scene。

非连续输入拒绝并说明缺口，不自动吞掉中间镜头。层间规则按§1验证。无效结构不能通过flatMap静默丢失summary：用户主动操作先拒绝；校准造成失效时按O5保存原内容和待复核状态/冲突记录，写入与结构更新同事务。

建议为Group增加明确有效性信息或独立reconciliation结果（valid/needs-review），冻结一种输出，所有消费者不能继续假定group必有两个有效成员。带问题记录仍可阅读、修正或删除，不画作可信完整结构。

## 7. 验证与交接

新增测试 `tests/features/overview-analyze/`：单镜结构、连续性、同层冲突、跨层覆盖、Sequence部分包含拒绝、Section交叉、类别切换、空/越界范围、半开边界、正文唯一、版本冲突、保存失败、项目隔离、备份round-trip。

O1新增实际运行入口 `test:overview-analyze`（Node tests；脚本需收集所有目录用例，空收集报错）。执行相关现有group/workflow/calibration契约测试、typecheck、build。

交接冻结类型、存储名/版本、服务签名、关联变化结果、时间基准和唯一正文读写映射。**验收后按总计划§7提交并push，记录代码SHA；推送成功才进入O2。**
