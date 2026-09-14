# O2 — 共享研究会话、导航和稳定播放器

状态：已交付。前置：O1已交付。会话、导航与稳定播放器已实现，并通过真实 synthetic.webm 回归；目标是贯通真实状态与观看运行时。

## 1. 修改范围

现有 `features/editor/{session/ProjectSessionProvider.tsx,session/ProjectSessionRuntime.tsx,stores/createProjectEditorStore.ts,hooks/useVideoPlayback.ts,hooks/useEditorPersistence.ts,components/EditorWorkspace.tsx}`；workflow types/location/navigation；分析工作区与现有VideoPreviewCanvas/Controls；EditorPage按需接入。

建议新增研究会话slice、`useResearchNavigation.ts`、`useResearchTargetEditor.ts`，归 `features/analysis/` 或现有editor session内。不得两个store各持有可写currentShot/time。需要共享渲染容器时抽取 `features/video/components/VideoViewer.tsx` 为组合层，不另写播放引擎。

## 2. 会话契约

- `mode:'sequential'|'range'`。
- `scope`: full-film / groupId / savedRangeId / transient media range。
- `target`: null / shotId / groupId / rangeId / 已有证据对象；使用显式联合类型。
- `playhead`:读取唯一媒体时钟，不能与target绑定。
- `queue`:稳定Shot ID列表、筛选定义、当前位置；不要持久化显示序号。
- `followPlayback`：可选跟随；编辑开始后暂停跟随，不改当前target。
- `returnContext`：范围研究之前的sequential队列、筛选、target和滚动；总览film/structure、选区、缩放与滚动单独保留。
- `targetDrafts/saveState`：按目标保存，状态editing/saving/saved/error/conflict真实显示。

研究模式、范围、选择和视窗属于项目会话；正文/研究状态属于O1实体；对象URL、decoder不序列化。切项目清理引用和回调，媒体缺失时已有内容仍可读。

## 3. 导航契约

在现有project/stage/view上扩展有验证的导航目标：`mode`、`scopeKind/scopeId`、临时范围`fromUs/toUs`、`targetKind/targetId`。同一kind所需字段不齐或不存在时显示合理空态/失效说明，不选同序号对象替代。

URL仅承载用户导航，不每帧更新。细粒度滚动/缩放保存在项目会话及可恢复本地视图状态，不把全部镜头队列放URL。刷新可恢复当前scope/target；浏览器后退恢复导航快照。直接链接缺少返回快照时回到对应总览并高亮范围，不构造虚假浏览历史。

导航命令统一：previewTarget（不换stage）、enterResearch、enterSequential、returnToSequential、returnToOverview、openCalibrationAt。它们处理flush、选择和范围验证，不能由各按钮组合setActiveShot/setCurrentTime后各自遗漏步骤。

显式选Shot默认定位并保持暂停；播放按钮负责开始播放。正在播放时切导航重点不重置速度/静音/位置。用户定位是否继续播放沿同一已定义操作语义，不能不同页随机变化。

## 4. 稳定观看运行时

把播放运行时提升到项目内稳定宿主，Analyze的Scenes/Shots/Sound只换导航/面板；总览预览复用同一运行时。优先保持同一video DOM；响应式通过布局/面板变化实现，不用两个隐藏video。

总览无预览时隐藏/折叠渲染可行，但不自动播放声音；切换stage保留position/speed/mute并遵守明确暂停策略。若必须重挂载，一次受控重连恢复状态、等待媒体ready，不能每次选对象重建decoder。

精确帧位置复用当前媒体PTS能力，离线取证不抢交互播放头。自动帧抓取不再依赖workflowView==='scenes'才可用，改为实际证据消费需要；有界加载与取消过期响应，错误不显示旧对象画面。

## 5. 输入与保存保护

输入控件onChange捕获target ID和版本；播放经过下一Shot不能改变其写入目标。切对象、下一镜、返回总览时await有效flush；失败停留并保留草稿。IME组合输入期间Enter不能触发下一镜/保存命令。

明确“锁定编辑对象/跟随播放”状态；用户输入后关闭跟随，用户可手动重新开启。程序跟随不入history。编辑命令与现有history协调，不为播放回调生成Undo。

快捷键仍在现有definitions/useEditorShortcuts中按surface集中路由，防止新旧组件同时接收Enter/Space/Delete。快捷键说明同步更新；输入框/弹窗优先处理自己的按键。

## 6. 验收与GitHub门槛

测试：三种view切换video实例/运行时不重复；scope/target/playhead可不同；输入中播放越界/点另一镜无串写；保存失败不丢草稿；项目切换、刷新、浏览器后退、非法URL、删除目标、媒体缺失；连续跨view20次无订阅/URL增长。

执行typecheck、O2新增用例、workflow路由/会话测试、editor-history与build；UI变化每次遵守项目build要求。交接导航命令、会话字段、共享Viewer API、保存与焦点规则。**提交并push O2代码与记录，远程包含提交才进入O3。**
