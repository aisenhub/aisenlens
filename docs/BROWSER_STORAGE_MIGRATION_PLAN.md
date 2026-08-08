# AisenLens 纯浏览器存储改造计划

## 1. 文档用途

本文档记录 AisenLens 从“本地项目文件夹 + 浏览器缓存”改为“纯浏览器本地工程”的改造计划。

后续每次实施代码修改时，必须同步更新本文档：

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[!]` 被阻塞或需要重新评估

每个任务完成后，在“实施记录”中填写实际修改的文件、验证命令和遗留风险。

## 2. 改造目标

### 2.1 目标

1. 工程可在纯浏览器环境中创建、编辑、自动保存和恢复。
2. 结构化工程数据使用 IndexedDB，视频和截图等二进制资源使用 OPFS。
3. 浏览器本地存储是工程的唯一正式来源，不再依赖用户选择的项目文件夹。
4. 提供完整的工程导出和导入能力，保证备份、迁移和恢复。
5. 明确处理浏览器配额、持久化权限、存储失败和孤儿资源。
6. 保留现有业务模块边界，存储细节集中在 `platform/` 和项目持久化领域。

### 2.2 非目标

- 不实现云端同步、账号系统或多人协作。
- 不保留旧的项目文件夹作为运行时兼容路径。
- 不把所有工程数据合并为一个巨大的 IndexedDB 记录。
- 不将视频内容上传到现有 API 服务。

## 3. 参考项目结论

参考目录：`opencut/opencut-classic-main`。该目录 README 标记为 Legacy，已归档，不应直接复制代码；只借鉴其存储分层和错误处理思路。

### 3.1 可借鉴的实现

| 能力 | OpenCut 参考 | AisenLens 计划 |
| --- | --- | --- |
| 工程结构化数据 | `apps/web/src/services/storage/service.ts` 中的 IndexedDB 工程记录 | 保留并扩展现有 `projects`、`shots`、`shotGroups` 等对象仓库 |
| 二进制资源 | `services/storage/opfs-adapter.ts` | 使用 OPFS 保存视频、截图、缩略图和可重建缓存 |
| 存储接口 | `StorageAdapter` 的 `get/set/remove/list/clear` | 建立 AisenLens 统一存储服务，业务层不直接依赖具体 API |
| 配额检查 | `services/storage/quota.ts` | 导入视频、批量截图和导入工程前检查容量 |
| 持久化存储 | `services/storage/use-storage-persistence.ts` | 应用启动后申请 `navigator.storage.persist()`，显示状态 |
| 数据迁移 | `services/storage/migrations/` | 工程格式和数据库版本分别维护迁移链 |
| 资源清理 | 保存失败时删除已写入的 OPFS 文件 | 使用事务状态和资源索引清理孤儿文件 |

### 3.2 不直接照搬的实现

OpenCut 将一个项目的大量场景数据序列化为单条记录。AisenLens 的分镜、截图和自动分析数据更适合按项目和实体拆分，并继续使用增量保存，避免每次编辑都重写整个工程。

## 4. 目标架构

```text
DOM / 应用编排层
        |
项目、分镜、截图、播放器等业务领域
        |
ProjectStorageService / MediaStorageService
        |                         |
IndexedDB                     OPFS
结构化数据、索引、元数据       视频、截图、缩略图、波形、临时缓存
        |
工程导入/导出（ZIP）
```

### 4.1 IndexedDB 对象仓库

建议保留现有仓库并补充资源索引：

- `projects`：工程元数据、版本、当前场景、自动分析状态、时间线视图状态。
- `shots`：分镜实体，按 `projectId + shotId` 建索引。
- `shotGroups`：镜头组实体，按 `projectId` 建索引。
- `settings`：应用设置、存储状态、迁移标记，不存放大文件。
- `screenshotAssets`：截图资源元数据、OPFS 文件名、尺寸、类型和大小。
- `mediaAssets`：视频/音频/图片媒体元数据、OPFS 文件名、大小、修改时间和状态。
- `projectBackups`（可选）：自动恢复快照索引，不保存重复的大二进制内容。

当前实现的 schema 契约如下。除 `settings` 外，工程相关记录均以数字 `projectId` 归属；Blob、File 和 Base64 内容不得写入这些仓库。

| 仓库 | 主键与索引 | 保存内容 | 删除策略 |
| --- | --- | --- | --- |
| `projects` | 自增 `id`；`title` 普通索引 | 标题、UUID、模板、时长、自动分镜状态、时间线视图、创建/更新时间 | 删除工程时删除自身，并触发关联仓库与 OPFS 清理 |
| `shots` | 自增 `id`；`projectId` 索引；`[projectId, shotId]` 唯一索引 | 单个分镜的结构化字段 | 按工程删除；增量保存按复合索引更新 |
| `shotGroups` | 调用方生成的 `id`；`projectId` 索引 | 镜头组标题、摘要和 `shotIds` | 按工程删除或整组重写 |
| `settings` | 字符串 `key` | 应用设置、最近工程、保存中断标记 | 仅显式删除指定键，不作为工程缓存清理目标 |
| `screenshotAssets` | `key`；`projectId`、`shotId` 索引 | 截图的 OPFS 文件名、尺寸、类型、大小和 `ready` 状态 | 删除/裁剪分镜时删除元数据和对应 OPFS 文件 |
| `mediaAssets` | `id`；`projectId` 索引；`[projectId, kind]` 唯一索引 | 视频等媒体的 OPFS 文件名、原名、MIME、大小、修改时间和状态 | 删除工程或替换媒体时删除元数据和对应 OPFS 文件 |

### 4.2 OPFS 目录约定

```text
projects/
  {projectId}/
    media/
      {assetId}.bin
    screenshots/
      {assetId}.bin
    cache/
      waveform-{assetId}.bin
      thumbnail-{assetId}.bin
