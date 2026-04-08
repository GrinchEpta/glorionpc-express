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

// Для JSON-запросов
app.use(express.json());

// Для form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Статика
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