import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatePipelineEntryPayload,
  PipelineEntry,
  PipelineStatus,
  UpdatePipelineStatusPayload,
} from './types';

const API = '/api/pipeline';

export interface PipelineListFilter {
  status?: PipelineStatus;
  staleDays?: number;
  withOverdueTask?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PipelineApiService {
  private readonly http = inject(HttpClient);

  list(filter: PipelineListFilter = {}): Observable<PipelineEntry[]> {
    let p = new HttpParams();
    if (filter.status) p = p.set('status', filter.status);
    if (filter.staleDays != null) p = p.set('staleDays', String(filter.staleDays));
    if (filter.withOverdueTask) p = p.set('withOverdueTask', 'true');
    return this.http.get<PipelineEntry[]>(API, { params: p, withCredentials: true });
  }

  get(id: string): Observable<PipelineEntry> {
    return this.http.get<PipelineEntry>(`${API}/${id}`, { withCredentials: true });
  }

  create(payload: CreatePipelineEntryPayload): Observable<PipelineEntry> {
    return this.http.post<PipelineEntry>(API, payload, { withCredentials: true });
  }

  changeStatus(id: string, payload: UpdatePipelineStatusPayload): Observable<PipelineEntry> {
    return this.http.patch<PipelineEntry>(`${API}/${id}/status`, payload, { withCredentials: true });
  }

  updateValueHypothesis(id: string, text: string): Observable<PipelineEntry> {
    return this.http.patch<PipelineEntry>(
      `${API}/${id}/value-hypothesis`,
      { text },
      { withCredentials: true },
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`, { withCredentials: true });
  }
}
