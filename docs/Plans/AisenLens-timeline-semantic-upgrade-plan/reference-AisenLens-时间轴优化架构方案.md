# AisenLens 时间轴优化架构方案

> 文档目标：整理并固化当前关于 AisenLens 时间轴重构的核心设计共识，为后续 UI、交互、数据模型和代码重构提供统一依据。
> 适用范围：AisenLens 编辑器 / 拉片工作区 / Timeline 相关模块。
> 审查修订：2026-09-15。本文是目标设计，不代表已经实施。正式类型、存储升级和验收细则见配套分阶段计划；当前实现事实仍以有效架构文档和源码为准。

---

## 1. 优化目标

AisenLens 的时间轴不应向传统 NLE（Premiere、DaVinci Resolve）靠拢，而应围绕“理解影片”建立自己的时间轴语法。

核心目标：

1. 让用户能够从全片宏观结构逐级下钻到具体镜头。
2. 让结构、观察、媒体和分析维度在同一个时间坐标上协同工作。
3. 降低当前 `Group / Shot / Frame / Marker` 之间的概念重叠。
4. 为未来的台词、情绪、音乐、角色、构图、运镜等分析轨道提供统一扩展机制。
5. 允许 AI 提供结构建议，但保留用户对 Scene / Sequence / Section 等解释性结构的最终决定权。
6. 保持数据模型相对扁平，避免过早引入复杂的递归父子树。

最终方向可以概括为：

> **时间是统一坐标，结构是导航骨架，Marker 是自由观察，分析轨道是不同观察维度。**

---

## 2. 时间轴总体信息架构

推荐时间轴从上到下按照 **宏观 → 微观** 排列：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Dialogue
Emotion
Music
...
Audio
```

其中可以进一步分区：

```text
STRUCTURE
────────────────────────
Section
Sequence
Scene

VISUAL BACKBONE
────────────────────────
Shot + Frame

ANNOTATION
────────────────────────
Marker

ANALYSIS
────────────────────────
Dialogue
Emotion
Music
Character
Camera
Composition
Color
Rhythm
...

MEDIA
────────────────────────
Audio
```

核心原则：

- **空间顺序：宏观 → 微观**
- **视觉权重：越接近 Shot，越强**
- Section / Sequence 应更轻、更薄。
- Scene 作为核心结构层，视觉权重中等。
- Shot + Frame 是视觉主轴，应占据最高视觉权重。
- 分析轨道按需开启，而不是默认全部展示。

---

## 3. 四级结构模型

AisenLens 推荐正式保留以下四种结构尺度：

```text
Film
└─ Section
   └─ Sequence
      └─ Scene
         └─ Shot
            └─ Frame
```

需要强调：

> UI 可以体现层级，但数据层暂时不必建立强制递归树。

### 3.1 Shot —— 视听表达单位

核心问题：

> **怎么拍？**

职责：

- 最小稳定视听分析单元。
- 基于剪切点或转场切分。
- 可通过自动镜头检测生成。
- 承载景别、构图、运镜、色彩、镜头时长等分析。

边界特征：

- 相对客观。
- 通常对应剪辑切点。
- 适合自动检测 + 人工校准。

---

### 3.2 Scene —— 戏剧行动单位

核心问题：

> **这一场戏发生了什么？**

职责：

- 把一组连续 Shot 组织成基本场景 / 戏剧行动单元。
- 描述人物、地点、冲突、目标、动作和局部情绪变化。
- 是 AisenLens 中最核心的人工结构层。

边界通常由以下变化产生：

- 地点变化
- 时间变化
- 人物行动目标变化
- 戏剧冲突阶段变化
- 明显的场景连续性中断

建议默认项目至少支持：

```text
Scene
Shot
```

---

### 3.3 Sequence —— 叙事事件单位

核心问题：

> **这一组 Scene 共同完成了什么事件或目标？**

职责：

- 将多个 Scene 组织成一个较大的叙事任务或事件。
- 不要求地点连续。
- 更关注事件目标、过程与结果。
- 比 Scene 更主观。

例如：

```text
Sequence：调查嫌疑人

