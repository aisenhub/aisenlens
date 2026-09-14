# AisenShot 算法优化日志

> 规则：追加式记录。一次测试不会直接修改 production；只有形成 candidate、完成验证并作出明确决定时才更新 production archive。

## 当前基线

- `2026-08-30`：通用/影视与短视频按用户批准冻结为 production version 1；详情见 [PRODUCTION_V1_ARCHIVE.md](PRODUCTION_V1_ARCHIVE.md)。
- `2026-08-30`：动画/游戏在 `donghua`、`donghua02`、`donghua03` 回归中出现明显漏切，保留为 research；访谈/Vlog同样保持封存，等待专项标注与对照验证。
- `2026-08-30`：普通生产面板完成可读性收敛；此项仅影响界面，不改变算法配置、候选计算或 production hash。

## 新条目模板

```md
## YYYY-MM-DD · <实验或回归名称>

- 状态：观察 / candidate / 已拒绝 / 已晋升
- 素材：fixture ID、媒体身份摘要、内容类别、授权状态
- 配置：preset/version、detail、transition、minimum scene duration、advanced overrides
- 标注：hard-cut/fade 数量、标注者、search 或 holdout
- 指标：TP / FP / FN、Precision / Recall / F1、边界偏移、性能观察
- 发现：漏切、误切、边界偏移、转场问题或非算法 UI/解码问题
- 决定：保持基线 / 创建 candidate / 拒绝 candidate / 晋升新版本
- 关联：配置 hash、标注文件、评分结果、PR 或 Git commit
```

## 决策纪律

1. 将“没有切到的真实边界”和“已有候选但偏移/误切”分开记录；不要用移动既有候选冒充漏切真值。
2. 先检查媒体身份、配置快照、候选连续性和 UI 状态，再归因算法。
3. 同类问题在多条素材中重复出现并有 search 标注后，才建立 candidate。
4. candidate 不覆盖 production v1；若未通过验证，记录拒绝原因并保留 v1。
