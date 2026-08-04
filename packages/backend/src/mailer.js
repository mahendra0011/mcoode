import nodemailer from 'nodemailer';

let transporter = null;

export function configureMailer({ host, port, user, pass, from }) {
  if (!host || !user) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({ host, port: Number(port) || 587, auth: { user, pass } });
  transporter.from = from || user;
  return transporter;
}

export function isMailEnabled() {
  return transporter !== null;
}

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[mail:disabled] to=${to} subject="${subject}" (configure SMTP_* env vars to enable)`);
    return { delivered: false };
  }
  try {
    await transporter.sendMail({ from: transporter.from, to, subject, text, html });
    return { delivered: true };
  } catch (err) {
    console.error('[mail:error]', err.message);
    return { delivered: false, error: err.message };
  }
}
