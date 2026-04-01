import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

interface UIStore {
  activeToasts: Toast[];
  activityFeed: ActivityEvent[];
  sidebarCollapsed: boolean;
  currentPage: string;
  theme: 'dark';

  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  logActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeToasts: [],
  activityFeed: [],
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

  logActivity: (event) =>
    set((state) => ({
      activityFeed: [
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...event,
        },
        ...state.activityFeed,
      ].slice(0, 50),
    })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setCurrentPage: (page) => set({ currentPage: page }),
}));
