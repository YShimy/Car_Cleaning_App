import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'whatsapp';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  body?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast, durationMs = 4000) => {
    const id = nextId++;
    // Keep at most three on screen so they never cover the page.
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), durationMs);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  show: (title: string, body?: string) =>
    useToastStore.getState().push({ variant: 'default', title, body }),
  success: (title: string, body?: string) =>
    useToastStore.getState().push({ variant: 'success', title, body }),
  error: (title: string, body?: string) =>
    useToastStore.getState().push({ variant: 'error', title, body }),
  whatsapp: (title: string, body?: string) =>
    useToastStore.getState().push({ variant: 'whatsapp', title, body }, 5500),
};
