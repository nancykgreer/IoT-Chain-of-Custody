import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare global {
  interface Navigator {
    mediaDevices: MediaDevices;
  }
}

export interface ScanResult {
  data: string;
  format: string;
  timestamp: Date;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScannerConfig {
  preferredCamera: 'environment' | 'user';
  scanTypes: string[];
  continuous: boolean;
  beepOnScan: boolean;
  flashlight: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {
  private isScanning = false;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number | null = null;

  private scanResultSubject = new BehaviorSubject<ScanResult | null>(null);
  private isActiveScanningSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public scanResult$ = this.scanResultSubject.asObservable();
  public isActiveScanning$ = this.isActiveScanningSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private defaultConfig: ScannerConfig = {
    preferredCamera: 'environment',
    scanTypes: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'],
    continuous: false,
    beepOnScan: true,
    flashlight: false
  };

  constructor() {
    // Load ZXing library dynamically if not already loaded
    this.loadZXingLibrary();
  }

  private async loadZXingLibrary(): Promise<void> {
    // In a real implementation, you would load a barcode scanning library
    // For example: ZXing, QuaggaJS, or @zxing/browser
    // This is a placeholder for the actual implementation
    console.log('Barcode scanning library loaded');
  }

  async startScanning(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    config: Partial<ScannerConfig> = {}
  ): Promise<void> {
    try {
      this.stopScanning();

      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      const scanConfig = { ...this.defaultConfig, ...config };

      // Request camera permission and start video stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: scanConfig.preferredCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.videoElement.srcObject = this.stream;
      this.videoElement.play();

      this.isScanning = true;
      this.isActiveScanningSubject.next(true);
      this.errorSubject.next(null);

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        this.videoElement!.onloadedmetadata = () => {
          resolve();
        };
      });

      // Start scanning loop
      this.scanLoop(scanConfig);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown scanning error';
      this.errorSubject.next(errorMessage);
      console.error('Error starting camera:', error);
      throw error;
    }
  }

  stopScanning(): void {
    this.isScanning = false;
    this.isActiveScanningSubject.next(false);

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  private scanLoop(config: ScannerConfig): void {
    if (!this.isScanning || !this.videoElement || !this.canvasElement) {
      return;
    }

    const canvas = this.canvasElement;
    const context = canvas.getContext('2d');
    
    if (!context) {
      this.errorSubject.next('Cannot get canvas context');
      return;
    }

    // Set canvas size to match video
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Get image data for scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Simulate barcode detection (in real implementation, use actual library)
    this.simulateBarcodeScan(imageData, config);

    // Continue scanning loop
    this.animationFrame = requestAnimationFrame(() => this.scanLoop(config));
  }

  private simulateBarcodeScan(imageData: ImageData, config: ScannerConfig): void {
    // This is a placeholder simulation
    // In a real implementation, you would use a library like ZXing or QuaggaJS
    
    // Random simulation of finding a barcode (for demo purposes)
    if (Math.random() < 0.001) { // Very low probability to simulate realistic scanning
      const mockBarcodes = [
        'SPEC001234567890',
        'LAB-2024-001',
        'SAMPLE-ABC123',
        'DEVICE-XYZ789',
        'PHARMA-456DEF'
      ];

      const mockResult: ScanResult = {
        data: mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)],
        format: 'CODE_128',
        timestamp: new Date(),
        bounds: {
          x: Math.random() * imageData.width * 0.5,
          y: Math.random() * imageData.height * 0.5,
          width: 200,
          height: 50
        }
      };

      this.handleScanResult(mockResult, config);
    }
  }

  private handleScanResult(result: ScanResult, config: ScannerConfig): void {
    // Play beep sound if enabled
    if (config.beepOnScan) {
      this.playBeepSound();
    }

    // Emit scan result
    this.scanResultSubject.next(result);

    // Stop scanning if not continuous
    if (!config.continuous) {
      this.stopScanning();
    }
  }

  private playBeepSound(): void {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  // Manual barcode input for devices without camera
  processManualInput(barcodeData: string): ScanResult {
    const result: ScanResult = {
      data: barcodeData.trim(),
      format: 'MANUAL_INPUT',
      timestamp: new Date()
    };

    this.scanResultSubject.next(result);
    return result;
  }

  // Validate barcode format
  validateBarcode(data: string): { isValid: boolean; type: string; error?: string } {
    if (!data || data.trim().length === 0) {
      return { isValid: false, type: 'UNKNOWN', error: 'Empty barcode data' };
    }

    const cleanData = data.trim().toUpperCase();

    // Healthcare specimen patterns
    if (/^SPEC\d{12}$/.test(cleanData)) {
      return { isValid: true, type: 'SPECIMEN' };
    }

    // Lab sample patterns
    if (/^LAB-\d{4}-\d{3}$/.test(cleanData)) {
      return { isValid: true, type: 'LAB_SAMPLE' };
    }

    // Medical device patterns
    if (/^DEVICE-[A-Z0-9]{6}$/.test(cleanData)) {
      return { isValid: true, type: 'MEDICAL_DEVICE' };
    }

    // Pharmaceutical patterns
    if (/^PHARMA-[A-Z0-9]{6}$/.test(cleanData)) {
      return { isValid: true, type: 'PHARMACEUTICAL' };
    }

    // Generic alphanumeric (minimum 6 characters)
    if (/^[A-Z0-9]{6,}$/.test(cleanData)) {
      return { isValid: true, type: 'GENERIC' };
    }

    return {
      isValid: false,
      type: 'UNKNOWN',
      error: 'Invalid barcode format for healthcare items'
    };
  }

  // Generate barcode for new items
  generateBarcode(type: 'SPECIMEN' | 'LAB_SAMPLE' | 'MEDICAL_DEVICE' | 'PHARMACEUTICAL'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    switch (type) {
      case 'SPECIMEN':
        return `SPEC${timestamp.slice(-12)}`;
      case 'LAB_SAMPLE':
        const year = new Date().getFullYear();
        const sequence = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        return `LAB-${year}-${sequence}`;
      case 'MEDICAL_DEVICE':
        return `DEVICE-${random}`;
      case 'PHARMACEUTICAL':
        return `PHARMA-${random}`;
      default:
        return `ITEM-${random}`;
    }
  }

  // Check camera permissions
  async checkCameraPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.warn('Cannot check camera permission:', error);
      return false;
    }
  }

  // Get available cameras
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting cameras:', error);
      return [];
    }
  }

  // Switch camera
  async switchCamera(deviceId: string): Promise<void> {
    if (!this.isScanning || !this.videoElement) {
      throw new Error('Scanner not active');
    }

    try {
      // Stop current stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      // Start new stream with specified device
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.videoElement.srcObject = this.stream;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error switching camera';
      this.errorSubject.next(errorMessage);
      throw error;
    }
  }

  // Toggle flashlight (if supported)
  async toggleFlashlight(): Promise<boolean> {
    if (!this.stream) {
      return false;
    }

    try {
      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if ('torch' in capabilities) {
        const settings = track.getSettings();
        const constraints = {
          advanced: [{ torch: !settings.torch }]
        };
        
        await track.applyConstraints(constraints);
        return !settings.torch;
      }
    } catch (error) {
      console.warn('Flashlight not supported or error toggling:', error);
    }

    return false;
  }

  // Cleanup resources
  destroy(): void {
    this.stopScanning();
    this.scanResultSubject.complete();
    this.isActiveScanningSubject.complete();
    this.errorSubject.complete();
  }
}