Scene 1：到达公寓
Scene 2：询问邻居
Scene 3：搜索房间
Scene 4：发现线索
Scene 5：追赶嫌疑人
```

Sequence 的边界常由：

- 一个事件开始 / 完成
- 目标发生变化
- 叙事任务切换
- 重要转折

决定。

---

### 3.4 Section —— 宏观结构单位

核心问题：

> **整部影片现在处于哪个阶段？**

职责：

- 表达全片的大结构、章节、幕、主题阶段或用户自定义宏观区段。
- 不是严格统一的影视工业术语。
- 更适合作为 AisenLens 的宏观结构容器。

例如：

```text
Section 1：正常世界
Section 2：进入异常世界
Section 3：冲突升级
Section 4：最终对决
Section 5：新的平衡
```

Section 应保持较强自由度。

---

## 4. 四级结构之间的专业区别

可以用一句话固定定义：

- **Shot = 视听表达单位**
- **Scene = 戏剧行动单位**
- **Sequence = 叙事事件单位**
- **Section = 宏观结构单位**

对应问题：

```text
Shot
How is it shown?
怎么拍？

Scene
What happens here?
这场戏发生了什么？

Sequence
What larger objective/event is completed?
这一组戏共同完成了什么？

Section
What phase of the film are we in?
全片当前处在哪个宏观阶段？
```

因此这四层不是简单按“长度”划分，而是按**叙事职责**划分。

---

## 5. Structure 与 Analysis Dimension 必须分离

Scene / Sequence / Section / Shot 属于：

> **结构层级（Structure）**

而台词、情绪、音乐、构图、运镜等属于：

> **分析维度（Analysis Dimension）**

不要设计成：

```text
Scene
├─ Dialogue
├─ Emotion
└─ Music
```

更准确的是：

```text
STRUCTURE
Section
Sequence
Scene
Shot

ANALYSIS DIMENSIONS
Dialogue
Emotion
Music
Sound
Composition
Camera
Color
Character
Narrative
...
```

它们通过同一个时间坐标发生关系。

---

## 6. 引入 Scope / Granularity 概念

分析数据不应该被强制归属到某个结构节点，而应该知道自己是在什么观察尺度上成立。

建议使用：

```ts
type AnalysisScope =
  | "film"
  | "section"
  | "sequence"
  | "scene"
  | "shot"
  | "frame"
  | "free";
```

例如同一个 Emotion 维度可以同时存在：

```text
Scene 级：
压抑 → 紧张 → 爆发 → 平静

Shot 级：
Shot 32：紧张
Shot 33：爆发
```

所以：

> **Structure 决定“我在哪里”。**
> **Dimension 决定“我分析什么”。**
> **Scope 决定“这个结论在什么尺度上成立”。**

---

## 7. Shot + Frame 合并为视觉主轨

当前“画面帧轨道”和“镜头轨道”存在明显视觉信息重叠。

建议：

> **UI 合并，数据模型不合并。**

将：

```text
video-frames
shots
```

合并为：

```text
Shot + Frame
```

或内部命名：

```text
Visual Track
```

示意：

```text
Shot 12              Shot 13                  Shot 14
────────────────┬──────────────────────┬─────────────────
▌ frame ▌ frame │ frame ▌ frame ▌ frame│ frame ▌ frame ▌
                ↑                     ↑
             cut point              cut point
```

含义：

- Frame 是视觉内容。
- Shot 是时间结构。
- Shot Boundary 是一等交互对象。

---

## 8. Shot Boundary 的交互职责

镜头切点可以承担：

- 点击：选中镜头边界
- 拖动：校准 Shot 边界
- hover：展示前后镜头信息
- 显示自动检测置信度
- 进入镜头校准
- 作为 Scene / Sequence / Section 的吸附基础

Scene 等高层结构边界原则上应始终吸附到 Shot Boundary。

---

## 9. Scene / Sequence / Section 的核心交互：Boundary First

这些结构不建议继续采用：

```text
框选若干 Shot
→ 创建 Group
→ 选择类型
```

作为主要工作流。

推荐改为：

> **在两个 Shot 之间插入结构边界。**

### 9.1 Scene Boundary

自动镜头切割后：

```text
Shot
01 │ 02 │ 03 │ 04 │ 05 │ 06 │ 07
```

用户判断 Shot 04 → 05 是新的场景：

```text
01 │ 02 │ 03 │ 04 ║ 05 │ 06 │ 07
                  ↑
            Scene Boundary
