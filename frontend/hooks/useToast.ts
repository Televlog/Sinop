import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

let toastCount = 0;

// Simple global toast store
const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...toasts]));
};

export const toast = (props: Omit<Toast, 'id'>) => {
  const id = String(toastCount++);
  const t: Toast = { id, duration: 4000, ...props };
  toasts = [t, ...toasts].slice(0, 5);
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter(x => x.id !== id);
    notifyListeners();
  }, t.duration);
};

export const useToast = () => {
  const [, setRender] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => setRender(n => n + 1);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { toast, toasts };
};
