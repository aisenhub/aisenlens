# AisenLens 工程说明

## 1. 文档目的

本文档说明项目的目录结构、运行方式、模块职责和数据边界，以当前代码为准。

## 2. 应用边界

AisenLens 是一个本地优先的单页视频分析应用：

```text
apps/web/index.html
    ↓
app/bootstrap.js
    ├─ styles/main.css
    └─ main.js
          ├─ dom/
          ├─ platform/
          └─ utils/
```

当前 `main.js` 仍承担较多应用编排职责，已拆出的模块负责领域流程、平台适配和 DOM 控制。

模块边界必须保持以下分层，不能为了减少文件数量而混合职责：

```text
DOM 控制层       负责节点、事件、交互反馈和视图更新
      ↓ 调用
业务领域层       负责项目、播放器、分镜、模板等流程和状态协调
      ↓ 调用
纯数据工具层     负责时间、字段、截图、分镜数据等无副作用计算
      ↓ 调用（必要时）
平台适配层       负责 IndexedDB、文件系统和浏览器存储
```

DOM 控制层不得承载数据规范化和业务规则；纯数据工具层不得访问 `document`、`window`、IndexedDB 或播放器实例；业务领域层通过参数、返回值和事件接口使用这两类模块。

## 3. 目录说明

### 3.1 应用入口

#### `src/app/bootstrap.js`

应用的唯一 JavaScript 入口。负责加载全局样式并导入当前主业务入口，不放置具体业务逻辑。

#### `src/app/dom-bindings.js`

集中查询 `index.html` 中的静态 DOM 节点，并返回给应用入口。该模块只负责节点绑定，不实现播放器、分镜或项目业务规则。

#### `src/app/state.js`

存放应用级状态容器的创建和重置逻辑。目前承载项目元数据、脏状态、音频波形和自动保存状态。状态容器本身不访问 DOM，也不负责持久化。为兼容现有业务调用，项目状态通过 `window` 属性提供代理访问。

#### `src/main.js`

当前的业务兼容层和运行时入口，包含以下内容：

- DOM 节点绑定和应用初始化
- 项目生命周期、视频加载和工程缓存恢复（当前仍包含待移除的项目文件夹兼容流程）
- 分镜数据、镜头组和表格渲染
- 模板、字段池和设置逻辑
- 自动分镜、截图、播放、录制和导出流程
- 事件监听、快捷键、脏状态和自动保存

它是当前模块化的主要剩余工作区域，不宜继续无边界增加新功能。

### 3.2 DOM 层 `src/dom/`

| 文件 | 职责 |
| --- | --- |
| `dom-bindings.js` | 集中查询页面静态 DOM 节点，并向应用入口提供统一绑定结果 |
| `query.js` | 提供 `$`、`$$` DOM 查询辅助函数 |
| `player-controls.js` | 播放器按钮、进度条、拖动定位和视频事件同步 |
| `progress.js` | 创建和更新全局进度遮罩 |
| `theme.js` | 主题读取、切换和持久化 |
| `toast.js` | 统一的 Toast 提示 |

DOM 模块应接收元素和回调，不应直接读写业务全局状态。

### 3.3 平台层 `src/platform/`

| 文件 | 职责 |
| --- | --- |
| `indexeddb.js` | 项目、分镜、镜头组、设置和截图资源的持久化 |
| `browser-storage.js` | `localStorage` 的 JSON 读写和批量清理 |
| `filesystem.js` | 当前版本的项目文件夹兼容读写；缓存优先改造后仅保留普通文件选择和备份文件读写 |

平台层只负责浏览器 API 适配，不负责页面渲染和业务决策。

当前 IndexedDB 使用数据库 `AshenVideoLocalDB`，版本为 4，主要对象仓库包括 `projects`、`shots`、`shotGroups`、`settings` 和 `screenshotAssets`。修改结构时必须增加升级逻辑，并验证旧数据读取。

### 3.4 工具层 `src/utils/`

| 文件 | 职责 |
| --- | --- |
| `audio-waveform.js` | 波形视图、分镜范围和播放跟随计算 |
| `files.js` | 文件夹名称清理 |
| `ids.js` | 项目 UUID 和实体 ID 生成 |
| `player.js` | 播放速度、逐帧步长和时间边界计算 |
| `project-schema.js` | 项目导入 JSON 解析和结构校验 |
| `screenshot.js` | 截图尺寸、资源键和持久化判断 |
| `settings.js` | 应用设置默认值和规范化 |
| `shot-groups.js` | 镜头组成员计算和一致性修复 |
| `shot-virtual.js` | 分镜列表虚拟化高度、偏移和可视范围 |
| `shots.js` | 分镜自动保存数据序列化 |
| `template-config.js` | 内置模板、字段池和参考选项定义 |
| `templates.js` | 模板字段、字段池和参考选项规范化 |
| `text.js` | 模板字符串转义 |
| `time.js` | 时间格式化和时间码解析 |
| `video-info.js` | 视频文件名、时长、分辨率和文件大小格式化 |

