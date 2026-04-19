const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

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
    `https://avito.ru/oauth?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
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
    <p>Следующий шаг — обменять code на access_token.</p>
    <a href="/admin">Вернуться в админку</a>
  `);
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