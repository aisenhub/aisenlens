# AisenLens SEO 与自然收录实施计划

> 状态：核心技术实施完成；分享封面图与搜索平台提交待发布后执行  
> 制定日期：2026-08-15  
> 最近核查：2026-08-15（本地构建产物、静态页面与 noindex 页面均已验证）
> 范围：AisenLens 公共营销页面、教程内容、搜索引擎收录与分享展示

## 当前实施状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 正式域名 | 已完成 | canonical、sitemap 和 robots 统一使用 `https://lens.aisenhub.com`。 |
| URL、metadata 与 JSON-LD | 已完成 | 公共页面具有稳定 URL、独立 title、description、canonical 和结构化数据。 |
| 静态预渲染 | 已完成 | 构建后为 public URL 输出带正文和单个 H1 的 HTML；Vercel 优先返回静态页面。 |
| 爬虫与隐私边界 | 已完成 | 已提供 robots、sitemap、manifest；编辑器、项目库、反馈和重置密码页面为 noindex。 |
| 分享封面 | 待完成 | 已有 Open Graph 和 Twitter 文字信息，尚未添加 1200 × 630 图片。 |
| 搜索平台接入 | 待完成 | 需在 Google、Bing 和百度平台完成验证、提交 sitemap 和后续监测。 |

## 1. 目标

让潜在用户能够通过“视频拉片”“影视拉片”“自动分镜”“镜头分析”等真实需求词发现 AisenLens，并在进入网站后清楚理解产品价值。

### 1.1 90 天可衡量目标

1. 搜索平台成功抓取并索引首页、功能页、教程页、术语页和更新日志等至少 8 个公共页面。
2. Google Search Console、Bing Webmaster Tools 和百度搜索资源平台均无阻断抓取的严重错误。
3. 每个公共页面都有唯一的标题、描述、规范链接和清晰的单一 H1。
4. 分享链接在微信、微博、X、Discord 等渠道有明确的标题、描述和封面图。
5. 私人项目、编辑器、账户、反馈和支付页面不进入搜索索引。

### 1.2 非目标

- 不通过关键词堆砌、隐藏文字、采集内容或虚假外链操纵排名。
- 不将用户视频、项目数据、编辑器页面或账号页面公开给搜索引擎。
- 不为了 SEO 改变 AisenLens 的本地优先和隐私优先原则。
- 不在未提供真实 AI 能力前，将“AI”作为无法验证的产品承诺。

## 2. 实施后现状与主要限制

| 项目 | 当前情况 | 影响 |
| --- | --- | --- |
| 公共页面 | 已迁移为稳定 URL，并提供功能页、教程页、术语页与更新日志 | 后续需要扩充原创教程深度和真实截图 |
| 基础 metadata | 页面级 metadata 集中在营销模块 | 需在部署后用搜索平台实际抓取结果复核 |
| 路由 | 已接入 React Router | 旧数字页入口已映射到稳定 URL |
| 爬虫文件 | 已提供 `robots.txt`、`sitemap.xml` 和 Web Manifest | 需提交给搜索平台 |
| 分享卡 | 已配置 Open Graph、Twitter 文字字段 | 缺少分享封面图 |
| 结构化数据 | 首页提供 SoftwareApplication 与 FAQPage，教程页提供 Article | 需使用 Schema Markup Validator 验证线上页面 |

## 3. 产品定位与关键词边界

### 3.1 推荐公开定位

当前主定位：

```text
AisenLens｜视频拉片、自动分镜与镜头分析工具
```

首页 H1：

```text
视频拉片与镜头分析工具
```

首页副标题：

```text
从导入视频、自动分镜到逐帧批注和报告导出，让影视拉片更高效、更有条理。
```

只有在用户可以实际使用稳定的 AI 分析功能时，才升级为：

```text
AisenLens｜AI 视频拉片、自动分镜与镜头分析工具
```

### 3.2 关键词簇

