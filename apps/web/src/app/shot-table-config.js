import {
  getOrderedFixedTableColumns,
  getSelectedTableDisplayFields,
  getVisibleTableFields
} from './selectors.js';

export function createShotTableConfigController({
  getConfiguredFields = () => [],
  fixedColumns = [],
  getSettings = () => ({}),
  saveSettings = () => {},
  displayFieldLimit = 4
} = {}) {
  const getVisibleFields = () => getVisibleTableFields(getConfiguredFields(), fixedColumns);
  const getOrderedColumns = orderOverride => getOrderedFixedTableColumns(fixedColumns, orderOverride);
  const saveFixedOrder = order => {
    const nextOrder = order.filter(key => key === 'duration' || key === 'image');
    saveSettings({ ...getSettings(), tableFixedOrder: nextOrder });
  };
  const getSelectedFields = () => getSelectedTableDisplayFields(
    getVisibleFields(),
    getSettings().tableDisplayFields,
    displayFieldLimit
  );
  const getColumns = () => [
    ...getOrderedColumns(),
    ...getVisibleFields().map(field => ({ key: 'field', field, label: field }))
  ];
  const getHomepageColumns = () => [
    ...getOrderedColumns(),
    ...getSelectedFields().map(field => ({ key: 'field', field, label: field }))
  ];

  return {
    getVisibleFields,
    getOrderedColumns,
    saveFixedOrder,
    getSelectedFields,
    getColumns,
    getHomepageColumns
  };
}
