import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  isConnected: boolean;
  network: string;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  totalEarned: string;
  compliance: number;
}

export interface Transaction {
  hash: string;
  type: string;
  amount: string;
  status: string;
  timestamp: Date;
  purpose: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private walletSubject = new BehaviorSubject<WalletInfo | null>(null);
  private tokenBalanceSubject = new BehaviorSubject<TokenBalance | null>(null);
  private connectingSubject = new BehaviorSubject<boolean>(false);

  public wallet$ = this.walletSubject.asObservable();
  public tokenBalance$ = this.tokenBalanceSubject.asObservable();
  public isConnecting$ = this.connectingSubject.asObservable();

  // Avalanche Network Configuration
  private readonly networks = {
    fuji: {
      chainId: '0xA869', // 43113
      chainName: 'Avalanche Fuji Testnet',
      nativeCurrency: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 18
      },
      rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://testnet.snowtrace.io/']
    },
    mainnet: {
      chainId: '0xA86A', // 43114
      chainName: 'Avalanche Network',
      nativeCurrency: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 18
      },
      rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://snowtrace.io/']
    }
  };

  constructor(private http: HttpClient) {
    this.initializeWallet();
    this.setupEventListeners();
  }

  /**
   * Initialize wallet connection on app start
   */
  private async initializeWallet(): Promise<void> {
    if (this.isMetaMaskAvailable()) {
      try {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await this.connectWallet();
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
      }
    }
  }

  /**
   * Setup event listeners for wallet changes
   */
  private setupEventListeners(): void {
    if (!this.isMetaMaskAvailable()) return;

    // Account changes
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.connectWallet();
      }
    });

    // Chain changes
    window.ethereum.on('chainChanged', (chainId: string) => {
      this.connectWallet(); // Refresh connection with new chain
    });

    // Connection changes
    window.ethereum.on('disconnect', () => {
      this.disconnectWallet();
    });
  }

  /**
   * Check if MetaMask is available
   */
  isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectWallet(): Promise<WalletInfo | null> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed');
    }

    this.connectingSubject.next(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      // Get balance
      const balance = await this.getBalance(address);

      const walletInfo: WalletInfo = {
        address,
        balance,
        chainId: parseInt(chainId, 16),
        isConnected: true,
        network: this.getNetworkName(parseInt(chainId, 16))
      };

      this.walletSubject.next(walletInfo);

      // Load token balance
      await this.loadTokenBalance(address);

      console.log('✅ Wallet connected:', walletInfo);
      return walletInfo;

    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      this.walletSubject.next(null);
      throw error;
    } finally {
      this.connectingSubject.next(false);
    }
  }

  /**
   * Disconnect wallet
   */
  disconnectWallet(): void {
    this.walletSubject.next(null);
    this.tokenBalanceSubject.next(null);
    console.log('🔌 Wallet disconnected');
  }

  /**
   * Switch to Avalanche network
   */
  async switchToAvalanche(testnet = true): Promise<void> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed');
    }

    const network = testnet ? this.networks.fuji : this.networks.mainnet;

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }]
      });
    } catch (switchError: any) {
      // If network is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network]
          });
        } catch (addError) {
          console.error('Failed to add Avalanche network:', addError);
          throw addError;
        }
      } else {
        console.error('Failed to switch to Avalanche network:', switchError);
        throw switchError;
      }
    }
  }

  /**
   * Get AVAX balance
   */
  private async getBalance(address: string): Promise<string> {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Convert from Wei to AVAX
      const balanceInAvax = parseInt(balance, 16) / Math.pow(10, 18);
      return balanceInAvax.toFixed(4);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Load CHAIN token balance from backend
   */
  private async loadTokenBalance(address: string): Promise<void> {
    try {
      const response = await this.http.get<{
        balance: string;
        totalRewards: string;
        compliance: number;
      }>(`${environment.apiUrl}/blockchain/balance/${address}`).toPromise();

      if (response) {
        const tokenBalance: TokenBalance = {
          symbol: 'CHAIN',
          balance: response.balance,
          totalEarned: response.totalRewards,
          compliance: response.compliance
        };

        this.tokenBalanceSubject.next(tokenBalance);
      }
    } catch (error) {
      console.error('Error loading token balance:', error);
      // Set default values
      this.tokenBalanceSubject.next({
        symbol: 'CHAIN',
        balance: '0',
        totalEarned: '0',
        compliance: 0
      });
    }
  }

  /**
   * Get organization wallet from backend
   */
  async getOrganizationWallet(organizationId: string): Promise<{ address: string; network: string }> {
    return this.http.get<{ address: string; network: string }>(
      `${environment.apiUrl}/blockchain/wallet/${organizationId}`
    ).toPromise() as Promise<{ address: string; network: string }>;
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(page = 1, limit = 20): Observable<{
    transactions: Transaction[];
    pagination: any;
  }> {
    return this.http.get<{
      transactions: Transaction[];
      pagination: any;
    }>(`${environment.apiUrl}/blockchain/transactions?page=${page}&limit=${limit}`);
  }

  /**
   * Get reward history
   */
  getRewardHistory(page = 1, limit = 20): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/blockchain/rewards/history?page=${page}&limit=${limit}`
    );
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): Observable<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
    contractsDeployed: boolean;
    network: string;
  }> {
    return this.http.get<{
      blockNumber: number;
      gasPrice: string;
      chainId: number;
      contractsDeployed: boolean;
      network: string;
    }>(`${environment.apiUrl}/blockchain/network/stats`);
  }

  /**
   * Manually award reward (admin only)
   */
  mintReward(data: {
    recipientAddress: string;
    amount: string;
    reason: string;
    organizationId?: string;
  }): Observable<{ success: boolean; transactionHash: string; message: string }> {
    return this.http.post<{
      success: boolean;
      transactionHash: string;
      message: string;
    }>(`${environment.apiUrl}/blockchain/reward/mint`, data);
  }

  /**
   * Issue compliance reward
   */
  issueComplianceReward(data: {
    organizationAddress: string;
    amount: string;
    score: number;
    organizationId: string;
  }): Observable<{ success: boolean; transactionHash: string; message: string }> {
    return this.http.post<{
      success: boolean;
      transactionHash: string;
      message: string;
    }>(`${environment.apiUrl}/blockchain/reward/compliance`, data);
  }

  /**
   * Award quality bonus
   */
  awardQualityBonus(data: {
    recipientAddress: string;
    amount: string;
    metric: string;
    organizationId?: string;
  }): Observable<{ success: boolean; transactionHash: string; message: string }> {
    return this.http.post<{
      success: boolean;
      transactionHash: string;
      message: string;
    }>(`${environment.apiUrl}/blockchain/reward/quality`, data);
  }

  /**
   * Update compliance metrics
   */
  updateComplianceMetrics(data: {
    organizationId: string;
    metrics: any;
  }): Observable<{ success: boolean; transactionHash: string; message: string }> {
    return this.http.post<{
      success: boolean;
      transactionHash: string;
      message: string;
    }>(`${environment.apiUrl}/blockchain/compliance/update`, data);
  }

  /**
   * Get current wallet info
   */
  getCurrentWallet(): WalletInfo | null {
    return this.walletSubject.value;
  }

  /**
   * Get current token balance
   */
  getCurrentTokenBalance(): TokenBalance | null {
    return this.tokenBalanceSubject.value;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    const wallet = this.getCurrentWallet();
    return wallet?.isConnected || false;
  }

  /**
   * Get network name from chain ID
   */
  private getNetworkName(chainId: number): string {
    switch (chainId) {
      case 43114: return 'Avalanche Mainnet';
      case 43113: return 'Avalanche Fuji';
      case 1: return 'Ethereum Mainnet';
      case 5: return 'Goerli Testnet';
      default: return `Unknown (${chainId})`;
    }
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: string, decimals = 2): string {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.01) return '< 0.01';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Refresh wallet data
   */
  async refreshWallet(): Promise<void> {
    const wallet = this.getCurrentWallet();
    if (wallet?.isConnected) {
      await this.connectWallet();
    }
  }

  /**
   * Get transaction details
   */
  getTransaction(hash: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/blockchain/transactions/${hash}`);
  }

  /**
   * Open transaction in block explorer
   */
  openInExplorer(hash: string, network = 'fuji'): void {
    const baseUrl = network === 'mainnet' ? 
      'https://snowtrace.io/tx/' : 
      'https://testnet.snowtrace.io/tx/';
    
    window.open(`${baseUrl}${hash}`, '_blank');
  }
}