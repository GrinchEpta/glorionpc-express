const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/images');

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

/* =========================
   HELPERS
========================= */

function parseBool(value) {
  return value === true || value === 'true' || value === 'on';
}

function parseNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function parseExistingImages(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/* =========================
   GET ALL PRODUCTS
========================= */
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ message: 'Ошибка получения товаров' });
  }
});

/* =========================
   GET PRODUCT BY ID
========================= */
router.get('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    res.json(product);
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ message: 'Ошибка получения товара' });
  }
});

/* =========================
   CREATE PRODUCT
========================= */
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || [];

    if (!body.name || body.price === undefined || !body.category) {
      return res.status(400).json({ message: 'Заполните обязательные поля' });
    }

    const existingImages = parseExistingImages(body.existingImages);
    const uploadedImages = files.map((file) => `/images/${file.filename}`);
    const allImages = [...existingImages, ...uploadedImages];

    const createdProduct = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description || '',
        price: Number(body.price),
        oldPrice: parseNum(body.oldPrice),
        category: body.category,

        cpu: body.cpu || null,
        gpu: body.gpu || null,
        ram: body.ram || null,
        ssd: body.ssd || null,

        inStock: parseBool(body.inStock),

        componentType: body.componentType || null,
        isConfiguratorItem: parseBool(body.isConfiguratorItem),

        socket: body.socket || null,
        ramType: body.ramType || null,
        chipset: body.chipset || null,
        formFactor: body.formFactor || null,
        memoryCapacity: body.memoryCapacity || null,
        storageType: body.storageType || null,
        storageCapacity: body.storageCapacity || null,
        powerDraw: parseNum(body.powerDraw),
        recommendedPsu: parseNum(body.recommendedPsu),
        psuWattage: parseNum(body.psuWattage),
        coolingLevel: body.coolingLevel || null,
        supportedSockets: body.supportedSockets || null,

        gpuLength: parseNum(body.gpuLength),
        gpuWidth: parseNum(body.gpuWidth),
        gpuHeight: parseNum(body.gpuHeight),

        specsJson: body.specsJson || null,

        avitoItemId: body.avitoItemId || null,
        avitoUrl: body.avitoUrl || null,

        images: {
          create: allImages.map((url, index) => ({
            url,
            order: index
          }))
        }
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ message: 'Ошибка создания товара' });
  }
});

/* =========================
   UPDATE PRODUCT
========================= */
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const body = req.body;
    const files = req.files || [];

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    const existingImages = parseExistingImages(body.existingImages);
    const uploadedImages = files.map((file) => `/images/${file.filename}`);
    const allImages = [...existingImages, ...uploadedImages];

    await prisma.productImage.deleteMany({
      where: { productId }
    });

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: body.name,
        description: body.description || '',
        price: Number(body.price),
        oldPrice: parseNum(body.oldPrice),
        category: body.category,

        cpu: body.cpu || null,
        gpu: body.gpu || null,
        ram: body.ram || null,
        ssd: body.ssd || null,

        inStock: parseBool(body.inStock),

        componentType: body.componentType || null,
        isConfiguratorItem: parseBool(body.isConfiguratorItem),

        socket: body.socket || null,
        ramType: body.ramType || null,
        chipset: body.chipset || null,
        formFactor: body.formFactor || null,
        memoryCapacity: body.memoryCapacity || null,
        storageType: body.storageType || null,
        storageCapacity: body.storageCapacity || null,
        powerDraw: parseNum(body.powerDraw),
        recommendedPsu: parseNum(body.recommendedPsu),
        psuWattage: parseNum(body.psuWattage),
        coolingLevel: body.coolingLevel || null,
        supportedSockets: body.supportedSockets || null,

        gpuLength: parseNum(body.gpuLength),
        gpuWidth: parseNum(body.gpuWidth),
        gpuHeight: parseNum(body.gpuHeight),

        specsJson: body.specsJson || null,

        avitoItemId: body.avitoItemId || null,
        avitoUrl: body.avitoUrl || null,

        images: {
          create: allImages.map((url, index) => ({
            url,
            order: index
          }))
        }
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ message: 'Ошибка обновления товара' });
  }
});

/* =========================
   DELETE PRODUCT
========================= */
router.delete('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: 'Некорректный ID товара' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    await prisma.productImage.deleteMany({
      where: { productId }
    });

    await prisma.product.delete({
      where: { id: productId }
    });

    res.json({ message: 'Товар удалён' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ message: 'Ошибка удаления товара' });
  }
});

module.exports = router;