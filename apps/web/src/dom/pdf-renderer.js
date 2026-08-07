import { sortExportEntries } from '../features/export/export-service.js';
import { messages } from '../app/messages.js';

export async function renderPdfExport(exportEntries = [], { jsPDFCtor, html2canvas, columns = [], title = '', groupRows = [], createPage, getCellValue = () => '', getLayout, getChunk, getImageHeight, isCancelled = () => false, onProgress = () => {} } = {}) {
  const items = sortExportEntries(exportEntries);
  const pdf = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const { margin, maxWidth, maxHeight } = getLayout();
  const chunkSize = 10;
  let pageNumber = 0;
  let completedItems = 0;
  const throwIfCancelled = () => {
    if (isCancelled()) throw Object.assign(new Error(messages.exportCancelled), { name: 'AbortError' });
  };
  onProgress(0, Math.max(1, items.length));
  const waitForImages = async page => {
    throwIfCancelled();
    const images = [...page.querySelectorAll('img')];
    await Promise.all(images.map(image => new Promise(resolve => {
      if (image.complete) { resolve(); return; }
      const check = () => {
        if (image.complete || isCancelled()) resolve();
        else setTimeout(check, 50);
      };
      image.onload = resolve;
      image.onerror = resolve;
      check();
    })));
    await new Promise(resolve => requestAnimationFrame(resolve));
    throwIfCancelled();
  };
  const renderPage = async page => {
    throwIfCancelled();
    const canvas = await html2canvas(page, { backgroundColor: '#ffffff', scale: 1, useCORS: false, logging: false });
    try {
      throwIfCancelled();
      const imageHeight = getImageHeight(canvas.width, canvas.height, maxWidth, maxHeight);
      if (pageNumber > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', margin, margin, maxWidth, Math.min(maxHeight, imageHeight), undefined, 'FAST');
      pageNumber++;
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  };
  const renderItemsPage = async (pageItems, includeTitle, pageGroups) => {
    let end = pageItems.length;
    let page = null;
    try {
      while (end > 0) {
        throwIfCancelled();
        if (page) page.remove();
        page = createPage(
          title,
          columns,
          pageItems.slice(0, end),
          pageGroups && end === pageItems.length ? pageGroups : [],
          includeTitle,
          getCellValue
        );
        document.body.appendChild(page);
        await waitForImages(page);
        const maxCanvasHeight = page.offsetWidth * maxHeight / maxWidth;
        if (page.offsetHeight <= maxCanvasHeight || end === 1) break;
        end--;
      }
      await renderPage(page);
    } finally {
      if (page) page.remove();
    }
    return end;
  };
  if (!items.length) {
    throwIfCancelled();
    const page = createPage(title, columns, [], [], true, getCellValue);
    document.body.appendChild(page);
    try {
      await waitForImages(page);
      await renderPage(page);
      completedItems = 1;
      onProgress(completedItems, 1);
    } finally {
      page.remove();
    }
  }
  for (let index = 0; index < items.length;) {
    throwIfCancelled();
    const candidateItems = getChunk(items, index, chunkSize);
    const pageGroups = index + candidateItems.length >= items.length ? groupRows : [];
    const renderedCount = await renderItemsPage(candidateItems, index === 0, pageGroups);
    index += renderedCount;
    completedItems = index;
    onProgress(completedItems, items.length);
  }
  return pdf.output('blob');
}
