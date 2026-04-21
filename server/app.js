const express = require('express');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const prisma = require(path.join(__dirname, 'prisma.js'));

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const customPcRequestsRoutes = require('./routes/customPcRequests');

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

/* =========================
   SESSION
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'glorion-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false
    }
  })
);

/* =========================
   HELPERS
========================= */
function extractAvitoItems(payload) {
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.resources)) return payload.data.resources;
  if (payload.result && Array.isArray(payload.result.items)) return payload.result.items;
  if (payload.result && Array.isArray(payload.result.resources)) return payload.result.resources;

  return [];
}

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
  const candidates = [
    extractAvitoValue(payload, ['price']),
    extractAvitoValue(payload, ['item.price']),
    extractAvitoValue(payload, ['data.price']),
    extractAvitoValue(payload, ['result.price']),
    extractAvitoValue(payload, ['price_string']),
    extractAvitoValue(payload, ['item.price_string']),
    extractAvitoValue(payload, ['data.price_string']),
    extractAvitoValue(payload, ['result.price_string']),
    extractAvitoValue(payload, ['priceDetailed.value']),
    extractAvitoValue(payload, ['item.priceDetailed.value']),
    extractAvitoValue(payload, ['data.priceDetailed.value']),
    extractAvitoValue(payload, ['result.priceDetailed.value']),
    extractAvitoValue(payload, ['priceInfo.price']),
    extractAvitoValue(payload, ['item.priceInfo.price']),
    extractAvitoValue(payload, ['price_info.price']),
    extractAvitoValue(payload, ['item.price_info.price'])
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;

    const numeric = Number(String(candidate).replace(/[^\d.]/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

function normalizeAvitoUrl(value) {
  if (!value) return '';

  const url = String(value).trim();
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `https://www.avito.ru${url}`;
  }

  return `https://www.avito.ru/${url.replace(/^\/+/, '')}`;
}

function getAvitoItemStatus(item) {
  return (
    extractAvitoValue(item, ['status']) ||
    extractAvitoValue(item, ['state']) ||
    extractAvitoValue(item, ['item.status']) ||
    null
  );
}

function getAvitoItemUrl(item) {
  return normalizeAvitoUrl(
    extractAvitoValue(item, [
      'url',
      'item.url',
      'data.url',
      'result.url'
    ])
  );
}

function getAvitoItemCategory(item) {
  return (
    extractAvitoValue(item, [
      'category.name',
      'item.category.name',
      'data.category.name',
      'result.category.name'
    ]) ||
    extractAvitoValue(item, [
      'category',
      'item.category',
      'data.category',
      'result.category'
    ]) ||
    ''
  );
}

function getAvitoItemTitle(item) {
  return extractAvitoValue(item, [
    'title',
    'name',
    'subject',
    'item.title',
    'item.name',
    'data.title',
    'result.title'
  ]) || '';
}

/* =========================
   TOKEN HELPERS
========================= */
async function saveAvitoTokens(data) {
  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000)
    : null;

  await prisma.integrationToken.upsert({
    where: { provider: 'avito' },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      tokenType: data.token_type || 'Bearer',
      expiresAt
    },
    create: {
      provider: 'avito',
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      tokenType: data.token_type || 'Bearer',
      expiresAt
    }
  });
}