```

立即得到：

```text
Scene 01               Scene 02
01 │ 02 │ 03 │ 04 ║ 05 │ 06 │ 07
```

---

### 9.2 Sequence Boundary

Sequence 应建立在 Scene 结构之上。

用户面对：

```text
Scene 01 │ 02 │ 03 │ 04 │ 05 │ 06
```

在某个 Scene 边界上升级：

```text
Scene 01 │ 02 │ 03 ║ 04 │ 05 │ 06
                    ↑
             Sequence Boundary
```

---

### 9.3 Section Boundary

Section 同理：

```text
Section
────────────────║──────────────────

Sequence
──────║─────────║──────────║───────

Scene
──│──│──│──│──│──│──│──│──│──────

Shot
││││││││││││││││││││││││││││││
```

这样三种结构可以共享一套交互系统。

---

## 10. Promote / Demote 机制

结构边界建议支持升级和降级：

```text
Scene Boundary
→ Promote to Sequence Boundary
→ Promote to Section Boundary
```

例如：

```text
Scene
──│──│──║──│──│────
         ↑
```

用户认为这里不仅换 Scene，也是大的叙事阶段变化：

```text
Sequence
───────║────────────
```

再进一步：

```text
Section
───────║────────────
```

Promote / Demote 是非常适合 AisenLens 的核心结构编辑语言。

---

## 11. Scene / Sequence / Section 的编辑原则

### 11.1 结构边界吸附合法低层边界，允许局部跳层

建议：

- Scene Boundary → 位于合法 Shot Boundary。
- Sequence Boundary → 优先吸附目标附近合法 Scene Boundary；目标未被 Scene 覆盖时允许合法 Shot Boundary。
- Section Boundary → 优先合法 Sequence Boundary，其次 Scene Boundary，再次 Shot Boundary。
- 合法性由操作后的完整候选结构决定：高层不能切穿任何低层范围；不按“项目其他位置是否有该层”决定 fallback。
- 单层移动或删除不隐式联动其他层。共享切点操作如会破坏包含关系，禁用并解释原因；跨层联动不是第一期默认行为。

这样可以保持结构一致性。扁平存储仍需要层级校验，不能用“不存 parentId”代替包含约束。

### 11.2 移动边界，而不是编辑成员列表

例如：

```text
Scene 01        Scene 02
1 2 3 4 ║ 5 6 7 8
```

移动边界：

```text
1 2 3 4 5 ║ 6 7 8
```

比“编辑 Scene 包含哪些 Shot”自然得多。

完整覆盖、局部覆盖、孤立范围、范围与空白相邻都需要明确操作。孤立范围允许单独调整起止端点；相邻范围共享边界需原子更新两侧。选区创建对精确相同范围复用、完全空白创建，对其他同层重叠明确拒绝并引导使用拆分/移动，不隐式覆盖。

Split、Merge、Move、Delete 除结构外还影响 ResearchTarget、分析复核和导航引用；命令结果必须描述引用影响，由编辑器在同一撤销/保存边界应用。合并不能只保留标题而丢失被删除结构上的分析上下文。

---

## 12. 保留选区创建作为辅助交互

Boundary First 是主流程。

同时保留：

```text
框选连续 Shot
→ 创建 Scene
```

作为整理和修订工具。

底层仍然转化为边界：

```text
在第一个 Shot 前建立边界
在最后一个 Shot 后建立边界
```

这样交互多样，但底层模型统一。

---

## 13. AI 对结构的定位：建议，而不是裁决

Shot Detection 可以较自动化，因为 Shot 边界相对客观。

Scene / Sequence / Section 越往上越主观。

因此 AI 不建议直接“替用户确定结构”，而应输出：

```text
AI Suggested Boundary
```

示意：

```text
01 02 03 ┊ 04 05 ┊ 06 07
         ↑       ↑
       AI 建议   AI 建议
