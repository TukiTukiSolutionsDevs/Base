import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTaskPayload, TaskItem, UpdateTaskPayload } from './types';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly http = inject(HttpClient);

  today(): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(`${API}/tasks/today`, { withCredentials: true });
  }

  byEntry(entryId: string): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(
      `${API}/pipeline/${entryId}/tasks`,
      { withCredentials: true },
    );
  }

  create(payload: CreateTaskPayload): Observable<TaskItem> {
    return this.http.post<TaskItem>(`${API}/tasks`, payload, { withCredentials: true });
  }

  update(id: string, payload: UpdateTaskPayload): Observable<TaskItem> {
    return this.http.patch<TaskItem>(`${API}/tasks/${id}`, payload, { withCredentials: true });
  }

  complete(id: string): Observable<TaskItem> {
    return this.update(id, { completed: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/tasks/${id}`, { withCredentials: true });
  }
}