```

OPFS 文件名只使用内部 ID，不使用用户输入的原始文件名；原始名称保存在 IndexedDB 元数据中。

## 5. 分阶段修改任务

### 阶段 A：存储边界和数据模型

- `[x]` A1. 定义浏览器本地工程为唯一正式来源
  - 修改 `docs/PROJECT_GUIDE.md`、`README.md` 中的数据边界描述。
  - 删除“项目文件夹是保存来源”的产品说明。
  - 明确 ZIP 是备份/迁移格式，不是运行时主存储。
  - 验收：文档中不存在互相矛盾的双主存储描述。

- `[x]` A2. 盘点并固定 IndexedDB schema
  - 以 `platform/indexeddb.js` 当前版本为基线。
  - 明确每个对象仓库的主键、索引、字段版本和删除策略。
  - 为 `mediaAssets` 增加结构化元数据（如当前实现没有则新增）。
  - 验收：所有工程字段都有唯一归属，禁止将 Blob 嵌入大型工程 JSON。

- `[x]` A3. 定义资源状态机
  - 资源状态至少包括 `pending`、`ready`、`failed`、`deleted`。
  - IndexedDB 元数据只有在 OPFS 写入成功后才标记为 `ready`。
  - 验收：中断、配额不足和刷新后不会产生不可解释的资源记录。
  - 已完成：`resource-state.js` 统一约束 `pending -> ready/failed/deleted` 等合法流转；视频和截图先写入 `pending` 元数据，OPFS 成功后才转为 `ready`，失败时保留 `failed` 与诊断信息并清理已写文件。

### 阶段 B：OPFS 媒体存储

- `[x]` B1. 新增统一 `opfs-storage.js`
  - 参考 OpenCut `opfs-adapter.ts`，提供 `get/set/remove/list/clear`。
  - 支持按 `projectId` 获取资源目录。
  - 使用安全的内部资源 ID 生成文件名。
  - 验收：视频和截图可以写入、读取、删除，并能在刷新后恢复。
  - 已完成：已在隔离 Chromium 中验证视频和截图的真实 OPFS 写入、刷新读取与删除清理；失败写入和浏览器完全重启后的恢复也已覆盖。

- `[x]` B2. 将截图资源主存储切换到 OPFS
  - 改造 `platform/screenshot-resource-store.js`。
  - IndexedDB 仅保留截图元数据和 OPFS 引用。
  - 清理、删除工程时同时删除元数据和 OPFS 文件。
  - 验收：截图批处理、缩略图恢复、截图清理全部通过。
  - 已完成：自动分镜会将首帧截图写入 OPFS，并在 IndexedDB 保存元数据；已验证刷新恢复、工程删除和异常写入清理。

- `[x]` B3. 将视频导入改为 OPFS 持久化
  - 改造 `platform/media-resource-store.js`、`features/project/project-media.js`、媒体加载流程和相关状态。
  - 首次导入视频时复制到当前工程的 OPFS 目录。
  - 保留原文件名、大小、`lastModified` 和 MIME 类型作为元数据。
  - 验收：刷新、关闭页面、重新打开工程后无需重新选择视频。
  - 已完成：实际“选择视频文件”入口会将视频写入 OPFS；已覆盖刷新读回、低配额失败清理和浏览器完全关闭后重新打开工程。

- `[x]` B4. 清理现有文件夹主路径
  - 将 `platform/filesystem.js` 从运行时工程读写中移除。
  - `features/project/project-writer.js` 改为导出器依赖，不再作为正式保存路径。
  - 删除目录句柄保存、恢复和授权请求流程。
  - 验收：核心创建、编辑、保存、加载流程不再调用 File System Access API。

### 阶段 C：存储服务和自动保存

- `[x]` C1. 建立 `ProjectStorageService`
  - 统一工程读写、列表、删除和恢复接口。
  - 业务模块通过服务调用，不直接散落调用 `db*` 函数。
  - 保留 `shot-persistence.js` 的增量写入能力。
  - 验收：项目业务层不再感知 IndexedDB 事务细节。

- `[x]` C2. 建立 `MediaStorageService`
  - 统一视频、截图、缩略图和波形资源接口。
  - 处理 OPFS 文件与 IndexedDB 元数据的双阶段提交和失败清理。
  - 验收：所有二进制资源均通过同一服务进入 OPFS。

- `[x]` C3. 规范自动保存策略
  - 编辑态使用防抖保存和增量写入。
  - 保存队列串行化，避免同一工程并发覆盖。
  - 页面关闭前尽力刷新队列，并在下次启动时检查未完成状态。
  - 验收：连续编辑、快速撤销/重做、刷新和重复打开均无数据回退。

- `[x]` C4. 增加恢复中心
  - 显示最近工程、最后保存时间、未完成写入和存储占用。
  - 只在存在可重建缓存时提供清理入口；正式工程数据和媒体资源不作为缓存清理。
  - 验收：用户可以区分正式工程数据与可清理缓存，设置页不会误删工程。

### 阶段 D：配额、持久化和错误处理

- `[x]` D1. 增加存储容量服务
  - 参考 OpenCut `quota.ts`，封装 `navigator.storage.estimate()`。
  - 预留安全余量，导入前估算文件大小。
  - 验收：容量不足时在写入前提示，不出现半成品工程。

- `[x]` D2. 申请持久化存储
  - 应用启动时查询 `persisted()`，再申请 `persist()`。
  - 显示“浏览器存储保护状态”，但不承诺绝对不丢失。
  - 验收：Chrome/Edge 中状态可读取；拒绝时仍能正常使用并提示风险。

- `[x]` D3. 统一错误诊断
  - 覆盖配额不足、OPFS 不支持、写入中断、数据库升级失败和权限错误。
  - 错误信息包含用户动作和可恢复建议（释放空间、重新打开、重试）。
  - 验收：所有存储失败路径都有用户可理解的提示和日志信息。

### 阶段 E：导入、导出和迁移

- `[x]` E1. 定义工程 ZIP 格式
  - manifest 中包含格式版本、工程 ID、文件清单、资源清单和更新时间。
  - JSON 与二进制资源分离，视频默认可选导出。
  - 验收：导出的 ZIP 可脱离当前浏览器保存和传输。

- `[x]` E2. 实现工程导出
  - 复用 `JSZip` 和现有 `project-writer.js` 的序列化逻辑。
  - 支持仅工程数据、工程数据 + 截图、完整工程 + 视频三种模式。
  - 已完成：新增独立 `project-backup-service.js`，按上述三种模式生成脱离浏览器的 ZIP，并在设置页接入导出入口。
  - 验收：导出包可在新浏览器配置中完整导入。

- `[x]` E3. 实现工程导入
  - 先校验 manifest 和资源清单，再写入临时 OPFS 目录。
  - 导入使用新工程 ID 作为隔离事务锚点，资源和实体写入全部成功后才切换当前工程；任一步失败都会删除该新工程及其 OPFS 资源。
  - 已完成：设置页接入 ZIP 导入入口；导入前校验格式、结构化 JSON 和资源清单，拒绝重复工程 UUID，OPFS/IndexedDB 写入失败会清理新建工程；修复设置运行时遗漏 ZIP 入口事件绑定的问题，并已在隔离 Chromium 中验证数据 ZIP 与完整视频/截图 ZIP 的导入、当前工程切换和刷新恢复，以及配额不足时的事务清理。
  - 验收：损坏 ZIP、版本不支持和重复工程 ID 都有明确处理。

- `[x]` E4. 建立数据库和工程格式迁移
  - IndexedDB 版本升级与工程 `formatVersion` 分开管理。
  - 每个迁移提供单元测试和失败日志。
  - 已完成：工程格式迁移拒绝高于当前支持版本或无效版本，并通过 `PROJECT_FORMAT_UNSUPPORTED` 明确上报；IndexedDB v6 独立迁移会补全旧资源状态、将无从确认 OPFS 引用的旧记录标记为 `failed`，并在 `settings` 中记录迁移结果和失败数量。
  - 验收：旧版本工程可以升级，迁移失败不会覆盖原数据。

### 阶段 F：测试和产品验证

- `[x]` F1. 存储适配器单元测试
  - 已完成：为 ZIP 备份的完整往返、仅数据导出、格式版本拒绝，以及工程文档 v1 升级、未来版本和无效版本拒绝建立 Node 单元测试；以内存 OPFS 覆盖文件读写删除、路径校验、截图和视频的异常回滚、删除兜底清理、持久化状态和视频配额预检；通过 `fake-indexeddb` 覆盖项目、分镜、分组、截图和媒体元数据的读写、列表、重复写入、删除及空值/参数错误边界。
  - 浏览器真实 OPFS/IndexedDB 联动留给 F2/F3。

- `[x]` F2. 浏览器端集成测试
  - 已完成：隔离 Chromium 端到端覆盖新建空工程、刷新恢复当前工程和确认删除工程；在真实 OPFS/IndexedDB 中写入视频和截图、刷新后读取，并清理对应的正式资源元数据；测试使用独立浏览器上下文，不会接触本机已有工程数据。
  - 已完成：通过真实设置页 ZIP 导入控件导入规范工程备份，并验证刷新恢复。
  - 已完成：使用实际“选择视频文件”入口创建工程，并验证视频资源写入正式 OPFS 后可读回。
  - 已完成：通过实际编辑器界面加载视频、启动自动分镜，并确认分镜记录与首帧截图资源均写入 IndexedDB/OPFS；同时覆盖异步工程加载、视频跳帧和 IndexedDB 事务提交的稳定性边界。

- `[x]` F3. 配额和中断测试
  - 已完成：在隔离 Chromium 中将浏览器可用容量模拟为低于视频资源需求，以及模拟 OPFS 根目录写入失败；两种 ZIP 导入失败均不会残留工程记录。使用独立浏览器用户目录验证完全关闭并重启浏览器后仍可恢复最后工程；刷新恢复由 F2 覆盖。

- `[ ]` F4. 桌面和移动尺寸验证
  - 在 Chromium 桌面端和移动端检查存储提示、导入进度、恢复页面和错误弹窗布局。

## 6. 推荐实施顺序

1. A1-A3：先固定数据边界和 schema。
2. B1-B3：先让 OPFS 能可靠保存媒体。
3. C1-C3：再统一服务并接入自动保存。
4. D1-D3：补齐配额、持久化和错误处理。
5. E1-E4：最后完成备份、导入和迁移。
6. F1-F4：每个阶段完成后持续验证，不集中到最后才测试。

## 7. 主要风险与应对

| 风险 | 应对 |
| --- | --- |
| 浏览器清理站点数据 | 申请持久化；提供醒目的 ZIP 导出；显示备份状态 |
| OPFS 配额不足 | 导入前估算；缓存和正式资源分区；提供清理入口 |
| 资源与元数据不一致 | 先写文件，后提交元数据；启动时扫描并修复索引 |
| 工程数据过大 | 分仓库保存；分镜增量写入；禁止把 Blob 放入工程 JSON |
| 浏览器兼容性差异 | 明确支持 Chromium 版本；启动时检测并给出阻断提示 |
| 迁移破坏旧工程 | 迁移前备份；逐版本迁移；迁移失败保留原记录 |

## 8. 当前项目对应的重点文件

- `apps/web/src/platform/indexeddb.js`：正式结构化数据层，负责 schema 升级和事务完成同步。
- `apps/web/src/platform/opfs-storage.js`：OPFS 目录、文件、删除和容量估算的基础适配层。
- `apps/web/src/platform/media-resource-store.js`、`screenshot-resource-store.js`：视频、截图资源的 OPFS 文件与 IndexedDB 元数据协同存取。
- `apps/web/src/platform/project-backup-service.js`：ZIP 备份的导出、资源清单和恢复读取服务。
- `apps/web/src/platform/filesystem.js`：仅负责普通本地视频选择，不承担工程文件夹读写。
- `apps/web/src/features/project/project-media.js`：工程视频的保存、恢复和删除入口。
- `apps/web/src/features/project/project-save.js`：自动保存与正式结构化数据写入入口。
- `apps/web/src/dom/settings-panel.js`：已提供存储容量、持久化状态和 ZIP 备份入口。
- `apps/web/src/app/storage-diagnostics.js`：统一 OPFS、配额、权限和数据库迁移错误诊断。

## 9. 实施记录

| 日期 | 任务 | 修改文件 | 验证 | 备注 |
| --- | --- | --- | --- | --- |
| 2026-08-08 | 建立改造计划 | `docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 文档审阅 | 尚未修改代码 |
| 2026-08-08 | B1、B2 OPFS 截图存储实现 | `apps/web/src/platform/opfs-storage.js`、`apps/web/src/platform/screenshot-resource-store.js`、`apps/web/src/platform/indexeddb.js` | `npm.cmd run build` 通过；OPFS 内存烟雾测试通过；后续 F2/F3 Chromium 验收通过 | 已移除 IndexedDB Blob 回退；截图创建、刷新恢复、工程删除和失败清理均已在真实浏览器验证。 |
| 2026-08-08 | B3 OPFS 视频持久化 | `apps/web/src/platform/media-resource-store.js`、`apps/web/src/features/project/project-media.js`、`apps/web/src/platform/indexeddb.js`、`apps/web/src/dom/video-session.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/app/media-runtime.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/main.js`、`apps/web/index.html` | `node --check` 通过；`npm.cmd run build` 通过；后续 F2/F3 Chromium 验收通过 | 视频先写入 OPFS 再提交 `mediaAssets` 元数据；已验证新建、重选、刷新恢复、浏览器重启恢复及配额不足失败清理。 |

