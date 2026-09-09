# 执行入口与交接说明

本文件保存稳定的执行规则；实际进度、测试、commit和阻塞更新到 [verification-record.md](verification-record.md)。本轮实施已完成，交付前以验证记录与 Git 状态为准。

## 可直接复制给执行agent

```text
请在 E:\Projects\Aisenlens 实施“总览与深拆升级”O0–O6。

先读适用AGENTS.md与以下文档：
docs/lensflow/AisenLens_总览与深拆优化架构.md
docs/plans/aisenlens-overview-analyze-upgrade/00-master-plan.md
docs/plans/aisenlens-overview-analyze-upgrade/verification-record.md
再按顺序读取01至06阶段计划，依依赖实施。

已确定方向：总览负责预览、结构与研究入口；深拆共用持续播放器，
支持全片顺序记录和带问题选段研究。研究范围、编辑对象、播放位置分离，
同一份笔记/字段/截图不因模式切换复制。保留现有双主题和本地优先。
不要重新讨论已确认架构，不要只交静态页面。

先核实Git工作区与正在进行的校准改造。不要提交或覆盖其他任务的改动。
校准/媒体时间服务存在不代表已验收；冻结实际集成基线，复用已有能力。
发现文档与代码不一致，记录证据并按当前代码接入，不继承旧“已实施”标签。

O1冻结结构/研究实体/保存契约，O2完成共享会话与播放器，
O3总览，O4深拆两种流程与人工声音研究，O5校准/导出/恢复，
O6真实浏览器、数据故障、双主题和性能验收及旧路径清理。
不新增AI、ASR、声音分离、人物情绪生成或通用知识图谱。

每阶段必要验证通过后，更新实施记录、检查diff、commit并push到本任务
GitHub分支，确认远程包含该阶段提交后再进入下一阶段。
已授权阶段commit/push，无需重复确认；缺远程/权限则说明具体阻塞。
不force push、不重写历史、不合并main、不创建Release、不部署。

GitHub/验证记录必须真实。提交代码后可另一次提交记录代码SHA，
不用让commit记录自己的SHA，也不要反复amend。

依项目要求每次修改组件后corepack pnpm build，运行阶段与最终必要测试。
新增测试放tests/features/overview-analyze/，使用现有测试体系。
软件自定义安装路径D:\APP\Codex\软件名，缓存E:\AppData\工具名，
不默认安装C盘。只要求Web，不加入原生平台构建门槛。

持续更新verification-record.md的阶段状态、测试结果、分支/提交、
偏差、失败与恢复、待办和下阶段交接。只有代码完成、验收通过、
全部必要提交已推送才标“已交付”。保存失败/推送失败不伪称完成。

最终交付总结实际用户流程、测试、媒体支持与数据恢复限制、GitHub链接。
遇到真正外部阻塞，保留成果并明确剩余工作，不降低原子性或内容保护要求。
```

## 分阶段接手

用户可改成“本次只执行O3”，但必须先核实O0–O2远程提交、verification-record及冻结契约。不得把只读计划当作上游已完成。

接手必查：当前分支/HEAD/未提交文件归属、上一阶段代码SHA、是否已push、实际服务签名、测试输出、尚未解决的阻塞。仅当共享基线可靠后继续。

## 多agent文件所有权

| 责任 | 所有权 |
| --- | --- |
| 集成负责人 | repository/types、editor session/EditorWorkspace/autosave/history、workflow导航、校准/reconcile、package scripts与总记录 |
| 总览实现者 | overview组件/派生统计、按约定共享的Structure组件 |
| 深拆实现者 | analysis组件/对象编辑器、SceneShotStrip、Sound展示 |

只有用户另行安排多agent时才按此分工，不自动创建任务。O3/O4并行前约定共享Structure/研究服务的owner；不同agent不同时改同一文件，接口改动先交接再消费。

## 每阶段交接模板

```text
阶段与状态：
基线与当前分支：
代码SHA/GitHub链接/推送结果：
实际修改文件：
冻结接口和内容归属：
验证命令、结果、日志/截图：
与计划偏差及原因：
未完成/未验证/阻塞：
下阶段已满足前置：
不能重复实施的工作：
未提交修改与owner：
需要用户决定的事项（无则写无）：
```
