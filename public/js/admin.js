const API_URL = '/api/products';

const adminForm = document.getElementById('admin-form');
const productIdInput = document.getElementById('product-id');
const formTitle = document.getElementById('admin-form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productsList = document.getElementById('admin-products-list');
const imagesInput = document.getElementById('images');
const imagesPreview = document.getElementById('admin-images-preview');

let imageItems = [];
// Формат:
// старое фото: { type: 'existing', url: '/images/xxx.jpg' }
// новое фото:  { type: 'new', file: File, previewUrl: 'blob:...' }

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

function resetForm() {
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

  selectedFiles.slice(0, Math.max(0, availableSlots)).forEach(file => {
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
    ? product.images.map(image => ({
        type: 'existing',
        url: image.url
      }))
    : [];

  renderAllPreviews();
}

async function loadProducts() {
  try {
    const response = await fetch(API_URL);
    const products = await response.json();

    productsList.innerHTML = '';

    products.forEach(product => {
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
            <p><strong>CPU:</strong> ${product.cpu || '-'}</p>
            <p><strong>GPU:</strong> ${product.gpu || '-'}</p>
            <p><strong>RAM:</strong> ${product.ram || '-'}</p>
            <p><strong>SSD:</strong> ${product.ssd || '-'}</p>
          </div>
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-secondary btn-small edit-btn">Редактировать</button>
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
          const response = await fetch(`${API_URL}/${product.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
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

adminForm?.addEventListener('submit', async event => {
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
    .filter(item => item.type === 'existing')
    .map(item => item.url);

  formData.append('existingImages', JSON.stringify(existingImageUrls));

  imageItems
    .filter(item => item.type === 'new')
    .forEach(item => {
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

document.addEventListener('DOMContentLoaded', loadProducts);