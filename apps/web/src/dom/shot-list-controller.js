import { getShotListLayout } from '../features/shots/shot-list.js';
import { buildShotListItems } from '../features/groups/group-layout.js';
import {
  getVirtualShotHeight,
  getVirtualShotOffset
} from '../utils/shot-virtual.js';
import { isScreenshotSource } from '../utils/screenshot.js';

const SHOT_VIRTUAL_GAP = 12;
const SHOT_VIRTUAL_ESTIMATED_HEIGHT = 142;

export function createShotListController({
  list,
  getEntries,
  getShotGroups = () => [],
  getActiveShotNumber,
  getSelectedShotIds,
  isSelectionMode,
  getExpandedShotNumber,
  getActiveGroupId = () => null,
  getEditingGroupTitleId = () => null,
  getEditingGroupSummaryId = () => null,
  getDetailSignature,
  getThumbnail,
  getConfiguredFields,
  renderCustomFields,
  getFieldValue,
  getReferenceOptions,
  fixedFieldLabels = [],
  getCurrentVideo,
  getAutoShotState,
  isAutoDetecting,
  isGeneratingScreenshots,
  formatAutoShotRange,
  autoShotSegmentDuration,
  onContinueAutoShot,
  onContinueAllAutoShot,
  onPlayShot,
  onEditShot,
  onDeleteShot,
  onCorrectTime,
  onSaveTime,
  onOpenImage,
  onToggleGroupSelection,
  onSelectGroupRange = () => {},
  onToggleGroup = () => {},
  onEditGroupTitle = () => {},
  onEditGroupSummary = () => {},
  onDeleteGroup = () => {},
  onGroupTitleChange = () => {},
  onGroupSummaryChange = () => {},
  onSetActiveShot,
  onCloseDetail,
  onEmptyAction = () => {},
  onRender,
  getHasProject = () => true,
  onEmptyNewProject = () => {},
  onEmptyImportProject = () => {}
} = {}) {
  const state = {
    initialized: false,
    topSpacer: null,
    itemsContainer: null,
    bottomSpacer: null,
    continuationCard: null,
    emptyCard: null,
    heights: new Map(),
    renderFrame: 0
  };

  const createContinuationCard = () => {
    const card = document.createElement('div');
    card.className = 'auto-shot-segment-card';
    card.innerHTML = `
      <div class="auto-shot-segment-card-title"><span class="auto-shot-segment-card-icon">✦</span><span data-auto-shot-segment-title></span></div>
      <div class="auto-shot-segment-card-desc" data-auto-shot-segment-desc></div>
      <div class="auto-shot-segment-card-actions">
        <button type="button" class="primary" data-auto-shot-next></button>
        <button type="button" data-auto-shot-all></button>
      </div>
    `;
    card.querySelector('[data-auto-shot-next]').addEventListener('click', () => {
      const autoState = getAutoShotState?.();
      if (isAutoDetecting?.() || isGeneratingScreenshots?.() || !autoState) return;
      onContinueAutoShot?.(autoState.start, autoState.end);
    });
    card.querySelector('[data-auto-shot-all]').addEventListener('click', () => {
      const autoState = getAutoShotState?.();
      if (isAutoDetecting?.() || isGeneratingScreenshots?.() || !autoState) return;
      onContinueAllAutoShot?.(autoState.start, autoState.end);
    });
    return card;
  };

  const createEmptyCard = () => {
    const card = document.createElement('div');
    card.className = 'shot-list-empty-card';
    card.innerHTML = `
      <strong>暂无分镜</strong>
      <span data-shot-empty-message></span>
      <button type="button" data-shot-empty-action></button>
      <div class="shot-list-empty-project-actions" data-shot-empty-project-actions hidden>
        <button type="button" data-shot-empty-new-project>新建项目</button>
        <button type="button" data-shot-empty-import-project>导入项目</button>
      </div>
    `;
    card.querySelector('[data-shot-empty-action]').addEventListener('click', () => onEmptyAction());
    card.querySelector('[data-shot-empty-new-project]').addEventListener('click', () => onEmptyNewProject());
    card.querySelector('[data-shot-empty-import-project]').addEventListener('click', () => onEmptyImportProject());
    return card;
  };

  const updateContinuationCard = () => {
    const card = state.continuationCard;
    const autoState = getAutoShotState?.();
    if (!card || !autoState) return;
    const title = card.querySelector('[data-auto-shot-segment-title]');
    const desc = card.querySelector('[data-auto-shot-segment-desc]');
    const nextButton = card.querySelector('[data-auto-shot-next]');
    const allButton = card.querySelector('[data-auto-shot-all]');
    const video = getCurrentVideo?.();
    const hasVideo = !!(video?.src && Number.isFinite(video.duration) && video.duration > 0);
    if (!hasVideo || !autoState.active) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'flex';
    const running = isAutoDetecting?.() || isGeneratingScreenshots?.();
    card.classList.toggle('is-running', running);
    card.classList.toggle('is-complete', autoState.completed);
    if (autoState.completed) {
      title.textContent = '已完成全部自动分镜';
      desc.textContent = `已检测 ${formatAutoShotRange(autoState.start, autoState.end)}`;
      nextButton.style.display = 'none';
      allButton.style.display = 'none';
      return;
    }
    const nextEnd = Math.min(autoState.end, autoState.cursor + autoShotSegmentDuration);
    title.textContent = running ? '自动分镜进行中' : '继续自动分镜';
    desc.textContent = `已处理 ${formatAutoShotRange(autoState.start, autoState.cursor)}，下一段 ${formatAutoShotRange(autoState.cursor, nextEnd)}`;
    nextButton.style.display = '';
    nextButton.disabled = running;
    nextButton.textContent = running ? '正在检测...' : `继续检测 ${Math.round(nextEnd - autoState.cursor)} 秒`;
    allButton.style.display = '';
    allButton.disabled = running;
    allButton.textContent = '连续检测全部';
  };

  const revealContinuationCard = () => {
    if (!state.continuationCard || state.continuationCard.style.display === 'none') return;
    state.continuationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  };

  const createShotItem = (entry, groupContext = null) => {
    const item = document.createElement('div');
    const thumbnail = isScreenshotSource(getThumbnail?.(entry)) ? getThumbnail(entry) : '';
    item.innerHTML = `
      <div data-shot-thumb class="shot-thumb-placeholder">暂无截图</div>
      <div class="shot-card-content">
        <div class="shot-card-header"><div class="shot-card-identity"><span class="shot-number-display"></span></div><div class="shot-meta"><div class="time-container"><div class="shot-time-summary"><span class="time-display" title="点击修改"></span><span class="shot-duration-display"></span></div><div class="time-edit"><input class="time-input" style="width:80px;padding:2px;font-size:12px;"><button class="btn-correct" title="自动校正(+1.5s)">⚡</button><button class="btn-save-time" title="保存">✔</button></div></div></div></div>
        <div class="shot-action-row"><button class="shot-play-btn shot-action-text-btn" data-play-shot title="播放此分镜" aria-label="播放此分镜"><svg class="shot-action-icon-svg play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7V5Z"/></svg><span>播放</span></button><button class="shot-action-text-btn" data-edit-shot title="编辑分镜" aria-label="编辑分镜"><svg class="shot-action-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3L5 17"/><path d="m13 7 4 4"/></svg><span>编辑</span></button><button data-del title="删除分镜" aria-label="删除分镜"><svg class="shot-action-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg></button></div>
      </div>
      <div class="shot-detail-inline" style="display:none"><div class="detail-grid"><div class="detail-customFields"></div></div></div>
    `;
    if (thumbnail) {
      const placeholder = item.querySelector('[data-shot-thumb]');
      const image = document.createElement('img');
      image.dataset.shotThumb = '';
      image.src = thumbnail;
      image.alt = `分镜 #${entry.shotNumber}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.dataset.image = isScreenshotSource(entry.image) ? entry.image : '';
      placeholder.replaceWith(image);
    }

    item.querySelector('[data-play-shot]').addEventListener('click', event => {
      event.stopPropagation();
      onPlayShot?.(entry);
    });
    item.querySelector('[data-edit-shot]').addEventListener('click', event => {
      event.stopPropagation();
      onEditShot?.(entry);
    });
    item.querySelector('[data-del]').addEventListener('click', event => {
      event.stopPropagation();
      onDeleteShot?.(entry);
    });

    const timeDisplay = item.querySelector('.time-display');
    const timeEdit = item.querySelector('.time-edit');
    const timeInput = item.querySelector('.time-input');
    const btnCorrect = item.querySelector('.btn-correct');
    const btnSave = item.querySelector('.btn-save-time');
    timeDisplay.addEventListener('click', event => {
      if (isSelectionMode?.()) return;
      event.stopPropagation();
      list.querySelectorAll('.time-edit').forEach(element => { element.style.display = 'none'; });
      list.querySelectorAll('.time-display').forEach(element => { element.style.display = ''; });
      timeDisplay.style.display = 'none';
      timeEdit.style.display = 'flex';
      timeInput.focus();
    });
    timeInput.addEventListener('click', event => event.stopPropagation());
    timeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') btnSave.click();
      if (event.key === 'Escape') { timeDisplay.style.display = ''; timeEdit.style.display = 'none'; }
    });
    btnCorrect.addEventListener('click', event => {
      event.stopPropagation();
      onCorrectTime?.(entry, item, timeInput, btnCorrect);
    });
    btnSave.addEventListener('click', async event => {
      event.stopPropagation();
      btnSave.disabled = true;
      btnSave.textContent = '...';
      const saved = await onSaveTime?.(entry, timeInput.value);
      if (saved === false) {
        btnSave.disabled = false;
        btnSave.textContent = '保存';
        timeDisplay.style.display = '';
        timeEdit.style.display = 'none';
      }
    });
    item.addEventListener('click', event => {
      const imageSource = isScreenshotSource(entry.image)
        ? entry.image
        : isScreenshotSource(entry.imageThumbnail) ? entry.imageThumbnail : '';
      const thumbnailElement = event.target.closest('[data-shot-thumb]');
      if (thumbnailElement?.tagName === 'IMG' && imageSource && !isSelectionMode?.()) {
        event.stopPropagation();
        onOpenImage?.(imageSource, entry.timecode, entry.shotNumber);
        return;
      }
      if (isSelectionMode?.()) {
        if (event.target.closest('button,input,textarea,select,a')) return;
        onSelectGroupRange?.(entry);
        return;
      }
      if (event.target.closest('.shot-detail-inline')) return;
      const detail = item.querySelector('.shot-detail-inline');
      const isActive = Number(getActiveShotNumber?.()) === Number(entry.shotNumber);
      const isExpanded = Number(getExpandedShotNumber?.()) === Number(entry.shotNumber);
      if (isActive && isExpanded && detail) {
        onCloseDetail?.();
        detail.style.display = 'none';
        scheduleRender();
        return;
      }
      if (!isActive) {
        onCloseDetail?.();
        onSetActiveShot?.(entry.shotNumber, false);
        return;
      }
      onSetActiveShot?.(entry.shotNumber, true);
    });
    if (groupContext) {
      item.dataset.groupId = groupContext.groupId;
      item.dataset.groupPosition = String(groupContext.position);
    }
    return item;
  };

  const updateShotItemVisuals = (item, entry, groupContext = null) => {
    const active = Number(getActiveShotNumber?.()) === Number(entry.shotNumber);
    const groupClass = groupContext ? ` group-member group-member-${groupContext.position}` : '';
    item.className = `shot-item${active ? ' active' : ''}${getSelectedShotIds?.().has(entry.shotId) ? ' group-selected' : ''}${groupClass}`;
    item.dataset.shot = String(entry.shotNumber);
    item.dataset.shotId = entry.shotId;
    if (groupContext) item.dataset.groupId = groupContext.groupId;
    else delete item.dataset.groupId;
    const thumbnail = item.querySelector('[data-shot-thumb]');
    const thumbnailSource = isScreenshotSource(getThumbnail?.(entry)) ? getThumbnail(entry) : '';
    if (thumbnailSource && thumbnail?.tagName === 'IMG') {
      thumbnail.src = thumbnailSource;
      thumbnail.alt = `分镜 #${entry.shotNumber}`;
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      thumbnail.dataset.image = isScreenshotSource(entry.image) ? entry.image : '';
    } else if (thumbnailSource && thumbnail) {
      const image = document.createElement('img');
      image.dataset.shotThumb = '';
      image.src = thumbnailSource;
      image.alt = `分镜 #${entry.shotNumber}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.dataset.image = isScreenshotSource(entry.image) ? entry.image : '';
      thumbnail.replaceWith(image);
    } else if (thumbnail?.tagName === 'IMG') {
      const placeholder = document.createElement('div');
      placeholder.dataset.shotThumb = '';
      placeholder.className = 'shot-thumb-placeholder';
      placeholder.textContent = '暂无截图';
      thumbnail.replaceWith(placeholder);
    }
    item.querySelector('.shot-number-display').textContent = `#${entry.shotNumber}`;
    item.querySelector('.time-display').textContent = entry.timecode || '';
    item.querySelector('.shot-duration-display').textContent = `时长 ${entry.durationText || '—'}`;
    const timeInput = item.querySelector('.time-input');
    const timeEdit = item.querySelector('.time-edit');
    if (timeInput && timeEdit && getComputedStyle(timeEdit).display === 'none' && document.activeElement !== timeInput) timeInput.value = entry.timecode || '';
  };

  const syncShotItem = (item, entry, groupContext = null) => {
    updateShotItemVisuals(item, entry, groupContext);
    const detail = item.querySelector('.shot-detail-inline');
    const area = detail?.querySelector('.detail-customFields');
    if (Number(getExpandedShotNumber?.()) === Number(entry.shotNumber)) {
      detail.style.display = '';
      if (item.dataset.detailFields !== getDetailSignature?.()) {
        renderCustomFields?.(entry, area);
        item.dataset.detailFields = getDetailSignature?.();
      }
    } else {
      detail.style.display = 'none';
      item.dataset.detailFields = '';
    }
  };

  const groupRange = members => {
    const first = members[0];
    const last = members[members.length - 1];
    if (!first || !last) return '无分镜';
    return first.shotNumber === last.shotNumber
      ? `#${first.shotNumber}`
      : `#${first.shotNumber}–#${last.shotNumber}`;
  };

  const syncGroupEditor = (block, group, members) => {
    const editingTitle = getEditingGroupTitleId?.() === group.id;
    const editingSummary = getEditingGroupSummaryId?.() === group.id;
    const mode = editingTitle ? 'title' : editingSummary ? 'summary' : '';
    let editor = block.querySelector('.shot-group-block-editor');
    if (editor?.dataset.mode !== mode) {
      editor?.remove();
      editor = null;
      if (mode) {
        editor = document.createElement('div');
        editor.className = 'shot-group-block-editor';
        editor.dataset.mode = mode;
        editor.innerHTML = mode === 'title'
          ? '<label>镜头组名称<input data-group-title type="text" maxlength="80" placeholder="镜头组名称"></label>'
          : '<label>概括分析<textarea data-group-summary maxlength="2000" placeholder="概括这组镜头的叙事作用、节奏变化或整体表达"></textarea></label>';
        const titleInput = editor.querySelector('[data-group-title]');
        const summaryInput = editor.querySelector('[data-group-summary]');
        if (titleInput) {
          titleInput.value = group.title || '';
          titleInput.addEventListener('input', () => onGroupTitleChange(group.id, titleInput.value, block));
        }
        if (summaryInput) {
          summaryInput.value = group.summary || '';
          summaryInput.addEventListener('input', () => onGroupSummaryChange(group.id, summaryInput.value));
        }
        const hint = document.createElement('div');
        hint.className = 'shot-group-block-editor-hint';
        hint.textContent = `包含镜号：${members.map(member => `#${member.shotNumber}`).join('、')} · 内容自动保存`;
        editor.appendChild(hint);
        block.appendChild(editor);
      }
    }
  };

  const syncGroupBlock = (block, unit) => {
    const { group, members } = unit;
    const expanded = getActiveGroupId?.() === group.id;
    block.className = `shot-group-block${expanded ? ' expanded' : ''}`;
    block.dataset.groupId = group.id;
    const toggle = block.querySelector('[data-group-toggle]');
    const title = block.querySelector('.shot-group-block-title');
    const range = block.querySelector('.shot-group-block-range');
    const summary = block.querySelector('.shot-group-block-summary');
    const children = block.querySelector('.shot-group-block-items');
    if (toggle) {
      toggle.textContent = expanded ? '⌄' : '›';
      toggle.setAttribute('aria-expanded', String(expanded));
    }
    if (title) title.textContent = group.title || '未命名镜头组';
    if (range) range.textContent = `${groupRange(members)} · ${members.length}镜`;
    if (summary) summary.textContent = group.summary || '暂无概括分析';
    if (children) {
      children.hidden = !expanded;
      const existing = new Map([...children.querySelectorAll('.shot-item')].map(item => [item.dataset.shotId, item]));
      const nextItems = members.map((entry, position) => {
        const item = existing.get(entry.shotId) || createShotItem(entry, { groupId: group.id, position });
        syncShotItem(item, entry, { groupId: group.id, position });
        existing.delete(entry.shotId);
        return item;
      });
      existing.forEach(item => item.remove());
      nextItems.forEach((item, index) => {
        if (children.children[index] !== item) children.insertBefore(item, children.children[index] || null);
      });
    }
    syncGroupEditor(block, group, members);
  };

  const createGroupBlock = unit => {
    const block = document.createElement('div');
    block.className = 'shot-group-block';
    block.dataset.listItemKey = unit.key;
    block.innerHTML = '<div class="shot-group-block-header"><button data-group-toggle type="button" class="shot-group-block-toggle" title="展开或折叠镜头组" aria-label="展开或折叠镜头组"></button><span class="shot-group-block-title"></span><span class="shot-group-block-range"></span><button data-group-title-edit type="button" class="shot-group-block-action" title="编辑镜头组名称" aria-label="编辑镜头组名称">✎</button><button data-group-summary-edit type="button" class="shot-group-block-action" title="编辑镜头组分析" aria-label="编辑镜头组分析">▤</button><button data-group-delete type="button" class="shot-group-block-action danger" title="解散镜头组" aria-label="解散镜头组">×</button></div><div class="shot-group-block-summary"></div><div class="shot-group-block-items"></div>';
    block.querySelector('[data-group-toggle]')?.addEventListener('click', event => {
      event.stopPropagation();
      onToggleGroup(unit.group.id, getActiveGroupId?.() !== unit.group.id);
    });
    block.querySelector('[data-group-title-edit]')?.addEventListener('click', event => {
      event.stopPropagation();
      onEditGroupTitle(unit.group.id, getEditingGroupTitleId?.() !== unit.group.id);
    });
    block.querySelector('[data-group-summary-edit]')?.addEventListener('click', event => {
      event.stopPropagation();
      onEditGroupSummary(unit.group.id, getEditingGroupSummaryId?.() !== unit.group.id);
    });
    block.querySelector('[data-group-delete]')?.addEventListener('click', event => {
      event.stopPropagation();
      onDeleteGroup(unit.group.id);
    });
    syncGroupBlock(block, unit);
    return block;
  };

  const ensure = () => {
    if (!list) return false;
    if (state.initialized) return true;
    list.innerHTML = '';
    state.topSpacer = document.createElement('div');
    state.topSpacer.className = 'shots-virtual-spacer';
    state.itemsContainer = document.createElement('div');
    state.itemsContainer.className = 'shots-virtual-items';
    state.bottomSpacer = document.createElement('div');
    state.bottomSpacer.className = 'shots-virtual-spacer';
    list.append(state.topSpacer, state.itemsContainer, state.bottomSpacer);
    state.continuationCard = createContinuationCard();
    list.appendChild(state.continuationCard);
    state.emptyCard = createEmptyCard();
    list.appendChild(state.emptyCard);
    state.initialized = true;
    list.addEventListener('scroll', scheduleRender, { passive: true });
    window.addEventListener('resize', scheduleRender);
    updateContinuationCard();
    return true;
  };

  const scheduleRender = () => {
    if (!state.initialized || state.renderFrame) return;
    state.renderFrame = requestAnimationFrame(() => {
      state.renderFrame = 0;
      render();
    });
  };

  const render = () => {
    if (!ensure()) return;
    const entries = getEntries?.() || [];
    const hasVideo = !!(getCurrentVideo?.()?.src);
    const hasProject = !!getHasProject?.();
    if (state.emptyCard) {
      const message = state.emptyCard.querySelector('[data-shot-empty-message]');
      const action = state.emptyCard.querySelector('[data-shot-empty-action]');
      const projectActions = state.emptyCard.querySelector('[data-shot-empty-project-actions]');
      state.emptyCard.style.display = entries.length ? 'none' : 'flex';
      if (!hasProject) {
        if (message) message.textContent = '先新建/导入项目，再开始拉片';
        if (action) action.hidden = true;
        if (projectActions) projectActions.hidden = false;
      } else {
        if (message) message.textContent = hasVideo ? '播放视频并按 Enter 添加第一个分镜' : '先加载视频，再开始拉片分析';
        if (action) { action.hidden = false; action.textContent = hasVideo ? '添加当前分镜' : '加载视频'; }
        if (projectActions) projectActions.hidden = true;
      }
    }
    const displayItems = buildShotListItems({
      entries,
      groups: getShotGroups?.() || [],
      expandedGroupId: getActiveGroupId?.()
    });
    const layout = getShotListLayout({
      entries: displayItems.map(item => ({ ...item, shotId: item.type === 'group' ? item.members[0].shotId : item.entry.shotId })),
      heights: state.heights,
      estimatedHeight: SHOT_VIRTUAL_ESTIMATED_HEIGHT,
      gap: SHOT_VIRTUAL_GAP,
      scrollTop: list.scrollTop,
      viewportHeight: Math.max(1, list.clientHeight || SHOT_VIRTUAL_ESTIMATED_HEIGHT * 5)
    });
    state.topSpacer.style.height = `${layout.topOffset}px`;
    state.bottomSpacer.style.height = `${layout.bottomOffset}px`;
    state.itemsContainer.classList.toggle('shot-group-selection-mode', !!isSelectionMode?.());
    const existing = new Map([...state.itemsContainer.children].map(item => [item.dataset.listItemKey, item]));
    const nextItems = [];
    for (let index = layout.start; index < layout.end; index++) {
      const unit = displayItems[index];
      const item = existing.get(unit.key) || (unit.type === 'group' ? createGroupBlock(unit) : createShotItem(unit.entry));
      if (unit.type === 'group') syncGroupBlock(item, unit);
      else syncShotItem(item, unit.entry);
      item.dataset.listItemKey = unit.key;
      nextItems.push(item);
      existing.delete(unit.key);
    }
    existing.forEach(item => item.remove());
    nextItems.forEach((item, index) => {
      if (state.itemsContainer.children[index] !== item) state.itemsContainer.insertBefore(item, state.itemsContainer.children[index] || null);
    });
    let heightsChanged = false;
    nextItems.forEach((item, index) => {
      const height = item.offsetHeight;
      const unit = displayItems[layout.start + index];
      const heightKey = unit.type === 'group' ? unit.members[0].shotId : unit.entry.shotId;
      if (height > 0 && state.heights.get(heightKey) !== height) {
        state.heights.set(heightKey, height);
        heightsChanged = true;
      }
    });
    if (heightsChanged) scheduleRender();
    updateContinuationCard();
    onRender?.();
  };

  const scrollIntoView = shotNumber => {
    if (!ensure()) return;
    const entries = getEntries?.() || [];
    const displayItems = buildShotListItems({
      entries,
      groups: getShotGroups?.() || [],
      expandedGroupId: getActiveGroupId?.()
    });
    const index = displayItems.findIndex(item => item.type === 'shot'
      ? Number(item.entry.shotNumber) === Number(shotNumber)
      : item.members.some(entry => Number(entry.shotNumber) === Number(shotNumber)));
    if (index < 0) return;
    const unitEntries = displayItems.map(item => ({
      ...item,
      shotId: item.type === 'group' ? item.members[0].shotId : item.entry.shotId
    }));
    const targetItem = displayItems[index];
    if (targetItem.type === 'group' && getActiveGroupId?.() !== targetItem.group.id) onToggleGroup(targetItem.group.id, true);
    const top = getVirtualShotOffset(unitEntries, index, state.heights, SHOT_VIRTUAL_ESTIMATED_HEIGHT, SHOT_VIRTUAL_GAP);
    const bottom = top + getVirtualShotHeight(unitEntries[index], state.heights, SHOT_VIRTUAL_ESTIMATED_HEIGHT);
    let targetTop = null;
    if (top < list.scrollTop) targetTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) targetTop = Math.max(0, bottom - list.clientHeight);
    if (targetTop === null) return;
    const previousScrollBehavior = list.style.scrollBehavior;
    list.style.scrollBehavior = 'auto';
    list.scrollTop = targetTop;
    list.offsetHeight;
    list.style.scrollBehavior = previousScrollBehavior;
  };

  const focusGroupEditor = (groupId, selector, select = false) => {
    window.requestAnimationFrame(() => {
      const block = list?.querySelector(`.shot-group-block[data-group-id="${groupId}"]`);
      const input = block?.querySelector(selector);
      if (!input) return;
      block.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      input.focus({ preventScroll: true });
      if (select) input.select();
    });
  };

  return {
    state,
    ensure,
    render,
    scheduleRender,
    scrollIntoView,
    focusGroupTitle: groupId => focusGroupEditor(groupId, '[data-group-title]', true),
    focusGroupSummary: groupId => focusGroupEditor(groupId, '[data-group-summary]'),
    revealContinuationCard,
    updateContinuationCard
  };
}