```

用户可以：

- 接受
- 忽略
- 调整

AI 可以基于：

- 地点变化
- 人物组合变化
- 时间变化
- 对白语义变化
- 环境音变化
- 音乐变化
- 色彩变化
- 节奏变化
- 动作连续性
- 叙事目标变化

提出结构候选。

核心定位：

> **AI 是结构助手，不是影片解释权的替代者。**

---

## 14. Group 的新定位

当前 Group 能力已经覆盖 Scene / Sequence / Section 的大部分底层需求。

推荐：

> **Group 保留为内部结构机制，不再作为主要用户概念。**

现有类似：

```ts
interface ShotGroupRecord {
  id: string;
  projectId: string;
  kind: "scene" | "section" | "sequence";
  title: string;
  summary: string;
  shotIds: string[];
}
```

可以继续作为过渡期底层模型。

产品 UI 中逐渐弱化：

```text
Group
Group Inspector
Create Group
```

改为语义化：

```text
Scene
Sequence
Section
```

内部后续可以考虑改名为：

```text
StructuralRange
```

或：

```text
SemanticGroup
```

但不需要为了 UI 重构立即迁移数据库。

---

## 15. 暂时不要建立强父子树

虽然 UI 可以表现：

```text
Section
└─ Sequence
   └─ Scene
      └─ Shot
```

但当前阶段不建议立即存：

```ts
scene.parentSequenceId
sequence.parentSectionId
```

优先维持扁平结构，通过时间范围推导包含关系。

例如：

```text
Sequence 02
Shot 20 → Shot 46

Scene 07
Shot 27 → Shot 34
```

可以自然得到：

```text
Scene 07 ∈ Sequence 02
```

优势：

- 边界修改更简单
- 不容易产生脏父子关系
- 更适合不同影片类型
- 允许跳过某个层级
- 后续仍可升级为显式树

原则：

> **显示层有层级，数据层先保持扁平。**

---

## 16. Marker 重新设计

### 16.1 取消四种预设 Marker 类型

Marker 不应要求用户先判断：

- 重要镜头（important）
- 构图精妙（composition）
- 情绪高点（emotion）
- 转折点（turning-point）

建议统一为：

> **单一 Marker + 自由文本内容**

数据最小模型：

```ts
interface Marker {
  id: string;
  frame: number; // 项目时间基准下的整数帧
  content: string;
}
```

创建流程：

```text
快捷键 M
→ 当前时间点
→ 输入内容
→ Enter
```

例如：

```text
▲ 第一次出现这个配乐
▲ 主角态度开始变化
▲ 这里为什么切特写？
▲ 注意视线匹配
```

---

## 17. Marker 应保留独立轨道

Marker 不应完全塞入 Scene。

原因：

它既可以是局部观察，也可以是宏观结构判断。

例如：

```text
Film Marker
▲ 故事真正启动

Sequence Marker
▲ 进入追逐段落

Scene Marker
▲ 情绪开始反转

Shot Marker
▲ 演员视线变化
```

因此应保留：

```text
Marker Track
```

它是跨层级的观察记录系统。

---

## 18. Marker Scope

推荐 Marker 支持轻量观察尺度：

```ts
type MarkerScope =
  | "film"
  | "section"
  | "sequence"
  | "scene"
  | "shot"
  | "free";
```

但创建 Marker 时不要强迫用户每次手选 Scope。

可以：

- 默认 `free`
- 根据当前工作上下文自动推断
- 后续允许用户修改

原则：

> **frame 是真实锚点，context / scope 是语义上下文。**

---

## 19. Marker Track 可以支持展开模式

默认压缩：

```text
Markers
────▲────────▲──────────▲──────
```

展开：

```text
Film      ▲
Section          ▲
Sequence              ▲
Scene           ▲
Shot                         ▲
```

这样同一条 Marker Track 可以兼顾宏观和微观观察。

---

## 20. Marker 与 Scene / Sequence 自动关联

Marker 不需要手动绑定 Scene。

系统可根据时间推导：

```text
Marker at 00:18:34

→ Section 02
→ Sequence 05
→ Scene 18
→ Shot 73
```

因此 Scene Inspector 可以自动聚合 Marker：

```text
Scene 18

Summary
...

Markers · 3
18:21  第一次提到离开
18:34  情绪开始反转
19:02  注意这个停顿
```

Sequence / Section Inspector 同理。

---

## 21. Marker 与分析轨道的边界

Marker：

> **“我注意到了什么？”**

Analysis Track：

> **“这个维度在时间上呈现什么结构？”**

例如：

```text
Marker
▲ 情绪开始变化
▲ 情绪彻底爆发
```

未来可以转化或辅助生成：

```text
Emotion Track
平静 → 紧张 → 爆发 → 平静
```

Marker 可以成为后续分析的原始观察证据。

---

## 22. 分析轨道不需要提前全部实现

不建议现在就把：

- Dialogue
- Emotion
- Music
- Character
- Camera
- Composition
- Color
- Rhythm
- Narrative

全部做完然后隐藏。

正确做法：

> **提前实现 Track System，不提前实现所有 Track。**

V1 只实现真正需要的轨道。

---

## 23. Track System 需要提前建立统一契约

推荐类似：

```ts
interface TimelineTrackDefinition {
  id: string;

