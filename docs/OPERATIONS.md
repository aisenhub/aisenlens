# AisenLens 运维与服务端约束

> 状态：当前运维基线
>
> 最后核对：2026-08-25

本文档保留持续有效的服务端、发布与后台操作约束；具体功能的开发过程不作为运维手册保留。

## 1. Supabase 边界

Supabase 负责账户和受控的线上交互，不承载用户本地项目与视频工作数据。前端使用 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 创建客户端；私钥、服务角色密钥和第三方敏感凭据不得进入 `apps/web`、构建产物或提交的环境文件。

现有迁移在 `supabase/migrations/` 中按时间顺序执行。任何数据库结构、策略或 RPC 变更必须以新的迁移提交；不要改写已应用的迁移，也不要在控制台手工制造无法复现的结构差异。

## 2. 身份与权限

- `profiles` 保存用户资料，注册触发器创建基础档案。
- `user_entitlements` 保存当前角色；默认角色为 `free`，支持者角色为 `supporter`。
- 客户端从 `services/supabase/profiles.ts` 与 `services/supabase/entitlements.ts` 读取和更新允许的资料；RLS 是访问控制的最终边界。
- 角色或权益调整必须通过受控的迁移/RPC 或明确的后台流程完成，不能仅依赖客户端状态。

## 3. 反馈、支持与兑换

反馈、支持请求和兑换均通过 Supabase RPC 提交，前端不得直写受控表：

- `create_feedback_request` 负责创建与身份关联的反馈记录。
- `create_support_request` 和 `record_support_request_event` 记录支持申请及生命周期事件。
- `redeem_support_code` 在数据库事务中处理兑换；兑换码仅以哈希形式存储，RPC 的权限与行锁约束必须保留。

后台操作应最小化访问权限，只记录完成核验所需的支付或兑换信息，不收集或保存不必要的敏感数据。变更这些 RPC 的参数、返回值或授权时，必须同步检查客户端服务层和迁移中的 `grant/revoke`、RLS 策略及审计字段。

## 4. 发布与线上核验

Web 发布使用仓库根目录的 `pnpm build`，实际构建目标为 `@aisenlens/web`。Vercel 项目 Root Directory 保持为空，输出目录使用 `apps/web/dist`。桌面和移动端分别由 Electron 与 Capacitor 的现有 scripts 构建或同步；它们使用同一 Web 构建产物。

每次发布前至少完成：

1. 在配置了公开 Supabase 环境变量的环境中构建 Web。
2. 验证登录、资料读取、反馈、支持和兑换相关 RPC 的错误提示不会泄露敏感信息。
3. 验证公开页面可访问，而编辑器、项目库、账户、反馈和支持流程保持 `noindex`。
4. 如涉及数据库变更，先在目标 Supabase 环境按顺序应用迁移，再发布依赖新结构的前端。

SEO 的发布后事项、站长平台提交和分享图仍以 [SEO 与自然收录实施计划](SEO_DISCOVERABILITY_PLAN.md) 为准。

## 5. 故障处理原则

- 首先保留用户本地项目数据，不通过清空 IndexedDB 解决线上问题。
- RPC 或迁移异常时，记录错误上下文并停止受影响流程；不要在客户端绕过权限或伪造成功结果。
- 支持者资格异常时，以 `user_entitlements` 与相关审计记录为依据，修复动作应可追溯。
- 发布回滚仅回滚应用产物；数据库结构必须通过新的前向迁移修复，不能删除已上线数据或逆改历史迁移。
