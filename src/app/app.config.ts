import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { IMAGE_CONFIG } from '@angular/common';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { CookieService } from 'ngx-cookie-service';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi
} from '@angular/common/http';

import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';
import { authCookieInterceptor } from './core/interceptors/auth-cookie.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    provideAnimations(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),

    provideHttpClient(
      withInterceptors([
        authCookieInterceptor
      ]),
      withInterceptorsFromDi()
    ),

    CookieService,

    {
      provide: API_BASE_URL,
      useValue: environment.apiBaseUrl
    },

    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true
      }
    }
  ]
};