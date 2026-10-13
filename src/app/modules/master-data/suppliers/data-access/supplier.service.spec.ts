import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import {
  ApiResponse,
  SupplierCommandResult,
  SupplierListQuery
} from '../models/supplier.models';
import { SupplierService } from './supplier.service';

describe('SupplierService', () => {
  let service: SupplierService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SupplierService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:51033' }
      ]
    });

    service = TestBed.inject(SupplierService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only a committed server-page query with the exact API parameter names', () => {
    const query: SupplierListQuery = {
      search: 'alpha',
      supplierGroupCode: 'LOCAL',
      termsCode: '30D',
      currencyCode: 'PHP',
      taxProfileCode: 'VAT',
      activeFlag: 'ALL',
      skip: 50,
      take: 50,
      sortField: 'supplierCode',
      sortDirection: 'desc'
    };

    service.getList(query).subscribe(result => expect(result).toEqual({ data: [], total: 0 }));

    const request = http.expectOne(candidate =>
      candidate.url === 'http://localhost:51033/api/master-data/suppliers'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.params.get('search')).toBe('alpha');
    expect(request.request.params.get('supplierGroupCode')).toBe('LOCAL');
    expect(request.request.params.get('termsCode')).toBe('30D');
    expect(request.request.params.get('currencyCode')).toBe('PHP');
    expect(request.request.params.get('taxProfileCode')).toBe('VAT');
    expect(request.request.params.get('activeFlag')).toBe('ALL');
    expect(request.request.params.get('skip')).toBe('50');
    expect(request.request.params.get('take')).toBe('50');
    expect(request.request.params.get('sortField')).toBe('supplierCode');
    expect(request.request.params.get('sortDirection')).toBe('desc');
    request.flush(success({ data: [], total: 0 }));
  });

  it('posts create without a browser-supplied user id or audit date', () => {
    const payload = {
      supplierCode: 'SUP001',
      supplierName: 'Supplier One',
      supplierGroupCode: 'LOCAL',
      addressLine1: null,
      addressLine2: null,
      addressLine3: null,
      contactPerson: null,
      positionTitle: null,
      telephone: null,
      fax: null,
      email: null,
      tinNo: null,
      termsCode: null,
      currencyCode: null,
      website: null,
      specialties: null,
      taxProfileCode: null
    };

    service.create(payload).subscribe(result => expect(result.supplier.supplierCode).toBe('SUP001'));

    const request = http.expectOne('http://localhost:51033/api/master-data/suppliers');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.userId).toBeUndefined();
    expect(request.request.body.modifiedDate).toBeUndefined();
    request.flush(success(commandResult));
  });

  it('puts immutable code and optimistic-concurrency token on update', () => {
    const payload = {
      supplierCode: 'SUP001',
      supplierName: 'Supplier One',
      supplierGroupCode: 'LOCAL',
      addressLine1: null,
      addressLine2: null,
      addressLine3: null,
      contactPerson: null,
      positionTitle: null,
      telephone: null,
      fax: null,
      email: null,
      tinNo: null,
      termsCode: null,
      currencyCode: null,
      website: null,
      specialties: null,
      taxProfileCode: null,
      expectedModifiedDate: '2026-07-22T09:10:11.123'
    };

    service.update('SUP001', payload).subscribe();

    const request = http.expectOne('http://localhost:51033/api/master-data/suppliers/SUP001');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.supplierCode).toBe('SUP001');
    expect(request.request.body.expectedModifiedDate).toBe('2026-07-22T09:10:11.123');
    request.flush(success(commandResult));
  });

  it('uses dedicated activate and deactivate command endpoints', () => {
    const requestBody = { expectedModifiedDate: '2026-07-22T09:10:11.123' };

    service.activate('SUP 1', requestBody).subscribe();
    const activate = http.expectOne('http://localhost:51033/api/master-data/suppliers/SUP%201/activate');
    expect(activate.request.method).toBe('POST');
    expect(activate.request.body).toEqual(requestBody);
    activate.flush(success(commandResult));

    service.deactivate('SUP001', requestBody).subscribe();
    const deactivate = http.expectOne('http://localhost:51033/api/master-data/suppliers/SUP001/deactivate');
    expect(deactivate.request.method).toBe('POST');
    expect(deactivate.request.body).toEqual(requestBody);
    deactivate.flush(success(commandResult));
  });
});

function success<T>(data: T): ApiResponse<T> {
  return { success: true, message: 'OK', data, error: null };
}

const commandResult: SupplierCommandResult = {
  supplier: {
    supplierCode: 'SUP001',
    supplierName: 'Supplier One',
    supplierGroupCode: 'LOCAL',
    supplierGroupName: 'Local Suppliers',
    addressLine1: null,
    addressLine2: null,
    addressLine3: null,
    contactPerson: null,
    positionTitle: null,
    telephone: null,
    fax: null,
    email: null,
    tinNo: null,
    termsCode: null,
    termsDescription: null,
    currencyCode: null,
    currencyDescription: null,
    website: null,
    specialties: null,
    taxProfileCode: null,
    taxProfileDescription: null,
    activeFlag: 'Y',
    modifiedBy: 'TEST',
    modifiedDate: '2026-07-22T09:10:11.123'
  },
  message: 'Supplier saved.',
  warningMessage: null
};
