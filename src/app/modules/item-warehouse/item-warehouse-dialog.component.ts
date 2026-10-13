import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { ExcelModule, GridComponent, GridModule, SelectionEvent } from '@progress/kendo-angular-grid';
import { SVGIconModule } from '@progress/kendo-angular-icons';
import { fileExcelIcon } from '@progress/kendo-svg-icons';
import { ItemWarehouseApiService } from './item-warehouse-api.service';
import { ItemWarehouseBalanceItem } from '../item-master/item-master.model';


@Component({
  selector: 'app-item-warehouse-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    GridModule,
    ExcelModule,
    ButtonsModule,
    SVGIconModule
  ],
  templateUrl: './item-warehouse-dialog.component.html',
  styleUrl: './item-warehouse-dialog.component.scss'
})
export class ItemWarehouseDialogComponent implements OnChanges {
  @ViewChild('warehouseGrid') warehouseGrid?: GridComponent;

  @Input({ required: true }) itemCode = '';
  @Input() itemDescription = '';

  @Output() closed = new EventEmitter<void>();

  private readonly api = inject(ItemWarehouseApiService);

  readonly fileExcelIcon = fileExcelIcon;

  readonly rows = signal<ItemWarehouseBalanceItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedWarehouse =
    signal<ItemWarehouseBalanceItem | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itemCode'] && this.itemCode?.trim()) {

      this.selectedWarehouse.set(null);

      this.loadWarehouseBalance();
    }
  }

  loadWarehouseBalance(): void {
    const code = this.itemCode?.trim();

    if (!code) {
      this.rows.set([]);
      this.selectedWarehouse.set(null);
      this.error.set('Item code is required.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.getByItemCode(code, 'Y').subscribe({
      next: (result) => {
        const normalizedRows = result.map((row) => ({
          ...row,
          warehouseDescription: row.warehouseDescription || '',
          itemCode: row.itemCode || code,
          itemDescription: row.itemDescription || '',
          baseUm: row.baseUm || '',
          qtyReceived: Number(row.qtyReceived || 0),
          qtyIssued: Number(row.qtyIssued || 0),
          qtyForIssue: Number(row.qtyForIssue || 0),
          onHandCost: Number(row.onHandCost || 0)
        }));

        this.rows.set(normalizedRows);
        this.loading.set(false);
      },
      error: (err) => {
        this.rows.set([]);
        this.selectedWarehouse.set(null);
        this.error.set(err?.message || 'Unable to load warehouse balance.');
        this.loading.set(false);
      }
    });
  }

  onWarehouseSelectionChange(event: SelectionEvent): void {
    const selectedRow = event.selectedRows?.[0];

    if (!selectedRow) {
      this.selectedWarehouse.set(null);
      return;
    }

    this.selectedWarehouse.set(
      selectedRow.dataItem as ItemWarehouseBalanceItem
    );
  }


  close(): void {
    this.closed.emit();
  }

  exportExcel(): void {
    this.warehouseGrid?.saveAsExcel();
  }
}