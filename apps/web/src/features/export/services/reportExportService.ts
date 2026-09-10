import { buildShotGroupExportChapters } from "../../group/services/groupExportService";
import projectRepository from "../../project/services/projectRepository";
import { downloadXlsxReport } from "./xlsxExportService";
import type { AnalysisFieldEntry, ResolvedAnalysisField } from "../../template/types";
import type { ExportFormat, ReportExportInput } from "../types";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value: string | number) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function formatValue(value: AnalysisFieldEntry | undefined, field?: ResolvedAnalysisField) {
  if (!value) return "";
  if (value.state === "unknown") return "待判断";
  if (value.state === "not_applicable") return "不适用";
  if (field && field.definition.kind === "single-select" && typeof value.value === "string") return field.definition.options.find((option) => option.id === value.value)?.label ?? "已停用选项";
  if (field && field.definition.kind === "multi-select" && Array.isArray(value.value)) return value.value.map((optionId) => field.definition.options.find((option) => option.id === optionId)?.label ?? "已停用选项").join("、");
  if (Array.isArray(value.value)) return value.value.join("、");
  if (typeof value.value === "boolean") return value.value ? "是" : "否";
  return String(value.value);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
}

function fileBaseName(title: string) {
  const name = title.trim().replace(/[\\/:*?"<>|]/g, "-");
  return name || "AisenLens-拉片报告";
}

function orderedFields(fields: ResolvedAnalysisField[]) {
  return fields.filter((field) => field.definition.fieldId !== "shot_description" && field.usage.presentation.report?.visible !== false).sort((left, right) => left.usage.order - right.usage.order);
}

function researchRows(input: ReportExportInput) {
  const ranges = input.researchRanges ?? []
  const contexts = input.researchContexts ?? []
  return ranges.map((range) => {
    const context = contexts.find((item) => item.target.kind === "range" && item.target.id === range.id)
    return [range.title, formatTime(range.startUs / 1_000_000), formatTime(range.endUs / 1_000_000), context?.status ?? "未开始", context?.question ?? "", range.observation, range.interpretation, range.summary, String(context?.evidence.length ?? 0)] as Array<string | number>
  })
}

export function createReportCsv(input: ReportExportInput) {
  const fields = orderedFields(input.fields);
  const groupByShotId = new Map(input.groups.flatMap((group) => group.shotIds.map((shotId) => [shotId, group] as const)));
  const header = ["镜号", "起始时间", "结束时间", "时长（秒）", "分组", "画面内容", "镜头分析", ...fields.map((field) => field.definition.label)];
  const rows = input.shots.map((shot, index) => [index + 1, formatTime(shot.start), formatTime(shot.start + shot.duration), shot.duration.toFixed(2), groupByShotId.get(shot.id)?.title ?? "", shot.description, shot.notes, ...fields.map((field) => formatValue(shot.analysisFields[field.definition.fieldId], field))]);
  const appendix = researchRows(input)
  const appendixRows = appendix.length ? [["研究附录"], ["范围", "开始", "结束", "状态", "问题", "观察", "解释", "摘要", "证据数"], ...appendix] : []
  return `\uFEFF${[header, ...rows, ...(appendixRows.length ? [[""]] : []), ...appendixRows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
}

export function createReportHtml(input: ReportExportInput) {
  const fields = orderedFields(input.fields);
  const chapters = buildShotGroupExportChapters(input.groups, input.shots);
  const groupByShotId = new Map(input.groups.flatMap((group) => group.shotIds.map((shotId) => [shotId, group] as const)));
  const chapterSummary = chapters.length ? `<section class="chapters"><h2>分组章节</h2>${chapters.map((chapter) => `<article><h3>${escapeHtml(chapter.title)}</h3><p>${escapeHtml(formatTime(chapter.start))} – ${escapeHtml(formatTime(chapter.end))} · ${chapter.shots.length} 镜</p>${chapter.summary ? `<p>${escapeHtml(chapter.summary)}</p>` : ""}</article>`).join("")}</section>` : "";
  const shots = input.shots.map((shot, index) => {
    const image = shot.screenshotId ? input.screenshotUrls[shot.screenshotId] : null;
    const group = groupByShotId.get(shot.id);
    const values = fields.map((field) => `<dt>${escapeHtml(field.definition.label)}</dt><dd>${escapeHtml(formatValue(shot.analysisFields[field.definition.fieldId], field)) || "—"}</dd>`).join("");
    return `<article class="shot"><div class="shot-image">${image ? `<img src="${image}" alt="分镜 ${index + 1} 代表图">` : "<span>暂无代表图</span>"}</div><div class="shot-content"><p class="eyebrow">镜头 ${String(index + 1).padStart(2, "0")}${group ? ` · ${escapeHtml(group.title)}` : ""}</p><h3>${escapeHtml(formatTime(shot.start))} – ${escapeHtml(formatTime(shot.start + shot.duration))} <small>${shot.duration.toFixed(2)} 秒</small></h3>${shot.description ? `<p>${escapeHtml(shot.description)}</p>` : ""}${shot.notes ? `<p><strong>分析：</strong>${escapeHtml(shot.notes)}</p>` : ""}${values ? `<dl>${values}</dl>` : ""}</div></article>`;
  }).join("");
  const research = researchRows(input)
  const researchSection = research.length ? `<section class="research"><h2>研究附录</h2><table><thead><tr>${["范围", "时间", "状态", "问题", "观察", "解释", "摘要", "证据数"].map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody>${research.map((row) => `<tr>${[row[0], `${row[1]}–${row[2]}`, row[3], row[4], row[5], row[6], row[7], row[8]].map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>` : ""
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.projectTitle)} · 拉片报告</title><style>body{max-width:960px;margin:0 auto;padding:36px 20px;background:#fafafa;color:#1f2937;font:14px/1.6 system-ui,-apple-system,"Microsoft YaHei",sans-serif}h1,h2,h3,p{margin-top:0}header{border-bottom:2px solid #111827;margin-bottom:28px}.eyebrow{color:#6b7280;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.chapters{margin:24px 0}.chapters article{border-top:3px solid #2563eb;padding:10px 14px;margin:8px 0;background:#fff}.research{margin:28px 0}.research table{width:100%;border-collapse:collapse;background:#fff}.research th,.research td{border:1px solid #d1d5db;padding:7px;text-align:left;vertical-align:top;font-size:12px}.shot{display:grid;grid-template-columns:240px 1fr;gap:20px;border:1px solid #d1d5db;background:#fff;padding:16px;margin:14px 0}.shot-image{aspect-ratio:16/9;align-self:center;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280}.shot-image img{width:100%;height:100%;object-fit:cover}.shot h3{font-size:16px;margin-bottom:8px}.shot small{color:#6b7280;font-weight:400}dl{display:grid;grid-template-columns:120px 1fr;gap:4px 12px;margin:14px 0 0}dt{color:#6b7280}dd{margin:0}@media print{body{padding:0}.shot{break-inside:avoid}}@media(max-width:640px){.shot{grid-template-columns:1fr}}</style></head><body><header><p class="eyebrow">AisenLens · 本地生成</p><h1>${escapeHtml(input.projectTitle)}</h1><p>共 ${input.shots.length} 个分镜 · 导出于 ${escapeHtml(new Date().toLocaleString("zh-CN"))}</p></header>${chapterSummary}${researchSection}<main>${shots || "<p>暂无分镜数据。</p>"}</main></body></html>`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function downloadReport(input: ReportExportInput, format: ExportFormat) {
  if (format === "pdf") {
    await printReportAsPdf(input);
    return;
  }
  if (format === "xlsx") {
    await downloadXlsxReport(input);
    return;
  }
  const screenshotUrls = format === "html" ? Object.fromEntries(await Promise.all([...new Set(input.shots.map((shot) => shot.screenshotId).filter((screenshotId): screenshotId is string => Boolean(screenshotId)))].map(async (screenshotId) => {
    const resource = await projectRepository.getScreenshot(screenshotId);
    return [screenshotId, resource ? await blobToDataUrl(resource.blob) : null] as const;
  }))) : input.screenshotUrls;
  const content = format === "csv" ? createReportCsv(input) : createReportHtml({ ...input, screenshotUrls });
  const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName(input.projectTitle)}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function printReportAsPdf(input: ReportExportInput) {
  const preview = window.open("", "_blank");
  if (!preview) throw new Error("浏览器阻止了打印窗口，请允许弹窗后重试。");
  const screenshotUrls = Object.fromEntries(await Promise.all([...new Set(input.shots.map((shot) => shot.screenshotId).filter((screenshotId): screenshotId is string => Boolean(screenshotId)))].map(async (screenshotId) => {
    const resource = await projectRepository.getScreenshot(screenshotId);
    return [screenshotId, resource ? await blobToDataUrl(resource.blob) : null] as const;
  })));
  preview.document.open();
  preview.document.write(createReportHtml({ ...input, screenshotUrls }));
  preview.document.close();
  preview.onload = () => {
    preview.focus();
    preview.print();
  };
}
