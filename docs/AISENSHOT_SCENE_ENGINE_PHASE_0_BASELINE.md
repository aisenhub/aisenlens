# AisenShot Phase 0：评估输入与评分契约

状态：Task 0.1–0.4 已完成；评估输入、当前 JS 基线、WebCodecs/Mediabunny 能力矩阵和像素路径测量均已记录。Phase 12 将在固定视频素材可用时复验新引擎准确率。

本文档冻结自动分镜算法优化的评估输入、标注语义、匹配规则和项目帧映射规则。它只定义可复现的契约，不包含任何实际视频素材、基线成绩或新算法实现。

## 1. Fixture manifest

所有评估素材必须通过 manifest 登记。manifest 使用 `schemaVersion: 1`，每个 fixture 至少包含以下字段：

| 字段 | 语义 |
| --- | --- |
| `id` | 稳定、唯一的 fixture 标识；不得由文件名临时推导 |
| `path` | 仓库外或被 `.gitignore` 忽略的本地素材路径；不得提交视频本体 |
| `source` | 来源名称、原始 URL/发行页和取得日期 |
| `license` | 许可证或使用授权；未知或受限来源不得进入评估集 |
| `sha256` | 文件 SHA-256；文件替换后必须更新，不能只依赖文件名、大小或修改时间 |
| `media` | 容器、codec、coded/display 尺寸、rotation、音频、色彩和位深信息 |
| `timebase` | `durationUs`、CFR 的精确帧率，或 VFR 的 PTS/时长说明 |
| `annotations` | hard-cut 与 fade 标注数组，以及标注者/来源说明 |

媒体元数据中的时间统一使用整数微秒（`timestampUs`），尺寸与位深使用解码器实际报告值。CFR 帧率以整数比例保存；本项目的示例约定使用 `fpsNumerator / fpsDenominator`，禁止把二进制浮点 FPS 作为唯一真值。

示例 manifest 见 [`apps/web/test/fixtures/auto-shot/manifest.example.json`](/E:/Projects/Aisenlens/apps/web/test/fixtures/auto-shot/manifest.example.json)。它只提供 schema 模板，不引用可提交的真实视频。

## 2. 标注 schema

### 2.1 Hard cut

每个 hard cut 是一个对象：

```json
{
  "id": "cut-001",
  "timestampUs": 5000000,
  "presentationIndex": 150,
  "confidence": "confirmed",
  "source": "human-review"
}
```

`timestampUs` 是边界发生的媒体时间，`presentationIndex` 仅作为可追踪的显示顺序记录，不替代时间真值。hard cut 必须位于媒体首尾之间；项目帧边界最终只能落在 `1..durationFrames-1`。`confidence` 只描述标注质量，不参与评分权重。

### 2.2 Fade / transition

每个 fade 使用半开区间 `[startUs, endUs)`，并可提供建议边界：

```json
{
  "id": "fade-001",
  "startUs": 8000000,
  "endUs": 8500000,
  "boundaryUs": 8250000,
  "direction": "out-in",
  "throughBlack": false,
  "source": "human-review"
}
```

`startUs < endUs`，`boundaryUs` 若存在必须落在区间内。fade 不强行折算为 hard cut；评分分别报告建议点是否进入标注区间，以及预测区间与标注区间的交并比（IoU）。

## 3. 评分契约

### 3.1 Hard cut 一对一匹配

预测和标注按时间升序处理，并在同一容差下执行稳定的一对一匹配：每个真实边界和每个预测边界最多匹配一次。匹配条件为项目帧距离不超过 `toleranceFrames`，分别计算 `0`、`1`、`2` 三档结果。相同距离时优先较早的预测边界，再按输入顺序解决剩余并列，确保重复评分结果完全一致。

每档至少输出：`TP`、`FP`、`FN`、Precision、Recall、F1、带符号边界偏移的平均值和绝对偏移的 p95。偏移必须同时保留预测相对标注的方向；没有匹配项时平均值和 p95 写为 `null`，不能写成 0。

### 3.2 Fade 评分

对于每条标注 fade：

