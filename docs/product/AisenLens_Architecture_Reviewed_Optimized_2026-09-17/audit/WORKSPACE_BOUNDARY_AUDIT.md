# WORKSPACE BOUNDARY AUDIT

| Workspace | Purpose | Inputs | Outputs | Owns | Can Mutate | Read Only | Forbidden |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Preparation | 形成可靠 Official Shot Structure | Media, detection candidates | Official Shot + structure revision | workflow + Shot confirmation orchestration | Shot/Boundary via Shot Authority | Analysis facts | formal AnalysisRecord/Results facts |
| Analysis | 基于正式结构产生和复核分析事实 | Official Shot, Template/Profile, Evidence | AnalysisRecord, Candidate review, semantic structures | analysis workflow | AnalysisRecord; Scene/Sequence/Section via structure commands | Official Shot boundary | direct Shot boundary mutation; Results publication authority |
| Results | 消费正式分析，筛选/聚合/导出/创作 | eligible AnalysisRecord + structure | derived dataset, export, creative artifact | consumption workflow | derived artifacts / export configs | Shot + Analysis facts | silent editing of formal Analysis fact or Shot |

## Correction flow

Analysis 发现 Shot 错误 → `FlagShotCorrection` → 带 Return Context 进入 Preparation → Shot Authority 执行结构命令 → 新 revision → stale/remap rules → 返回 Analysis review。Results 发现事实错误时导航/发起显式 Analysis correction，而不是在结果表内建立第二事实源。
