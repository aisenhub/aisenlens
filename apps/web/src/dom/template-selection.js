export function createTemplateSelectionAdapter(element) {
  return {
    getValue: () => element?.value || '',
    setValue: value => {
      if (element) element.value = value;
    }
  };
}
