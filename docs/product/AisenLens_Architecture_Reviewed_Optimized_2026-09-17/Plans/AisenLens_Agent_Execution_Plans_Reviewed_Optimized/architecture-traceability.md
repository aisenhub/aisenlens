> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# Architecture Requirement Traceability

本文件用于保证“架构中的每条建议不被阶段计划遗漏”。规则：**一个正式文档章节被映射到阶段后，该章节下的所有规范性 bullet、表格行、状态、验收要求都属于该阶段的检查范围**；阶段结束前执行 agent 必须打开原文逐项核对，而不是只看本摘要。Archive 原始材料只追溯，不重新成为 Authority。

## 复审后执行规则（2026-09-17）

本表不再只是“阅读索引”，而是阶段完成的硬门：阶段计划已经补入主要缺口，但本表映射章节下的规范性正文仍全部属于 scope。执行 agent 需要把每个映射章节最终归类为 implemented / explicit non-goal / approved deferred / not-applicable，并在 `verification-record.md` 给 evidence。若阶段摘要没有逐字重复某条细节，不代表该细节被删除。

## 文档级映射

| 正式来源 | 执行阶段 |
|---|---|
| `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` | 03 |
| `00-global/WORKSPACE_DESIGN_SYSTEM.md` | 03 |
| `01-preparation/PREPARATION_WORKSPACE.md` | 04 |
| `01-preparation/drafts/KEYFRAME_DESIGN_DRAFT.md` | 04 (仅已批准/现有需求；其余 deferred) |
| `02-analysis/ANALYSIS_WORKSPACE.md` | 06 |
| `02-analysis/inspector/ANALYSIS_INSPECTOR.md` | 06 |
| `03-results/RESULTS_WORKSPACE.md` | 08 |
| `04-domain/analysis-data/ANALYSIS_DATA_MODEL.md` | 05 |
| `04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md` | 05/06 |
| `04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md` | 04 |
| `04-domain/template/TEMPLATE_CONTRACT.md` | 05/06/08/09 |
| `04-domain/timeline/TIMELINE_ARCHITECTURE.md` | 07 |
| `05-runtime/OPERATIONAL_ARCHITECTURE.md` | 02/09/10 |
| `90-implementation/IMPLEMENTATION_MAP.md` | 01/11 |
| `implementation/IMPLEMENTATION_BOUNDARY.md` | 01/02/11 |
| `implementation/MIGRATION_PLAN.md` | 02/04/05/07/08/09/10/11 |
| `implementation/AI_DEVELOPMENT_GUIDE.md` | 01/11 |
| `audit/AUTHORITY_MAP.md` | 02/11 |
| `audit/COMMAND_EVENT_MAP.md` | 02/04/07 |
| `audit/DEPENDENCY_GRAPH.md` | 02/11 |
| `audit/STATE_OWNERSHIP.md` | 02/03/06/07 |
| `audit/FINAL_SOURCE_OF_TRUTH_MATRIX.md` | 01/11 |
| `audit/ARCHITECTURE_REVIEW_2026-09-17.md` | 01/02/10/11 |
| `audit/MASTER_PLAN_COVERAGE_MATRIX.md` | 01–11 |
| `audit/CURRENT_REPOSITORY_BASELINE.md` | 01 |
| `audit/DECISION_LOG.md` | 02/11 |
| `audit/CONCEPT_REGISTRY.md` | 01/11 |
| `audit/FINAL_CONCEPT_REGISTRY.md` | 01/11 |
| `audit/SOURCE_OF_TRUTH_MATRIX.md` | 01/11 |
| `audit/CONFLICT_AUDIT.md` | 01/11 |
| `audit/CONFLICT_MATRIX.md` | 01/11 |
| `audit/WORKSPACE_BOUNDARY_AUDIT.md` | 03/04/06/08/11 |
| `audit/DUPLICATE_AUDIT.md` | 11 |
| `audit/DOCUMENT_QUALITY_CHECK.md` | 11 |
| `audit/FINAL_ARCHITECTURE_AUDIT.md` | 01–11 |
| `ARCHITECTURE_INDEX.md` | 01/11 |
| `README.md` | 01/11 |
| `CHANGELOG.md` | 11 |
| `Plans/AisenLens_MASTER_DEVELOPMENT_PLAN_2026-09-17.md` | 01–11 |

## 章节级不得遗漏清单

### `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` → Phase 03

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 27 | AisenLens 全局产品架构与工作台 IA | 未开始 |
| 31 | ↳ 1. 设计目标 | 未开始 |
| 53 | 2. 全局产品信息架构 | 未开始 |
| 78 | 3. 为什么取消原来的「总览」 | 未开始 |
| 130 | 4. 全局 Workspace Shell | 未开始 |
| 132 | ↳ 4.1 整体结构 | 未开始 |
| 163 | ↳ 4.2 三个稳定区域 | 未开始 |
| 165 | ↳ ↳ 左侧 | 未开始 |
| 181 | ↳ ↳ 顶部 | 未开始 |
| 198 | ↳ ↳ 主工作区 | 未开始 |
| 208 | 5. 左侧导航的设计原则 | 未开始 |
| 242 | 6. 三个一级工作区 | 未开始 |
| 246 | 6.1 素材准备 | 未开始 |
| 274 | 6.2 逐镜分析 | 未开始 |
| 301 | 6.3 成果应用 | 未开始 |
| 325 | 7. 下沉后的详细设计边界 | 未开始 |
| 338 | 32. 全局数据流 | 未开始 |
| 385 | 33. 全局 UI 层级原则 | 未开始 |
| 389 | ↳ ↳ Workspace | 未开始 |
| 405 | ↳ ↳ Drawer / Sheet | 未开始 |
| 420 | ↳ ↳ Inspector | 未开始 |
| 434 | ↳ ↳ Modal | 未开始 |
| 450 | ↳ ↳ Dropdown / Popover | 未开始 |
| 465 | 34. 交互语言原则 | 未开始 |
| 467 | ↳ 34.1 Workspace 是“工作的地方” | 未开始 |
| 473 | ↳ 34.2 Settings 是“改变工作方式的地方” | 未开始 |
| 479 | ↳ 34.3 正常状态安静，异常状态突出 | 未开始 |
| 497 | ↳ 34.4 用户语言优先于工程语言 | 未开始 |
| 522 | 35. 视觉信息密度原则 | 未开始 |
| 538 | 36. 页面关系总结 | 未开始 |
| 568 | 37. 推荐的产品定位表达 | 未开始 |

