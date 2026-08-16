# 兑换码与支持者模块计划

当前身份模型只保留 `free` 与 `supporter`。付款和兑换码兑换都会授予 `supporter`，数据库不保存付款金额或支付档位。

## 数据模型

| 概念 | 用途 | 当前值 |
| --- | --- | --- |
| 用户角色 | 控制产品权益 | `free`、`supporter` |
| 兑换活动 | 控制兑换码批次和上限 | `supporter_2026`，上限 500 |
| 兑换码 | 单次兑换凭据 | 仅保存 SHA-256 哈希 |

付款金额和收款码只存在前端支持配置中，不参与数据库身份判断。

## 安全设计

1. 兑换码由 PostgreSQL `pgcrypto` 生成，明文只在生成时返回一次。
2. 数据库只保存标准化后的 SHA-256 哈希、状态和领取记录。
3. `redeem_support_code` 在事务中锁定兑换码和活动，完成状态检查后授予 `supporter`。
4. 每个兑换码和每个用户在同一活动中只能成功兑换一次。
5. 兑换码生成和活动维护函数不授予浏览器端调用权限。

## 发布流程

1. 执行 `supabase/migrations` 中当前保留的迁移。
2. 执行 `20260816220000_ensure_supporter_redemption_campaign.sql`。
3. 生成并立即安全保存 500 个兑换码：

```sql
select *
from public.generate_redemption_codes('supporter_2026', 500);
```

4. 只向目标用户分发明文兑换码，不提交到 Git、Vercel 或公开网盘。
