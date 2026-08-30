import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { assertCalibrationManifests, parseCalibrationAnnotation, runSearchSweep, scoreHardCuts, serializeCalibrationAnnotation, validateCalibrationManifests } from "../apps/web/src/features/scene-calibration/services/calibrationService.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function flags(name) {
  const values = [];
  for (let index = 0; index < process.argv.length - 1; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function readJson(path) {
  if (!path) throw new Error(`缺少 ${path} 参数`);
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function mediaContentDigest(bytes, strategy) {
  if (strategy === "sha256-file-v1") return sha256(bytes);
  if (strategy !== "sha256-chunk-manifest-4m-v1") throw new Error(`不支持的媒体指纹策略：${strategy}`);
  const chunkSize = 4 * 1024 * 1024;
  const blocks = [];
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    const block = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength));
    blocks.push([offset, block.byteLength, sha256(block)]);
  }
  return sha256(Buffer.from(JSON.stringify(["aisenlens-content-digest", 1, strategy, bytes.byteLength, chunkSize, blocks])));
}

async function verifyMediaFiles(manifest, mediaRoot) {
  const issues = [];
  for (const entry of manifest.fixtures) {
    const mediaPath = resolve(mediaRoot, entry.path);
    try {
      const bytes = await readFile(mediaPath);
      const identity = entry.annotation.mediaIdentity;
      const digest = mediaContentDigest(bytes, identity.contentDigestStrategy);
      if (bytes.byteLength !== identity.size) {
        issues.push({ code: "CHECKSUM_MISMATCH", path: `fixtures.${entry.fixtureId}.media`, message: `媒体大小不一致：manifest=${identity.size}，文件=${bytes.byteLength}。` });
      }
      if (digest !== entry.sha256 || digest !== identity.contentDigest) {
        issues.push({ code: "CHECKSUM_MISMATCH", path: `fixtures.${entry.fixtureId}.sha256`, message: `媒体指纹不一致：${mediaPath}。` });
      }
    } catch (error) {
      issues.push({ code: "CHECKSUM_MISMATCH", path: `fixtures.${entry.fixtureId}.path`, message: `无法读取媒体文件 ${mediaPath}：${String(error)}` });
    }
  }
  return issues;
}