### `00-global/WORKSPACE_DESIGN_SYSTEM.md` → Phase 03

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 26 | AisenLens Workspace Design System | 未开始 |
| 34 | ↳ 1. Design Philosophy | 未开始 |
| 51 | ↳ ↳ 1.1 核心原则 | 未开始 |
| 53 | ↳ ↳ ↳ Content First | 未开始 |
| 75 | ↳ ↳ ↳ Surface over Border | 未开始 |
| 95 | ↳ ↳ ↳ Progressive Disclosure | 未开始 |
| 114 | ↳ ↳ ↳ Selection Driven Workspace | 未开始 |
| 138 | ↳ ↳ ↳ Contextual Tools | 未开始 |
| 166 | 2. Workspace Architecture | 未开始 |
| 203 | 3. Recommended Layout | 未开始 |
| 234 | 4. Surface System | 未开始 |
| 267 | 5. Dark Theme | 未开始 |
| 329 | 6. Light Theme | 未开始 |
| 399 | 7. Viewer Rule | 未开始 |
| 425 | 8. Accent Color | 未开始 |
| 458 | 9. Semantic Colors | 未开始 |
| 482 | 10. Typography | 未开始 |
| 547 | 11. Spacing System | 未开始 |
| 595 | 12. Radius System | 未开始 |
| 631 | 13. Border Rules | 未开始 |
| 665 | 14. Shadow Rules | 未开始 |
| 699 | 15. Button System | 未开始 |
| 752 | 16. Icon Button | 未开始 |
| 795 | 17. Input System | 未开始 |
| 828 | 18. Focus Ring | 未开始 |
| 852 | 19. Shot Card | 未开始 |
| 886 | 20. Shot Card States | 未开始 |
| 944 | 21. Shot Card Hover Preview | 未开始 |
| 973 | 22. Shot Strip | 未开始 |
| 1013 | 23. Navigation Panel | 未开始 |
| 1058 | 24. Inspector | 未开始 |
| 1098 | 25. Inspector Section | 未开始 |
| 1132 | 26. Inspector Density | 未开始 |
| 1157 | 27. Toolbar | 未开始 |
| 1173 | ↳ Context Toolbar | 未开始 |
| 1205 | 28. Toolbar Density | 未开始 |
| 1229 | 29. Popover | 未开始 |
| 1264 | 30. Context Menu | 未开始 |
| 1297 | 31. Command Palette | 未开始 |
| 1322 | 32. Interaction State Model | 未开始 |
| 1341 | 33. Hover Rule | 未开始 |
| 1362 | 34. Selected Rule | 未开始 |
| 1383 | 35. Motion | 未开始 |
| 1431 | 36. Easing | 未开始 |
| 1448 | 37. Media First Rule | 未开始 |
| 1475 | 38. Density Modes | 未开始 |
| 1479 | ↳ ↳ Visual Mode | 未开始 |
| 1490 | ↳ ↳ Analysis Mode | 未开始 |
| 1498 | ↳ ↳ Data Mode | 未开始 |
| 1508 | 39. Workspace Modes | 未开始 |
| 1554 | 40. View Preference | 未开始 |
| 1580 | 41. Empty States | 未开始 |
| 1607 | 42. Loading | 未开始 |
| 1638 | 43. AI UI Rule | 未开始 |
| 1674 | 44. AI Analysis Component | 未开始 |
| 1708 | 45. Editing Philosophy | 未开始 |
| 1731 | 46. Accessibility | 未开始 |
| 1765 | 47. Keyboard First | 未开始 |
| 1801 | 48. Tooltip | 未开始 |
| 1819 | 49. Design Anti-Patterns | 未开始 |
| 1823 | ↳ ↳ Dashboardization | 未开始 |
| 1834 | ↳ ↳ Card Everything | 未开始 |
| 1848 | ↳ ↳ Rainbow UI | 未开始 |
| 1864 | ↳ ↳ Huge Radius | 未开始 |
| 1876 | ↳ ↳ Heavy Shadow | 未开始 |
| 1882 | ↳ ↳ Permanent Controls | 未开始 |
| 1888 | ↳ ↳ Deep Page Navigation | 未开始 |
| 1894 | 50. Final Visual Rule | 未开始 |
| 1912 | 51. Final Design Formula | 未开始 |
| 1954 | 52. One Sentence Design Principle | 未开始 |

### `01-preparation/PREPARATION_WORKSPACE.md` → Phase 04

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 28 | AisenLens 素材准备工作台 UX / UI 设计方案 | 未开始 |
| 38 | ↳ 1. 背景与目标 | 未开始 |
| 62 | ↳ 2. 现状问题总结 | 未开始 |
| 64 | ↳ ↳ 2.1 前处理需要重新对齐新的全局三阶段架构 | 未开始 |
| 84 | ↳ ↳ 2.2 准备页模块并列，而不是任务连续 | 未开始 |
| 96 | ↳ ↳ 2.3 主操作竞争 | 未开始 |
| 104 | ↳ ↳ 2.4 参数暴露过多 | 未开始 |
| 120 | ↳ ↳ 2.5 扫描过程使用 Modal，导致上下文切换 | 未开始 |
| 128 | ↳ ↳ 2.6 候选结果存在重复确认 | 未开始 |
| 150 | 3. 新的信息架构 | 未开始 |
| 152 | ↳ 3.1 素材准备在全局架构中的位置 | 未开始 |
| 184 | ↳ 3.2 素材准备内部结构 | 未开始 |
| 207 | ↳ 3.3 与逐镜分析的职责边界 | 未开始 |
| 233 | 4. 前处理状态机 | 未开始 |
| 271 | 5. 页面整体布局 | 未开始 |
| 310 | 6. Step 1：导入素材 | 未开始 |
| 312 | ↳ 6.1 空状态 | 未开始 |
| 352 | ↳ 6.2 素材导入后 | 未开始 |
| 391 | 7. Step 2：智能切分 | 未开始 |
| 393 | ↳ 7.1 待识别状态 | 未开始 |
| 436 | 8. 切分设置 Drawer | 未开始 |
| 481 | ↳ 8.1 参数命名原则 | 未开始 |
| 505 | ↳ 8.2 “高级参数”改为“专家设置” | 未开始 |
| 536 | 9. 分析模板与 AI 辅助必须彻底离开前处理 | 未开始 |
| 590 | 10. 识别进行中 | 未开始 |
| 596 | ↳ ↳ 有真实进度时 | 未开始 |
| 613 | ↳ ↳ 无法精确计算进度时 | 未开始 |
| 627 | ↳ 10.1 运行期间设置锁定 | 未开始 |
| 649 | 11. 识别完成 | 未开始 |
| 682 | 12. 未来目标：只让用户检查不确定切点 | 未开始 |
| 713 | 13. Step 3：复核镜头 | 未开始 |
| 715 | ↳ 13.1 重新定义 Calibration Workspace | 未开始 |
| 752 | 14. 复核工作台桌面布局 | 未开始 |
| 793 | 15. 顶部 Header | 未开始 |
| 819 | 16. 左侧复核队列 | 未开始 |
| 821 | ↳ 16.1 默认不是“全部镜头” | 未开始 |
| 859 | ↳ 16.2 导航实体从 Segment 转为 Boundary | 未开始 |
| 889 | 17. 中央主视觉：Boundary Frame Pair | 未开始 |
| 924 | 18. 视频与双帧证据同时可见 | 未开始 |
| 948 | 19. 切点预览模式 | 未开始 |
| 982 | 20. 右侧 Inspector | 未开始 |
| 1022 | 21. “切点正确”成为显式操作 | 未开始 |
| 1049 | 22. 快捷键建议 | 未开始 |
| 1074 | 23. 边界微调控件 | 未开始 |
| 1106 | 24. “移动到当前帧”改成上下文操作 | 未开始 |
| 1124 | 25. 删除切点 | 未开始 |
| 1145 | 26. 补切 | 未开始 |
| 1164 | 27. Timeline 设计 | 未开始 |
| 1202 | 28. 全片 Timeline | 未开始 |
| 1218 | 29. “待回看 / Issues”改为“稍后处理” | 未开始 |
| 1261 | 30. 检测详情 | 未开始 |
| 1311 | 31. Confidence 展示原则 | 未开始 |
| 1335 | 32. 自动 Next | 未开始 |
| 1357 | 33. 修改后仍需再次确认 | 未开始 |
| 1383 | 34. Undo / Redo | 未开始 |
| 1397 | 35. 保存状态 | 未开始 |
| 1419 | 36. 完成复核 | 未开始 |
| 1421 | ↳ 36.1 仍有待确认项 | 未开始 |
| 1437 | ↳ 36.2 全部处理完成 | 未开始 |
| 1458 | 37. 素材准备完成态 | 未开始 |
| 1496 | 38. 项目再次打开时的行为 | 未开始 |
| 1514 | 39. Modal / Drawer / Inspector 使用规范 | 未开始 |
| 1540 | 40. 信息密度判断原则 | 未开始 |
| 1572 | 41. 页面视觉层级 | 未开始 |
| 1611 | 42. 视觉风格建议 | 未开始 |
| 1613 | ↳ 42.1 减少 Border Card | 未开始 |
| 1635 | ↳ 42.2 正常状态弱化，异常状态强化 | 未开始 |
| 1661 | 43. 移动端设计 | 未开始 |
| 1699 | 44. 推荐组件架构 | 未开始 |
| 1739 | 45. 现有组件迁移建议 | 未开始 |
| 1762 | 46. 重构优先级 | 未开始 |
| 1764 | ↳ V1：必须完成 | 未开始 |
| 1777 | ↳ V1.5：高价值增强 | 未开始 |
| 1786 | ↳ V2：智能复核 | 未开始 |
| 1796 | 47. 与全局工作台方案的最终对齐 | 未开始 |
| 1839 | 48. 最终理想体验 | 未开始 |
| 1889 | 49. 一句话设计原则总结 | 未开始 |

