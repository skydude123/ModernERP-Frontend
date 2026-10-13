import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  FuelAcceptanceCommandResponse,
  FuelAcceptanceSaveRequest,
} from '../models/fuel-acceptance.models';
import { FuelAcceptanceService } from './fuel-acceptance.service';

describe('FuelAcceptanceService', () => {
  let service: FuelAcceptanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://erp.test/api' },
      ],
    });

    service = TestBed.inject(FuelAcceptanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses server-side list query parameters', () => {
    service.getList({
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
      status: 'A',
      branchName: 'MANDAUE',
      search: 'FA-1',
      skip: 50,
      take: 50,
      sortField: 'acceptanceDate',
      sortDir: 'desc',
    }).subscribe();

    const request = http.expectOne(req =>
      req.url === 'https://erp.test/api/fuel-acceptances'
      && req.params.get('status') === 'A'
      && req.params.get('skip') === '50'
      && req.params.get('take') === '50',
    );

    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: { data: [], total: 0 } });
  });

  it('uses the open fuel PO lookup route', () => {
    service.getOpenPurchaseOrders('PO-1').subscribe();

    const request = http.expectOne(
      'https://erp.test/api/fuel-acceptances/lookups/open-purchase-orders?search=PO-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: [] });
  });

  it('posts save commands with the DTO body', () => {
    const body: FuelAcceptanceSaveRequest = {
      header: {
        acceptanceDate: '2026-08-03',
        poNo: 'PO-1',
        suppCode: 'SUP-1',
        branchName: 'MANDAUE',
        vehicleNo: 'TRUCK-01',
        plateNo: 'ABC-123',
        driverName: 'Driver One',
        purpose: 'Delivery operations',
      },
      details: [
        {
          lineSeq: 1,
          fuelDate: '2026-08-03',
          fuelStation: 'Station One',
          receiptNo: 'R-1',
          hasReceipt: true,
          fuelType: 'DIESEL',
          liters: 10,
          unitPrice: 60,
          taxSchemeCode: 'RV',
        },
      ],
    };

    service.save(body).subscribe();

    const request = http.expectOne('https://erp.test/api/fuel-acceptances');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, data: commandResult() });
  });

  it('uses separate post and reverse command routes', () => {
    service.post('FA-0000000001', { rowVersion: '0x0000000000000001' }).subscribe();
    const post = http.expectOne(
      'https://erp.test/api/fuel-acceptances/FA-0000000001/post',
    );
    expect(post.request.method).toBe('POST');
    post.flush({ success: true, data: commandResult('A') });

    service.reverse('FA-0000000001', {
      rowVersion: '0x0000000000000002',
      reason: 'Incorrect receipt',
    }).subscribe();
    const reverse = http.expectOne(
      'https://erp.test/api/fuel-acceptances/FA-0000000001/reverse',
    );
    expect(reverse.request.method).toBe('POST');
    reverse.flush({ success: true, data: commandResult('R') });
  });

  function commandResult(status: 'N' | 'A' | 'R' = 'N'): FuelAcceptanceCommandResponse {
    return {
      fuelAcceptanceNo: 'FA-0000000001',
      status,
      rowVersion: '0x0000000000000001',
      message: 'Completed.',
    };
  }
});
