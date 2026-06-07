export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

class ToastStore {
  items = $state<Toast[]>([]);

  show(message: string, type: ToastType = 'success', duration = 2400) {
    const id = crypto.randomUUID();
    this.items = [...this.items, { id, message, type }];
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: string) {
    this.items = this.items.filter(t => t.id !== id);
  }
}

export const toast = new ToastStore();
