const express = require('express');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const prisma = require('./prisma');

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
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.resources)) return payload.data.resources;

  return [];
}

function getAvitoItemStatus(item) {
  return item.status || item.state || item.avitoStatus || null;
}

function getAvitoItemUrl(item) {
  return item.url || item.avitoUrl || null;
}

function getAvitoItemPrice(item) {
  if (item.price !== undefined && item.price !== null && item.price !== '') {
    const numeric = Number(String(item.price).replace(/[^\d.]/g, ''));
    if (!Number.isNaN(numeric)) return numeric;
  }

  if (item.priceDetailed?.value !== undefined && item.priceDetailed?.value !== null) {
    const numeric = Number(item.priceDetailed.value);
    if (!Number.isNaN(numeric)) return numeric;
  }

  if (item.price_string) {
    const numeric = Number(String(item.price_string).replace(/[^\d.]/g, ''));
    if (!Number.isNaN(numeric)) return numeric;
  }

  return null;
}

async function saveAvitoTokens(data) {
  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000)
    : null;

  await prisma.integrationToken.upsert({
    where: { provider: 'avito' },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
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
    throw new Error('Токен Авито не найден. Сначала открой /api/auth/avito/start');
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
   API ROUTES
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
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <h1>Код авторизации не получен</h1>
      <p>Авито не вернул параметр code.</p>
    `);
  }

  if (!state || state !== req.session.avitoOAuthState) {
    return res.status(400).send(`
      <h1>Неверный state</h1>
      <p>Проверка безопасности не пройдена.</p>
    `);
  }

  req.session.avitoAuthCode = code;
  delete req.session.avitoOAuthState;

  return res.send(`
    <h1>Авторизация Авито прошла успешно</h1>
    <p>Код получен и сохранён в сессии.</p>
    <p>Теперь можно получить access_token.</p>
    <p><a href="/api/auth/avito/token">Получить access_token</a></p>
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
      message: 'Токен получен успешно',
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

app.get('/api/auth/avito/items', async (req, res) => {
  try {
    const accessToken = await getValidAvitoAccessToken();

    const response = await axios.get('https://api.avito.ru/core/v1/items', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return res.json({
      message: 'Объявления получены успешно',
      data: response.data
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Ошибка получения объявлений',
      error: error.response?.data || error.message
    });
  }
});

/* =========================
   AVITO SYNC PRODUCTS
========================= */
app.post('/api/auth/avito/sync-products', async (req, res) => {
  try {
    const accessToken = await getValidAvitoAccessToken();

    const avitoResponse = await axios.get('https://api.avito.ru/core/v1/items', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const avitoItems = extractAvitoItems(avitoResponse.data);

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
        (item) => String(item.id) === String(product.avitoItemId)
      );

      if (!matched) {
        notMatched.push({
          productId: product.id,
          name: product.name,
          avitoItemId: product.avitoItemId
        });
        continue;
      }

      const avitoPrice = getAvitoItemPrice(matched);
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
          syncSource: 'avito'
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

app.get('/configure-admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/configure_admin.html'));
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