import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BarcodeScannerService, ScanResult, ScannerConfig } from '../../services/barcode-scanner.service';

@Component({
  selector: 'app-barcode-scanner',
  template: `
    <div class="barcode-scanner">
      <!-- Scanner Header -->
      <div class="scanner-header">
        <h3>{{ title || 'Scan Barcode' }}</h3>
        <div class="scanner-actions">
          <button mat-icon-button 
                  *ngIf="!isScanning && !manualMode"
                  (click)="startCamera()"
                  [disabled]="!cameraSupported"
                  matTooltip="Start Camera Scanner">
            <mat-icon>camera_alt</mat-icon>
          </button>
          
          <button mat-icon-button 
                  *ngIf="isScanning"
                  (click)="stopCamera()"
                  matTooltip="Stop Scanner">
            <mat-icon>stop</mat-icon>
          </button>

          <button mat-icon-button 
                  *ngIf="availableCameras.length > 1 && isScanning"
                  (click)="switchCamera()"
                  matTooltip="Switch Camera">
            <mat-icon>flip_camera_ios</mat-icon>
          </button>

          <button mat-icon-button 
                  *ngIf="flashlightSupported && isScanning"
                  (click)="toggleFlashlight()"
                  [class.active]="flashlightOn"
                  matTooltip="Toggle Flashlight">
            <mat-icon>{{ flashlightOn ? 'flash_off' : 'flash_on' }}</mat-icon>
          </button>

          <button mat-icon-button 
                  (click)="toggleManualMode()"
                  [class.active]="manualMode"
                  matTooltip="Manual Input Mode">
            <mat-icon>keyboard</mat-icon>
          </button>

          <button mat-icon-button 
                  *ngIf="allowClose"
                  (click)="closeScannerClick()"
                  matTooltip="Close Scanner">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div *ngIf="errorMessage" class="error-message">
        <mat-icon>error</mat-icon>
        <span>{{ errorMessage }}</span>
        <button mat-icon-button (click)="clearError()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Manual Input Mode -->
      <div *ngIf="manualMode" class="manual-input">
        <mat-form-field appearance="outline" class="barcode-input">
          <mat-label>Enter Barcode Manually</mat-label>
          <input matInput 
                 [formControl]="manualInputControl"
                 placeholder="Type or paste barcode here"
                 (keydown.enter)="processManualInput()">
          <button mat-icon-button 
                  matSuffix 
                  (click)="processManualInput()"
                  [disabled]="!manualInputControl.value">
            <mat-icon>send</mat-icon>
          </button>
        </mat-form-field>

        <div class="manual-actions">
          <button mat-raised-button 
                  color="primary"
                  (click)="processManualInput()"
                  [disabled]="!manualInputControl.value">
            <mat-icon>check</mat-icon>
            Process Barcode
          </button>

          <button mat-button (click)="generateSampleBarcode()">
            <mat-icon>auto_fix_high</mat-icon>
            Generate Sample
          </button>
        </div>

        <!-- Barcode Type Selection -->
        <div class="type-selection" *ngIf="showTypeSelection">
          <mat-form-field appearance="outline">
            <mat-label>Item Type</mat-label>
            <mat-select [(value)]="selectedItemType">
              <mat-option value="SPECIMEN">Specimen</mat-option>
              <mat-option value="LAB_SAMPLE">Lab Sample</mat-option>
              <mat-option value="MEDICAL_DEVICE">Medical Device</mat-option>
              <mat-option value="PHARMACEUTICAL">Pharmaceutical</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Camera Scanner Mode -->
      <div *ngIf="!manualMode" class="camera-scanner">
        <!-- Video Preview -->
        <div class="video-container" [class.scanning]="isScanning">
          <video #videoElement 
                 [style.display]="isScanning ? 'block' : 'none'"
                 autoplay 
                 playsinline 
                 muted>
          </video>
          
          <canvas #canvasElement style="display: none;"></canvas>

          <!-- Scan Overlay -->
          <div *ngIf="isScanning" class="scan-overlay">
            <div class="scan-frame">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
              <div class="scan-line"></div>
            </div>
            <div class="scan-instructions">
              <p>Position barcode within the frame</p>
              <small>Camera will automatically detect and scan</small>
            </div>
          </div>

          <!-- Camera Permission Request -->
          <div *ngIf="!isScanning && !cameraSupported" class="camera-setup">
            <mat-icon>camera_alt</mat-icon>
            <h4>Camera Access Required</h4>
            <p>Please allow camera access to scan barcodes</p>
            <button mat-raised-button 
                    color="primary" 
                    (click)="requestCameraPermission()">
              <mat-icon>camera_alt</mat-icon>
              Enable Camera
            </button>
          </div>

          <!-- Start Scanning Prompt -->
          <div *ngIf="!isScanning && cameraSupported && !manualMode" class="start-scanning">
            <mat-icon>qr_code_scanner</mat-icon>
            <h4>Ready to Scan</h4>
            <p>Click the camera button to start scanning barcodes</p>
          </div>
        </div>

        <!-- Scan Result Display -->
        <div *ngIf="lastScanResult && showResult" class="scan-result">
          <div class="result-header">
            <mat-icon color="primary">check_circle</mat-icon>
            <span>Scan Successful</span>
            <button mat-icon-button (click)="clearResult()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="result-content">
            <div class="result-item">
              <label>Barcode:</label>
              <code>{{ lastScanResult.data }}</code>
            </div>
            <div class="result-item">
              <label>Format:</label>
              <span>{{ lastScanResult.format }}</span>
            </div>
            <div class="result-item">
              <label>Scanned:</label>
              <span>{{ lastScanResult.timestamp | date:'medium' }}</span>
            </div>
            <div class="result-item" *ngIf="barcodeValidation">
              <label>Type:</label>
              <mat-chip [color]="barcodeValidation.isValid ? 'primary' : 'warn'" selected>
                {{ barcodeValidation.type }}
              </mat-chip>
            </div>
          </div>

          <div class="result-actions" *ngIf="!continuousMode">
            <button mat-raised-button 
                    color="primary"
                    (click)="acceptScan()">
              <mat-icon>check</mat-icon>
              Accept
            </button>
            <button mat-button (click)="rejectScan()">
              <mat-icon>close</mat-icon>
              Scan Again
            </button>
          </div>
        </div>
      </div>

      <!-- Scanner Controls -->
      <div class="scanner-controls" *ngIf="isScanning">
        <mat-slide-toggle 
          [(ngModel)]="continuousMode"
          (change)="updateScannerConfig()">
          Continuous Scanning
        </mat-slide-toggle>

        <mat-slide-toggle 
          [(ngModel)]="beepOnScan"
          (change)="updateScannerConfig()">
          Sound on Scan
        </mat-slide-toggle>
      </div>
    </div>
  `,
  styles: [`
    .barcode-scanner {
      .scanner-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 8px 8px 0 0;

        h3 {
          margin: 0;
          color: #333;
        }

        .scanner-actions {
          display: flex;
          gap: 0.5rem;

          button {
            &.active {
              background-color: #2196F3;
              color: white;
            }
          }
        }
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background-color: #ffebee;
        color: #d32f2f;
        border: 1px solid #ffcdd2;

        mat-icon {
          color: #d32f2f;
        }
      }

      .manual-input {
        padding: 2rem;

        .barcode-input {
          width: 100%;
          margin-bottom: 1rem;
        }

        .manual-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;

          button {
            mat-icon {
              margin-right: 0.5rem;
            }
          }
        }

        .type-selection {
          mat-form-field {
            width: 200px;
          }
        }
      }

      .camera-scanner {
        .video-container {
          position: relative;
          min-height: 400px;
          background-color: #000;
          border-radius: 0 0 8px 8px;
          overflow: hidden;

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .scan-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            .scan-frame {
              position: relative;
              width: 250px;
              height: 150px;
              margin-bottom: 2rem;

              .corner {
                position: absolute;
                width: 30px;
                height: 30px;
                border: 3px solid #2196F3;

                &.top-left {
                  top: 0;
                  left: 0;
                  border-right: none;
                  border-bottom: none;
                }

                &.top-right {
                  top: 0;
                  right: 0;
                  border-left: none;
                  border-bottom: none;
                }

                &.bottom-left {
                  bottom: 0;
                  left: 0;
                  border-right: none;
                  border-top: none;
                }

                &.bottom-right {
                  bottom: 0;
                  right: 0;
                  border-left: none;
                  border-top: none;
                }
              }

              .scan-line {
                position: absolute;
                top: 50%;
                left: 10px;
                right: 10px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #2196F3, transparent);
                animation: scan 2s linear infinite;
              }
            }

            .scan-instructions {
              text-align: center;
              color: white;
              text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);

              p {
                margin: 0 0 0.5rem 0;
                font-size: 1.1rem;
                font-weight: 500;
              }

              small {
                opacity: 0.8;
              }
            }
          }

          .camera-setup,
          .start-scanning {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            text-align: center;
            padding: 2rem;

            mat-icon {
              font-size: 4rem;
              width: 4rem;
              height: 4rem;
              margin-bottom: 1rem;
              opacity: 0.7;
            }

            h4 {
              margin: 0 0 1rem 0;
              color: #333;
            }

            p {
              margin: 0 0 2rem 0;
              max-width: 300px;
            }

            button {
              mat-icon {
                margin-right: 0.5rem;
                font-size: 1.2rem;
                width: 1.2rem;
                height: 1.2rem;
              }
            }
          }
        }

        .scan-result {
          margin: 1rem;
          padding: 1rem;
          border: 2px solid #4caf50;
          border-radius: 8px;
          background-color: #f1f8e9;

          .result-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-weight: 600;
            color: #2e7d32;
          }

          .result-content {
            .result-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 0.5rem;

              label {
                font-weight: 500;
                color: #666;
              }

              code {
                font-family: monospace;
                background-color: rgba(0, 0, 0, 0.05);
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
              }
            }
          }

          .result-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            justify-content: center;

            button {
              mat-icon {
                margin-right: 0.5rem;
              }
            }
          }
        }
      }

      .scanner-controls {
        padding: 1rem;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 2rem;
        justify-content: center;
      }
    }

    @keyframes scan {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }

    @media (max-width: 768px) {
      .barcode-scanner {
        .scanner-header {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
        }

        .manual-input {
          .manual-actions {
            flex-direction: column;
          }
        }

        .camera-scanner {
          .video-container {
            .scan-overlay {
              .scan-frame {
                width: 200px;
                height: 120px;
              }
            }
          }
        }

        .scanner-controls {
          flex-direction: column;
          gap: 1rem;
        }
      }
    }
  `]
})
export class BarcodeScannerComponent implements OnDestroy {
  @Input() title = '';
  @Input() allowClose = true;
  @Input() showResult = true;
  @Input() showTypeSelection = false;
  @Input() continuousMode = false;
  @Input() beepOnScan = true;

