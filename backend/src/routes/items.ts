import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, requireItemAccess, AuthenticatedRequest } from '../middleware/auth';
import { criticalOpsRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all items (with pagination and filtering)
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      search,
      organizationId 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};
    
    // Organization-based filtering
    if (req.user?.role === 'ADMIN' || req.user?.role === 'COMPLIANCE_OFFICER') {
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
    } else {
      where.organizationId = req.user?.organizationId;
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take,
        include: {
          currentLocation: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true }
          },
          organization: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.item.count({ where })
    ]);

    res.json({
      success: true,
      data: items,
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

// Get single item
router.get('/:itemId', requireItemAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        currentLocation: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        organization: true,
        custodyEvents: {
          include: {
            handledBy: {
              select: { id: true, firstName: true, lastName: true, role: true }
            },
            fromLocation: true,
            toLocation: true
          },
          orderBy: { eventTimestamp: 'desc' }
        },
        digitalSignatures: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true }
            }
          },
          orderBy: { signedAt: 'desc' }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Create new item
router.post('/', 
  requireRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'ADMIN'),
  criticalOpsRateLimiter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        barcode,
        qrCode,
        type,
        name,
        description,
        category,
        patientId,
        specimenType,
        lotNumber,
        serialNumber,
        expirationDate,
        temperatureMin,
        temperatureMax,
        humidityMin,
        humidityMax,
        currentLocationId,
        metadata,
        requiresSpecialHandling,
        biohazardLevel
      } = req.body;

      // Validation
      if (!barcode || !type || !name) {
        return res.status(400).json({ 
          error: 'Barcode, type, and name are required' 
        });
      }

      // Check if barcode already exists
      const existingItem = await prisma.item.findUnique({
        where: { barcode }
      });

      if (existingItem) {
        return res.status(409).json({ error: 'Barcode already exists' });
      }

      // Verify location exists and belongs to user's organization
      if (currentLocationId) {
        const location = await prisma.location.findUnique({
          where: { id: currentLocationId }
        });

        if (!location || location.organizationId !== req.user?.organizationId) {
          return res.status(400).json({ error: 'Invalid location' });
        }
      }

      // Create item
      const item = await prisma.item.create({
        data: {
          barcode,
          qrCode,
          type,
          name,
          description,
          category,
          patientId, // Should be encrypted in production
          specimenType,
          lotNumber,
          serialNumber,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          temperatureMin,
          temperatureMax,
          humidityMin,
          humidityMax,
          currentLocationId,
          metadata,
          requiresSpecialHandling: requiresSpecialHandling || false,
          biohazardLevel,
          createdById: req.user!.id,
          organizationId: req.user!.organizationId
        },
        include: {
          currentLocation: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true }
          },
          organization: true
        }
      });

      // Create initial custody event
      await prisma.custodyEvent.create({
        data: {
          type: 'COLLECTION',
          description: 'Item created and collected',
          itemId: item.id,
          handledById: req.user!.id,
          toLocationId: currentLocationId,
          eventTimestamp: new Date()
        }
      });

      logger.info('Item created:', {
        itemId: item.id,
        barcode: item.barcode,
        type: item.type,
        createdBy: req.user!.id
      });

      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }
);

// Update item
router.put('/:itemId',
  requireItemAccess,
  requireRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { itemId } = req.params;
      const updateData = { ...req.body };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.barcode; // Barcode should be immutable
      delete updateData.createdById;
      delete updateData.organizationId;
      delete updateData.createdAt;

      const item = await prisma.item.update({
        where: { id: itemId },
        data: updateData,
        include: {
          currentLocation: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true }
          }
        }
      });

      logger.info('Item updated:', {
        itemId: item.id,
        updatedBy: req.user!.id,
        changes: Object.keys(updateData)
      });

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }
);

// Delete item (soft delete)
router.delete('/:itemId',
  requireItemAccess,
  requireRole('ADMIN', 'COMPLIANCE_OFFICER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { itemId } = req.params;

      const item = await prisma.item.update({
        where: { id: itemId },
        data: { deletedAt: new Date() }
      });

      logger.warn('Item deleted:', {
        itemId: item.id,
        deletedBy: req.user!.id
      });

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export { router as itemRoutes };