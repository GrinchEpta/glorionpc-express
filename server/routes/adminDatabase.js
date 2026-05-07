const express = require('express');
const path = require('path');

const prisma = require(path.join(__dirname, '../prisma.js'));

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) {
    return next();
  }

  return res.status(401).json({ message: 'Нужен вход администратора' });
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function sanitizeLoginCode(code) {
  return {
    id: code.id,
    email: code.email,
    code: code.code,
    used: code.used,
    expiresAt: serializeDate(code.expiresAt),
    createdAt: serializeDate(code.createdAt)
  };
}

router.get('/database', requireAdmin, async (req, res) => {
  try {
    const [
      products,
      orders,
      customPcRequests,
      customers,
      loginCodes,
      integrationTokens
    ] = await Promise.all([
      prisma.product.findMany({
        orderBy: { id: 'desc' },
        include: {
          images: {
            orderBy: { order: 'asc' },
            select: { id: true, url: true, order: true }
          }
        }
      }),
      prisma.order.findMany({
        orderBy: { id: 'desc' },
        include: {
          customer: true,
          items: {
            orderBy: { id: 'asc' }
          }
        }
      }),
      prisma.customPcRequest.findMany({
        orderBy: { id: 'desc' },
        include: {
          customer: true
        }
      }),
      prisma.customer.findMany({
        orderBy: { id: 'desc' },
        include: {
          _count: {
            select: {
              orders: true,
              customPcRequests: true
            }
          }
        }
      }),
      prisma.emailLoginCode.findMany({
        orderBy: { id: 'desc' },
        take: 100
      }),
      prisma.integrationToken.findMany({
        orderBy: { id: 'desc' },
        select: {
          id: true,
          provider: true,
          tokenType: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    return res.json({
      counts: {
        products: products.length,
        orders: orders.length,
        customPcRequests: customPcRequests.length,
        customers: customers.length,
        loginCodes: loginCodes.length,
        integrationTokens: integrationTokens.length
      },
      products,
      orders,
      customPcRequests,
      customers,
      loginCodes: loginCodes.map(sanitizeLoginCode),
      integrationTokens
    });
  } catch (error) {
    console.error('Ошибка загрузки базы для админки:', error);
    return res.status(500).json({
      message: 'Не удалось загрузить данные базы',
      error: error.message
    });
  }
});

module.exports = router;
