# 编辑器字号规范

## 目标

编辑器是高密度工作区，字号按信息角色而非组件来源决定。禁止在编辑器业务界面随意新增 `text-xs`、`text-sm` 或任意像素字号；优先使用本规范的角色类。

## 字号层级

| 角色 | 尺寸 / 行高 | 用途 |
| --- | --- | --- |
| `editor-page-title` | 16 / 22px | 顶栏项目名称、弹窗主标题 |
| `editor-heading` | 12 / 16px | 面板标题、区块标题、卡片标题、页签 |
| `editor-body` | 12 / 18px | 正文、字段值、输入、按钮、菜单项 |
| `editor-meta` | 11 / 16px | 辅助说明、计数、状态、占位提示、次级标签 |
| `editor-micro` | 10 / 14px | 时间码、标尺、轨道配置、缩略信息 |
| `editor-clip-label` | 8 / 12px | 仅时间轴狭窄分镜块内部标签 |

同一信息层级以颜色、字重和间距建立差异；不得用随机字号制造层级。面板标题使用 `editor-heading` + `font-medium` 或 `font-mono tracking-wider`，而非放大到正文两倍。数值与时间码使用 `font-mono tabular-nums`。

## 调研结论

- Material Design 3 的 type scale 将 label、body、title 明确分成不同角色，避免组件各自定义字号。
- OpenReel 在编辑器面板中以 `text-xs` 作为主要控制文字、`text-sm` 作为少量卡片标题，并单独定义 10px 辅助档。
- OpenCut 将编辑器基础 `text-xs` 设为约 11.5px、`text-sm` 设为约 12.6px；时间码另用紧凑等宽文本。

AisenLens 采用更清晰的 12 / 11 / 10 三档工作区比例，并将 8px 限制在时间轴内，以兼顾中文可读性与编辑器密度。