  category:
    | "structure"
    | "annotation"
    | "visual"
    | "media"
    | "analysis";

  label: string;

  defaultVisible: boolean;

  minHeight: number;
  defaultHeight: number;

  layers: readonly (
    | "point"
    | "range"
    | "segment"
    | "curve"
    | "waveform"
    | "frames"
    | "boundary"
  )[]; // 非空，支持复合展示
}
```

典型映射：

```text
Marker
→ point

Scene / Sequence / Section
→ range

Dialogue
→ segment

Emotion
→ segment / curve

Audio
→ waveform

Shot + Frame
→ frames + range
```

---

## 24. Track 是 View，不是 Data Model

不要把数据设计成：

```ts
EmotionTrack {
  emotions: [...]
}
```

更合适：

```text
Analysis Data
      ↓
Timeline Presentation
```

例如：

```ts
interface EmotionSegment {
  startFrame: number;
  endFrame: number;
  emotion: string;
  intensity?: number;
}
```

同一份数据未来可用于：

- Timeline
- Inspector
- 统计图
- Scene 分析页
- AI 上下文
- 导出报告

原则：

> **Track 是展示层，不是业务数据本身。Registry 管理定义，类型化接入表连接领域 adapter、renderer 和交互 callback；Visual 可组合 frames/range layers，不引入万能 renderer 或提前建立插件系统。已实现能力在无数据项目中仍可显示真实空态，不能因空数据而隐藏其创建入口。**

---

## 25. 时间数据统一为几类基本形态

以下是概念示例，不是可直接复制的完整持久化 schema。正式记录还需要项目、身份、来源、版本和生命周期约束。Timeline/Marker/Structure 以整数帧和半开区间为权威；秒与 ResearchRange 微秒必须经显式转换。绝大多数未来轨道可以归为：

### Point

```ts
{
  frame: 562, // 示例整数帧，不是秒
  value: "故事真正启动"
}
```

适用：

- Marker
- Cue
- Event

### Range / Segment

```ts
{
  startFrame: 480,
  endFrame: 672, // [startFrame, endFrame)
  value: "紧张"
}
```

适用：

- Emotion
- Dialogue
- Music
- Character Presence

### Curve

```ts
[
  { frame: 0, value: 0.2 },
  { frame: 24, value: 0.4 },
  { frame: 48, value: 0.8 }
]
```

适用：

- Emotion Intensity
- Dialogue Density
- Audio Energy
- Rhythm

### Structural Range

```ts
{
  startShotId,
  endShotId,
  kind: "scene"
}
```

适用：

- Scene
- Sequence
- Section

---

## 26. Track Settings

只对已经实现的轨道提供显示控制。

推荐支持：

```ts
interface TrackPreference {
  trackId: string;
  visible: boolean;
  order: number;
  height: number;
}
```

UI 示例（分析项只在对应能力已经实现时出现；当前无数据时提供真实空态）：

```text
轨道设置

结构
☑ Section
☑ Sequence
☑ Scene

注释
☑ Marker

视觉
☑ Shot + Frame

媒体
☑ Audio

分析
☐ Dialogue
☐ Emotion
☐ Music
```

用户应可：

- 显示 / 隐藏
- 调整高度
- 调整顺序
- 折叠分组

---

## 27. 核心轨与扩展轨

### 核心轨

建议：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Audio
```

其中 Section / Sequence / Scene 可以按项目实际存在情况决定是否显示。

### 扩展分析轨

未来逐步实现：

```text
Dialogue
Emotion
Music
Character
Camera
Composition
Color
Rhythm
Narrative
...
```

---

## 28. 分析轨道首批验证建议

在完成结构轨重构后，优先实现：

```text
Dialogue
Emotion
```

原因：

Dialogue 代表：

> 离散时间段 + 文本

Emotion 代表：

> 时间段 / 趋势 / 曲线

如果这两类能够顺利接入，说明 Track Architecture 足够通用。

---

## 29. Semantic Zoom

时间轴应根据缩放层级改变信息密度，而不是所有信息永远同时展示。

