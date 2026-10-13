import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://erp.example/api/' }
      ]
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the cookie-enabled login endpoint without duplicating the api segment', () => {
    service.login({ userId: 'USER', password: 'secret' }).subscribe();

    const request = http.expectOne('https://erp.example/api/Auth/latest/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ success: true, message: 'OK', user: null });
  });

  it('uses the authenticated logout endpoint', () => {
    service.logout().subscribe();

    const request = http.expectOne('https://erp.example/api/Auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    request.flush(null);
  });
});
