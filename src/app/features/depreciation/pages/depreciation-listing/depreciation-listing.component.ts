import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { DataStateChangeEvent, GridDataResult, GridModule } from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { State } from '@progress/kendo-data-query';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthFacadeService } from '../../../../core/services/auth-facade.service';
import { AppToolbarComponent } from '../../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../../shared/services/app-toolbar/toolbar.service';
import { DepreciationFacade } from '../../facades/depreciation.facade';
import { DepreciationRunListItem } from '../../models/depreciation.models';

@Component({
  selector: 'app-depreciation-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonsModule, DateInputsModule, DropDownsModule, GridModule, InputsModule, AppToolbarComponent],
  providers: [DepreciationFacade],
  templateUrl: './depreciation-listing.component.html',
  styleUrl: './depreciation-listing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepreciationListingComponent implements OnDestroy {
  readonly facade = inject(DepreciationFacade);
  readonly toolbar = inject(AppToolbarService);
  readonly auth = inject(AuthFacadeService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly selected = signal<DepreciationRunListItem | null>(null);
  readonly state = signal<State>({ skip: 0, take: 50, sort: [{ field: 'runDate', dir: 'desc' }] });
  readonly gridData = computed<GridDataResult>(() => ({ data: this.facade.list(), total: this.facade.total() }));
  readonly statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REVERSED', 'CANCELLED'];
  readonly filters = this.fb.group({
    periodFrom: [''], periodTo: [''], runDateFrom: [null as Date | null], runDateTo: [null as Date | null],
    status: ['ALL'], branchCode: [''], assetCategoryCode: [''], methodCode: [''], search: ['']
  });

  constructor() {
    this.toolbar.setConfig({
      showNew: this.auth.hasPermission('DEPRECIATION_CREATE'),
      //showPrint: this.auth.hasPermission('DEPRECIATION_PRINT'),
      showRefresh: true
    });
    this.filters.controls.search.valueChanges.pipe(
      debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.applyFilters(true));
    this.applyFilters();
  }
  ngOnDestroy(): void { this.toolbar.reset(); }
  newDocument(): void { void this.router.navigate(['/depreciation-runs/new']); }
  open(item: DepreciationRunListItem): void { void this.router.navigate(['/depreciation-runs', item.depRunNo]); }
  openSelected(): void { const item = this.selected(); if (item) this.open(item); }
  refresh(): void { this.facade.reload(); }
  print(): void { window.print(); }
  clear(): void {
    this.filters.reset({ periodFrom: '', periodTo: '', runDateFrom: null, runDateTo: null, status: 'ALL', branchCode: '', assetCategoryCode: '', methodCode: '', search: '' });
    this.applyFilters(true);
  }
  dataStateChange(event: DataStateChangeEvent): void {
    this.state.set(event);
    this.applyFilters();
  }
  applyFilters(resetPage = false): void {
    const values = this.filters.getRawValue();
    const state = this.state();
    const sort = state.sort?.[0];
    if (resetPage) this.state.update(value => ({ ...value, skip: 0 }));
    this.facade.setQuery({
      periodFrom: values.periodFrom?.trim() || null, periodTo: values.periodTo?.trim() || null,
      runDateFrom: this.dateOnly(values.runDateFrom), runDateTo: this.dateOnly(values.runDateTo),
      status: values.status || 'ALL', branchCode: values.branchCode || null,
      assetCategoryCode: values.assetCategoryCode || null, methodCode: values.methodCode || null,
      search: values.search?.trim() || null, skip: resetPage ? 0 : state.skip ?? 0,
      take: state.take ?? 50, sortField: String(sort?.field ?? 'runDate'), sortDir: sort?.dir ?? 'desc'
    });
  }
  statusClass(status: string): string { return `status status--${status.toLowerCase()}`; }
  private dateOnly(value: Date | null): string | null {
    if (!value) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
