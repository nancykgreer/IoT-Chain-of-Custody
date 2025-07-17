import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLogger as logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Extend Request interface to include audit data
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        requestId: string;
        userId?: string;
        action?: string;
        entityType?: string;
        entityId?: string;
      };
    }
  }
}

export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID();
  
  // Initialize audit context
  req.auditContext = {
    requestId,
    action: determineAction(req.method, req.path),
    entityType: determineEntityType(req.path),
    entityId: extractEntityId(req.path, req.body)
  };

  // Log request
  logger.info('API Request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function(data: any) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Log response on finish
  res.on('finish', async () => {
    try {
      await logAuditEvent(req, res, responseBody);
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  });

  next();
};

async function logAuditEvent(req: Request, res: Response, responseBody: any) {
  const { auditContext } = req;
  if (!auditContext) return;

  // Skip logging for non-critical operations
  if (shouldSkipAudit(req.path, req.method)) return;

  try {
    await prisma.auditLog.create({
      data: {
        action: auditContext.action || req.method,
        entityType: auditContext.entityType || 'UNKNOWN',
        entityId: auditContext.entityId || 'N/A',
        oldValues: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
        newValues: res.statusCode < 400 ? responseBody : null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: auditContext.requestId,
        userId: auditContext.userId,
        complianceFlags: detectComplianceFlags(req, res),
        timestamp: new Date()
      }
    });

    logger.info('Audit log created', {
      requestId: auditContext.requestId,
      action: auditContext.action,
      entityType: auditContext.entityType,
      statusCode: res.statusCode
    });
  } catch (error) {
    logger.error('Failed to create audit log in database:', error);
  }
}

function determineAction(method: string, path: string): string {
  if (path.includes('/custody')) return 'CUSTODY_TRANSFER';
  if (path.includes('/signature')) return 'DIGITAL_SIGNATURE';
  
  switch (method) {
    case 'POST': return 'CREATE';
    case 'GET': return 'READ';
    case 'PUT': 
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

function determineEntityType(path: string): string {
  if (path.includes('/items')) return 'Item';
  if (path.includes('/users')) return 'User';
  if (path.includes('/custody')) return 'CustodyEvent';
  if (path.includes('/organizations')) return 'Organization';
  if (path.includes('/locations')) return 'Location';
  return 'UNKNOWN';
}

function extractEntityId(path: string, body: any): string {
  // Extract ID from path params
  const pathParts = path.split('/');
  const idIndex = pathParts.findIndex(part => 
    part.match(/^[a-zA-Z0-9-_]+$/) && pathParts[pathParts.indexOf(part) - 1] !== 'api'
  );
  
  if (idIndex > 0 && pathParts[idIndex]) {
    return pathParts[idIndex];
  }
  
  // Try to get ID from request body
  if (body && (body.id || body.itemId || body.userId)) {
    return body.id || body.itemId || body.userId;
  }
  
  return 'N/A';
}

function shouldSkipAudit(path: string, method: string): boolean {
  const skipPaths = [
    '/health',
    '/api/health',
    '/metrics'
  ];
  
  const skipMethods = method === 'GET' && !path.includes('/audit');
  
  return skipPaths.some(skipPath => path.includes(skipPath)) || skipMethods;
}

function detectComplianceFlags(req: Request, res: Response): string[] {
  const flags: string[] = [];
  
  // HIPAA: Check for patient data access
  if (req.path.includes('/items') && req.body?.patientId) {
    flags.push('HIPAA_PATIENT_DATA');
  }
  
  // GDPR: Check for personal data processing
  if (req.path.includes('/users') && req.method !== 'GET') {
    flags.push('GDPR_PERSONAL_DATA');
  }
  
  // Failed authentication
  if (res.statusCode === 401 || res.statusCode === 403) {
    flags.push('SECURITY_VIOLATION');
  }
  
  // Critical operations
  if (req.path.includes('/custody') || req.path.includes('/signature')) {
    flags.push('CRITICAL_OPERATION');
  }
  
  return flags;
}