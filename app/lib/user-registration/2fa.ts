import speakeasy from 'speakeasy';
import qrCode from 'qrcode'; // Optional for QR code generation
import { RedisClientType } from 'redis';

export interface TwoFactorSecret {
  base32: string;
  otpauthUrl: string;
}

export async function generate2FASecret(userId: string, redis: RedisClientType): Promise<TwoFactorSecret> {
  const secret = speakeasy.generateSecret({
    name: `HarvestHub:${userId}`,
  });
  await redis.setEx(`2fa:${userId}`, 24 * 60 * 60, secret.base32); // 24-hour expiry
  return secret;
}

export async function verify2FAToken(userId: string, token: string, redis: RedisClientType): Promise<boolean> {
  const secret = await redis.get(`2fa:${userId}`);
  if (!secret) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
  });
}

export async function generate2FAQrCode(otpauthUrl: string): Promise<string> {
  return qrCode.toDataURL(otpauthUrl);
}