# AisenLens Supabase 用户系统接入教程

> 适用范围：AisenLens 当前的邮箱密码用户系统。
>
> 本文记录已完成的接入过程、代码职责、控制台操作和后续待办。项目、视频和拉片数据目前只保存在浏览器本地；Supabase 暂时只用于身份认证和用户资料。

## 1. 当前完成状态

- [x] 创建 Supabase 项目并取得项目 URL 与匿名公钥。
- [x] 在本地配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
- [x] 启用邮箱/密码注册和登录，并兼容 Supabase 的邮箱确认开关。
- [x] 配置开发环境密码重置回调地址：`http://localhost:8443/reset-password`。
- [x] 建立 `profiles` 用户资料表、RLS 策略和注册后自动建档触发器。
- [x] 完成登录、注册、会话恢复、退出登录、昵称修改和密码重置界面。
- [x] 对反馈、打赏、兑换码和专属反馈增加前端登录门控；访客触发提交入口时打开登录/注册弹窗，不发送业务 RPC。
- [x] 建立独立的用户角色权益表，用户中心可展示当前角色。
- [x] 执行生产构建验证。
- [ ] 如存在触发器部署前注册的旧账号，执行资料补齐 SQL。
- [ ] 上线前配置品牌邮件、正式域名回调地址，并复查 RLS。

## 2. 架构与数据边界

| 数据 | 保存位置 | 说明 |
| --- | --- | --- |
| 邮箱、密码、登录会话 | Supabase Auth | 密码由 Supabase 安全保存，前端不保存密码。 |
| 昵称、注册时间 | `public.profiles` | 与 Auth 用户使用同一个 UUID。 |
| 视频、拉片项目、编辑器数据 | 浏览器本地存储 | 当前不上传 Supabase，也不使用 Supabase Storage。 |
| 未来 AI 请求 | Supabase Edge Function 或其他安全服务 | API 密钥不能放入前端环境变量。 |

当前前端调用链如下：

```text
登录 / 注册 / 重置密码页面
          ↓
src/services/supabase/auth.ts
          ↓
Supabase Auth
          ↓ 注册时触发器
public.profiles
          ↑
src/services/supabase/profiles.ts（读取及修改昵称）
```

## 3. 首次创建 Supabase 项目

### 开发者操作

1. 前往 Supabase 官网注册并创建一个 Project。
2. 打开项目后，在 **Data API** 找到 **Project URL**。
3. 在项目的 API 设置中找到 **anon public key**（或当前界面显示的 publishable key）。
4. 在项目根目录创建或修改 `.env`，填入以下内容：

```dotenv
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_ANON_KEY=你的 anon public key
```

5. 确认 `.env` 已被 `.gitignore` 忽略，绝不提交真实密钥。
6. 重启开发服务器，使 Vite 重新读取环境变量：

```powershell
pnpm.cmd dev
```

### 注意事项

- `VITE_` 前缀的变量会被打包到浏览器，因此只能放 Project URL 和匿名公钥，**绝不能放 `service_role` key、SMTP 密码或 AI 密钥**。
- 可将变量名保留在 `.env.example` 中，但其中不填写真实值。
- 看到“Invalid path specified in request URL”时，优先检查 `.env` 的 URL 是否完整、没有多余空格或路径；Project URL 应是 Supabase 控制台的完整项目地址。

### 可以交给 AI 的提示词

```text
请检查本项目 Supabase 前端环境变量的读取方式，不要读取或输出 .env 中的真实值。
将所有 Supabase 调用收敛到 src/services/supabase，保持 React 组件不直接访问 Supabase。
```

## 4. 配置邮箱密码认证

### 开发者操作

在 Supabase 控制台进入 **Authentication** 的 Providers / Sign In 配置：

1. 确认 Email provider 已启用。
2. 根据上线策略设置 **Confirm email**：关闭时用户注册后可直接登录；开启时必须完成邮件验证后才会取得登录会话。
3. 密码由 Supabase Auth 管理；不要自行创建密码表或在 `profiles` 中增加密码字段。

关闭邮箱确认意味着注册流程更顺滑，但未知邮箱可以注册。开启邮箱确认时，前端会提示用户先完成验证后再登录，不会将无会话的注册误判为已登录。

