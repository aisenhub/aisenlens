export function createNewSessionWorkflow({
  setCurrentProject = () => {},
  resetProjectState = () => {},
  updateCurrentProjectButton = () => {},
  renderShots = () => {}
} = {}) {
  const start = () => {
    setCurrentProject(null, null);
    resetProjectState();
    updateCurrentProjectButton();
    renderShots();
  };

  return { start };
}
