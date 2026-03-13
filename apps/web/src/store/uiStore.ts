import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UIStore {
  activeToasts: Toast[];
  sidebarCollapsed: boolean;
  currentPage: string;
  theme: 'dark';

  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeToasts: [],
  sidebarCollapsed: false,
  currentPage: '/dashboard',
  theme: 'dark',

  addToast: (message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID();
    set((state) => ({
      activeToasts: [...state.activeToasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          activeToasts: state.activeToasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      activeToasts: state.activeToasts.filter((t) => t.id !== id),
    })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setCurrentPage: (page) => set({ currentPage: page }),
}));