工具层应尽量保持无 DOM、无 IndexedDB、无隐式全局变量，便于独立测试。

`src/utils/` 中的时间、模板、分镜、截图和项目数据校验等代码不依赖 HTML 页面、事件绑定方式或组件生命周期。

### 3.5 业务领域层 `src/features/`

按业务领域组织有状态流程和领域数据转换。领域模块可以调用 `platform/` 和 `utils/`，但不应直接操作页面 DOM。

项目持久化领域目前还包含 `project-writer.js`，负责写入项目 JSON、分镜 JSON、镜头组 JSON 以及项目二进制文件；`shot-persistence.js` 负责分镜和镜头组的完整保存、增量保存；截图资源持久化由 `screenshots/screenshot-assets.js` 负责。`screenshots/screenshot-service.js` 负责截图变体、缩略图、资源恢复和截图字段赋值；`screenshots/screenshot-runner.js` 负责截图批次、暂停/停止、主线程让出和进度回调。自动分镜的 Worker 创建、任务分发、传输对象和异常回收由 `features/auto-shot/worker-client.js` 负责；检测器编排由 `features/auto-shot/detector.js` 负责；分段状态、范围计算、切点去重和分镜条目创建由 `features/auto-shot/segment-runner.js` 负责。播放器领域的 `features/player/video-seek.js` 负责可取消的视频跳转等待，`features/player/player-state.js` 负责播放器时间、时长、帧率、倍速和播放状态，`features/player/player-controller.js` 负责播放切换、跳帧、跳秒和定位业务，`features/player/video-metadata.js` 负责视频元数据读取和运行时帧率采样，`features/player/media-capabilities.js` 负责录制格式、画布录制和媒体 API 能力检测。文件写入服务不负责生成页面内容，也不访问 DOM。

当前已建立 `features/project/`、`features/shots/`、`features/screenshots/`、`features/auto-shot/` 和 `features/player/` 等领域模块。项目模块负责数据映射、项目记录服务、目录文件能力、项目 JSON/分镜/镜头组序列化和文件写入；分镜模块负责条目创建、排序、编辑及持久化；截图模块负责资源持久化和批量处理；自动分镜模块负责 Worker 通信、视频采样和分段处理；播放器模块负责媒体跳转、播放器状态、控制业务、视频元数据和媒体能力。领域模块不负责页面元素查询和事件绑定，截图尺寸规则由 `utils/screenshot.js` 提供。

`src/features/shots/shot-autosave.js` 负责分镜自动保存快照、差异计算和并发合并，不访问 DOM；数据库写入仍由 `shot-persistence.js` 和应用编排层负责。

#### 领域模块补充

`features/templates/`、`features/groups/`、`features/auto-shot/`、`features/screenshots/`、`features/recording/`、`features/waveform/`、`features/overlay/` 和 `features/export/` 下的领域模块保持无页面 DOM 依赖；它们接收数据、状态或回调并返回业务结果。

`src/dom/template-editor.js` 负责模板字段池、字段编辑行和参考选项编辑器的 DOM 创建及事件回调；`src/dom/shot-list-controller.js` 和 `src/dom/shot-group-controller.js` 负责分镜列表内嵌镜头组、连续选择、折叠、编辑和解散交互。`src/features/groups/group-layout.js` 负责将普通分镜和连续镜头组转换为统一列表单元，领域数据仍由 `src/features/groups/` 负责，业务变更通过应用层回调提交。

`src/app/selectors.js` 负责从模板和设置数据计算当前模板、可见字段和表格显示字段，不访问 DOM；`src/app/dom-ready.js` 将应用初始化回调集中到单一 DOM 就绪监听器；页面选择器只由 `main.js` 传入当前值并负责后续渲染。

`src/dom/pdf-export.js` 负责创建用于 `html2canvas` 的 PDF 临时页面 DOM，接收标题、列、分镜和镜头组数据及单元格取值回调；PDF 分页计算、截图和 `jsPDF` 输出仍由应用层编排。

`src/dom/overlay-canvas.js` 负责构图网格、线条、矩形、圆形、三角形和曲线的 Canvas 合成绘制，接收绘图上下文、形状数据和模式，不持有应用状态；构图状态和命中规则仍由应用层及 `features/overlay/overlay-controller.js` 管理。

`src/dom/recording-canvas.js` 提供录制画面使用的文字换行、图片等比适配和圆角路径绘制函数；它们只操作传入的 Canvas 上下文，不读取应用状态。

