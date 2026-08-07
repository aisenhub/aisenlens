import { dataUrlToUint8Array, escapeExcelXml } from './excel-export.js';
import { buildExcelSheet } from './excel-sheet.js';

const esc = escapeExcelXml;

export async function buildXlsxWorkbook(entries = [], { columns = [], title = '', groupRows = [], getCellValue = () => '', JsZip, dataUrlToBytes = dataUrlToUint8Array } = {}) {
  const {
    items,
    targetW,
    imageInset,
    imageColumn,
    getRowHeight,
    sheetXml
  } = buildExcelSheet(entries, {
    columns,
    title,
    getCellValue
  });
  const groupExportRows = groupRows;
  const groupHeaders = ['组名称', '镜头范围', '时间范围', '镜头数', '概括分析'];
  const groupRowsXml = [`<row r="1" ht="28" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>镜头组分析</t></is></c></row>`, `<row r="2" ht="22" customHeight="1">${groupHeaders.map(header => `<c s="3" t="inlineStr"><is><t>${esc(header)}</t></is></c>`).join('')}</row>`];
  groupExportRows.forEach((group, index) => {
    const row = index + 3;
    const values = [group.title, group.shotRange, group.timeRange, group.count, group.summary || ''];
    groupRowsXml.push(`<row r="${row}" ht="30" customHeight="1">${values.map((value, valueIndex) => `<c s="2" t="${valueIndex === 3 ? 'n' : 'inlineStr'}">${valueIndex === 3 ? `<v>${value}</v>` : `<is><t>${esc(value)}</t></is>`}</c>`).join('')}</row>`);
  });
  const groupColsXml = [24, 16, 28, 10, 60].map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const groupSheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${groupColsXml}</cols><sheetData>${groupRowsXml.join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells></worksheet>`;
  const zip = new JsZip();
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9FAAB7"/></left><right style="thin"><color rgb="FF9FAAB7"/></right><top style="thin"><color rgb="FF9FAAB7"/></top><bottom style="thin"><color rgb="FF9FAAB7"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Default Extension="jpeg" ContentType="image/jpeg"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="拉片" sheetId="1" r:id="rId1"/><sheet name="镜头组分析" sheetId="2" r:id="rId3"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`);
  zip.file('xl/worksheets/sheet2.xml', groupSheetXml);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  const anchors = [], rels = [];
  let imgIndex = 1;
  const headerRowIndex = 2;
  items.forEach((e, idx) => {
    const row = headerRowIndex + idx;
    const aspect = (e.width && e.height) ? (e.height / e.width) : (9 / 16);
    const hPx = Math.round(targetW * aspect);
    const rowHeightPx = getRowHeight(e) / 0.75;
    const rowInset = Math.max(imageInset, Math.round((rowHeightPx - hPx) / 2));
    const cx = targetW * 9525;
    const cy = hPx * 9525;
    const addImage = (dataUrl, col) => {
      const id = `rId${imgIndex}`;
      anchors.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${imageInset * 9525}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${rowInset * 9525}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${imgIndex}" name="Picture ${imgIndex}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:embed="${id}"/><a:stretch xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
      rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${imgIndex}.jpeg"/>`);
      zip.file(`xl/media/image${imgIndex}.jpeg`, dataUrlToBytes(dataUrl));
      imgIndex++;
    };
    if (e.image && imageColumn >= 0) addImage(e.image, imageColumn);
  });
  zip.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join('')}</xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${rels.join('')}</Relationships>`);
  return zip.generateAsync({ type: 'blob' });
}
