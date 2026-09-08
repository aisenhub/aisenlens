import { create } from "zustand"

interface WorkflowUiState {
  mobileNavigationOpen: boolean
  setMobileNavigationOpen: (open: boolean) => void
}

const useWorkflowUiStore = create<WorkflowUiState>((set) => ({
  mobileNavigationOpen: false,
  setMobileNavigationOpen: (mobileNavigationOpen) =>
    set({ mobileNavigationOpen }),
}))

export default useWorkflowUiStore
