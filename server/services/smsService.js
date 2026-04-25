const axios = require('axios');

async function sendLoginCodeSms(phone, code) {
  const apiId = process.env.SMS_RU_API_ID;
  const message = `GlorionPC: kod vhoda ${code}. Nikomu ne soobshchayte etot kod.`;

  if (!apiId) {
    console.log(`GlorionPC customer login code for ${phone}: ${code}`);
    console.log('SMS_RU_API_ID is not set, SMS was not sent.');
    return { provider: 'console' };
  }

  const response = await axios.get('https://sms.ru/sms/send', {
    params: {
      api_id: apiId,
      to: phone,
      msg: message,
      json: 1
    },
    timeout: 10000
  });

  const data = response.data;
  const phoneStatus = data?.sms?.[phone]?.status;

  if (data?.status !== 'OK' || (phoneStatus && phoneStatus !== 'OK')) {
    throw new Error(data?.status_text || data?.sms?.[phone]?.status_text || 'SMS sending failed');
  }

  return { provider: 'sms.ru' };
}

module.exports = {
  sendLoginCodeSms
};
