import express from 'express';
import { PrismaClient, TransactionType } from '@prisma/client';
import { auth } from '../middleware/auth';
import { avalancheService } from '../services/avalancheService';
import { auditLogger } from '../middleware/auditLogger';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all blockchain routes
router.use(auth);

/**
 * GET /api/blockchain/wallet/:organizationId
 * Get or create organization wallet
 */
router.get('/wallet/:organizationId', auditLogger, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true }
    });

    if (!user || user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to organization wallet' });
    }

    const wallet = await avalancheService.getOrCreateOrganizationWallet(organizationId);
    
    // Don't expose private key in response
    res.json({
      address: wallet.address,
      network: process.env.AVALANCHE_NETWORK || 'fuji'
    });
  } catch (error) {
    console.error('Error getting organization wallet:', error);
    res.status(500).json({ error: 'Failed to get organization wallet' });
  }
});

/**
 * GET /api/blockchain/balance/:address
 * Get token balance for an address
 */
router.get('/balance/:address', auditLogger, async (req, res) => {
  try {
    const { address } = req.params;
    
    const balance = await avalancheService.getTokenBalance(address);
    const rewardInfo = await avalancheService.getRewardInfo(address);
    
    res.json({
      balance,
      ...rewardInfo
    });
  } catch (error) {
    console.error('Error getting token balance:', error);
    res.status(500).json({ error: 'Failed to get token balance' });
  }
});

/**
 * POST /api/blockchain/reward/mint
 * Mint reward tokens (admin only)
 */
router.post('/reward/mint', auditLogger, async (req, res) => {
  try {
    const { recipientAddress, amount, reason, organizationId } = req.body;
    
    // Verify admin permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!recipientAddress || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transactionHash = await avalancheService.mintReward(
      recipientAddress,
      amount,
      reason,
      organizationId
    );

    res.json({
      success: true,
      transactionHash,
      message: `Minted ${amount} CHAIN tokens`
    });
  } catch (error) {
    console.error('Error minting reward:', error);
    res.status(500).json({ error: 'Failed to mint reward' });
  }
});

/**
 * POST /api/blockchain/reward/compliance
 * Issue compliance reward
 */
router.post('/reward/compliance', auditLogger, async (req, res) => {
  try {
    const { organizationAddress, amount, score, organizationId } = req.body;
    
    // Verify compliance officer permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || !['ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
      return res.status(403).json({ error: 'Compliance officer access required' });
    }

    if (!organizationAddress || !amount || score === undefined || !organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    const transactionHash = await avalancheService.issueComplianceReward(
      organizationAddress,
      amount,
      score,
      organizationId
    );

    // Record compliance reward in database
    await prisma.complianceReward.create({
      data: {
        organizationId,
        amount,
        category: 'OVERALL_COMPLIANCE',
        score,
        baseReward: amount,
        multiplier: 1.0,
        period: 'MANUAL',
        metrics: { manualReward: true, issuedBy: user.id },
        transactionHash
      }
    });

    res.json({
      success: true,
      transactionHash,
      message: `Issued compliance reward: ${amount} CHAIN tokens`
    });
  } catch (error) {
    console.error('Error issuing compliance reward:', error);
    res.status(500).json({ error: 'Failed to issue compliance reward' });
  }
});

/**
 * POST /api/blockchain/reward/quality
 * Award quality bonus
 */
router.post('/reward/quality', auditLogger, async (req, res) => {
  try {
    const { recipientAddress, amount, metric, organizationId } = req.body;
    
    // Verify permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || !['ADMIN', 'COMPLIANCE_OFFICER', 'LAB_TECHNICIAN'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!recipientAddress || !amount || !metric) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transactionHash = await avalancheService.awardQualityBonus(
      recipientAddress,
      amount,
      metric,
      organizationId
    );

    res.json({
      success: true,
      transactionHash,
      message: `Awarded quality bonus: ${amount} CHAIN tokens`
    });
  } catch (error) {
    console.error('Error awarding quality bonus:', error);
    res.status(500).json({ error: 'Failed to award quality bonus' });
  }
});

/**
 * POST /api/blockchain/compliance/update
 * Update compliance metrics
 */
router.post('/compliance/update', auditLogger, async (req, res) => {
  try {
    const { organizationId, metrics } = req.body;
    
    // Verify permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || !['ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
      return res.status(403).json({ error: 'Compliance officer access required' });
    }

    // Get organization wallet
    const wallet = await avalancheService.getOrCreateOrganizationWallet(organizationId);
    
    const transactionHash = await avalancheService.updateComplianceMetrics(
      wallet.address,
      metrics,
      organizationId
    );

    res.json({
      success: true,
      transactionHash,
      message: 'Compliance metrics updated'
    });
  } catch (error) {
    console.error('Error updating compliance metrics:', error);
    res.status(500).json({ error: 'Failed to update compliance metrics' });
  }
});

/**
 * GET /api/blockchain/transactions
 * Get blockchain transactions for organization
 */
router.get('/transactions', auditLogger, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where: any = {
      relatedOrganizationId: user.organizationId
    };

    if (type && Object.values(TransactionType).includes(type as TransactionType)) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.blockchainTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.blockchainTransaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * GET /api/blockchain/transactions/:hash
 * Get specific transaction details
 */
router.get('/transactions/:hash', auditLogger, async (req, res) => {
  try {
    const { hash } = req.params;
    
    const transaction = await prisma.blockchainTransaction.findUnique({
      where: { transactionHash: hash },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify user has access to this transaction
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || (transaction.relatedOrganizationId && 
                  transaction.relatedOrganizationId !== user.organizationId && 
                  user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

/**
 * GET /api/blockchain/rewards/history
 * Get reward history for organization
 */
router.get('/rewards/history', auditLogger, async (req, res) => {
  try {
    const { page = 1, limit = 20, period } = req.query;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where: any = {
      organizationId: user.organizationId
    };

    if (period) {
      where.period = period;
    }

    const [rewards, total] = await Promise.all([
      prisma.complianceReward.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.complianceReward.count({ where })
    ]);

    res.json({
      rewards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting reward history:', error);
    res.status(500).json({ error: 'Failed to get reward history' });
  }
});

/**
 * GET /api/blockchain/network/stats
 * Get network statistics
 */
router.get('/network/stats', auditLogger, async (req, res) => {
  try {
    const stats = await avalancheService.getNetworkStats();
    
    res.json({
      ...stats,
      contractsDeployed: avalancheService.isAvailable(),
      network: process.env.AVALANCHE_NETWORK || 'fuji'
    });
  } catch (error) {
    console.error('Error getting network stats:', error);
    res.status(500).json({ error: 'Failed to get network stats' });
  }
});

/**
 * POST /api/blockchain/organization/register
 * Register organization for compliance rewards (admin only)
 */
router.post('/organization/register', auditLogger, async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    // Verify admin permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get organization wallet
    const wallet = await avalancheService.getOrCreateOrganizationWallet(organizationId);
    
    // Register on blockchain
    const transactionHash = await avalancheService.registerOrganization(wallet.address);

    res.json({
      success: true,
      transactionHash,
      walletAddress: wallet.address,
      message: 'Organization registered for compliance rewards'
    });
  } catch (error) {
    console.error('Error registering organization:', error);
    res.status(500).json({ error: 'Failed to register organization' });
  }
});

export default router;