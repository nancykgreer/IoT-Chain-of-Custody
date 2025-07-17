export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api',
  appName: 'Healthcare Chain of Custody',
  features: {
    enableBlockchain: true,
    enableBarcodeScan: true,
    enableAuditLogs: true,
    enableTokenRewards: true
  },
  security: {
    jwtTokenKey: 'chain_custody_token',
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    enableCSRF: true,
    enableXSSProtection: true
  },
  compliance: {
    enableHIPAA: true,
    enableGDPR: true,
    dataRetentionDays: 2555, // 7 years
    auditLogRetentionDays: 3650 // 10 years
  }
};