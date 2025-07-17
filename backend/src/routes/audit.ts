import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication and role restrictions to all audit routes
router.use(authenticateToken);
router.use(requireRole('ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'));

// Get audit logs with filtering
router.get('/logs', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      complianceFlag
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (complianceFlag) {
      where.complianceFlags = {
        has: complianceFlag as string
      };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          },
          item: {
            select: { id: true, barcode: true, name: true, type: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get audit summary statistics
router.get('/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { startDate, endDate, organizationId } = req.query;

    const where: any = {};
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    // Organization filtering for non-admin users
    if (organizationId && req.user?.role === 'ADMIN') {
      where.user = { organizationId };
    } else if (req.user?.role !== 'ADMIN') {
      where.user = { organizationId: req.user?.organizationId };
    }

    const [
      totalLogs,
      actionCounts,
      complianceFlags,
      userActivity,
      entityCounts
    ] = await Promise.all([
      // Total audit logs
      prisma.auditLog.count({ where }),
      
      // Count by action type
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } }
      }),
      
      // Compliance flag counts
      prisma.$queryRaw`
        SELECT unnest("complianceFlags") as flag, COUNT(*) as count
        FROM "audit_logs" 
        ${Object.keys(where).length > 0 ? 'WHERE' : ''} 
        ${startDate ? `"timestamp" >= '${startDate}'` : ''}
        ${startDate && endDate ? 'AND' : ''}
        ${endDate ? `"timestamp" <= '${endDate}'` : ''}
        GROUP BY flag
        ORDER BY count DESC
      `,
      
      // User activity
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      }),
      
      // Entity type counts
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } }
      })
    ]);

    // Get user details for top users
    const userIds = userActivity.map(u => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true }
    });

    const userActivityWithDetails = userActivity.map(activity => ({
      ...activity,
      user: users.find(u => u.id === activity.userId)
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalLogs,
          timeRange: {
            start: startDate || 'All time',
            end: endDate || 'Present'
          }
        },
        actionDistribution: actionCounts,
        complianceFlags,
        topUsers: userActivityWithDetails,
        entityDistribution: entityCounts
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get compliance report
router.get('/compliance', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { startDate, endDate, standard } = req.query;

    const where: any = {
      complianceFlags: {
        isEmpty: false // Only logs with compliance flags
      }
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    if (standard) {
      where.complianceFlags = {
        has: standard as string
      };
    }

    const [
      complianceLogs,
      flagCounts,
      riskItems
    ] = await Promise.all([
      // Recent compliance events
      prisma.auditLog.findMany({
        where,
        take: 100,
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true, organization: true }
          },
          item: {
            select: { barcode: true, name: true, type: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      
      // Count compliance flags
      prisma.$queryRaw`
        SELECT unnest("complianceFlags") as flag, COUNT(*) as count
        FROM "audit_logs" 
        WHERE array_length("complianceFlags", 1) > 0
        ${startDate ? `AND "timestamp" >= '${startDate}'` : ''}
        ${endDate ? `AND "timestamp" <= '${endDate}'` : ''}
        GROUP BY flag
        ORDER BY count DESC
      `,
      
      // High-risk items (multiple compliance flags)
      prisma.auditLog.groupBy({
        by: ['entityId'],
        where: {
          ...where,
          entityType: 'Item'
        },
        _count: { entityId: true },
        having: {
          entityId: {
            _count: {
              gt: 2 // Items with more than 2 compliance events
            }
          }
        }
      })
    ]);

    // Get item details for high-risk items
    const riskItemIds = riskItems.map(item => item.entityId);
    const itemDetails = await prisma.item.findMany({
      where: { id: { in: riskItemIds } },
      select: { id: true, barcode: true, name: true, type: true, status: true }
    });

    const riskItemsWithDetails = riskItems.map(risk => ({
      ...risk,
      item: itemDetails.find(item => item.id === risk.entityId)
    }));

    res.json({
      success: true,
      data: {
        complianceEvents: complianceLogs,
        flagDistribution: flagCounts,
        riskItems: riskItemsWithDetails,
        recommendations: generateComplianceRecommendations(flagCounts as any[])
      }
    });
  } catch (error) {
    next(error);
  }
});

// Export audit data
router.post('/export', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      entityType,
      includePersonalData = false
    } = req.body;

    // Verify export permissions
    if (!['ADMIN', 'COMPLIANCE_OFFICER'].includes(req.user?.role!)) {
      return res.status(403).json({ error: 'Insufficient permissions for data export' });
    }

    const where: any = {};
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (entityType) where.entityType = entityType;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: includePersonalData ? {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        } : {
          select: { id: true, role: true }
        },
        item: {
          select: { id: true, barcode: true, name: true, type: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Log the export action
    await prisma.auditLog.create({
      data: {
        action: 'EXPORT',
        entityType: 'AuditLog',
        entityId: 'BULK_EXPORT',
        userId: req.user!.id,
        oldValues: { exportCriteria: { startDate, endDate, entityType } },
        newValues: { recordCount: auditLogs.length, format, includePersonalData },
        complianceFlags: includePersonalData ? ['GDPR_PERSONAL_DATA'] : [],
        timestamp: new Date()
      }
    });

    logger.info('Audit data exported:', {
      exportedBy: req.user!.id,
      recordCount: auditLogs.length,
      format,
      includePersonalData
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(auditLogs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_export.csv');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: auditLogs,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: req.user!.id,
          recordCount: auditLogs.length,
          criteria: { startDate, endDate, entityType }
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Helper function to generate compliance recommendations
function generateComplianceRecommendations(flagCounts: any[]): string[] {
  const recommendations: string[] = [];

  flagCounts.forEach(({ flag, count }) => {
    switch (flag) {
      case 'HIPAA_PATIENT_DATA':
        if (count > 10) {
          recommendations.push('High volume of HIPAA-related data access detected. Review access patterns and ensure proper authorization.');
        }
        break;
      case 'GDPR_PERSONAL_DATA':
        recommendations.push('GDPR personal data processing detected. Ensure proper consent and data retention policies.');
        break;
      case 'SECURITY_VIOLATION':
        if (count > 5) {
          recommendations.push('Multiple security violations detected. Review authentication systems and user permissions.');
        }
        break;
      case 'CRITICAL_OPERATION':
        recommendations.push('Critical operations logged. Ensure proper approval workflows and documentation.');
        break;
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('No major compliance issues detected in the selected time period.');
  }

  return recommendations;
}

// Helper function to convert audit logs to CSV
function convertToCSV(auditLogs: any[]): string {
  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'User ID',
    'User Role',
    'IP Address',
    'Compliance Flags'
  ];

  const rows = auditLogs.map(log => [
    log.timestamp.toISOString(),
    log.action,
    log.entityType,
    log.entityId,
    log.userId || '',
    log.user?.role || '',
    log.ipAddress || '',
    log.complianceFlags.join(';')
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export { router as auditRoutes };