### AI 已完成的工作

- 安装并使用 `@supabase/supabase-js`。
- 在 [client.ts](../src/services/supabase/client.ts) 创建唯一 Supabase Client。
- 在 [auth.ts](../src/services/supabase/auth.ts) 集中实现注册、登录、会话读取、会话监听和退出登录。
- 在 [AuthModal.tsx](../src/features/auth/components/AuthModal.tsx) 实现邮箱密码登录与注册界面。
- 在 [App.tsx](../src/app/App.tsx) 恢复会话，并将登录状态同步到导航栏。

### 可以交给 AI 的提示词

```text
请为 AisenLens 接入 Supabase 邮箱密码认证。
要求：复用现有设计，不新增 UI 库；认证调用只能放在 src/services/supabase；
组件不直接访问 Supabase；不要保存明文密码；完成后运行 pnpm.cmd build。
```

## 5. 建立用户资料数据库

Supabase Auth 的 `auth.users` 表不应由前端直接读取或修改。应用需要显示昵称时，使用 `public.profiles` 表保存最小资料。

### 开发者操作

在 Supabase 控制台打开 **SQL Editor**，按顺序执行仓库内的迁移文件内容：

1. [20260811180000_create_profiles_and_projects.sql](../supabase/migrations/20260811180000_create_profiles_and_projects.sql)
   - 创建 `profiles` 表和 RLS 策略。
   - 此历史迁移还创建了 `projects` 表；当前产品的项目数据已改为本地保存，前端不会读写该表。
2. [20260811180500_create_profile_on_signup.sql](../supabase/migrations/20260811180500_create_profile_on_signup.sql)
   - 创建注册触发器：每位新 Auth 用户都会自动生成一条 `profiles` 记录。
3. 如果在第 2 步前已经注册过账号，再执行 [20260811181000_backfill_profiles.sql](../supabase/migrations/20260811181000_backfill_profiles.sql)。
   - 返回 `Success. No rows returned` 是正常的 SQL 执行成功结果。

执行后可在 **Table Editor → profiles** 查看用户资料。不要手动保存或展示用户密码。

### 已实现的权限规则

- 登录用户只能查询自己的 `profiles` 记录。
- 登录用户只能更新自己的 `profiles` 记录。
- 用户删除时，关联资料会随 Auth 用户级联删除。
- 新用户资料由数据库触发器创建，不依赖浏览器端的额外插入请求。

### AI 已完成的工作

- 将 SQL 放入 `supabase/migrations/`，避免只在控制台做无记录的结构修改。
- 在 [profiles.ts](../src/services/supabase/profiles.ts) 封装当前用户资料读取与昵称更新。
- 在 [UserCenterModal.tsx](../src/features/auth/components/UserCenterModal.tsx) 展示邮箱、昵称、注册时间，并支持修改昵称。

### 可以交给 AI 的提示词

```text
请为 Supabase Auth 用户增加 public.profiles 资料表：只需要昵称和创建时间。
请提供可在 SQL Editor 执行的迁移，开启 RLS，让用户只能读取和修改自己的资料；
新注册用户应通过数据库触发器自动建档。前端只通过 service 层读取和更新昵称。
```

## 6. 配置并实现密码重置

### 开发者操作

1. 在 Supabase 控制台的 **Authentication → URL Configuration** 中，将开发地址加入 Redirect URLs：

```text
http://localhost:8443/reset-password
```

2. 如果本地实际端口不是 `8443`，必须改为实际地址并与浏览器当前访问地址完全一致。
3. 用户点击邮件中的链接后，Supabase 会回到该页面并建立短暂的 recovery session。

### AI 已完成的工作

- 在 [auth.ts](../src/services/supabase/auth.ts) 添加 `requestPasswordReset` 和 `updatePassword`。
- 登录弹窗增加“忘记密码”视图，成功提示不暴露邮箱是否已注册。
- 在 [PasswordResetPage.tsx](../src/features/auth/components/PasswordResetPage.tsx) 验证重置会话、检查两次密码一致且至少 8 位，并更新密码。
- 在 [App.tsx](../src/app/App.tsx) 处理 `/reset-password` 回跳路径。

