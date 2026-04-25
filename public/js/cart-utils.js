const CART_STORAGE_KEY = 'glorionpc_cart';

/* =========================
   📦 ПОЛУЧЕНИЕ КАРТИНКИ
========================= */

function getMainImage(product) {
  if (product.image) return product.image;

  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === 'string') return firstImage;
    if (firstImage && firstImage.url) return firstImage.url;
  }

  if (product.imageUrl) return product.imageUrl;
  if (product.photo) return product.photo;

  return '/images/logo-glorionpc.png';
}

/* =========================
   🛒 РАБОТА С КОРЗИНОЙ
========================= */

function getCart() {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Ошибка чтения корзины:', error);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function isCatalogProductItem(item) {
  const numericId = Number(item?.id);
  return Number.isInteger(numericId) && !String(item.id).startsWith('config-');
}

function mergeCartItemWithProduct(item, product) {
  return {
    ...item,
    name: product.name || item.name || 'Товар',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    image: getMainImage(product),
    images: Array.isArray(product.images) ? product.images : [],
    category: product.category || item.category || '',
    description: product.description || item.description || '',
    cpu: product.cpu || item.cpu || '-',
    gpu: product.gpu || item.gpu || '-',
    ram: product.ram || item.ram || '-',
    ssd: product.ssd || item.ssd || '-'
  };
}

async function refreshCartPrices() {
  const cart = getCart();
  const productIds = cart
    .filter(isCatalogProductItem)
    .map(item => Number(item.id));

  if (!productIds.length) {
    return cart;
  }

  try {
    const products = await Promise.all(
      [...new Set(productIds)].map(async (id) => {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) return null;
        return response.json();
      })
    );

    const productsById = new Map(
      products
        .filter(Boolean)
        .map(product => [String(product.id), product])
    );

    const refreshedCart = cart.map((item) => {
      const product = productsById.get(String(item.id));
      return product ? mergeCartItemWithProduct(item, product) : item;
    });

    saveCart(refreshedCart);
    return refreshedCart;
  } catch (error) {
    console.error('Ошибка обновления цен корзины:', error);
    return cart;
  }
}

/* =========================
   🔵 ИНДИКАТОР КОРЗИНЫ
========================= */

function updateCartIndicator() {
  const cartTarget = document.getElementById('cart-target');

  // если элемент ещё не загрузился — пробуем позже
  if (!cartTarget) {
    setTimeout(updateCartIndicator, 100);
    return;
  }

  const cart = getCart();

  if (cart.length > 0) {
    cartTarget.classList.add('is-visible');
  } else {
    cartTarget.classList.remove('is-visible');
  }
}

/* =========================
   ➕ ДОБАВЛЕНИЕ ТОВАРА
========================= */

function addToCart(product) {
  const cart = getCart();

  const existingItem = cart.find(
    item => String(item.id) === String(product.id)
  );

  if (existingItem) {
    existingItem.quantity = Number(existingItem.quantity || 0) + 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
      image: getMainImage(product),
      images: Array.isArray(product.images) ? product.images : [],
      category: product.category || '',
      description: product.description || '',
      cpu: product.cpu || '-',
      gpu: product.gpu || '-',
      ram: product.ram || '-',
      ssd: product.ssd || '-',
      quantity: 1
    });
  }

  saveCart(cart);
  updateCartIndicator();
}

/* =========================
   ❌ УДАЛЕНИЕ ТОВАРА
========================= */

function removeFromCart(productId) {
  const cart = getCart().filter(
    item => String(item.id) !== String(productId)
  );

  saveCart(cart);
  updateCartIndicator();
}

/* =========================
   🔢 ИЗМЕНЕНИЕ КОЛИЧЕСТВА
========================= */

function updateCartQuantity(productId, quantity) {
  const cart = getCart();

  const item = cart.find(
    product => String(product.id) === String(productId)
  );

  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  item.quantity = quantity;

  saveCart(cart);
  updateCartIndicator();
}

/* =========================
   🧹 ОЧИСТКА КОРЗИНЫ
========================= */

function clearCart() {
  saveCart([]);
  updateCartIndicator();
}

/* =========================
   💰 СУММА
========================= */

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (item.quantity || 1);
  }, 0);
}

/* =========================
   💵 ФОРМАТ ЦЕНЫ
========================= */

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

/* =========================
   🚀 ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
========================= */

document.addEventListener('DOMContentLoaded', () => {
  updateCartIndicator();
});

/* =========================
   🌍 ГЛОБАЛЬНЫЙ ДОСТУП
========================= */

window.CartUtils = {
  getCart,
  saveCart,
  refreshCartPrices,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getCartTotal,
  formatPrice,
  updateCartIndicator
};

window.addToCart = addToCart;
window.updateCartIndicator = updateCartIndicator;
