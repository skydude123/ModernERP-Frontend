import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { CookieService } from 'ngx-cookie-service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  // providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]

  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
     provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    provideHttpClient(withInterceptorsFromDi()),
    CookieService,
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
  ]
};
