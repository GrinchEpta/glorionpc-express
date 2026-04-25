const profileContainer = document.getElementById('customer-account-profile');
const ordersContainer = document.getElementById('customer-account-orders');
const logoutBtn = document.getElementById('customer-logout-btn');

const statusLabels = {
  new: 'Новый',
  processing: 'В обработке',
  completed: 'Завершен',
  cancelled: 'Отменен'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(Number(value) || 0)} ₽`;
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function revealAccountBlocks() {
  const elements = [
    document.querySelector('.customer-account__top'),
    ...document.querySelectorAll(
      '#customer-account-orders > .customer-order-card, #customer-account-orders > .cart-empty, #customer-account-orders > .checkout-message'
    )
  ].filter(Boolean);

  elements.forEach((element, index) => {
    element.classList.add('reveal');
    element.classList.remove('is-visible');
    element.style.transitionDelay = `${Math.min(index * 80, 240)}ms`;
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elements.forEach((element) => {
        element.classList.add('is-visible');
      });
    });
  });
}

function renderProfile(customer) {
  if (!profileContainer) return;

  profileContainer.innerHTML = `
    <div class="customer-account__profile-title">
      ${escapeHtml(customer?.name || 'Покупатель GlorionPC')}
    </div>
    <div class="customer-account__profile-meta">
      <span>${escapeHtml(customer?.phone || '')}</span>
      ${customer?.email ? `<span>${escapeHtml(customer.email)}</span>` : ''}
    </div>
  `;
}

function renderItems(items = []) {
  if (!items.length) {
    return '<li class="customer-order__product-item">Товары не указаны</li>';
  }

  return items
    .map((item) => {
      const title = item.productName || item.product?.name || 'Товар';
      return `
        <li class="customer-order__product-item">
          <span class="customer-order__product-name">${escapeHtml(title)}</span>
          <span class="customer-order__product-meta">
            ${Number(item.quantity) || 1} шт. x ${formatPrice(item.price)}
          </span>
        </li>
      `;
    })
    .join('');
}

function renderOrderCard(order) {
  return `
    <article class="customer-order-card reveal">
      <div class="customer-order-card__top">
        <div>
          <div class="customer-order-card__label">Заказ</div>
          <h2 class="customer-order-card__title">#${escapeHtml(order.id)}</h2>
        </div>
        <span class="customer-order-card__status">
          ${escapeHtml(statusLabels[order.status] || order.status || 'Новый')}
        </span>
      </div>

      <div class="customer-order-card__grid">
        <div class="customer-order-card__info">
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Дата</span>
            <span class="customer-order-card__value">${formatDate(order.createdAt)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Имя</span>
            <span class="customer-order-card__value">${escapeHtml(order.customerName)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Телефон</span>
            <span class="customer-order-card__value">${escapeHtml(order.phone)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Email</span>
            <span class="customer-order-card__value">${escapeHtml(order.email)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Комментарий</span>
            <span class="customer-order-card__value">${escapeHtml(order.comment || '-')}</span>
          </div>
          <div class="customer-order-card__row customer-order-card__row--total">
            <span class="customer-order-card__name">Сумма</span>
            <span class="customer-order-card__value">${formatPrice(order.total)}</span>
          </div>
        </div>

        <div class="customer-order-card__products">
          <div class="customer-order-card__subtitle">Товары</div>
          <ul class="customer-order__products-list">
            ${renderItems(order.items)}
          </ul>
        </div>
      </div>
    </article>
  `;
}

function renderCustomRequestCard(request) {
  const total = request.budget ? formatPrice(request.budget) : 'Бюджет не указан';

  return `
    <article class="customer-order-card reveal">
      <div class="customer-order-card__top">
        <div>
          <div class="customer-order-card__label">Индивидуальная сборка</div>
          <h2 class="customer-order-card__title">#${escapeHtml(request.id)}</h2>
        </div>
        <span class="customer-order-card__status">
          ${escapeHtml(statusLabels[request.status] || request.status || 'Новый')}
        </span>
      </div>

      <div class="customer-order-card__grid">
        <div class="customer-order-card__info">
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Дата</span>
            <span class="customer-order-card__value">${formatDate(request.createdAt)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Имя</span>
            <span class="customer-order-card__value">${escapeHtml(request.customerName)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Телефон</span>
            <span class="customer-order-card__value">${escapeHtml(request.phone)}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Email</span>
            <span class="customer-order-card__value">${escapeHtml(request.email)}</span>
          </div>
          <div class="customer-order-card__row customer-order-card__row--total">
            <span class="customer-order-card__name">Бюджет</span>
            <span class="customer-order-card__value">${total}</span>
          </div>
        </div>

        <div class="customer-order-card__products">
          <div class="customer-order-card__subtitle">Пожелания</div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Дизайн</span>
            <span class="customer-order-card__value">${escapeHtml(request.designWishes || '-')}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Размер</span>
            <span class="customer-order-card__value">${escapeHtml(request.caseSize || '-')}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Для чего</span>
            <span class="customer-order-card__value">${escapeHtml(request.purpose || '-')}</span>
          </div>
          <div class="customer-order-card__row">
            <span class="customer-order-card__name">Комментарий</span>
            <span class="customer-order-card__value">${escapeHtml(request.comment || '-')}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderOrders(data) {
  if (!ordersContainer) return;

  const orders = data.orders || [];
  const requests = data.customPcRequests || [];

  if (!orders.length && !requests.length) {
    ordersContainer.innerHTML = `
      <div class="cart-empty reveal">
        <p>Заказы пока не найдены.</p>
        <a href="/catalog.html" class="btn btn-gold">Перейти в каталог</a>
      </div>
    `;
    return;
  }

  ordersContainer.innerHTML = [
    ...orders.map(renderOrderCard),
    ...requests.map(renderCustomRequestCard)
  ].join('');
}

async function loadAccount() {
  try {
    const meResponse = await fetch('/api/customer/me');

    if (meResponse.status === 401) {
      window.location.href = '/customer-login.html';
      return;
    }

    const meData = await meResponse.json();

    if (!meResponse.ok) {
      throw new Error(meData.message || 'Не удалось загрузить профиль');
    }

    renderProfile(meData.customer);

    const ordersResponse = await fetch('/api/customer/orders');
    const ordersData = await ordersResponse.json();

    if (!ordersResponse.ok) {
      throw new Error(ordersData.message || 'Не удалось загрузить заказы');
    }

    renderOrders(ordersData);
    revealAccountBlocks();
  } catch (error) {
    if (ordersContainer) {
      ordersContainer.innerHTML = `
        <div class="checkout-message checkout-message--error reveal">
          ${escapeHtml(error.message || 'Не удалось загрузить личный кабинет.')}
        </div>
      `;
      revealAccountBlocks();
    }
  }
}

async function logout() {
  try {
    await fetch('/api/customer/logout', { method: 'POST' });
  } finally {
    localStorage.setItem('glorionpc_cart', '[]');
    localStorage.setItem('glorionpc_orders', '[]');
    localStorage.setItem('glorionpc_custom_pc_requests', '[]');

    if (window.CartUtils && typeof window.CartUtils.clearCart === 'function') {
      window.CartUtils.clearCart();
    }

    if (window.updateCartIndicator) {
      window.updateCartIndicator();
    }
  }

  window.location.href = '/customer-login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAccount();
  logoutBtn?.addEventListener('click', logout);
});
