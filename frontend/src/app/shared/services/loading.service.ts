import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private requestCount = 0;

  constructor() {}

  setLoading(loading: boolean): void {
    if (loading) {
      this.requestCount++;
    } else {
      this.requestCount = Math.max(0, this.requestCount - 1);
    }
    
    this.loadingSubject.next(this.requestCount > 0);
  }

  getLoading(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  isLoading(): boolean {
    return this.loadingSubject.value;
  }
}