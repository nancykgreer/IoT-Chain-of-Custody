import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { WalletService, TokenBalance, Transaction } from '../../services/wallet.service';

@Component({
  selector: 'app-token-balance',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule
  ],
  template: `
    <div class="token-balance">
      <!-- Token Balance Overview -->
      <mat-card class="balance-overview">
        <mat-card-header>
          <div mat-card-avatar class="token-avatar">
            <mat-icon>monetization_on</mat-icon>
          </div>
          <mat-card-title>CHAIN Token Balance</mat-card-title>
          <mat-card-subtitle *ngIf="tokenBalance">
            Healthcare Chain of Custody Rewards
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="!tokenBalance" class="no-balance">
            <mat-icon>account_balance_wallet</mat-icon>
            <p>Connect your wallet to view CHAIN token balance</p>
          </div>

          <div *ngIf="tokenBalance" class="balance-details">
            <!-- Current Balance -->
            <div class="balance-metric primary">
              <div class="metric-icon">
                <mat-icon>account_balance</mat-icon>
              </div>
              <div class="metric-content">
                <div class="metric-label">Current Balance</div>
                <div class="metric-value">
                  {{ formatTokenAmount(tokenBalance.balance) }} CHAIN
                </div>
              </div>
            </div>

            <!-- Total Earned -->
            <div class="balance-metric success">
              <div class="metric-icon">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="metric-content">
                <div class="metric-label">Total Earned</div>
                <div class="metric-value">
                  {{ formatTokenAmount(tokenBalance.totalEarned) }} CHAIN
                </div>
              </div>
            </div>

            <!-- Compliance Score -->
            <div class="balance-metric" [class]="getComplianceTheme(tokenBalance.compliance)">
              <div class="metric-icon">
                <mat-icon>verified</mat-icon>
              </div>
              <div class="metric-content">
                <div class="metric-label">Compliance Score</div>
                <div class="metric-value">
                  {{ tokenBalance.compliance }}%
                </div>
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="tokenBalance.compliance"
                  [color]="getProgressBarColor(tokenBalance.compliance)">
                </mat-progress-bar>
              </div>
            </div>

            <!-- Earning Potential -->
            <div class="earning-potential">
              <h4>🎯 Earning Opportunities</h4>
              <div class="opportunities">
                <mat-chip-set>
                  <mat-chip selected>
                    <mat-icon matChipAvatar>ac_unit</mat-icon>
                    Cold Chain: +50 CHAIN
                  </mat-chip>
                  <mat-chip selected>
                    <mat-icon matChipAvatar>assignment_turned_in</mat-icon>
                    Perfect Audit: +25 CHAIN
                  </mat-chip>
                  <mat-chip selected>
                    <mat-icon matChipAvatar>speed</mat-icon>
                    Fast Response: +15 CHAIN
                  </mat-chip>
                  <mat-chip selected>
                    <mat-icon matChipAvatar>emoji_events</mat-icon>
                    Quality Bonus: +100 CHAIN
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions *ngIf="tokenBalance">
          <button mat-button (click)="refreshBalance()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-button (click)="viewHistory()">
            <mat-icon>history</mat-icon>
            View History
          </button>
          <button mat-button (click)="learnMore()">
            <mat-icon>info</mat-icon>
            Learn More
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Transaction History -->
      <mat-card class="transaction-history" *ngIf="showHistory">
        <mat-card-header>
          <mat-card-title>Recent Transactions</mat-card-title>
          <mat-card-subtitle>Your CHAIN token activity</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group>
            <!-- All Transactions -->
            <mat-tab label="All">
              <div class="transactions-list">
                <div *ngIf="transactions.length === 0" class="no-transactions">
                  <mat-icon>receipt_long</mat-icon>
                  <p>No transactions yet</p>
                </div>

                <div *ngFor="let tx of transactions" class="transaction-item">
                  <div class="tx-icon" [class]="getTxIconClass(tx.type)">
                    <mat-icon>{{ getTxIcon(tx.type) }}</mat-icon>
                  </div>
                  
                  <div class="tx-content">
                    <div class="tx-purpose">{{ tx.purpose }}</div>
                    <div class="tx-details">
                      <span class="tx-hash">{{ truncateHash(tx.hash) }}</span>
                      <span class="tx-time">{{ formatDate(tx.timestamp) }}</span>
                    </div>
                  </div>
                  
                  <div class="tx-amount" [class]="getAmountClass(tx.type)">
                    {{ getTxAmountPrefix(tx.type) }}{{ formatTokenAmount(tx.amount) }} CHAIN
                  </div>
                  
                  <div class="tx-status">
                    <mat-chip 
                      [color]="getStatusColor(tx.status)" 
                      selected>
                      {{ tx.status }}
                    </mat-chip>
                  </div>
                  
                  <button mat-icon-button 
                          (click)="openTransaction(tx.hash)"
                          matTooltip="View on Explorer">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </div>
              </div>
            </mat-tab>

            <!-- Rewards Only -->
            <mat-tab label="Rewards">
              <div class="rewards-list">
                <div *ngFor="let reward of rewardHistory" class="reward-item">
                  <div class="reward-icon">
                    <mat-icon>card_giftcard</mat-icon>
                  </div>
                  
                  <div class="reward-content">
                    <div class="reward-category">{{ reward.category }}</div>
                    <div class="reward-details">
                      Score: {{ reward.score }}% | {{ reward.period }}
                    </div>
                  </div>
                  
                  <div class="reward-breakdown">
                    <div class="base">Base: {{ formatTokenAmount(reward.baseReward) }}</div>
                    <div class="bonus" *ngIf="parseFloat(reward.streakBonus) > 0">
                      Streak: +{{ formatTokenAmount(reward.streakBonus) }}
                    </div>
                    <div class="total">{{ formatTokenAmount(reward.amount) }} CHAIN</div>
                  </div>
                  
                  <div class="reward-date">
                    {{ formatDate(reward.calculatedAt) }}
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>

      <!-- Token Information -->
      <mat-card class="token-info" *ngIf="showTokenInfo">
        <mat-card-header>
          <mat-card-title>About CHAIN Tokens</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="info-sections">
            <div class="info-section">
              <h4>🪙 What are CHAIN Tokens?</h4>
              <p>
                CHAIN tokens are rewards earned for maintaining high compliance standards 
                and quality performance in healthcare chain of custody operations.
              </p>
            </div>

            <div class="info-section">
              <h4>🎯 How to Earn</h4>
              <ul>
                <li><strong>Compliance Excellence:</strong> Maintain high compliance scores</li>
                <li><strong>Workflow Completion:</strong> Successfully execute automated workflows</li>
                <li><strong>Quality Metrics:</strong> Achieve quality benchmarks</li>
                <li><strong>Cold Chain Management:</strong> Perfect temperature control</li>
                <li><strong>Audit Trail:</strong> Complete documentation</li>
              </ul>
            </div>

            <div class="info-section">
              <h4>🏆 Reward Tiers</h4>
              <div class="tier-list">
                <div class="tier platinum">
                  <span class="tier-name">Platinum (95-100%)</span>
                  <span class="tier-reward">500 CHAIN</span>
                </div>
                <div class="tier gold">
                  <span class="tier-name">Gold (85-94%)</span>
                  <span class="tier-reward">200 CHAIN</span>
                </div>
                <div class="tier silver">
                  <span class="tier-name">Silver (75-84%)</span>
                  <span class="tier-reward">100 CHAIN</span>
                </div>
                <div class="tier bronze">
                  <span class="tier-name">Bronze (60-74%)</span>
                  <span class="tier-reward">50 CHAIN</span>
                </div>
              </div>
            </div>

            <div class="info-section">
              <h4>🌐 Blockchain Details</h4>
              <div class="blockchain-info">
                <div class="detail-row">
                  <span>Network:</span>
                  <span>Avalanche C-Chain</span>
                </div>
                <div class="detail-row">
                  <span>Token Standard:</span>
                  <span>ERC-20 Compatible</span>
                </div>
                <div class="detail-row">
                  <span>Total Supply:</span>
                  <span>1,000,000,000 CHAIN</span>
                </div>
                <div class="detail-row">
                  <span>Decimals:</span>
                  <span>18</span>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .token-balance {
      .balance-overview {
        margin-bottom: 1rem;
        
        .token-avatar {
          background-color: #FFD700;
          color: #333;
        }
        
        .no-balance {
          text-align: center;
          padding: 2rem;
          color: #666;
          
          mat-icon {
            font-size: 3rem;
            width: 3rem;
            height: 3rem;
            margin-bottom: 1rem;
          }
        }
        
        .balance-details {
          .balance-metric {
            display: flex;
            align-items: center;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            border-left: 4px solid #ccc;
            
            &.primary {
              background-color: #e3f2fd;
              border-left-color: #2196F3;
            }
            
            &.success {
              background-color: #e8f5e8;
              border-left-color: #4CAF50;
            }
            
            &.excellent {
              background-color: #e8f5e8;
              border-left-color: #4CAF50;
            }
            
            &.good {
              background-color: #f3e5f5;
              border-left-color: #9C27B0;
            }
            
            &.fair {
              background-color: #fff3e0;
              border-left-color: #FF9800;
            }
            
            &.poor {
              background-color: #ffebee;
              border-left-color: #F44336;
            }
            
            .metric-icon {
              margin-right: 1rem;
              
              mat-icon {
                font-size: 2rem;
                width: 2rem;
                height: 2rem;
              }
            }
            
            .metric-content {
              flex: 1;
              
              .metric-label {
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 0.25rem;
              }
              
              .metric-value {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
              }
              
              mat-progress-bar {
                height: 6px;
                border-radius: 3px;
              }
            }
          }
          
          .earning-potential {
            margin-top: 1.5rem;
            
            h4 {
              margin: 0 0 1rem 0;
              color: #333;
            }
            
            .opportunities {
              mat-chip-set {
                .mat-mdc-chip {
                  margin: 0.25rem;
                }
              }
            }
          }
        }
      }
      
      .transaction-history {
        margin-bottom: 1rem;
        
        .transactions-list {
          .no-transactions {
            text-align: center;
            padding: 2rem;
            color: #666;
            
            mat-icon {
              font-size: 3rem;
              width: 3rem;
              height: 3rem;
              margin-bottom: 1rem;
            }
          }
          
          .transaction-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
            
            &:last-child {
              border-bottom: none;
            }
            
            .tx-icon {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 1rem;
              
              &.reward {
                background-color: #e8f5e8;
                color: #4CAF50;
              }
              
              &.bonus {
                background-color: #fff3e0;
                color: #FF9800;
              }
              
              &.transfer {
                background-color: #e3f2fd;
                color: #2196F3;
              }
            }
            
            .tx-content {
              flex: 1;
              
              .tx-purpose {
                font-weight: 500;
                margin-bottom: 0.25rem;
              }
              
              .tx-details {
                font-size: 0.8rem;
                color: #666;
                
                .tx-hash {
                  margin-right: 1rem;
                  font-family: monospace;
                }
              }
            }
            
            .tx-amount {
              font-weight: 600;
              margin: 0 1rem;
              
              &.positive {
                color: #4CAF50;
              }
              
              &.negative {
                color: #F44336;
              }
            }
            
            .tx-status {
              margin-right: 1rem;
            }
          }
        }
        
        .rewards-list {
          .reward-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
            
            .reward-icon {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-color: #FFD700;
              color: #333;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 1rem;
            }
            
            .reward-content {
              flex: 1;
              
              .reward-category {
                font-weight: 500;
                margin-bottom: 0.25rem;
              }
              
              .reward-details {
                font-size: 0.8rem;
                color: #666;
              }
            }
            
            .reward-breakdown {
              text-align: right;
              margin: 0 1rem;
              
              .base, .bonus {
                font-size: 0.8rem;
                color: #666;
              }
              
              .total {
                font-weight: 600;
                color: #4CAF50;
              }
            }
            
            .reward-date {
              font-size: 0.8rem;
              color: #666;
              width: 80px;
            }
          }
        }
      }
      
      .token-info {
        .info-sections {
          .info-section {
            margin-bottom: 2rem;
            
            &:last-child {
              margin-bottom: 0;
            }
            
            h4 {
              margin: 0 0 1rem 0;
              color: #333;
            }
            
            p {
              color: #666;
              line-height: 1.6;
            }
            
            ul {
              color: #666;
              line-height: 1.8;
            }
            
            .tier-list {
              .tier {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                margin-bottom: 0.5rem;
                border-radius: 4px;
                
                &.platinum {
                  background-color: #f3e5f5;
                  border-left: 4px solid #9C27B0;
                }
                
                &.gold {
                  background-color: #fff8e1;
                  border-left: 4px solid #FFC107;
                }
                
                &.silver {
                  background-color: #f1f8e9;
                  border-left: 4px solid #8BC34A;
                }
                
                &.bronze {
                  background-color: #ffebee;
                  border-left: 4px solid #FF5722;
                }
                
                .tier-reward {
                  font-weight: 600;
                }
              }
            }
            
            .blockchain-info {
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid #f0f0f0;
                
                &:last-child {
                  border-bottom: none;
                }
              }
            }
          }
        }
      }
    }
    
    @media (max-width: 768px) {
      .token-balance {
        .transaction-item, .reward-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
      }
    }
  `]
})
export class TokenBalanceComponent implements OnInit, OnDestroy {
  @Input() showHistory = true;
  @Input() showTokenInfo = false;

