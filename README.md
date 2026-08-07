# AisenLens

AisenLens 是一款本地优先的视频拉片与分镜分析工具，面向导演、摄影、剪辑和影视学习场景。

## 功能

- 本地视频加载、播放、逐帧调整和时间跳转
- 手动截图、自动分镜、分段检测和继续检测
- 分镜卡片、分镜表格、镜头组和详细字段编辑
- 构图辅助线、图形标注、音频波形和播放跟随
- HTML、XLSX、PDF 表格导出
- 浏览器原生视频录制，支持 MP4/WebM 能力检测
- 本地项目文件夹保存、历史工程索引缓存和单文件工程备份
- 深色/浅色主题、播放速度和录制时的格式、清晰度、帧率选择

## 技术栈

- HTML、CSS、原生 JavaScript、ES Modules
- Vite 7
- File System Access API、IndexedDB、浏览器存储 API
- MediaRecorder、Canvas、Web Audio API
- Web Worker、OffscreenCanvas（浏览器支持时启用）
- `html2canvas`、`jspdf`、`jszip`

## 快速开始

环境要求：Node.js 18 或更高版本，使用支持 File System Access API 的 Chromium 系浏览器，并通过 HTTP(S) 或 localhost 访问本站点。

兼容性说明：项目文件夹的读写依赖 Chromium 的 File System Access API；Firefox 和 Safari 不支持此工作流。视频 Blob、持久化存储配额和 MediaRecorder 能力会因浏览器不同而变化。建议使用大屏浏览器完成长视频拉片。

```bash
npm install
npm run dev
npm run dev:api
```

开发服务器启动后，使用终端显示的地址访问应用。生产构建和预览：

```bash
npm run build
npm run preview
```

`npm run build` 会生成经过压缩和轻度混淆的 Web 构建产物，包括 `dist/index.html` 和 `dist/assets/`；发布时应整体交付 `dist/` 目录。`npm run preview` 可用于通过本地服务验证构建产物。

构建混淆只能提高阅读和逆向成本，无法真正隐藏浏览器端代码。不要在前端代码中放置密钥、密码或其他敏感信息。

发布时交付完整的 `dist/` 目录，不要直接打开源代码目录中的 HTML 文件。

## 数据与隐私

项目数据以用户选择的本地文件夹为准，保存会写入项目 JSON、截图资源和可选视频文件。浏览器 IndexedDB 仅保存最近项目索引、会话数据和资源缓存，方便恢复与加速加载；视频不会上传到服务器。

项目索引缓存与应用配置使用不同的数据分区。清除浏览器站点数据不会删除项目文件夹，但会移除最近项目记录和已授权目录句柄；重新选择项目文件夹即可继续使用。切换 `file://` 和 Vite `localhost` 运行方式时，浏览器会将其视为不同 origin；发布和长期使用应通过 HTTP(S) 站点访问。

## 工程结构

```text
AisenLens/
├── apps/
│   ├── web/          Vite 前端应用
│   │   ├── src/
│   │   │   ├── app/      应用状态、运行时协调和依赖桥接
│   │   │   ├── dom/      页面 DOM 控制器和浏览器交互
│   │   │   ├── features/ 业务流程和领域数据模块
│   │   │   ├── platform/ IndexedDB、缓存和浏览器存储适配
│   │   │   ├── utils/    与页面无关的纯数据工具
│   │   │   └── styles/   全局样式
│   │   ├── index.html
│   │   └── vite.config.js
│   └── api/          Express API 服务
│       └── src/routes/  HTTP 路由
├── package.json       workspace 根配置
└── docs/             工程说明
```

## 当前验证状态

- `npm run build`：通过。
- 项目当前未包含独立的自动化测试目录；功能验证需在支持 File System Access API、IndexedDB、持久化存储和 MediaRecorder 的 Chromium 浏览器中进行。

## 相关文档

- [项目结构说明](docs/PROJECT_GUIDE.md)
- [专业编辑器 UI 重构计划](docs/EDITOR_UI_REDESIGN_PLAN.md)
