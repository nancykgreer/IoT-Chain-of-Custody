import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
}

export interface TouchInfo {
  isTouch: boolean;
  supportsPinch: boolean;
  supportsRotation: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MobileUIService {
  private viewportSubject = new BehaviorSubject<ViewportInfo>(this.getViewportInfo());
  private touchSubject = new BehaviorSubject<TouchInfo>(this.getTouchInfo());
  private orientationSubject = new BehaviorSubject<string>(this.getOrientation());

  public viewport$ = this.viewportSubject.asObservable();
  public touch$ = this.touchSubject.asObservable();
  public orientation$ = this.orientationSubject.asObservable();

  // Breakpoints (Material Design breakpoints)
  private readonly breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Viewport changes
    fromEvent(window, 'resize').pipe(
      debounceTime(100),
      map(() => this.getViewportInfo()),
      startWith(this.getViewportInfo())
    ).subscribe(info => {
      this.viewportSubject.next(info);
    });

    // Orientation changes
    fromEvent(window, 'orientationchange').pipe(
      debounceTime(200),
      map(() => this.getOrientation()),
      startWith(this.getOrientation())
    ).subscribe(orientation => {
      this.orientationSubject.next(orientation);
      // Update viewport info after orientation change
      setTimeout(() => {
        this.viewportSubject.next(this.getViewportInfo());
      }, 300);
    });

    // Touch capability changes (rare, but possible with hybrid devices)
    fromEvent(window, 'touchstart').pipe(
      map(() => this.getTouchInfo()),
      startWith(this.getTouchInfo())
    ).subscribe(info => {
      this.touchSubject.next(info);
    });
  }

  private getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    const isMobile = width < this.breakpoints.mobile;
    const isTablet = width >= this.breakpoints.mobile && width < this.breakpoints.desktop;
    const isDesktop = width >= this.breakpoints.desktop;