const command = process.argv[2];
if (command === "validate") {
  const search = await readJson(flag("--search"));
  const holdout = await readJson(flag("--holdout"));
  const issues = [...validateCalibrationManifests(search, holdout)];
  const mediaRoot = flag("--media-root");
  if (mediaRoot) issues.push(...await verifyMediaFiles(search, mediaRoot), ...await verifyMediaFiles(holdout, mediaRoot));
  const incomplete = hasFlag("--allow-incomplete");
  const blockingIssues = issues.filter((item) => item.code !== "INSUFFICIENT_SAMPLES");
  if (blockingIssues.length) throw new Error(blockingIssues.map((item) => `${item.code} ${item.path}: ${item.message}`).join("\n"));
  if (issues.length && !incomplete) assertCalibrationManifests(search, holdout);
  console.log(JSON.stringify({ ok: blockingIssues.length === 0, incomplete, issues, searchFixtures: search.fixtures.length, holdoutFixtures: holdout.fixtures.length }, null, 2));
} else if (command === "score") {
  const manifest = await readJson(flag("--manifest"));
  const predictions = await readJson(flag("--predictions"));
  if (manifest.fixtures.some((entry) => entry.split !== "search")) throw new Error("score 命令只接受 search manifest；holdout 必须使用独立验收流程。");
  const scores = manifest.fixtures.map((entry) => ({ fixtureId: entry.fixtureId, score: scoreHardCuts(predictions[entry.fixtureId] ?? [], entry.annotation.hardCuts, entry.media.durationUs) }));
  console.log(JSON.stringify({ split: "search", datasetVersion: manifest.datasetVersion, scores }, null, 2));
} else if (command === "sweep") {
  const manifest = await readJson(flag("--manifest"));
  const input = await readJson(flag("--candidates"));
  const datasetChecksum = flag("--dataset-checksum");
  if (!datasetChecksum) throw new Error("sweep 需要 --dataset-checksum，以防止在不同数据集上复用结果。");
  if (!Array.isArray(input.candidates) || !input.predictions || typeof input.predictions !== "object") {
    throw new Error("candidates JSON 必须包含 candidates 数组和 predictions 对象。");
  }
  const predictionsByConfig = new Map(input.candidates.map((candidate) => [candidate.resolved.configHash, input.predictions[candidate.id] ?? {}]));
  const result = runSearchSweep({
    search: manifest,
    candidates: input.candidates,
    datasetChecksum,
    evaluate: (entry, resolved) => predictionsByConfig.get(resolved.configHash)?.[entry.fixtureId] ?? [],
  });
  const output = flag("--output");
  const encoded = `${JSON.stringify({ ...result, command: process.argv.slice(2).join(" "), sorting: "candidate.id ascending; one-to-one hard-cut matching" }, null, 2)}\n`;
  if (output) {
    await mkdir(dirname(resolve(output)), { recursive: true });
    await writeFile(resolve(output), encoded, "utf8");
  }
  process.stdout.write(encoded);
} else if (command === "export") {
  const annotation = parseCalibrationAnnotation(await readFile(flag("--input"), "utf8"));
  const expectedSplit = flag("--split");
  if (expectedSplit !== annotation.split) throw new Error(`导出 split 与标注不一致：期望 ${expectedSplit}，实际 ${annotation.split}`);
  process.stdout.write(serializeCalibrationAnnotation(annotation));
} else if (command === "pack") {
  const expectedSplit = flag("--split");
  const output = flag("--output");
  const inputs = flags("--annotation");
  if (!expectedSplit || !output || inputs.length === 0) throw new Error("pack 需要 --split、--output 和至少一个 --annotation");
  const annotations = await Promise.all(inputs.map(async (input) => parseCalibrationAnnotation(await readFile(input, "utf8"))));
  if (annotations.some((annotation) => annotation.split !== expectedSplit)) throw new Error(`pack split 与标注不一致：期望 ${expectedSplit}`);
  const fixtures = annotations.map((annotation) => ({
    fixtureId: annotation.fixtureId,
    split: annotation.split,
    path: `apps/web/test/${annotation.source.name}`,
    source: annotation.source,
    media: annotation.media,
    sha256: annotation.sha256,
    annotation,
  }));
  const mediaRoot = flag("--media-root");
  if (mediaRoot) {
    const mediaIssues = await verifyMediaFiles({ fixtures }, mediaRoot);
    if (mediaIssues.length) throw new Error(mediaIssues.map((item) => `${item.code} ${item.path}: ${item.message}`).join("\n"));
  }
  const manifest = {
    schemaVersion: 1,
    manifestKind: "scene-calibration",
    datasetVersion: flag("--dataset-version") ?? "search-2026-08-30-v1",
    matching: { hardCutToleranceFrames: [0, 1, 2], oneToOne: true },
    fixtures,
  };
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, output, fixtures: fixtures.length, hardCuts: fixtures.reduce((sum, fixture) => sum + fixture.annotation.hardCuts.length, 0) }, null, 2));
} else {
  console.error("用法：pnpm scene-calibration validate --search <search.json> --holdout <holdout.json> [--media-root <project-root>] [--allow-incomplete]\n      pnpm scene-calibration pack --split <search|holdout> --output <manifest.json> --annotation <annotation.json> [--annotation <annotation.json> ...] [--media-root <project-root>]\n      pnpm scene-calibration score --manifest <search.json> --predictions <predictions.json>\n      pnpm scene-calibration sweep --manifest <search.json> --candidates <candidates.json> --dataset-checksum <sha256> [--output <result.json>]\n      pnpm scene-calibration export --split <search|holdout> --input <annotation.json>");
  process.exitCode = 2;
}
