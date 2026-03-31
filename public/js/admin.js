const API_URL = '/api/products';
const ORDERS_API_URL = '/api/orders';
const CUSTOM_PC_REQUESTS_API_URL = '/api/custom-pc-requests';

const adminForm = document.getElementById('admin-form');
const productIdInput = document.getElementById('product-id');
const formTitle = document.getElementById('admin-form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productsList = document.getElementById('admin-products-list');
const ordersList = document.getElementById('admin-orders-list');
const adminCustomPcRequestsList = document.getElementById('admin-custom-pc-requests-list');
const imagesInput = document.getElementById('images');
const imagesPreview = document.getElementById('admin-images-preview');

let imageItems = [];

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

function formatAdminDate(dateString) {
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
      return 'Новый';
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

function getAdminStatusText(status) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'processing':
      return 'В обработке';
    case 'completed':
      return 'Завершена';
    case 'cancelled':
      return 'Отменена';
    default:
      return status || 'Неизвестно';
  }
}

function getAdminStatusClass(status) {
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

function resetForm() {
  if (!adminForm) return;

  adminForm.reset();
  productIdInput.value = '';
  formTitle.textContent = 'Добавить товар';
  imageItems = [];
  renderAllPreviews();
}

function moveItem(array, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= array.length ||
    toIndex >= array.length
  ) {
    return;
  }

  const [moved] = array.splice(fromIndex, 1);
  array.splice(toIndex, 0, moved);
}

function renderAllPreviews() {
  if (!imagesPreview) return;

  imagesPreview.innerHTML = '';

  imageItems.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'admin-preview-item';

    const img = document.createElement('img');
    img.src = item.type === 'existing' ? item.url : item.previewUrl;
    img.alt = 'Фото товара';

    const badge = document.createElement('div');
    badge.className = `admin-preview-badge ${index === 0 ? 'is-main' : ''}`;
    badge.textContent = index === 0 ? 'Главное' : String(index + 1);

    const actions = document.createElement('div');
    actions.className = 'admin-preview-actions';

    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'admin-preview-move';
    leftBtn.textContent = '←';
    leftBtn.disabled = index === 0;

    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'admin-preview-move';
    rightBtn.textContent = '→';
    rightBtn.disabled = index === imageItems.length - 1;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'admin-preview-remove';
    removeBtn.textContent = '✕';

    leftBtn.addEventListener('click', () => {
      moveItem(imageItems, index, index - 1);
      renderAllPreviews();
    });

    rightBtn.addEventListener('click', () => {
      moveItem(imageItems, index, index + 1);
      renderAllPreviews();
    });

    removeBtn.addEventListener('click', () => {
      const removed = imageItems[index];

      if (removed?.type === 'new' && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      imageItems.splice(index, 1);
      renderAllPreviews();
    });

    actions.appendChild(leftBtn);
    actions.appendChild(rightBtn);
    actions.appendChild(removeBtn);

    wrapper.appendChild(img);
    wrapper.appendChild(badge);
    wrapper.appendChild(actions);

    imagesPreview.appendChild(wrapper);
  });
}

imagesInput?.addEventListener('change', () => {
  const selectedFiles = Array.from(imagesInput.files || []);
  const availableSlots = 10 - imageItems.length;

  selectedFiles.slice(0, Math.max(0, availableSlots)).forEach((file) => {
    imageItems.push({
      type: 'new',
      file,
      previewUrl: URL.createObjectURL(file)
    });
  });

  imagesInput.value = '';
  renderAllPreviews();
});

cancelEditBtn?.addEventListener('click', () => {
  resetForm();
});

