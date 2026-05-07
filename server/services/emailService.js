const axios = require('axios');
const nodemailer = require('nodemailer');

function getSender() {
  return {
    email: process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL,
    name: process.env.EMAIL_FROM_NAME || 'GlorionPC'
  };
}

function buildLoginCodeMessage(code) {
  return {
    subject: 'Код входа в личный кабинет GlorionPC',
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>Код входа в GlorionPC</h2>
        <p>Ваш одноразовый код:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>Код действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.</p>
      </div>
    `,
    text: `Код входа в GlorionPC: ${code}. Код действует 10 минут.`
  };
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function hasAnySmtpEnv() {
  return Boolean(
    process.env.SMTP_HOST ||
    process.env.SMTP_PORT ||
    process.env.SMTP_USER ||
    process.env.SMTP_PASS
  );
}

function getEmailProviderDiagnostics() {
  const sender = getSender();

  let selectedProvider = 'console';

  if (process.env.RESEND_API_KEY) {
    selectedProvider = 'resend';
  } else if (hasSmtpConfig()) {
    selectedProvider = 'smtp';
  } else if (process.env.BREVO_API_KEY && sender.email) {
    selectedProvider = 'brevo-api';
  } else if (hasAnySmtpEnv()) {
    selectedProvider = 'smtp-incomplete';
  }

  return {
    selectedProvider,
    env: {
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
      EMAIL_FROM: sender.email || null,
      EMAIL_FROM_NAME: sender.name || null,
      SMTP_HOST: Boolean(process.env.SMTP_HOST),
      SMTP_PORT: Boolean(process.env.SMTP_PORT),
      SMTP_USER: Boolean(process.env.SMTP_USER),
      SMTP_PASS: Boolean(process.env.SMTP_PASS),
      SMTP_SECURE: process.env.SMTP_SECURE ?? null
    }
  };
}

async function sendViaSmtp(email, code) {
  const sender = getSender();

  if (!sender.email) {
    throw new Error('EMAIL_FROM is not configured');
  }

  const message = buildLoginCodeMessage(code);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text
  });

  return { provider: 'smtp' };
}

async function sendViaResend(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = getSender();

  if (!apiKey || !sender.email) {
    throw new Error('RESEND_API_KEY or EMAIL_FROM is not configured');
  }

  const message = buildLoginCodeMessage(code);

  await axios.post(
    'https://api.resend.com/emails',
    {
      from: `${sender.name} <${sender.email}>`,
      to: [email],
      subject: message.subject,
      html: message.html,
      text: message.text
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { provider: 'resend' };
}

async function sendViaBrevoApi(email, code) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = getSender();

  if (!apiKey || !sender.email) {
    console.log(`[GlorionPC] Email login code for ${email}: ${code}`);
    return { provider: 'console' };
  }

  const message = buildLoginCodeMessage(code);

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: sender.name,
        email: sender.email
      },
      to: [{ email }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  );

  return { provider: 'brevo-api' };
}

async function sendLoginCodeEmail(email, code) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(email, code);
  }

  if (hasSmtpConfig()) {
    return sendViaSmtp(email, code);
  }

  if (hasAnySmtpEnv()) {
    throw new Error('SMTP config is incomplete. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  return sendViaBrevoApi(email, code);
}

module.exports = {
  sendLoginCodeEmail,
  getEmailProviderDiagnostics
};
