/**
 * Application State Store (Zustand)
 * Story 1.1: AWS Cognito MFA Integration
 * Task 5.6: Reset Zustand store on logout
 *
 * AC5: Logout Clears All State
 * - Client-side state is cleared (Zustand store reset)
 */

import { create } from 'zustand';

// App state interface
interface AppState {
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Any cached data
  cachedData: Record<string, any>;
  setCachedData: (key: string, data: any) => void;
  clearCachedData: () => void;

  // Reset all state (called on logout)
  resetStore: () => void;
}

// Initial state
const initialState = {
  sidebarOpen: true,
  cachedData: {},
};

// Create store
export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setCachedData: (key, data) =>
    set((state) => ({
      cachedData: { ...state.cachedData, [key]: data },
    })),

  clearCachedData: () => set({ cachedData: {} }),

  // Reset to initial state on logout
  resetStore: () => set(initialState),
}));

// Export reset function for use in AuthContext
export const resetAppStore = () => {
  useAppStore.getState().resetStore();
};
