import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    type: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = environment.security.jwtTokenKey;
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      // Validate token with backend
      this.validateToken().subscribe(
        (isValid) => {
          if (isValid) {
            const user = this.getUserFromStorage();
            if (user) {
              this.currentUserSubject.next(user);
              this.isAuthenticatedSubject.next(true);
            }
          } else {
            this.logout();
          }
        },
        () => this.logout()
      );
    } else {
      this.logout();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            this.setToken(response.token);
            this.setUser(response.user);
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
  }

  logout(): void {
    // Call logout endpoint
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    
    // Clear local storage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('currentUser');
    
    // Update subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Redirect to login
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.post<{success: boolean, token: string}>(`${this.apiUrl}/auth/refresh`, { token })
      .pipe(
        map(response => {
          if (response.success) {
            this.setToken(response.token);
            return true;
          }
          return false;
        }),
        catchError(() => {
          this.logout();
          return of(false);
        })
      );
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticated$;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  hasRole(requiredRoles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? requiredRoles.includes(user.role) : false;
  }

  canAccessItem(itemOrganizationId: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Admin and compliance officers can access all items
    if (['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'].includes(user.role)) {
      return true;
    }
    
    // Others can only access items from their organization
    return user.organization.id === itemOrganizationId;
  }

  private validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);

    return this.http.get<{valid: boolean}>(`${this.apiUrl}/auth/validate`)
      .pipe(
        map(response => response.valid),
        catchError(() => of(false))
      );
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }

  // Register method (for admin use)
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  // Password reset functionality
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/auth/profile`, userData)
      .pipe(
        tap(updatedUser => {
          this.setUser(updatedUser);
          this.currentUserSubject.next(updatedUser);
        })
      );
  }

  // Change password
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }
}