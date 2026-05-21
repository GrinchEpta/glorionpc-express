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


router.delete('/database/:section/:id', requireAdmin, async (req, res) => {
  const { section } = req.params;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Некорректный ID записи' });
  }

  try {
    if (section === 'products') {
      const linkedOrderItems = await prisma.orderItem.count({ where: { productId: id } });

      if (linkedOrderItems > 0) {
        return res.status(409).json({
          message: 'Нельзя удалить товар, который уже есть в заказах. Лучше снять его с наличия.'
        });
      }

      await prisma.product.delete({ where: { id } });
    } else if (section === 'orders') {
      await prisma.order.delete({ where: { id } });
    } else if (section === 'customPcRequests') {
      await prisma.customPcRequest.delete({ where: { id } });
    } else if (section === 'customers') {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true,
              customPcRequests: true
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ message: 'Запись не найдена' });
      }

      if (customer._count.orders > 0 || customer._count.customPcRequests > 0) {
        return res.status(409).json({
          message: 'Нельзя удалить покупателя, у него есть заказы или заявки.'
        });
      }

      await prisma.customer.delete({ where: { id } });
    } else if (section === 'loginCodes') {
      await prisma.emailLoginCode.delete({ where: { id } });
    } else if (section === 'integrationTokens') {
      await prisma.integrationToken.delete({ where: { id } });
    } else {
      return res.status(400).json({ message: 'Неизвестный раздел базы данных' });
    }

    return res.json({ ok: true, message: 'Запись удалена' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Запись не найдена' });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Эта запись связана с другими данными и не может быть удалена.' });
    }

    console.error('Ошибка удаления записи базы:', error);
    return res.status(500).json({
      message: 'Не удалось удалить запись',
      error: error.message
    });
  }
});


module.exports = router;
