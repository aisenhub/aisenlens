# 校准工作区升级验证记录

记录日期：2026-09-09（Asia/Shanghai）  
基线 commit：`a5d09f0769dfe0da8e3c1bf8f66bdb7d776fa259`  
最终状态：工作区有未提交修改；未创建新 commit。仅验收 Web。

## 本轮实际交付

- 新增 `apps/web/src/features/shot-calibration/`：独立校准草稿、稳定区段身份、补切/移点/合并/待回看/复核范围命令、Zustand vanilla store、串行历史栈和会话加载保存。
- IndexedDB 从 15 升级到 16，新增 `shot-calibration-drafts`，按 `projectId + mediaIdentityDigest` 隔离；项目删除会清理草稿。
- `CalibrateView` 改为播放器中心工作区，复用既有 `VideoPreviewCanvas`、`VideoPlaybackControls` 和 `FrameThumbnailStrip`；核心动作包括当前帧补切、边界一帧调整、合并、待回看、显式复核、撤销/重做和应用摘要。
- `projectRepository.applyCalibrationDraft` 在一个 readwrite transaction 中复验项目/草稿版本，并写入完整 editor state、task 应用事实和草稿回执；应用前创建 recovery snapshot。
- 新增领域测试和浏览器空项目阻断测试；新增根脚本 `test:shot-calibration` 与 `test:shot-calibration-browser`。
- 校准会话保存按草稿 revision 串行写入并做 CAS 校验；结构性改切只让受影响的显式复核范围失效，巡视轨迹继续保留。
- 无自动检测 task 但已有可验证媒体身份时，可从正式镜头或整片连续草稿进入校准；校准页快捷键已隔离正式编辑器的 Split/Merge/Undo 路径。
- 按 `impeccable` 要求执行一次 detector，结果为 `[]`。该技能影响了校准页的操作密度、状态文案、响应式布局和无伪造指标要求。
- 新增唯一媒体时间基准服务：从 Mediabunny encoded presentation packets 建立实际 PTS/frame 映射，支持 CFR/VFR 分类、边界时间戳定位和 24000/1001、30000/1001 理性帧率校验；避免全量视频解码扫描。
- 校准时间基准持久化实际 PTS 与 duration；编辑器 Apply 使用实际帧时间戳写入 shot，VFR 不再退化为 `frame / fps`。
- 新增独立 `BoundaryFramePair` 双帧边界检查器，展示前镜末帧、后镜首帧、帧号和 PTS，并支持解码失败重试。
- 本地文件选择在不支持 File System Access API 时保存 Blob 到 IndexedDB；真实素材刷新后可恢复，不要求用户重复选择文件。
- `applyCalibrationDraft` 增加 project/shots/groups/markers/template/task/draft receipt 七个故障注入点；验证事务全回滚与重复 Apply 幂等。
- 段落历史匹配改为索引查找；新增 100/1000/3000 边界压力矩阵和 1000 边界 20 次命令压力观测。
- 新增真实 `synthetic.webm` 浏览器端到端流程：关联、VFR/PTS 验证、当前帧补切、双帧边界检查、逐帧移动、刷新恢复；App/EditorPage 同步修复 URL 项目恢复。

## 命令结果

以下命令均在仓库根目录执行并退出码 0：

| 命令 | 结果 |
| --- | --- |
| `corepack pnpm typecheck` | 通过 |
| `corepack pnpm lint` | 通过 |
| `corepack pnpm test:shot-calibration` | 通过，7 tests |
| `node --test ../../tests/features/shot-calibration/calibration-real-media.browser.test.js` | 通过；HeadlessChrome 152，真实 `synthetic.webm`，VFR，347 帧，覆盖补切/双帧/刷新恢复 |
| `node --test ../../tests/features/shot-calibration/calibration-verification.browser.test.js` | 通过；PTS/CFR/VFR、七点故障注入回滚、幂等和压力矩阵 |
| `corepack pnpm test:shot-calibration-browser` | 最终回归通过，3 tests |
| `corepack pnpm test:workflow` | 通过，10 tests |
| `corepack pnpm test:workflow-browser` | 通过，1 test |
| `corepack pnpm test:auto-shot-contract` | 通过，6 tests |
| `corepack pnpm test:auto-shot-config` | 通过，5 tests |
| `corepack pnpm test:auto-shot-settings-store` | 通过，2 tests |
| `corepack pnpm test:scene-calibration` | 通过，6 tests |
| `corepack pnpm test:editor-history` | 通过，4 tests |
| `corepack pnpm test:retain-shot-map` | 通过，1 test |
| `corepack pnpm build` | 通过；仍有既有大 chunk warning（最大约 563 kB） |
| `node E:/Projects/Aisenlens/.agents/skills/impeccable/scripts/detect.mjs --json apps/web/src/features/workflow/components/CalibrateView.tsx apps/web/src/features/shot-calibration/components/CalibrationWorkspace.tsx apps/web/src/features/editor/components/EditorWorkspace.tsx` | 结果 `[]` |

测试过程产生的 Node `MODULE_TYPELESS_PACKAGE_JSON` warning 是仓库当前模块配置 warning，不影响退出码。

## C0–C4 状态

- C0：完成基线核实和真实入口追踪。确认旧 Calibrate 是候选保留/排除页，旧 apply 路径位于 `EditorWorkspace`。
- C1：核心模型、纯命令、项目/媒体隔离持久化、刷新重建、保存 CAS 和版本冲突阻断已实现并有领域测试；真实正式镜头/任务语义签名用于区分 hydration 更新时间与外部修改。
- C2：播放器中心布局、当前帧补切、边界命令、帧带、共享播放时钟、两类覆盖率、校准快捷键隔离、实际 PTS/VFR 映射和双帧边界检查器已完成并通过真实素材流程。
- C3：应用前快照、版本校验、完整七点故障注入、事务回滚、稳定 shot lineage 和重复 Apply 幂等已完成；复杂分析字段冲突附件/界面和完整跨标签回流矩阵仍不在本次交付范围。
- C4：目标静态检测、构建、领域回归、真实素材浏览器流程、事务验证浏览器流程和性能压力矩阵均通过；本次未生成四视口/双主题截图，压力矩阵是领域/命令与内存观测，不宣称完整 DOM 渲染压力结论。

## 已知限制

- 当前精确写入依赖项目已有 `AutoShotMediaIdentity` 和 declared frame rate；没有可靠媒体身份时校准页真实阻断。媒体时间轴支持 VFR，但仓库没有独立编码 VFR fixture，VFR 语义仍由实际 `synthetic.webm` PTS 和合成时间数组覆盖。
- CFR 23.976/29.97 通过 24000/1001、30000/1001 精确时间数组验证；本轮没有使用对应真实编码素材，因此不将其描述为真实 23.976/29.97 解码验收。
- 真实浏览器流程使用 HeadlessChrome 152.0.0.0（Windows，4 hardware threads，16 GB `deviceMemory`）；`synthetic.webm` 实测 347 帧、约 12.306 s、VFR。
- 压力观测：100/1000/3000 边界的 derive 分别约 3.5/36.9/84.7 ms，validate 约 0.7/10.8/20.4 ms；1000 边界连续 20 次命令约 558.6 ms。该数据用于回归比较，不是所有设备的性能承诺。
- 现有 build 的大 chunk warning 未由本轮改动引入，也未为压低 warning 改动引擎或检测算法。
- 未新增依赖；未修改 scene engine、检测 preset、阈值或 fixtures。
- C5（疑点引导、局部补检、变化峰值）未实施，也没有放置假入口。