1. 若预测提供 `boundaryUs`，记录该点是否满足 `startUs <= boundaryUs < endUs`。
2. 若预测提供区间，计算与标注半开区间的 IoU；区间不相交时 IoU 为 0。
3. 预测与标注同样使用一对一关联，未关联项分别计入漏报和误报。

## 4. 项目帧映射契约

当前项目时间线按 CFR 项目帧使用整数序号，帧区间为 `[frameIndex, frameIndex + 1)`。为避免不同运行时的浮点差异，映射使用整数微秒和量化帧率：

```text
fpsQ = round(fpsNumerator * 1_000_000 / fpsDenominator)
frameNumerator = timestampUs * fpsQ
frameDenominator = 1_000_000 * 1_000_000
boundaryFrame = ceil(frameNumerator / frameDenominator)
```

其中 `ceil(a / b)` 使用非负整数 `ceilDiv` 实现；不使用 JS/C++ 浮点 `round/floor/ceil` 参与边界决策。`fpsQ` 的量化比例和原始帧率必须同时写入 manifest，量化误差需要在基线报告中披露。

`durationFrames` 定义为：

```text
durationFrames = max(1, ceil(durationUs * fpsQ / frameDenominator))
```

映射后的 hard-cut 边界按以下规则 clamp：

```text
boundaryFrame = min(max(boundaryFrame, 1), durationFrames - 1)
```

当 `durationFrames <= 1` 时，fixture 不产生可评分的内部 hard-cut。时间戳 0 和媒体末尾只可作为播放器起止哨兵，不可被检测器计为场景边界。

### 4.1 VFR、重复 PTS 与 duration

- VFR fixture 必须登记完整的 PTS 语义；评分仍以 `timestampUs` 投影到上述 CFR 项目帧，不允许按数组下标偷偷替代时间。
- 相同 PTS 的样本按解码器给出的 presentation order 分配 `timestampOrdinal`。ordinal 只用于 checkpoint/resume 和追踪，不改变边界匹配时间。
- `durationUs` 取媒体轨道确定的总时长。单帧 `durationUs == 0` 不得被擅自改写成固定帧时长；若总时长无法可靠取得，该 fixture 不得进入评分集。
- 任何无法解释的 PTS 回退、负时长或缺少容器/codec 元数据都使 fixture 校验失败，而不是静默修正。

## 5. 可追溯性与素材规则

评分输入必须能由 `id + sha256 + manifest commit` 唯一复现。视频本体、受限数据和来源不明的素材继续遵守仓库 `.gitignore`，不提交到 GitHub。示例 manifest、标注 schema 和契约测试可以提交；真实素材由开发者在本地按登记信息准备。

Task 0.1 的契约测试覆盖 manifest 必填字段、半开区间约束、`ceil` 投影、首尾 clamp、重复 PTS ordinal 和非法时间输入。Task 0.2 再在此契约之上记录当前 JS 算法基线，不修改本契约。

## 6. Task 0.2 当前 JS 基线（2026-08-27）

基线使用 `synthetic-color-sequence-v1`：由 [`scripts/generate-auto-shot-fixture.mjs`](/E:/Projects/Aisenlens/scripts/generate-auto-shot-fixture.mjs) 生成的 CC0-equivalent 合成 WebM。素材本体位于被忽略的 `apps/web/test/fixtures/auto-shot/synthetic.webm`，当前 SHA-256 以 manifest 登记的 `09FD690F4ACE87A88B05CE234E09F87F2B4B23CDF3A01925C0A4FC1449F8A6C0` 为准。标注包含项目帧 60、240 两个 hard cut，以及 4–6 秒 fade（建议点项目帧 150）。

运行配置为 sensitivity `55`、minimum shot `0.4s`、采样间隔 `0.2s`、项目帧率 `30fps`。浏览器为 Chrome `152.0.7977.65`（Headless，Windows），素材解码尺寸 `640×360`，时长约 `12.396245s`。