### `01-preparation/drafts/KEYFRAME_DESIGN_DRAFT.md` → Phase 04 (仅已批准/现有需求；其余 deferred)

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 17 | 关键帧方案（待设计） | 未开始 |
| 21 | ↳ 当前状态 | 未开始 |

### `02-analysis/ANALYSIS_WORKSPACE.md` → Phase 06

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 32 | AisenLens 逐镜分析工作台 UI / UX / 交互架构方案 | 未开始 |
| 36 | 1. 产品定位 | 未开始 |
| 79 | 2. 与全局工作台的关系 | 未开始 |
| 108 | 3. 冻结职责边界：逐镜分析不能修改 Shot | 未开始 |
| 114 | ↳ ↳ 可以 | 未开始 |
| 128 | ↳ ↳ 不可以 | 未开始 |
| 148 | 4. Shot Authority 与 Analysis Authority | 未开始 |
| 183 | 5. 与时间轴方案的核心一致性 | 未开始 |
| 206 | 6. 整体 UI 架构 | 未开始 |
| 243 | 7. 推荐桌面尺寸 | 未开始 |
| 247 | ↳ 7.1 全局 Shell | 未开始 |
| 256 | ↳ 7.2 Analysis Workspace | 未开始 |
| 296 | 8. 工作台四类核心状态 | 未开始 |
| 309 | 9. PlaybackPosition | 未开始 |
| 326 | 10. SelectedEntity | 未开始 |
| 358 | 11. ResearchScope | 未开始 |
| 389 | 12. Viewport | 未开始 |
| 409 | 13. 四种状态的交互矩阵 | 未开始 |
| 424 | 14. Analysis Workspace Toolbar | 未开始 |
| 452 | 15. Research Breadcrumb | 未开始 |
| 486 | 16. Research Navigation | 未开始 |
| 490 | ↳ ↳ 单击对象 | 未开始 |
| 494 | ↳ ↳ 双击对象 | 未开始 |
| 498 | ↳ ↳ Enter | 未开始 |
| 502 | ↳ ↳ Esc | 未开始 |
| 510 | ↳ ↳ Breadcrumb | 未开始 |
| 516 | 17. 左侧 Structure Navigator | 未开始 |
| 538 | 18. Structure Navigator 示例 | 未开始 |
| 586 | 19. Structure Row 信息 | 未开始 |
| 588 | ↳ Scene | 未开始 |
| 596 | ↳ Shot | 未开始 |
| 603 | ↳ Sequence | 未开始 |
| 610 | ↳ Section | 未开始 |
| 619 | 20. Selection 与 Playing 必须分开 | 未开始 |
| 640 | 21. Needs Review Structure | 未开始 |
| 658 | 22. 中央 Player Stage | 未开始 |
| 692 | 23. Selection Context Bar | 未开始 |
| 719 | 24. Video Overlay 原则 | 未开始 |
| 753 | 25. Playback Controls | 未开始 |
| 785 | 34. Marker Inspector | 未开始 |
| 822 | 35. Marker 创建 | 未开始 |
| 852 | 36. Marker 与 Object Analysis 的区别 | 未开始 |
| 870 | 37. Analysis Template 定位 | 未开始 |
| 889 | 38. Template 与三个分析尺度 | 未开始 |
| 934 | 39. Template Selector | 未开始 |
| 963 | 40. Analysis Settings Drawer | 未开始 |
| 1008 | 41. Template 不直接生成 Timeline Track | 未开始 |
| 1046 | 42. Template 与 Track Preference 的关系 | 未开始 |
| 1068 | 43. Analysis Field 状态模型 | 未开始 |
| 1082 | 50. AI 产品定位 | 未开始 |
| 1110 | 51. AI Status 入口 | 未开始 |
| 1133 | 52. AI Settings | 未开始 |
| 1177 | 53. 不推荐 AI 自动正式填充 | 未开始 |
| 1195 | 57. AI 轻量问答入口 | 未开始 |
| 1242 | 58. Context Builder 范围 | 未开始 |
| 1246 | ↳ ↳ Shot Task | 未开始 |
| 1257 | ↳ ↳ Scene Task | 未开始 |
| 1267 | ↳ ↳ Story Task | 未开始 |
| 1293 | 77. ResearchScope 与 Timeline 的连接 | 未开始 |
| 1332 | 78. 分析过程中发现 Shot 错误 | 未开始 |
| 1358 | 79. Shot 问题入口 | 未开始 |
| 1362 | ↳ ↳ Inspector More Menu | 未开始 |
| 1376 | ↳ ↳ Timeline Boundary Hover | 未开始 |
| 1387 | ↳ ↳ Timeline Context Menu | 未开始 |
| 1402 | 80. 调整分镜确认 | 未开始 |
| 1422 | 81. Contextual Navigation 到素材准备 | 未开始 |
| 1446 | 82. Return Context | 未开始 |
| 1470 | 83. Shot 修改后的同步原则 | 未开始 |
| 1491 | 84. Shot Split | 未开始 |
| 1524 | 85. Shot Split Inspector 状态 | 未开始 |
| 1557 | 86. Shot Merge | 未开始 |
| 1585 | 87. Structural Remap 与 Semantic Revalidation | 未开始 |
| 1589 | ↳ 可以自动重算 / 重映射 | 未开始 |
| 1601 | ↳ 不能自动确认 | 未开始 |
| 1621 | 88. Scene / Sequence / Section 同步 | 未开始 |
| 1660 | 89. Editing Pace 自动更新 | 未开始 |
| 1679 | 90. 返回 Analysis Workspace 的同步提示 | 未开始 |
| 1698 | 91. 数据变化影响队列 | 未开始 |
| 1727 | 92. 数据复核与 AI Candidate 必须分开 | 未开始 |
| 1754 | 93. 自动恢复 Selection | 未开始 |
| 1786 | 94. Workbench Error State：尚未有正式 Shot | 未开始 |
| 1818 | 95. Workbench Error State：媒体丢失 | 未开始 |
| 1847 | 96. 保存状态 | 未开始 |
| 1873 | 97. Undo / Redo | 未开始 |
| 1892 | 98. Responsive Strategy | 未开始 |
| 1896 | ↳ ↳ ≥ 1440px | 未开始 |
| 1904 | ↳ ↳ 1180–1439px | 未开始 |
| 1914 | ↳ ↳ < 1180px | 未开始 |
| 1923 | 99. Panel Collapse | 未开始 |
| 1942 | ↳ ↳ 专注播放 | 未开始 |
| 1950 | ↳ ↳ 专注分析 | 未开始 |
| 1956 | ↳ ↳ 专注结构 | 未开始 |
| 1966 | 100. 前端组件结构 | 未开始 |
| 2018 | 101. Workspace Navigation State | 未开始 |
| 2036 | 102. Analysis State | 未开始 |
| 2050 | 103. Timeline State | 未开始 |
| 2065 | 104. Shot Sync State | 未开始 |
| 2080 | 105. 数据链路 | 未开始 |
| 2108 | 110. AI 实施顺序 | 未开始 |
| 2133 | 111. V1 工作台建议范围 | 未开始 |
| 2153 | 112. V1.5 | 未开始 |
| 2168 | 113. V2 / AI | 未开始 |
| 2184 | 114. 工作台交互层级统一规则 | 未开始 |
| 2210 | 115. 最终主 Wireframe | 未开始 |
| 2260 | 116. 冻结设计原则 | 未开始 |
| 2287 | 117. 一句话总结 | 未开始 |

