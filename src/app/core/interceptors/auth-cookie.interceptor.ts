import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  catchError,
  throwError
} from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { CookieStorageService } from '../services/cookie-storage.service';

export const authCookieInterceptor: HttpInterceptorFn = (
  request,
  next
) => {
  const apiBaseUrl = inject(API_BASE_URL)
    .trim()
    .replace(/\/+$/, '');

  const router = inject(Router);
  const cookieStorage = inject(CookieStorageService);

  const isApiRequest =
    request.url.startsWith(apiBaseUrl);

  const isLoginRequest =
    request.url
      .toLowerCase()
      .includes('/api/auth/latest/login');

  const requestWithCredentials =
    isApiRequest
      ? request.clone({
        withCredentials: true
      })
      : request;

  return next(requestWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {
      const requestUrl =
        requestWithCredentials.url.toLowerCase();

      const isItemMasterSaveRequest =
        requestUrl.includes('/api/item-master/save');

      if (
        isApiRequest &&
        error.status === 401 &&
        !isLoginRequest &&
        !isItemMasterSaveRequest
      ) {
        // Real authentication failure:
        // clear frontend session and send user to login.
        cookieStorage.clearAuth();

        const currentUrl = router.url;

        if (!currentUrl.startsWith('/login')) {
          void router.navigate(
            ['/login'],
            {
              queryParams: {
                returnUrl: currentUrl
              }
            }
          );
        }
      }

      return throwError(() => error);
    })
  );
};