导航尺度（当前聚焦 Section/Scene 等）与渲染细节等级分开管理，刻度 px/s 不能直接代表叙事层级。viewport 必须支持长片全片适配及帧级放大；现有 1～20 倍范围不能直接沿用为完成条件。所有轨道共享细节 resolver，但可依据局部像素宽度裁剪标签。

导航焦点是单一状态：播放变化只更新播放上下文，不自动改变导航路径；明确进入结构时改变焦点，Esc 回到最近有效上级。Marker 默认 scope 只读取该导航焦点，面包屑不混合互相冲突的选中/播放路径。

### 全片尺度

重点：

```text
Section
Sequence
Scene
```

Shot 降级为节奏纹理。

Marker 优先显示 Film / Section / Sequence 级别。

### Sequence 尺度

重点：

```text
Sequence
Scene
Shot
```

### Scene 尺度

重点：

```text
Scene
Shot + Frame
Marker
Dialogue
Emotion
```

### Shot 尺度

重点：

```text
Shot + Frame
Marker
Dialogue
Composition
Camera
Audio
```

原则：

> **结构层级控制观察尺度，轨道内容根据观察尺度调整信息密度。**

---

## 30. Shot + Frame 的 Semantic Zoom

远景：

```text
Shot 12       Shot 13       Shot 14
██████████│████████████│██████████
```

中景：

```text
Shot 12
┌──────────────────────────┐
│ ▌frame▌frame▌frame▌frame │
└──────────────────────────┘
```

近景：

```text
Shot 12
00:32.400                00:36.800
▌f1▌f2▌f3▌f4▌f5▌f6▌f7▌f8▌...
```

Shot 标签也可根据空间降级：

```text
Shot 23 · MCU · 4.2s
↓
23 · MCU
↓
23
↓
仅保留边界
```

---

## 31. 层级轨道的视觉权重

推荐从上到下：

```text
Section        20–24px
Sequence       22–26px
Scene          26–32px
Shot + Frame   64–80px
```

核心原则：

> **顺序宏观到微观，视觉权重微观更强。**

Section / Sequence 不应该抢走 Shot + Frame 的主视觉地位。

---

## 32. 折叠 Macro Structure

用户逐镜分析时不一定需要一直看到 Section / Sequence。

推荐：

```text
▸ Macro Structure
Scene
Shot + Frame
Marker
Audio
```

展开：

```text
▾ Macro Structure
  Section
  Sequence

Scene
Shot + Frame
Marker
Audio
```

这样四层都是一等能力，但 UI 不会过重。

---

## 33. 层级结构同时承担导航职责

推荐统一结构轨交互：

- 单击：选中范围
- 双击：Zoom to Range
- Enter：Drill Down
- Esc：Go Up
- 拖边界：调整结构范围
- 右键：Rename / Summary / Split / Merge / Promote / Demote

例如：

```text
双击 Sequence 03
→ 时间轴聚焦 Sequence 03

双击 Scene 09
→ 聚焦 Scene 09
```

顶部可显示：

```text
Section 2 › Sequence 5 › Scene 18 › Shot 73
```

用于保持全片上下文。

---

## 34. 不强迫每个项目拥有所有层级

推荐：

```text
Section   optional
Sequence  optional
Scene     optional
Shot      required
```

典型项目：

电影：

```text
Section
Sequence
Scene
Shot
```

短片：

```text
Scene
Shot
```

广告：

```text
Section
Shot
```

纪录片：

```text
Section
Sequence
Shot
```

时间轴应根据实际数据自动显示结构层。

---

## 35. 不要把时间轴做成迷你剪辑软件

AisenLens 的目标不是：

- Trim
- Ripple Edit
- Magnetic Edit
- Transition Editing
- Multitrack Video Editing

核心应该是：

- 时间定位
- 镜头结构
- 语义分层
- 结构导航
- 分析下钻
- 上下文保持
- 多尺度观察
- AI 分析辅助

一句话：

> **AisenLens Timeline 是为了理解影片，不是为了剪影片。**

---

## 36. 推荐的最终架构图

