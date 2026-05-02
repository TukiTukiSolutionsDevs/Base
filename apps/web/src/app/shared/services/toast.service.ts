import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  kind: 'success' | 'info' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toast = signal<ToastMessage | null>(null);
  readonly toast = this._toast.asReadonly();

  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, kind: ToastMessage['kind'] = 'success', durationMs = 2600): void {
    if (this.timer) clearTimeout(this.timer);
    this._toast.set({ id: ++this.seq, text, kind });
    this.timer = setTimeout(() => this._toast.set(null), durationMs);
  }

  success(text: string) { this.show(text, 'success'); }
  info(text: string)    { this.show(text, 'info'); }
  error(text: string)   { this.show(text, 'error', 4000); }

  clear(): void { this._toast.set(null); }
}
