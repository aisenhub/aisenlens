# AisenLens shadcn/ui 使用教程

## 目的

shadcn/ui 是项目的基础交互组件来源，不是整站视觉模板。组件源码保存在仓库内，可按 AisenLens 的深色和浅色主题持续调整；业务页面、项目卡片和编辑器仍保持自定义设计。

## 当前已接入

- `src/components/ui/button.tsx`：按钮。
- `src/components/ui/dialog.tsx`：弹窗。
- `src/components/ui/dropdown-menu.tsx`：下拉菜单。
- `src/components/ui/tooltip.tsx`：提示气泡。
- `src/components/ui/tabs.tsx`：标签页。
- `src/components/ui/sonner.tsx`：全局通知。
- `src/lib/utils.ts`：`cn()` 类名合并工具。

应用根节点已配置 `Toaster`。新功能可直接调用通知；无需自行再挂载通知容器。组件的语义颜色已映射到 `src/index.css` 的 AisenLens 深浅主题变量。

## 开发者操作

### 新增组件

先确认已有组件不能满足需求，再执行：

```bash
pnpm dlx shadcn@latest add <组件名> --yes
```

例如：

```bash
pnpm dlx shadcn@latest add input select textarea --yes
```

生成后的源码位于 `src/components/ui/`。不要直接修改 `node_modules`；如需外观调整，修改生成的组件源码或在使用处传入 `className`。

本项目使用本地 pnpm store。若命令提示 `ERR_PNPM_UNEXPECTED_STORE`，使用：

```bash
pnpm add <缺失依赖> --store-dir .pnpm-store/v11
pnpm dlx shadcn@latest add <组件名> --yes
```

### 常用调用

```tsx
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

<Button onClick={() => toast.success("已保存")}>保存</Button>
```

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger>打开设置</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>项目设置</DialogTitle>
      <DialogDescription>调整项目的基础信息。</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

## 让 AI 使用组件

描述具体目标即可，例如：

- “把用户头像菜单改成 shadcn 下拉菜单，保留现在的视觉。”
- “反馈提交成功后用通知提示。”
- “新建项目弹窗使用现有 Dialog 和 Button。”
- “先检查现有 UI 组件是否可复用；缺少时再添加 shadcn 的 Input。”

AI 应先检查 `src/components/ui/`、相邻模块和现有页面，再决定复用、扩展或新增组件。新增组件后应匹配现有主题 token，且运行构建验证。

## 边界

- 不以 shadcn 默认配色覆盖 AisenLens 的设计。
- 不为使用一个小控件而整页重写。
- 不将视频播放、时间线、项目状态或 Supabase 调用放进通用 UI 组件。
- 编辑器的高密度工作区继续使用定制组件；只复用通用弹窗、菜单、提示等交互基元。
