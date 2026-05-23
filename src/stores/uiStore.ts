'use client';
import { create } from 'zustand';

interface UIStore {
  sidebarCollapsed: boolean;
  activeTaskId: string | null;
  taskPanelOpen: boolean;
  notificationDrawerOpen: boolean;
  searchOpen: boolean;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  toggleSidebar: () => void;
  toggleNotifications: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeTaskId: null,
  taskPanelOpen: false,
  notificationDrawerOpen: false,
  searchOpen: false,
  openTaskDetail: (taskId) => set({ activeTaskId: taskId, taskPanelOpen: true }),
  closeTaskDetail: () => set({ activeTaskId: null, taskPanelOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleNotifications: () => set((s) => ({ notificationDrawerOpen: !s.notificationDrawerOpen })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}));
