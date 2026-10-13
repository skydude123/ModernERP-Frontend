
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { arrowLeftIcon } from '@progress/kendo-svg-icons';

@Component({
  selector: 'app-receiving-report',
  standalone: true,
  imports: [
    ButtonsModule
],
  templateUrl: './receiving-report.component.html',
  styleUrls: ['./receiving-report.component.scss']
})
export class ReceivingReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  readonly arrowLeftIcon = arrowLeftIcon;

  readonly rrNo = String(this.route.snapshot.paramMap.get('rrNo') || '').trim();
  readonly viewerUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `/reporting/receiving-viewer.html?rr_no=${encodeURIComponent(this.rrNo)}`
  );

  back(): void {
    if (this.rrNo) {
      void this.router.navigate(['/receiving', this.rrNo]);
      return;
    }

    void this.router.navigate(['/receiving']);
  }
}