function fillForm(product) {
  productIdInput.value = product.id || '';
  document.getElementById('name').value = product.name || '';
  document.getElementById('category').value = product.category || '';
  document.getElementById('price').value = product.price || '';
  document.getElementById('oldPrice').value = product.oldPrice || '';
  document.getElementById('cpu').value = product.cpu || '';
  document.getElementById('gpu').value = product.gpu || '';
  document.getElementById('ram').value = product.ram || '';
  document.getElementById('ssd').value = product.ssd || '';
  document.getElementById('description').value = product.description || '';
  document.getElementById('inStock').checked = Boolean(product.inStock);

  formTitle.textContent = 'Редактировать товар';

  imageItems = Array.isArray(product.images)
    ? product.images.map((image) => ({
        type: 'existing',
        url: image.url
      }))
    : [];

  renderAllPreviews();
}

async function loadProducts() {
  if (!productsList) return;

  try {
    const response = await fetch(API_URL);
    const products = await response.json();

    productsList.innerHTML = '';

    if (!Array.isArray(products) || !products.length) {
      productsList.innerHTML = '<p>Товаров пока нет.</p>';
      return;
    }

    products.forEach((product) => {
      const item = document.createElement('div');
      item.className = 'admin-item';

      const firstImage =
        product.images?.[0]?.url ||
        product.image ||
        '/images/logo-glorionpc.png';

      item.innerHTML = `
        <div class="admin-product-row">
          <div class="admin-product-thumb">
            <img src="${firstImage}" alt="${product.name}">
          </div>

          <div class="admin-item__content">
            <h3>${product.name}</h3>
            <p><strong>Категория:</strong> ${product.category || '-'}</p>
            <p><strong>Цена:</strong> ${formatPrice(product.price)}</p>
            <p><strong>Старая цена:</strong> ${product.oldPrice ? formatPrice(product.oldPrice) : '-'}</p>
            <p><strong>CPU:</strong> ${product.cpu || '-'}</p>
            <p><strong>GPU:</strong> ${product.gpu || '-'}</p>
            <p><strong>RAM:</strong> ${product.ram || '-'}</p>
            <p><strong>SSD:</strong> ${product.ssd || '-'}</p>
            <p><strong>Описание:</strong> ${product.description || '-'}</p>
            <p><strong>В наличии:</strong> ${product.inStock ? 'Да' : 'Нет'}</p>
          </div>
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-gold btn-small edit-btn">Редактировать</button>
          <button type="button" class="btn btn-secondary btn-small delete-btn">Удалить</button>
        </div>
      `;

      const editBtn = item.querySelector('.edit-btn');
      const deleteBtn = item.querySelector('.delete-btn');

      editBtn.addEventListener('click', () => {
        fillForm(product);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm(`Удалить товар "${product.name}"?`);
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(`${API_URL}/${product.id}`, {
            method: 'DELETE'
          });

          if (!deleteResponse.ok) {
            throw new Error('Ошибка удаления');
          }

          await loadProducts();
          resetForm();
        } catch (error) {
          console.error(error);
          alert('Не удалось удалить товар');
        }
      });

      productsList.appendChild(item);
    });
  } catch (error) {
    console.error('Ошибка загрузки списка товаров:', error);
    productsList.innerHTML = '<p>Не удалось загрузить список товаров.</p>';
  }
}

