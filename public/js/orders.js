const customerOrdersList = document.getElementById('customer-orders-list');

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

function formatDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getStatusText(status) {
  switch (status) {
    case 'new':
      return 'Создан';
    case 'processing':
      return 'В обработке';
    case 'completed':
      return 'Завершён';
    case 'cancelled':
      return 'Отменён';
    default:
      return status || 'Неизвестно';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'new':
      return 'order-status order-status--new';
    case 'processing':
      return 'order-status order-status--processing';
    case 'completed':
      return 'order-status order-status--completed';
    case 'cancelled':
      return 'order-status order-status--cancelled';
    default:
      return 'order-status';
  }
}

function getSavedOrderIds() {
  try {
    return JSON.parse(localStorage.getItem('glorionpc_orders') || '[]');
  } catch (error) {
    console.error('Ошибка чтения заказов из localStorage:', error);
    return [];
  }
}

function renderEmptyState(message) {
  if (!customerOrdersList) return;

  customerOrdersList.innerHTML = `
    <div class="cart-empty">
      <p>${message}</p>
      <a href="/catalog.html" class="btn btn-gold" style="margin-top: 16px;">
        Перейти в каталог
      </a>
    </div>
  `;
}

function renderErrorState(message) {
  if (!customerOrdersList) return;

  customerOrdersList.innerHTML = `
    <div class="cart-empty">
      <p>${message}</p>
      <a href="/catalog.html" class="btn btn-gold" style="margin-top: 16px;">
        Перейти в каталог
      </a>
    </div>
  `;
}

function buildItemsHtml(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<li>Нет данных о товарах</li>';
  }

  return items
    .map((orderItem) => {
      const productName = orderItem.product?.name || 'Товар';
      const quantity = Number(orderItem.quantity) || 0;
      const price = Number(orderItem.price) || 0;

      return `
        <li class="customer-order__product-item">
          <span class="customer-order__product-name">${productName}</span>
          <span class="customer-order__product-meta">${quantity} шт. × ${formatPrice(price)}</span>
        </li>
      `;
    })
    .join('');
}

function createOrderCard(order) {
  const item = document.createElement('article');
  item.className = 'customer-order-card';

  const itemsHtml = buildItemsHtml(order.items);
  const canMarkAsPaid = order.status === 'new';

  item.innerHTML = `
    <div class="customer-order-card__top">
      <div>
        <div class="customer-order-card__label">Заказ</div>
        <h3 class="customer-order-card__title">#${order.id}</h3>
      </div>

      <div class="${getStatusClass(order.status)}">
        ${getStatusText(order.status)}
      </div>
    </div>

    <div class="customer-order-card__grid">
      <div class="customer-order-card__info">
        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Дата</span>
          <span class="customer-order-card__value">${formatDate(order.createdAt)}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Имя</span>
          <span class="customer-order-card__value">${order.customerName || '-'}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Телефон</span>
          <span class="customer-order-card__value">${order.phone || '-'}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Email</span>
          <span class="customer-order-card__value">${order.email || '-'}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Комментарий</span>
          <span class="customer-order-card__value">${order.comment || '-'}</span>
        </div>

        <div class="customer-order-card__row customer-order-card__row--total">
          <span class="customer-order-card__name">Сумма</span>
          <span class="customer-order-card__value">${formatPrice(order.total)}</span>
        </div>
      </div>

      <div class="customer-order-card__products">
        <div class="customer-order-card__subtitle">Состав заказа</div>
        <ul class="customer-order__products-list">
          ${itemsHtml}
        </ul>
      </div>
    </div>

    <div class="customer-order-card__bottom">
      ${
        canMarkAsPaid
          ? `
            <button type="button" class="btn btn-gold btn-small customer-paid-btn">
              Я оплатил
            </button>
          `
          : `
            <div class="customer-order-card__hint">
              ${
                order.status === 'processing'
                  ? 'Оплата отмечена, заказ находится в обработке.'
                  : order.status === 'completed'
                  ? 'Заказ успешно завершён.'
                  : order.status === 'cancelled'
                  ? 'Заказ был отменён.'
                  : ''
              }
            </div>
          `
      }
    </div>
  `;

  const paidBtn = item.querySelector('.customer-paid-btn');

  if (paidBtn) {
    paidBtn.addEventListener('click', async () => {
      try {
        paidBtn.disabled = true;
        paidBtn.textContent = 'Обновляем...';

        const updateResponse = await fetch(`/api/orders/${order.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'processing' })
        });

        const data = await updateResponse.json();

        if (!updateResponse.ok) {
          throw new Error(data.message || 'Не удалось обновить статус');
        }

        await loadCustomerOrders();
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert(error.message || 'Не удалось обновить статус заказа');
        paidBtn.disabled = false;
        paidBtn.textContent = 'Я оплатил';
      }
    });
  }

  return item;
}

async function loadCustomerOrders() {
  if (!customerOrdersList) return;

  const savedOrderIds = getSavedOrderIds();

  if (!savedOrderIds.length) {
    renderEmptyState('У вас пока нет заказов.');
    return;
  }

  customerOrdersList.innerHTML = `
    <div class="orders-loading">Загрузка заказов...</div>
  `;

  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();

    if (!response.ok) {
      throw new Error('Не удалось загрузить заказы');
    }

    const filteredOrders = orders.filter((order) => savedOrderIds.includes(order.id));

    filteredOrders.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    customerOrdersList.innerHTML = '';

    if (!filteredOrders.length) {
      renderEmptyState('Заказы не найдены.');
      return;
    }

    filteredOrders.forEach((order) => {
      const card = createOrderCard(order);
      customerOrdersList.appendChild(card);
    });
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    renderErrorState('Не удалось загрузить заказы.');
  }
}

document.addEventListener('DOMContentLoaded', loadCustomerOrders);