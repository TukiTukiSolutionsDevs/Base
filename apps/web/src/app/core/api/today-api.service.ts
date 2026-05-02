import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TodayAlerts } from './types';

const API = '/api/today';

@Injectable({ providedIn: 'root' })
export class TodayApiService {
  private readonly http = inject(HttpClient);

  getAlertsSummary(): Observable<TodayAlerts> {
    return this.http.get<TodayAlerts>(`${API}/alerts`, { withCredentials: true });
  }
}
