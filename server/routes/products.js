const express = require('express');
const prisma = require('../prisma');
const { upload, cloudinary } = require('../middleware/upload');

const router = express.Router();

function parseBoolean(value) {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return false;
}

function parseNullableInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function parseNullableFloat(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function normalizeErrorMessage(error) {
  if (!error) return 'Неизвестная ошибка';

  if (typeof error === 'string') return error;

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (error.error && typeof error.error === 'string') {
    return error.error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Ошибка без текста';
  }
}

function extractCloudinaryPublicId(url) {
  try {
    if (!url || typeof url !== 'string') return null;

    const parts = url.split('/');
    const uploadIndex = parts.findIndex((part) => part === 'upload');
    if (uploadIndex === -1) return null;

    let publicIdWithExt = parts.slice(uploadIndex + 1).join('/');

    if (
      publicIdWithExt.startsWith('v') &&
      /^\d+$/.test(publicIdWithExt.split('/')[0].slice(1))
    ) {
      publicIdWithExt = publicIdWithExt.split('/').slice(1).join('/');
    }

    return publicIdWithExt.replace(/\.[^/.]+$/, '');
  } catch (error) {
    console.error('Ошибка извлечения public_id:', error);
    return null;
  }
}

async function deleteCloudinaryImageByUrl(url) {
  try {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Не удалось удалить фото из Cloudinary:', error);
  }
}

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({
      message: 'Ошибка получения товаров',
      error: normalizeErrorMessage(error)
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
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
    res.status(500).json({
      message: 'Ошибка получения товара',
      error: normalizeErrorMessage(error)
    });
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
      inStock,
      componentType,
      isConfiguratorItem,
      socket,
      ramType,
      chipset,
      formFactor,
      memoryCapacity,
      storageType,
      storageCapacity,
      powerDraw,
      recommendedPsu,
      psuWattage,
      coolingLevel,
      supportedSockets,
      gpuLength,
      gpuWidth,
      gpuHeight,
      specsJson,
      avitoItemId,
      avitoUrl,
      avitoPrice,
      avitoStatus,
      avitoLastSyncedAt,
      syncSource
    } = req.body;

    const uploadedImages = (req.files || []).map((file, index) => ({
      url: file.path,
      order: index
    }));

    const product = await prisma.product.create({
      data: {
        name: name || '',
        description: description || '',
        price: parseNullableFloat(price) || 0,
        oldPrice: parseNullableFloat(oldPrice),
        category: category || 'ПК',

        cpu: cpu || null,
        gpu: gpu || null,
        ram: ram || null,
        ssd: ssd || null,

        inStock: parseBoolean(inStock),

        componentType: componentType || null,
        isConfiguratorItem: parseBoolean(isConfiguratorItem),

        socket: socket || null,
        ramType: ramType || null,
        chipset: chipset || null,
        formFactor: formFactor || null,

        memoryCapacity: memoryCapacity || null,
        storageType: storageType || null,
        storageCapacity: storageCapacity || null,

        powerDraw: parseNullableInt(powerDraw),
        recommendedPsu: parseNullableInt(recommendedPsu),
        psuWattage: parseNullableInt(psuWattage),

        coolingLevel: coolingLevel || null,
        supportedSockets: supportedSockets || null,

        gpuLength: parseNullableInt(gpuLength),
        gpuWidth: parseNullableInt(gpuWidth),
        gpuHeight: parseNullableInt(gpuHeight),

        specsJson: specsJson || null,

        avitoItemId: avitoItemId || null,
        avitoUrl: avitoUrl || null,
        avitoPrice: parseNullableFloat(avitoPrice),
        avitoStatus: avitoStatus || null,
        avitoLastSyncedAt: avitoLastSyncedAt ? new Date(avitoLastSyncedAt) : null,
        syncSource: syncSource || null,

        images: {
          create: uploadedImages
        }
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({
      message: 'Ошибка создания товара',
      error: normalizeErrorMessage(error)
    });
  }
});

router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
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
      inStock,
      componentType,
      isConfiguratorItem,
      socket,
      ramType,
      chipset,
      formFactor,
      memoryCapacity,
      storageType,
      storageCapacity,
      powerDraw,
      recommendedPsu,
      psuWattage,
      coolingLevel,
      supportedSockets,
      gpuLength,
      gpuWidth,
      gpuHeight,
      specsJson,
      avitoItemId,
      avitoUrl,
      avitoPrice,
      avitoStatus,
      avitoLastSyncedAt,
      syncSource,
      existingImages
    } = req.body;

    let existingImageUrls = [];
    if (existingImages) {
      try {
        existingImageUrls = JSON.parse(existingImages);
      } catch (error) {
        console.error('Ошибка парсинга existingImages:', error);
        existingImageUrls = [];
      }
    }

    const imagesToDelete = existingProduct.images.filter(
      (img) => !existingImageUrls.includes(img.url)
    );

    for (const image of imagesToDelete) {
      await deleteCloudinaryImageByUrl(image.url);
    }

    await prisma.productImage.deleteMany({
      where: { productId }
    });

    const oldImages = existingImageUrls.map((url, index) => ({
      url,
      order: index
    }));

    const newImages = (req.files || []).map((file, index) => ({
      url: file.path,
      order: oldImages.length + index
    }));

    const allImages = [...oldImages, ...newImages];

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || '',
        description: description || '',
        price: parseNullableFloat(price) || 0,
        oldPrice: parseNullableFloat(oldPrice),
        category: category || 'ПК',

        cpu: cpu || null,
        gpu: gpu || null,
        ram: ram || null,
        ssd: ssd || null,

        inStock: parseBoolean(inStock),

        componentType: componentType || null,
        isConfiguratorItem: parseBoolean(isConfiguratorItem),

        socket: socket || null,
        ramType: ramType || null,
        chipset: chipset || null,
        formFactor: formFactor || null,

        memoryCapacity: memoryCapacity || null,
        storageType: storageType || null,
        storageCapacity: storageCapacity || null,

        powerDraw: parseNullableInt(powerDraw),
        recommendedPsu: parseNullableInt(recommendedPsu),
        psuWattage: parseNullableInt(psuWattage),

        coolingLevel: coolingLevel || null,
        supportedSockets: supportedSockets || null,

        gpuLength: parseNullableInt(gpuLength),
        gpuWidth: parseNullableInt(gpuWidth),
        gpuHeight: parseNullableInt(gpuHeight),

        specsJson: specsJson || null,

        avitoItemId: avitoItemId || null,
        avitoUrl: avitoUrl || null,
        avitoPrice: parseNullableFloat(avitoPrice),
        avitoStatus: avitoStatus || null,
        avitoLastSyncedAt: avitoLastSyncedAt ? new Date(avitoLastSyncedAt) : null,
        syncSource: syncSource || null,

        images: {
          create: allImages
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
    console.error('Ошибка обновления товара:', error?.message || error);
    res.status(500).json({
      message: 'Ошибка обновления товара',
      error: normalizeErrorMessage(error)
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    for (const image of product.images) {
      await deleteCloudinaryImageByUrl(image.url);
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    res.json({ message: 'Товар удалён' });
    } catch (error) {
      console.error('🔥 FULL ERROR UPDATE PRODUCT:', error?.message, error?.stack, error);

      res.status(500).json({
        message: 'Ошибка обновления товара',
        error: error?.message || 'Неизвестная ошибка'
      });
    }
});

module.exports = router;