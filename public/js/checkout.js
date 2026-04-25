const checkoutForm = document.getElementById('checkout-form');
const checkoutItemsContainer = document.getElementById('checkout-items');
const checkoutTotalElement = document.getElementById('checkout-total');
const checkoutMessage = document.getElementById('checkout-message');

const paymentModal = document.getElementById('payment-modal');
const paymentModalClose = document.getElementById('payment-modal-close');
const paymentModalBackdrop = document.getElementById('payment-modal-backdrop');
const openBankBtn = document.getElementById('open-bank-btn');
const paymentQrBlock = document.getElementById('payment-modal-qr');
const paymentTotal = document.getElementById('payment-modal-total');
const paymentOrderId = document.getElementById('payment-modal-order-id');
const paymentPaidBtn = document.getElementById('payment-paid-btn');
const paymentStatusMessage = document.getElementById('payment-status-message');
const phoneInput = document.getElementById('phone');

/* =========================
   ⚠️ ВСТАВЬ СВОЮ ССЫЛКУ ОПЛАТЫ
========================= */
const PAYMENT_LINK = 'https://example.com/payment-link';

/* =========================
   💾 ДАННЫЕ ДЛЯ МОДАЛКИ
========================= */
let lastOrderTotal = 0;
let currentOrderId = null;

/* =========================
   HELPERS
========================= */
function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

function normalizeCartItem(item = {}) {
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;

  return {
    id: item.id ?? null,
    name: item.name || 'Товар',
    category: item.category || 'Сборка',
    price,
    quantity,
    image:
      item.image ||
      item.imageUrl ||
      item.photo ||
      item.images?.[0]?.url ||
      item.images?.[0] ||
      '/images/logo-glorionpc.png',
    specs:
      item.specs && typeof item.specs === 'object'
        ? item.specs
        : {},
    subtotal: price * quantity
  };
}

async function getCartItems() {
  if (window.CartUtils && typeof window.CartUtils.getCart === 'function') {
    const cart =
      typeof window.CartUtils.refreshCartPrices === 'function'
        ? await window.CartUtils.refreshCartPrices()
        : window.CartUtils.getCart();

    return Array.isArray(cart) ? cart.map(normalizeCartItem) : [];
  }

  try {
    const cart = JSON.parse(localStorage.getItem('glorionpc_cart') || '[]');
    return Array.isArray(cart) ? cart.map(normalizeCartItem) : [];
  } catch (error) {
    console.error('Ошибка чтения корзины:', error);
    return [];
  }
}

function getCartTotal(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
}

function renderSpecsForCheckout(specs = {}) {
  const rows = [
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
  ].filter(([, value]) => value && String(value).trim() !== '');

  if (!rows.length) return '';

  return `
    <div class="checkout-item__specs">
      ${rows
        .map(
          ([label, value]) => `
            <div class="checkout-item__spec-row">
              <span class="checkout-item__spec-label">${label}:</span>
              <span class="checkout-item__spec-value">${value}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

/* =========================
   📱 ПРОВЕРКА МОБИЛЬНОГО
========================= */
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/* =========================
   🔁 СОСТОЯНИЕ ФОРМЫ
========================= */
function setCheckoutFormState(isEnabled) {
  if (!checkoutForm) return;

  checkoutForm.style.pointerEvents = isEnabled ? 'auto' : 'none';
  checkoutForm.style.opacity = isEnabled ? '1' : '0.6';
}

/* =========================
   💾 СОХРАНЕНИЕ ID ЗАКАЗА
========================= */
function saveOrderIdToLocalStorage(orderId) {
  if (!orderId) return;

  try {
    const existingOrders = JSON.parse(localStorage.getItem('glorionpc_orders') || '[]');

    if (!existingOrders.includes(orderId)) {
      existingOrders.unshift(orderId);
      localStorage.setItem('glorionpc_orders', JSON.stringify(existingOrders));
    }
  } catch (error) {
    console.error('Ошибка сохранения ID заказа в localStorage:', error);
  }
}

/* =========================
   📞 МАСКА ТЕЛЕФОНА
========================= */
function getPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatPhoneValue(value) {
  let digits = getPhoneDigits(value);

  if (!digits.length) {
    return '';
  }

  if (digits[0] === '8') {
    digits = '7' + digits.slice(1);
  }

  if (digits[0] !== '7') {
    digits = '7' + digits;
  }

  digits = digits.slice(0, 11);

  let result = '+7';

  if (digits.length > 1) {
    result += ' (' + digits.slice(1, 4);
  }

  if (digits.length >= 5) {
    result += ') ' + digits.slice(4, 7);
  }

  if (digits.length >= 8) {
    result += '-' + digits.slice(7, 9);
  }

  if (digits.length >= 10) {
    result += '-' + digits.slice(9, 11);
  }

  return result;
}

function setupPhoneMask() {
  if (!phoneInput) return;

  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value.trim()) {
      phoneInput.value = '+7';
    }
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhoneValue(phoneInput.value);
  });

  phoneInput.addEventListener('blur', () => {
    const digits = getPhoneDigits(phoneInput.value);

    if (digits.length <= 1) {
      phoneInput.value = '';
    }
  });

  phoneInput.addEventListener('keydown', (event) => {
    if (
      event.key === 'Backspace' &&
      (phoneInput.value === '+7' || phoneInput.value === '+7 ')
    ) {
      phoneInput.value = '';
      event.preventDefault();
    }
  });
}