| 2026-08-08 | B4 清理项目文件夹运行时主路径 | `apps/web/src/dom/project-save.js`、`apps/web/src/features/project/project-save.js`、`apps/web/src/app/project-persistence-runtime.js`、`apps/web/src/app/startup-runtime.js`、`apps/web/src/app/runtime-state.js`、`apps/web/src/app/entry-runtime.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/features/project/project-service.js`、`apps/web/src/main.js` | 目录句柄相关静态搜索无结果；`node --check` 通过；`npm.cmd run build` 通过 | 手动保存仅写入 IndexedDB/OPFS，删除项目仅清理浏览器本地数据；`filesystem.js` 只保留普通视频选择能力。 |

| 2026-08-08 | C1 ProjectStorageService | `apps/web/src/platform/project-storage-service.js`、`apps/web/src/features/project/project-service.js` | `node --check` 通过；`npm.cmd run build` 通过 | 项目创建、读取、更新、删除、项目包读取和 UUID 查询统一经由存储服务；分镜增量保存保留在 `shot-persistence.js`。 |

| 2026-08-08 | C2 MediaStorageService | `apps/web/src/platform/media-storage-service.js`、`apps/web/src/features/project/project-media.js`、`apps/web/src/features/screenshots/screenshot-assets.js` | `node --check` 通过；`npm.cmd run build` 通过 | 已统一视频与截图的 OPFS/元数据服务入口；缩略图和波形尚未有独立资源，不新增空实现。 |

