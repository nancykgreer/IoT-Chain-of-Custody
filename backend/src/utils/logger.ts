import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    const logEntry: any = {
      timestamp,
      level,
      message
    };
    if (stack) logEntry.stack = stack;
    if (Object.keys(meta).length > 0) logEntry.meta = meta;
    return JSON.stringify(logEntry);
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'chain-custody-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Audit-specific logger for compliance
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'audit-trail' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      maxsize: 52428800, // 50MB for audit logs
      maxFiles: 50 // Keep more audit logs for compliance
    })
  ]
});