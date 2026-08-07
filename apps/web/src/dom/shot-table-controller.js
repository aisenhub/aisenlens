import { getTemplateEntryValue } from '../utils/templates.js';

export function createShotTableController({
  elements = {},
  getEntries = () => [],
  getColumns = () => [],
  getCellValue = () => '',
  getThumbnail = () => '',
  getTemplateFields = () => [],
  getReferenceOptions = () => [],
  fixedColumns = [],
  escapeText = value => String(value ?? ''),
  getActiveShotNumber = () => null,
  setActiveShotNumber = () => {},
  getExpandedShotNumber = () => null,
  setExpandedShotNumber = () => {},
  getShotsList = () => null,
  ensureVirtualList = () => {},
  scheduleVirtualRender = () => {},
  renderVirtualList = () => {},
  scrollVirtualIntoView = () => {},
  getVideo = () => null,
  clampTime = value => value,
  stopSegmentPlayback = () => {},
  renderWaveform = () => {},
  markUserJump = () => {},
  syncTable = () => {},
  markDirty = () => {},
  windowTarget = window,
  documentTarget = document,
  setCustomFieldNames = () => {},
  onActiveShotChanged = () => {},
  updateShotField = null
} = {}) {
  const {
    tableBody,
    tableHeadRow,
    tableWrap,
    customFieldsArea
  } = elements;
  let structureSignature = '';
  const pendingRows = new Set();
  let syncFrame = 0;
  let lastTableShot = -1;
  let userJump = false;

  const syncRow = entry => {
    if (!tableBody || !entry) return;
    const row = tableBody.querySelector(`tr[data-shot="${entry.shotNumber}"]`);
    if (!row) { updateTable(true); return; }
    row.dataset.time = String(entry.time);
    getColumns().forEach((column, index) => {
      const cell = row.querySelector(`td[data-column-index="${index}"]`);
      if (!cell) return;
      if (column.key === 'image') {
        const thumbnail = getThumbnail(entry);
        if (!thumbnail) { cell.innerHTML = '<span class="shot-table-empty">—</span>'; return; }
        let image = cell.querySelector('img');
        if (!image) {
          image = documentTarget.createElement('img');
          image.alt = '';
          cell.innerHTML = '';
          cell.appendChild(image);
        }
        image.src = thumbnail;
        return;
      }
      const value = getCellValue(entry, column);
      const valueClass = value ? 'shot-table-text' : 'shot-table-text shot-table-empty';
      cell.innerHTML = `<span class="${valueClass}">${escapeText(value || '—')}</span>`;
    });
  };

  const scheduleRowSync = entry => {
    if (!entry) return;
    pendingRows.add(entry);
    if (syncFrame) return;
    syncFrame = windowTarget.requestAnimationFrame(() => {
      syncFrame = 0;
      const rows = [...pendingRows];
      pendingRows.clear();
      rows.forEach(syncRow);
    });
  };

  const updateTable = (forceStructure = false) => {
    if (!tableBody) return;
    const columns = getColumns();
    const sorted = [...(getEntries() || [])].sort((first, second) => first.shotNumber - second.shotNumber);
    const nextSignature = columns.map(column => `${column.key}:${column.field || ''}`).join('|');
    const existingRows = [...tableBody.querySelectorAll('tr[data-shot]')];
    const structureReady = !forceStructure
      && structureSignature === nextSignature
      && ((sorted.length === 0 && existingRows.length === 0 && tableBody.querySelector('.empty-row'))
        || (existingRows.length === sorted.length && sorted.every((entry, index) => existingRows[index].dataset.shot === String(entry.shotNumber))));
    if (structureReady) { sorted.forEach(syncRow); return; }
    structureSignature = nextSignature;
    if (tableHeadRow) {
      tableHeadRow.innerHTML = columns.map((column, index) => {
        const columnClass = column.key === 'image' ? 'col-thumb' : column.key === 'shotNumber' ? 'col-shot-number' : column.key === 'duration' ? 'col-duration' : '';
        return `<th class="${columnClass}" data-column-index="${index}">${escapeText(column.label)}</th>`;
      }).join('');
    }
    if (!sorted.length) {
      tableBody.innerHTML = `<tr class="empty-row"><td colspan="${columns.length}">暂无镜头数据</td></tr>`;
      return;
    }
    tableBody.innerHTML = sorted.map(entry => {
      const cells = columns.map((column, index) => {
        const columnClass = column.key === 'image' ? 'col-thumb' : column.key === 'shotNumber' ? 'col-shot-number' : column.key === 'duration' ? 'col-duration' : '';
        if (column.key === 'image') {
          const thumbnail = getThumbnail(entry);
          return `<td class="${columnClass}" data-column-index="${index}">${thumbnail ? `<img src="${thumbnail}" alt="">` : '<span class="shot-table-empty">—</span>'}</td>`;
        }
        const value = getCellValue(entry, column);
        const valueClass = value ? 'shot-table-text' : 'shot-table-text shot-table-empty';
        return `<td class="${columnClass}" data-column-index="${index}"><span class="${valueClass}">${escapeText(value || '—')}</span></td>`;
      }).join('');
      return `<tr data-shot="${entry.shotNumber}" data-time="${entry.time}">${cells}</tr>`;
    }).join('');
    tableBody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const time = Number.parseFloat(row.dataset.time);
        const video = getVideo();
        if (!Number.isFinite(time) || !video) return;
        stopSegmentPlayback(true);
        const shotNumber = Number.parseInt(row.dataset.shot, 10);
        if (shotNumber) setActiveShot(shotNumber);
        else {
          video.currentTime = time;
          userJump = true;
          sync(time);
        }
      });
    });
  };

  const highlightCard = (shotNumber, instant = false) => {
    const shotsList = getShotsList();
    if (!shotsList || !Number.isFinite(shotNumber)) return;
    setActiveShotNumber(shotNumber);
    ensureVirtualList();
    const items = [...shotsList.querySelectorAll('.shot-item')];
    if (!items.length) { scrollVirtualIntoView(shotNumber); scheduleVirtualRender(); return; }
    items.forEach(item => item.classList.toggle('active', Number(item.dataset.shot) === shotNumber));
    const item = shotsList.querySelector(`[data-shot="${shotNumber}"]`);
    if (!item) { scrollVirtualIntoView(shotNumber); scheduleVirtualRender(); return; }
    const listRect = shotsList.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const itemTop = itemRect.top - listRect.top + shotsList.scrollTop;
    const itemBottom = itemTop + itemRect.height;
    const viewTop = shotsList.scrollTop;
    const viewBottom = viewTop + shotsList.clientHeight;
    let targetTop = null;
    if (itemTop < viewTop) targetTop = itemTop;
    else if (itemBottom > viewBottom) targetTop = itemBottom - shotsList.clientHeight;
    if (targetTop === null) return;
    if (instant) {
      shotsList.style.scrollBehavior = 'auto';
      shotsList.scrollTop = targetTop;
      shotsList.offsetHeight;
      shotsList.style.scrollBehavior = 'smooth';
    } else shotsList.scrollTop = targetTop;
  };

  const sync = currentTime => {
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr[data-time]');
    if (!rows.length) return;
    let currentRow = null;
    rows.forEach(row => {
      const rowTime = Number.parseFloat(row.dataset.time);
      if (Number.isFinite(rowTime) && rowTime <= currentTime + 0.1) currentRow = row;
    });
    rows.forEach(row => row.classList.remove('current'));
    if (!currentRow) return;
    currentRow.classList.add('current');
    const shotNumber = Number.parseInt(currentRow.dataset.shot, 10);
    if (shotNumber === lastTableShot) return;
    lastTableShot = shotNumber;
    onActiveShotChanged(shotNumber);
    renderWaveform();
    highlightCard(shotNumber, userJump);
    const wrap = tableWrap && !tableWrap.hidden ? tableWrap : null;
    if (!wrap) { userJump = false; return; }
    const wrapRect = wrap.getBoundingClientRect();
    const rowRect = currentRow.getBoundingClientRect();
    const rowTop = rowRect.top - wrapRect.top + wrap.scrollTop;
    const rowBottom = rowTop + rowRect.height;
    const viewTop = wrap.scrollTop;
    const viewBottom = viewTop + wrap.clientHeight;
    let targetTop = null;
    if (userJump) {
      const rowCenter = rowTop + rowRect.height / 2;
      const centeredTop = rowCenter - wrap.clientHeight / 2;
      const maxScrollTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
      targetTop = Math.max(0, Math.min(maxScrollTop, centeredTop));
    } else if (rowTop < viewTop) targetTop = rowTop;
    else if (rowBottom > viewBottom) targetTop = rowBottom - wrap.clientHeight;
    if (targetTop === null) userJump = false;
    else if (userJump) {
      const previousScrollBehavior = wrap.style.scrollBehavior;
      wrap.style.scrollBehavior = 'auto';
      wrap.scrollTop = targetTop;
      wrap.offsetHeight;
      wrap.style.scrollBehavior = previousScrollBehavior;
      userJump = false;
    } else wrap.scrollTop = targetTop;
  };

  const setActiveShot = (shotNumber, expand = true) => {
    setActiveShotNumber(shotNumber);
    onActiveShotChanged(shotNumber);
    renderWaveform();
    if (expand) setExpandedShotNumber(shotNumber);
    ensureVirtualList();
    scrollVirtualIntoView(shotNumber);
    renderVirtualList();
    getShotsList()?.querySelectorAll('.shot-item').forEach(item => item.classList.toggle('active', Number(item.dataset.shot) === Number(shotNumber)));
    if (expand) getShotsList()?.querySelectorAll('.shot-detail-inline').forEach(item => {
      if (Number(item.closest('.shot-item')?.dataset.shot) !== Number(shotNumber)) item.style.display = 'none';
    });
    const item = getShotsList()?.querySelector(`[data-shot="${shotNumber}"]`);
    const active = (getEntries() || []).find(entry => Number(entry.shotNumber) === Number(shotNumber));
    if (!item || !active) return;
    const video = getVideo();
    if (video && Number.isFinite(Number(active.time)) && (video.src || video.currentSrc)) {
      userJump = true;
      video.currentTime = clampTime(Number(active.time));
      sync(Number(active.time));
    }
    if (!expand) return;
    const detail = item.querySelector('.shot-detail-inline');
    if (!detail) return;
    detail.style.display = '';
    renderCustomFieldsFor(active, detail.querySelector('.detail-customFields'));
    item.dataset.detailFields = getTemplateFields().join('\u001f');
  };

  const renderCustomFieldsFor = (active, area) => {
    if (!area) return;
    area.innerHTML = '';
    const names = getTemplateFields().filter(name => !fixedColumns.some(column => column.label === name));
    names.forEach(name => {
      const wrapper = documentTarget.createElement('div');
      wrapper.className = 'custom-field-wrapper';
      const label = documentTarget.createElement('label');
      label.textContent = name;
      const isShotSize = name === '景别';
      const isCameraMove = name === '运镜';
      const isComposition = name === '构图';
      const isTransition = name === '转场';
      const isAnalysis = name === '镜头分析';
      const isContent = name === '画面内容';
      const isLongText = isAnalysis || isContent;
      const input = isLongText ? documentTarget.createElement('textarea') : documentTarget.createElement('input');
      const referenceOptions = getReferenceOptions(name);
      const isReferenceField = isShotSize || isCameraMove || isComposition || isTransition || referenceOptions.length > 0;
      let referenceEditor = null;
      if (!isLongText) {
        input.type = 'text';
        if (isShotSize) { input.className = 'detail-shotSize'; input.placeholder = '景别'; }
        if (isCameraMove) { input.className = 'detail-cameraMove'; input.placeholder = '单个/组合运镜'; }
        if (isComposition) { input.className = 'detail-composition'; input.placeholder = '常见构图'; }
        if (isTransition) { input.className = 'detail-transition'; input.placeholder = '常见转场'; }
        if (isReferenceField) {
          const referenceLabel = isShotSize ? '参考景别' : isCameraMove ? '参考运镜' : isComposition ? '参考构图' : isTransition ? '参考转场' : `参考${name}`;
          referenceEditor = documentTarget.createElement('div');
          referenceEditor.className = 'reference-field-editor';
          const referenceButton = documentTarget.createElement('button');
          referenceButton.type = 'button';
          referenceButton.className = 'reference-field-btn';
          referenceButton.textContent = referenceLabel;
          referenceButton.addEventListener('click', event => { event.stopPropagation(); referenceEditor.classList.toggle('open'); });
          referenceButton.addEventListener('mousedown', event => event.stopPropagation());
          const referenceMenu = documentTarget.createElement('div');
          referenceMenu.className = 'reference-field-menu';
          referenceOptions.forEach(optionValue => {
            const optionButton = documentTarget.createElement('button');
            optionButton.type = 'button';
            optionButton.textContent = optionValue;
            optionButton.addEventListener('click', event => {
              event.stopPropagation();
              if (isCameraMove || isComposition) {
                const values = input.value.trim().split(/[+＋、,，/|]+/).map(value => value.trim()).filter(Boolean);
                if (!values.includes(optionValue)) values.push(optionValue);
                input.value = values.join('+');
              } else input.value = optionValue;
              saveValue();
              referenceEditor.classList.remove('open');
            });
            optionButton.addEventListener('mousedown', event => event.stopPropagation());
            referenceMenu.appendChild(optionButton);
          });
          referenceEditor.append(input, referenceButton, referenceMenu);
        }
      } else {
        input.className = isAnalysis ? 'detail-shotAnalysis' : 'detail-shotContent';
        input.placeholder = isAnalysis ? '填入视听语言分析' : '填入画面内容';
        input.rows = 4;
      }
      input.value = getTemplateEntryValue(active, name);
      input.addEventListener('click', event => event.stopPropagation());
      input.addEventListener('mousedown', event => event.stopPropagation());
      const saveValue = () => {
        if (!active) return;
        const value = isShotSize || isCameraMove ? input.value.trim() : input.value;
        if (updateShotField) {
          if (isShotSize) updateShotField(active, { shotSize: value });
          else if (isCameraMove) updateShotField(active, { cameraMove: value });
          else if (isAnalysis) updateShotField(active, { analysis: value });
          else updateShotField(active, { custom: { ...(active.custom || {}), [name]: value } });
          return;
        }
        if (isShotSize) active.shotSize = value;
        else if (isCameraMove) active.cameraMove = value;
        else if (isAnalysis) active.analysis = value;
        else {
          if (!active.custom || typeof active.custom !== 'object') active.custom = {};
          active.custom[name] = value;
        }
        scheduleRowSync(active);
        markDirty();
      };
      input.addEventListener('input', saveValue);
      wrapper.append(label, referenceEditor || input);
      area.appendChild(wrapper);
    });
  };

  documentTarget.addEventListener('click', event => {
    if (event.target?.closest('.reference-field-editor')) return;
    documentTarget.querySelectorAll('.reference-field-editor.open').forEach(editor => editor.classList.remove('open'));
  });

  return {
    updateTable,
    scheduleRowSync,
    syncRow,
    sync,
    setActiveShot,
    renderCustomFieldsFor,
    renderCustomFields: active => { if (customFieldsArea) renderCustomFieldsFor(active, customFieldsArea); },
    updateCustomFieldNames: () => {
      setCustomFieldNames(getTemplateFields());
      const active = (getEntries() || []).find(entry => Number(entry.shotNumber) === Number(getActiveShotNumber()));
      if (active) renderCustomFieldsFor(active, customFieldsArea);
    },
    setUserJump: value => { userJump = !!value; }
  };
}
