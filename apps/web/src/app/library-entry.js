import { dbGetAllProjects } from '../platform/indexeddb.js';
import { createProjectLibraryController } from '../dom/project-library.js';
import { getEditorPath, navigateTo } from './routes.js';
import { importProjectBackup } from '../features/project/project-backup-import.js';
import { createProjectRecord } from '../features/project/project-service.js';

const importInput = document.getElementById('projectLibraryImportInput');
const notice = document.getElementById('projectLibraryNotice');

const showNotice = (message, type = 'info') => {
  if (!notice) return;
  notice.textContent = message;
  notice.dataset.type = type;
  notice.hidden = !message;
};

const controller = createProjectLibraryController({
  elements: {
    list: document.getElementById('projectLibraryList'),
    empty: document.getElementById('projectLibraryEmpty'),
    queryInput: document.getElementById('projectLibrarySearch'),
    sortSelect: document.getElementById('projectLibrarySort'),
    viewButtons: [...document.querySelectorAll('[data-library-view]')],
    newButton: document.getElementById('projectLibraryNew'),
    importButton: document.getElementById('projectLibraryImport')
  },
  getProjects: dbGetAllProjects,
  onOpenProject: project => navigateTo(getEditorPath(project.id)),
  onNewProject: async () => {
    const projectId = await createProjectRecord({ title: '未命名项目', templateType: 'Default' });
    navigateTo(getEditorPath(projectId));
  },
  onImportProject: () => importInput?.click()
});

importInput?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  showNotice('正在导入工程备份...');
  try {
    const projectId = await importProjectBackup(file);
    navigateTo(getEditorPath(projectId));
  } catch (error) {
    console.error('工程库导入项目备份失败:', error);
    showNotice(error?.code === 'PROJECT_BACKUP_DUPLICATE'
      ? '该项目已经存在，请先删除现有项目或使用其他备份。'
      : '项目备份导入失败，请确认 ZIP 文件完整。', 'error');
  } finally {
    importInput.value = '';
  }
});

void controller.bind();
