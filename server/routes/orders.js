const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

function parseSpecs(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
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

    const normalizedItems = order.items.map((item) => {
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

    const createdOrder = await prisma.order.create({
      data: {
        customerName: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        comment: order.customer.comment || '',
        total: Number(order.total) || 0,
        status: 'new',
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
      order: createdOrder
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