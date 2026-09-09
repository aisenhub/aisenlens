# C1 — 校准草稿、领域命令与本地存储

前置：读取 00-master-plan.md，完成 C0。交付的是可测的真实模型与服务；本阶段不替换 UI。

## 1. 职责与建议文件

产品校准放在 `apps/web/src/features/shot-calibration/`，避免与现有研究用 `scene-calibration/` 混名。仅按职责创建需要的文件：

- `types.ts`：草稿、切点、待回看、巡视范围、命令与失败类型。
- `services/calibrationDraftService.ts`：由候选/正式镜头创建草稿、校验、范围投影。
- `services/calibrationCommandService.ts`：补切、移点、删点与撤销数据；复用 shot 纯函数。
- `stores/createCalibrationStore.ts`：项目作用域 Zustand 草稿状态、dirty/revision、选择和保存状态。
- `hooks/useCalibrationSession.ts`：项目生命周期、加载保存与事件连接；不内嵌 IndexedDB。
- `services/calibrationApplyService.ts`：C3 实现快照/事务编排；本阶段先定接口。

仓储修改落在现有 `features/project/services/projectRepository.ts` 及 `features/project/types.ts`；组件不能调用 IndexedDB。共享帧区间数学留在 `features/shot/services/`，不要两边各写一份。

## 2. 权威数据与时间语义

原始 `AutoShotTaskRecord.candidates` 不修改。一个当前校准草稿是一个完整连续分区，而非 excludedCandidateIds 的增强副本。第一帧 0 和结束哨兵 totalFrames 固定，内部切点满足严格递增；镜头范围统一 `[startFrame, endFrame)`。内部边界 B 表示右镜第一帧，左镜末帧为 B-1。

持久化一套权威内部切点与稳定区段身份；派生镜头列表、边界前后证据和统计。不并列维护可分别写入的 ranges 与 boundaries。建议草稿保存初始区段 ID 与命令生成的区段 ID 映射，投影时保持 ID；实现若采用 ranges 为权威，则必须由同一命令推导边界，不保存第二套独立权威。C1 结束前在交接中冻结其中一种，优先边界集合方案。

帧号必须对应当前项目已验证的时间基准，不能把平均 fps 当成所有 VFR 素材的真实帧索引。扩展的 PTS 映射在 C2 验证；无法准确映射时禁止精调写入，明确说明素材限制，不静默改用默认 FPS。

## 3. 最小模型契约

实现可调整命名，但不得缺少以下语义：

| 实体 | 必需数据 |
| --- | --- |
| Draft | id、projectId、mediaIdentity、timebase/totalFrames、baseProjectVersion、可选 baseTaskId/baseTaskVersion、initialSource（检测/正式镜头）、revision、保存时间、状态 |
| Boundary | stable id、frame、来源（检测/人工）、可选原 candidate 引用及原始位置、当前是否被人工移动、真实 transitionRange 引用 |
| Segment identity | 稳定 shot id、左右边界引用、源正式 shot/候选的 lineage；不得用列表 index 当 id |
| Review range | 帧范围、检查类型（播放经过/用户明确复核）、记录时间；有界合并存储 |
| Review issue | id、frame 或 range、人工备注、status（待回看/已处理）、创建时间；定位锚点默认是媒体帧而非 shot 序号 |
| Draft status | editing / applying / applied / conflict；加载保存错误单独表示，不能伪装 editing 已保存 |
| Apply receipt | draftId、appliedDraftRevision、正式版本、应用时间、recoverySnapshotId；用于幂等与重进判断 |

草稿不保存 Blob、URL.createObjectURL 结果、视频元素、解码器或逐帧 bitmap。媒体身份复用既有 fingerprint/digest 契约，不发明文件名匹配。

来源语义必须诚实：人工新增边界是 manual；自动边界移动后是自动来源＋人工修正，不能仍声称该新位置由引擎直接检出。候选 kind 的边界归属要查 result adapter 实际语义，禁止猜每个 candidate.startFrame 就是其检测 boundary。

## 4. 命令语义

