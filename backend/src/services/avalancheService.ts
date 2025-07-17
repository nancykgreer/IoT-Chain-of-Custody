import { ethers } from 'ethers';
import { PrismaClient, BlockchainNetwork, TransactionType, TransactionStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Smart contract ABIs (simplified for key functions)
const CHAIN_TOKEN_ABI = [
  "function mintReward(address recipient, uint256 amount, string memory reason) external",
  "function issueComplianceReward(address organization, uint256 amount, uint256 score, string memory orgId) external",
  "function awardQualityBonus(address recipient, uint256 amount, string memory metric) external",
  "function batchMintRewards(address[] memory recipients, uint256[] memory amounts, string memory reason) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function getRewardInfo(address account) external view returns (uint256 balance, uint256 totalRewards, uint256 compliance)",
  "function getOrganizationRewards(string memory orgId) external view returns (uint256)",
  "event RewardMinted(address indexed recipient, uint256 amount, string reason)",
  "event ComplianceRewardIssued(address indexed organization, uint256 amount, uint256 score)",
  "event QualityBonusAwarded(address indexed recipient, uint256 amount, string metric)"
];

const COMPLIANCE_REWARDS_ABI = [
  "function updateComplianceScore(address organization, uint8 category, uint256 score) external",
  "function batchUpdateCompliance(address organization, uint8[] memory categories, uint256[] memory scores) external",
  "function getOrganizationMetrics(address organization) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getRewardEstimate(address organization) external view returns (uint256)",
  "function registerOrganization(address organization) external",
  "event ComplianceUpdated(address indexed organization, uint8 category, uint256 score, uint256 timestamp)",
  "event RewardDistributed(address indexed organization, uint256 amount, uint256 complianceScore, uint256 streakBonus)"
];

interface ContractAddresses {
  chainToken: string;
  complianceRewards: string;
}

export interface ComplianceMetrics {
  COLD_CHAIN: number;
  AUDIT_TRAIL: number;
  REGULATORY: number;
  QUALITY_METRICS: number;
  RESPONSE_TIME: number;
  WORKFLOW_AUTOMATION: number;
}

export class AvalancheService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private chainTokenContract: ethers.Contract;
  private complianceRewardsContract: ethers.Contract;
  private network: BlockchainNetwork;
  private contractAddresses: ContractAddresses;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const rpcUrl = process.env.AVALANCHE_RPC_URL;
    const privateKey = process.env.AVALANCHE_PRIVATE_KEY;
    const network = process.env.AVALANCHE_NETWORK || 'fuji';

    if (!rpcUrl || !privateKey) {
      console.warn('⚠️ Avalanche blockchain integration not configured (demo mode)');
      return;
    }

    // Set network
    this.network = network === 'mainnet' ? BlockchainNetwork.AVALANCHE_MAINNET : 
                   network === 'fuji' ? BlockchainNetwork.AVALANCHE_FUJI : 
                   BlockchainNetwork.AVALANCHE_LOCAL;

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Load contract addresses (these would be set after deployment)
    this.contractAddresses = {
      chainToken: process.env.CHAIN_TOKEN_ADDRESS || '',
      complianceRewards: process.env.COMPLIANCE_REWARDS_ADDRESS || ''
    };

    if (this.contractAddresses.chainToken && this.contractAddresses.complianceRewards) {
      this.chainTokenContract = new ethers.Contract(
        this.contractAddresses.chainToken,
        CHAIN_TOKEN_ABI,
        this.wallet
      );

      this.complianceRewardsContract = new ethers.Contract(
        this.contractAddresses.complianceRewards,
        COMPLIANCE_REWARDS_ABI,
        this.wallet
      );

      console.log('✅ Avalanche blockchain service initialized');
    } else {
      console.warn('⚠️ Smart contract addresses not configured');
    }
  }

  /**
   * Check if blockchain integration is available
   */
  isAvailable(): boolean {
    return !!(this.provider && this.wallet && this.chainTokenContract && this.complianceRewardsContract);
  }

  /**
   * Mint reward tokens for compliance achievements
   */
  async mintReward(
    recipientAddress: string,
    amount: string,
    reason: string,
    organizationId?: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('🎭 Demo mode: Simulating reward mint');
      await this.simulateTransaction(
        TransactionType.TOKEN_MINT,
        recipientAddress,
        amount,
        reason,
        organizationId
      );
      return null;
    }

    try {
      console.log(`🪙 Minting ${amount} CHAIN tokens for: ${reason}`);

      // Convert amount to Wei (18 decimals)
      const amountWei = ethers.parseEther(amount);

      // Execute transaction
      const tx = await this.chainTokenContract.mintReward(
        recipientAddress,
        amountWei,
        reason
      );

      // Record transaction in database
      await this.recordTransaction({
        type: TransactionType.TOKEN_MINT,
        transactionHash: tx.hash,
        toAddress: recipientAddress,
        amount,
        purpose: reason,
        relatedOrganizationId: organizationId,
        metadata: {
          contractAddress: this.contractAddresses.chainToken,
          method: 'mintReward'
        }
      });

      console.log(`✅ Reward minting transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      await this.updateTransactionStatus(tx.hash, TransactionStatus.CONFIRMED, receipt.blockNumber);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to mint reward:', error);
      throw error;
    }
  }

  /**
   * Issue compliance reward to organization
   */
  async issueComplianceReward(
    organizationAddress: string,
    amount: string,
    score: number,
    organizationId: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('🎭 Demo mode: Simulating compliance reward');
      await this.simulateTransaction(
        TransactionType.COMPLIANCE_REWARD,
        organizationAddress,
        amount,
        `Compliance reward (score: ${score})`,
        organizationId
      );
      return null;
    }

    try {
      console.log(`🏆 Issuing compliance reward: ${amount} CHAIN tokens (score: ${score})`);

      const amountWei = ethers.parseEther(amount);

      const tx = await this.chainTokenContract.issueComplianceReward(
        organizationAddress,
        amountWei,
        score,
        organizationId
      );

      await this.recordTransaction({
        type: TransactionType.COMPLIANCE_REWARD,
        transactionHash: tx.hash,
        toAddress: organizationAddress,
        amount,
        purpose: `Compliance reward (score: ${score})`,
        relatedOrganizationId: organizationId,
        metadata: {
          score,
          contractAddress: this.contractAddresses.chainToken,
          method: 'issueComplianceReward'
        }
      });

      const receipt = await tx.wait();
      await this.updateTransactionStatus(tx.hash, TransactionStatus.CONFIRMED, receipt.blockNumber);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to issue compliance reward:', error);
      throw error;
    }
  }

  /**
   * Award quality bonus
   */
  async awardQualityBonus(
    recipientAddress: string,
    amount: string,
    metric: string,
    organizationId?: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('🎭 Demo mode: Simulating quality bonus');
      await this.simulateTransaction(
        TransactionType.QUALITY_BONUS,
        recipientAddress,
        amount,
        `Quality bonus: ${metric}`,
        organizationId
      );
      return null;
    }

    try {
      console.log(`⭐ Awarding quality bonus: ${amount} CHAIN tokens for ${metric}`);

      const amountWei = ethers.parseEther(amount);

      const tx = await this.chainTokenContract.awardQualityBonus(
        recipientAddress,
        amountWei,
        metric
      );

      await this.recordTransaction({
        type: TransactionType.QUALITY_BONUS,
        transactionHash: tx.hash,
        toAddress: recipientAddress,
        amount,
        purpose: `Quality bonus: ${metric}`,
        relatedOrganizationId: organizationId,
        metadata: {
          metric,
          contractAddress: this.contractAddresses.chainToken,
          method: 'awardQualityBonus'
        }
      });

      const receipt = await tx.wait();
      await this.updateTransactionStatus(tx.hash, TransactionStatus.CONFIRMED, receipt.blockNumber);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to award quality bonus:', error);
      throw error;
    }
  }

  /**
   * Update compliance scores for an organization
   */
  async updateComplianceMetrics(
    organizationAddress: string,
    metrics: Partial<ComplianceMetrics>,
    organizationId: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('🎭 Demo mode: Simulating compliance update');
      return null;
    }

    try {
      console.log('📊 Updating compliance metrics for organization');

      const categories: number[] = [];
      const scores: number[] = [];

      // Map metrics to category indices
      const categoryMap = {
        COLD_CHAIN: 0,
        AUDIT_TRAIL: 1,
        REGULATORY: 2,
        QUALITY_METRICS: 3,
        RESPONSE_TIME: 4,
        WORKFLOW_AUTOMATION: 5
      };

      Object.entries(metrics).forEach(([key, value]) => {
        if (key in categoryMap && typeof value === 'number') {
          categories.push(categoryMap[key as keyof ComplianceMetrics]);
          scores.push(value);
        }
      });

      if (categories.length === 0) {
        throw new Error('No valid metrics provided');
      }

      const tx = await this.complianceRewardsContract.batchUpdateCompliance(
        organizationAddress,
        categories,
        scores
      );

      await this.recordTransaction({
        type: TransactionType.COMPLIANCE_REWARD,
        transactionHash: tx.hash,
        toAddress: organizationAddress,
        amount: '0',
        purpose: 'Compliance metrics update',
        relatedOrganizationId: organizationId,
        metadata: {
          metrics,
          contractAddress: this.contractAddresses.complianceRewards,
          method: 'batchUpdateCompliance'
        }
      });

      const receipt = await tx.wait();
      await this.updateTransactionStatus(tx.hash, TransactionStatus.CONFIRMED, receipt.blockNumber);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to update compliance metrics:', error);
      throw error;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string): Promise<string> {
    if (!this.isAvailable()) {
      // Return demo balance
      return '1000.0';
    }

    try {
      const balanceWei = await this.chainTokenContract.balanceOf(address);
      return ethers.formatEther(balanceWei);
    } catch (error) {
      console.error('❌ Failed to get token balance:', error);
      return '0';
    }
  }

  /**
   * Get detailed reward information for an address
   */
  async getRewardInfo(address: string): Promise<{
    balance: string;
    totalRewards: string;
    compliance: number;
  }> {
    if (!this.isAvailable()) {
      return {
        balance: '1000.0',
        totalRewards: '500.0',
        compliance: 85
      };
    }

    try {
      const [balance, totalRewards, compliance] = await this.chainTokenContract.getRewardInfo(address);
      
      return {
        balance: ethers.formatEther(balance),
        totalRewards: ethers.formatEther(totalRewards),
        compliance: Number(compliance)
      };
    } catch (error) {
      console.error('❌ Failed to get reward info:', error);
      return { balance: '0', totalRewards: '0', compliance: 0 };
    }
  }

  /**
   * Register a new organization for compliance rewards
   */
  async registerOrganization(organizationAddress: string): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('🎭 Demo mode: Simulating organization registration');
      return null;
    }

    try {
      console.log(`🏥 Registering organization: ${organizationAddress}`);

      const tx = await this.complianceRewardsContract.registerOrganization(organizationAddress);

      await this.recordTransaction({
        type: TransactionType.GOVERNANCE_VOTE,
        transactionHash: tx.hash,
        toAddress: organizationAddress,
        amount: '0',
        purpose: 'Organization registration',
        metadata: {
          contractAddress: this.contractAddresses.complianceRewards,
          method: 'registerOrganization'
        }
      });

      const receipt = await tx.wait();
      await this.updateTransactionStatus(tx.hash, TransactionStatus.CONFIRMED, receipt.blockNumber);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to register organization:', error);
      throw error;
    }
  }

  /**
   * Create or get organization wallet
   */
  async getOrCreateOrganizationWallet(organizationId: string): Promise<{
    address: string;
    privateKey?: string;
  }> {
    // Check if wallet already exists
    const existingWallet = await prisma.organizationWallet.findUnique({
      where: { organizationId }
    });

    if (existingWallet) {
      return {
        address: existingWallet.address,
        privateKey: existingWallet.privateKeyEncrypted ? 
          this.decryptPrivateKey(existingWallet.privateKeyEncrypted) : undefined
      };
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);

    // Save to database
    await prisma.organizationWallet.create({
      data: {
        organizationId,
        address: wallet.address,
        privateKeyEncrypted: encryptedPrivateKey,
        network: this.network || BlockchainNetwork.AVALANCHE_FUJI
      }
    });

    // Initialize token balance
    if (this.contractAddresses.chainToken) {
      await prisma.tokenBalance.create({
        data: {
          walletId: organizationId,
          tokenAddress: this.contractAddresses.chainToken,
          tokenSymbol: 'CHAIN',
          tokenName: 'Healthcare Chain Token',
          balance: '0'
        }
      });
    }

    console.log(`✅ Created new wallet for organization ${organizationId}: ${wallet.address}`);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  /**
   * Record blockchain transaction in database
   */
  private async recordTransaction(data: {
    type: TransactionType;
    transactionHash: string;
    toAddress: string;
    amount: string;
    purpose: string;
    relatedOrganizationId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.blockchainTransaction.create({
        data: {
          transactionHash: data.transactionHash,
          network: this.network || BlockchainNetwork.AVALANCHE_FUJI,
          type: data.type,
          status: TransactionStatus.PENDING,
          toAddress: data.toAddress,
          amount: data.amount,
          purpose: data.purpose,
          relatedOrganizationId: data.relatedOrganizationId,
          metadata: data.metadata
        }
      });
    } catch (error) {
      console.error('❌ Failed to record transaction:', error);
    }
  }

  /**
   * Update transaction status when confirmed
   */
  private async updateTransactionStatus(
    transactionHash: string,
    status: TransactionStatus,
    blockNumber?: number
  ): Promise<void> {
    try {
      await prisma.blockchainTransaction.update({
        where: { transactionHash },
        data: {
          status,
          blockNumber: blockNumber ? BigInt(blockNumber) : undefined
        }
      });
    } catch (error) {
      console.error('❌ Failed to update transaction status:', error);
    }
  }

  /**
   * Simulate transaction for demo mode
   */
  private async simulateTransaction(
    type: TransactionType,
    toAddress: string,
    amount: string,
    purpose: string,
    organizationId?: string
  ): Promise<void> {
    const mockHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    await this.recordTransaction({
      type,
      transactionHash: mockHash,
      toAddress,
      amount,
      purpose: `[DEMO] ${purpose}`,
      relatedOrganizationId: organizationId,
      metadata: { demo: true }
    });

    // Simulate confirmation after short delay
    setTimeout(async () => {
      await this.updateTransactionStatus(mockHash, TransactionStatus.CONFIRMED, 12345);
    }, 2000);
  }

  /**
   * Encrypt private key for storage
   */
  private encryptPrivateKey(privateKey: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-for-demo';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt private key from storage
   */
  private decryptPrivateKey(encryptedPrivateKey: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-for-demo';
    
    const [ivHex, encrypted] = encryptedPrivateKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
  }> {
    if (!this.isAvailable()) {
      return {
        blockNumber: 12345,
        gasPrice: '25.0',
        chainId: 43113
      };
    }

    try {
      const [blockNumber, gasPrice, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getNetwork()
      ]);

      return {
        blockNumber,
        gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei'),
        chainId: Number(network.chainId)
      };
    } catch (error) {
      console.error('❌ Failed to get network stats:', error);
      return { blockNumber: 0, gasPrice: '0', chainId: 0 };
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.provider) {
      this.provider.destroy();
    }
    await prisma.$disconnect();
  }
}

export const avalancheService = new AvalancheService();