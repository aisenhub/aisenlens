import { formatProjectExportFileName } from '../features/project/project-workflow.js';

export function createProjectExportFileNameResolver({ getSettings = () => ({}) } = {}) {
  return (format = getSettings().exportFormat) => (
    formatProjectExportFileName(getSettings().exportFileName, format)
  );
}
