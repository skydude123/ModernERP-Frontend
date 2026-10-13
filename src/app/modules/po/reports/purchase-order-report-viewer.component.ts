import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReportingUrlService } from '../../../core/Reporting/reporting-url.service';

/* This route is intentionally a thin Telerik hand-off. Valid PO report TRDP
   packages must be created in Telerik Report Designer before enabling it. */
@Component({
  selector: 'app-purchase-order-report-viewer',
  standalone: true,
  template: `<section class="report-viewer">
    <h1>Purchase Order Report</h1>
    <p>
      Printable PO report layouts require the approved Telerik TRDP packages.
    </p>
    <p>Requested report: {{ reportType }}</p>
  </section>`,
  styles: [
    `
      .report-viewer {
        padding: 16px;
      }
    `,
  ],
})
export class PurchaseOrderReportViewerComponent {
  private readonly route = inject(ActivatedRoute);
  readonly reportingServiceUrl =
    inject(ReportingUrlService).reportingServiceUrl;
  readonly reportType = String(
    this.route.snapshot.queryParamMap.get('reportType') || 'PO_SUMMARY',
  );
}
