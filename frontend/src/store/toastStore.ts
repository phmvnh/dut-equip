import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout>;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'success',
  show: (message, type = 'success') => {
    clearTimeout(timer);
    set({ visible: true, message, type });
    timer = setTimeout(() => set({ visible: false }), 2000);
  },
  hide: () => {
    clearTimeout(timer);
    set({ visible: false });
  },
}));