| 关键词簇 | 目标词 | 应出现的位置 |
| --- | --- | --- |
| 核心需求 | 视频拉片、影视拉片、拉片工具 | 首页标题、首屏、教程与 FAQ |
| 产品能力 | 自动分镜、镜头分析、逐帧分析、镜头批注 | 功能页、教程与产品说明 |
| 工作成果 | 拉片报告、分镜标注、镜头语言分析 | 报告功能页、模板页与案例 |
| 目标人群 | 影视学生、编导、导演、剪辑师、内容创作者 | 首页人群区、教程介绍 |
| 场景词 | 短片拉片、电影拉片、广告片分析、MV 拉片 | 独立教程和案例页 |

规则：每页只围绕一个主要搜索意图写作；关键词必须出现在可阅读的正文中，不依赖 `meta keywords` 标签。

## 4. 信息架构与索引策略

### 4.1 公共、可索引页面

| URL | 搜索意图 | 推荐标题 | 推荐 H1 |
| --- | --- | --- | --- |
| `/` | 找拉片工具 | `AisenLens｜视频拉片、自动分镜与镜头分析工具` | `视频拉片与镜头分析工具` |
| `/features/auto-shot` | 找自动分镜 | `自动分镜工具：快速拆解视频镜头｜AisenLens` | `自动分镜：快速得到可编辑的镜头结构` |
| `/features/frame-analysis` | 找逐帧分析 | `逐帧视频分析与镜头批注工具｜AisenLens` | `逐帧观看，读懂每一个镜头细节` |
| `/features/reports` | 找拉片报告 | `拉片报告导出：整理镜头分析结果｜AisenLens` | `将拉片笔记整理为可分享的分析报告` |
| `/tutorials` | 找拉片教程 | `视频拉片教程：从入门到镜头分析｜AisenLens` | `视频拉片教程与镜头分析方法` |
| `/tutorials/what-is-video-pian` | 了解拉片 | `什么是拉片？影视拉片的 5 个实用步骤` | `什么是拉片？从观看到镜头分析的完整方法` |
| `/tutorials/shot-language-analysis` | 学镜头语言 | `镜头语言怎么分析：景别、运镜、构图与节奏` | `如何分析镜头语言` |
| `/tutorials/auto-shot-workflow` | 学自动分镜 | `自动分镜怎么用？视频拉片效率提升指南` | `用自动分镜开始一次高效拉片` |
| `/glossary` | 查术语 | `影视拉片术语表：景别、运镜、转场与构图` | `影视拉片与镜头分析术语表` |
| `/changelog` | 了解产品更新 | `AisenLens 更新日志` | `AisenLens 更新日志` |

URL 保持小写、稳定且可读；发布后不要随意变更。若必须变更，使用 301 重定向保留既有收录和外链价值。

### 4.2 不应索引的页面

| 页面 | 原因 | 指令 |
| --- | --- | --- |
| `/app` 或编辑器 | 用户工作区，不提供公共检索价值 | `noindex, nofollow` |
| `/projects` | 本地或用户项目库 | `noindex, nofollow` |
| `/feedback`、`/support` | 表单和交易相关页面 | `noindex, nofollow` |
| 登录、重置密码、用户中心 | 账号隐私与低内容页 | `noindex, nofollow` |

## 5. 首屏与页面文案

### 5.1 首页首屏

**眉题**

```text
面向影视创作者的本地优先工具
```

**H1**

```text
视频拉片与镜头分析工具
```

**说明**

```text
导入视频后自动整理镜头结构，逐帧观看、记录批注、建立分析模板，并导出清晰的拉片报告。
```

**主按钮**

```text
免费开始拉片
```

**次按钮**

```text
查看拉片教程
```

### 5.2 首页产品说明区

**H2**

```text
一款用于影视拉片的专业视频分析工具
```

**正文**

```text
AisenLens 面向影视学生、编导、导演、剪辑师和内容创作者，帮助你从景别、运镜、构图、色彩、声音和叙事节奏等维度拆解视频。所有项目数据默认保存在本地设备，素材和分析内容由你自己掌控。
```

### 5.3 首页流程区

**H2**

```text
四步完成一次视频拉片
```

1. **导入视频**：选择本地视频，建立独立拉片项目。
2. **自动分镜**：识别镜头切换，并按需手动调整边界。
3. **逐帧批注**：在关键镜头记录景别、运镜、构图、声音与叙事观察。
4. **导出报告**：将镜头分析整理为可复盘、分享或归档的拉片报告。