### `02-analysis/inspector/ANALYSIS_INSPECTOR.md` → Phase 06

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 27 | AisenLens Analysis Inspector UI / UX 架构方案 | 未开始 |
| 31 | 1. 产品定位 | 未开始 |
| 67 | 2. Inspector 在整体数据链中的位置 | 未开始 |
| 98 | 3. Inspector 的核心职责 | 未开始 |
| 127 | 4. 一个 Shell，多种 Entity Renderer | 未开始 |
| 179 | 5. Inspector 默认尺寸 | 未开始 |
| 216 | 6. Inspector 总体布局 | 未开始 |
| 268 | 7. 核心视觉原则 | 未开始 |
| 298 | 8. Inspector Header | 未开始 |
| 310 | 9. Shot Header | 未开始 |
| 323 | 10. Scene Header | 未开始 |
| 334 | 11. Story Header | 未开始 |
| 359 | 12. Marker Header | 未开始 |
| 368 | 13. Header 状态不能做成“评分” | 未开始 |
| 399 | 14. Shot Header More Menu | 未开始 |
| 430 | 15. Inspector Body 不使用一级 Tabs | 未开始 |
| 462 | 16. Analysis Field 是 Inspector 的核心组件 | 未开始 |
| 495 | 17. Field 默认视觉 | 未开始 |
| 531 | 18. 不在 Field 主界面长期暴露技术元数据 | 未开始 |
| 554 | 23. Template 的正确定位 | 未开始 |
| 575 | 24. Template 切换不会删除数据 | 未开始 |
| 605 | 31. 算法 / Derived 数据视觉 | 未开始 |
| 633 | 32. AI 数据视觉 | 未开始 |
| 650 | 33. 用户人工输入默认成为正式工作值 | 未开始 |
| 685 | 34. 人工值保存状态 | 未开始 |
| 710 | 35. AI 与正式值冲突 | 未开始 |
| 750 | 36. 采用 AI 值 | 未开始 |
| 772 | 38. Provenance 默认不抢占界面 | 未开始 |
| 804 | 43. Evidence Chip | 未开始 |
| 819 | 44. Evidence Hover | 未开始 |
| 836 | 45. Evidence 点击行为 | 未开始 |
| 876 | 46. Evidence Picker | 未开始 |
| 909 | 50. AI Suggestion 必须区分观察与解释 | 未开始 |
| 942 | 51. AI 不展示长推理链 | 未开始 |
| 956 | 52. 多字段 AI 分析 | 未开始 |
| 978 | 53. AI Review Mode | 未开始 |
| 1009 | 54. AI Review：已有正式值 | 未开始 |
| 1029 | 55. 不默认提供“全部采用” | 未开始 |
| 1047 | 56. Shot Inspector Field Groups | 未开始 |
| 1088 | 57. Group 展开规则 | 未开始 |
| 1105 | 58. Shot Relationship Analysis | 未开始 |
| 1141 | 59. Scene Inspector 不只是 Shot 字段放大版 | 未开始 |
| 1194 | 60. Scene Statistics 与 Interpretation 分区 | 未开始 |
| 1220 | 61. Scene Evidence | 未开始 |
| 1243 | 62. Story Inspector | 未开始 |
| 1257 | 63. Sequence Inspector | 未开始 |
| 1300 | 64. Section Inspector | 未开始 |
| 1327 | 65. Film Inspector | 未开始 |
| 1360 | 66. Inspector 与 Timeline 的双向交互 | 未开始 |
| 1366 | 67. Field → Timeline | 未开始 |
| 1392 | 68. Timeline → Inspector | 未开始 |
| 1417 | 69. Inspector 修改 → Timeline 更新 | 未开始 |
| 1444 | 79. Inspector 的 Data Review 提示 | 未开始 |
| 1458 | 80. Data Review Mode | 未开始 |
| 1482 | 81. stale Review 与 AI Candidate 可以同时存在 | 未开始 |
| 1504 | 82. Data Review 与 AI Review 必须分开 | 未开始 |
| 1523 | 83. “分析完成”概念 | 未开始 |
| 1548 | 84. “分析完成”不应成为流程锁 | 未开始 |
| 1561 | 85. 键盘交互 | 未开始 |
| 1584 | 86. 长文本自动保存 | 未开始 |
| 1614 | 87. Field Renderer Registry | 未开始 |
| 1641 | 88. 推荐 Field 组件目录 | 未开始 |
| 1662 | 89. 不建设任意动态插件系统 | 未开始 |
| 1672 | 90. Inspector 组件结构 | 未开始 |
| 1709 | 91. Entity Renderer 结构 | 未开始 |
| 1727 | 92. Entity Renderer 的差异 | 未开始 |
| 1745 | 93. AI Ask Bar | 未开始 |
| 1761 | 94. AI Ask 输出 | 未开始 |
| 1787 | 95. AI Ask 不是正式分析 | 未开始 |
| 1807 | 96. Context Builder 与 Inspector | 未开始 |
| 1822 | 97. Shot Context | 未开始 |
| 1839 | 98. Scene Context | 未开始 |
| 1856 | 99. Story Context | 未开始 |
| 1871 | 104. V1 推荐范围 | 未开始 |
| 1891 | 105. V1.5 | 未开始 |
| 1907 | 106. V2 / AI | 未开始 |
| 1924 | 107. 冻结设计原则 | 未开始 |
| 1951 | 108. 一句话总结 | 未开始 |

