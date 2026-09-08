# P07 — Cinema / Studio / System统一视觉系统

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`0248c94`。P01–06已经遵循指定双主题规范，本阶段统一剩余token/系统偏好/公共组件与跨页细节，不是最后才开始设计。

## Scope

完成Cinema/Studio视觉token体系，新增System偏好解析；处理Portal/Toaster/公共UI的主题一致性，去除工作台硬编码深色覆写，统一导航/选中/焦点/playhead/信息层级。

## Non-goals

不维护两套布局，不重设计营销页，不修改数据/算法/导出图层语义，不复制Lensflow样式，不重新选择品牌方向，不安装新UI框架或字体。

## Current Files

- `apps/web/src/index.css`：当前暖灰light token、固定accent、text-white/bg-white覆写、timeline与responsive规则。
- `apps/web/src/types/theme.ts`：目前仅dark/light。
- `apps/web/src/app/App.tsx`：theme localStorage、html dataset、Toaster。
- `apps/web/src/hooks/useLocalStorage.ts`、`components/layout/AppNavigation.tsx`、`features/editor/components/LiteSettingsModal.tsx`：偏好入口与类型使用者。
- `apps/web/src/components/ui/{button,dialog,dropdown-menu,tooltip,tabs,input,textarea,checkbox,sonner}.tsx`
- `apps/web/src/features/editor/components/{EditorTimeline,VideoPreviewCanvas,VideoPlaybackControls}.tsx`和timeline组件。
- P01–06新增的workflow/overview/analysis/group/learn/media组合视图。

## New Files

- `apps/web/src/hooks/useAppTheme.ts`：集中读取偏好并解析系统媒体查询。
- `tests/features/workflow/{theme-preference.test.ts,dual-theme.browser.test.js}`

如当前已有等效theme hook则扩展，避免重复。无需新增一份全局CSS；token继续集中在index.css。

## Data Changes

无DB变化。`ThemePreference = dark | light | system`，`ResolvedTheme = dark | light`，偏好存既有`aisenlens:theme`，data-theme仅resolved。已有dark/light原值继续有效，这是同一偏好扩展，不做旧项目迁移。未知偏好采用明确默认dark，System只在用户选择后跟随系统。

## Component Changes

1. 搜索所有theme props/硬编码text-white/bg-white、--accent/--primary、Portal使用处，先建真实影响清单再改。
2. 建语义映射：--app-accent/selected-bg、viewer-bg/foreground、playhead、waveform、success/warning/danger/ai；Tailwind引用token，避免固定`.text-accent`与主题值矛盾。shadcn --accent保留hover语义，不能误替换成蓝底。
3. Studio由暖米灰改冷灰：app #f1f1f1、nav #e9e9e9、panel #f5f5f5、deep #e3e3e3、局部input/card白色。Cinema保留深中性层级。Viewer默认#050505；显式用户画布背景不被主题覆盖。
4. App只消费useAppTheme结果，系统监听注册/清理一次；显式dark/light不响应系统改动。html保持resolved主题，使body外Portal、Toaster、菜单一致。
5. 用语义utility逐处替换工作区白色硬编码，确认无消费者后删除对应旧覆写；公共页面仍需基础可读性回归，不顺便改营销布局。
6. 选中蓝/playhead红/待review琥珀/人工笔记中性/AI来源紫；无AI结果不为了视觉展示紫色内容。ViewerTools与Inspector控件沿用同一组件。

## User Flow

全局设置选择Cinema(Dark)、Studio(Light)、System → 当前页面立刻换token → 正在播放位置、镜头选择和未保存草稿不变 → 弹出导出Dialog颜色一致 → reload保留偏好；System下切OS主题时跟随，显式模式不跟随。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | 使用与Ready同样主题的真实空状态，无营销插画替代功能 |
| Loading | CSS初始与偏好解析不造成大面积反色闪烁；Skeleton不暗示数据 |
| Ready | 全阶段/Portal/Toaster一致 |
| Disabled | 可辨识原因与文字，非单纯opacity降低到不可读 |
| Error | 红色+图标+文字，和红playhead形状/位置区分 |
| Coming Soon | 中性说明/禁用语义，不着色成已完成 |
| Experimental | 小标签和文案，只用于真实研究能力 |

## Theme Requirements

权威：`docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md`完整规范，重点§§4–27、35–39。使用impeccable在一次有边界的桌面/窄屏检查中确认对齐、密度、焦点与对比度；不要做无休止美化。

共用spacing4/8/12/16/24；title13–14/section11–12/body12–13/meta11；Geist正文、mono仅时码/帧号/数字。面板0–4px、控件6px、Popover8px、Dialog10–12px；workspace无大shadow/glow/gradient。120–180ms轻微过渡，reduced-motion禁非必要动画。Inspector Section+Divider，SceneBoard统一16:9，Timeline图形语法全阶段一致。

对比度采用WCAG2.2 AA目标：正文4.5:1，控件边界/焦点3:1。规范中的faint颜色不能照搬为正文；必要时提高颜色可读性并在总计划记录实际token。

## Migration

沿用同一UI树与同一data-theme约定，不给theme加component key、不重启task/video。旧白色覆写只在确认所有相关消费者改为semantic utility后删除。用户自定义的绘图/视频内容颜色不是UI chrome，不能全局替换。

## Acceptance Criteria

- [ ] 三种偏好、系统变更、reload、未知值、listener清理行为正确。
- [ ] 双主题下Viewer稳定、selection和playhead不同语义，关键文字/焦点可读。
- [ ] Portal、Toaster、菜单、Dialog和页面无反色冲突。
- [ ] 无两套UI树/大量theme条件分支，无媒体/任务重挂。
- [ ] 200%文字缩放、四尺寸、键盘、reduced-motion检查通过。
- [ ] 公共项目库/登录弹层/公共页面无token级可读性回归。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build`。新增偏好解析测试与browser的matchMedia变化/Portal继承检查；复用当前真实页面，禁止仅用静态色块作为全部验收。两主题拍同一真实测试项目/状态以比较信息层级。

## Manual QA

1. 开始播放，在三种偏好间切换，检查currentTime/worker数量/dirty状态不重置。
2. 每阶段打开菜单/导出/Inspector，查看标题、按钮、placeholder、disabled和error。
3. 1440/1024/768/390宽度、200%缩放、键盘和系统减少动态效果。
4. 检查项目库与公共导航；Viewer内容颜色和导出截图不能随chrome主题改变。

## Regression Checklist

R07/R09/R10/R11/R12/R13/R14；布局参数/组件结构/数据完全共用。无示例AI内容，无theme切换导致截图重取全片。

## Completion Gate

真实页面双主题视觉与功能检查通过、System/Portal测试通过，记录最终token映射与保留的有限例外，进入P08。不能只完成dark后把light标“后续”。

## Rollback

独立theme提交回退；如果回退到不支持system的代码，使用默认解析即可，不删localStorage和用户DB。不把UI token回退扩展到用户绘图颜色或媒体内容。
