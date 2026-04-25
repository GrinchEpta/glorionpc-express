const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { findOrCreateCustomer, normalizePhone } = require('../utils/customer');

function parseSpecs(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
}

function getProductImage(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0].url || '/images/logo-glorionpc.png';
  }

  return '/images/logo-glorionpc.png';
}

router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ message: 'Ошибка получения заказов' });
  }
});

router.post('/', async (req, res) => {
  try {
    const order = req.body;

    if (
      !order ||
      !order.customer ||
      !order.customer.name ||
      !order.customer.phone ||
      !order.customer.email ||
      !Array.isArray(order.items) ||
      !order.items.length
    ) {
      return res.status(400).json({
        message: 'Некорректные данные заказа'
      });
    }

    let customer;
    let normalizedPhone;

    try {
      normalizedPhone = normalizePhone(order.customer.phone);

      if (req.session.customerId) {
        const sessionCustomer = await prisma.customer.findUnique({
          where: { id: req.session.customerId }
        });

        if (sessionCustomer && sessionCustomer.phone !== normalizedPhone) {
          return res.status(400).json({
            message: 'Вы вошли под другим номером телефона. Для нового заказа используйте номер из личного кабинета или выйдите из аккаунта.'
          });
        }
      }

      customer = await findOrCreateCustomer(prisma, {
        phone: normalizedPhone,
        name: order.customer.name,
        email: order.customer.email
      });
      req.session.customerId = customer.id;
    } catch (error) {
      return res.status(400).json({
        message: error.message || 'Некорректный номер телефона'
      });
    }

    const requestedItems = order.items.map((item) => {
      const numericId = Number(item.id);

      return {
        productId: Number.isInteger(numericId) && !String(item.id).startsWith('config-')
          ? numericId
          : null,
        productName: item.name || 'Товар',
        productImage: item.image || '/images/logo-glorionpc.png',
        specs: parseSpecs(item.specs),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0
      };
    });

    const productIds = [
      ...new Set(
        requestedItems
          .filter((item) => item.productId !== null)
          .map((item) => item.productId)
      )
    ];

    const products = productIds.length
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds
            }
          },
          include: {
            images: {
              orderBy: { order: 'asc' }
            }
          }
        })
      : [];

    const productsById = new Map(
      products.map((product) => [product.id, product])
    );

    const missingProduct = requestedItems.find(
      (item) => item.productId !== null && !productsById.has(item.productId)
    );

    if (missingProduct) {
      return res.status(400).json({
        message: `Товар "${missingProduct.productName}" больше недоступен`
      });
    }

    const normalizedItems = requestedItems.map((item) => {
      const product = item.productId !== null
        ? productsById.get(item.productId)
        : null;

      return {
        ...item,
        productName: product?.name || item.productName,
        productImage: product ? getProductImage(product) : item.productImage,
        price: product ? Math.round(Number(product.price) || 0) : item.price
      };
    });

    const orderTotal = normalizedItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const createdOrder = await prisma.order.create({
      data: {
        customerName: order.customer.name,
        phone: normalizedPhone,
        email: order.customer.email,
        comment: order.customer.comment || '',
        total: orderTotal,
        status: 'new',
        customerId: customer.id,
        items: {
          create: normalizedItems
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Заказ успешно оформлен',
      order: createdOrder,
      customer
    });
  } catch (error) {
    console.error('Ошибка при сохранении заказа:', error);
    res.status(500).json({
      message: 'Ошибка при оформлении заказа'
    });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['new', 'processing', 'completed', 'cancelled'];

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ message: 'Некорректный ID заказа' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус заказа' });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!existingOrder) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    res.json({
      message: 'Статус заказа обновлён',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);
    res.status(500).json({ message: 'Ошибка обновления статуса заказа' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ message: 'Некорректный ID заказа' });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    await prisma.orderItem.deleteMany({
      where: { orderId }
    });

    await prisma.order.delete({
      where: { id: orderId }
    });

    res.json({ message: 'Заказ удалён' });
  } catch (error) {
    console.error('Ошибка удаления заказа:', error);
    res.status(500).json({ message: 'Ошибка удаления заказа' });
  }
});

module.exports = router;