/* =========================
   🧾 РЕНДЕР ТОВАРОВ
========================= */
async function renderCheckoutItems() {
  if (!checkoutItemsContainer || !checkoutTotalElement) return;

  const cart = await getCartItems();

  if (!cart.length) {
    checkoutItemsContainer.innerHTML = `
      <div class="cart-empty">
        <p>В корзине нет товаров.</p>
        <a href="/catalog.html" class="btn btn-gold" style="margin-top: 16px;">
          Перейти в каталог
        </a>
      </div>
    `;

    checkoutTotalElement.textContent = formatPrice(0);
    setCheckoutFormState(false);
    return;
  }

  setCheckoutFormState(true);

  checkoutItemsContainer.innerHTML = cart
    .map((item) => {
      return `
        <div class="checkout-item">
          <div class="checkout-item__left">
            <div class="checkout-item__thumb">
              <img src="${item.image}" alt="${item.name}">
            </div>

            <div class="checkout-item__content">
              <div class="checkout-item__title">${item.name}</div>
              <div class="checkout-item__meta">
                ${item.category} · ${item.quantity} шт.
              </div>
              ${renderSpecsForCheckout(item.specs)}
            </div>
          </div>

          <div class="checkout-item__price">
            ${formatPrice(item.subtotal)}
          </div>
        </div>
      `;
    })
    .join('');

  checkoutTotalElement.textContent = formatPrice(getCartTotal(cart));
}

/* =========================
   💬 СООБЩЕНИЯ
========================= */
function showCheckoutMessage(text, type) {
  if (!checkoutMessage) return;

  if (!text) {
    checkoutMessage.innerHTML = '';
    return;
  }

  checkoutMessage.innerHTML = `
    <div class="checkout-message checkout-message--${type}">
      ${text}
    </div>
  `;
}

function showPaymentStatusMessage(text, type = 'success') {
  if (!paymentStatusMessage) return;

  if (!text) {
    paymentStatusMessage.innerHTML = '';
    return;
  }

  paymentStatusMessage.innerHTML = `
    <div class="checkout-message checkout-message--${type}">
      ${text}
    </div>
  `;
}

/* =========================
   💳 МОДАЛКА ОПЛАТЫ
========================= */
function setupPaymentView() {
  const mobile = isMobileDevice();

  if (paymentQrBlock) {
    paymentQrBlock.style.display = mobile ? 'none' : 'flex';
  }

  if (openBankBtn) {
    openBankBtn.style.display = mobile ? 'inline-flex' : 'none';
  }
}

function setPaymentTotalValue(total) {
  if (!paymentTotal) return;
  paymentTotal.textContent = formatPrice(total || 0);
}

function setPaymentOrderId(orderId) {
  if (!paymentOrderId) return;
  paymentOrderId.textContent = orderId ? `Номер заказа: #${orderId}` : '';
}

function resetPaymentModalState() {
  showPaymentStatusMessage('');

  if (paymentPaidBtn) {
    paymentPaidBtn.disabled = false;
    paymentPaidBtn.textContent = 'Я оплатил';
  }
}

