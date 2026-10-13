import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { DataStateChangeEvent, GridDataResult, GridModule, SelectionEvent } from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { State } from '@progress/kendo-data-query';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { ServiceAcceptanceFacade } from '../data-access/service-acceptance.facade';
import { ServiceAcceptanceListItem } from '../models/service-acceptance.models';

@Component({
  selector: 'app-service-acceptance-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonsModule, DateInputsModule,
    DropDownsModule, GridModule, InputsModule, AppToolbarComponent],
  providers: [ServiceAcceptanceFacade],
  templateUrl: './service-acceptance-list.component.html',
  styleUrl: './service-acceptance-list.component.scss',
})
export class ServiceAcceptanceListComponent implements OnDestroy {
  readonly facade = inject(ServiceAcceptanceFacade);
  readonly toolbar = inject(AppToolbarService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly selected = signal<ServiceAcceptanceListItem | null>(null);
  readonly state = signal<State>({ skip: 0, take: 50, sort: [{ field: 'acceptanceDate', dir: 'desc' }] });
  readonly filters = this.fb.group({
    fromDate: [new Date(new Date().getFullYear(), 0, 1)], toDate: [new Date()],
    status: ['ALL'], branchName: [''], search: [''],
  });
  readonly gridData = computed<GridDataResult>(() => ({ data: this.facade.list(), total: this.facade.total() }));

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      //showPrint: true, 
      showRefresh: true, showToday: true,
      showYesterday: true, showThisMonth: true, showLastMonth: true,
      showThisYear: true, showLastYear: true,
    });
    this.applyFilters();
  }
  ngOnDestroy(): void { this.toolbar.reset(); }
  newDocument(): void { void this.router.navigate(['/service-acceptance/new']); }
  open(row?: ServiceAcceptanceListItem | null): void {
    const target = row ?? this.selected();
    if (target) void this.router.navigate(['/service-acceptance', target.serviceAcceptanceNo]);
  }
  refresh(): void { this.facade.reloadList(); }
  print(): void { window.print(); }
  selectionChange(event: SelectionEvent): void {
    this.selected.set(event.selectedRows?.[0]?.dataItem as ServiceAcceptanceListItem ?? null);
  }
  dataStateChange(state: DataStateChangeEvent): void {
    this.state.set(state);
    const sort = state.sort?.[0];
    this.facade.updateQuery({
      skip: state.skip ?? 0, take: state.take ?? 50,
      sortField: sort?.field?.toString() ?? 'acceptanceDate', sortDir: sort?.dir ?? 'desc',
    });
  }
  applyFilters(): void {
    const x = this.filters.getRawValue();
    this.state.update(s => ({ ...s, skip: 0 }));
    this.facade.updateQuery({
      fromDate: x.fromDate ? this.dateOnly(x.fromDate) : null,
      toDate: x.toDate ? this.dateOnly(x.toDate) : null, status: x.status || 'ALL',
      branchName: x.branchName?.trim() || null, search: x.search?.trim() || null, skip: 0,
    });
  }
  clear(): void {
    this.filters.reset({ fromDate: null, toDate: null, status: 'ALL', branchName: '', search: '' });
    this.applyFilters();
  }
  today(): void { const d = new Date(); this.setRange(d, d); }
  yesterday(): void { const d = new Date(); d.setDate(d.getDate() - 1); this.setRange(d, d); }
  thisMonth(): void {
    const d = new Date(); this.setRange(new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }
  lastMonth(): void {
    const d = new Date(); this.setRange(new Date(d.getFullYear(), d.getMonth() - 1, 1), new Date(d.getFullYear(), d.getMonth(), 0));
  }
  thisYear(): void { const y = new Date().getFullYear(); this.setRange(new Date(y, 0, 1), new Date(y, 11, 31)); }
  lastYear(): void { const y = new Date().getFullYear() - 1; this.setRange(new Date(y, 0, 1), new Date(y, 11, 31)); }
  private setRange(fromDate: Date, toDate: Date): void { this.filters.patchValue({ fromDate, toDate }); this.applyFilters(); }
  private dateOnly(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
