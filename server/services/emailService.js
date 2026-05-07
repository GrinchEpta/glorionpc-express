const axios = require('axios');

async function sendLoginCodeEmail(email, code) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.EMAIL_FROM_NAME || 'GlorionPC';

  if (!apiKey || !senderEmail) {
    console.log(`[GlorionPC] Email login code for ${email}: ${code}`);
    return { provider: 'console' };
  }

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [{ email }],
      subject: 'Код входа в личный кабинет GlorionPC',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
          <h2>Код входа в GlorionPC</h2>
          <p>Ваш одноразовый код:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
          <p>Код действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.</p>
        </div>
      `,
      textContent: `Код входа в GlorionPC: ${code}. Код действует 10 минут.`
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  );

  return { provider: 'brevo' };
}

module.exports = {
  sendLoginCodeEmail
};
