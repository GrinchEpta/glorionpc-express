const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { sendLoginCodeSms } = require('../services/smsService');
const { findOrCreateCustomer, isValidPhone, normalizePhone } = require('../utils/customer');

function getPublicCustomer(customer) {
  if (!customer) return null;

  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

function requireCustomer(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ message: 'Покупатель не авторизован' });
  }

  return next();
}

router.post('/auth/request-code', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);

    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Некорректный номер телефона' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.phoneLoginCode.updateMany({
      where: {
        phone,
        used: false
      },
      data: {
        used: true
      }
    });

    const loginCode = await prisma.phoneLoginCode.create({
      data: {
        phone,
        code,
        expiresAt
      }
    });

    try {
      await sendLoginCodeSms(phone, code);
    } catch (error) {
      await prisma.phoneLoginCode.update({
        where: { id: loginCode.id },
        data: { used: true }
      });

      throw error;
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Customer auth request-code error:', error);
    return res.status(500).json({ message: 'Не удалось отправить SMS с кодом' });
  }
});

router.post('/auth/verify-code', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();

    if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Некорректный телефон или код' });
    }

    const loginCode = await prisma.phoneLoginCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!loginCode) {
      return res.status(400).json({ message: 'Код неверный или истек' });
    }

    const customer = await findOrCreateCustomer(prisma, { phone });

    await prisma.phoneLoginCode.update({
      where: { id: loginCode.id },
      data: { used: true }
    });

    req.session.customerId = customer.id;

    return res.json({
      ok: true,
      customer: getPublicCustomer(customer)
    });
  } catch (error) {
    console.error('Customer auth verify-code error:', error);
    return res.status(500).json({ message: 'Не удалось проверить код входа' });
  }
});

router.get('/me', requireCustomer, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.session.customerId }
    });

    if (!customer) {
      delete req.session.customerId;
      return res.status(401).json({ message: 'Покупатель не авторизован' });
    }

    return res.json({ customer: getPublicCustomer(customer) });
  } catch (error) {
    console.error('Customer me error:', error);
    return res.status(500).json({ message: 'Не удалось загрузить покупателя' });
  }
});

router.get('/orders', requireCustomer, async (req, res) => {
  try {
    const [orders, customPcRequests] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: req.session.customerId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }),
      prisma.customPcRequest.findMany({
        where: { customerId: req.session.customerId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.json({ orders, customPcRequests });
  } catch (error) {
    console.error('Customer orders error:', error);
    return res.status(500).json({ message: 'Не удалось загрузить заказы покупателя' });
  }
});

router.post('/logout', (req, res) => {
  delete req.session.customerId;
  return res.json({ ok: true });
});

module.exports = router;