| 命令 | 结果与约束 |
| --- | --- |
| SplitAtFrame | 根据 frame 找到唯一包含区段；内部新增边界；左段 ID 保留，右段新 ID；已有边界处拒绝并提示，无零时长段 |
| MoveBoundary | 同时改变左右区段；至少各保留一帧；超过邻界 clamp 并显示实际结果；拖动只预览，松开单次提交，Esc 恢复 |
| RemoveBoundary | 合并左右相邻区段，保留左段 ID；首尾哨兵不可删；不能解释成删除原视频 |
| AddReviewIssue / ResolveIssue | 媒体时间定位，不自动创建业务 Marker；删除切点后原待回看仍可按原时间找到 |
| Undo / Redo | 一次动作一次历史；无效操作不入栈；草稿历史不修改正式编辑器历史 |

历史至少覆盖全部草稿编辑和待回看变更。播放位置/选择/缓存加载/自动巡视采样不入历史；undo 导致变动的局部复核状态要重新计算。设置有限历史容量（建议初值 100 次，写成常量）；刷新后保留草稿，第一期无需持久化整条 undo 栈，UI 不显示虚假的可撤销状态。

命令输入包含预期 draft revision；同步命令原子更新，异步解码完成后核对媒体、草稿、选择版本，不让旧结果修改新目标。

## 5. 草稿来源规则

1. 当前媒体存在有效未应用草稿：恢复草稿。
2. 无草稿但已有正式镜头：以正式镜头建立草稿，包括在 Analyze 后续修改过的结构。
3. 无正式镜头且完成自动扫描：从检测结果建立草稿，完整覆盖媒体。
4. 无完成检测且无正式镜头：提供去 Prepare 建立镜头地图，不生成假候选。
5. 用户明确重新扫描并采用结果：展示对当前草稿/正式结构的影响后建立新草稿；不会因 task 完成事件自动覆盖人工修改。
6. 正式项目版本变化：草稿进入 conflict；保留现有草稿，不允许过期应用。给出“放弃此草稿并从当前镜头重新开始”和保留草稿返回的明确选择；第一期不实现自动合并冲突。

project version 必须覆盖正式文档写入；不能把当前只在内存里的 documentRevision 当成跨标签页一致性控制。复用可靠 expectedUpdatedAt 或仓储版本字段，在事务内比较。

## 6. 保存与项目生命周期

在既有 IndexedDB 添加独立 `shot-calibration-drafts` store（每项目当前媒体一个活动草稿，索引与 key 由 C1 固定）。如需 DB 版本升级，仅新增此 store/必要索引，不清库、不迁移旧候选为新草稿、不引入旧草稿兼容层。

保存采用串行写队列与 expected revision，建议 500ms 去抖；阶段切换/显式应用需 await flush。晚到的旧写不能覆盖新版本。保存失败保留内存草稿并显示“未保存，可重试”；不要等用户关页才保存，也不要承诺关闭浏览器前异步写一定完成。

项目切换释放订阅和解码请求；按 project+media key 隔离 store。媒体临时缺失时允许查看已保存草稿概要与待回看，禁用依赖精确画面的写操作；重新关联后先验证身份。

新草稿属于用户正式工作数据，不算派生缓存：

- 项目删除一并删除草稿。
- 当前完整项目备份/恢复/导入使用统一序列化接入草稿及关联来源元数据；不把可恢复能力留成口头声明。
- 导入的新项目 ID/媒体引用/源任务引用必须重新映射或清楚解除不可恢复依赖，不能指向别的项目记录。
- 普通派生缓存清理不删除草稿；恢复快照之后原草稿因正式版本变化失效或按快照一致恢复。
- 不为历史备份增加无需求的迁移层；保持现有读取行为，新增当前格式字段使用当前校验器。

## 7. 本阶段验收

新增测试放 `tests/features/shot-calibration/`，使用项目已有 Node test 风格，覆盖：首尾拒绝、重复补切、一帧镜头、连续补切、移动 clamp、合并、撤销恢复稳定 ID、来源不造假、候选不可变、媒体不匹配、串行保存、刷新重建和双标签页过期写拒绝。

全片分区始终连续且无交叠；草稿编辑前后正式 shots 完全不变。打印/快照对比不能取代真实行为测试。

通过 typecheck、相关领域测试和 build 后冻结命令/仓储接口，交接 C2。不要标记事务已完成，C3 尚须故障注入验收。
