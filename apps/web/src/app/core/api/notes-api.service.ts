import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './types';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);

  list(entryId: string): Observable<Note[]> {
    return this.http.get<Note[]>(
      `${API}/pipeline/${entryId}/notes`,
      { withCredentials: true },
    );
  }

  create(entryId: string, body: string): Observable<Note> {
    return this.http.post<Note>(
      `${API}/pipeline/${entryId}/notes`,
      { body },
      { withCredentials: true },
    );
  }

  update(id: string, body: string): Observable<Note> {
    return this.http.patch<Note>(`${API}/notes/${id}`, { body }, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/notes/${id}`, { withCredentials: true });
  }
}
