# AisenLens 支持与付款操作说明

当前支持页使用前端固定金额收款码，不接入第三方支付 API。数据库只记录支持请求、支付渠道、订单后四位和状态，不保存付款金额或金额档位。

## 数据表

- `support_requests`：用户发起的支持请求和状态。
- `support_request_events`：打开、取消、提交和超时等操作时间线。
- `user_entitlements`：用户当前的 `free` / `supporter` 身份。

## 初始化

按文件名顺序执行 `supabase/migrations` 中当前保留的迁移。数据库迁移完成后，支持页面会从前端配置加载微信和支付宝收款码。

当前收款码文件位于：

- `apps/web/src/assets/payments/wechat.jpg`
- `apps/web/src/assets/payments/alipay.jpg`

## 用户流程

1. 未登录用户点击支持入口时，先打开登录/注册弹窗。
2. 已登录用户选择支付方式并创建支持请求。
3. 支付弹窗展示收款码和两分钟倒计时。
4. 用户支付后填写订单号后四位并提交。
5. 后台根据实际收款记录处理请求状态，系统不会依据前端提交自动改变身份。

## 后台查询

查看待处理的支持请求：

```sql
select
  requests.id,
  profiles.display_name,
  users.email,
  requests.payment_channel,
  requests.payment_reference_last4,
  requests.created_at,
  requests.updated_at,
  requests.expires_at,
  requests.status
from public.support_requests as requests
left join public.profiles as profiles on profiles.id = requests.user_id
left join auth.users as users on users.id = requests.user_id
where requests.status = 'user_claimed_paid'
order by requests.updated_at asc;
```

确认实际到账后，再由后台授予支持者身份：

```sql
select public.apply_support_entitlement(
  (select user_id from public.support_requests where id = '支持请求 UUID'),
  'supporter',
  'payment'
);
```

`payment_reference_last4`、按钮点击和时间只能辅助匹配，实际到账记录才是最终依据。
