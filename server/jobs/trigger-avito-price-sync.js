require('dotenv').config();
const axios = require('axios');

async function main() {
  const appBaseUrl = process.env.APP_BASE_URL;
  const secret = process.env.AVITO_SYNC_CRON_SECRET;

  if (!appBaseUrl) {
    throw new Error('Не заполнен APP_BASE_URL в .env');
  }

  if (!secret) {
    throw new Error('Не заполнен AVITO_SYNC_CRON_SECRET в .env');
  }

  const url = `${appBaseUrl.replace(/\/$/, '')}/api/internal/avito/sync-prices`;

  const response = await axios.post(
    url,
    {},
    {
      headers: {
        'x-cron-secret': secret
      },
      timeout: 60000
    }
  );

  console.log('Автосинхронизация цен Авито завершена:', response.data);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      'Ошибка автосинхронизации цен Авито:',
      error.response?.data || error.message
    );
    process.exit(1);
  });