### `03-results/RESULTS_WORKSPACE.md` → Phase 08

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 25 | AisenLens 成果应用 Workspace 架构 | 未开始 |
| 29 | 19. 成果应用 Workspace | 未开始 |
| 43 | 20. 数据表 | 未开始 |
| 45 | ↳ 20.1 定位 | 未开始 |
| 55 | ↳ 20.2 表格结构 | 未开始 |
| 81 | 21. 数据表的核心能力 | 未开始 |
| 121 | 22. 数据表默认“查看优先” | 未开始 |
| 145 | 23. 导出与分享 | 未开始 |
| 174 | 24. 三种核心导出类型 | 未开始 |
| 176 | ↳ 24.1 分析表格 | 未开始 |
| 188 | ↳ 24.2 视频 + 分析表联动视频 | 未开始 |
| 220 | 25. 分析水印视频 | 未开始 |
| 268 | 26. 统一 Export Preset | 未开始 |
| 299 | 27. 创作转化 | 未开始 |
| 301 | ↳ 27.1 定位 | 未开始 |
| 325 | 28. 创作转化入口 | 未开始 |
| 368 | 29. AI 在创作转化中的角色 | 未开始 |
| 417 | 30. 创作成果的最终形态 | 未开始 |
| 476 | 31. AI 视频生成未来的位置 | 未开始 |
| 517 | 32. 成果应用的数据消费契约（冻结） | 未开始 |

### `04-domain/analysis-data/ANALYSIS_DATA_MODEL.md` → Phase 05

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 29 | AisenLens Analysis Data Model | 未开始 |
| 35 | 19. Template 与数据库 Schema 必须分离 | 未开始 |
| 49 | 20. Field Definition | 未开始 |
| 97 | 21. Field ID 必须稳定 | 未开始 |
| 123 | 22. Template Field Configuration | 未开始 |
| 153 | 23. Template 的正确定位 | 未开始 |
| 174 | 24. Template 切换不会删除数据 | 未开始 |
| 204 | 25. Analysis Record | 未开始 |
| 240 | 26. AI Candidate 不属于 Analysis Record | 未开始 |
| 250 | 27. Analysis Candidate | 未开始 |
| 288 | 28. AI Candidate 状态机 | 未开始 |
| 322 | 29. 分析数据来源必须区分 | 未开始 |
| 338 | 30. 不用一个 Confidence 混合所有来源 | 未开始 |
| 358 | 70. Inspector 与成果应用的数据契约 | 未开始 |
| 378 | 71. 数据表动态列 | 未开始 |
| 400 | 72. Template 对成果应用的作用 | 未开始 |
| 422 | 73. Output Capability | 未开始 |
| 446 | 74. 成果应用默认只消费 Confirmed Data | 未开始 |
| 464 | 75. stale 在成果数据表中的表现 | 未开始 |
| 492 | 76. AI Candidate 不作为成果正式列 | 未开始 |
| 514 | 77. 创作转化的数据来源 | 未开始 |
| 538 | 78. Shot 修改后的 stale | 未开始 |
| 564 | 79. Inspector 的 Data Review 提示 | 未开始 |
| 578 | 80. Data Review Mode | 未开始 |
| 602 | 81. stale Review 与 AI Candidate 可以同时存在 | 未开始 |
| 624 | 82. Data Review 与 AI Review 必须分开 | 未开始 |
| 643 | 100. Inspector 与 Timeline 不建立重复数据 | 未开始 |
| 673 | 101. 数据变化传播 | 未开始 |
| 700 | 102. 数据失效传播 | 未开始 |
| 729 | 103. Inspector 的最终数据流 | 未开始 |
| 762 | 104. 冻结数据原则 | 未开始 |

### `04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md` → Phase 05/06

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 24 | AisenLens Evidence / Provenance 契约 | 未开始 |
| 28 | 37. Provenance | 未开始 |
| 76 | 39. Evidence 是一等数据 | 未开始 |
| 94 | 40. Evidence 类型 | 未开始 |
| 118 | 41. EvidenceRef | 未开始 |
| 147 | 42. Evidence 核心原则 | 未开始 |
| 159 | 47. Evidence Policy | 未开始 |
| 172 | 48. Evidence Policy 示例 | 未开始 |
| 195 | 49. Evidence Required 不应阻止早期记录 | 未开始 |
| 220 | 50. 冻结原则 | 未开始 |

### `04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md` → Phase 04

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 29 | AisenLens Shot Structure Contract | 未开始 |
| 31 | ↳ 1. 目的 | 未开始 |
| 35 | ↳ 2. Authority | 未开始 |
| 55 | ↳ 3. 时间契约 | 未开始 |
| 62 | ↳ 4. Candidate 与 Official 分离 | 未开始 |
| 72 | ↳ 5. Split / Merge / Boundary Move | 未开始 |
| 82 | ↳ 6. 下游影响 | 未开始 |
| 92 | ↳ 7. Identity 与 Revision | 未开始 |
| 103 | ↳ 8. 工作区边界 | 未开始 |
| 111 | ↳ 9. 冻结原则 | 未开始 |

### `04-domain/template/TEMPLATE_CONTRACT.md` → Phase 05/06/08/09

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 32 | AisenLens Template Contract | 未开始 |
| 34 | ↳ Purpose | 未开始 |
| 38 | ↳ Core separation | 未开始 |
| 51 | ↳ Canonical concepts | 未开始 |
| 53 | ↳ ↳ TemplateDefinition / AnalysisProfile | 未开始 |
| 57 | ↳ ↳ AnalysisSchema | 未开始 |
| 61 | ↳ ↳ UILayoutDefinition | 未开始 |
| 65 | ↳ ↳ RendererDefinition | 未开始 |
| 69 | ↳ ↳ PromptDefinition | 未开始 |
| 73 | ↳ ↳ ContextDefinition | 未开始 |
| 77 | ↳ ↳ ExportMapping | 未开始 |
| 81 | ↳ Persistence | 未开始 |
| 89 | ↳ Invariants | 未开始 |
| 99 | ↳ Current vs Target | 未开始 |
| 101 | ↳ ↳ CURRENT（仓库 2026-09-17 核对） | 未开始 |
| 105 | ↳ ↳ TARGET | 未开始 |
| 109 | ↳ Consumers | 未开始 |

