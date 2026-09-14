# AisenLens 开发待办

> 状态：持续维护中；AisenShot Scene Engine 的 Phase 11 技术与产品链路验收已完成；通用/影视与短视频已按用户批准晋升 production version 1，后续人工测试用于参数迭代；动画/游戏与访谈/Vlog 仍封存，Phase 12.4 及后续性能、数据保护和产品矩阵工作继续进行
>
> 本文只记录已批准的后续架构工作，不代表对应代码已经存在。

## 1. Workflow 重构实施结果

2026-09-08 已完成 Web 端 P01–P08 的首轮实施检查点：工作台阶段 URL、项目 Session owner、Prepare/Calibrate、Overview Film Map/Structure、Analyze Scenes/Shots/Sound、Learn 真实笔记、Cinema/Studio/System 主题与最终测试 runner 已接入。阶段视图只消费现有 Project/Shot/Group/Task 数据，没有新增 IndexedDB schema、示例 AI 数据或隐形知识库。

仍需单独推进的能力：正式 Pattern/Technique、嵌套 Structure、ASR/OCR/语义声音轨、Storyboard/Prompt/节奏模板生成，以及真实浏览器长片性能与故障注入矩阵。它们保持 Coming Soon 或后续 Domain，不在本轮伪造完成。

## 2. Web 发布构建与加载优化（非阻塞）

**背景**：2026-08-28 的 Vercel 生产部署已成功完成，Scene Engine 的
baseline/SIMD WASM 运行时资源已随 Web 构建发布。构建日志中的下列提示不影响
当前功能或部署结果，记录为后续优化项，而不是当前自动分镜验收的阻塞条件。

1. **优化编辑器首屏包体积**：Vite 报告一个压缩后约 527 kB 的 JavaScript chunk
   超过 500 kB 提示阈值。先以构建分析定位模块构成，再评估将编辑器内低频功能或
   仅在执行自动分镜时需要的模块改为按需加载；不得为了拆包改变自动分镜的 Worker、
   WASM 资源 URL 或产品交互。
2. **消除预渲染时的 Vite 依赖扫描提示**：`prerender-public-routes.mjs` 运行期间，
   Vite 会在服务关闭/重启时输出一次过期 dependency scan 请求提示。复核预渲染脚本
   的服务生命周期与 Vite 版本兼容性，在不改变静态页面产物和 SPA 回退行为的前提下
   消除该非致命日志。
3. **保留生产发布验证**：每次改动上述构建链路后，运行 Web production build，并在
   Vercel Preview/Production 实测公开页面、编辑器入口以及自动分镜 Worker/WASM 的
   资源加载；不能只以本地开发服务器成功作为依据。

**完成标准**：构建日志不再出现可避免的依赖扫描警告，或有记录充分的上游限制；首屏
加载优化以实际构建产物与浏览器性能数据为准，且不引入新的自动分镜运行时回归。
