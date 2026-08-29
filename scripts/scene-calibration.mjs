import { readFile } from "node:fs/promises";
import { assertCalibrationManifests, scoreHardCuts } from "../apps/web/src/features/scene-calibration/services/calibrationService.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function readJson(path) {
  if (!path) throw new Error(`缺少 ${path} 参数`);
  return JSON.parse(await readFile(path, "utf8"));
}

const command = process.argv[2];
if (command === "validate") {
  const search = await readJson(flag("--search"));
  const holdout = await readJson(flag("--holdout"));
  assertCalibrationManifests(search, holdout);
  console.log(JSON.stringify({ ok: true, searchFixtures: search.fixtures.length, holdoutFixtures: holdout.fixtures.length }, null, 2));
} else if (command === "score") {
  const manifest = await readJson(flag("--manifest"));
  const predictions = await readJson(flag("--predictions"));
  if (manifest.fixtures.some((entry) => entry.split !== "search")) throw new Error("score 命令只接受 search manifest；holdout 必须使用独立验收流程。");
  const scores = manifest.fixtures.map((entry) => ({ fixtureId: entry.fixtureId, score: scoreHardCuts(predictions[entry.fixtureId] ?? [], entry.annotation.hardCuts, entry.media.durationUs) }));
  console.log(JSON.stringify({ split: "search", datasetVersion: manifest.datasetVersion, scores }, null, 2));
} else {
  console.error("用法：pnpm scene-calibration validate --search <search.json> --holdout <holdout.json>\n      pnpm scene-calibration score --manifest <search.json> --predictions <predictions.json>");
  process.exitCode = 2;
}
