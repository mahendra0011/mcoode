/**
 * Mailer — Brevo (formerly Sendinblue) HTTP API for transactional emails.
 * Falls back to console logging when no API key is configured.
 */

let brevoKey = null;
let fromEmail = 'noreply@mcode.dev';
let fromName = 'mcode';

export function configureMailer({ apiKey, from, name }) {
  brevoKey = apiKey || null;
  if (from) fromEmail = from;
  if (name) fromName = name;
}

export function isMailEnabled() {
  return brevoKey !== null;
}

export async function sendMail({ to, subject, text, html }) {
  if (!brevoKey) {
    console.log(`[mail:disabled] to=${to} subject="${subject}" (set BREVO_API_KEY to enable)`);
    return { delivered: false };
  }

  try {
    const body = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text || undefined,
      htmlContent: html || `<p>${text}</p>`,
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[mail:brevo]', res.status, err?.message || JSON.stringify(err));
      return { delivered: false, error: err?.message || `HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { delivered: true, messageId: data.messageId };
  } catch (err) {
    console.error('[mail:error]', err.message);
    return { delivered: false, error: err.message };
  }
}
