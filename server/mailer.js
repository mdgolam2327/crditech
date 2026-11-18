/**
 * CRDITEACH - EMAIL NOTIFICATION & DISPATCH SERVICE
 * Supports real SMTP delivery (Gmail, Resend, SendGrid, custom SMTP)
 * with graceful fallback to console simulation when credentials are omitted.
 */

import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass }
    });
  }

  // Convenience for Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  return null;
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'no-reply@crditeach.com';

  if (!transporter) {
    console.log(`ℹ️ [MAILER] No SMTP configured in .env. Logged email for <${to}>: "${subject}"`);
    return { sent: false, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Crditeach Platform" <${from}>`,
      to,
      subject,
      text: text || '',
      html: html || text
    });
    console.log(`✅ [MAILER] Real email dispatched to ${to} (Message ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [MAILER] Failed to dispatch email to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

export async function sendOtpEmail(email, code) {
  const subject = `Your Crditeach Verification Code: ${code}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <h2 style="color: #38bdf8; margin-top: 0;">Crditeach Verification</h2>
      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">Here is your One-Time Password (OTP) to verify your account or complete your sign in:</p>
      <div style="background: rgba(56, 189, 248, 0.12); border: 1px dashed #38bdf8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html, text: `Your Crditeach Verification Code is: ${code}` });
}

export async function sendReportNotificationEmail(reportData) {
  const destination = process.env.REPORT_NOTIFICATION_EMAIL || 'mdgolamsubhani2327@gmail.com';
  const subject = `🚨 [CRDITEACH REPORT] ${String(reportData.targetType).toUpperCase()}: ${reportData.targetTitle || 'Untitled'}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.4);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="font-size: 24px;">🚨</span>
        <h2 style="color: #ef4444; margin: 0;">New User Violation Report</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
        <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;">Report ID:</td><td style="font-weight: 600;">${reportData.reportId}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Target Type:</td><td style="text-transform: uppercase; font-weight: 700; color: #38bdf8;">${reportData.targetType}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Target Title:</td><td style="font-weight: 600;">${reportData.targetTitle || 'Untitled'} (${reportData.targetId})</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Violation Category:</td><td style="color: #fca5a5; font-weight: 700;">${reportData.category}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Reporter:</td><td>${reportData.reporterEmail || 'Anonymous'} ${reportData.reporterUserId ? `(ID: ${reportData.reporterUserId})` : ''}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Timestamp:</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <div style="margin-top: 20px; padding: 14px; background: rgba(255,255,255,0.05); border-left: 4px solid #ef4444; border-radius: 4px;">
        <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">Report Details:</div>
        <div style="font-size: 14px; line-height: 1.5; color: #f8fafc; white-space: pre-wrap;">${reportData.details}</div>
      </div>
    </div>
  `;
  return sendEmail({
    to: destination,
    subject,
    html,
    text: `Violation Report:\nTarget: ${reportData.targetTitle} (${reportData.targetId})\nCategory: ${reportData.category}\nDetails: ${reportData.details}`
  });
}
