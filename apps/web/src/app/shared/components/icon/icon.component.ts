import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * <tk-icon name="..." [size]="N"/>
 *
 * Lucide-style inline SVG icons. Stroke = 1.8.
 * Soporta los nombres usados por el prototipo TUKI.
 */
@Component({
  selector: 'tk-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      [innerHTML]="paths"
    ></svg>
  `,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  @Input() name = 'circle';
  @Input() size: number | string = 16;

  constructor(private readonly sanitizer: DomSanitizer) {}

  /** Innermost SVG paths (mismas formas que el icons.jsx del proto) */
  get paths(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.svgFor(this.name));
  }

  private svgFor(name: string): string {
    switch (name) {
      case 'home':
        return '<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>';
      case 'kanban':         return '<rect x="3" y="3" width="6" height="18" rx="1.5"/><rect x="11" y="3" width="6" height="11" rx="1.5"/><rect x="19" y="3" width="2" height="6" rx="1"/>';
      case 'globe':          return '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>';
      case 'users':          return '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>';
      case 'settings':       return '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.05a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.05a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z"/>';
      case 'search':         return '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>';
      case 'plus':           return '<path d="M12 5v14M5 12h14"/>';
      case 'x':              return '<path d="M18 6L6 18M6 6l12 12"/>';
      case 'check':          return '<path d="M20 6L9 17l-5-5"/>';
      case 'chevron-down':   return '<path d="M6 9l6 6 6-6"/>';
      case 'chevron-right':  return '<path d="M9 6l6 6-6 6"/>';
      case 'chevron-left':   return '<path d="M15 6l-6 6 6 6"/>';
      case 'more':
      case 'more-horizontal': return '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>';
      case 'mail':           return '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>';
      case 'phone':          return '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>';
      case 'calendar':       return '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';
      case 'clock':          return '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
      case 'alert':
      case 'alert-circle':   return '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
      case 'alert-tri':      return '<path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>';
      case 'snow':           return '<path d="M12 2v20M5 5l14 14M5 19L19 5M2 12h20"/>';
      case 'trending':       return '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>';
      case 'trending-down':  return '<path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>';
      case 'linkedin':       return '<path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 10-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>';
      case 'message':        return '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>';
      case 'note':           return '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>';
      case 'handshake':      return '<path d="M11 17l2 2a1 1 0 003-3"/><path d="M14 16l3 3a1 1 0 003-3l-3.5-3.5"/><path d="M3 12l5-5 6 6-5 5z"/><path d="M7 8L4 11"/>';
      case 'user':           return '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>';
      case 'map-pin':        return '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>';
      case 'external':
      case 'link':           return '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/>';
      case 'filter':         return '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>';
      case 'list':           return '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>';
      case 'grid':
      case 'layers':         return '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
      case 'drag':           return '<circle cx="9" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="18" r="1.2"/>';
      case 'edit':           return '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>';
      case 'trash':          return '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>';
      case 'spark':
      case 'sparkles':       return '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.6 1.6L21 16l-1.4.4L19 18l-.6-1.6L17 16l1.4-.4z"/>';
      case 'search-sparkle': return '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 7l.7 2L13 9l-1.3.5L11 11l-.7-1.5L9 9l1.3-.5z"/>';
      case 'moon':           return '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
      case 'sun':            return '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
      case 'building':       return '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 12h2M14 12h2M8 17h2M14 17h2"/>';
      case 'target':         return '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>';
      case 'send':           return '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>';
      case 'logo':           return '<rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor"/><path d="M7.5 8.5h9M12 8.5v8M8.5 16.5h7" stroke="var(--bg-surface, #fff)" stroke-width="1.8" stroke-linecap="round"/>';
      default:               return '<circle cx="12" cy="12" r="9"/>';
    }
  }
}
