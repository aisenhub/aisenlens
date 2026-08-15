# Vercel 部署

当前项目以仓库根目录作为 Vercel 部署目录，使用 `pnpm build` 构建，并发布 `dist/`。`vercel.json` 已包含单页应用回退规则，直接访问应用内路径时会回到 `index.html`。

## 覆盖旧项目

1. 在本机克隆旧的已部署仓库，保留其 `.git/` 目录。
2. 将当前项目的根目录内容复制到旧仓库根目录，覆盖旧应用文件；不要复制 `node_modules/`、`dist/` 或 `.env`。
3. 确认旧仓库根目录中已有当前的 `package.json`、`pnpm-lock.yaml`、`vite.config.ts` 和 `vercel.json`。
4. 运行 `pnpm install --frozen-lockfile`、`pnpm build`，确认构建成功。
5. 提交并推送到旧仓库已连接 Vercel 的生产分支。

## Vercel 设置

- 在项目 **Settings → General** 中将 **Root Directory** 设为 `.`。
- 不要保留旧项目的 `apps/web` Root Directory 设置。
- 构建、安装和输出目录由根目录的 `vercel.json` 管理。
- 在 **Settings → Environment Variables** 为 Production、Preview 和 Development 配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

这些变量可从旧项目的 Vercel 配置中复制；不要将真实值写入 `.env.example` 或提交到 Git。

## 发布后检查

1. 在 Vercel 的新部署详情中确认 Build Logs 显示 `pnpm build` 成功。
2. 打开生产域名，检查首页、项目列表、编辑器、手动分镜与刷新后的访问。
3. 浏览器本地项目数据按域名保存：继续使用相同生产域名通常会保留数据；Preview 域名与新域名会使用独立的本地数据空间。
