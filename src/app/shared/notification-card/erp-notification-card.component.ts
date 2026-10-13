
import { Component } from '@angular/core';


export type ErpNotificationType = 'success' | 'error' | 'warning' | 'info';
export interface ErpNotificationCardData {
  type?: ErpNotificationType;
  title?: string;
  message?: string;
  documentNo?: string;
  moduleName?: string;
}

@Component({
  selector: 'app-erp-notification-card',
  imports: [],
  standalone: true,
  templateUrl: './erp-notification-card.component.html',
  styleUrl: './erp-notification-card.component.scss'
})
export class ErpNotificationCardComponent {
   data: ErpNotificationCardData = {
    type: 'success',
    title: 'Save Successful',
    message: 'The transaction has been saved successfully.',
    documentNo: '',
    moduleName: ''
  };

  get hostClass(): string {
    switch (this.data.type) {
      case 'error':
        return 'erp-notify-card erp-notify-card--error';
      case 'warning':
        return 'erp-notify-card erp-notify-card--warning';
      case 'info':
        return 'erp-notify-card erp-notify-card--info';
      default:
        return 'erp-notify-card erp-notify-card--success';
    }
  }

  get iconSymbol(): string {
    switch (this.data.type) {
      case 'error':
        return '!';
      case 'warning':
        return '!';
      case 'info':
        return 'i';
      default:
        return '✓';
    }
  }

  get iconAriaLabel(): string {
    return `${this.data.type ?? 'success'} notification`;
  }

}
