import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Contact, CreateContactPayload } from './types';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ContactsApiService {
  private readonly http = inject(HttpClient);

  list(entryId: string): Observable<Contact[]> {
    return this.http.get<Contact[]>(
      `${API}/pipeline/${entryId}/contacts`,
      { withCredentials: true },
    );
  }

  create(entryId: string, payload: CreateContactPayload): Observable<Contact> {
    return this.http.post<Contact>(
      `${API}/pipeline/${entryId}/contacts`,
      payload,
      { withCredentials: true },
    );
  }

  update(id: string, payload: Partial<CreateContactPayload>): Observable<Contact> {
    return this.http.patch<Contact>(
      `${API}/contacts/${id}`,
      payload,
      { withCredentials: true },
    );
  }

  setPrimary(id: string): Observable<Contact> {
    return this.http.patch<Contact>(
      `${API}/contacts/${id}/primary`,
      {},
      { withCredentials: true },
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/contacts/${id}`, { withCredentials: true });
  }
}
