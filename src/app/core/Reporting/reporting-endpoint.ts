import { environment } from '../../../environments/environment';

function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const apiBaseUrl = removeTrailingSlash(environment.apiBaseUrl);

export const REPORTING_ENDPOINTS = Object.freeze({
  /**
   * Main .NET API address.
   *
   * Development:
   * http://localhost:51033
   *
   * Production:
   * https://tpa-inv-backend.twinbeeprintads.com
   */
  apiBaseUrl,

  /**
   * Telerik Reporting REST service.
   */
  reportingServiceUrl: `${apiBaseUrl}/api/reports`,

  /**
   * Telerik HTML5 Report Viewer JavaScript resource.
   */
  viewerScriptUrl:
    `${apiBaseUrl}/api/reports/resources/js/telerikReportViewer`,
});

export type ReportingEndpoints = typeof REPORTING_ENDPOINTS;