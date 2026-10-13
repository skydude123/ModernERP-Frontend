import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialIssuanceService } from '../data-access/material-issuance.service';
import { IssueDocument } from '../models/material-issuance.models';

@Component({
  selector: 'app-material-issuance-print',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `@if (document(); as d) {
  <main class="slip">
    <div class="actions">
      <a [routerLink]="['/inventory/material-issuance', d.issueNo]">Back</a
        ><button (click)="print()">Print</button>
      </div>
      <header>
        <h1>Material Release Slip</h1>
        <p>Issue No. {{ d.issueNo }} · {{ d.issueDate | date: 'mediumDate' }}</p>
      </header>
      <section class="meta">
        <span><b>Warehouse</b> {{ d.whseCode }}</span
        ><span><b>Source</b> {{ d.sourceType }}</span
        ><span><b>Reference</b> {{ d.reference }}</span
        ><span><b>Status</b> {{ d.effectiveStatus }}</span>
      </section>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Material</th>
            <th>Description</th>
            <th>Issue Qty</th>
            <th>U/M</th>
            <th>Base Qty</th>
            <th>Cost</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          @for (x of d.details; track x) {
            <tr>
              <td>{{ x.issueSeq }}</td>
              <td>{{ x.itemCode }}</td>
              <td>{{ x.itemDesc }}</td>
              <td>{{ x.qtyIss | number: '1.4-4' }}</td>
              <td>{{ x.issueUm }}</td>
              <td>{{ x.baseQty | number: '1.4-4' }}</td>
              <td>{{ x.unitCost | number: '1.4-4' }}</td>
              <td>{{ x.issueAmount | number: '1.2-2' }}</td>
            </tr>
          }
        </tbody>
      </table>
      <footer>
        <div>Prepared by: {{ d.userId || '—' }}</div>
        <div>Released by: ____________________</div>
        <div>Received by: ____________________</div>
      </footer>
    </main>
  }`,
  styles: [
    `
      :host {
        display: block;
      }
      .slip {
        max-width: 1050px;
        margin: 20px auto;
        padding: 28px;
        background: #fff;
        color: #111;
      }
      .actions {
        display: flex;
        justify-content: space-between;
      }
      header {
        text-align: center;
        border-bottom: 2px solid #111;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        padding: 16px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border: 1px solid #777;
        padding: 7px;
        text-align: left;
      }
      footer {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
        margin-top: 60px;
      }
      @media print {
        .actions {
          display: none;
        }
        .slip {
          margin: 0;
          padding: 0;
          max-width: none;
        }
      }
    `,
  ],
})
export class MaterialIssuancePrintComponent {
  private readonly api = inject(MaterialIssuanceService);
  private readonly route = inject(ActivatedRoute);
  readonly document = signal<IssueDocument | null>(null);
  constructor() {
    const no = this.route.snapshot.paramMap.get('issueNo');
    if (no) this.api.get(no).subscribe((d) => this.document.set(d));
  }
  print() {
    window.print();
  }
}
