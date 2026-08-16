# AisenLens 反馈收集与处理说明

## 1. 启用反馈数据库

在 Supabase 控制台打开 **SQL Editor → New query**，复制并执行 [20260812100000_create_feedback_requests.sql](../supabase/migrations/20260812100000_create_feedback_requests.sql) 的全部内容。

出现 `Success. No rows returned` 表示执行成功。迁移会创建 `public.feedback_requests` 和安全的 `create_feedback_request` 数据库函数。

反馈身份由 [20260816110000_add_feedback_identity.sql](../supabase/migrations/20260816110000_add_feedback_identity.sql) 初始化：仅保留 `free` 与 `supporter`，并提供支持者专属反馈访问校验。

## 2. 用户端行为

反馈页要求用户先登录，提交时仅收集：

- 反馈类型：问题反馈、功能建议、使用体验或其他。
- 标题：3 至 80 个字符。
- 详细内容：10 至 2000 个字符。

注册邮箱与用户 ID 从登录会话获取，用户不需要重复填写，也不会在页面公开展示。反馈沟通默认使用用户的注册邮箱；用户提交后仅看到本次提交成功提示，处理记录只供开发者后台查看。

支持页的“提交专属反馈”会先调用服务端资格核验：`user_entitlements.role = supporter` 的支持者才能打开专属通道。普通用户会看到提示弹窗，可直接跳转到普通反馈页面；前端不会以本地角色状态代替后端判断。

## 3. 后台查看与处理

在 **SQL Editor** 执行以下查询，可查看所有待处理反馈及用户信息：

```sql
select
  feedback.id,
  feedback.kind,
  feedback.title,
  feedback.content,
  feedback.submitter_identity,
  feedback.submission_source,
  feedback.status,
  feedback.created_at,
  profiles.display_name,
  users.email
from public.feedback_requests as feedback
left join public.profiles as profiles on profiles.id = feedback.user_id
left join auth.users as users on users.id = feedback.user_id
order by feedback.created_at desc;
```

需要与用户沟通时，使用其注册邮箱。改变处理状态时执行：

```sql
update public.feedback_requests
set status = 'in_review', updated_at = now()
where id = '反馈 UUID';
```

可用状态：

| 状态 | 用户侧显示 | 使用时机 |
| --- | --- | --- |
| `submitted` | 已提交 | 新反馈默认状态。 |
| `in_review` | 处理中 | 已开始阅读或复现。 |
| `planned` | 已规划 | 已进入后续计划。 |
| `resolved` | 已完成 | Bug 已修复或建议已实现。 |
| `closed` | 已关闭 | 暂不处理或重复反馈。 |

反馈不应删除；保留状态和时间能帮助判断高频需求与已完成事项。

## 4. 安全边界

- 普通用户没有读取反馈记录或直接写表权限。
- 提交通过数据库函数完成，用户 ID 与创建时间由登录会话和数据库确定。
- 普通用户不能修改反馈的处理状态。
- 不收集设备指纹、截图、交易信息或额外联系方式。
- 需要收集截图、日志或文件时，应单独设计上传机制与隐私说明，不要将其直接塞入文本字段。

## 5. 后续扩展

当反馈量增加时，可以再增加后台管理页面、标签、内部备注、关联版本和回复记录。管理员写入接口应使用 Supabase Edge Function 或可信后端，不能将 `service_role` key 放进浏览器。
