# AisenLens 打赏与人工核验操作说明

> 当前方案使用固定金额的微信/支付宝收款码，不接入第三方支付接口。系统只记录用户的打赏请求和操作时间；是否到账必须由开发者以实际收款记录人工确认。

## 1. 一次性启用

在 Supabase 项目中打开 **SQL Editor → New query**，复制并执行 [20260811210000_create_support_requests.sql](../supabase/migrations/20260811210000_create_support_requests.sql) 的全部内容。

看到 `Success. No rows returned` 即表示成功。该迁移会创建：

- `support_tiers`：固定档位及其金额。
- `support_requests`：用户发起的打赏请求和人工核验状态。
- `support_request_events`：付款码打开、用户取消、用户声明已支付的服务端时间记录。
- 两个受控数据库函数：普通用户无法直接伪造已验证状态。

## 2. 配置固定金额收款码

收款码不在仓库中，避免误把示例图当作真实付款入口。请在 [supportTiers.ts](../src/features/support/constants/supportTiers.ts) 的每个档位填入真实图片 URL：

```ts
paymentQrUrls: {
  wechat: "https://你的图片地址/wechat-flower-9-9.png",
  alipay: "https://你的图片地址/alipay-flower-9-9.png",
}
```

需要为每个展示的金额、每种已启用支付方式分别配置对应的固定金额二维码。当前档位与数据库一致：

| 档位 ID | 金额 |
| --- | --- |
| `flower` | ¥9.9 |
| `burger` | ¥19.9 |
| `coffee` | ¥29.9 |
| `movie` | ¥49.9 |
| `meal` | ¥99 |
| `patron` | ¥199 |

图片地址可以使用你自己可信的 HTTPS 图片服务。若希望把图片跟随前端项目发布，可将图片放在 `src/assets/payments/`，在配置文件顶部导入图片后，将导入变量填入对应的 `paymentQrUrls`。不要使用临时或会失效的图片链接。

收款码配置完成后运行：

```powershell
pnpm.cmd build
```

## 3. 用户端流程

1. 用户选择固定打赏金额、支付方式，并可选择填写给开发者的留言。
2. 点击“去打赏”时，系统以当前登录用户身份创建一条 `pending` 打赏请求，同时记录 `payment_opened` 的数据库时间。
3. 弹出对应金额和支付方式的收款码。
4. 弹窗提示用户在付款备注填写用户名，便于人工匹配。
5. 点击“取消”会记录 `payment_cancelled`；点击“我已支付”会记录 `payment_claimed_paid`，并将请求标记为 `user_claimed_paid`。
6. “我已支付”只是用户声明，绝不代表系统已确认收款或自动升级角色。

用户关闭浏览器或直接离开页面时，可能没有取消事件；这类请求会保持 `pending`，可由后台稍后标记为 `expired`。

## 4. 后台人工核验

在 SQL Editor 执行以下查询，查看用户已声明付款、等待核验的请求：

```sql
select
  requests.id,
  profiles.display_name,
  users.email,
  tiers.amount_cents / 100.0 as amount,
  requests.payment_channel,
  requests.message,
  requests.created_at,
  requests.updated_at,
  requests.status
from public.support_requests as requests
join public.support_tiers as tiers on tiers.id = requests.tier_id
left join public.profiles as profiles on profiles.id = requests.user_id
left join auth.users as users on users.id = requests.user_id
where requests.status = 'user_claimed_paid'
order by requests.updated_at asc;
```

将结果与微信或支付宝的实际收款记录比对：金额、支付方式、用户名备注、创建时间、用户声明时间和留言都只能辅助匹配；**实际到账记录才是唯一确认依据**。

如需查看某笔请求的完整用户操作时间线：

```sql
select event_type, created_at
from public.support_request_events
where request_id = '打赏请求 UUID'
order by created_at asc;
```

确认到账后，先标记请求：

```sql
update public.support_requests
set status = 'verified', updated_at = now()
where id = '打赏请求 UUID';
```

再按你设定的档位规则为用户授予角色：

```sql
update public.user_entitlements
set role = 'supporter', source = 'manual', updated_at = now()
where user_id = '用户 UUID';
```

将 `supporter` 换为 `patron` 即可升级为更高角色。若核验不通过，使用 `rejected`；长时间未完成的请求使用 `expired`。不要删除订单，保留状态和事件时间有助于后续追溯。

## 5. 安全边界

- 用户只能读取自己的请求和事件，不能直接新增、修改或删除订单状态。
- 前端只能调用两个数据库函数，函数会从登录会话取得用户 ID 和数据库时间。
- 角色仍保存在 `user_entitlements`，普通用户没有角色写入权限。
- 不收集付款截图、真实姓名、交易单号等额外个人信息；当前表单只接收可选留言。
- 用户名备注、按钮点击和时间匹配均可能被伪造或碰巧重合，不能自动授予角色。
- 公开收款前，请确认使用的收款码符合微信/支付宝及所在地对商业收款的规则。

## 6. 后续接支付平台时

保留 `support_requests` 作为订单记录；将人工核验替换为“支付平台 Webhook → Supabase Edge Function 验签 → 标记 `verified` → 更新角色”。不要改为由浏览器接收支付成功回调或使用 `service_role` key。
