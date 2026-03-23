const checkoutForm = document.getElementById('checkout-form');
const checkoutItemsContainer = document.getElementById('checkout-items');
const checkoutTotalElement = document.getElementById('checkout-total');
const checkoutMessage = document.getElementById('checkout-message');

/* =========================
   🧾 РЕНДЕР ТОВАРОВ
========================= */

function renderCheckoutItems() {
  if (!checkoutItemsContainer || !checkoutTotalElement) return;

  const cart = CartUtils.getCart();

  if (!cart.length) {
    checkoutItemsContainer.innerHTML = `
      <div class="cart-empty">
        <p>В корзине нет товаров.</p>
        <a href="/catalog.html" class="btn btn-gold" style="margin-top: 16px;">
          Перейти в каталог
        </a>
      </div>
    `;

    checkoutTotalElement.textContent = CartUtils.formatPrice(0);

    if (checkoutForm) {
      checkoutForm.style.opacity = '0.6';
      checkoutForm.style.pointerEvents = 'none';
    }

    return;
  }

  if (checkoutForm) {
    checkoutForm.style.opacity = '1';
    checkoutForm.style.pointerEvents = 'auto';
  }

  checkoutItemsContainer.innerHTML = cart.map(item => {
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const subtotal = price * quantity;

    return `
      <div class="checkout-item">
        <div class="checkout-item__left">
          <div class="checkout-item__thumb">
            <img src="${item.image || '/images/logo-glorionpc.png'}" alt="${item.name}">
          </div>

          <div>
            <div class="checkout-item__title">${item.name}</div>
            <div class="checkout-item__meta">
              ${item.category || 'Сборка'} · ${quantity} шт.
            </div>
          </div>
        </div>

        <div class="checkout-item__price">
          ${CartUtils.formatPrice(subtotal)}
        </div>
      </div>
    `;
  }).join('');

  checkoutTotalElement.textContent = CartUtils.formatPrice(
    CartUtils.getCartTotal()
  );
}

/* =========================
   📦 ОТПРАВКА ЗАКАЗА
========================= */

async function submitOrder(event) {
  event.preventDefault();

  if (!checkoutForm) return;

  const cart = CartUtils.getCart();

  if (!cart.length) {
    showCheckoutMessage('Корзина пуста. Добавьте товары.', 'error');
    return;
  }

  const formData = new FormData(checkoutForm);

  const customerName = formData.get('name')?.toString().trim();
  const customerPhone = formData.get('phone')?.toString().trim();
  const customerAddress = formData.get('address')?.toString().trim();

  // простая валидация
  if (!customerName || !customerPhone || !customerAddress) {
    showCheckoutMessage('Заполните все поля формы.', 'error');
    return;
  }

  if (customerPhone.length < 6) {
    showCheckoutMessage('Введите корректный номер телефона.', 'error');
    return;
  }

  const orderPayload = {
    customerName,
    customerPhone,
    customerAddress,
    items: cart.map(item => ({
      productId: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image: item.image || '',
      category: item.category || '',
      cpu: item.cpu || '-',
      gpu: item.gpu || '-',
      ram: item.ram || '-',
      ssd: item.ssd || '-'
    })),
    totalAmount: CartUtils.getCartTotal(),
    createdAt: new Date().toISOString()
  };

  try {
    // 🔒 блокируем форму
    checkoutForm.style.pointerEvents = 'none';
    checkoutForm.style.opacity = '0.6';

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Ошибка сервера');
    }

    CartUtils.clearCart();
    renderCheckoutItems();
    checkoutForm.reset();

    // обновляем кружок
    if (window.updateCartIndicator) {
      updateCartIndicator();
    }

    showCheckoutMessage('Заказ успешно оформлен!', 'success');

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);

  } catch (error) {
    console.error('Ошибка оформления заказа:', error);

    showCheckoutMessage(
      'Не удалось оформить заказ. Попробуйте ещё раз.',
      'error'
    );

    // разблокируем форму обратно
    checkoutForm.style.pointerEvents = 'auto';
    checkoutForm.style.opacity = '1';
  }
}

/* =========================
   💬 СООБЩЕНИЕ
========================= */

function showCheckoutMessage(text, type) {
  if (!checkoutMessage) return;

  checkoutMessage.innerHTML = `
    <div class="checkout-message checkout-message--${type}">
      ${text}
    </div>
  `;
}

/* =========================
   🚀 ЗАПУСК
========================= */

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutItems();

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', submitOrder);
  }
});