### 5.4 首页人群区

**H2**

```text
为需要读懂影像的人而设计
```

**正文**

```text
无论你在学习电影语言、拆解广告片节奏、复盘短片创作，还是整理团队的镜头分析，AisenLens 都提供从视频观看到结构化记录的一体化拉片流程。
```

### 5.5 FAQ

**什么是视频拉片？**

```text
视频拉片是将影片、短片、广告或 MV 按镜头、场景、声音、节奏和叙事进行拆解分析的方法，用于理解创作思路与镜头语言。
```

**AisenLens 可以自动分镜吗？**

```text
可以。AisenLens 可根据视频镜头切换生成可编辑的分镜结果，你仍可按实际分析需要手动修正镜头边界。
```

**拉片数据会上传服务器吗？**

```text
项目数据与视频素材默认保存在本地浏览器。请定期导出备份，并在使用共享设备时注意浏览器数据管理。
```

**可以导出拉片报告吗？**

```text
可以。完成镜头批注后，可将分析内容整理并导出为适合复盘、分享和归档的报告。
```

## 6. 技术实施方案

### 6.1 路由与预渲染

1. 调研并选择与 React 19、Vite 8 兼容且维护活跃的路由方案；优先采用成熟的 React Router 路由能力，不自行实现 URL 解析。
2. 将当前数字页面状态迁移为稳定 URL；保留现有编辑器功能，不改变业务行为。
3. 对所有公共营销、教程、术语和更新页面执行构建时静态预渲染，输出完整 HTML。
4. 保持 Vercel SPA rewrite 仅作为应用回退；静态页面优先直接返回预渲染 HTML。
5. 将页面 title、description、canonical、robots 指令维护在营销模块的集中 metadata 配置中，避免散落在组件内。

验收：关闭 JavaScript 后查看已预渲染的公共页面，仍能读到 H1、核心正文、内部链接和 metadata；编辑器页面不要求静态渲染。

### 6.2 HTML Head

在 `apps/web/index.html` 和页面级 metadata 中增加：

```html
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="https://lens.aisenhub.com/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="AisenLens" />
<meta property="og:title" content="AisenLens｜视频拉片、自动分镜与镜头分析工具" />
<meta property="og:description" content="从自动分镜、逐帧批注到拉片报告导出，让影视拉片更高效。" />
<meta property="og:image" content="https://lens.aisenhub.com/og-cover.png" />
<meta name="twitter:card" content="summary_large_image" />
```

要求：每个公共页面覆盖 title、description、canonical、Open Graph title、Open Graph description 和 Open Graph URL；不要所有页面共用首页文案。

### 6.3 结构化数据

