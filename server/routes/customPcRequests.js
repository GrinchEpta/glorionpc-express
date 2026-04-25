const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { findOrCreateCustomer, normalizePhone } = require('../utils/customer');

router.get('/', async (req, res) => {
  try {
    const requests = await prisma.customPcRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error('Ошибка получения заявок на ПК:', error);
    res.status(500).json({ message: 'Ошибка получения заявок на ПК' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      budget,
      designWishes,
      caseSize,
      purpose,
      comment
    } = req.body;

    if (!customerName || !phone || !email) {
      return res.status(400).json({
        message: 'Заполните имя, телефон и email'
      });
    }

    let customer;
    let normalizedPhone;

    try {
      normalizedPhone = normalizePhone(phone);
      customer = await findOrCreateCustomer(prisma, {
        phone: normalizedPhone,
        name: customerName,
        email
      });
      req.session.customerId = customer.id;
    } catch (error) {
      return res.status(400).json({
        message: error.message || 'Некорректный номер телефона'
      });
    }

    const createdRequest = await prisma.customPcRequest.create({
      data: {
        customerName: customerName.trim(),
        phone: normalizedPhone,
        email: email.trim(),
        budget: budget ? Number(budget) : null,
        designWishes: designWishes?.trim() || '',
        caseSize: caseSize?.trim() || '',
        purpose: purpose?.trim() || '',
        comment: comment?.trim() || '',
        status: 'new',
        customerId: customer.id
      }
    });

    res.status(201).json({
      message: 'Заявка на сборку ПК успешно отправлена',
      request: createdRequest,
      customer
    });
  } catch (error) {
    console.error('Ошибка создания заявки на ПК:', error);
    res.status(500).json({ message: 'Ошибка отправки заявки на ПК' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['new', 'processing', 'completed', 'cancelled'];

    if (Number.isNaN(requestId)) {
      return res.status(400).json({ message: 'Некорректный ID заявки' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус заявки' });
    }

    const existingRequest = await prisma.customPcRequest.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    const updatedRequest = await prisma.customPcRequest.update({
      where: { id: requestId },
      data: { status }
    });

    res.json({
      message: 'Статус заявки обновлён',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Ошибка обновления статуса заявки:', error);
    res.status(500).json({ message: 'Ошибка обновления статуса заявки' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    if (Number.isNaN(requestId)) {
      return res.status(400).json({ message: 'Некорректный ID заявки' });
    }

    const existingRequest = await prisma.customPcRequest.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    await prisma.customPcRequest.delete({
      where: { id: requestId }
    });

    res.json({ message: 'Заявка удалена' });
  } catch (error) {
    console.error('Ошибка удаления заявки:', error);
    res.status(500).json({ message: 'Ошибка удаления заявки' });
  }
});

module.exports = router;