  @Output() scanResult = new EventEmitter<ScanResult>();
  @Output() scanError = new EventEmitter<string>();
  @Output() closeScanner = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  manualInputControl = new FormControl('');
  manualMode = false;
  isScanning = false;
  cameraSupported = false;
  flashlightSupported = false;
  flashlightOn = false;
  availableCameras: MediaDeviceInfo[] = [];
  currentCameraIndex = 0;
  errorMessage = '';
  lastScanResult: ScanResult | null = null;
  barcodeValidation: any = null;
  selectedItemType: 'SPECIMEN' | 'LAB_SAMPLE' | 'MEDICAL_DEVICE' | 'PHARMACEUTICAL' = 'SPECIMEN';

  constructor(private scannerService: BarcodeScannerService) {
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.scannerService.stopScanning();
  }

  private async initializeScanner(): Promise<void> {
    // Check camera support
    this.cameraSupported = await this.scannerService.checkCameraPermission();
    
    // Get available cameras
    this.availableCameras = await this.scannerService.getAvailableCameras();

    // Subscribe to scan results
    this.scannerService.scanResult$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.handleScanResult(result);
      }
    });

    // Subscribe to scanning status
    this.scannerService.isActiveScanning$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isScanning => {
      this.isScanning = isScanning;
    });

    // Subscribe to errors
    this.scannerService.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      if (error) {
        this.errorMessage = error;
        this.scanError.emit(error);
      }
    });
  }

  async startCamera(): Promise<void> {
    try {
      const config: Partial<ScannerConfig> = {
        continuous: this.continuousMode,
        beepOnScan: this.beepOnScan,
        preferredCamera: 'environment'
      };

      await this.scannerService.startScanning(
        this.videoElement.nativeElement,
        this.canvasElement.nativeElement,
        config
      );

      this.clearError();
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  }

  stopCamera(): void {
    this.scannerService.stopScanning();
  }

  async switchCamera(): Promise<void> {
    if (this.availableCameras.length <= 1) return;

    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
    const selectedCamera = this.availableCameras[this.currentCameraIndex];

    try {
      await this.scannerService.switchCamera(selectedCamera.deviceId);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }

  async toggleFlashlight(): Promise<void> {
    try {
      this.flashlightOn = await this.scannerService.toggleFlashlight();
    } catch (error) {
      console.error('Error toggling flashlight:', error);
    }
  }

  toggleManualMode(): void {
    this.manualMode = !this.manualMode;
    if (this.manualMode) {
      this.stopCamera();
    }
    this.clearError();
    this.clearResult();
  }

  processManualInput(): void {
    const barcodeData = this.manualInputControl.value;
    if (!barcodeData) return;

    const result = this.scannerService.processManualInput(barcodeData);
    this.handleScanResult(result);
    this.manualInputControl.setValue('');
  }

  generateSampleBarcode(): void {
    const sampleBarcode = this.scannerService.generateBarcode(this.selectedItemType);
    this.manualInputControl.setValue(sampleBarcode);
  }

  async requestCameraPermission(): Promise<void> {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraSupported = true;
      this.clearError();
    } catch (error) {
      this.errorMessage = 'Camera permission denied or not available';
    }
  }

  private handleScanResult(result: ScanResult): void {
    this.lastScanResult = result;
    this.barcodeValidation = this.scannerService.validateBarcode(result.data);
    
    if (this.showResult) {
      // Show result in UI
      console.log('Scan result:', result);
    }

    // Emit result to parent
    this.scanResult.emit(result);

    // Stop scanning if not continuous
    if (!this.continuousMode) {
      this.stopCamera();
    }
  }

  acceptScan(): void {
    if (this.lastScanResult) {
      this.scanResult.emit(this.lastScanResult);
      this.clearResult();
    }
  }

  rejectScan(): void {
    this.clearResult();
    if (!this.isScanning && !this.manualMode) {
      this.startCamera();
    }
  }

  clearResult(): void {
    this.lastScanResult = null;
    this.barcodeValidation = null;
  }

  clearError(): void {
    this.errorMessage = '';
  }

  updateScannerConfig(): void {
    // Configuration updates would be applied to the scanner service
    // This is called when toggle switches change
  }

  closeScannerClick(): void {
    this.stopCamera();
    this.closeScanner.emit();
  }
}