### 测试清单

1. 使用已注册邮箱打开登录弹窗并点击“忘记密码”。
2. 输入邮箱并提交；页面应只提示“如该邮箱已注册，重置邮件已发送”。
3. 打开邮件链接，确认进入“设置新密码”页面。
4. 试一次少于 8 位或两次不一致的密码，确认能看到提示且仍可重新提交。
5. 设置新密码后返回首页，再用新密码登录。

### 可以交给 AI 的提示词

```text
请在现有 Supabase 邮箱密码登录弹窗中增加忘记密码流程。
重置邮件回跳到 /reset-password；不要暴露邮箱是否已注册；
新密码页面必须验证 recovery session、校验最少 8 位和两次输入一致。
保持认证请求在 src/services/supabase/auth.ts，完成后运行 pnpm.cmd build。
```

## 7. 当前代码位置速查

| 责任 | 文件 |
| --- | --- |
| Supabase Client 和环境变量校验 | [src/services/supabase/client.ts](../src/services/supabase/client.ts) |
| 认证请求 | [src/services/supabase/auth.ts](../src/services/supabase/auth.ts) |
| 用户资料请求 | [src/services/supabase/profiles.ts](../src/services/supabase/profiles.ts) |
| 登录、注册、找回密码 UI | [src/features/auth/components/AuthModal.tsx](../src/features/auth/components/AuthModal.tsx) |
| 重置密码页面 | [src/features/auth/components/PasswordResetPage.tsx](../src/features/auth/components/PasswordResetPage.tsx) |
| 用户中心与昵称修改 | [src/features/auth/components/UserCenterModal.tsx](../src/features/auth/components/UserCenterModal.tsx) |
| 应用会话恢复和回跳页面装配 | [src/app/App.tsx](../src/app/App.tsx) |
| 数据库迁移 | [supabase/migrations](../supabase/migrations) |

## 7.1 需要登录的功能入口

本地拉片、浏览和公开内容可免注册使用。以下操作必须已登录：

- 提交普通反馈或支持者专属反馈。
- 创建打赏请求、确认付款、取消付款。
- 兑换支持码。

前端只在用户点击上述提交入口时检查会话：未登录时打开现有登录/注册弹窗，输入内容仍保留在当前页面；不会向 `support_requests`、`feedback_requests` 或兑换 RPC 写入数据。登录后的业务请求仍由 Supabase RLS 与受控 RPC 二次校验，前端门控不替代后端权限控制。

## 8. 用户角色与后台授权

角色不保存在 `profiles` 中。`profiles` 允许用户修改自己的昵称；若把角色放入该表，用户可能借由同一更新权限篡改自己的角色。

角色数据保存在 `public.user_entitlements`：

| 角色 | 标识 | 当前说明 |
| --- | --- | --- |
| 免费用户 | `free` | 注册后自动分配，可使用本地拉片基础功能。 |
| 支持者 | `supporter` | 用于小额打赏后的感谢与后续权益。 |

### 开发者后台权限

你是 Supabase 项目的所有者，可以在控制台后台更新任意用户角色；普通用户只有读取自己角色的 RLS 策略，**没有**新增、更新或删除角色的客户端权限。

先在 Supabase SQL Editor 执行 [20260811200000_create_user_entitlements.sql](../supabase/migrations/20260811200000_create_user_entitlements.sql)。它会：

1. 创建权益表并为已有用户补上默认 `free` 角色。
2. 更新注册触发器，使后续新用户自动获得 `free` 角色。
3. 开启 RLS，只允许用户读取自己的角色。

在 **Authentication → Users** 复制目标用户的 UUID 后，作为项目管理员在 SQL Editor 执行以下 SQL（替换 UUID 和角色值）：

```sql
update public.user_entitlements
set role = 'supporter', source = 'manual', updated_at = now()
where user_id = '目标用户 UUID';
```

可用的角色值只有：`free`、`supporter`。更新后让用户刷新页面或重新登录，即可在用户中心看到新角色；付款和兑换码兑换均统一授予 `supporter`。

不要将上述更新 SQL 放进浏览器，也不要为前端增加直接更新 `user_entitlements` 的权限。未来接入支付后，应由“支付平台 Webhook → Edge Function 验签 → 更新角色”自动完成授予。

