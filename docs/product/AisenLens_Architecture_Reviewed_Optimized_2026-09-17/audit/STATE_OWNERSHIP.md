# STATE OWNERSHIP

| State | Class | Owner | Persistent? | Rule |
| --- | --- | --- | --- | --- |
| Official Shot / AnalysisRecord / Template | Domain + Persistent | Repository/feature domain | Yes | must survive reload/backup |
| selectedShotId / selectedEntity | Workspace State | Analysis/Preparation workspace store | No | not a domain fact |
| currentFrame / playbackPosition | Application/Workspace | player/timeline coordination | Usually no | resume preference optional, not domain |
| viewport / zoom | UI/Workspace | Timeline view store | Preference only | never affects domain ranges |
| panelWidth / activeTab | UI State | local/workspace preference | Optional | not backup-critical domain |
| hover / dragging / openPopover | Temporary interaction | component/store | No | ephemeral |
| derived statistics / result rows | Derived State | selectors/query layer | Cache only | recompute from canonical records |
| waveform / thumbnail | Cache | media cache | Cache only | separate from formal data |
| Undo/Redo transaction | Application/History | command history | policy-dependent | must not be mistaken for canonical entity |

## Invariant

Zustand/React store 可以承载访问路径和临时 UI 状态，但不能因为“方便”就成为 Shot、AnalysisRecord、Evidence 或 Template 的唯一持久化 Source of Truth。


## Persistence clarification (2026-09-17 review)

- Canonical domain entities marked `Domain + Persistent` **must** be durable across reload and backup/restore; therefore their `Persistent?` value is `Yes`.
- `Cache only` and Workspace/UI preference state may be persisted for convenience, but must remain reconstructable and must never become the only copy of a domain fact.
- Persistence durability, quota, corruption recovery, multi-tab concurrency and backup integrity are governed by `../05-runtime/OPERATIONAL_ARCHITECTURE.md`.
