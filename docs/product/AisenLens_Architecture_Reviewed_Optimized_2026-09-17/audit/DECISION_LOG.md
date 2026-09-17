# DECISION LOG

## D-001 — Official Shot Authority
**Decision:** Preparation/Shot Authority 是 Official Shot/Boundary 唯一正式写入者。
**Reason:** 防止 Analysis/Timeline/Results 各自维护结构。
**Alternatives:** Timeline 自主写 Shot；Analysis 内直接修正。均否决。
**Impact:** Analysis 使用 correction flow；结构命令产生 revision/stale propagation。

## D-002 — Timeline positioning
**Decision:** Timeline 是“共享领域/应用能力 + Workspace View”的组合，不是 Analysis 私有数据模型。
**Reason:** 时间坐标、Range、Track/Marker 被多个工作区消费，而 viewport/hover/zoom 明显是 UI state。
**Impact:** Domain/Application/View 分层。

## D-003 — Analysis / Inspector separation
**Decision:** Inspector 编辑和展示 Analysis Data，但不是 Analysis Data 的存在原因。
**Impact:** Record/Candidate/stale/evidence semantics 留在 domain contracts。

## D-004 — Evidence / Provenance
**Decision:** EvidenceRef 与 Provenance 是共享分析契约；Provenance 贴近 Record/Candidate revision，避免每层复制。

## D-005 — Template boundary
**Decision:** 新增独立 `TEMPLATE_CONTRACT.md`；Template/Profile 不再作为万能 JSON，拆分 Layout/Renderer/Prompt/Context/ExportMapping。既有说明不删除，改为非权威 usage notes。

## D-006 — Results authority
**Decision:** Results 只拥有消费查询与派生产物，不拥有 Analysis Fact。

## D-007 — Content preservation
**Decision:** 除明确重复合并外，不任意删减输入内容。优先迁移、引用、Authority 注记和完整 archive。
**Reason:** 用户明确要求内容守恒，并需要长期追溯。
