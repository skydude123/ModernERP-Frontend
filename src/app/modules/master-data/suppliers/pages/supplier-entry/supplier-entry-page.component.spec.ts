import '@angular/localize/init';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DialogService } from '@progress/kendo-angular-dialog';

import { AuthFacadeService } from '../../../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../../../shared/notification-card/erp-notification.service';
import { SupplierEntryFacade } from '../../facades/supplier-entry.facade';
import { SupplierDetail, SupplierLookups } from '../../models/supplier.models';
import { SupplierEntryPageComponent } from './supplier-entry-page.component';

describe('SupplierEntryPageComponent', () => {
  let fixture: ComponentFixture<SupplierEntryPageComponent>;
  let component: SupplierEntryPageComponent;
  let detailState: ReturnType<typeof signal<SupplierDetail | null>>;

  afterEach(() => fixture?.destroy());

  it('starts a new supplier as active and enforces required fields and schema lengths', () => {
    createComponent(null, null);

    expect(component.isExisting()).toBeFalse();
    expect(component.activeFlag()).toBe('Y');
    expect(component.form.controls.supplierCode.hasError('required')).toBeTrue();
    expect(component.form.controls.supplierName.hasError('required')).toBeTrue();
    expect(component.form.controls.supplierGroupCode.hasError('required')).toBeTrue();

    component.form.controls.supplierCode.setValue('12345678901');
    component.form.controls.supplierName.setValue('N'.repeat(101));
    component.form.controls.addressLine1.setValue('A'.repeat(201));
    component.form.controls.specialties.setValue('S'.repeat(501));

    expect(component.form.controls.supplierCode.hasError('maxlength')).toBeTrue();
    expect(component.form.controls.supplierName.hasError('maxlength')).toBeTrue();
    expect(component.form.controls.addressLine1.hasError('maxlength')).toBeTrue();
    expect(component.form.controls.specialties.hasError('maxlength')).toBeTrue();
  });

  it('normalizes a new supplier code to trimmed uppercase', () => {
    createComponent(null, null);
    component.form.controls.supplierCode.setValue('  ab-01  ');

    component.normalizeSupplierCode();

    expect(component.form.controls.supplierCode.value).toBe('AB-01');
  });

  it('locks the supplier code and retains the raw modified date after loading an existing record', () => {
    createComponent('SUP001', existingSupplier);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(detailState()).toEqual(existingSupplier);
    expect(component.isExisting()).toBeTrue();
    expect(component.form.controls.supplierCode.value).toBe('SUP001');
    expect(component.form.controls.supplierCode.disabled).toBeTrue();
    expect(component.expectedModifiedDate()).toBe('2026-07-22T09:10:11.123');
  });

  function createComponent(routeCode: string | null, detail: SupplierDetail | null): void {
    detailState = signal<SupplierDetail | null>(detail);
    const falseState = signal(false);
    const nullState = signal<string | null>(null);
    const lookupsState = signal<SupplierLookups>({
      groups: [],
      terms: [],
      currencies: [],
      taxProfiles: []
    });
    const facade = {
      supplier: detailState.asReadonly(),
      loading: falseState.asReadonly(),
      loadError: nullState.asReadonly(),
      lookups: lookupsState.asReadonly(),
      lookupsLoading: falseState.asReadonly(),
      lookupsError: nullState.asReadonly(),
      commandBusy: falseState.asReadonly(),
      commandError: nullState.asReadonly(),
      setSupplierCode: jasmine.createSpy('setSupplierCode'),
      reloadSupplier: jasmine.createSpy('reloadSupplier'),
      reloadLookups: jasmine.createSpy('reloadLookups'),
      create: jasmine.createSpy('create'),
      update: jasmine.createSpy('update'),
      activate: jasmine.createSpy('activate'),
      deactivate: jasmine.createSpy('deactivate'),
      errorMessage: jasmine.createSpy('errorMessage')
    };

    TestBed.configureTestingModule({
      imports: [SupplierEntryPageComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(routeCode ? { supplierCode: routeCode } : {})
            }
          }
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') }
        },
        {
          provide: AuthFacadeService,
          useValue: { hasPermission: () => true }
        },
        {
          provide: DialogService,
          useValue: { open: jasmine.createSpy('open') }
        },
        {
          provide: ErpNotificationService,
          useValue: {
            success: jasmine.createSpy('success'),
            error: jasmine.createSpy('error'),
            warning: jasmine.createSpy('warning')
          }
        }
      ]
    }).overrideComponent(SupplierEntryPageComponent, {
      set: {
        providers: [{ provide: SupplierEntryFacade, useValue: facade }]
      }
    });

    fixture = TestBed.createComponent(SupplierEntryPageComponent);
    component = fixture.componentInstance;
  }
});

const existingSupplier: SupplierDetail = {
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
};