实际基线结果：检测到 5 个 hard-cut 候选（项目帧 `137、153、171、187、248`），其中 153 落在标注 fade 区间；两个标注 hard cut（项目帧 `60、240`）在 0/1/2 帧容差下均未命中，因此均为 `TP=0, FP=5, FN=2, Precision=0, Recall=0, F1=0`。fade 点命中率为 `1/1`，但有 4 个额外候选。本次记录总耗时约 `5337ms`，更新 63 次，观察到 2 个主线程长任务，最长约 `143ms`，峰值 JS heap 约 `22.8MB`。性能字段是单次运行记录，后续比较应在同一环境重复运行；当前实现无法分离 seek 与像素处理耗时，因此该字段明确记录为 `null`，不伪造拆分数据。

复现命令：

```text
corepack pnpm generate:auto-shot-fixture
corepack pnpm test:auto-shot-baseline
corepack pnpm evaluate:auto-shot
```

基线运行器位于 [`apps/web/test/auto-shot-baseline.browser.test.js`](/E:/Projects/Aisenlens/apps/web/test/auto-shot-baseline.browser.test.js)，原始报告和评分报告写入被忽略的 `test-results/`。该结果只作为后续迁移比较基准，不是新引擎的兼容目标。

## 7. Task 0.3 WebCodecs/Mediabunny 能力矩阵（2026-08-27）

在同一 Chrome `152.0.7977.65` 中使用本地 `test.mov`（H.264/AVC，1920×1080）进行 `VideoSampleSink` 顺序抽样，并额外探测合成 VP9 WebM：

| 能力 | 结果 | 决策 |
| --- | --- | --- |
| `VideoDecoder` / `VideoFrame` / `OffscreenCanvas` | 可用 | 可进入 Worker spike |
| H.264 sample format | `NV12` | 原生 NV12 平面复制作为候选 |
| 原生 `sample.copyTo()` | 成功，单帧 allocation `3,110,400` bytes | 记录 coded/display 尺寸和 stride 后再进入端到端基准 |
| `copyTo({ format: "I420" })` | 失败：浏览器不支持该转换 | 不得把 I420 转换写成实现假设 |
| `copyTo({ format: "RGBA" })` | 成功 | 作为规范允许的 RGB 标准化候选 |
| color space | `bt709 / bt709 / bt709 / limited` | FrameView 必须保留四个色彩字段 |
| rotation / visible rect | 本素材 rotation `0`，display 与 coded 同为 `1920×1080` | 仍须在后续矩阵加入裁剪和旋转样本 |
| 合成 VP9 WebM `VideoSampleSink` | 返回 `Decoding error`，而 HTMLVideoElement 基线可播放 | capability/error 分支明确记录，不在 Worker 中静默回退 |

所有抽样 sample 均在成功和异常路径调用 `close()`；报告写入被忽略的 `test-results/auto-shot-capability.json`。当前矩阵只代表这台机器和该浏览器版本，不能外推为所有用户浏览器支持。

## 8. Task 0.4 像素路径端到端测量（2026-08-27）

在标注的 VP8 合成 `640×360` 素材上顺序抽取 24 个时间点，包含 decode、copy 和低分辨率预处理的真实浏览器耗时；另有 H.264/NV12 能力样本确认格式与转换分支：

| 路径 | 平均耗时/帧 | p95 | 平均字节 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 原生平面复制（VP8 样本） | `68.80ms` | `159.70ms` | `921,600` | 保真候选 |
| RGBA 标准化复制（VP8 样本） | `4.95ms` | `6.00ms` | `921,600` | 逐帧基线 |
| OffscreenCanvas `96×54` 低分辨率预处理 | `3.42ms` | `3.80ms` | — | 生产候选 |

抽样 decode 平均 `141.47ms`、p95 `229.80ms`。这些数字来自同一页面中的 OffscreenCanvas spike，不宣称已经是独立 Worker 的最终性能。路径级签名代理以逐帧 RGBA 作为基线：RGBA 与低分辨率候选 Recall 均为 `1.0`，低分辨率候选 Recall delta 为 `0`；原生平面路径 Recall 为 `0.5`。因此选定“Worker 内固定 `96×54` 低分辨率预处理”作为当前生产候选，保留原生平面/ RGBA 为能力兼容与高保真回归路径。该 Recall 是路径级代理门槛，接入真正 detector 后仍需在 Phase 12 复验。