### AI 已完成的工作

- 在 [20260811200000_create_user_entitlements.sql](../supabase/migrations/20260811200000_create_user_entitlements.sql) 定义角色、RLS 与注册自动分配规则。
- 在 [entitlements.ts](../src/services/supabase/entitlements.ts) 封装当前用户角色的只读请求。
- 在 [UserCenterModal.tsx](../src/features/auth/components/UserCenterModal.tsx) 展示角色名称与说明。
- 在 [userRoles.ts](../src/features/auth/constants/userRoles.ts) 集中维护角色文案，方便后续迭代权益。
- 打赏请求、付款操作时间和人工核验流程见 [SUPPORT_DONATION_OPERATIONS.md](./SUPPORT_DONATION_OPERATIONS.md)。
- 用户反馈的数据库启用、后台查询和状态处理见 [FEEDBACK_OPERATIONS.md](./FEEDBACK_OPERATIONS.md)。

### 可以交给 AI 的提示词

```text
请为 AisenLens 增加基于角色的权益模型。
角色包含 free、supporter；角色必须保存在独立表，普通用户只能读取自己的角色，不能更新；
新用户自动获得 free。用户中心展示角色，但不要实现可被普通用户调用的升级接口。
请提供 Supabase SQL 迁移，保持支付接入留给未来的安全 Webhook，并运行 pnpm.cmd build。
```

## 9. 后续三项上线前设置

以下三项暂未改变应用功能，可以在接近公开上线时完成。

### 8.1 配置品牌邮件和自定义 SMTP

**开发者操作**

1. 在 Authentication 的 Email Templates 中，调整“重置密码”等邮件的主题、称呼和品牌名称为 `AisenLens`。
2. 正式发布前，在项目设置中接入自己的 SMTP 服务并设置发件人名称与域名。
3. 用常见邮箱实际测试收件速度、垃圾邮件目录和重置链接。

**建议提示词**

```text
请为 AisenLens 编写一份中文密码重置邮件模板：简洁、可信、说明链接有效期，
不要在邮件中包含用户密码或敏感信息，并保留 Supabase 的重置链接占位符。
```

### 8.2 配置正式域名和回调地址

**开发者操作**

1. 部署网站并确定正式域名，例如 `https://app.example.com`。
2. 将该地址设置为 Supabase Authentication 的 Site URL。
3. 将 `https://app.example.com/reset-password` 加入 Redirect URLs。
4. 保留开发用的 `http://localhost:8443/reset-password`，不要用通配符放开未知域名。
5. 在正式域名重新测试注册、登录和密码重置。

**注意**：当前代码根据 `window.location.origin` 生成重置回调地址，因此每个允许的环境都必须在 Supabase Redirect URLs 中明确登记。

### 8.3 复查 `profiles` 的 RLS

**开发者操作**

1. 在 Table Editor 确认 `profiles` 已开启 RLS。
2. 在 Policies 中确认仅保留“用户只能查询自己的资料”和“用户只能修改自己的资料”两类权限。
3. 使用两个测试账号：账号 A 不应能读取或修改账号 B 的昵称。
4. 若日后增加头像、会员等级等字段，先重新设计列权限与更新规则，再修改前端。

**建议提示词**

```text
请审查本项目 public.profiles 的 Supabase RLS 策略。
目标是普通登录用户只能 select 和 update 自己 id 对应的行；
不要降低 RLS，也不要在浏览器中使用 service_role key。请给出最小 SQL 修正和验证步骤。
```

## 10. 日常开发规则

- 新增用户能力前，先判断它属于 `features/auth`、`services/supabase` 还是 `supabase/migrations`。
- UI 只处理交互和展示；Supabase 调用集中在 service 层。
- 改动表结构、触发器或 RLS 时，先新增迁移文件，再在 SQL Editor 执行。
- 每次修改后运行：

```powershell
pnpm.cmd build
```

- 继续遵循渐进式拆分：开发到哪个模块，就只拆分该模块相关代码并更新 [ARCHITECTURE_MIGRATION_PLAN.md](./ARCHITECTURE_MIGRATION_PLAN.md) 的完成状态。
