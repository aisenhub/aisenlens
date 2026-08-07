import { createPdfPageElement } from './pdf-export.js';
import { renderPdfExport } from './pdf-renderer.js';
import { buildXlsxWorkbook } from '../features/export/excel-workbook.js';
import { buildShotGroupExportRows } from '../features/export/export-service.js';
import { buildHtmlExport } from '../features/export/html-export.js';
import { getPdfExportChunk, getPdfExportLayout, getPdfImageHeight } from '../features/export/pdf-export.js';
import { createStateMachine } from '../app/state-machine.js';
import { messages } from '../app/messages.js';
import { formatUserError, normalizeAppError } from '../app/diagnostics.js';

export function createExportController({
  elements = {},
  getEntries,
  getShotGroups,
  getSettings,
  saveSettings,
  getColumns,
  getCellValue,
  getTemplateCellValue,
  getGroupMembers,
  formatTime,
  hydrateScreenshots,
  releaseScreenshots,
  showProgress,
  updateProgressMessage,
  updateProgress,
  hideProgress,
  showToast,
  requestAnimationFrameFn = () => new Promise(resolve => requestAnimationFrame(resolve)),
  getTemplateTitle,
  getProjectTitle = () => '',
  getCurrentProjectId,
  documentTarget = globalThis.document
} = {}) {
  let jsZipPromise = null;
  let pdfLibrariesPromise = null;
  const exportMachine = createStateMachine({
    initial: 'idle',
    transitions: {
      idle: { start: 'exporting' },
      exporting: { cancel: 'cancelled', complete: 'idle', fail: 'failed' },
      cancelled: { reset: 'idle' },
      failed: { reset: 'idle' }
    }
  });
  const isExportCancelled = () => exportMachine.state === 'cancelled';
  const ensureJsZipLoaded = () => {
    if (!jsZipPromise) jsZipPromise = import('jszip').then(module => module.default || module);
    return jsZipPromise;
  };

  const ensurePdfLibrariesLoaded = () => {
    if (!pdfLibrariesPromise) {
      pdfLibrariesPromise = Promise.all([import('html2canvas'), import('jspdf')]).then(([canvasModule, pdfModule]) => ({
        html2canvas: canvasModule.default || canvasModule,
        jsPDF: pdfModule.jsPDF
      }));
    }
    return pdfLibrariesPromise;
  };

  const download = (filename, data) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain' });
    const link = documentTarget.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    (documentTarget.body || documentTarget.documentElement).appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getGroupRows = () => buildShotGroupExportRows(getShotGroups?.() || [], getEntries?.() || [], {
    getMembers: getGroupMembers,
    formatTime
  });

  const getExportDefaults = () => {
    const title = String(getProjectTitle?.() || '').trim();
    return {
      fileName: title || getSettings?.().exportFileName || 'AisenLens',
      title: title || getSettings?.().exportTitle || '拉片表格'
    };
  };

  const buildPdfExport = async exportEntries => {
    const libraries = await ensurePdfLibrariesLoaded();
    return renderPdfExport(exportEntries, {
      jsPDFCtor: libraries.jsPDF,
      html2canvas: libraries.html2canvas,
      columns: getColumns?.(),
      title: getTemplateTitle?.(),
      groupRows: getGroupRows(),
      createPage: createPdfPageElement,
      getCellValue,
      getLayout: getPdfExportLayout,
      getChunk: getPdfExportChunk,
      getImageHeight: getPdfImageHeight,
      isCancelled: isExportCancelled,
      onProgress: (current, total) => updateProgress?.(current, total)
    });
  };

  const buildXlsx = async exportEntries => {
    const JsZip = await ensureJsZipLoaded();
    return buildXlsxWorkbook(exportEntries, {
      columns: getColumns?.(),
      title: getTemplateTitle?.(),
      groupRows: getGroupRows(),
      getCellValue: getTemplateCellValue,
      JsZip
    });
  };

  const runExport = async (format = getSettings?.().exportFormat) => {
    if (!exportMachine.transition('start')) return false;
    const entries = getEntries?.() || [];
    const title = format === 'pdf' ? '正在导出 PDF' : format === 'html' ? '正在导出 HTML' : '正在导出 Excel';
    showProgress?.(0, title, {
      blocking: true,
      indeterminate: format !== 'pdf',
      allowPause: false,
      stopLabel: '取消导出',
      message: `准备导出 ${entries.length} 个分镜…`
    });
    try {
      await requestAnimationFrameFn();
      if (isExportCancelled()) throw Object.assign(new Error(messages.exportCancelled), { name: 'AbortError' });
      const hydrated = await hydrateScreenshots?.(getCurrentProjectId?.(), entries);
      let blob;
      try {
        if (format === 'html') {
          updateProgressMessage?.('正在生成 HTML 文件…');
          blob = buildHtmlExport(entries, {
            columns: getColumns?.(),
            title: getTemplateTitle?.(),
            groupRows: getGroupRows(),
            getCellValue
          });
          updateProgress?.(1, 1);
        } else if (format === 'pdf') {
          updateProgressMessage?.('正在生成 PDF 文件…');
          blob = await buildPdfExport(entries);
        } else {
          updateProgressMessage?.('正在生成 Excel 文件…');
          blob = await buildXlsx(entries);
          updateProgress?.(1, 1);
        }
      } finally {
        releaseScreenshots?.(hydrated);
      }
      if (isExportCancelled()) throw Object.assign(new Error(messages.exportCancelled), { name: 'AbortError' });
      if (blob) download(`${getSettings?.().exportFileName || 'AisenLens'}.${format === 'html' ? 'html' : format === 'pdf' ? 'pdf' : 'xlsx'}`, blob);
      else showToast?.(`${messages.exportFailed}：文件未生成，请重试。`, 'error');
      exportMachine.transition('complete');
    } catch (error) {
      if (error?.name === 'AbortError' || isExportCancelled()) {
        showToast?.(messages.exportCancelled, 'info');
        exportMachine.reset('idle');
        return;
      }
      const diagnostic = normalizeAppError(error, {
        code: 'EXPORT_FAILED',
        title: messages.exportFailed,
        action: '请检查分镜数据和浏览器存储空间后重试。'
      });
      console.error('导出失败:', diagnostic);
      showToast?.(formatUserError(diagnostic), 'error');
      exportMachine.transition('fail');
      exportMachine.reset('idle');
    } finally {
      hideProgress?.();
    }
    return true;
  };

  const cancelExport = () => {
    exportMachine.transition('cancel');
  };

  const openTableModal = () => {
    const modal = elements.tableModal;
    if (!modal) return;
    const settings = getSettings?.() || {};
    const input = documentTarget?.querySelector?.(`input[name="tableExportFormat"][value="${settings.exportFormat}"]`);
    if (input) input.checked = true;
    const defaults = getExportDefaults();
    if (elements.fileNameInput) elements.fileNameInput.value = defaults.fileName;
    if (elements.titleInput) elements.titleInput.value = defaults.title;
    syncExportMode(settings.exportFormat);
    modal.classList.add('show');
  };

  const syncExportMode = format => {
    const isRecording = format === 'recording';
    if (elements.tableModal) elements.tableModal.dataset.exportMode = isRecording ? 'recording' : 'table';
    if (elements.tableExport) elements.tableExport.textContent = isRecording ? '开始录制' : '开始导出';
  };

  const bind = () => {
    elements.exportButton?.addEventListener('click', openTableModal);
    elements.tableModal?.addEventListener('click', event => { if (event.target === elements.tableModal) elements.tableModal.classList.remove('show'); });
    [elements.tableCancel, elements.tableClose].forEach(button => button?.addEventListener('click', () => elements.tableModal?.classList.remove('show')));
    documentTarget?.querySelectorAll?.('input[name="tableExportFormat"]').forEach(input => input.addEventListener('change', () => {
      if (!input.checked) return;
      syncExportMode(input.value);
      if (input.value !== 'recording') saveSettings?.({ ...getSettings?.(), exportFormat: input.value });
    }));
    elements.tableExport?.addEventListener('click', async () => {
      const input = documentTarget?.querySelector?.('input[name="tableExportFormat"]:checked');
      const format = input?.value || 'xlsx';
      if (format === 'recording') {
        elements.tableModal?.classList.remove('show');
        if (elements.recordButton?.disabled) {
          showToast?.('加载视频后可录制拉片视频', 'warning');
          return;
        }
        elements.recordButton?.click();
        return;
      }
      const entries = getEntries?.() || [];
      if (!entries.length) { showToast?.('请先添加拉片数据再导出', 'error'); return; }
      const defaults = getExportDefaults();
      saveSettings?.({
        ...getSettings?.(),
        exportFormat: format,
        exportFileName: elements.fileNameInput?.value?.trim() || defaults.fileName,
        exportTitle: elements.titleInput?.value?.trim() || defaults.title
      });
      elements.tableModal?.classList.remove('show');
      await runExport(format);
    });
  };

  return { bind, download, ensureJsZipLoaded, ensurePdfLibrariesLoaded, getGroupRows, buildPdfExport, buildXlsx, runExport, cancelExport, openTableModal, getState: () => exportMachine.state };
}
