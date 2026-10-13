// import { DOCUMENT } from '@angular/common';
import { inject, Injectable, DOCUMENT } from '@angular/core';
import { REPORTING_ENDPOINTS } from './reporting-endpoint';

// import { REPORTING_ENDPOINTS } from './reporting-endpoints';

@Injectable({
  providedIn: 'root',
})
export class ReportingUrlService {
  private readonly document = inject(DOCUMENT);

  private viewerScriptLoadPromise: Promise<void> | null = null;

  /**
   * Main backend API URL.
   */
  readonly apiBaseUrl = REPORTING_ENDPOINTS.apiBaseUrl;

  /**
   * Telerik Reporting REST service URL.
   */
  readonly reportingServiceUrl =
    REPORTING_ENDPOINTS.reportingServiceUrl;

  /**
   * Telerik viewer JavaScript resource URL.
   */
  readonly viewerScriptUrl =
    REPORTING_ENDPOINTS.viewerScriptUrl;

  /**
   * Loads the Telerik viewer script only once.
   *
   * Multiple report pages may call this method safely.
   * The same script will not be inserted repeatedly.
   */
  loadViewerScript(): Promise<void> {
    if (this.viewerScriptLoadPromise) {
      return this.viewerScriptLoadPromise;
    }

    const scriptId = 'global-telerik-report-viewer-script';

    const existingScript =
      this.document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript?.dataset['loaded'] === 'true') {
      return Promise.resolve();
    }

    this.viewerScriptLoadPromise = new Promise<void>(
      (resolve, reject) => {
        if (existingScript) {
          existingScript.addEventListener(
            'load',
            () => resolve(),
            { once: true },
          );

          existingScript.addEventListener(
            'error',
            () => {
              this.viewerScriptLoadPromise = null;

              reject(
                new Error(
                  `Failed to load Telerik viewer script: ${this.viewerScriptUrl}`,
                ),
              );
            },
            { once: true },
          );

          return;
        }

        const script = this.document.createElement('script');

        script.id = scriptId;
        script.type = 'text/javascript';
        script.src = this.viewerScriptUrl;
        script.async = true;

        script.addEventListener(
          'load',
          () => {
            script.dataset['loaded'] = 'true';
            resolve();
          },
          { once: true },
        );

        script.addEventListener(
          'error',
          () => {
            script.remove();
            this.viewerScriptLoadPromise = null;

            reject(
              new Error(
                `Failed to load Telerik viewer script: ${this.viewerScriptUrl}`,
              ),
            );
          },
          { once: true },
        );

        this.document.head.appendChild(script);
      },
    );

    return this.viewerScriptLoadPromise;
  }

  /**
   * Creates a URL relative to the backend API.
   *
   * Example:
   * buildApiUrl('/api/purchase-orders/064351')
   */
  buildApiUrl(relativePath: string): string {
    const normalizedPath = relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`;

    return `${this.apiBaseUrl}${normalizedPath}`;
  }
}