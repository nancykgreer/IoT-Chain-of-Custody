import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        isActive: true,
        lockedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    if (user.lockedAt && user.lockedAt > new Date(Date.now() - 15 * 60 * 1000)) {
      return res.status(401).json({ error: 'Account temporarily locked' });
    }

    // Add user to request and audit context
    req.user = user;
    if (req.auditContext) {
      req.auditContext.userId = user.id;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt:', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Organization-based authorization
export const requireSameOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract resource organization ID from params or body
    const resourceOrgId = req.params.organizationId || req.body.organizationId;
    
    if (resourceOrgId && resourceOrgId !== req.user.organizationId) {
      // Allow admins and compliance officers cross-organization access
      const privilegedRoles: UserRole[] = ['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'];
      
      if (!privilegedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Cannot access resources from different organization' 
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Organization authorization error:', error);
    return res.status(500).json({ error: 'Authorization service error' });
  }
};

// Item access authorization (check if user can access specific item)
export const requireItemAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const itemId = req.params.itemId || req.body.itemId;
    
    if (itemId) {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { organizationId: true, createdById: true }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Allow access if same organization or user created the item
      const hasAccess = 
        item.organizationId === req.user.organizationId ||
        item.createdById === req.user.id ||
        ['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Cannot access this item' });
      }
    }

    next();
  } catch (error) {
    logger.error('Item access authorization error:', error);
    return res.status(500).json({ error: 'Authorization service error' });
  }
};