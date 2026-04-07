import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.SMTP_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.FROM_EMAIL || `"PharmaDesk" <${SMTP_USER || 'support@pharmadesk.com'}>`;

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS
    ? {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    : undefined
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️  Email service not configured:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate verification token
export function generateToken() {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
}

// Send verification email for signup
export async function sendVerificationEmail(email, otp) {
  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: 'Verify Your PharmaDesk Account',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1565C0, #00BFA5); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">PharmaDesk</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Pharmacy Management System</p>
        </div>
        <div style="background: #f5f7fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1a202c; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #64748b;">Use this verification code to complete your registration:</p>
          <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1565C0;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, token, otp) {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: 'Reset Your PharmaDesk Password',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1565C0, #00BFA5); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">PharmaDesk</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset Request</p>
        </div>
        <div style="background: #f5f7fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1a202c; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #64748b;">Use this OTP code to reset your password:</p>
          <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1565C0;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 15 minutes.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">If you didn't request this password reset, please ignore this email or contact support if you're concerned.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send email change verification
export async function sendEmailChangeOTP(newEmail, otp) {
  const mailOptions = {
    from: SMTP_FROM,
    to: newEmail,
    subject: 'Verify Your New Email Address',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1565C0, #00BFA5); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">PharmaDesk</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email Change Request</p>
        </div>
        <div style="background: #f5f7fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1a202c; margin-top: 0;">Verify New Email</h2>
          <p style="color: #64748b;">Use this code to verify your new email address:</p>
          <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1565C0;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send invoice/receipt email
export async function sendInvoiceEmail(email, invoice) {
  const items = invoice.items || [];
  const itemsHtml = items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px; text-align: center;">${idx + 1}</td>
      <td style="padding: 12px;">${item.medicine_name}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">Rs. ${parseFloat(item.unit_price).toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; font-weight: 600;">Rs. ${parseFloat(item.total_price).toFixed(2)}</td>
    </tr>
  `).join('');

  const saleDate = new Date(invoice.sale_date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: `Your Receipt - Invoice #${invoice.invoice_number}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1565C0, #1976D2); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">PharmaDesk</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Your Trusted Pharmacy Partner</p>
        </div>

        <!-- Invoice Badge -->
        <div style="text-align: center; margin-top: -20px;">
          <span style="background: #00BFA5; color: white; padding: 10px 25px; border-radius: 20px; font-weight: 600; display: inline-block;">
            RECEIPT
          </span>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <!-- Invoice Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div>
              <p style="color: #64748b; margin: 0; font-size: 12px;">Invoice Number</p>
              <p style="color: #1565C0; margin: 4px 0 0; font-weight: 600; font-size: 16px;">${invoice.invoice_number}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #64748b; margin: 0; font-size: 12px;">Date</p>
              <p style="color: #1a202c; margin: 4px 0 0; font-size: 14px;">${saleDate}</p>
            </div>
          </div>

          <!-- Customer Info -->
          <div style="background: white; border-left: 4px solid #1565C0; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
            <p style="color: #64748b; margin: 0; font-size: 12px;">BILLED TO</p>
            <p style="color: #1a202c; margin: 8px 0 0; font-weight: 600; font-size: 16px;">${invoice.patient_name || 'Walk-in Customer'}</p>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
            <thead>
              <tr style="background: #1565C0; color: white;">
                <th style="padding: 12px; text-align: center; width: 50px;">#</th>
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center; width: 60px;">Qty</th>
                <th style="padding: 12px; text-align: right; width: 100px;">Price</th>
                <th style="padding: 12px; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #94a3b8;">No items</td></tr>'}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #00BFA5;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; padding: 5px 0;">Subtotal</td>
                <td style="text-align: right; color: #1a202c;">Rs. ${parseFloat(invoice.subtotal || invoice.total_amount).toFixed(2)}</td>
              </tr>
              ${invoice.discount_amount > 0 ? `
              <tr>
                <td style="color: #64748b; padding: 5px 0;">Discount</td>
                <td style="text-align: right; color: #00BFA5;">-Rs. ${parseFloat(invoice.discount_amount).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #1565C0;">
                <td style="color: #1565C0; font-weight: bold; font-size: 18px; padding-top: 15px;">TOTAL</td>
                <td style="text-align: right; color: #1565C0; font-weight: bold; font-size: 18px; padding-top: 15px;">Rs. ${parseFloat(invoice.total_amount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Status -->
          <div style="text-align: center; margin-top: 25px;">
            <span style="background: ${invoice.payment_status === 'Paid' ? '#10B981' : '#F59E0B'}; color: white; padding: 8px 20px; border-radius: 15px; font-size: 14px; font-weight: 600;">
              ${invoice.payment_status === 'Paid' ? '✓ PAID' : 'PENDING'} via ${invoice.payment_method || 'Cash'}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1565C0; padding: 25px; text-align: center;">
          <p style="color: white; margin: 0; font-weight: 600;">Thank you for your purchase!</p>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 12px;">
            This is a computer generated receipt. For any queries, contact us at ${SMTP_USER || 'support@pharmadesk.com'}
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Invoice email send error:', error);
    return false;
  }
}

export default transporter;
