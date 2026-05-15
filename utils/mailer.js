/**
 * SMTP mailer utility.
 *
 *   const { sendMail } = require('./utils/mailer');
 *   await sendMail({ to, subject, html, text, bcc });
 *
 * Reads SMTP config from env (SMTP_HOST/PORT/USER/PASS/FROM). If the
 * config isn't present, sendMail() resolves with `{ skipped: true }` and
 * logs a single warning per process — so dev environments work without
 * any SMTP setup.
 */
const nodemailer = require('nodemailer');

let cachedTransporter = null;
let warned = false;

function getTransporter() {
    if (cachedTransporter) return cachedTransporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT) {
        if (!warned) {
            console.warn('[mailer] SMTP_HOST/SMTP_PORT not set — mailer is a no-op. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env to enable email delivery.');
            warned = true;
        }
        return null;
    }
    cachedTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        // STARTTLS by default; flip via SMTP_SECURE=true for implicit TLS.
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(SMTP_PORT) === 465,
        auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });
    return cachedTransporter;
}

async function sendMail({ to, bcc, subject, html, text, from }) {
    const t = getTransporter();
    if (!t) return { skipped: true, reason: 'SMTP not configured' };

    const fromAddr = from || process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await t.sendMail({ from: fromAddr, to, bcc, subject, html, text });
    return { skipped: false, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

/**
 * Verify SMTP config is reachable — useful for a future health endpoint.
 */
async function verify() {
    const t = getTransporter();
    if (!t) return { ok: false, reason: 'SMTP not configured' };
    try {
        await t.verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

module.exports = { sendMail, verify };