首页加入与页面可见内容一致的 `SoftwareApplication` JSON-LD：

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AisenLens",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web Browser",
  "description": "视频拉片、自动分镜与镜头分析工具",
  "url": "https://lens.aisenhub.com/",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "CNY"
  }
}
```

教程页使用 `Article`；FAQ 内容与页面可见 FAQ 完全一致时使用 `FAQPage`。不得标记不存在的评分、用户数、价格优惠或 AI 能力。

### 6.4 静态收录文件

在 `apps/web/public/` 新增：

**robots.txt**

```text
User-agent: *
Allow: /
Sitemap: https://lens.aisenhub.com/sitemap.xml
```

**sitemap.xml**

仅列出公共 canonical URL；`lastmod` 只在页面实际更新时变更。用户项目、编辑器、账户和预览 URL 不应进入 sitemap。

### 6.5 分享素材与可访问性

1. 制作 `1200 × 630` 的 `og-cover.png`，包含品牌、产品定位与简洁编辑器画面。
2. 所有内容图片添加描述性 `alt`，例如“自动分镜后的镜头时间线示例”，而不是“图片 1”。
3. Logo 的 `aria-label` 保留为 `AisenLens`；内容插图提供可读文本说明。
4. 不使用仅靠 Canvas 绘制、没有文本替代的核心营销内容。

## 7. 内容发布计划

### 7.1 第一批教程（优先发布）

| 文章 | 核心问题 | 首段参考文案 |
| --- | --- | --- |
| 什么是拉片？影视拉片的 5 个实用步骤 | 拉片是什么 | `拉片不是重复观看影片，而是把镜头、声音、节奏和叙事拆解为可以讨论的创作证据。本文用五个步骤带你完成第一次影视拉片。` |
| 镜头语言怎么分析：景别、运镜、构图与节奏 | 如何分析镜头 | `分析镜头语言时，不必一次记住所有术语。先从景别、运镜、构图和剪辑节奏四个可观察维度开始，就能建立清晰的拉片框架。` |
| 自动分镜怎么用？视频拉片效率提升指南 | 如何使用自动分镜 | `自动分镜负责完成镜头边界的初步整理，真正的拉片价值仍来自你对每个镜头的观察、验证和批注。` |
| 视频拉片报告怎么写？可复用的分析框架 | 如何写报告 | `一份有价值的拉片报告不应只是镜头清单，而应说明镜头选择如何服务人物、情绪、节奏和叙事。` |
| 短片拉片案例：如何拆解叙事与情绪转折 | 如何拉短片 | `短片时长有限，每一次镜头切换都更值得被观察。本文以开场、冲突、转折和结尾为线索，演示一套可复用的短片拉片方法。` |

每篇教程至少包含：明确 H1、1000 字以上原创正文、目录、2 至 4 个内部链接、真实操作截图、FAQ、作者/更新时间和下一步行动按钮。

### 7.2 内容质量规则

1. 先解决读者问题，再自然出现关键词；不要把同一个词重复堆在段落、标题和图片 alt 中。
2. 只描述已上线能力；实验能力要明确标注“实验性”或“计划中”。
3. 教程引用影视作品截图时确认版权边界，并使用必要的说明与低分辨率展示。
4. 每次产品更新后，补充更新日志并从相关教程链接到新能力。

## 8. Vercel 与搜索平台配置

### 8.1 Vercel

保持项目根目录构建配置：

```text
Root Directory: 留空
Framework Preset: Vite
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @aisenlens/web build
Output Directory: apps/web/dist
Node.js Version: 22.x
```

部署后验证：

1. `https://lens.aisenhub.com/robots.txt` 返回 200。
2. `https://lens.aisenhub.com/sitemap.xml` 返回 200。
3. 每个 public URL 返回 200，且 canonical 指向自身。
4. 页面源代码中能看到预渲染正文与 JSON-LD，而不是只有空的 `#root`。

### 8.2 搜索平台

| 平台 | 操作 |
| --- | --- |
| Google Search Console | 添加域名属性或 URL 前缀属性，完成 DNS/HTML 验证，提交 sitemap，使用 URL Inspection 请求首页与首批教程收录 |
| Bing Webmaster Tools | 导入 Search Console 或单独验证站点，提交 sitemap |
| 百度搜索资源平台 | 验证站点，提交 sitemap，并根据平台提供的验证 token 添加 meta 标签 |

验证 token 只能在获取后加入；不要提交账号私钥、API Key 或服务角色密钥。

## 9. 实施阶段与验收

### 阶段 0：定位确认（已完成）

- 不将“AI”作为尚未验证的公开承诺。
- 正式域名已固定为 `lens.aisenhub.com`。
- 已确定首批教程、功能页和术语页主题。

验收：产品定位、域名和首批内容主题均有明确负责人和发布日期。

### 阶段 1：首页基础 SEO（核心完成）

- 更新首页 title、description、H1、首屏说明、功能区、人群区和 FAQ。
- 加入 canonical、robots、Open Graph、Twitter Card 和软件结构化数据。
- 制作并接入分享封面（待完成）。

验收：使用浏览器查看源代码可见完整 metadata；社交平台调试工具可正确读取标题、描述和封面。

### 阶段 2：抓取入口（技术完成，平台接入待完成）

- 新建 `robots.txt`、`sitemap.xml` 和 Web Manifest。
- 明确 public/noindex 页面清单。
- 配置 Search Console、Bing 与百度验证（待你完成平台授权）。

验收：三个平台均接受 sitemap；未授权页面不在 sitemap 中。

### 阶段 3：稳定 URL 与预渲染（已完成）