```text
                        FILM
                          │
            ┌─────────────┴─────────────┐
            │                           │
        STRUCTURE                  ANALYSIS DATA
            │                           │
        Section                      Dialogue
            │                        Emotion
        Sequence                       Music
            │                        Camera
          Scene                    Composition
            │                         Color
          Shot                        ...
            │
          Frame


                   ↓ Timeline Presentation ↓


Section       [────────────][────────────────────]

Sequence      [────][──────────][────][─────────]

Scene         [01][02][03][04][05][06][07][08]

Shot+Frame    ███│████│██│██████│████│██│█████

Marker        ──▲────────▲────────────▲─────────

Dialogue      ─────[text]───────[text]─────────

Emotion       平静────紧张────爆发────平静──────

Audio         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

---

## 37. 推荐分阶段实施

### Phase 1：时间轴核心结构重构

目标：

- 合并 Shot + Frame
- 保留 Audio
- 重构 Scene / Sequence / Section 结构轨
- Marker 改为单一自由文本模型
- 从 Ruler 拆出 Marker 独立轨
- 统一 Track Registry / Track Preferences

完成后基础结构：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Audio
```

---

### Phase 2：Boundary Interaction

实现：

- Scene Boundary
- Sequence Boundary
- Section Boundary
- 吸附
- 拖动
- Split
- Merge
- Promote
- Demote
- 框选 Shot 创建 Scene

---

### Phase 3：Semantic Zoom + Navigation

实现：

- 全片 / Sequence / Scene / Shot 多尺度展示
- 双击 Zoom to Range
- Enter Drill Down
- Esc Go Up
- Breadcrumb
- 不同缩放层级的信息降级

---

### Phase 4：AI Structural Suggestions（研究与准入）

与首批分析轨研究可独立推进；若建议依赖转录等信号，先满足对应数据源。研究通过并补齐实施规格后实现：

- AI Suggested Scene Boundary
- 接受 / 忽略
- 有明确定义和校准证据时展示 score；否则仅展示 evidence
- AI 辅助 Sequence / Section 建议
- 不直接覆盖用户结构

---

### Phase 5：首批扩展分析轨（研究与准入）

实现：

```text
Dialogue
Emotion
```

用于验证：

- segment
- text
- curve
- semantic zoom
- Track Registry

---

### Phase 6：后续分析轨（逐项准入）

按需求增加：

```text
Music
Character
Camera
Composition
Color
Rhythm
Narrative
...
```

---

## 38. 建议保留与修改的现有能力

### 建议保留

- Shot 自动检测
- Shot 校准
- Scene 校准能力
- Group 底层数据
- Timeline viewport
- Zoom / Pan
- Playhead
- Waveform
- Track Preferences
- Track 高度 / 顺序设置

### 建议修改

```text
video-frames + shots
→ Shot + Frame

groups
→ 内部 Structural Range 能力

Group UI
→ Scene / Sequence / Section

四类 Marker
→ 单一 Marker + content + optional scope

Ruler 中的 Marker 表示
→ 拆出独立 Marker Track，并升级为跨层级观察轨道
```

---

## 39. 关键设计原则汇总

1. **宏观到微观排列，微观拥有更强视觉权重。**
2. **Shot + Frame 是视觉主轴。**
3. **Section / Sequence / Scene / Shot 都是一等结构。**
4. **结构层级负责导航，分析轨道负责观察维度。**
5. **Marker 是跨层级的自由观察，不属于某个 Scene。**
6. **Scene / Sequence / Section 以 Boundary 为核心交互。**
7. **高层结构边界吸附到低层结构边界。**
8. **Promote / Demote 统一不同层级的结构编辑。**
9. **AI 提供结构建议，不替用户做最终解释。**
10. **UI 可以有层级，数据先保持扁平。**
11. **Track 是 View，不是 Data Model。**
12. **提前实现扩展机制，不提前实现所有未来轨道。**
13. **不同项目可以跳过不需要的结构层。**
14. **时间轴服务于影片理解，而不是剪辑。**

---

## 40. 最终产品定义

AisenLens 的时间轴可以最终定义为：

> **一个基于统一时间坐标，将影片结构、镜头事实、人工观察与多维分析叠加在一起，并支持从全片到单镜头逐级下钻的语义时间轴。**

其核心骨架为：

```text
Section
↓
Sequence
↓
Scene
↓
Shot + Frame
```

外围能力为：

```text
Marker
+
Analysis Tracks
+
Audio / Media Context
```

最终目标不是单纯“显示时间”，而是：

> **让用户在任何时刻都能知道自己在哪里、正在看什么尺度、这一段在更大结构中的作用，以及有哪些可继续分析的维度。**
