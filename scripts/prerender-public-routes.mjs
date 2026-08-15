import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(projectRoot, "apps", "web");
const distRoot = path.join(webRoot, "dist");
const webRequire = createRequire(path.join(webRoot, "package.json"));
const { createServer } = webRequire("vite");

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const faqItems = [
  ["什么是视频拉片？", "视频拉片是将影片、短片、广告或 MV 按镜头、场景、声音、节奏和叙事进行拆解分析的方法，用于理解创作思路与镜头语言。"],
  ["AisenLens 可以自动分镜吗？", "可以。AisenLens 可根据视频镜头切换生成可编辑的分镜结果；你仍可按实际分析需要手动修正镜头边界。"],
  ["拉片数据会上传服务器吗？", "项目数据与视频素材默认保存在本地浏览器。请定期导出备份，并在共用设备上注意浏览器数据管理。"],
  ["可以导出拉片报告吗？", "可以。完成镜头批注后，可将分析内容整理并导出为适合复盘、分享和归档的报告。"],
];

const homeContent = () => `
  <article>
    <h1>视频拉片与镜头分析工具</h1>
    <p>从导入视频、自动分镜到逐帧批注和报告导出，让影视拉片更高效、更有条理。</p>
    <h2>一款用于影视拉片的专业视频分析工具</h2>
    <p>AisenLens 面向影视学生、编导、导演、剪辑师和内容创作者，帮助你从景别、运镜、构图、色彩、声音和叙事节奏等维度拆解视频。项目数据默认保存在本地设备，素材和分析内容由你自己掌控。</p>
    <h2>四步完成一次视频拉片</h2>
    <ol><li>导入本地视频，建立独立拉片项目。</li><li>自动整理镜头结构，并按需手动调整边界。</li><li>逐帧观看，在关键镜头记录景别、运镜、构图、声音与叙事观察。</li><li>导出拉片报告，用于复盘、分享或归档。</li></ol>
    <h2>为需要读懂影像的人而设计</h2>
    <p>无论你在学习电影语言、拆解广告片节奏、复盘短片创作，还是整理团队的镜头分析，AisenLens 都提供从视频观看到结构化记录的一体化拉片流程。</p>
    <h2>常见问题</h2>
    ${faqItems.map(([question, answer]) => `<section><h3>${question}</h3><p>${answer}</p></section>`).join("\n")}
  </article>`;

const genericContent = (pathname, metadata) => {
  if (pathname === "/tutorials") {
    return `<article><h1>视频拉片教程与镜头分析方法</h1><p>${escapeHtml(metadata.description)}</p><nav aria-label="拉片教程"><ul><li><a href="/tutorials/what-is-video-pian">什么是拉片？影视拉片的实用步骤</a></li><li><a href="/tutorials/shot-language-analysis">镜头语言怎么分析：景别、运镜、构图与节奏</a></li><li><a href="/tutorials/auto-shot-workflow">自动分镜怎么用：视频拉片效率提升指南</a></li><li><a href="/glossary">影视拉片与镜头分析术语表</a></li></ul></nav></article>`;
  }

  return `<article><h1>${escapeHtml(metadata.title.replace(/｜AisenLens$/, ""))}</h1><p>${escapeHtml(metadata.description)}</p><p><a href="/">了解 AisenLens 视频拉片与镜头分析工具</a></p></article>`;
};

const articleContent = (page) => `<article>
  <p>${escapeHtml(page.eyebrow)}</p>
  <h1>${escapeHtml(page.title)}</h1>
  <p>${escapeHtml(page.description)}</p>
  ${page.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.items ? `<ol>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : ""}</section>`).join("\n")}
  <nav aria-label="相关内容"><a href="/tutorials">查看拉片教程</a> · <a href="/glossary">浏览拉片术语</a> · <a href="/">返回首页</a></nav>
</article>`;

const updateHead = (html, metadata, canonicalUrl, structuredData) => {
  let result = html;
  result = result.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`);
  result = result.replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${escapeHtml(metadata.description)}" />`);
  result = result.replace(/<meta name="robots" content=".*?"\s*\/>/, `<meta name="robots" content="${metadata.indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow"}" />`);
  result = result.replace(/<link rel="canonical" href=".*?"\s*\/>/, `<link rel="canonical" href="${canonicalUrl}" />`);
  result = result.replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`);
  result = result.replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`);
  result = result.replace(/<meta property="og:url" content=".*?"\s*\/>/, `<meta property="og:url" content="${canonicalUrl}" />`);
  result = result.replace(/<meta name="twitter:title" content=".*?"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`);
  result = result.replace(/<meta name="twitter:description" content=".*?"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`);
  const structuredDataTag = structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n  ` : "";
  return result.replace("</head>", `${structuredDataTag}</head>`);
};

const vite = await createServer({ root: webRoot, appType: "custom", server: { middlewareMode: true } });

try {
  const { PAGE_METADATA, SITE_URL } = await vite.ssrLoadModule("/src/features/marketing/seo/siteMetadata.ts");
  const { getSeoContentPage } = await vite.ssrLoadModule("/src/features/marketing/seo/seoContent.ts");
  const template = await readFile(path.join(distRoot, "index.html"), "utf8");
  const routes = Object.keys(PAGE_METADATA);

  for (const pathname of routes) {
    const metadata = PAGE_METADATA[pathname];
    const seoPage = getSeoContentPage(pathname);
    const canonicalUrl = new URL(pathname, SITE_URL).toString();
    const content = metadata.indexable ? (seoPage ? articleContent(seoPage) : pathname === "/" ? homeContent() : genericContent(pathname, metadata)) : "";
    const structuredData = !metadata.indexable ? null : pathname === "/"
      ? [
          { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "AisenLens", applicationCategory: "MultimediaApplication", operatingSystem: "Web Browser", description: metadata.description, url: SITE_URL, offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" } },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) },
        ]
      : { "@context": "https://schema.org", "@type": pathname.startsWith("/tutorials/") ? "Article" : "WebPage", headline: metadata.title, description: metadata.description, url: canonicalUrl };
    const withMetadata = updateHead(template, metadata, canonicalUrl, structuredData);
    const html = withMetadata.replace("<div id=\"root\"></div>", `<div id="root" data-prerendered="true">${content}</div>`);
    const routeDirectory = pathname === "/" ? distRoot : path.join(distRoot, pathname.slice(1));
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(path.join(routeDirectory, "index.html"), html);
  }
} finally {
  await vite.close();
}