  private destroy$ = new Subject<void>();

  tokenBalance: TokenBalance | null = null;
  transactions: Transaction[] = [];
  rewardHistory: any[] = [];

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    // Subscribe to token balance
    this.walletService.tokenBalance$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(balance => {
      this.tokenBalance = balance;
    });

    // Load transaction history
    this.loadTransactionHistory();
    this.loadRewardHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async refreshBalance(): Promise<void> {
    await this.walletService.refreshWallet();
    this.loadTransactionHistory();
    this.loadRewardHistory();
  }

  viewHistory(): void {
    // Toggle history visibility or navigate to dedicated page
    this.showHistory = !this.showHistory;
  }

  learnMore(): void {
    this.showTokenInfo = !this.showTokenInfo;
  }

  private loadTransactionHistory(): void {
    this.walletService.getTransactionHistory(1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      response => {
        this.transactions = response.transactions || [];
      },
      error => {
        console.error('Failed to load transaction history:', error);
        this.transactions = [];
      }
    );
  }

  private loadRewardHistory(): void {
    this.walletService.getRewardHistory(1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      response => {
        this.rewardHistory = response.rewards || [];
      },
      error => {
        console.error('Failed to load reward history:', error);
        this.rewardHistory = [];
      }
    );
  }

  formatTokenAmount(amount: string): string {
    return this.walletService.formatTokenAmount(amount);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  truncateHash(hash: string): string {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  }

  getComplianceTheme(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  }

  getProgressBarColor(score: number): 'primary' | 'accent' | 'warn' {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'accent';
    return 'warn';
  }

  getTxIcon(type: string): string {
    switch (type) {
      case 'COMPLIANCE_REWARD': return 'card_giftcard';
      case 'QUALITY_BONUS': return 'star';
      case 'WORKFLOW_REWARD': return 'assignment_turned_in';
      case 'TOKEN_MINT': return 'add_circle';
      case 'TOKEN_TRANSFER': return 'swap_horiz';
      default: return 'monetization_on';
    }
  }

  getTxIconClass(type: string): string {
    switch (type) {
      case 'COMPLIANCE_REWARD':
      case 'WORKFLOW_REWARD':
      case 'TOKEN_MINT':
        return 'reward';
      case 'QUALITY_BONUS':
        return 'bonus';
      case 'TOKEN_TRANSFER':
        return 'transfer';
      default:
        return 'reward';
    }
  }

  getTxAmountPrefix(type: string): string {
    return type === 'TOKEN_TRANSFER' ? '' : '+';
  }

  getAmountClass(type: string): string {
    return type === 'TOKEN_TRANSFER' ? 'neutral' : 'positive';
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'CONFIRMED': return 'primary';
      case 'PENDING': return 'accent';
      case 'FAILED': return 'warn';
      default: return 'accent';
    }
  }

  openTransaction(hash: string): void {
    this.walletService.openInExplorer(hash);
  }
}