async function loadOrders() {
  if (!ordersList) return;

  try {
    const response = await fetch(ORDERS_API_URL);
    const orders = await response.json();

    ordersList.innerHTML = '';

    if (!Array.isArray(orders) || !orders.length) {
      ordersList.innerHTML = '<p>Заказов пока нет.</p>';
      return;
    }

    orders.forEach((order) => {
      const item = document.createElement('div');
      item.className = 'admin-item';

      const itemsHtml = Array.isArray(order.items)
        ? order.items
            .map((orderItem) => {
              const productName = orderItem.product?.name || 'Товар';
              return `<li>${productName} — ${orderItem.quantity} шт. × ${formatPrice(orderItem.price)}</li>`;
            })
            .join('')
        : '';

      item.innerHTML = `
        <div class="admin-item__content">
          <h3>Заказ #${order.id}</h3>
          <p><strong>Дата:</strong> ${formatAdminDate(order.createdAt)}</p>
          <p><strong>Имя:</strong> ${order.customerName || '-'}</p>
          <p><strong>Телефон:</strong> ${order.phone || '-'}</p>
          <p><strong>Email:</strong> ${order.email || '-'}</p>
          <p><strong>Комментарий:</strong> ${order.comment || '-'}</p>
          <p><strong>Сумма:</strong> ${formatPrice(order.total)}</p>
          <p>
            <strong>Статус:</strong>
            <span class="${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
          </p>

          <div class="admin-order-items">
            <strong>Товары:</strong>
            <ul>${itemsHtml}</ul>
          </div>

          <div class="admin-order-status">
            <select class="order-status-select">
              <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершён</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменён</option>
            </select>
          </div>
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-secondary btn-small delete-order-btn">
            Удалить заказ
          </button>
        </div>
      `;

      const select = item.querySelector('.order-status-select');
      const deleteBtn = item.querySelector('.delete-order-btn');

      select.addEventListener('change', async () => {
        try {
          const updateResponse = await fetch(`${ORDERS_API_URL}/${order.id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: select.value })
          });

          if (!updateResponse.ok) {
            throw new Error('Не удалось обновить статус');
          }

          await loadOrders();
        } catch (error) {
          console.error(error);
          alert('Не удалось обновить статус заказа');
        }
      });

      deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm(`Удалить заказ #${order.id}?`);
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(`${ORDERS_API_URL}/${order.id}`, {
            method: 'DELETE'
          });

          const data = await deleteResponse.json();

          if (!deleteResponse.ok) {
            throw new Error(data.message || 'Не удалось удалить заказ');
          }

          await loadOrders();
        } catch (error) {
          console.error(error);
          alert(error.message || 'Не удалось удалить заказ');
        }
      });

      ordersList.appendChild(item);
    });
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    ordersList.innerHTML = '<p>Не удалось загрузить заказы.</p>';
  }
}

async function loadCustomPcRequests() {
  if (!adminCustomPcRequestsList) return;

  try {
    const response = await fetch(CUSTOM_PC_REQUESTS_API_URL);
    const requests = await response.json();

    if (!response.ok) {
      throw new Error('Не удалось загрузить заявки на ПК');
    }

    adminCustomPcRequestsList.innerHTML = '';

    if (!Array.isArray(requests) || !requests.length) {
      adminCustomPcRequestsList.innerHTML = '<p>Заявок на ПК пока нет.</p>';
      return;
    }

    requests.forEach((request) => {
      const item = document.createElement('div');
      item.className = 'admin-item';

      item.innerHTML = `
        <div class="admin-item__content">
          <h3>Заявка #${request.id}</h3>
          <p><strong>Дата:</strong> ${formatAdminDate(request.createdAt)}</p>
          <p><strong>Имя:</strong> ${request.customerName || '-'}</p>
          <p><strong>Телефон:</strong> ${request.phone || '-'}</p>
          <p><strong>Email:</strong> ${request.email || '-'}</p>
          <p><strong>Бюджет:</strong> ${
            request.budget
              ? new Intl.NumberFormat('ru-RU').format(request.budget) + ' ₽'
              : '-'
          }</p>
          <p><strong>Дизайн:</strong> ${request.designWishes || '-'}</p>
          <p><strong>Размер корпуса:</strong> ${request.caseSize || '-'}</p>
          <p><strong>Назначение:</strong> ${request.purpose || '-'}</p>
          <p><strong>Комментарий:</strong> ${request.comment || '-'}</p>
          <p>
            <strong>Статус:</strong>
            <span class="${getAdminStatusClass(request.status)}">${getAdminStatusText(request.status)}</span>
          </p>

          <div class="admin-order-status">
            <select class="order-status-select">
              <option value="new" ${request.status === 'new' ? 'selected' : ''}>Новая</option>
              <option value="processing" ${request.status === 'processing' ? 'selected' : ''}>В обработке</option>
              <option value="completed" ${request.status === 'completed' ? 'selected' : ''}>Завершена</option>
              <option value="cancelled" ${request.status === 'cancelled' ? 'selected' : ''}>Отменена</option>
            </select>
          </div>
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-secondary btn-small delete-custom-pc-request-btn">
            Удалить
          </button>
        </div>
      `;

      const statusSelect = item.querySelector('.order-status-select');
      const deleteBtn = item.querySelector('.delete-custom-pc-request-btn');

      statusSelect.addEventListener('change', async () => {
        try {
          const updateResponse = await fetch(
            `${CUSTOM_PC_REQUESTS_API_URL}/${request.id}/status`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: statusSelect.value })
            }
          );

          const data = await updateResponse.json();

          if (!updateResponse.ok) {
            throw new Error(data.message || 'Не удалось обновить статус');
          }

          await loadCustomPcRequests();
        } catch (error) {
          console.error('Ошибка обновления статуса заявки:', error);
          alert(error.message || 'Не удалось обновить статус заявки');
        }
      });

      deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm(`Удалить заявку #${request.id}?`);
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(
            `${CUSTOM_PC_REQUESTS_API_URL}/${request.id}`,
            {
              method: 'DELETE'
            }
          );

          const data = await deleteResponse.json();

          if (!deleteResponse.ok) {
            throw new Error(data.message || 'Не удалось удалить заявку');
          }

          await loadCustomPcRequests();
        } catch (error) {
          console.error('Ошибка удаления заявки:', error);
          alert(error.message || 'Не удалось удалить заявку');
        }
      });

      adminCustomPcRequestsList.appendChild(item);
    });
  } catch (error) {
    console.error('Ошибка загрузки заявок на ПК:', error);
    adminCustomPcRequestsList.innerHTML = '<p>Не удалось загрузить заявки на ПК.</p>';
  }
}

function setupAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const sections = document.querySelectorAll('.admin-section');

  if (!tabs.length || !sections.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((button) => button.classList.remove('active'));
      tab.classList.add('active');

      sections.forEach((section) => {
        section.classList.remove('active');

        if (section.id === `tab-${target}`) {
          section.classList.add('active');
        }
      });
    });
  });
}

adminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData();

  formData.append('name', document.getElementById('name').value);
  formData.append('category', document.getElementById('category').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('oldPrice', document.getElementById('oldPrice').value);
  formData.append('cpu', document.getElementById('cpu').value);
  formData.append('gpu', document.getElementById('gpu').value);
  formData.append('ram', document.getElementById('ram').value);
  formData.append('ssd', document.getElementById('ssd').value);
  formData.append('description', document.getElementById('description').value);
  formData.append(
    'inStock',
    document.getElementById('inStock').checked ? 'true' : 'false'
  );

  const existingImageUrls = imageItems
    .filter((item) => item.type === 'existing')
    .map((item) => item.url);

  formData.append('existingImages', JSON.stringify(existingImageUrls));

  imageItems
    .filter((item) => item.type === 'new')
    .forEach((item) => {
      formData.append('images', item.file);
    });

  const productId = productIdInput.value;
  const method = productId ? 'PUT' : 'POST';
  const url = productId ? `${API_URL}/${productId}` : API_URL;

  try {
    const response = await fetch(url, {
      method,
      body: formData
    });

    if (!response.ok) {
      throw new Error('Ошибка сохранения товара');
    }

    resetForm();
    await loadProducts();
    alert(productId ? 'Товар обновлён' : 'Товар добавлен');
  } catch (error) {
    console.error(error);
    alert('Не удалось сохранить товар');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  setupAdminTabs();
  await loadProducts();
  await loadOrders();
  await loadCustomPcRequests();
});