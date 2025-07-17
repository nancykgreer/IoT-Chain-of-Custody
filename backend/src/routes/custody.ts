import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, requireItemAccess, AuthenticatedRequest } from '../middleware/auth';
import { criticalOpsRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Get custody history for an item
router.get('/item/:itemId', requireItemAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { itemId } = req.params;

    const custodyEvents = await prisma.custodyEvent.findMany({
      where: { itemId },
      include: {
        handledBy: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        fromLocation: true,
        toLocation: true
      },
      orderBy: { eventTimestamp: 'desc' }
    });

    res.json({ success: true, data: custodyEvents });
  } catch (error) {
    next(error);
  }
});

// Transfer custody
router.post('/transfer',
  requireRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'TRANSPORT_STAFF', 'ADMIN'),
  criticalOpsRateLimiter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        itemId,
        fromLocationId,
        toLocationId,
        notes,
        witnessedBy,
        photos,
        documents,
        temperature,
        humidity,
        pressure
      } = req.body;

      // Validation
      if (!itemId || !toLocationId) {
        return res.status(400).json({ 
          error: 'Item ID and destination location are required' 
        });
      }

      // Verify item exists and user has access
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: { currentLocation: true }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check organization access
      if (item.organizationId !== req.user?.organizationId && 
          !['ADMIN', 'COMPLIANCE_OFFICER'].includes(req.user?.role!)) {
        return res.status(403).json({ error: 'Cannot transfer items from different organization' });
      }

      // Verify locations exist
      const [fromLocation, toLocation] = await Promise.all([
        fromLocationId ? prisma.location.findUnique({ where: { id: fromLocationId } }) : null,
        prisma.location.findUnique({ where: { id: toLocationId } })
      ]);

      if (!toLocation) {
        return res.status(400).json({ error: 'Destination location not found' });
      }

      if (fromLocationId && !fromLocation) {
        return res.status(400).json({ error: 'Source location not found' });
      }

      // Use current location as from location if not specified
      const actualFromLocationId = fromLocationId || item.currentLocationId;

      // Create custody transfer transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create custody event
        const custodyEvent = await tx.custodyEvent.create({
          data: {
            type: 'TRANSFER',
            description: notes || 'Custody transfer',
            itemId,
            handledById: req.user!.id,
            fromLocationId: actualFromLocationId,
            toLocationId,
            temperature,
            humidity,
            pressure,
            photos: photos || [],
            documents: documents || [],
            witnessedBy,
            notes,
            eventTimestamp: new Date()
          },
          include: {
            handledBy: {
              select: { id: true, firstName: true, lastName: true, role: true }
            },
            fromLocation: true,
            toLocation: true
          }
        });

        // Update item location and status
        const updatedItem = await tx.item.update({
          where: { id: itemId },
          data: {
            currentLocationId: toLocationId,
            status: 'IN_TRANSIT'
          },
          include: {
            currentLocation: true,
            custodyEvents: {
              take: 5,
              orderBy: { eventTimestamp: 'desc' },
              include: {
                handledBy: {
                  select: { id: true, firstName: true, lastName: true, role: true }
                }
              }
            }
          }
        });

        return { custodyEvent, item: updatedItem };
      });

      logger.info('Custody transfer completed:', {
        itemId,
        fromLocationId: actualFromLocationId,
        toLocationId,
        handledBy: req.user!.id,
        custodyEventId: result.custodyEvent.id
      });

      res.status(201).json({
        success: true,
        data: {
          custodyEvent: result.custodyEvent,
          item: result.item
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Receive item (confirm receipt)
router.post('/receive',
  requireRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'TRANSPORT_STAFF', 'ADMIN'),
  criticalOpsRateLimiter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        itemId,
        locationId,
        condition,
        notes,
        photos,
        temperature,
        humidity
      } = req.body;

      if (!itemId || !locationId) {
        return res.status(400).json({ 
          error: 'Item ID and location are required' 
        });
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Create receipt event and update item
      const result = await prisma.$transaction(async (tx) => {
        const custodyEvent = await tx.custodyEvent.create({
          data: {
            type: 'RECEIPT',
            description: `Item received at location - Condition: ${condition || 'Good'}`,
            itemId,
            handledById: req.user!.id,
            toLocationId: locationId,
            temperature,
            humidity,
            photos: photos || [],
            notes,
            eventTimestamp: new Date()
          }
        });

        const updatedItem = await tx.item.update({
          where: { id: itemId },
          data: {
            currentLocationId: locationId,
            status: 'RECEIVED'
          }
        });

        return { custodyEvent, item: updatedItem };
      });

      logger.info('Item received:', {
        itemId,
        locationId,
        receivedBy: req.user!.id,
        condition
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// Report environmental alert
router.post('/alert',
  requireRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'TRANSPORT_STAFF', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        itemId,
        alertType,
        description,
        temperature,
        humidity,
        pressure,
        photos,
        severity = 'MEDIUM'
      } = req.body;

      if (!itemId || !alertType || !description) {
        return res.status(400).json({ 
          error: 'Item ID, alert type, and description are required' 
        });
      }

      const custodyEvent = await prisma.custodyEvent.create({
        data: {
          type: alertType === 'temperature' ? 'TEMPERATURE_ALERT' : 'DAMAGE_REPORT',
          description,
          itemId,
          handledById: req.user!.id,
          temperature,
          humidity,
          pressure,
          photos: photos || [],
          notes: `Severity: ${severity}`,
          eventTimestamp: new Date()
        },
        include: {
          handledBy: {
            select: { id: true, firstName: true, lastName: true, role: true }
          },
          item: {
            select: { id: true, barcode: true, name: true, type: true }
          }
        }
      });

      // Update item status if severe
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await prisma.item.update({
          where: { id: itemId },
          data: { status: 'QUARANTINED' }
        });
      }

      logger.warn('Environmental alert reported:', {
        itemId,
        alertType,
        severity,
        reportedBy: req.user!.id,
        custodyEventId: custodyEvent.id
      });

      res.status(201).json({
        success: true,
        data: custodyEvent
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get custody statistics
router.get('/stats', 
  requireRole('ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { organizationId, startDate, endDate } = req.query;

      const where: any = {};
      
      if (organizationId && ['ADMIN', 'COMPLIANCE_OFFICER'].includes(req.user?.role!)) {
        where.item = { organizationId };
      } else {
        where.item = { organizationId: req.user?.organizationId };
      }

      if (startDate || endDate) {
        where.eventTimestamp = {};
        if (startDate) where.eventTimestamp.gte = new Date(startDate as string);
        if (endDate) where.eventTimestamp.lte = new Date(endDate as string);
      }

      const [
        totalEvents,
        transferEvents,
        alertEvents,
        recentEvents
      ] = await Promise.all([
        prisma.custodyEvent.count({ where }),
        prisma.custodyEvent.count({ 
          where: { ...where, type: 'TRANSFER' }
        }),
        prisma.custodyEvent.count({ 
          where: { 
            ...where, 
            type: { in: ['TEMPERATURE_ALERT', 'DAMAGE_REPORT'] }
          }
        }),
        prisma.custodyEvent.findMany({
          where,
          take: 10,
          orderBy: { eventTimestamp: 'desc' },
          include: {
            handledBy: {
              select: { firstName: true, lastName: true, role: true }
            },
            item: {
              select: { barcode: true, name: true, type: true }
            }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalEvents,
            transferEvents,
            alertEvents,
            alertRate: totalEvents > 0 ? (alertEvents / totalEvents * 100).toFixed(2) : '0'
          },
          recentEvents
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as custodyRoutes };