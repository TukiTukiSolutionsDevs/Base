import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Mapea el "kind" de interacción/tarea a un icono lucide.
 * Acepta tanto los strings legacy del prototipo (email, llamada, reunion…)
 * como los enums del backend (EMAIL, CALL, MEETING, LINKEDIN, OTHER, RESEARCH).
 */
const ICON_MAP: Record<string, string> = {
  email: 'mail',         EMAIL: 'mail',
  llamada: 'phone',      call: 'phone',     CALL: 'phone',
  reunion: 'handshake',  meeting: 'handshake', MEETING: 'handshake',
  linkedin: 'linkedin',  LINKEDIN: 'linkedin',
  investigar: 'search-sparkle', RESEARCH: 'search-sparkle',
  nota: 'note',          note: 'note',
  otro: 'message',       other: 'message', OTHER: 'message',
};

const COLOR_MAP: Record<string, string> = {
  email: 'var(--c-cobalt-500)',     EMAIL: 'var(--c-cobalt-500)',
  llamada: 'var(--c-info)',         call: 'var(--c-info)',          CALL: 'var(--c-info)',
  reunion: 'var(--c-cobalt-700)',   meeting: 'var(--c-cobalt-700)', MEETING: 'var(--c-cobalt-700)',
  linkedin: '#0a66c2',              LINKEDIN: '#0a66c2',
  investigar: 'var(--c-risk-mid)',  RESEARCH: 'var(--c-risk-mid)',
  nota: 'var(--c-ink-500)',         note: 'var(--c-ink-500)',
  otro: 'var(--c-ink-400)',         other: 'var(--c-ink-400)',     OTHER: 'var(--c-ink-400)',
};

@Component({
  selector: 'tk-type-icon',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<tk-icon [name]="iconName()" [size]="size" [style.color]="color()" />`,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class TypeIconComponent {
  @Input() set kind(v: string | null | undefined) { this._kind.set(v ?? 'other'); }
  @Input() size = 16;

  private readonly _kind = signal<string>('other');

  readonly iconName = computed(() => ICON_MAP[this._kind()] ?? 'message');
  readonly color    = computed(() => COLOR_MAP[this._kind()] ?? 'var(--c-ink-500)');
}
