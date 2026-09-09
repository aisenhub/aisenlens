import { buildShotGroupExportChapters } from "../../group/services/groupExportService";
import projectRepository from "../../project/services/projectRepository";
import type { AnalysisFieldValue, TemplateField } from "../../template/types";
import type { ReportExportInput } from "../types";

const encoder = new TextEncoder();

function xml(value: string | number) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function columnName(index: number) {
  let current = index + 1;
  let name = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function valueText(value: AnalysisFieldValue) {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "boolean") return value ? "是" : "否";
  return value == null ? "" : String(value);
}

function timecode(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
}

function cell(reference: string, value: string | number, style = 2, numeric = false) {
  return numeric ? `<c r="${reference}" s="${style}"><v>${value}</v></c>` : `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function crc32(input: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of input) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function uint16(value: number) { const bytes = new Uint8Array(2); new DataView(bytes.buffer).setUint16(0, value, true); return bytes; }
function uint32(value: number) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, value, true); return bytes; }

function createZip(files: Array<{ name: string; data: Uint8Array }>) {
  let offset = 0;
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const local = concat([uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(file.data.length), uint32(file.data.length), uint16(name.length), uint16(0), name, file.data]);
    locals.push(local);
    central.push(concat([uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(file.data.length), uint32(file.data.length), uint16(name.length), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), name]));
    offset += local.length;
  }
  const directory = concat(central);
  return concat([...locals, directory, uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length), uint32(directory.length), uint32(offset), uint16(0)]);
}

function baseName(title: string) {
  return title.trim().replace(/[\\/:*?"<>|]/g, "-") || "AisenLens-拉片报告";
}

export async function downloadXlsxReport(input: ReportExportInput) {
  const fields = input.fields.filter((field) => !field.isFixed).sort((left, right) => left.order - right.order);
  const groupByShotId = new Map(input.groups.flatMap((group) => group.shotIds.map((shotId) => [shotId, group] as const)));
  const screenshots = await Promise.all(input.shots.map(async (shot) => shot.screenshotId ? projectRepository.getScreenshot(shot.screenshotId) : null));
  const headers = ["镜号", "起始时间", "结束时间", "时长（秒）", "分组", "代表截图", "画面内容", "镜头分析", ...fields.map((field) => field.label)];
  const widths = [8, 13, 13, 12, 18, 27, 34, 38, ...fields.map(() => 18)];
  const rows = [`<row r="1" ht="28" customHeight="1">${cell("A1", `${input.projectTitle} · 拉片分镜表`, 1)}</row>`, `<row r="2" ht="28" customHeight="1">${headers.map((header, index) => cell(`${columnName(index)}2`, header, 3)).join("")}</row>`];
  input.shots.forEach((shot, index) => {
    const row = index + 3;
    const values: Array<string | number> = [index + 1, timecode(shot.start), timecode(shot.start + shot.duration), Number(shot.duration.toFixed(2)), groupByShotId.get(shot.id)?.title ?? "", "", shot.description, shot.notes, ...fields.map((field) => valueText(shot.analysisFields[field.id] ?? null))];
    rows.push(`<row r="${row}" ht="78" customHeight="1">${values.map((value, column) => cell(`${columnName(column)}${row}`, value, 2, column === 0 || column === 3)).join("")}</row>`);
  });
  const lastColumn = columnName(headers.length - 1);
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const sheet1 = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${columns}</cols><sheetData>${rows.join("")}</sheetData><mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells><drawing r:id="rId1"/></worksheet>`;
  const chapters = buildShotGroupExportChapters(input.groups, input.shots);
  const groupRows = [`<row r="1" ht="28" customHeight="1">${cell("A1", `${input.projectTitle} · 分组章节`, 1)}</row>`, `<row r="2" ht="24" customHeight="1">${["类别", "名称", "镜头范围", "时间范围", "镜头数", "分析"].map((header, index) => cell(`${columnName(index)}2`, header, 3)).join("")}</row>`, ...chapters.map((chapter, index) => { const row = index + 3; const start = input.shots.findIndex((shot) => shot.id === chapter.shots[0]?.id) + 1; const end = input.shots.findIndex((shot) => shot.id === chapter.shots.at(-1)?.id) + 1; const kind = chapter.kind === "scene" ? "场景" : chapter.kind === "section" ? "段落" : "序列"; return `<row r="${row}" ht="36" customHeight="1">${[kind, chapter.title, `#${String(start).padStart(2, "0")} – #${String(end).padStart(2, "0")}`, `${timecode(chapter.start)} – ${timecode(chapter.end)}`, chapter.shots.length, chapter.summary].map((value, column) => cell(`${columnName(column)}${row}`, value, 2, column === 4)).join("")}</row>`; })];
  const sheet2 = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${[12, 24, 18, 24, 10, 52].map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${groupRows.join("")}</sheetData><mergeCells count="1"><mergeCell ref="A1:F1"/></mergeCells></worksheet>`;
  const researchRows = (input.researchRanges ?? []).map((range, index) => { const context = (input.researchContexts ?? []).find((item) => item.target.kind === "range" && item.target.id === range.id); const row = index + 3; return `<row r="${row}" ht="52" customHeight="1">${[range.title, timecode(range.startUs / 1_000_000), timecode(range.endUs / 1_000_000), context?.status ?? "未开始", context?.question ?? "", range.observation, range.interpretation, range.summary, context?.evidence.length ?? 0].map((value, column) => cell(`${columnName(column)}${row}`, value, 2, column === 8)).join("")}</row>` });
  const researchHeaders = ["范围", "开始", "结束", "状态", "问题", "观察", "解释", "摘要", "证据数"];
  const sheet3 = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${[24, 13, 13, 14, 30, 34, 34, 40, 10].map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData><row r="1" ht="28" customHeight="1">${cell("A1", `${input.projectTitle} · 研究附录`, 1)}</row><row r="2" ht="24" customHeight="1">${researchHeaders.map((header, index) => cell(`${columnName(index)}2`, header, 3)).join("")}</row>${researchRows.join("")}</sheetData><mergeCells count="1"><mergeCell ref="A1:I1"/></mergeCells></worksheet>`;
  const imageFiles: Array<{ name: string; data: Uint8Array }> = [];
  const anchors: string[] = [];
  const imageRelations: string[] = [];
  for (const [index, resource] of screenshots.entries()) {
    if (!resource) continue;
    const imageIndex = imageFiles.length + 1;
    imageFiles.push({ name: `xl/media/image${imageIndex}.jpeg`, data: new Uint8Array(await resource.blob.arrayBuffer()) });
    const row = index + 2;
    anchors.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>5</xdr:col><xdr:colOff>138112</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>66675</xdr:rowOff></xdr:from><xdr:ext cx="1524000" cy="857250"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${imageIndex}" name="代表截图 ${imageIndex}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:embed="rId${imageIndex}"/><a:stretch xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
    imageRelations.push(`<Relationship Id="rId${imageIndex}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${imageIndex}.jpeg"/>`);
  }
  const files = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="分镜表" sheetId="1" r:id="rId1"/><sheet name="分组章节" sheetId="2" r:id="rId2"/><sheet name="研究附录" sheetId="3" r:id="rId4"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet1) }, { name: "xl/worksheets/sheet2.xml", data: encoder.encode(sheet2) }, { name: "xl/worksheets/sheet3.xml", data: encoder.encode(sheet3) },
    { name: "xl/worksheets/_rels/sheet1.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`) },
    { name: "xl/drawings/drawing1.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join("")}</xdr:wsDr>`) },
    { name: "xl/drawings/_rels/drawing1.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRelations.join("")}</Relationships>`) },
    ...imageFiles,
  ];
  const url = URL.createObjectURL(new Blob([createZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName(input.projectTitle)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
