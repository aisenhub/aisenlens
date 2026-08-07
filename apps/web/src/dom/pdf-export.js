export function createPdfPageElement(title, columns, items, groupRows = [], includeTitle = true, getCellValue = () => '') {
  const page = document.createElement('div');
  page.style.cssText = 'position:fixed;left:-100000px;top:0;width:1120px;padding:32px;background:#fff;color:#1f2937;font-family:Arial,"Microsoft YaHei",sans-serif;box-sizing:border-box;';
  if (includeTitle) {
    const heading = document.createElement('h1');
    heading.textContent = title;
    heading.style.cssText = 'margin:0 0 18px;text-align:center;font-size:24px;line-height:1.3;';
    page.appendChild(heading);
  }
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;';
  const columnGroup = document.createElement('colgroup');
  columns.forEach(() => {
    const column = document.createElement('col');
    column.style.width = `${100 / Math.max(1, columns.length)}%`;
    columnGroup.appendChild(column);
  });
  table.appendChild(columnGroup);
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach(column => {
    const cell = document.createElement('th');
    cell.textContent = column.label;
    cell.style.cssText = 'box-sizing:border-box;border:1px solid #b8c2cf;background:#eef2f7;padding:8px 6px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word;';
    headRow.appendChild(cell);
  });
  head.appendChild(headRow);
  table.appendChild(head);
  const body = document.createElement('tbody');
  items.forEach(entry => {
    const row = document.createElement('tr');
    columns.forEach(column => {
      const cell = document.createElement('td');
      cell.style.cssText = 'box-sizing:border-box;border:1px solid #b8c2cf;padding:6px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap;line-height:1.35;';
      if (column.key === 'image') {
        const imageSource = entry.image || entry.imageThumbnail;
        if (imageSource) {
          const image = document.createElement('img');
          image.src = imageSource;
          image.alt = column.label;
          image.style.cssText = 'display:block;width:100%;max-height:92px;object-fit:contain;';
          cell.appendChild(image);
        } else {
          cell.textContent = '—';
        }
      } else {
        cell.textContent = getCellValue(entry, column) || '—';
      }
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  if (!items.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = columns.length;
    cell.textContent = '暂无镜头数据';
    cell.style.cssText = 'border:1px solid #b8c2cf;padding:18px;text-align:center;color:#94a3b8;';
    row.appendChild(cell);
    body.appendChild(row);
  }
  table.appendChild(body);
  page.appendChild(table);
  if (groupRows.length) {
    const groupTitle = document.createElement('h2');
    groupTitle.textContent = '镜头组分析';
    groupTitle.style.cssText = 'margin:24px 0 10px;font-size:18px;';
    page.appendChild(groupTitle);
    const groupTable = document.createElement('table');
    groupTable.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;';
    const groupColumnGroup = document.createElement('colgroup');
    [1.4, 1, 1.3, 0.5, 2.5].forEach(weight => {
      const column = document.createElement('col');
      column.style.width = `${weight / 6.7 * 100}%`;
      groupColumnGroup.appendChild(column);
    });
    groupTable.appendChild(groupColumnGroup);
    const groupHeaders = ['组名称', '镜头范围', '时间范围', '镜头数', '概括分析'];
    const groupHead = document.createElement('tr');
    groupHeaders.forEach(label => {
      const cell = document.createElement('th');
      cell.textContent = label;
      cell.style.cssText = 'box-sizing:border-box;border:1px solid #b8c2cf;background:#eef2f7;padding:8px 6px;text-align:center;overflow-wrap:anywhere;';
      groupHead.appendChild(cell);
    });
    const groupHeadSection = document.createElement('thead');
    groupHeadSection.appendChild(groupHead);
    groupTable.appendChild(groupHeadSection);
    const groupBody = document.createElement('tbody');
    groupRows.forEach(group => {
      const row = document.createElement('tr');
      [group.title, group.shotRange, group.timeRange, group.count, group.summary || '—'].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        cell.style.cssText = 'box-sizing:border-box;border:1px solid #b8c2cf;padding:6px;text-align:center;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap;';
        row.appendChild(cell);
      });
      groupBody.appendChild(row);
    });
    groupTable.appendChild(groupBody);
    page.appendChild(groupTable);
  }
  return page;
}
