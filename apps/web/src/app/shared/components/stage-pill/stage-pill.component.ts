import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { PipelineStatus, STAGE_BY_ID } from '../../../core/api/types';

interface StageStyle {
  bg: string; fg: string; dot: string; border: string;
}

const STYLES: Record<PipelineStatus, StageStyle> = {
  IN_SIGHT:        { bg: 'var(--bg-pill)',        fg: 'var(--c-ink-700)',    dot: 'var(--c-ink-400)',    border: 'var(--border-default)' },
  CONTACTED:       { bg: 'var(--c-cobalt-50)',    fg: 'var(--c-cobalt-700)', dot: 'var(--c-cobalt-300)', border: 'var(--c-cobalt-100)' },
  IN_CONVERSATION: { bg: 'var(--c-cobalt-100)',   fg: 'var(--c-cobalt-800)', dot: 'var(--c-cobalt-500)', border: 'var(--c-cobalt-200)' },
  PROPOSAL:        { bg: 'var(--c-cobalt-700)',   fg: 'var(--t-on-cobalt)',  dot: '#fff',                border: 'var(--c-cobalt-700)' },
  WON:             { bg: 'var(--c-risk-low-bg)',  fg: 'var(--c-risk-low)',   dot: 'var(--c-risk-low)',   border: 'transparent' },
  LOST:            { bg: 'var(--c-risk-high-bg)', fg: 'var(--c-risk-high)',  dot: 'var(--c-risk-high)',  border: 'transparent' },
};

export const STAGE_STYLES = STYLES;

@Component({
  selector: 'tk-stage-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center whitespace-nowrap"
      [style.gap.px]="6"
      [style.padding]="padY() + ' ' + padX()"
      [style.fontSize]="fontSize()"
      [style.fontWeight]="500"
      [style.background]="style().bg"
      [style.color]="style().fg"
      [style.border]="'1px solid ' + style().border"
      [style.borderRadius]="'var(--r-pill)'"
      [style.lineHeight]="1"
    >
      @if (showDot) {
        <span
          [style.width.px]="6" [style.height.px]="6"
          [style.borderRadius]="'50%'" [style.background]="style().dot">
        </span>
      }
      {{ label() }}
    </span>
  `,
})
export class StagePillComponent {
  @Input({ required: true }) set stage(v: PipelineStatus) { this._stage.set(v); }
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() showDot = true;

  private readonly _stage = signal<PipelineStatus>('IN_SIGHT');

  readonly style = computed<StageStyle>(() => STYLES[this._stage()] ?? STYLES.IN_SIGHT);
  readonly label = computed(() => STAGE_BY_ID[this._stage()]?.label ?? this._stage());

  padY(): string { return this.size === 'lg' ? '6px' : this.size === 'md' ? '4px' : '3px'; }
  padX(): string { return this.size === 'lg' ? '12px' : this.size === 'md' ? '10px' : '8px'; }
  fontSize(): string { return this.size === 'lg' ? '13px' : this.size === 'md' ? '12px' : '11px'; }
}
