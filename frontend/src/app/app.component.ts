import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = environment.appName;
  isAuthenticated = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    this.authService.isAuthenticated().subscribe(
      isAuth => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
        }
      }
    );
  }

  logout() {
    this.authService.logout();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.router.navigate(['/login']);
  }
}