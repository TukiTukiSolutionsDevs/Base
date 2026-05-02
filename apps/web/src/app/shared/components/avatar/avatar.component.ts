import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

const PALETTE = [
  '#3a5ef0', '#5b81ff', '#0891b2', '#16a34a', '#d97706',
  '#dc2626', '#9333ea', '#db2777', '#0d9488', '#65a30d',
];

export function initials(razon: string): string {
  if (!razon) return '?';
  const cleaned = razon
    .replace(/\b(S\.A\.C?\.?|S\.R\.L\.?|E\.I\.R\.L\.?|S\.A\.|del|de|la|el|los|las|y)\b/gi, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || razon[0]!.toUpperCase();
}

export function colorFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

@Component({
  selector: 'tk-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-center font-semibold text-white shrink-0"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.minWidth.px]="size"
      [style.borderRadius.px]="8"
      [style.fontSize.px]="fontSize()"
      [style.letterSpacing]="'0.02em'"
      [style.background]="bg()"
      [style.boxShadow]="'inset 0 0 0 1px rgba(255,255,255,0.12)'"
    >{{ ini() }}</div>
  `,
})
export class AvatarComponent {
  @Input() set name(v: string) { this._name.set(v ?? ''); }
  @Input() set seed(v: string) { this._seed.set(v ?? ''); }
  @Input() size = 32;

  private readonly _name = signal<string>('');
  private readonly _seed = signal<string>('');

  readonly ini = computed(() => initials(this._name()));
  readonly bg = computed(() => {
    const c = colorFor(this._seed() || this._name());
    return `linear-gradient(135deg, ${c}, ${c}cc)`;
  });

  fontSize(): number {
    const s = this.size;
    if (s <= 24) return 10;
    if (s <= 32) return 11;
    if (s <= 48) return 14;
    return 18;
  }
}