function openPaymentModal(total, orderId) {
  if (!paymentModal) return;

  setPaymentTotalValue(total);
  setPaymentOrderId(orderId);
  setupPaymentView();
  resetPaymentModalState();

  paymentModal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closePaymentModal() {
  if (!paymentModal) return;

  paymentModal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

/* =========================
   ✅ Я ОПЛАТИЛ
========================= */
async function markOrderAsPaid() {
  if (!currentOrderId) {
    showPaymentStatusMessage('Не найден номер заказа.', 'error');
    return;
  }

  try {
    if (paymentPaidBtn) {
      paymentPaidBtn.disabled = true;
      paymentPaidBtn.textContent = 'Обновляем статус...';
    }

    const response = await fetch(`/api/orders/${currentOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'processing' })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось обновить статус заказа');
    }

    showPaymentStatusMessage(
      'Статус заказа обновлён. Мы видим, что вы оплатили заказ, и скоро свяжемся с вами.',
      'success'
    );

    if (paymentPaidBtn) {
      paymentPaidBtn.textContent = 'Статус обновлён';
    }
  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);

    showPaymentStatusMessage(
      error.message || 'Не удалось обновить статус заказа.',
      'error'
    );

    if (paymentPaidBtn) {
      paymentPaidBtn.disabled = false;
      paymentPaidBtn.textContent = 'Я оплатил';
    }
  }
}

/* =========================
   📦 ОТПРАВКА ЗАКАЗА
========================= */
async function submitOrder(event) {
  event.preventDefault();

  if (!checkoutForm) return;

  const cart = await getCartItems();

  if (!cart.length) {
    showCheckoutMessage('Корзина пуста. Добавьте товары.', 'error');
    return;
  }

  const formData = new FormData(checkoutForm);

  const customerName = formData.get('name')?.toString().trim();
  const customerPhone = formData.get('phone')?.toString().trim();
  const customerAddress = formData.get('address')?.toString().trim();
  const customerEmail = formData.get('email')?.toString().trim();

  if (!customerName || !customerPhone || !customerEmail || !customerAddress) {
    showCheckoutMessage('Заполните все поля формы.', 'error');
    return;
  }

  const phoneDigits = getPhoneDigits(customerPhone);

  if (phoneDigits.length !== 11 || phoneDigits[0] !== '7') {
    showCheckoutMessage('Введите телефон в формате +7 (999) 999-99-99.', 'error');
    return;
  }

  if (!customerEmail.includes('@')) {
    showCheckoutMessage('Введите корректный email.', 'error');
    return;
  }

  const orderTotal = getCartTotal(cart);
  lastOrderTotal = orderTotal;

  const orderPayload = {
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      comment: customerAddress
    },
    items: cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      image: item.image,
      specs: item.specs
    })),
    total: orderTotal
  };

  try {
    showCheckoutMessage('');
    setCheckoutFormState(false);

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка сервера');
    }

    currentOrderId = data?.order?.id || null;
    lastOrderTotal = Number(data?.order?.total) || lastOrderTotal;
    saveOrderIdToLocalStorage(currentOrderId);

    if (window.CartUtils && typeof window.CartUtils.clearCart === 'function') {
      window.CartUtils.clearCart();
    } else {
      localStorage.setItem(CART_STORAGE_KEY, '[]');
    }

    await renderCheckoutItems();

    if (window.updateCartIndicator) {
      window.updateCartIndicator();
    } else {
      updateCartIndicator();
    }

    openPaymentModal(lastOrderTotal, currentOrderId);
  } catch (error) {
    console.error('Ошибка оформления заказа:', error);

    showCheckoutMessage(
      error.message || 'Не удалось оформить заказ. Попробуйте ещё раз.',
      'error'
    );

    setCheckoutFormState(true);
  }
}

/* =========================
   🚀 ЗАПУСК
========================= */
document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutItems();
  setupPhoneMask();

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', submitOrder);
  }

  paymentModalClose?.addEventListener('click', closePaymentModal);
  paymentModalBackdrop?.addEventListener('click', closePaymentModal);
  paymentPaidBtn?.addEventListener('click', markOrderAsPaid);

  openBankBtn?.addEventListener('click', () => {
    if (!PAYMENT_LINK || PAYMENT_LINK === 'https://example.com/payment-link') {
      alert('Сначала вставь свою ссылку оплаты в checkout.js');
      return;
    }

    window.location.href = PAYMENT_LINK;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && paymentModal?.classList.contains('is-open')) {
      closePaymentModal();
    }
  });
});
