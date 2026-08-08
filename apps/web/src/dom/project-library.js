const VIEW_STATE_KEY = 'aisenlensProjectLibraryView';

function getViewState(storage) {
  try {
    const stored = JSON.parse(storage?.getItem(VIEW_STATE_KEY) || '{}');
    return {
      query: typeof stored.query === 'string' ? stored.query : '',
      sort: stored.sort === 'title' ? 'title' : 'updated',
      view: stored.view === 'list' ? 'list' : 'grid'
    };
  } catch (_) {
    return { query: '', sort: 'updated', view: 'grid' };
  }
}

export function createProjectLibraryController({
  elements = {},
  getProjects = async () => [],
  onOpenProject = () => {},
  onNewProject = () => {},
  onImportProject = () => {},
  storage = globalThis.localStorage
} = {}) {
  const { list, empty, queryInput, sortSelect, viewButtons = [], newButton, importButton } = elements;
  let state = getViewState(storage);

  const persist = () => storage?.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '未记录保存时间' : date.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  };
  const render = async () => {
    const projects = await getProjects();
    const query = state.query.trim().toLocaleLowerCase();
    const visible = projects
      .filter(project => !query || `${project.title || ''} ${project.videoFileName || ''}`.toLocaleLowerCase().includes(query))
      .sort((first, second) => state.sort === 'title'
        ? String(first.title || '').localeCompare(String(second.title || ''), 'zh-CN')
        : new Date(second.updatedAt || 0) - new Date(first.updatedAt || 0));

    if (list) {
      list.classList.toggle('is-list', state.view === 'list');
      list.replaceChildren(...visible.map(project => {
        const card = document.createElement('article');
        card.className = 'project-library-card';
        const title = document.createElement('strong');
        title.textContent = project.title || '未命名项目';
        const detail = document.createElement('span');
        detail.textContent = project.videoFileName || '空项目';
        const updated = document.createElement('small');
        updated.textContent = `最近保存：${formatDate(project.updatedAt)}`;
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = '打开工程';
        open.addEventListener('click', () => onOpenProject(project));
        card.append(title, detail, updated, open);
        return card;
      }));
    }
    if (empty) empty.hidden = visible.length > 0;
  };
  const setView = view => {
    state = { ...state, view };
    persist();
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.libraryView === view)));
    return render();
  };
  const bind = () => {
    if (queryInput) {
      queryInput.value = state.query;
      queryInput.addEventListener('input', () => { state = { ...state, query: queryInput.value }; persist(); void render(); });
    }
    if (sortSelect) {
      sortSelect.value = state.sort;
      sortSelect.addEventListener('change', () => { state = { ...state, sort: sortSelect.value }; persist(); void render(); });
    }
    viewButtons.forEach(button => button.addEventListener('click', () => void setView(button.dataset.libraryView)));
    newButton?.addEventListener('click', onNewProject);
    importButton?.addEventListener('click', onImportProject);
    return render();
  };

  return { bind, render };
}
