import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Check if route requires specific roles
          const requiredRoles = route.data['roles'] as string[];
          if (requiredRoles && requiredRoles.length > 0) {
            const hasRequiredRole = this.authService.hasRole(requiredRoles);
            if (!hasRequiredRole) {
              this.router.navigate(['/dashboard']);
              return false;
            }
          }
          return true;
        } else {
          // Try to refresh token before redirecting
          return this.authService.refreshToken().pipe(
            map(refreshed => {
              if (refreshed) {
                return true;
              } else {
                this.router.navigate(['/login'], { 
                  queryParams: { returnUrl: state.url } 
                });
                return false;
              }
            }),
            catchError(() => {
              this.router.navigate(['/login'], { 
                queryParams: { returnUrl: state.url } 
              });
              return of(false);
            })
          );
        }
      }),
      catchError(() => {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url } 
        });
        return of(false);
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRequiredRole = this.authService.hasRole(requiredRoles);
    
    if (!hasRequiredRole) {
      // Redirect to dashboard with error message
      this.router.navigate(['/dashboard'], {
        queryParams: { error: 'insufficient_permissions' }
      });
    }

    return hasRequiredRole;
  }
}