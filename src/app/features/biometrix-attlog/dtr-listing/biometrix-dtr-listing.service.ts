import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BiometrixDtrListingFilter, BiometrixDtrListingRow, BiometrixDtrListingUpdateRequest, BiometrixLookupItem } from '../biometrix-attlog.model';


@Injectable({
  providedIn: 'root'
})
export class BiometrixDtrListingService {
  private readonly http = inject(HttpClient);

  // IMPORTANT:
  // If WALA kay Angular proxy, gamita ang full backend URL.
  // Ilisi ang port kung lahi ang actual API nimo.
  private readonly apiBaseUrl = 'http://localhost:51033/api/biometrix/dtr-listing';

  // If naa kay working proxy.conf.json, pwede nimo ni ibalik:
  // private readonly apiBaseUrl = '/api/biometrix/dtr-listing';

  getBranches(): Observable<BiometrixLookupItem[]> {
    return this.http.get<BiometrixLookupItem[]>(
      `${this.apiBaseUrl}/branches`
    );
  }

  getPayrollPeriods(): Observable<BiometrixLookupItem[]> {
    return this.http.get<BiometrixLookupItem[]>(
      `${this.apiBaseUrl}/payroll-periods`
    );
  }

  getListing(filter: BiometrixDtrListingFilter): Observable<BiometrixDtrListingRow[]> {
    const params = new HttpParams()
      .set('branchName', filter.branchName ?? 'ALL')
      .set('payrollPeriod', String(filter.payrollPeriod));

    return this.http.get<BiometrixDtrListingRow[]>(
      `${this.apiBaseUrl}/list`,
      { params }
    );
  }

  updateDtr(
    dtrId: number,
    payload: BiometrixDtrListingUpdateRequest
  ): Observable<BiometrixDtrListingRow> {
    return this.http.put<BiometrixDtrListingRow>(
      `${this.apiBaseUrl}/${dtrId}`,
      payload
    );
  }
}