`src/dom/waveform-canvas.js` 负责波形 Canvas 的尺寸无关绘制，包括峰值、RMS、镜头标记和当前分镜选区；它接收波形数据、可见范围、颜色和业务查询回调，不读取页面全局状态。

`src/dom/recording-frame.js` 负责录制画面中视频区域和表格区域的 Canvas 布局，视频节点和表格绘制通过参数及回调传入，不持有录制状态。

`src/dom/pdf-renderer.js` 负责创建临时 PDF 页面、等待图片、调用 `html2canvas` 和 `jsPDF` 输出 Blob；它通过参数接收数据、分页算法和页面构建器，业务数据仍由应用层提供。

#### 模板业务模块

`src/features/templates/template-service.js` 负责创建模板编辑草稿、自定义模板草稿和规范化模板定义；`src/features/templates/field-pool.js` 负责字段池状态、用户字段添加、参考选项规范化和字段池序列化；`src/features/templates/template-storage.js` 负责通过注入的存储适配器读取、规范化和写回模板定义及字段池状态；`src/features/templates/template-editor.js` 负责模板字段过滤、字段增删、字段排序和模板定义更新。`src/features/groups/group-service.js` 负责镜头组创建、更新、删除、成员整理和状态校正，`src/features/groups/group-editor.js` 负责镜头组选中状态与创建条件，`src/features/groups/group-persistence.js` 负责镜头组写入前的字段规范化。这些模块只处理模板和镜头组数据，不查询 DOM、不绑定事件；页面组装和交互仍由应用层负责。

自动分镜的 `src/features/auto-shot/state.js` 负责视频身份、签名缓存、分段状态序列化、恢复和完成状态计算。该模块只接收数据并返回新状态，不访问视频元素或页面节点。

`src/features/screenshots/screenshot-state.js` 负责截图批次的停止请求、暂停等待条件和批次状态重置；DOM 进度层通过回调触发这些状态变更，不直接承担截图业务规则。

`src/features/recording/recording-service.js` 负责录制质量预设、码率计算、媒体信息评估和录制配置阻断规则。它不创建 `MediaRecorder`、`Canvas` 或音频节点，浏览器媒体 API 和录制页面交互仍由应用层编排。

`src/features/recording/recording-state.js` 负责录制状态容器的创建、录制前参数准备、暂停标记和统一重置。它不访问 DOM、视频元素或浏览器媒体 API，录制编排仍由应用层负责。

`src/features/recording/recording-audio.js` 负责通过传入的视频元素和 `AudioContext` 构造录制音频轨道，并提供解除静音和释放节点的方法；它不查询页面节点，应用层只负责提供媒体对象和处理提示。

`src/features/recording/recording-media.js` 负责创建 `MediaRecorder`、返回实际使用的 MIME 类型并等待录制器启动，媒体流准备、数据事件回调和下载仍由应用层编排。

`src/features/recording/recording-loop.js` 负责录制帧取消、视频帧回调或 `requestAnimationFrame` 调度，以及按目标帧率推进录制状态；绘帧和媒体轨道仍通过回调提供。

`src/features/recording/recording-output.js` 负责根据录制数据块生成 Blob、扩展名和文件名，不执行下载或界面提示。

`src/features/waveform/waveform-controller.js` 负责波形缩放、平移、播放跟随和视图重置，调用方传入状态并由模块更新数据状态；Canvas 尺寸、颜色、绘制和轨道事件仍由 DOM 控制层负责。

`src/features/overlay/overlay-controller.js` 负责构图形状命中检测、控制点命中和形状克隆，不访问 Canvas 或页面节点；构图绘制、鼠标事件和工具栏状态仍由 DOM 控制层负责。

`src/features/export/export-service.js` 负责导出条目排序、镜头组导出行和通用单元格取值，不生成 HTML、PDF 或 Excel DOM/XML；具体输出格式和下载流程仍由应用层编排。

`src/features/export/html-export.js` 负责根据列、分镜数据和镜头组数据生成 HTML 字符串及 Blob，不查询 DOM、不绑定事件；应用层只负责传入数据并触发下载。

`src/features/export/excel-sheet.js` 负责 Excel 工作表列宽、行高、单元格和工作表 XML 生成，不创建 ZIP、不访问 DOM；图片关系、ZIP 打包和下载仍由应用层编排。

`src/features/export/excel-workbook.js` 负责将工作表 XML、镜头组 XML、图片和关系文件打包为 XLSX Blob；它接收 `JSZip` 构造器和业务数据，不查询 DOM。

`src/features/export/excel-export.js` 提供 Excel 列名生成、XML 字符转义和 Data URL 到字节数组的纯函数，不依赖 DOM 或 ZIP 实例。

