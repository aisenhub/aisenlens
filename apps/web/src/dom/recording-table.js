export function createRecordingTableRenderer({
  state,
  getEntries,
  getColumns,
  getCellValue,
  getThumbnail,
  video,
  drawImageContain,
  drawRoundedPath,
  drawWrappedText
} = {}) {
  const getImage = source => {
    if (!source) return null;
    if (state.imageCache.has(source)) return state.imageCache.get(source);
    const image = new Image();
    image.src = source;
    state.imageCache.set(source, image);
    return image;
  };

  const getCurrentEntry = (entries, currentTime) => {
    let current = entries[0] || null;
    for (const entry of entries) {
      if (Number(entry.time) <= currentTime) current = entry;
      else break;
    }
    return current;
  };

  const getCurrentTime = () => {
    const videoTime = Number(video?.currentTime);
    if (Number.isFinite(videoTime)) return videoTime;
    const mediaTime = Number(state.mediaTime);
    return Number.isFinite(mediaTime) ? mediaTime : Number(video?.currentTime) || 0;
  };

  const renderTable = (context, x, y, width, height) => {
    const columns = state.tableColumns.length ? state.tableColumns : getColumns();
    const lightTheme = document.documentElement.getAttribute('data-theme') !== 'dark';
    const borderColor = lightTheme ? '#D1D5DB' : '#FFFFFF';
    const gridColor = lightTheme ? 'rgba(17,24,39,.18)' : 'rgba(255,255,255,.22)';
    const background = lightTheme ? '#FFFFFF' : '#141821';
    const headerBackground = lightTheme ? '#F3F5F8' : '#1A1F2C';
    const textColor = lightTheme ? '#374151' : '#E5E7EB';
    const headerTextColor = lightTheme ? '#111827' : '#F8FAFC';
    const sortedEntries = state.tableEntries.length ? state.tableEntries : [...(getEntries?.() || [])].sort((a, b) => Number(a.time) - Number(b.time));
    const headerHeight = 32;
    const bodyHeight = Math.max(1, height - headerHeight);
    const rowCount = sortedEntries.length ? Math.min(sortedEntries.length, Math.max(1, Math.floor(bodyHeight / 78))) : 1;
    const rowHeight = bodyHeight / rowCount;
    const currentEntry = getCurrentEntry(sortedEntries, getCurrentTime());
    const currentIndex = currentEntry ? Math.max(0, sortedEntries.indexOf(currentEntry)) : 0;
    const startIndex = Math.max(0, Math.min(currentIndex - Math.floor((rowCount - 1) / 2), Math.max(0, sortedEntries.length - rowCount)));
    const visibleEntries = sortedEntries.slice(startIndex, startIndex + rowCount);
    const units = columns.map(column => column.key === 'image' ? 2.4 : column.key === 'shotNumber' ? 0.8 : column.key === 'duration' ? 1 : 2.2);
    const totalUnits = units.reduce((sum, value) => sum + value, 0) || 1;
    const widths = units.map(value => width * value / totalUnits);

    context.save();
    drawRoundedPath(context, x, y, width, height, 0);
    context.clip();
    context.fillStyle = background;
    context.fillRect(x, y, width, height);
    context.fillStyle = headerBackground;
    context.fillRect(x, y, width, headerHeight);
    visibleEntries.forEach((entry, index) => {
      const rowY = y + headerHeight + index * rowHeight;
      context.fillStyle = entry === currentEntry ? (lightTheme ? '#EEF5FF' : '#1D2A40') : background;
      context.fillRect(x, rowY, width, rowHeight);
    });
    context.strokeStyle = gridColor;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y + headerHeight + 0.5);
    context.lineTo(x + width, y + headerHeight + 0.5);
    visibleEntries.forEach((entry, index) => {
      const lineY = y + headerHeight + (index + 1) * rowHeight + 0.5;
      context.moveTo(x, lineY);
      context.lineTo(x + width, lineY);
    });
    let separatorX = x;
    widths.slice(0, -1).forEach(columnWidth => {
      separatorX += columnWidth;
      context.moveTo(separatorX + 0.5, y);
      context.lineTo(separatorX + 0.5, y + height);
    });
    context.stroke();
    context.fillStyle = headerTextColor;
    context.font = '600 13px system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    let columnX = x;
    columns.forEach((column, index) => {
      drawWrappedText(context, column.label, columnX + widths[index] / 2, y + headerHeight / 2, widths[index] - 10, 1, 16);
      columnX += widths[index];
    });
    visibleEntries.forEach((entry, rowIndex) => {
      const rowY = y + headerHeight + rowIndex * rowHeight;
      context.fillStyle = textColor;
      context.font = '500 12px system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif';
      let cellX = x;
      columns.forEach((column, columnIndex) => {
        const cellWidth = widths[columnIndex];
        if (column.key === 'image') {
          const inset = 7;
          context.fillStyle = lightTheme ? '#F8FAFC' : '#10151E';
          context.fillRect(cellX + inset - 1, rowY + inset - 1, cellWidth - inset * 2 + 2, rowHeight - inset * 2 + 2);
          drawImageContain(context, getImage(getThumbnail(entry)), cellX + inset, rowY + inset, cellWidth - inset * 2, rowHeight - inset * 2);
        } else {
          const value = getCellValue(entry, column) || '—';
          context.fillStyle = value === '—' ? '#94A3B8' : textColor;
          drawWrappedText(context, value, cellX + cellWidth / 2, rowY + rowHeight / 2, cellWidth - 12, 3, 17);
        }
        cellX += cellWidth;
      });
      if (entry === currentEntry) {
        context.fillStyle = '#16A9F3';
        context.fillRect(x, rowY, 3, rowHeight);
      }
    });
    context.restore();
    drawRoundedPath(context, x + 0.5, y + 0.5, width - 1, height - 1, 0);
    context.strokeStyle = borderColor;
    context.stroke();
  };

  const prepare = () => {
    state.tableColumns = getColumns();
    state.tableEntries = [...(getEntries?.() || [])].sort((a, b) => Number(a.time) - Number(b.time));
    state.tableCacheCanvas = null;
    state.tableCacheKey = '';
  };

  const preload = async () => {
    const sources = [...new Set(state.tableEntries.map(getThumbnail).filter(Boolean))];
    await Promise.all(sources.map(source => {
      const image = getImage(source);
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
    }));
  };

  const draw = (context, x, y, width, height) => {
    const columns = state.tableColumns.length ? state.tableColumns : getColumns();
    const entries = state.tableEntries.length ? state.tableEntries : [...(getEntries?.() || [])].sort((a, b) => Number(a.time) - Number(b.time));
    const rowCount = entries.length ? Math.min(entries.length, Math.max(1, Math.floor(Math.max(1, height - 32) / 78))) : 1;
    const currentEntry = getCurrentEntry(entries, getCurrentTime());
    const currentIndex = currentEntry ? Math.max(0, entries.indexOf(currentEntry)) : 0;
    const startIndex = Math.max(0, Math.min(currentIndex - Math.floor((rowCount - 1) / 2), Math.max(0, entries.length - rowCount)));
    const key = [document.documentElement.getAttribute('data-theme') || 'light', width, height, startIndex, currentEntry?.shotId || currentEntry?.shotNumber || 'empty', columns.map(column => `${column.key}:${column.field || ''}:${column.label}`).join('|')].join('~');
    if (state.tableCacheCanvas && state.tableCacheKey === key) {
      context.drawImage(state.tableCacheCanvas, x, y, width, height);
      return;
    }
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = Math.max(1, Math.ceil(width));
    cacheCanvas.height = Math.max(1, Math.ceil(height));
    renderTable(cacheCanvas.getContext('2d'), 0, 0, width, height);
    state.tableCacheCanvas = cacheCanvas;
    state.tableCacheKey = key;
    context.drawImage(cacheCanvas, x, y, width, height);
  };

  return { prepare, preload, draw };
}
