export function createProjectDocumentInput({
  title = '',
  projectUuid = '',
  videoFileName = '',
  duration = 0,
  templateType = '',
  autoShotState = null,
  timelineViewState = null
} = {}) {
  const documentInput = {
    title: String(title || ''),
    projectUuid: String(projectUuid || ''),
    videoFileName: String(videoFileName || ''),
    duration: Number(duration) || 0,
    templateType: String(templateType || ''),
    autoShotState: autoShotState || null
  };
  if (timelineViewState) documentInput.timelineViewState = timelineViewState;
  return documentInput;
}

export function createProjectFolderWritePlan({
  includeVideo = false,
  includeTableExport = false,
  videoFileName = '',
  exportFormat = ''
} = {}) {
  return {
    includeVideo: Boolean(includeVideo),
    includeTableExport: Boolean(includeTableExport),
    videoFileName: String(videoFileName || ''),
    exportFormat: String(exportFormat || '')
  };
}

export function formatProjectExportFileName(baseName = '', format = 'xlsx') {
  const extension = format === 'html' ? 'html' : format === 'pdf' ? 'pdf' : 'xlsx';
  return `${String(baseName || '')}.${extension}`;
}
