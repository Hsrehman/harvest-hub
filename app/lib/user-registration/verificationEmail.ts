import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

interface VerificationEmailParams {
  email: string;
  userId: string;
}

export async function sendVerificationEmail({ email, userId }: VerificationEmailParams) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM, // e.g., "Harvest Hub <no-reply@localhost>"
    to: email,
    subject: 'Verify Your Email Address',
    text: `Please verify your email by clicking this link: ${verificationUrl}. This link expires in 1 hour.`,
    html: `<p>Please verify your email by clicking <a href="${verificationUrl}">here</a>. This link expires in 1 hour.</p>`,
  });

  return info; // Optional: return for logging/debugging
}