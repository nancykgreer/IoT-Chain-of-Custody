import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply auth rate limiting to all auth routes
router.use(authRateLimiter);

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedAt && user.lockedAt > new Date(Date.now() - 15 * 60 * 1000)) {
      return res.status(401).json({ 
        error: 'Account temporarily locked due to failed login attempts' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockedAt: user.failedLoginAttempts >= 4 ? new Date() : null
        }
      });

      logger.warn('Failed login attempt:', {
        email,
        ip: req.ip,
        attempts: updatedUser.failedLoginAttempts
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedAt: null,
        lastLoginAt: new Date()
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    logger.info('Successful login:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register (admin only in production)
router.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      organizationId,
      licenseNumber
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role || !organizationId) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(400).json({ error: 'Invalid organization' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        organizationId,
        licenseNumber,
        consentGiven: true,
        consentDate: new Date()
      },
      include: { organization: true }
    });

    logger.info('New user registered:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout (token blacklisting would be implemented here)
router.post('/logout', (req, res) => {
  // In a production system, you would blacklist the JWT token
  res.json({ success: true, message: 'Logged out successfully' });
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true, role: true, organizationId: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({ success: true, token: newToken });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(error);
  }
});

export { router as authRoutes };