| 2026-08-08 | C3 自动保存队列与中断恢复标记 | `apps/web/src/app/save-coordinator.js`、`apps/web/src/app/shot-autosave-controller.js`、`apps/web/src/app/project-state-runtime.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/main.js` | `node --check` 通过；`npm.cmd run build` 通过 | 复用现有 300ms 防抖和串行队列；写入开始时记录 IndexedDB 中断标记，成功后清除，应用启动时检测并提示恢复最近成功保存版本。 |

| 2026-08-08 | C4 恢复中心与正式数据保护 | `apps/web/src/platform/project-cache.js`、`apps/web/src/dom/settings-panel.js`、`apps/web/src/app/settings-runtime.js`、`apps/web/src/app/dom-bindings.js`、`apps/web/src/dom/template-bindings.js`、`apps/web/src/main.js`、`apps/web/index.html` | `node --check` 通过；`npm.cmd run build` 通过 | 设置页展示最近 5 个项目、最近保存时间、中断写入状态、项目和资源占用；移除会清空正式 IndexedDB/OPFS 数据的“清除项目索引缓存”入口。当前没有独立的持久化可重建缓存，因此不显示清理操作。 |

| 2026-08-08 | D1 存储容量预检 | `apps/web/src/platform/media-resource-store.js`、`apps/web/src/dom/video-session.js` | `node --check` 通过；`npm.cmd run build` 通过 | 复用 OPFS 容量估算服务；批量截图与视频导入均在写入前检查可用空间，视频导入额外保留 32MB 安全余量并给出明确提示。 |