### `04-domain/timeline/TIMELINE_ARCHITECTURE.md` → Phase 07

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 30 | AisenLens 时间轴优化架构方案 | 未开始 |
| 39 | ↳ 1. 产品目标 | 未开始 |
| 55 | ↳ 2. 首版范围与后续边界 | 未开始 |
| 70 | ↳ 3. 当前实现基线 | 未开始 |
| 87 | ↳ 4. 三种分析尺度与四级结构 | 未开始 |
| 116 | ↳ 5. 时间轴信息架构 | 未开始 |
| 147 | ↳ 6. 时间坐标与精度契约 | 未开始 |
| 174 | ↳ 7. 正式结构的唯一数据来源 | 未开始 |
| 203 | ↳ 8. 覆盖方式与层级不变量 | 未开始 |
| 222 | ↳ 9. Boundary First 的交互模型 | 未开始 |
| 238 | ↳ 10. 结构编辑命令 | 未开始 |
| 262 | ↳ 11. Promote / Demote 与跨层边界 | 未开始 |
| 278 | ↳ 12. 结构身份、内容与引用保留 | 未开始 |
| 295 | ↳ 13. Shot 校准与结构成员重整 | 未开始 |
| 318 | ↳ 14. 草稿、事务、历史与 revision | 未开始 |
| 343 | ↳ 15. 非法数据与错误恢复 | 未开始 |
| 356 | ↳ 16. Marker：单一自由观察 | 未开始 |
| 380 | ↳ 17. Marker 展示、Scope 与对象分析 | 未开始 |
| 398 | ↳ 18. Beat / Event 的语义边界 | 未开始 |
| 412 | ↳ 19. 分析维度与数据形态 | 未开始 |
| 428 | ↳ 20. 四类工作区状态 | 未开始 |
| 445 | ↳ 21. 上下文 Inspector | 未开始 |
| 461 | ↳ 22. 导航、快捷键与交互优先级 | 未开始 |
| 475 | ↳ 23. Track Definition、Instance 与 Preference | 未开始 |
| 510 | ↳ 24. View Adapter 与绘制契约 | 未开始 |
| 523 | ↳ 25. 轨道设置与持久化作用域 | 未开始 |
| 539 | ↳ 26. 视口与缩放数学 | 未开始 |
| 564 | ↳ 27. Semantic Zoom 与信息密度 | 未开始 |
| 582 | ↳ 28. 查询、渲染与播放更新 | 未开始 |
| 596 | ↳ 29. 缩略图、波形与资源预算 | 未开始 |
| 614 | ↳ 30. 首批分析轨：Editing Pace | 未开始 |
| 642 | ↳ 31. 首批文本轨：Dialogue | 未开始 |
| 657 | ↳ 32. 算法、统计、模型与用户的职责 | 未开始 |
| 680 | ↳ 33. Context Builder 与输出校验 | 未开始 |
| 704 | ↳ 34. AI 结构建议的状态机 | 未开始 |
| 727 | ↳ 35. 模块边界与复用 | 未开始 |
| 749 | ↳ 36. 存储演进与旧数据保留 | 未开始 |
| 767 | ↳ 37. 实施阶段与出口条件 | 未开始 |
| 781 | ↳ 38. 验收矩阵与性能门槛 | 未开始 |
| 807 | ↳ 39. 参考依据与采纳边界 | 未开始 |
| 819 | ↳ 40. 冻结决策与文档维护 | 未开始 |

### `05-runtime/OPERATIONAL_ARCHITECTURE.md` → Phase 02/09/10

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 29 | AisenLens Operational / Runtime Architecture | 未开始 |
| 33 | ↳ 1. Runtime boundaries | 未开始 |
| 50 | ↳ 2. Persistence safety | 未开始 |
| 52 | ↳ ↳ 2.1 Canonical durability | 未开始 |
| 62 | ↳ ↳ 2.2 Quota / eviction / corruption | 未开始 |
| 75 | ↳ ↳ 2.3 Multi-tab / concurrent editing | 未开始 |
| 84 | ↳ 3. Worker and task lifecycle | 未开始 |
| 99 | ↳ 4. Security and trust boundaries | 未开始 |
| 103 | ↳ ↳ 4.1 Input validation | 未开始 |
| 110 | ↳ ↳ 4.2 AI provider boundary | 未开始 |
| 119 | ↳ ↳ 4.3 Export safety | 未开始 |
| 123 | ↳ 5. Observability without leaking content | 未开始 |
| 134 | ↳ 6. Error model | 未开始 |
| 155 | ↳ 7. Delivery / CI gates | 未开始 |
| 172 | ↳ 8. Feature rollout | 未开始 |
| 180 | ↳ 9. Capacity and performance budgets | 未开始 |
| 194 | ↳ 10. Non-goals | 未开始 |
| 206 | ↳ 11. Release invariants | 未开始 |

### `90-implementation/IMPLEMENTATION_MAP.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 14 | AisenLens 设计 → 代码实施映射 | 未开始 |
| 30 | ↳ 推荐实施顺序 | 未开始 |
| 50 | ↳ 每个 Phase 的最小出口条件 | 未开始 |

### `implementation/IMPLEMENTATION_BOUNDARY.md` → Phase 01/02/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | IMPLEMENTATION BOUNDARY | 未开始 |
| 19 | ↳ Cross-cutting runtime boundary | 未开始 |

### `implementation/MIGRATION_PLAN.md` → Phase 02/04/05/07/08/09/10/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | MIGRATION PLAN | 未开始 |

### `implementation/AI_DEVELOPMENT_GUIDE.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | AI DEVELOPMENT GUIDE | 未开始 |
| 15 | ↳ Conflict precedence | 未开始 |
| 23 | ↳ Mandatory rules | 未开始 |

### `audit/AUTHORITY_MAP.md` → Phase 02/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | AUTHORITY MAP | 未开始 |
| 16 | ↳ Frozen authority chain | 未开始 |

### `audit/COMMAND_EVENT_MAP.md` → Phase 02/04/07

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | COMMAND / EVENT MAP | 未开始 |

### `audit/DEPENDENCY_GRAPH.md` → Phase 02/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | DEPENDENCY GRAPH | 未开始 |
| 3 | ↳ Allowed direction | 未开始 |
| 18 | ↳ Cross-domain dependencies | 未开始 |
| 31 | ↳ Forbidden dependencies | 未开始 |
| 40 | ↳ Cycle audit | 未开始 |
| 45 | ↳ Runtime boundary additions (2026-09-17 review) | 未开始 |

### `audit/STATE_OWNERSHIP.md` → Phase 02/03/06/07

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | STATE OWNERSHIP | 未开始 |
| 15 | ↳ Invariant | 未开始 |
| 20 | ↳ Persistence clarification (2026-09-17 review) | 未开始 |

### `audit/FINAL_SOURCE_OF_TRUTH_MATRIX.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | FINAL SOURCE OF TRUTH MATRIX | 未开始 |
| 17 | ↳ Enforcement rule | 未开始 |

### `audit/ARCHITECTURE_REVIEW_2026-09-17.md` → Phase 01/02/10/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | ARCHITECTURE REVIEW — 2026-09-17 | 未开始 |
| 3 | ↳ Overall assessment | 未开始 |
| 7 | ↳ Findings fixed in this package | 未开始 |
| 9 | ↳ ↳ P0 documentation correctness | 未开始 |
| 13 | ↳ ↳ P1 architecture completeness | 未开始 |
| 18 | ↳ ↳ P1 implementation governance | 未开始 |
| 23 | ↳ Accepted / deferred items | 未开始 |
| 29 | ↳ Recommended implementation order | 未开始 |

### `audit/MASTER_PLAN_COVERAGE_MATRIX.md` → Phase 01–11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | MASTER PLAN COVERAGE MATRIX | 未开始 |
| 27 | ↳ Conclusion | 未开始 |

### `audit/CURRENT_REPOSITORY_BASELINE.md` → Phase 01

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | Current Repository Baseline | 未开始 |
| 5 | ↳ Verified CURRENT facts | 未开始 |
| 14 | ↳ Important CURRENT/TARGET gap | 未开始 |
| 18 | ↳ Verification scope | 未开始 |

### `audit/DECISION_LOG.md` → Phase 02/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | DECISION LOG | 未开始 |
| 3 | ↳ D-001 — Official Shot Authority | 未开始 |
| 9 | ↳ D-002 — Timeline positioning | 未开始 |
| 14 | ↳ D-003 — Analysis / Inspector separation | 未开始 |
| 18 | ↳ D-004 — Evidence / Provenance | 未开始 |
| 21 | ↳ D-005 — Template boundary | 未开始 |
| 24 | ↳ D-006 — Results authority | 未开始 |
| 27 | ↳ D-007 — Content preservation | 未开始 |