`src/features/export/pdf-export.js` 提供 PDF 分页布局、候选页切片和图片高度计算，不创建临时页面或调用 `jsPDF`；页面 DOM、`html2canvas` 和 `jsPDF` 适配仍由应用层编排。

### 3.6 样式层 `src/styles/main.css`

包含布局、播放器、分镜列表、镜头组卡片、弹窗、设置、模板编辑器、录制设置弹窗、录制状态和响应式规则。新样式优先使用 `rem`、`%`、`vw/vh`、`fr`、`minmax()` 和 `clamp()`，避免新增固定布局尺寸。

### 3.7 页面结构 `index.html`

提供静态页面骨架，包括：

- 顶部项目、模板、导出、保存、主题和设置入口
- 播放器、进度条、音频波形和分镜表格
- 项目引导、视频选择、模板编辑、设置、录制设置、录制状态和导出弹窗
- Toast 和进度遮罩容器

分镜卡片、字段编辑器和导出设置中的动态内容由 JavaScript 创建。

目标页面分为三级：

1. **首页**：显示最近工程和新建工程入口，不加载具体编辑器。
2. **工程管理页**：读取 IndexedDB 中的历史工程，提供搜索、排序、重命名、复制、删除、缓存清理和单文件备份导入/导出。
3. **具体项目编辑页**：按 `projectId` 恢复一个工程，显示监看器、波形、分镜表格和右侧逐镜拉片工作台。

当前 `index.html` 仍是单页兼容骨架；三级页面属于 UI 重构目标，实施时应将引导弹窗和顶栏项目下拉迁移为独立页面视图。

## 4. 初始化流程

1. Vite 加载 `index.html`。
2. `bootstrap.js` 加载样式并导入 `main.js`。
3. `main.js` 查询页面节点，初始化主题、播放器控件、进度遮罩和事件监听。
4. IndexedDB 打开成功后，根据路由恢复工程；首页和工程管理页只读取工程索引，编辑页按 `projectId` 加载具体工程。
5. 加载视频后更新视频信息、播放器状态、波形和分镜列表。
6. 保存操作会将项目 JSON、分镜、镜头组和截图资源写入用户选择的项目文件夹；IndexedDB 仅保存最近项目索引、目录句柄和运行时资源缓存。工程备份通过显式的单文件导入/导出完成。

## 5. 数据流和持久化

```text
视频文件 ──> HTMLVideoElement
              ├─> 播放与逐帧
              ├─> 自动分镜取样
              ├─> 首帧/尾帧截图
              └─> Canvas/MediaRecorder 录制

页面状态 ──> 分镜/镜头组/项目状态
              ├─> 项目文件夹保存（项目 JSON、截图资源、可选视频）
              ├─> IndexedDB 索引与资源缓存
              ├─> 单文件工程备份（JSON/ZIP）
              └─> HTML / Excel / PDF 导出
```

截图资源与轻量分镜记录分开保存。修改截图缓存或数据库结构时，要同时验证首页、工程管理、项目加载、备份导入/导出、表格导出和录制路径。

## 6. 开发约定

- 新功能先确定所属领域和公开接口，再添加实现文件。
- DOM 控制代码与业务纯数据工具代码必须分开；视图模块只处理节点和交互，工具模块只处理输入、输出和数据计算。
- `src/utils/` 必须保持框架无关，不能引入 React、Vue、DOM API 或组件状态。
- 模块之间通过参数、返回值和事件回调通信，避免新增全局变量。
- 平台 API 只能通过 `platform/` 访问。
- 纯计算逻辑优先放入 `utils/`，并保持可独立调用。
- DOM 模块不直接管理项目数据。
- 每次模块拆分至少执行 `npm run build`，涉及播放器或录制时增加实际浏览器验证。
- 不在构建产物 `dist/` 和依赖目录 `node_modules/` 中手工修改文件。

## 7. 当前已知问题

- `main.js` 仍是较大的应用组装入口，保留模块依赖注入、启动顺序和跨模块回调；项目状态、自动保存和 DOM 交互已继续移出。
- `main.js` 的固定 DOM ID 查询已集中到 `src/app/dom-bindings.js`；独立 DOM 模块仍可管理自身的节点依赖，动态节点和类名查询保留在对应 DOM/应用编排层中。
- 导出依赖已通过 npm 固定版本本地化为 `jszip`、`html2canvas` 和 `jspdf`，运行时不再从 CDN 加载。
- 当前仓库未包含独立的自动化测试目录，媒体、缓存和 DOM 流程需在支持 IndexedDB、持久化存储和 MediaRecorder 的现代浏览器中验证。
- 根目录 `index.html` 通过 `src/app/bootstrap.js` 加载应用入口，构建时使用相对资源路径。
