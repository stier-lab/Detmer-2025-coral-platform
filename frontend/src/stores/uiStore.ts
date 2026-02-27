import { create } from 'zustand';

// UI state store (non-persisted)
interface UIStore {
  selectedSiteId: string | null;
  selectedStudyId: string | null;
  activeTab: 'survival' | 'growth' | 'map' | 'studies';
  sidebarOpen: boolean;
  setSelectedSite: (id: string | null) => void;
  setSelectedStudy: (id: string | null) => void;
  setActiveTab: (tab: 'survival' | 'growth' | 'map' | 'studies') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedSiteId: null,
  selectedStudyId: null,
  activeTab: 'survival',
  sidebarOpen: true,

  setSelectedSite: (id) => set({ selectedSiteId: id }),
  setSelectedStudy: (id) => set({ selectedStudyId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