### `audit/CONCEPT_REGISTRY.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | CONCEPT REGISTRY — PRE/POST GOVERNANCE CONSOLIDATED | 未开始 |
| 43 | ↳ Alias / non-alias decisions | 未开始 |

### `audit/FINAL_CONCEPT_REGISTRY.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | FINAL CONCEPT REGISTRY | 未开始 |
| 43 | ↳ Alias / non-alias decisions | 未开始 |

### `audit/SOURCE_OF_TRUTH_MATRIX.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | SOURCE OF TRUTH MATRIX | 未开始 |
| 17 | ↳ Enforcement rule | 未开始 |

### `audit/CONFLICT_AUDIT.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | CONFLICT AUDIT | 未开始 |
| 16 | ↳ Notes | 未开始 |

### `audit/CONFLICT_MATRIX.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | CONFLICT MATRIX | 未开始 |

### `audit/WORKSPACE_BOUNDARY_AUDIT.md` → Phase 03/04/06/08/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | WORKSPACE BOUNDARY AUDIT | 未开始 |
| 9 | ↳ Correction flow | 未开始 |

### `audit/DUPLICATE_AUDIT.md` → Phase 11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | DUPLICATE AUDIT | 未开始 |
| 12 | ↳ Content-preservation handling | 未开始 |

### `audit/DOCUMENT_QUALITY_CHECK.md` → Phase 11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | DOCUMENT QUALITY CHECK | 未开始 |

### `audit/FINAL_ARCHITECTURE_AUDIT.md` → Phase 01–11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | FINAL ARCHITECTURE AUDIT | 未开始 |
| 3 | ↳ Executive Summary | 未开始 |
| 7 | ↳ Current Architecture | 未开始 |
| 11 | ↳ Target Architecture | 未开始 |
| 25 | ↳ Concept Registry Summary | 未开始 |
| 29 | ↳ Authority Map | 未开始 |
| 37 | ↳ Source of Truth Summary | 未开始 |
| 41 | ↳ Major Duplicates | 未开始 |
| 45 | ↳ Major Conflicts | 未开始 |
| 47 | ↳ ↳ P0 | 未开始 |
| 52 | ↳ ↳ P1 | 未开始 |
| 55 | ↳ Workspace Boundaries | 未开始 |
| 59 | ↳ Timeline Decision | 未开始 |
| 63 | ↳ Analysis / Inspector Decision | 未开始 |
| 67 | ↳ Evidence Decision | 未开始 |
| 71 | ↳ Template Decision | 未开始 |
| 75 | ↳ AI Boundary | 未开始 |
| 79 | ↳ State Ownership | 未开始 |
| 83 | ↳ Dependency Rules | 未开始 |
| 87 | ↳ Final Documentation Architecture | 未开始 |
| 91 | ↳ Implementation Boundary | 未开始 |
| 95 | ↳ Migration Priorities | 未开始 |
| 99 | ↳ Runtime / Engineering Architecture Review | 未开始 |
| 105 | ↳ Remaining Risks | 未开始 |
| 111 | ↳ Final validation result | 未开始 |

### `ARCHITECTURE_INDEX.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | ARCHITECTURE INDEX | 未开始 |

### `README.md` → Phase 01/11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 15 | AisenLens 优化设计总目录 | 未开始 |
| 25 | ↳ 目录 | 未开始 |
| 62 | ↳ 产品主链 | 未开始 |
| 82 | ↳ Authority Chain | 未开始 |
| 93 | ↳ Source of Truth | 未开始 |
| 110 | ↳ 文档状态 | 未开始 |
| 123 | ↳ 维护规则 | 未开始 |
| 133 | ↳ 内容守恒规则（本轮新增硬约束） | 未开始 |

### `CHANGELOG.md` → Phase 11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 1 | CHANGELOG | 未开始 |
| 3 | ↳ 2026-09-17 — Refined Architecture Package | 未开始 |
| 5 | ↳ ↳ Preservation | 未开始 |
| 10 | ↳ ↳ Added | 未开始 |
| 16 | ↳ ↳ Modified without deleting original content | 未开始 |
| 23 | ↳ ↳ Merged / de-duplicated semantically | 未开始 |
| 28 | ↳ 2026-09-17 — Architecture Review / Runtime Completeness Pass | 未开始 |
| 30 | ↳ ↳ Fixed | 未开始 |
| 33 | ↳ ↳ Added | 未开始 |
| 38 | ↳ ↳ Strengthened | 未开始 |

### `Plans/AisenLens_MASTER_DEVELOPMENT_PLAN_2026-09-17.md` → Phase 01–11

