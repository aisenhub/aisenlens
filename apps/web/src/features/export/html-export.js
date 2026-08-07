import { sortExportEntries } from './export-service.js';
import { escapeTemplateText } from '../../utils/text.js';
import { isPersistentScreenshot } from '../../utils/screenshot.js';

export function buildHtmlExport(entries = [], {
  columns = [],
  title = '',
  groupRows = [],
  getCellValue = () => ''
} = {}) {
  const headers = columns.map(column => `<th>${escapeTemplateText(column.label)}</th>`).join('');
  const rows = sortExportEntries(entries).map(entry => {
    const cells = columns.map(column => {
      if (column.key === 'image') {
        const imageSource = isPersistentScreenshot(entry.image) ? entry.image : '';
        return `<td>${imageSource ? `<img src="${escapeTemplateText(imageSource)}" alt="${escapeTemplateText(column.label)}" loading="lazy" decoding="async">` : '<span class="empty-cell">—</span>'}</td>`;
      }
      const value = getCellValue(entry, column);
      return `<td>${value ? escapeTemplateText(value) : '<span class="empty-cell">—</span>'}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  const safeTitle = escapeTemplateText(title);
  const groupSection = groupRows.length
    ? `<h2>镜头组分析</h2><table><thead><tr><th>组名称</th><th>镜头范围</th><th>时间范围</th><th>镜头数</th><th>概括分析</th></tr></thead><tbody>${groupRows.map(group => `<tr><td>${escapeTemplateText(group.title)}</td><td>${escapeTemplateText(group.shotRange)}</td><td>${escapeTemplateText(group.timeRange)}</td><td>${group.count}</td><td>${escapeTemplateText(group.summary || '—')}</td></tr>`).join('')}</tbody></table>`
    : '';
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{margin:24px;background:#f5f7fa;color:#1f2937;font-family:Arial,"Microsoft YaHei",sans-serif}h1{font-size:22px;text-align:center;margin:0 0 16px}h2{font-size:18px;margin:28px 0 12px}table{width:100%;border-collapse:collapse;background:#fff;table-layout:fixed}th,td{border:1px solid #d8dee8;padding:8px 10px;text-align:center;vertical-align:middle;word-break:break-word}th{background:#eef2f7;font-weight:600}.empty-cell{color:#cbd5e1}td img{display:block;width:180px;max-width:100%;height:auto;margin:auto;object-fit:contain}</style></head><body><h1>${safeTitle}</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="${columns.length}">暂无镜头数据</td></tr>`}</tbody></table>${groupSection}</body></html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