| 2026-08-08 | D2 持久化存储保护 | `apps/web/src/platform/opfs-storage.js`、`apps/web/src/main.js`、`apps/web/src/dom/settings-panel.js`、`apps/web/src/app/settings-runtime.js`、`apps/web/src/app/dom-bindings.js`、`apps/web/index.html` | `node --check` 通过；`npm.cmd run build` 通过 | 启动时先读取 `navigator.storage.persisted()`，未保护时申请 `persist()`；设置页显示保护、拒绝、不支持或暂不可用状态，并提示仍需定期导出备份。 |

| 2026-08-08 | D3 浏览器存储错误诊断 | `apps/web/src/app/storage-diagnostics.js` | `node --check` 通过；`npm.cmd run build` 通过 | 统一识别配额、权限、OPFS 不可用、写入中断和数据库版本/约束失败；修复字符串错误码 `STORAGE_QUOTA_LOW` 未被识别的问题，所有提示均提供可执行恢复建议。 |
| 2026-08-08 | E1 ZIP 格式与 E2 导出服务 | `apps/web/src/platform/project-backup-service.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | `node --check apps/web/src/platform/project-backup-service.js` 通过 | 固定 `manifest.json`、结构化 JSON 和 `resources/` 二进制资源布局；导出支持数据、数据+截图、完整工程三种模式。 |
| 2026-08-08 | E2 工程导出入口、E3 导入事务 | `apps/web/src/platform/project-backup-service.js`、`apps/web/src/dom/settings-panel.js`、`apps/web/src/app/settings-runtime.js`、`apps/web/src/app/dom-bindings.js`、`apps/web/src/main.js`、`apps/web/index.html`、`apps/web/src/styles/main.css` | 相关文件 `node --check` 通过；`npm.cmd run build` 通过；JSZip 有效包与不支持版本烟雾测试通过；Chromium 桌面/390px 设置页无横向溢出 | 导出/导入均使用统一 ZIP 格式；导入先写入隔离工程并在失败时清理 OPFS/IndexedDB，重复 UUID 明确拒绝。尚未完成真实 Chromium 刷新/关闭恢复和配额不足端到端验证。 |
| 2026-08-08 | E4 工程格式上限校验 | `apps/web/src/features/project/project-migrations.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | `node` 迁移烟雾测试通过 | 旧版格式继续迁移到当前版本；高于当前版本或无效版本会以 `PROJECT_FORMAT_UNSUPPORTED` 明确失败，避免静默导入未知数据。数据库 schema 迁移日志仍待补齐。 |
| 2026-08-08 | A3 资源状态机、E4 IndexedDB v6 迁移 | `apps/web/src/platform/resource-state.js`、`apps/web/src/platform/media-resource-store.js`、`apps/web/src/platform/screenshot-resource-store.js`、`apps/web/src/platform/indexeddb-migrations.js`、`apps/web/src/platform/indexeddb.js`、`apps/web/test/` | `npm.cmd run test:web` 通过（20/20）；`node --check` 与 `git diff --check` 通过 | OPFS 资源写入采用 `pending -> ready/failed`；旧数据库资源记录会升级为可解释状态，无法验证的记录保留为 `failed` 并写入迁移日志。 |
| 2026-08-08 | A1 统一正式存储文档 | `README.md`、`docs/PROJECT_GUIDE.md`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 静态检索确认主存储描述改为 IndexedDB + OPFS | 删除“项目文件夹是保存来源”的说明；明确 ZIP 仅用于备份、迁移和恢复，清除站点数据会删除浏览器本地工程。 |
| 2026-08-08 | A2 固定 IndexedDB schema 契约 | `docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 对照 `apps/web/src/platform/indexeddb.js` 的主键、索引和删除路径 | 记录六个正式仓库的数据归属、索引和删除策略；禁止将 Blob、File 或 Base64 写入结构化工程记录。 |
| 2026-08-08 | F1 存储适配器单元测试 | `apps/web/test/project-backup-service.test.js`、`apps/web/test/project-migrations.test.js`、`apps/web/test/storage-adapters.test.js`、`apps/web/test/indexeddb.test.js`、`apps/web/package.json`、`package.json`、`package-lock.json`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | `npm.cmd run test:web` 通过（18/18）；`npm.cmd run build` 通过；`git diff --check` 通过 | 新增测试专用 `fake-indexeddb`，覆盖 ZIP、工程格式、OPFS 与 IndexedDB 正式仓库的读写、删除、列表、重复写入和失败边界；真实 Chromium 联动与配额中断仍留在 F2/F3。 |
| 2026-08-08 | F2 浏览器工程与资源生命周期验收 | `apps/web/test-browser/project-lifecycle.test.js`、`apps/web/test-browser/resource-persistence.test.js`、`apps/web/package.json`、`package.json`、`package-lock.json`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | `npm.cmd run test:web:browser` 通过（2/2） | 使用 `playwright-core` 启动已安装的 Chrome，并以独立上下文验证新建空工程、刷新恢复、删除，以及真实 OPFS/IndexedDB 视频和截图资源的刷新恢复、清理；用户界面级视频选择、自动分镜及 ZIP 导入流程待补。 |
| 2026-08-08 | E3 ZIP 导入入口绑定与 Chromium 验收 | `apps/web/src/dom/settings-panel.js`、`apps/web/src/app/settings-runtime.js`、`apps/web/test-browser/project-backup-import.test.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 以临时 Vite 服务运行 `node --test test-browser/project-backup-import.test.js` 通过（1/1） | 修复设置页备份控制器未注册 ZIP 事件，避免与既有设置事件重复绑定；验证设置页导入规范数据 ZIP、切换当前工程和刷新恢复。完整媒体 ZIP 与配额失败验收待补。 |
| 2026-08-08 | E3 完整 ZIP 与 F3 配额失败 Chromium 验收 | `apps/web/test-browser/project-backup-import.test.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 以临时 Vite 服务运行 `node --test test-browser/project-backup-import.test.js` 通过（3/3） | 验证完整 ZIP 的视频、截图资源导入后可在刷新后读回；模拟低可用容量时视频写入失败，导入事务会清理新建工程。F3 仍待 OPFS 写入失败与浏览器重启。 |
| 2026-08-08 | F3 OPFS 失败与浏览器重启验收 | `apps/web/src/features/project/project-service.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/main.js`、`apps/web/test-browser/project-backup-import.test.js`、`apps/web/test-browser/browser-restart.test.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | `npm.cmd run test:web:browser` 通过（7/7） | OPFS 清理失败不再阻断 IndexedDB 工程删除，调用方仍会收到资源清理错误；启动恢复不再依赖会在浏览器关闭后清空的 `sessionStorage`，模拟 OPFS 写入失败、容量不足和完全关闭/重启浏览器均已覆盖。 |
| 2026-08-08 | F2 视频选择界面验收 | `apps/web/test-browser/video-selection.test.js`、`docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 以临时 Vite 服务运行 `node --test test-browser/video-selection.test.js` 通过（1/1） | 浏览器内用 `MediaRecorder` 生成短 WebM，并经实际“选择视频文件”按钮创建工程；验证媒体资源已写入 OPFS 且可读回。自动分镜流程待补。 |

## 10. 决策记录

- 2026-08-08：确定纯浏览器版本采用 IndexedDB + OPFS；浏览器本地存储作为唯一运行时工程来源；ZIP 作为备份和迁移格式。
- 2026-08-08：OpenCut 仅作为架构参考，不直接复制其 Legacy 代码。
- 2026-08-08：截图二进制资源改为只使用 OPFS，IndexedDB 只保存资源索引；不保留 IndexedDB Blob 回退。

## 11. 页面结构借鉴建议

### 11.1 OpenCut 的页面层级

OpenCut 的核心产品流程是两级页面：

```text
/                         产品介绍页（外围页面）
└── /projects              工程管理页（第 1 级）
    └── /editor/:projectId 编辑器页（第 2 级）
