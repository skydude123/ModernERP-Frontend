import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthFacadeService } from '../../core/services/auth-facade.service';

@Component({
  selector: 'app-shell',
  // imports: [],
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  standalone: true
})
export class ShellComponent {
  readonly auth = inject(AuthFacadeService);
}