export function createTemplatePoolController({
  storage,
  referenceLabel = '参考字段',
  userLabel = '用户字段'
} = {}) {
  let fields = [];
  let userFields = [];
  let properties = {};

  const sync = () => {
    const state = storage.getState();
    fields = [...state.fields];
    userFields = [...state.userFields];
    properties = { ...state.properties };
    return state;
  };
  const loadDefinitions = () => storage.loadDefinitions();
  const saveDefinitions = () => storage.saveDefinitions();
  const loadFields = () => {
    storage.loadFields();
    sync();
  };
  const addField = fieldName => {
    const added = storage.addField(fieldName);
    if (added) sync();
    return added;
  };
  const getReferenceOptions = fieldName => storage.getReferenceOptions(fieldName);
  const updateReferenceOptions = (fieldName, options) => storage.updateReferenceOptions(fieldName, options);
  const getCategories = () => storage.getCategories().map(category => ({
    ...category,
    label: category.key === 'reference' ? referenceLabel : userLabel
  }));

  return {
    sync,
    loadDefinitions,
    saveDefinitions,
    loadFields,
    addField,
    getReferenceOptions,
    updateReferenceOptions,
    getCategories,
    getFields: () => fields,
    getUserFields: () => userFields,
    getProperties: () => properties
  };
}
