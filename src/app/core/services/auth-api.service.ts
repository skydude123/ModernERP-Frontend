import { HttpClient } from '@angular/common/http';
import { Inject, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private http = inject(HttpClient);
  //private baseUrl = inject(API_BASE_URL);
  private readonly baseUrl: string;

  constructor(@Inject(API_BASE_URL) apiBaseUrl: string) {
    this.baseUrl = `${apiBaseUrl}/api/Auth/latest/login`;
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}`, payload, {
      withCredentials: true,
    });
  }
}
