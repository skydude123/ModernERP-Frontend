import { Injectable, signal } from '@angular/core';

export interface ToolbarConfig {
  showNew?: boolean;
  showSave?: boolean;
  showBack?: boolean;
  showPrint?: boolean;
  showCancel?: boolean;

  /*
   * Workflow buttons
   */
  showSubmit?: boolean;
  showAccept?: boolean;
  showPost?: boolean;
  showReverse?: boolean;
  showActivate?: boolean;
  showDeactivate?: boolean;

  showList?: boolean;
  showRefresh?: boolean;
  showDataList?: boolean;

  showToday?: boolean;
  showYesterday?: boolean;
  showThisMonth?: boolean;
  showLastMonth?: boolean;
  showThisYear?: boolean;
  showLastYear?: boolean;

  /*
   * Backward compatibility
   */
  showThisWeek?: boolean;
  showLastWeek?: boolean;
  showCurrentYear?: boolean;
}

const DEFAULT_TOOLBAR_CONFIG: Required<ToolbarConfig> = {
  showNew: false,
  showSave: false,
  showBack: false,
  showPrint: false,
  showCancel: false,

  showSubmit: false,
  showAccept: false,
  showPost: false,
  showReverse: false,
  showActivate: false,
  showDeactivate: false,

  showList: false,
  showRefresh: false,
  showDataList: false,

  showToday: false,
  showYesterday: false,
  showThisMonth: false,
  showLastMonth: false,
  showThisYear: false,
  showLastYear: false,

  showThisWeek: false,
  showLastWeek: false,
  showCurrentYear: false,
};

@Injectable({
  providedIn: 'root',
})
export class AppToolbarService {
  private readonly configState = signal<ToolbarConfig>({
    ...DEFAULT_TOOLBAR_CONFIG,
  });

  /*
   * The toolbar is shared so ERP modules keep one
   * consistent action surface while each module can
   * select only the buttons that it needs.
   */
  readonly config = this.configState.asReadonly();

  setConfig(config: ToolbarConfig): void {
    this.configState.set({
      ...DEFAULT_TOOLBAR_CONFIG,
      ...config,
    });
  }

  reset(): void {
    this.configState.set({
      ...DEFAULT_TOOLBAR_CONFIG,
    });
  }
}