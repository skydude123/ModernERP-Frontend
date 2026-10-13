import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { SupplierService } from '../data-access/supplier.service';
import { SupplierListQuery } from '../models/supplier.models';
import { SupplierListFacade } from './supplier-list.facade';

describe('SupplierListFacade', () => {
  let api: jasmine.SpyObj<SupplierService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<SupplierService>('SupplierService', [
      'getList',
      'getGroups',
      'getTerms',
      'getCurrencies',
      'getTaxProfiles',
      'getErrorMessage'
    ]);
    api.getList.and.returnValue(of({ data: [], total: 0 }));
    api.getGroups.and.returnValue(of([]));
    api.getTerms.and.returnValue(of([]));
    api.getCurrencies.and.returnValue(of([]));
    api.getTaxProfiles.and.returnValue(of([]));
    api.getErrorMessage.and.returnValue('Request failed.');

    TestBed.configureTestingModule({
      providers: [
        SupplierListFacade,
        { provide: SupplierService, useValue: api }
      ]
    });
  });

  it('loads once initially and issues another GET only after a query is committed', fakeAsync(() => {
    const facade = TestBed.inject(SupplierListFacade);
    TestBed.flushEffects();
    tick();

    expect(api.getList).toHaveBeenCalledTimes(1);

    // Form keystrokes live in the component and do not alter this read resource.
    tick();
    expect(api.getList).toHaveBeenCalledTimes(1);

    const committed: SupplierListQuery = {
      search: 'ACME',
      supplierGroupCode: null,
      termsCode: null,
      currencyCode: null,
      taxProfileCode: null,
      activeFlag: 'ALL',
      skip: 0,
      take: 50,
      sortField: 'supplierName',
      sortDirection: 'asc'
    };
    facade.commitQuery(committed);
    TestBed.flushEffects();
    tick();

    expect(api.getList).toHaveBeenCalledTimes(2);
    expect(api.getList.calls.mostRecent().args[0]).toEqual(committed);
  }));

  it('preserves server paging and status filters in committed state', fakeAsync(() => {
    const facade = TestBed.inject(SupplierListFacade);
    TestBed.flushEffects();
    tick();

    facade.commitQuery({
      ...facade.query(),
      activeFlag: 'N',
      skip: 100,
      take: 50
    });
    TestBed.flushEffects();
    tick();

    expect(api.getList.calls.mostRecent().args[0].activeFlag).toBe('N');
    expect(api.getList.calls.mostRecent().args[0].skip).toBe(100);
    expect(api.getList.calls.mostRecent().args[0].take).toBe(50);
  }));
});
