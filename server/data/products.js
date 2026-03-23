const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const upload = require('../middleware/upload');

function normalizeBoolean(value) {
  return value === 'true' || value === 'on' || value === true;
}

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    const normalized = products.map(product => ({
      ...product,
      image: product.images?.[0]?.url || null
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ message: 'Ошибка получения товаров' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    res.json({
      ...product,
      image: product.images?.[0]?.url || null
    });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ message: 'Ошибка получения товара' });
  }
});

router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      oldPrice,
      category,
      cpu,
      gpu,
      ram,
      ssd,
      inStock
    } = req.body;

    const createdProduct = await prisma.product.create({
      data: {
        name: name || '',
        description: description || '',
        price: normalizeNumber(price, 0),
        oldPrice: normalizeNumber(oldPrice, null),
        category: category || '',
        cpu: cpu || null,
        gpu: gpu || null,
        ram: ram || null,
        ssd: ssd || null,
        inStock: normalizeBoolean(inStock)
      }
    });

    if (req.files && req.files.length > 0) {
      await prisma.productImage.createMany({
        data: req.files.map((file, index) => ({
          url: `/images/${file.filename}`,
          order: index,
          productId: createdProduct.id
        }))
      });
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json({
      ...fullProduct,
      image: fullProduct.images?.[0]?.url || null
    });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ message: 'Ошибка создания товара' });
  }
});

router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    const {
      name,
      description,
      price,
      oldPrice,
      category,
      cpu,
      gpu,
      ram,
      ssd,
      inStock
    } = req.body;

    await prisma.product.update({
      where: { id },
      data: {
        name: name || '',
        description: description || '',
        price: normalizeNumber(price, 0),
        oldPrice: normalizeNumber(oldPrice, null),
        category: category || '',
        cpu: cpu || null,
        gpu: gpu || null,
        ram: ram || null,
        ssd: ssd || null,
        inStock: normalizeBoolean(inStock)
      }
    });

    const existingImagesRaw = req.body.existingImages;
    let existingImages = [];

    if (existingImagesRaw) {
      try {
        existingImages = JSON.parse(existingImagesRaw);
      } catch (error) {
        existingImages = [];
      }
    }

    await prisma.productImage.deleteMany({
      where: { productId: id }
    });

    const oldImagesData = existingImages.map((url, index) => ({
      url,
      order: index,
      productId: id
    }));

    const newImagesData = (req.files || []).map((file, index) => ({
      url: `/images/${file.filename}`,
      order: oldImagesData.length + index,
      productId: id
    }));

    const allImagesData = [...oldImagesData, ...newImagesData];

    if (allImagesData.length > 0) {
      await prisma.productImage.createMany({
        data: allImagesData
      });
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({
      ...updatedProduct,
      image: updatedProduct.images?.[0]?.url || null
    });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ message: 'Ошибка обновления товара' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    await prisma.productImage.deleteMany({
      where: { productId: id }
    });

    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Товар удалён' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ message: 'Ошибка удаления товара' });
  }
});

module.exports = router;