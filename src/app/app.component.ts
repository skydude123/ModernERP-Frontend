import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacadeService } from './core/services/auth-facade.service';
import { DialogModule } from '@progress/kendo-angular-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent {
  private auth = inject(AuthFacadeService);
  title = 'Inventory';

  constructor() {
    this.auth.restoreFromCookies();
  }
  
}
