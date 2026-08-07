import { createShotGroup } from '../features/groups/group-service.js';
import { canCreateShotGroup } from '../features/groups/group-editor.js';

export function createShotGroupFromSelection({
  selectedIds = [],
  entries = [],
  groups = [],
  getGroups = () => groups,
  prompt = () => '',
  idFactory,
  setActiveGroup = () => {},
  setSelectionMode = () => {},
  addGroup = () => {},
  markDirty = () => {},
  focusSummary = () => {},
  removeGroup = () => {},
  render = () => {},
  history = null
} = {}) {
  const selectedShotIds = new Set(selectedIds);
  if (!canCreateShotGroup(selectedShotIds)) return false;
  const title = prompt('请输入镜头组名称：', `镜头组 ${groups.length + 1}`);
  if (!title || !title.trim()) return false;
  const group = createShotGroup({ entries, selectedShotIds, title, idFactory });
  if (!group) return false;
  const applyGroup = () => {
    if (!(getGroups() || []).some(item => item.id === group.id)) addGroup(group);
    setActiveGroup(group.id);
    setSelectionMode(false);
    markDirty();
    render();
    focusSummary(group.id);
  };
  const undoGroup = () => {
    removeGroup(group.id);
    markDirty();
    render();
  };
  applyGroup();
  if (history) {
    history.record({
      label: '创建镜头组',
      execute: applyGroup,
      undo: undoGroup
    });
  }
  return true;
}
