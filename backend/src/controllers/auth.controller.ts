import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { notificationService } from '../services/notification.service';

const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign({ userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign({ userId, email, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
  return { accessToken, refreshToken };
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const verifyToken = uuidv4();

  const user = await prisma.user.create({
    data: { name, email, passwordHash, verifyToken },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await notificationService.sendVerificationEmail(email, name ?? email, verifyToken);

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  });

  res.status(201).json({ user, accessToken, refreshToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, mfaCode } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new AppError('Invalid credentials', 401);

  if (user.mfaEnabled && user.mfaSecret) {
    if (!mfaCode) {
      res.status(200).json({ requireMfa: true, message: 'MFA code required' });
      return;
    }
    const isValidMfa = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 2,
    });
    if (!isValidMfa) throw new AppError('Invalid MFA code', 401);
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
  };

  res.json({ user: safeUser, accessToken, refreshToken });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new AppError('Refresh token required', 401);

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
    userId: string; email: string; role: string;
  };

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId, decoded.email, decoded.role
  );
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({
      data: {
        userId: decoded.userId,
        token: newRefreshToken,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    }),
  ]);

  res.json({ accessToken, refreshToken: newRefreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  res.json({ message: 'Logged out successfully' });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, name: true, email: true, role: true,
      avatarUrl: true, currency: true, timezone: true,
      mfaEnabled: true, notifyEmail: true, notifyPush: true,
      isVerified: true, createdAt: true, updatedAt: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, currency, timezone, notifyEmail, notifyPush, fcmToken } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, currency, timezone, notifyEmail, notifyPush, fcmToken },
    select: {
      id: true, name: true, email: true, avatarUrl: true,
      currency: true, timezone: true, notifyEmail: true, notifyPush: true,
    },
  });

  res.json({ user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.passwordHash) throw new AppError('No password set', 400);

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError('Current password incorrect', 401);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.userId } });
  res.json({ message: 'Password changed. Please log in again.' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const resetToken = uuidv4();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });
    await notificationService.sendPasswordResetEmail(email, user.name ?? email, resetToken);
  }

  // Always respond success to prevent email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gt: new Date() },
    },
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  res.json({ message: 'Password reset successfully.' });
});

export const setupMfa = asyncHandler(async (req: Request, res: Response) => {
  const secret = speakeasy.generateSecret({
    name: `FinTrack (${req.user!.email})`,
    length: 32,
  });

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { mfaSecret: secret.base32 },
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  res.json({ secret: secret.base32, qrCode });
});

export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.mfaSecret) throw new AppError('MFA not set up', 400);

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: code,
    window: 2,
  });

  if (!isValid) throw new AppError('Invalid code', 401);

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { mfaEnabled: true },
  });

  res.json({ message: 'MFA enabled successfully' });
});

export const disableMfa = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

  if (user?.passwordHash) {
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AppError('Incorrect password', 401);
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  res.json({ message: 'MFA disabled' });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) throw new AppError('Google authentication failed', 401);

  const { accessToken, refreshToken } = generateTokens(user.userId, user.email, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId: user.userId, token: refreshToken, expiresAt },
  });

  const redirectUrl = `${env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
  res.redirect(redirectUrl);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const user = await prisma.user.findFirst({ where: { verifyToken: token } });
  if (!user) throw new AppError('Invalid verification token', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verifyToken: null },
  });

  res.json({ message: 'Email verified successfully' });
});