async function getStoredAvitoTokenRow() {
  return prisma.integrationToken.findUnique({
    where: { provider: 'avito' }
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

  await saveAvitoTokens(response.data);
  return response.data.access_token;
}

async function getValidAvitoAccessToken() {
  const tokenRow = await getStoredAvitoTokenRow();

  if (!tokenRow) {
    throw new Error('Токен Авито не найден. Сначала открой /api/auth/avito/start и /api/auth/avito/token');
  }

  const now = Date.now();
  const safeBufferMs = 60 * 1000;

  if (
    tokenRow.accessToken &&
    tokenRow.expiresAt &&
    tokenRow.expiresAt.getTime() > now + safeBufferMs
  ) {
    return tokenRow.accessToken;
  }

  if (!tokenRow.refreshToken) {
    throw new Error('Нет refresh_token Авито. Снова пройди авторизацию.');
  }

  return refreshAvitoAccessToken(tokenRow.refreshToken);
}

/* =========================
   AVITO API HELPERS
========================= */
async function fetchAvitoItems(accessToken) {
  const response = await axios.get('https://api.avito.ru/core/v1/items', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

async function fetchAvitoItemDetail(accessToken, itemId) {
  const userId = process.env.AVITO_USER_ID;

  if (!userId) {
    throw new Error('Не заполнен AVITO_USER_ID в .env');
  }

  const url = `https://api.avito.ru/core/v1/accounts/${encodeURIComponent(
    userId
  )}/items/${encodeURIComponent(itemId)}/`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

/* =========================
   BASE API ROUTES
========================= */
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/custom-pc-requests', customPcRequestsRoutes);

/* =========================
   AVITO OAUTH
========================= */
app.get('/api/auth/avito/start', (req, res) => {
  const clientId = process.env.AVITO_CLIENT_ID;
  const redirectUri = process.env.AVITO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      message: 'Не заполнены AVITO_CLIENT_ID или AVITO_REDIRECT_URI в .env'
    });
  }

  const state = Math.random().toString(36).slice(2);
  req.session.avitoOAuthState = state;

  const authUrl =
    `https://www.avito.ru/oauth?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('items:info')}` +
    `&state=${encodeURIComponent(state)}`;

  return res.redirect(authUrl);
});

app.get('/api/auth/avito/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`
      <h1>Ошибка авторизации Авито</h1>
      <p>${error}</p>
      <p>${error_description || ''}</p>
      <p><a href="/admin">Вернуться в админку</a></p>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <h1>Код авторизации не получен</h1>
      <p>Авито не вернул параметр code.</p>
      <p><a href="/admin">Вернуться в админку</a></p>
    `);
  }

  if (!state || state !== req.session.avitoOAuthState) {
    return res.status(400).send(`
      <h1>Неверный state</h1>
      <p>Проверка безопасности не пройдена.</p>
      <p><a href="/admin">Вернуться в админку</a></p>
    `);
  }

  req.session.avitoAuthCode = code;
  delete req.session.avitoOAuthState;

  return res.send(`
    <h1>Авторизация Авито прошла успешно</h1>
    <p>Код получен и сохранён в сессии.</p>
    <p>Теперь нажми ссылку ниже один раз, чтобы сохранить токен в базу:</p>
    <p><a href="/api/auth/avito/token">Получить и сохранить access_token</a></p>
    <p><a href="/admin">Вернуться в админку</a></p>
  `);
});

app.get('/api/auth/avito/token', async (req, res) => {
  const code = req.session.avitoAuthCode;

  if (!code) {
    return res.status(400).json({
      message: 'Нет кода авторизации. Сначала открой /api/auth/avito/start'
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', process.env.AVITO_CLIENT_ID);
    params.append('client_secret', process.env.AVITO_CLIENT_SECRET);
    params.append('redirect_uri', process.env.AVITO_REDIRECT_URI);

    const response = await axios.post('https://api.avito.ru/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;

    await saveAvitoTokens(data);
    req.session.avitoAuthCode = null;

    return res.json({
      message: 'Токен получен и сохранён успешно',
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      token_type: data.token_type || 'Bearer',
      expires_in: data.expires_in || null
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Ошибка получения access_token',
      error: error.response?.data || error.message
    });
  }
});

/* =========================
   AVITO ITEMS
========================= */
app.get('/api/auth/avito/items', async (req, res) => {
  try {
    const accessToken = await getValidAvitoAccessToken();
    const data = await fetchAvitoItems(accessToken);

    console.log('AVITO ITEMS DATA:', JSON.stringify(data, null, 2));

    return res.json({
      message: 'Объявления получены успешно',
      data
    });
  } catch (error) {
    console.error('Ошибка получения объявлений Авито:', error.response?.data || error.message);

    return res.status(500).json({
      message: 'Ошибка получения объявлений',
      error: error.response?.data || error.message
    });
  }
});

app.get('/api/auth/avito/item/:itemId', async (req, res) => {
  try {
    const accessToken = await getValidAvitoAccessToken();
    const itemId = req.params.itemId;

    const detail = await fetchAvitoItemDetail(accessToken, itemId);

    console.log('AVITO ITEM DATA:', JSON.stringify(detail, null, 2));

    return res.json({
      message: 'Детали объявления получены успешно',
      data: detail
    });
  } catch (error) {
    console.error('Ошибка получения деталей объявления Авито:', error.response?.data || error.message);

    return res.status(500).json({
      message: 'Ошибка получения деталей объявления Авито',
      error: error.response?.data || error.message
    });
  }
});

/* =========================
   AVITO AUTO-FILL PRODUCT
========================= */
app.post('/api/avito/fill-product-by-item-id', async (req, res) => {
  try {
    const { itemId } = req.body || {};

    if (!itemId || !String(itemId).trim()) {
      return res.status(400).json({
        message: 'Не указан Avito Item ID'
      });
    }

    const accessToken = await getValidAvitoAccessToken();
    const normalizedItemId = String(itemId).trim();

    const itemsData = await fetchAvitoItems(accessToken);
    console.log('AVITO ITEMS DATA:', JSON.stringify(itemsData, null, 2));

    const avitoItems = extractAvitoItems(itemsData);

    const matchedItem = avitoItems.find(
      (item) =>
        String(item.id || item.item_id || item.ad_id || '') === normalizedItemId
    );

    if (!matchedItem) {
      return res.status(404).json({
        message: 'Объявление с таким Avito Item ID не найдено'
      });
    }

    const title = getAvitoItemTitle(matchedItem);
    const price = extractAvitoPrice(matchedItem);
    const category = getAvitoItemCategory(matchedItem);

    return res.json({
      ok: true,
      usefulFieldsCount: [title, price, category].filter(
        (value) => value !== null && value !== undefined && value !== ''
      ).length,
      product: {
        name: title,
        price: price ?? '',
        category: category || 'ПК'
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

/* =========================
   AVITO SYNC PRODUCTS
========================= */
app.post('/api/auth/avito/sync-products', async (req, res) => {
  try {
    const accessToken = await getValidAvitoAccessToken();
    const avitoResponseData = await fetchAvitoItems(accessToken);

    console.log('AVITO ITEMS DATA:', JSON.stringify(avitoResponseData, null, 2));

    const avitoItems = extractAvitoItems(avitoResponseData);

    if (!avitoItems.length) {
      return res.json({
        message: 'Объявления Авито не найдены',
        updated: 0,
        notMatched: [],
        totalAvitoItems: 0
      });
    }

    const products = await prisma.product.findMany({
      where: {
        avitoItemId: {
          not: null
        }
      }
    });

    let updated = 0;
    const notMatched = [];

    for (const product of products) {
      const matched = avitoItems.find(
        (item) =>
          String(item.id || item.item_id || item.ad_id || '') === String(product.avitoItemId)
      );

      if (!matched) {
        notMatched.push({
          productId: product.id,
          name: product.name,
          avitoItemId: product.avitoItemId
        });
        continue;
      }

      const avitoPrice = extractAvitoPrice(matched);
      const avitoUrl = getAvitoItemUrl(matched);
      const avitoStatus = getAvitoItemStatus(matched);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          price: avitoPrice ?? product.price,
          avitoPrice: avitoPrice ?? product.avitoPrice,
          avitoUrl: avitoUrl || product.avitoUrl,
          avitoStatus: avitoStatus || product.avitoStatus,
          avitoLastSyncedAt: new Date(),
          syncSource: 'avito',
          inStock: avitoStatus === 'active' ? true : product.inStock
        }
      });

      updated += 1;
    }

    return res.json({
      message: 'Синхронизация завершена',
      updated,
      notMatched,
      totalAvitoItems: avitoItems.length
    });
  } catch (error) {
    console.error('Ошибка синхронизации товаров из Авито:', error.response?.data || error.message);

    return res.status(500).json({
      message: 'Ошибка синхронизации товаров из Авито',
      error: error.response?.data || error.message
    });
  }
});

/* =========================
   ADMIN ACCESS
========================= */
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }

  return res.redirect('/admin-login.html');
}

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

/* =========================
   HEALTHCHECK
========================= */
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

/* =========================
   FRONT ROUTES
========================= */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (path.extname(req.path)) return next();

  return res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});