```

`/projects` 负责工程列表、搜索、排序、网格/列表视图、新建、复制、重命名、删除和存储提示；`/editor/:projectId` 负责单个工程的全部编辑工作。编辑器内部的素材、预览、属性和时间线是面板，不再继续拆成路由。

参考：

- [OpenCut projects page](../opencut/opencut-classic-main/apps/web/src/app/projects/page.tsx)
- [OpenCut editor page](../opencut/opencut-classic-main/apps/web/src/app/editor/[project_id]/page.tsx)
- [OpenCut editor header](../opencut/opencut-classic-main/apps/web/src/components/editor/editor-header.tsx)

### 11.2 AisenLens 推荐路由

纯浏览器版本建议采用以下结构：

```text
/                         工程库首页，直接进入可用产品
├── /editor/:projectId    单工程编辑器
└── /settings              全局设置（可选，设置较多时启用）
```

不建议新增 `/projects/:id/overview` 或 `/editor/:id/shots` 等路由。AisenLens 的分镜表、播放器、波形、截图、自动分镜和导出都是同一个编辑工作流，拆成多个页面会增加工程状态恢复和媒体生命周期复杂度。

### 11.3 页面职责

#### 工程库首页 `/`

- 展示最近工程和全部工程。
- 新建工程、导入 ZIP、导出备份、搜索、排序、重命名、复制和删除。
- 显示每个工程的缩略图、视频信息、分镜数量、更新时间和存储状态。
- 处理 IndexedDB 初始化、迁移提示、OPFS 孤儿资源检查和持久化存储提示。
- 没有打开工程时，首页就是用户看到的第一屏；不额外增加营销落地页。

#### 编辑器 `/editor/:projectId`

- 进入时只加载目标工程，不扫描所有工程的完整数据。
- 顶部栏提供返回工程库、工程名称、保存状态、导出和全局菜单。
- 主工作区建议保持现有业务布局：左侧工具/素材，中间播放器与时间线联动，右侧属性面板，底部波形或分镜表。
- 工程设置、快捷键和存储管理使用抽屉或模态面板；只有内容规模明显超过编辑器辅助功能时才升级为 `/settings`。
- 离开页面前等待保存队列完成，失败时阻止静默离开并提供导出恢复选项。

#### 全局设置 `/settings`（可选）

仅放跨工程设置：主题、默认模板、快捷键、存储占用、持久化状态、缓存清理和备份策略。当前 `index.html` 中的设置标签可以迁移到此页，但工程内的模板选择和分镜字段配置仍留在编辑器上下文。

### 11.4 与当前 AisenLens 的对应改造

- `[x]` G1. 将工程库设为应用首页
  - 参考当前 `dom/project-navigation.js`、`dom/project-session.js` 和 `app/project-context.js`。
  - 用 URL 路由表达当前工程，不再主要依赖 `project_id` 查询参数和 `lastProjectId` 自动跳转。
  - 已完成：`/` 仅初始化工程库，`/editor/:projectId` 仅恢复 URL 指定工程；新建工程和 ZIP 导入完成后都会进入唯一工程 URL。
  - 验收：刷新 `/` 保持在工程库；刷新 `/editor/:projectId` 只恢复该工程。

- `[x]` G2. 拆分工程库与编辑器壳层
  - 从 `index.html` 和 `main.js` 中提取工程库视图、编辑器视图和共享应用初始化。
  - 工程库只读取工程元数据；编辑器再加载 shots、groups、media 和截图资源。
  - 已完成：入口按路由动态加载 `library-entry.js` 或 `main.js`；工程库只调用 `dbGetAllProjects`，不初始化播放器、完整分镜或媒体资源。
  - 验收：工程库打开速度不受最大工程完整数据量影响。

- `[x]` G3. 建立编辑器顶部导航
  - 参考 OpenCut `editor-header.tsx`，提供返回工程库、工程名编辑、保存状态、导出和菜单。
  - 返回前调用统一的保存队列刷新方法。
  - 已完成：顶部栏提供返回工程库、可原位编辑的当前工程名、保存状态、导出与设置；已移除编辑器内的新建、导入和项目管理菜单。无视频工程只显示“加载视频”入口；返回入口会先刷新自动保存和分镜保存队列，失败时保持在编辑器并显示错误。
  - 验收：返回、重命名、导出和离开失败提示在所有编辑器入口一致。

- `[x]` G4. 将设置从编辑器主 DOM 中隔离
  - 将 `index.html` 的设置面板改为独立设置视图或抽屉。
  - 不让设置页面持有播放器、分镜列表或截图资源实例。
  - 已完成：设置保持为独立模态面板，工程库路由不会加载编辑器模块或设置运行时；设置打开和关闭只操作面板状态，不重新创建播放器或工程资源。
  - 验收：打开设置不会触发完整工程重新加载，关闭后编辑状态不丢失。

- `[x]` G5. 增加工程库视图状态
  - 参考 OpenCut `projects/store.ts`，保存搜索、排序和网格/列表视图偏好。
  - 选择状态只在当前页面会话中保存，不进入工程数据。
  - 已完成：搜索词、排序和网格/列表偏好写入独立的 `localStorage` 键；没有实现跨刷新批量选择恢复，也不会污染工程记录。
  - 验收：刷新后保留用户的列表偏好，但不会恢复过期的批量选择。

### 11.5 页面拆分验收标准

1. 新用户打开 `/` 就能看到工程库和“新建/导入工程”操作。
2. 打开工程后 URL 能唯一标识工程，浏览器刷新不会回到错误工程。
3. 工程库不加载视频 Blob、完整截图和全部分镜实体。
4. 编辑器只有一个主工作页面，核心操作不依赖多页面跳转。
5. 从编辑器返回工程库时，自动保存、资源写入和错误提示状态明确。
6. 桌面端和窄屏端均无路由级遮挡、内容溢出或返回入口丢失。

## 12. 实施记录

| 日期 | 任务 | 修改文件 | 验证 | 备注 |
| --- | --- | --- | --- | --- |
| 2026-08-08 | 建立页面结构建议 | `docs/BROWSER_STORAGE_MIGRATION_PLAN.md` | 对照 OpenCut 路由与 AisenLens 当前查询参数流程 | 尚未修改页面代码 |
| 2026-08-08 | G1-G5 页面结构改造 | `apps/web/index.html`、`apps/web/src/app/bootstrap.js`、`apps/web/src/app/routes.js`、`apps/web/src/app/library-entry.js`、`apps/web/src/dom/project-library.js`、`apps/web/src/features/project/project-backup-import.js`、`apps/web/src/main.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/dom/project-bindings.js`、`apps/web/src/styles/main.css`、`apps/web/test-browser/` | `npm.cmd run test:web` 通过（18/18）；`npm.cmd run build` 通过；隔离 Chromium 工程库与 ZIP 测试通过（5/5） | 根路径为轻量工程库，工程编辑采用 URL 唯一标识；工程库直接导入 ZIP，编辑器支持重命名和保存后返回；工程库筛选/排序/视图偏好可刷新恢复。 |
| 2026-08-08 | G3 编辑器入口收敛与浏览器存储验收 | `apps/web/index.html`、`apps/web/src/app/routes.js`、`apps/web/src/app/project-session-runtime.js`、`apps/web/src/dom/project-session.js`、`apps/web/src/dom/project-bindings.js`、`apps/web/src/dom/shot-list-controller.js`、`apps/web/src/dom/video-session.js`、`apps/web/src/dom/settings-panel.js`、`apps/web/src/dom/screenshot-controller.js`、`apps/web/src/features/player/video-seek.js`、`apps/web/src/platform/indexeddb.js`、`apps/web/test-browser/` | `npm.cmd run test:web` 通过（20/20）；`npm.cmd run test:web:browser` 通过（10/10）；`npm.cmd run build` 通过 | 工程库是唯一的新建和 ZIP 导入入口；编辑器仅打开 URL 指定工程，工程名可原位编辑，设置中不再提供项目导入。自动分镜现在会将截图资源写入 OPFS；异步恢复不会覆盖新分镜，跳帧与 IndexedDB 事务提交均等待实际完成。 |