    const orientation = width > height ? 'landscape' : 'portrait';

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      orientation,
      devicePixelRatio
    };
  }

  private getTouchInfo(): TouchInfo {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsPinch = isTouch && 'ontouchstart' in window;
    const supportsRotation = 'orientation' in window;

    return {
      isTouch,
      supportsPinch,
      supportsRotation
    };
  }

  private getOrientation(): string {
    if (screen.orientation) {
      return screen.orientation.angle.toString();
    }
    return window.orientation?.toString() || '0';
  }

  // Utility methods
  getCurrentViewport(): ViewportInfo {
    return this.viewportSubject.value;
  }

  getCurrentTouch(): TouchInfo {
    return this.touchSubject.value;
  }

  isMobileDevice(): boolean {
    return this.getCurrentViewport().isMobile;
  }

  isTabletDevice(): boolean {
    return this.getCurrentViewport().isTablet;
  }

  isDesktopDevice(): boolean {
    return this.getCurrentViewport().isDesktop;
  }

  isTouchDevice(): boolean {
    return this.getCurrentTouch().isTouch;
  }

  isLandscape(): boolean {
    return this.getCurrentViewport().orientation === 'landscape';
  }

  isPortrait(): boolean {
    return this.getCurrentViewport().orientation === 'portrait';
  }

  // CSS classes for responsive design
  getResponsiveClasses(): string[] {
    const viewport = this.getCurrentViewport();
    const touch = this.getCurrentTouch();
    const classes: string[] = [];

    // Device type
    if (viewport.isMobile) classes.push('mobile-device');
    if (viewport.isTablet) classes.push('tablet-device');
    if (viewport.isDesktop) classes.push('desktop-device');

    // Orientation
    classes.push(`orientation-${viewport.orientation}`);

    // Touch support
    if (touch.isTouch) classes.push('touch-device');
    else classes.push('non-touch-device');

    // High DPI
    if (viewport.devicePixelRatio > 1.5) classes.push('high-dpi');

    return classes;
  }

  // PWA helpers
  isStandalone(): boolean {
    return (window.navigator as any).standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
  }

  canInstallPWA(): boolean {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  }

  // Vibration support (for mobile feedback)
  vibrate(pattern: number | number[]): boolean {
    if ('vibrate' in navigator) {
      return navigator.vibrate(pattern);
    }
    return false;
  }

  // Safe area handling (for notched devices)
  getSafeAreaInsets(): { top: string; right: string; bottom: string; left: string } {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: computedStyle.getPropertyValue('--safe-area-inset-top') || '0px',
      right: computedStyle.getPropertyValue('--safe-area-inset-right') || '0px',
      bottom: computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0px',
      left: computedStyle.getPropertyValue('--safe-area-inset-left') || '0px'
    };
  }

  // Network information (if available)
  getNetworkInfo(): { 
    type?: string; 
    effectiveType?: string; 
    downlink?: number; 
    rtt?: number; 
    saveData?: boolean 
  } {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      return {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }

    return {};
  }

  // Battery information (if available)
  async getBatteryInfo(): Promise<{
    charging?: boolean;
    chargingTime?: number;
    dischargingTime?: number;
    level?: number;
  }> {
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        return {
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level
        };
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
    }
    
    return {};
  }

  // Haptic feedback (if available)
  hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    // iOS haptic feedback
    if ('hapticFeedback' in navigator) {
      (navigator as any).hapticFeedback(type);
      return;
    }

    // Android vibration patterns
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };

    this.vibrate(patterns[type]);
  }

  // Request fullscreen (useful for immersive experiences)
  async requestFullscreen(element?: Element): Promise<boolean> {
    const elem = element || document.documentElement;
    
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        return true;
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
        return true;
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
        return true;
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }

    return false;
  }

  // Exit fullscreen
  async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
        return true;
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
        return true;
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }

    return false;
  }

  // Check if element is in fullscreen
  isFullscreen(): boolean {
    return !!(document.fullscreenElement || 
             (document as any).webkitFullscreenElement || 
             (document as any).msFullscreenElement);
  }

  // Wake lock (prevent screen from sleeping)
  async requestWakeLock(): Promise<any> {
    try {
      if ('wakeLock' in navigator) {
        return await (navigator as any).wakeLock.request('screen');
      }
    } catch (error) {
      console.warn('Wake lock request failed:', error);
    }
    return null;
  }

  // Copy to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.warn('Copy to clipboard failed:', error);
      return false;
    }
  }

  // Share API
  async share(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    try {
      if (navigator.share) {
        await navigator.share(data);
        return true;
      }
    } catch (error) {
      console.warn('Share failed:', error);
    }
    return false;
  }

  // Check if share is supported
  canShare(): boolean {
    return 'share' in navigator;
  }

  // Device memory (if available)
  getDeviceMemory(): number | undefined {
    return (navigator as any).deviceMemory;
  }

  // Hardware concurrency
  getHardwareConcurrency(): number {
    return navigator.hardwareConcurrency || 4;
  }

  // Performance optimization helpers
  shouldReduceAnimations(): boolean {
    // Check for reduced motion preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shouldReduceData(): boolean {
    const network = this.getNetworkInfo();
    return network.saveData === true || network.effectiveType === 'slow-2g' || network.effectiveType === '2g';
  }

  isLowEndDevice(): boolean {
    const memory = this.getDeviceMemory();
    const concurrency = this.getHardwareConcurrency();
    
    // Consider low-end if memory <= 2GB or cores <= 2
    return (memory !== undefined && memory <= 2) || concurrency <= 2;
  }

  // Application lifecycle
  onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
    const handler = () => {
      callback(!document.hidden);
    };

    document.addEventListener('visibilitychange', handler);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }

  // Page lifecycle events
  onPageLifecycle(callbacks: {
    onFreeze?: () => void;
    onResume?: () => void;
    onTerminate?: () => void;
  }): () => void {
    const handlers: Array<{ event: string; handler: () => void }> = [];

    if (callbacks.onFreeze) {
      const freezeHandler = callbacks.onFreeze;
      document.addEventListener('freeze', freezeHandler);
      handlers.push({ event: 'freeze', handler: freezeHandler });
    }

    if (callbacks.onResume) {
      const resumeHandler = callbacks.onResume;
      document.addEventListener('resume', resumeHandler);
      handlers.push({ event: 'resume', handler: resumeHandler });
    }

    if (callbacks.onTerminate) {
      const terminateHandler = callbacks.onTerminate;
      window.addEventListener('beforeunload', terminateHandler);
      handlers.push({ event: 'beforeunload', handler: terminateHandler });
    }

    // Return cleanup function
    return () => {
      handlers.forEach(({ event, handler }) => {
        if (event === 'beforeunload') {
          window.removeEventListener(event, handler);
        } else {
          document.removeEventListener(event, handler);
        }
      });
    };
  }
}