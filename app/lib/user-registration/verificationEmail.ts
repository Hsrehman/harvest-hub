import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface VerificationEmailParams {
  email: string;
  userId: string;
}

export async function sendVerificationEmail({ email, userId }: VerificationEmailParams) {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_USERNAME,
      pass: process.env.BREVO_PASSWORD,
    },
  });

  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-email?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: process.env.BREVO_USERNAME || 'no-reply@yourdomain.com',
      to: email,
      subject: 'Verify Your Email Address',
      text: `Please verify your email by clicking this link: ${verificationUrl}. This link expires in 1 hour.`,
      html: `<p>Please verify your email by clicking <a href="${verificationUrl}">here</a>. This link expires in 1 hour.</p>`,
    });
    logger.info({ email, userId }, 'Verification email sent successfully');
    return info;
  } catch (error) {
    logger.error({ email, userId, error }, 'Failed to send verification email');
    throw error;
  }
}