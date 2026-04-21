const express = require('express');
const axios = require('axios');
const path = require('path');

const router = express.Router();
const prisma = require(path.join(__dirname, '../prisma.js'));

/* =========================
   TOKEN HELPERS
========================= */

async function saveAvitoTokens(tokenData) {
  const expiresIn = Number(tokenData.expires_in || 0);
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  await prisma.integrationToken.upsert({
    where: {
      provider: 'avito'
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt
    },
    create: {
      provider: 'avito',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt
    }
  });
}

async function getStoredAvitoToken() {
  return prisma.integrationToken.findUnique({
    where: {
      provider: 'avito'
    }
  });
}

async function refreshAvitoAccessToken(refreshToken) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', process.env.AVITO_CLIENT_ID);
  params.append('client_secret', process.env.AVITO_CLIENT_SECRET);

  const response = await axios.post('https://api.avito.ru/token', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const tokenData = response.data;
  await saveAvitoTokens(tokenData);

  return tokenData.access_token;
}

async function getValidAvitoAccessToken() {
  const storedToken = await getStoredAvitoToken();

  if (!storedToken) {
    throw new Error('Сначала авторизуйся в Авито');
  }

  const now = new Date();

  if (
    storedToken.accessToken &&
    storedToken.expiresAt &&
    new Date(storedToken.expiresAt) > new Date(now.getTime() + 60 * 1000)
  ) {
    return storedToken.accessToken;
  }

  if (storedToken.refreshToken) {
    return refreshAvitoAccessToken(storedToken.refreshToken);
  }

  throw new Error('Не найден refresh token. Нужно заново авторизоваться в Авито');
}

/* =========================
   AVITO DATA HELPERS
========================= */

function extractAvitoValue(obj, paths = []) {
  for (const pathKey of paths) {
    const parts = pathKey.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (current !== undefined && current !== null && current !== '') {
      return current;
    }
  }

  return null;
}

function extractAvitoPrice(payload) {
  const price = extractAvitoValue(payload, [
    'price',
    'item.price',
    'data.price',
    'result.price',
    'item.priceInfo.price',
    'priceInfo.price',
    'item.price_info.price',
    'price_info.price'
  ]);

  const num = Number(price);
  return Number.isFinite(num) ? num : null;
}

function extractSpecsFromText(text) {
  const source = String(text || '');

  const cpuMatch = source.match(/(?:cpu|процессор)\s*[:\-]\s*(.+)/i);
  const gpuMatch = source.match(/(?:gpu|видеокарта|видео)\s*[:\-]\s*(.+)/i);
  const ramMatch = source.match(/(?:ram|озу|оперативная память)\s*[:\-]\s*(.+)/i);
  const ssdMatch = source.match(/(?:ssd|накопитель)\s*[:\-]\s*(.+)/i);

  return {
    cpu: cpuMatch ? cpuMatch[1].trim() : '',
    gpu: gpuMatch ? gpuMatch[1].trim() : '',
    ram: ramMatch ? ramMatch[1].trim() : '',
    ssd: ssdMatch ? ssdMatch[1].trim() : ''
  };
}

async function fetchAvitoItemDetail(itemId) {
  const accessToken = await getValidAvitoAccessToken();

  if (!process.env.AVITO_USER_ID) {
    throw new Error('В .env не указан AVITO_USER_ID');
  }

  const response = await axios.get(
    `https://api.avito.ru/core/v1/accounts/${process.env.AVITO_USER_ID}/items/${itemId}/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  return response.data;
}

/* =========================
   ROUTES
========================= */

router.post('/fill-product-by-item-id', async (req, res) => {
  try {
    const { itemId } = req.body || {};

    if (!itemId || !String(itemId).trim()) {
      return res.status(400).json({
        message: 'Не указан Avito Item ID'
      });
    }

    const itemData = await fetchAvitoItemDetail(String(itemId).trim());

    const title = extractAvitoValue(itemData, [
      'title',
      'name',
      'item.title',
      'item.name',
      'data.title',
      'result.title'
    ]);

    const description = extractAvitoValue(itemData, [
      'description',
      'item.description',
      'data.description',
      'result.description'
    ]);

    const avitoUrl = extractAvitoValue(itemData, [
      'url',
      'item.url',
      'data.url',
      'result.url'
    ]);

    const category = extractAvitoValue(itemData, [
      'category.name',
      'category',
      'item.category.name',
      'item.category',
      'data.category.name',
      'result.category.name'
    ]);

    const status = extractAvitoValue(itemData, [
      'status',
      'item.status',
      'data.status',
      'result.status'
    ]);

    const price = extractAvitoPrice(itemData);
    const parsedSpecs = extractSpecsFromText(description);

    return res.json({
      ok: true,
      rawStatus: status,
      product: {
        name: title || '',
        description: description || '',
        price: price ?? '',
        avitoUrl: avitoUrl || '',
        category: category || 'ПК',
        cpu: parsedSpecs.cpu || '',
        gpu: parsedSpecs.gpu || '',
        ram: parsedSpecs.ram || '',
        ssd: parsedSpecs.ssd || ''
      }
    });
  } catch (error) {
    console.error(
      'Ошибка авто-заполнения по Avito ID:',
      error.response?.data || error.message
    );

    return res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        'Не удалось получить данные объявления из Авито'
    });
  }
});

module.exports = router;