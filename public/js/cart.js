const cartItemsContainer = document.getElementById('cart-items');

/* =========================
   КОМПЛЕКТУЮЩИЕ КОНФИГУРАТОРА
========================= */

function renderSpecs(specs = {}) {
  const items = [
    ['Процессор', specs.cpu],
    ['Видеокарта', specs.gpu],
    ['Материнская плата', specs.motherboard],
    ['ОЗУ', specs.ram],
    ['Основной накопитель', specs.storage],
    ['Доп. накопитель', specs.extraStorage],
    ['Охлаждение CPU', specs.cooler],
    ['Блок питания', specs.psu],
    ['Корпус', specs.case],
    ['Вентиляторы', specs.fans]
  ].filter(([, value]) => value && String(value).trim() !== '' && !String(value).includes('Без '));

  if (!items.length) return '';

  return `
    <div class="cart-item__specs">
      ${items
        .map(
          ([label, value]) => `
            <div class="cart-item__spec-row">
              <span class="cart-item__spec-label">${label}:</span>
              <span class="cart-item__spec-value">${value}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

/* =========================
   🛒 РЕНДЕР КОРЗИНЫ
========================= */

async function renderCart() {
  if (!cartItemsContainer) return;

  const cart =
    typeof CartUtils.refreshCartPrices === 'function'
      ? await CartUtils.refreshCartPrices()
      : CartUtils.getCart();

  if (!cart.length) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty">
        <p>Корзина пуста.</p>
        <a href="/catalog.html" class="btn btn-gold" style="margin-top: 16px;">
          Перейти в каталог
        </a>
      </div>
    `;
    return;
  }

  const itemsHtml = cart.map(item => {
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const subtotal = price * quantity;
    const specsHtml = renderSpecs(item.specs);

    return `
      <div class="cart-item">
        <div class="cart-item__image">
          <img 
            src="${item.image || '/images/logo-glorionpc.png'}" 
            alt="${item.name}" 
            class="cart-item__image-tag"
          >
        </div>

        <div class="cart-item__content">
          <h3 class="cart-item__title">${item.name}</h3>
          <div class="cart-item__category">${item.category || 'Сборка'}</div>
          <div class="cart-item__price">${CartUtils.formatPrice(price)}</div>
          ${specsHtml}
        </div>

        <div class="cart-item__actions">
          <div class="cart-item__quantity">
            <button type="button" onclick="decreaseCartItem('${item.id}')">−</button>
            <span>${quantity}</span>
            <button type="button" onclick="increaseCartItem('${item.id}')">+</button>
          </div>

          <div class="cart-item__subtotal">
            ${CartUtils.formatPrice(subtotal)}
          </div>

          <button 
            type="button" 
            class="cart-item__remove" 
            onclick="deleteCartItem('${item.id}')"
          >
            Удалить
          </button>
        </div>
      </div>
    `;
  }).join('');

  const total = CartUtils.getCartTotal();
  const totalCount = cart.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 1);
  }, 0);

  cartItemsContainer.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">
        ${itemsHtml}
      </div>

      <div class="cart-summary">
        <h2>Итого</h2>

        <div class="cart-summary__row">
          <span>Товаров:</span>
          <span>${totalCount}</span>
        </div>

        <div class="cart-summary__total">
          <span>Сумма:</span>
          <span>${CartUtils.formatPrice(total)}</span>
        </div>

        <a 
          href="/checkout.html" 
          class="cart-summary__button"
          style="display: inline-flex; justify-content: center; text-decoration: none;"
        >
          Перейти к оформлению
        </a>
      </div>
    </div>
  `;

  if (window.updateCartIndicator) {
    updateCartIndicator();
  }
}

/* =========================
   ➕ УВЕЛИЧЕНИЕ
========================= */

function increaseCartItem(productId) {
  const cart = CartUtils.getCart();
  const item = cart.find(p => String(p.id) === String(productId));
  if (!item) return;

  const newQuantity = (Number(item.quantity) || 1) + 1;

  CartUtils.updateCartQuantity(productId, newQuantity);
  renderCart();
}

/* =========================
   ➖ УМЕНЬШЕНИЕ
========================= */

function decreaseCartItem(productId) {
  const cart = CartUtils.getCart();
  const item = cart.find(p => String(p.id) === String(productId));
  if (!item) return;

  const newQuantity = (Number(item.quantity) || 1) - 1;

  CartUtils.updateCartQuantity(productId, newQuantity);
  renderCart();
}

/* =========================
   ❌ УДАЛЕНИЕ
========================= */

function deleteCartItem(productId) {
  CartUtils.removeFromCart(productId);
  renderCart();
}

/* =========================
   🌍 ГЛОБАЛЬНЫЙ ДОСТУП
========================= */

window.increaseCartItem = increaseCartItem;
window.decreaseCartItem = decreaseCartItem;
window.deleteCartItem = deleteCartItem;

/* =========================
   🚀 ЗАПУСК
========================= */

document.addEventListener('DOMContentLoaded', renderCart);
