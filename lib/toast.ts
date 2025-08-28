export type ToastType = 'info' | 'success' | 'error' | 'warning';
export type ToastPayload = { message: string; type?: ToastType; duration?: number };

export function toast(message: string, opts: Omit<ToastPayload, 'message'> = {}) {
  if (typeof window === 'undefined') return;
  const detail: ToastPayload = { message, type: 'info', duration: 1800, ...opts };
  window.dispatchEvent(new CustomEvent<ToastPayload>('toast', { detail }));
}