| Line | Section | 阶段核对状态 |
|---:|---|---|
| 33 | AisenLens 总开发计划（Master Development Plan） | 未开始 |
| 41 | 1. 总目标 | 未开始 |
| 93 | 2. 开发主线与优先级 | 未开始 |
| 115 | 3. UI / UX 提升为一级开发目标 | 未开始 |
| 117 | ↳ 3.1 UI/UX 的开发地位 | 未开始 |
| 131 | ↳ 3.2 UI/UX 总体设计原则 | 未开始 |
| 147 | ↳ 3.3 UI/UX 阶段门 | 未开始 |
| 162 | 4. Phase 0 — 基线冻结、覆盖核对与实施准备 | 未开始 |
| 164 | ↳ 4.1 目标 | 未开始 |
| 168 | ↳ 4.2 工作内容 | 未开始 |
| 178 | ↳ ↳ Runtime baseline | 未开始 |
| 187 | ↳ 4.3 UI/UX 交付 | 未开始 |
| 193 | ↳ 4.4 Exit Criteria | 未开始 |
| 203 | 5. Phase 1 — Global Shell + Workspace Design System | 未开始 |
| 205 | ↳ 5.1 Global Shell | 未开始 |
| 219 | ↳ 5.2 Design System | 未开始 |
| 233 | ↳ 5.3 UI/UX 重点 | 未开始 |
| 237 | ↳ 5.4 Exit Criteria | 未开始 |
| 246 | 6. Phase 2 — Preparation Workspace + Official Shot Authority | 未开始 |
| 248 | ↳ 6.1 目标 | 未开始 |
| 252 | ↳ 6.2 Step 1：导入素材 | 未开始 |
| 259 | ↳ 6.3 Step 2：智能切分 | 未开始 |
| 269 | ↳ 6.4 Step 3：Boundary Review / Calibration | 未开始 |
| 288 | ↳ 6.5 Shot Domain Command 落地 | 未开始 |
| 299 | ↳ 6.6 Keyframe | 未开始 |
| 303 | ↳ 6.7 UI/UX 重点 | 未开始 |
| 307 | ↳ 6.8 Exit Criteria | 未开始 |
| 316 | 7. Phase 3 — Analysis Data、Evidence/Provenance、Template 与持久化解耦 | 未开始 |
| 318 | ↳ 7.1 Analysis Data Model | 未开始 |
| 334 | ↳ 7.2 从 ShotRecord.analysisFields 解耦 | 未开始 |
| 345 | ↳ 7.3 stale / remap / revalidation | 未开始 |
| 357 | ↳ 7.4 Evidence / Provenance | 未开始 |
| 368 | ↳ 7.5 Template 子契约 | 未开始 |
| 382 | ↳ 7.6 UI/UX 交付 | 未开始 |
| 393 | ↳ 7.7 Exit Criteria | 未开始 |
| 402 | 8. Phase 4 — Analysis Workspace 主工作台 | 未开始 |
| 404 | ↳ 8.1 工作台结构 | 未开始 |
| 414 | ↳ 8.2 四类核心状态 | 未开始 |
| 425 | ↳ 8.3 Structure Navigator | 未开始 |
| 429 | ↳ 8.4 Player / Overlay / Controls | 未开始 |
| 433 | ↳ 8.5 Marker | 未开始 |
| 437 | ↳ 8.6 Template 与 Analysis Settings | 未开始 |
| 441 | ↳ 8.7 Shot Correction Flow | 未开始 |
| 453 | ↳ 8.8 Error / Save / Undo / Responsive | 未开始 |
| 457 | ↳ 8.9 UI/UX 重点 | 未开始 |
| 461 | ↳ 8.10 Exit Criteria | 未开始 |
| 470 | 9. Phase 5 — Analysis Inspector 深化 | 未开始 |
| 472 | ↳ 9.1 一个 Shell，多 Entity Renderer | 未开始 |
| 476 | ↳ 9.2 Header / Body / Field | 未开始 |
| 490 | ↳ 9.3 AI / Derived / Human 视觉 | 未开始 |
| 500 | ↳ 9.4 Evidence / Provenance UI | 未开始 |
| 509 | ↳ 9.5 Data Review 与 AI Review | 未开始 |
| 515 | ↳ 9.6 Timeline 双向交互 | 未开始 |
| 522 | ↳ 9.7 Renderer Registry | 未开始 |
| 526 | ↳ 9.8 AI Ask / Context Builder | 未开始 |
| 530 | ↳ 9.9 Exit Criteria | 未开始 |
| 539 | 10. Phase 6 — Timeline Domain + Application + View | 未开始 |
| 541 | ↳ 10.1 时间与结构基础 | 未开始 |
| 547 | ↳ 10.2 结构编辑与 revision | 未开始 |
| 551 | ↳ 10.3 Marker / Beat / Event | 未开始 |
| 555 | ↳ 10.4 Track 模型 | 未开始 |
| 559 | ↳ 10.5 View Adapter 与渲染 | 未开始 |
| 572 | ↳ 10.6 Timeline UI/UX | 未开始 |
| 586 | ↳ 10.7 AI 结构建议 | 未开始 |
| 590 | ↳ 10.8 Exit Criteria | 未开始 |
| 599 | 11. Phase 7 — Results Workspace、Derived Dataset、Export 与 Creative Transformation | 未开始 |
| 601 | ↳ 11.1 Results 数据消费契约 | 未开始 |
| 605 | ↳ 11.2 数据表 | 未开始 |
| 609 | ↳ 11.3 Export / Share | 未开始 |
| 613 | ↳ 11.4 Creative Transformation | 未开始 |
| 617 | ↳ 11.5 UI/UX 重点 | 未开始 |
| 621 | ↳ 11.6 Exit Criteria | 未开始 |
| 629 | 12. Phase 8 — AI Candidate、Context Builder 与智能工作流增强 | 未开始 |
| 631 | ↳ 12.1 AI 总边界 | 未开始 |
| 635 | ↳ 12.2 Context Builder | 未开始 |
| 639 | ↳ 12.3 Review | 未开始 |
| 643 | ↳ 12.4 AI UI | 未开始 |
| 647 | ↳ 12.5 Provider / Privacy Gate | 未开始 |
| 654 | ↳ 12.6 Exit Criteria | 未开始 |
| 662 | 13. Phase 9 — 稳定性、运行时安全、迁移、性能、无障碍与发布门 | 未开始 |
| 664 | ↳ 13.1 数据迁移与兼容 | 未开始 |
| 673 | ↳ 13.2 数据一致性与历史 | 未开始 |
| 682 | ↳ 13.3 性能 | 未开始 |
| 686 | ↳ 13.4 Runtime reliability / security | 未开始 |
| 697 | ↳ 13.5 UI/UX 最终质量门 | 未开始 |
| 709 | ↳ 13.6 发布门 | 未开始 |
| 726 | 14. Phase 10 — 文档治理、AI Coding Agent 与长期演进 | 未开始 |
| 728 | ↳ 14.1 文档治理 | 未开始 |
| 732 | ↳ 14.2 AI Development Guide 执行 | 未开始 |
| 743 | ↳ 14.3 长期模块边界 | 未开始 |
| 749 | 15. 推荐开发批次（可执行顺序） | 未开始 |
| 769 | 16. 每个 Batch 的 Definition of Done | 未开始 |
| 773 | ↳ ↳ Architecture / Domain | 未开始 |
| 778 | ↳ ↳ Persistence | 未开始 |
| 783 | ↳ ↳ UI / UX | 未开始 |
| 789 | ↳ ↳ Runtime / Security | 未开始 |
| 795 | ↳ ↳ Quality | 未开始 |
| 800 | ↳ ↳ Documentation | 未开始 |
| 807 | 17. P0 / P1 开发优先级冻结 | 未开始 |
| 809 | ↳ P0（必须先解决） | 未开始 |
| 817 | ↳ P1（P0 稳定后紧接） | 未开始 |
| 825 | ↳ P2 | 未开始 |
| 832 | ↳ P3 | 未开始 |
| 839 | 18. 关键风险与处理 | 未开始 |
| 852 | 19. 总体验收场景 | 未开始 |
| 872 | 20. 文档覆盖策略 | 未开始 |

## 迁移计划逐项映射

| 架构建议 | Phase | 必须证明 |
|---|---|---|
| Shot Authority，禁止非命令写入 | 04 | direct formal writes 已迁移到 command；revision 一致 |
| Analysis Fact 从 ShotRecord.analysisFields 解耦 | 05/10 | 兼容读、无损迁移、旧数据 fixture、停止旧写 |
| AI Candidate 与正式值分离 | 05/09 | 未 accept 不进入正式 query/export |
| Template 子契约 | 05/06/08/09 | stable fieldId；layout/prompt/context/export 不反向定义字段语义 |
| stale/remap/revalidation | 05/06/07 | split/merge/move 有确定影响矩阵与测试 |
| Timeline domain/application/view | 07 | viewport/hover 不持久化；结构 edit 走 command |
| Results derived query | 08 | table/export/creative 同 query |
| persistence quota/corruption/multi-tab/race | 02/10 | typed failure + recovery + fixtures |
| Worker lifecycle | 02/04/07/08/09/10 | cancel/crash/late-result tests |
| import/AI trust boundary | 02/09/10 | malformed input rejected before canonical write |
| privacy diagnostics/performance marks | 02/10 | 默认支持数据不含用户正文；关键耗时可定位 |
| CI/release/rollback gate | 10/11 | 所有真实 gate 运行并记录；不部署 |

## 使用方式

阶段收尾时，把本文件对应章节的“阶段核对状态”在本地执行分支中更新为 `已核对` / `明确 deferred` / `不适用（证据）`。**不能仅因某个总功能做完，就把整份文档批量视为已覆盖。** 对章节中无法落实的要求，必须在 `verification-record.md` 记录证据、影响和处理，不得静默跳过。
