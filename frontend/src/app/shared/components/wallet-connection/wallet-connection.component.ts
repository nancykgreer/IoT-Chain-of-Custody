import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil } from 'rxjs';
import { WalletService, WalletInfo, TokenBalance } from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-connection',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="wallet-connection">
      <!-- Not Connected State -->
      <div *ngIf="!wallet?.isConnected && !isConnecting" class="wallet-connect">
        <div class="connect-header">
          <mat-icon class="wallet-icon">account_balance_wallet</mat-icon>
          <h3>Connect Wallet</h3>
          <p>Connect your MetaMask wallet to view and earn CHAIN tokens</p>
        </div>

        <div class="connect-actions">
          <button mat-raised-button 
                  color="primary" 
                  (click)="connectWallet()"
                  [disabled]="!isMetaMaskAvailable">
            <mat-icon>link</mat-icon>
            Connect MetaMask
          </button>

          <button mat-button 
                  *ngIf="!isMetaMaskAvailable"
                  (click)="installMetaMask()">
            <mat-icon>download</mat-icon>
            Install MetaMask
          </button>
        </div>

        <div class="connect-benefits">
          <h4>Benefits of Connecting:</h4>
          <ul>
            <li>🪙 Earn CHAIN tokens for compliance</li>
            <li>🏆 View your reward history</li>
            <li>📊 Track your organization's performance</li>
            <li>🎁 Receive quality bonuses</li>
          </ul>
        </div>
      </div>

      <!-- Connecting State -->
      <div *ngIf="isConnecting" class="wallet-connecting">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Connecting to MetaMask...</p>
        <small>Please check your MetaMask extension</small>
      </div>

      <!-- Connected State -->
      <div *ngIf="wallet?.isConnected" class="wallet-connected">
        <mat-card class="wallet-info">
          <mat-card-header>
            <div mat-card-avatar class="wallet-avatar">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <mat-card-title>Wallet Connected</mat-card-title>
            <mat-card-subtitle>{{ truncateAddress(wallet.address) }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- Network Status -->
            <div class="network-status">
              <mat-chip 
                [color]="getNetworkColor(wallet.chainId)" 
                selected>
                {{ wallet.network }}
              </mat-chip>
              
              <button mat-icon-button 
                      *ngIf="!isCorrectNetwork(wallet.chainId)"
                      (click)="switchToAvalanche()"
                      matTooltip="Switch to Avalanche Network">
                <mat-icon>swap_horiz</mat-icon>
              </button>
            </div>

            <!-- Balances -->
            <div class="balances">
              <!-- AVAX Balance -->
              <div class="balance-item">
                <div class="balance-label">AVAX Balance</div>
                <div class="balance-value">{{ wallet.balance }} AVAX</div>
              </div>

              <!-- CHAIN Token Balance -->
              <div class="balance-item" *ngIf="tokenBalance">
                <div class="balance-label">CHAIN Tokens</div>
                <div class="balance-value highlight">
                  {{ formatTokenAmount(tokenBalance.balance) }} CHAIN
                </div>
              </div>

              <!-- Total Rewards -->
              <div class="balance-item" *ngIf="tokenBalance">
                <div class="balance-label">Total Earned</div>
                <div class="balance-value earned">
                  {{ formatTokenAmount(tokenBalance.totalEarned) }} CHAIN
                </div>
              </div>

              <!-- Compliance Score -->
              <div class="balance-item" *ngIf="tokenBalance && tokenBalance.compliance > 0">
                <div class="balance-label">Compliance Score</div>
                <div class="balance-value" [class]="getComplianceClass(tokenBalance.compliance)">
                  {{ tokenBalance.compliance }}%
                </div>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="refreshWallet()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
            
            <button mat-button (click)="viewTransactions()">
              <mat-icon>history</mat-icon>
              History
            </button>
            
            <button mat-button (click)="disconnectWallet()">
              <mat-icon>link_off</mat-icon>
              Disconnect
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Quick Actions -->
        <div class="quick-actions" *ngIf="isCorrectNetwork(wallet.chainId)">
          <h4>Quick Actions</h4>
          
          <div class="action-buttons">
            <button mat-raised-button 
                    color="accent"
                    (click)="viewRewards()">
              <mat-icon>card_giftcard</mat-icon>
              View Rewards
            </button>

            <button mat-raised-button 
                    (click)="viewCompliance()">
              <mat-icon>verified</mat-icon>
              Compliance
            </button>

            <button mat-raised-button 
                    (click)="openExplorer()">
              <mat-icon>open_in_new</mat-icon>
              Block Explorer
            </button>
          </div>
        </div>

        <!-- Network Warning -->
        <div class="network-warning" *ngIf="!isCorrectNetwork(wallet.chainId)">
          <mat-icon>warning</mat-icon>
          <span>Please switch to Avalanche network to earn and view CHAIN tokens</span>
          <button mat-raised-button 
                  color="warn" 
                  (click)="switchToAvalanche()">
            Switch Network
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-connection {
      .wallet-connect {
        text-align: center;
        padding: 2rem;
        
        .connect-header {
          margin-bottom: 2rem;
          
          .wallet-icon {
            font-size: 4rem;
            width: 4rem;
            height: 4rem;
            color: #2196F3;
            margin-bottom: 1rem;
          }
          
          h3 {
            margin: 0 0 0.5rem 0;
            color: #333;
          }
          
          p {
            color: #666;
            margin: 0;
          }
        }
        
        .connect-actions {
          margin-bottom: 2rem;
          
          button {
            margin: 0.5rem;
            
            mat-icon {
              margin-right: 0.5rem;
            }
          }
        }
        
        .connect-benefits {
          max-width: 400px;
          margin: 0 auto;
          text-align: left;
          
          h4 {
            text-align: center;
            margin-bottom: 1rem;
            color: #333;
          }
          
          ul {
            list-style: none;
            padding: 0;
            
            li {
              padding: 0.5rem 0;
              border-bottom: 1px solid #f0f0f0;
              
              &:last-child {
                border-bottom: none;
              }
            }
          }
        }
      }
      
      .wallet-connecting {
        text-align: center;
        padding: 2rem;
        
        mat-spinner {
          margin: 0 auto 1rem auto;
        }
        
        p {
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }
        
        small {
          color: #666;
        }
      }
      
      .wallet-connected {
        .wallet-info {
          margin-bottom: 1rem;
          
          .wallet-avatar {
            background-color: #2196F3;
            color: white;
            
            mat-icon {
              line-height: 40px;
            }
          }
          
          .network-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          
          .balances {
            .balance-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.5rem 0;
              border-bottom: 1px solid #f0f0f0;
              
              &:last-child {
                border-bottom: none;
              }
              
              .balance-label {
                font-weight: 500;
                color: #666;
              }
              
              .balance-value {
                font-weight: 600;
                
                &.highlight {
                  color: #2196F3;
                  font-size: 1.1em;
                }
                
                &.earned {
                  color: #4CAF50;
                }
                
                &.excellent {
                  color: #4CAF50;
                }
                
                &.good {
                  color: #8BC34A;
                }
                
                &.fair {
                  color: #FF9800;
                }
                
                &.poor {
                  color: #F44336;
                }
              }
            }
          }
        }
        
        .quick-actions {
          margin-bottom: 1rem;
          
          h4 {
            margin: 0 0 1rem 0;
            color: #333;
          }
          
          .action-buttons {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            
            button {
              flex: 1;
              min-width: 120px;
              
              mat-icon {
                margin-right: 0.5rem;
              }
            }
          }
        }
        
        .network-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          color: #856404;
          
          mat-icon {
            color: #ff9800;
          }
          
          span {
            flex: 1;
          }
        }
      }
    }
    
    @media (max-width: 768px) {
      .wallet-connection {
        .quick-actions .action-buttons {
          flex-direction: column;
          
          button {
            width: 100%;
          }
        }
      }
    }
  `]
})
export class WalletConnectionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  wallet: WalletInfo | null = null;
  tokenBalance: TokenBalance | null = null;
  isConnecting = false;
  isMetaMaskAvailable = false;

  constructor(
    private walletService: WalletService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isMetaMaskAvailable = this.walletService.isMetaMaskAvailable();

    // Subscribe to wallet state
    this.walletService.wallet$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(wallet => {
      this.wallet = wallet;
    });

    // Subscribe to token balance
    this.walletService.tokenBalance$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(balance => {
      this.tokenBalance = balance;
    });

    // Subscribe to connecting state
    this.walletService.isConnecting$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(connecting => {
      this.isConnecting = connecting;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async connectWallet(): Promise<void> {
    try {
      await this.walletService.connectWallet();
      this.snackBar.open('Wallet connected successfully!', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      this.snackBar.open(
        error.message || 'Failed to connect wallet',
        'Close',
        { duration: 5000 }
      );
    }
  }

  disconnectWallet(): void {
    this.walletService.disconnectWallet();
    this.snackBar.open('Wallet disconnected', 'Close', { duration: 3000 });
  }

  async switchToAvalanche(): Promise<void> {
    try {
      await this.walletService.switchToAvalanche(true); // Use testnet for demo
      this.snackBar.open('Switched to Avalanche network', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      this.snackBar.open(
        'Failed to switch network. Please switch manually in MetaMask.',
        'Close',
        { duration: 5000 }
      );
    }
  }

  async refreshWallet(): Promise<void> {
    try {
      await this.walletService.refreshWallet();
      this.snackBar.open('Wallet refreshed', 'Close', { duration: 2000 });
    } catch (error: any) {
      console.error('Failed to refresh wallet:', error);
      this.snackBar.open('Failed to refresh wallet', 'Close', { duration: 3000 });
    }
  }

  installMetaMask(): void {
    window.open('https://metamask.io/download/', '_blank');
  }

  viewTransactions(): void {
    // Navigate to transaction history page
    // This would be implemented based on your routing structure
    console.log('Navigate to transaction history');
  }

  viewRewards(): void {
    // Navigate to rewards page
    console.log('Navigate to rewards page');
  }

  viewCompliance(): void {
    // Navigate to compliance page
    console.log('Navigate to compliance page');
  }

  openExplorer(): void {
    if (this.wallet?.address) {
      const network = this.isCorrectNetwork(this.wallet.chainId) ? 'fuji' : 'mainnet';
      const baseUrl = network === 'mainnet' ? 
        'https://snowtrace.io/address/' : 
        'https://testnet.snowtrace.io/address/';
      
      window.open(`${baseUrl}${this.wallet.address}`, '_blank');
    }
  }

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatTokenAmount(amount: string): string {
    return this.walletService.formatTokenAmount(amount);
  }

  isCorrectNetwork(chainId: number): boolean {
    // Accept both Avalanche Fuji (43113) and Mainnet (43114)
    return chainId === 43113 || chainId === 43114;
  }

  getNetworkColor(chainId: number): 'primary' | 'accent' | 'warn' {
    if (this.isCorrectNetwork(chainId)) {
      return 'primary';
    }
    return 'warn';
  }

  getComplianceClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  }
}