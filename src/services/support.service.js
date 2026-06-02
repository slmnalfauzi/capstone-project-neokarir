const nodemailer = require('nodemailer');
const env = require('../config/env');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');

const sendContactSupport = async (contactData) => {
  const { name, email, category, message } = contactData;

  // Validate environment variables
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.error('SMTP configuration is missing in .env file');
    throw new AppError(ERROR_CODES.SERVER_ERROR || 'SERVER_ERROR', 'Konfigurasi email server belum diatur.', 500);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT) || 587,
    secure: parseInt(env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
  } catch (error) {
    console.error('SMTP Connection error:', error);
    throw new AppError(ERROR_CODES.SERVER_ERROR || 'SERVER_ERROR', 'Gagal terhubung ke server email.', 500);
  }

  // Email to Admin (mfuture561@gmail.com)
  const mailToAdmin = {
    from: `"NeoKarir Support" <${env.SMTP_USER}>`,
    to: 'mfuture561@gmail.com',
    subject: `[Support Request] ${category} - ${name}`,
    html: `
      <h3>Permintaan Dukungan Baru</h3>
      <p><strong>Nama:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Kategori:</strong> ${category}</p>
      <hr />
      <p><strong>Pesan:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  };

  // Auto-reply to User
  const mailToUser = {
    from: `"NeoKarir Support" <${env.SMTP_USER}>`,
    to: email,
    subject: `Terima kasih telah menghubungi Dukungan NeoKarir`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h3>Halo ${name},</h3>
        <p>Terima kasih telah menghubungi layanan dukungan NeoKarir. Pesan Anda terkait kategori "<strong>${category}</strong>" telah kami terima dan sedang dalam antrean untuk ditinjau oleh tim kami.</p>
        <p>Kami akan menindaklanjuti pesan Anda dalam kurun waktu maksimal 1x24 jam kerja.</p>
        <hr style="border: 1px solid #eaeaea; my: 20px;" />
        <p><strong>Salinan Pesan Anda:</strong></p>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">${message.replace(/\n/g, '<br>')}</p>
        <br />
        <p>Salam hangat,<br><strong>Tim Dukungan NeoKarir</strong></p>
      </div>
    `,
  };

  try {
    // Send both emails
    await Promise.all([
      transporter.sendMail(mailToAdmin),
      transporter.sendMail(mailToUser)
    ]);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new AppError(ERROR_CODES.SERVER_ERROR || 'SERVER_ERROR', 'Gagal mengirim pesan dukungan.', 500);
  }
};

module.exports = {
  sendContactSupport,
};
