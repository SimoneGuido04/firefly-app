import { create } from 'zustand';

interface RefreshState {
    /** Incremented every time data changes — screens watch this to reload */
    refreshKey: number;
    triggerRefresh: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
    refreshKey: 0,
    triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
