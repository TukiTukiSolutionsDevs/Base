import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateInteractionPayload, Interaction } from './types';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class InteractionsApiService {
  private readonly http = inject(HttpClient);

  list(entryId: string): Observable<Interaction[]> {
    return this.http.get<Interaction[]>(
      `${API}/pipeline/${entryId}/interactions`,
      { withCredentials: true },
    );
  }

  create(entryId: string, payload: CreateInteractionPayload): Observable<Interaction> {
    return this.http.post<Interaction>(
      `${API}/pipeline/${entryId}/interactions`,
      payload,
      { withCredentials: true },
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/interactions/${id}`, { withCredentials: true });
  }
}
