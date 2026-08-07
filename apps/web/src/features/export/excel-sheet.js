import { getExcelColumnName } from './excel-export.js';
import { sortExportEntries } from './export-service.js';

function escapeExcelXml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[character]));
}

function textWidth(value) {
  return String(value ?? '').split('').reduce((sum, character) => sum + (character.charCodeAt(0) > 255 ? 2 : 1), 0);
}

export function buildExcelSheet(entries = [], {
  columns = [],
  title = '',
  getCellValue = () => ''
} = {}) {
  const items = sortExportEntries(entries);
  const targetW = 174;
  const imageInset = 3;
  const getCellText = (entry, column) => {
    if (column.key === 'shotNumber') return entry.shotNumber ?? '';
    if (column.key === 'duration') return entry.durationSec ?? 0;
    if (column.key === 'image') return '';
    return getCellValue(entry, column);
  };
  const getColumnWidth = column => {
    if (column.key === 'image') return 25.7;
    const contentWidth = Math.max(textWidth(column.label), ...items.map(entry => textWidth(getCellText(entry, column))));
    const minWidth = column.key === 'shotNumber' ? 8 : column.key === 'duration' ? 10 : 14;
    return Math.min(36, Math.max(minWidth, contentWidth + 2));
  };
  const columnWidths = columns.map(getColumnWidth);
  const getWrappedLineCount = (value, width) => String(value ?? '').split(/\r?\n/).reduce((total, line) => {
    return total + Math.max(1, Math.ceil(textWidth(line) / Math.max(1, width - 1)));
  }, 0);
  const getRowHeight = entry => {
    const textHeight = columns.reduce((maxHeight, column, index) => {
      if (column.key === 'image') return maxHeight;
      return Math.max(maxHeight, getWrappedLineCount(getCellText(entry, column), columnWidths[index]) * 15 + 4);
    }, 0);
    const aspect = (entry.width && entry.height) ? (entry.height / entry.width) : (9 / 16);
    const imageHeight = entry.image ? (targetW * aspect + imageInset * 2) * 0.75 : 0;
    return Math.max(19, Math.round(textHeight), Math.round(imageHeight));
  };
  const headers = columns.map(column => column.label);
  const headerRowHeight = Math.max(22, ...columns.map((column, index) => getWrappedLineCount(column.label, columnWidths[index]) * 15 + 4));
  const rowsXml = [
    `<row r="1" ht="28" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>${escapeExcelXml(title)}</t></is></c></row>`,
    `<row r="2" ht="${headerRowHeight}" customHeight="1">${headers.map(header => `<c s="3" t="inlineStr"><is><t>${escapeExcelXml(header)}</t></is></c>`).join('')}</row>`
  ];
  items.forEach((entry, index) => {
    const row = index + 3;
    const cells = columns.map(column => {
      if (column.key === 'shotNumber') return `<c s="2" t="n"><v>${entry.shotNumber}</v></c>`;
      if (column.key === 'duration') return `<c s="2" t="n"><v>${entry.durationSec ?? 0}</v></c>`;
      if (column.key === 'image') return '<c s="2" t="inlineStr"><is><t></t></is></c>';
      return `<c s="2" t="inlineStr"><is><t>${escapeExcelXml(getCellValue(entry, column))}</t></is></c>`;
    });
    rowsXml.push(`<row r="${row}" ht="${getRowHeight(entry)}" customHeight="1">${cells.join('')}</row>`);
  });
  const lastColumn = getExcelColumnName(columns.length - 1);
  const colsXml = columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${colsXml}</cols><sheetData>${rowsXml.join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells><drawing r:id="rId1"/></worksheet>`;
  return {
    items,
    targetW,
    imageInset,
    imageColumn: columns.findIndex(column => column.key === 'image'),
    columnWidths,
    getRowHeight,
    sheetXml
  };
}