- 引入成熟路由方案并迁移公共营销页面。
- 为公共页执行静态预渲染。
- 为每个 URL 提供独立 metadata 与 canonical。

验收：无 JavaScript 环境中公共页面仍显示主体内容；旧入口不会破坏编辑器流程。

### 阶段 4：内容与内部链接（基础内容已完成，持续维护）

- 发布首批教程、功能页和术语页。
- 从首页、教程列表、功能页和更新日志建立上下文相关的内部链接。
- 为每篇文章补充作者、更新时间、真实截图和 FAQ。

验收：每篇内容至少有两个内部入口和一个明确 CTA；不存在重复或薄内容页面。

### 阶段 5：监测与迭代（待开始）

- 每周查看覆盖率、抓取错误、索引状态、搜索词、展示量与点击率。
- 每月更新表现靠前页面的标题、首段、FAQ 和内部链接。
- 根据真实查询扩展教程，不为短期排名制造低质量页面。

验收：记录每次修改的日期、原因、页面 URL 与结果，避免同时大面积变更而无法判断效果。

## 10. 发布前检查清单

- [x] 每页仅一个 H1，且与 title 的主题一致（本地静态产物已验证）。
- [ ] title 不超过约 30 个中文字符，description 清楚说明价值且不重复堆词。
- [x] canonical、Open Graph URL 和 sitemap URL 使用 HTTPS 正式域名。
- [x] 本地构建不生成 source map；项目不包含服务角色密钥、AI Key 或用户数据。
- [ ] 所有 public 页面在线上返回 200；不存在循环重定向。
- [x] 编辑器、项目库、反馈、支持和重置密码页面为 `noindex`。
- [ ] JSON-LD 已通过 Schema Markup Validator 验证。
- [x] robots.txt 没有误封锁 CSS、JavaScript、图片或 public 页面。
- [x] Vercel 使用根目录与 `apps/web/dist` 输出目录。

## 10.1 发布后待办（由站点所有者执行）

1. 在浏览器逐个打开首页、三个功能页、教程页、术语页和更新日志；确认返回 200、页面内容正常，并在“查看网页源代码”中确认可见 H1、canonical 和 JSON-LD。
2. 在 Google Search Console 添加 `https://lens.aisenhub.com/` 的 URL 前缀属性（或验证 `aisenhub.com` 域名属性），提交 `https://lens.aisenhub.com/sitemap.xml`，并对首页及三篇教程使用“请求编入索引”。
3. 在 Bing Webmaster Tools 导入 Search Console 或单独验证该域名，提交同一 sitemap。
4. 在百度搜索资源平台验证站点并提交 sitemap；如平台提供 meta 验证 token，再单独加入 token，不要提交任何私钥。
5. 制作并接入 `1200 × 630` 的 `og-cover.png`，再用社交平台调试工具检查标题、描述和封面。
6. 为每篇教程补充作者、更新时间、真实截图、FAQ 和更多原创正文；以真实查询数据决定下一批主题。
7. 每周查看收录覆盖率、抓取错误、展示量、点击率和搜索词；提交 sitemap 后至少观察 2 至 4 周再调整页面文案。

## 11. 风险与决策原则

| 风险 | 应对方式 |
| --- | --- |
| 单页应用内容无法稳定收录 | 优先静态预渲染 public 页面，不依赖爬虫执行复杂 JavaScript |
| “AI”宣传与实际功能不匹配 | 仅在用户可用、可验证时写入 title、结构化数据和广告文案 |
| 为 SEO 引入隐私追踪 | 搜索平台验证与隐私分析分开；若引入第三方分析，先更新隐私政策并征得必要同意 |
| 教程内容薄或重复 | 以真实工作流、截图、示例与明确作者信息形成原创内容 |
| 路由迁移影响编辑器 | 先为公共页建立路由和测试，再迁移编辑器；保留现有入口的显式跳转策略 |

## 12. 建议执行顺序

1. 按“发布后待办”验证线上静态页面并提交 sitemap。
2. 补齐分享封面图，验证社交分享卡片。
3. 持续完善首批教程的原创正文、作者信息和截图。
4. 观察 2 至 4 周后，根据 Search Console 的真实查询扩展内容。
