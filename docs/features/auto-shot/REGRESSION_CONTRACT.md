# AisenShot 自动分镜回归契约

> 状态：长期有效。本文替代早期阶段基线报告中仍需持续遵守的评分、时间和素材可追溯规则；不保存已经废弃的旧 Canvas/seek 算法成绩。

## 1. 回归输入

每个可用于调参、回归或晋升的素材必须有稳定 fixture ID，并登记：来源与授权、媒体身份摘要、容器/codec、coded/display 尺寸、rotation、整数微秒时长、CFR 帧率或 VFR 的 PTS 说明、标注者和标注 schema 版本。

真实视频不提交到 Git。Git 中只保存可复现所需的标注 JSON、媒体指纹/manifest、配置版本与评分结果。

## 2. 真值与评分

- hard-cut 真值使用 `timestampUs`；项目帧仅是由时间投影出的展示/编辑值。
- 预测与真值按时间升序，以稳定的一对一匹配评分；每个预测和每个真值最多匹配一次。
- hard-cut 同时报告 `0`、`1`、`2` 项目帧容差下的 TP、FP、FN、Precision、Recall、F1、带符号平均偏移和绝对偏移 p95。
- fade 使用半开区间 `[startUs, endUs)`；不得为了提高 hard-cut 指标而把 fade 临时标为 hard-cut。
- 未匹配时偏移统计为 `null`，不得写成 `0`。

## 3. 时间映射

项目帧边界只用整数微秒与量化帧率计算：

```text
fpsQ = round(fpsNumerator × 1_000_000 / fpsDenominator)
boundaryFrame = ceil(timestampUs × fpsQ / 1_000_000_000_000)
durationFrames = max(1, ceil(durationUs × fpsQ / 1_000_000_000_000))
```

内部 hard-cut 必须 clamp 到 `1..durationFrames-1`。VFR、重复 PTS 和 presentation ordinal 的语义由媒体身份与任务 checkpoint 保存，不得用数组下标替代时间真值。

## 4. 数据集与版本纪律

- search 用于提出和调节 candidate；holdout 只用于冻结后的验收，二者不得混用。
- 单条视频只能形成问题线索，不能直接覆盖 production 参数。
- production 版本的 preset ID、版本号、canonical config、config hash、媒体范围和结论必须可追溯。
- `annotator = aisen` 的结构完整标注经合理性分析后可用于 search；production 晋升仍需记录独立数据和已批准的例外条件。

## 5. 每次回归必须记录

记录媒体类别、预设/版本、检出程度、转场、最短镜头、高级覆盖、浏览器与运行环境、输出边界数、标注指标、明显误切/漏切类型、性能观察和最终决定。具体条目写入 [OPTIMIZATION_LOG.md](OPTIMIZATION_LOG.md)。
