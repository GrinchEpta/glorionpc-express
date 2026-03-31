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

function getSavedCustomPcRequestIds() {
  try {
    const raw = JSON.parse(
      localStorage.getItem('glorionpc_custom_pc_requests') || '[]'
    );

    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (typeof item === 'number') return item;
        if (item && typeof item === 'object' && item.id) return item.id;
        return null;
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Ошибка чтения заявок на ПК из localStorage:', error);
    return [];
  }
}

function saveValidCustomPcRequestIds(ids) {
  localStorage.setItem(
    'glorionpc_custom_pc_requests',
    JSON.stringify(ids)
  );
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
          <span class="customer-order-card__name">Тип</span>
          <span class="customer-order-card__value">Обычный заказ</span>
        </div>

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

function createCustomPcRequestCard(request) {
  const item = document.createElement('article');
  item.className = 'customer-order-card';

  const caseSizeText =
    request.caseSize === 'mini'
      ? 'Компактный'
      : request.caseSize === 'mid'
      ? 'Средний'
      : request.caseSize === 'full'
      ? 'Большой'
      : request.caseSize === 'any'
      ? 'Без разницы'
      : request.caseSize || '-';

  item.innerHTML = `
    <div class="customer-order-card__top">
      <div>
        <div class="customer-order-card__label">Заявка на ПК</div>
        <h3 class="customer-order-card__title">#${request.id}</h3>
      </div>

      <div class="${getStatusClass(request.status || 'new')}">
        ${getStatusText(request.status || 'new')}
      </div>
    </div>

    <div class="customer-order-card__grid">
      <div class="customer-order-card__info">
        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Тип</span>
          <span class="customer-order-card__value">Индивидуальная сборка ПК</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Дата</span>
          <span class="customer-order-card__value">${formatDate(request.createdAt)}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Имя</span>
          <span class="customer-order-card__value">${request.customerName || '-'}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Телефон</span>
          <span class="customer-order-card__value">${request.phone || '-'}</span>
        </div>

        <div class="customer-order-card__row">
          <span class="customer-order-card__name">Email</span>
          <span class="customer-order-card__value">${request.email || '-'}</span>
        </div>

        <div class="customer-order-card__row customer-order-card__row--total">
          <span class="customer-order-card__name">Бюджет</span>
          <span class="customer-order-card__value">${request.budget ? formatPrice(request.budget) : '-'}</span>
        </div>
      </div>

      <div class="customer-order-card__products">
        <div class="customer-order-card__subtitle">Пожелания по сборке</div>

        <ul class="customer-order__products-list">
          <li class="customer-order__product-item">
            <span class="customer-order__product-name">Дизайн</span>
            <span class="customer-order__product-meta">${request.designWishes || '-'}</span>
          </li>

          <li class="customer-order__product-item">
            <span class="customer-order__product-name">Размер корпуса</span>
            <span class="customer-order__product-meta">${caseSizeText}</span>
          </li>

          <li class="customer-order__product-item">
            <span class="customer-order__product-name">Назначение ПК</span>
            <span class="customer-order__product-meta">${request.purpose || '-'}</span>
          </li>

          <li class="customer-order__product-item">
            <span class="customer-order__product-name">Комментарий</span>
            <span class="customer-order__product-meta">${request.comment || '-'}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="customer-order-card__bottom">
      <div class="customer-order-card__hint">
        ${
          (request.status || 'new') === 'new'
            ? 'Заявка получена. Мы скоро свяжемся с вами для уточнения сборки.'
            : (request.status || 'new') === 'processing'
            ? 'Заявка находится в обработке.'
            : (request.status || 'new') === 'completed'
            ? 'Работа по заявке завершена.'
            : (request.status || 'new') === 'cancelled'
            ? 'Заявка была отменена.'
            : ''
        }
      </div>
    </div>
  `;

  return item;
}

async function loadCustomerOrders() {
  if (!customerOrdersList) return;

  const savedOrderIds = getSavedOrderIds();
  const savedCustomPcRequestIds = getSavedCustomPcRequestIds();

  if (!savedOrderIds.length && !savedCustomPcRequestIds.length) {
    renderEmptyState('У вас пока нет заказов.');
    return;
  }

  customerOrdersList.innerHTML = `
    <div class="orders-loading">Загрузка заказов...</div>
  `;

  try {
    const [ordersResponse, customPcResponse] = await Promise.all([
      fetch('/api/orders'),
      fetch('/api/custom-pc-requests')
    ]);

    const orders = await ordersResponse.json();
    const customPcRequests = await customPcResponse.json();

    if (!ordersResponse.ok) {
      throw new Error('Не удалось загрузить обычные заказы');
    }

    if (!customPcResponse.ok) {
      throw new Error('Не удалось загрузить заявки на ПК');
    }

    const filteredOrders = Array.isArray(orders)
      ? orders.filter((order) => savedOrderIds.includes(order.id))
      : [];

    const filteredCustomPcRequests = Array.isArray(customPcRequests)
      ? customPcRequests.filter((request) =>
          savedCustomPcRequestIds.includes(request.id)
        )
      : [];

    saveValidCustomPcRequestIds(
      filteredCustomPcRequests.map((request) => request.id)
    );

    const mergedItems = [
      ...filteredOrders.map((order) => ({
        type: 'order',
        createdAt: order.createdAt,
        data: order
      })),
      ...filteredCustomPcRequests.map((request) => ({
        type: 'custom-pc',
        createdAt: request.createdAt,
        data: request
      }))
    ];

    mergedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    customerOrdersList.innerHTML = '';

    if (!mergedItems.length) {
      renderEmptyState('Заказы не найдены.');
      return;
    }

    mergedItems.forEach((entry) => {
      const card =
        entry.type === 'order'
          ? createOrderCard(entry.data)
          : createCustomPcRequestCard(entry.data);

      customerOrdersList.appendChild(card);
    });
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    renderErrorState('Не удалось загрузить заказы.');
  }
}

document.addEventListener('DOMContentLoaded', loadCustomerOrders);