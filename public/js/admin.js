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

const componentForm = document.getElementById('component-form');
const componentIdInput = document.getElementById('component-id');
const componentFormTitle = document.getElementById('component-form-title');
const componentCancelEditBtn = document.getElementById('component-cancel-edit-btn');
const componentsList = document.getElementById('components-list');
const componentImagesInput = document.getElementById('component-images');
const componentImagesPreview = document.getElementById('component-images-preview');
const componentTypeSelect = document.getElementById('component-type');
const componentSpecsDynamic = document.getElementById('component-specs-dynamic');

let imageItems = [];
let componentImageItems = [];

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

function parseSpecsJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Ошибка парсинга specsJson:', error);
    return {};
  }
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

function createPreviewItem(item, index, itemsArray, renderFn, altText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-preview-item';

  const img = document.createElement('img');
  img.src = item.type === 'existing' ? item.url : item.previewUrl;
  img.alt = altText;

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
  rightBtn.disabled = index === itemsArray.length - 1;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'admin-preview-remove';
  removeBtn.textContent = '✕';

  leftBtn.addEventListener('click', () => {
    moveItem(itemsArray, index, index - 1);
    renderFn();
  });

  rightBtn.addEventListener('click', () => {
    moveItem(itemsArray, index, index + 1);
    renderFn();
  });

  removeBtn.addEventListener('click', () => {
    const removed = itemsArray[index];

    if (removed?.type === 'new' && removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    itemsArray.splice(index, 1);
    renderFn();
  });

  actions.appendChild(leftBtn);
  actions.appendChild(rightBtn);
  actions.appendChild(removeBtn);

  wrapper.appendChild(img);
  wrapper.appendChild(badge);
  wrapper.appendChild(actions);

  return wrapper;
}

function renderAllPreviews() {
  if (!imagesPreview) return;

  imagesPreview.innerHTML = '';

  imageItems.forEach((item, index) => {
    imagesPreview.appendChild(
      createPreviewItem(item, index, imageItems, renderAllPreviews, 'Фото товара')
    );
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

function renderComponentPreviews() {
  if (!componentImagesPreview) return;

  componentImagesPreview.innerHTML = '';

  componentImageItems.forEach((item, index) => {
    componentImagesPreview.appendChild(
      createPreviewItem(
        item,
        index,
        componentImageItems,
        renderComponentPreviews,
        'Фото комплектующего'
      )
    );
  });
}

componentImagesInput?.addEventListener('change', () => {
  const selectedFiles = Array.from(componentImagesInput.files || []);
  const availableSlots = 10 - componentImageItems.length;

  selectedFiles.slice(0, Math.max(0, availableSlots)).forEach((file) => {
    componentImageItems.push({
      type: 'new',
      file,
      previewUrl: URL.createObjectURL(file)
    });
  });

  componentImagesInput.value = '';
  renderComponentPreviews();
});

function resetForm() {
  if (!adminForm) return;

  adminForm.reset();
  productIdInput.value = '';
  formTitle.textContent = 'Добавить товар';
  imageItems = [];
  renderAllPreviews();
}

function resetComponentForm() {
  if (!componentForm) return;

  componentForm.reset();
  componentIdInput.value = '';
  componentFormTitle.textContent = 'Добавить комплектующее';
  componentImageItems = [];
  renderComponentPreviews();
}

cancelEditBtn?.addEventListener('click', resetForm);
componentCancelEditBtn?.addEventListener('click', resetComponentForm);

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
  document.getElementById('avitoItemId').value = product.avitoItemId || '';
  document.getElementById('avitoUrl').value = product.avitoUrl || '';
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

      item.querySelector('.edit-btn').addEventListener('click', () => {
        fillForm(product);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      item.querySelector('.delete-btn').addEventListener('click', async () => {
        const confirmed = confirm(`Удалить товар "${product.name}"?`);
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(`${API_URL}/${product.id}`, {
            method: 'DELETE'
          });

          const data = await deleteResponse.json().catch(() => ({}));

          if (!deleteResponse.ok) {
            throw new Error(data.error || data.message || 'Ошибка удаления товара');
          }

          await loadProducts();
          resetForm();
        } catch (error) {
          console.error(error);
          alert(error.message || 'Не удалось удалить товар');
        }
      });

      productsList.appendChild(item);
    });
  } catch (error) {
    console.error('Ошибка загрузки списка товаров:', error);
    productsList.innerHTML = '<p>Не удалось загрузить список товаров.</p>';
  }
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
  formData.append('avitoItemId', document.getElementById('avitoItemId')?.value || '');
  formData.append('avitoUrl', document.getElementById('avitoUrl')?.value || '');
  formData.append('description', document.getElementById('description').value);
  formData.append(
    'inStock',
    document.getElementById('inStock').checked ? 'true' : 'false'
  );

  formData.append('componentType', '');
  formData.append('isConfiguratorItem', 'false');
  formData.append('socket', '');
  formData.append('ramType', '');
  formData.append('chipset', '');
  formData.append('formFactor', '');
  formData.append('memoryCapacity', '');
  formData.append('storageType', '');
  formData.append('storageCapacity', '');
  formData.append('powerDraw', '');
  formData.append('recommendedPsu', '');
  formData.append('psuWattage', '');
  formData.append('coolingLevel', '');
  formData.append('supportedSockets', '');
  formData.append('gpuLength', '');
  formData.append('gpuWidth', '');
  formData.append('gpuHeight', '');
  formData.append('specsJson', '');

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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Ошибка сохранения товара');
    }

    resetForm();
    await loadProducts();
    alert(productId ? 'Товар обновлён' : 'Товар добавлен');
  } catch (error) {
    console.error(error);
    alert(error.message || 'Не удалось сохранить товар');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
});