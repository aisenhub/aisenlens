import {
  getConfiguredTemplateFields,
  getSelectedTemplate
} from './selectors.js';

export function createTemplateRuntime({
  templates = {},
  getTemplateName = () => '',
  defaultTemplateName = '',
  getController = () => null,
  updateShotTable = () => {}
} = {}) {
  const getSelected = () => getSelectedTemplate(
    templates,
    getTemplateName(),
    defaultTemplateName
  );

  const getConfiguredFields = () => getConfiguredTemplateFields(
    templates,
    getTemplateName(),
    defaultTemplateName
  );

  const callController = (method, ...args) => getController()?.[method]?.(...args);

  return {
    getSelection: getTemplateName,
    getSelectedTemplate: getSelected,
    getConfiguredTemplateFields: getConfiguredFields,
    syncTemplateOptions: preferredName => callController('syncTemplateOptions', preferredName),
    updateTemplateMenuLabel: () => callController('updateTemplateMenuLabel'),
    renderTableDisplaySettings: () => callController('renderTableDisplaySettings'),
    renderTemplateEditor: () => callController('renderTemplateEditor'),
    renderCustomTemplateEditor: () => callController('renderCustomTemplateEditor'),
    refreshShotTableConfiguration: () => {
      callController('renderTableDisplaySettings');
      updateShotTable();
    }
  };
}
