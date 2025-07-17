import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private snackBar: MatSnackBar) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 400:
              errorMessage = error.error?.error || 'Bad request';
              break;
            case 401:
              errorMessage = 'Unauthorized access';
              break;
            case 403:
              errorMessage = 'Access forbidden';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 409:
              errorMessage = error.error?.error || 'Conflict occurred';
              break;
            case 422:
              errorMessage = 'Validation failed';
              break;
            case 429:
              errorMessage = 'Too many requests. Please try again later.';
              break;
            case 500:
              errorMessage = 'Internal server error';
              break;
            case 503:
              errorMessage = 'Service temporarily unavailable';
              break;
            default:
              errorMessage = error.error?.error || error.message || errorMessage;
          }
        }

        // Don't show error notifications for authentication endpoints
        const isAuthEndpoint = request.url.includes('/auth/');
        const isValidationEndpoint = request.url.includes('/validate');
        
        if (!isAuthEndpoint && !isValidationEndpoint && error.status !== 401) {
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }

        return throwError(error);
      })
    );
  }
}