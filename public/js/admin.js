const API_URL = '/api/products';
const ORDERS_API_URL = '/api/orders';
const CUSTOM_PC_REQUESTS_API_URL = '/api/custom-pc-requests';

/* =========================
   MAIN ADMIN NODES
========================= */
const adminForm = document.getElementById('admin-form');
const productIdInput = document.getElementById('product-id');
const formTitle = document.getElementById('admin-form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productsList = document.getElementById('admin-products-list');
const ordersList = document.getElementById('admin-orders-list');
const adminCustomPcRequestsList = document.getElementById('admin-custom-pc-requests-list');
const imagesInput = document.getElementById('images');
const imagesPreview = document.getElementById('admin-images-preview');

/* =========================
   COMPONENTS TAB NODES
========================= */
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

/* =========================
   HELPERS
========================= */
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

function getRadiatorSizeLabel(value) {
  const num = Number(value);

  if (num === 0) return 'Нет поддержки СЖО';
  if (!Number.isFinite(num) || !num) return '-';

  return `${num} мм`;
}

/* =========================
   PRODUCT PREVIEWS
========================= */
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

/* =========================
   COMPONENT PREVIEWS
========================= */
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

/* =========================
   RESET FORMS
========================= */
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

  const inStock = document.getElementById('component-in-stock');
  const useInConfigurator = document.getElementById('component-is-configurator-item');
  if (inStock) inStock.checked = true;
  if (useInConfigurator) useInConfigurator.checked = true;

  renderSpecsFields('');
}

cancelEditBtn?.addEventListener('click', resetForm);
componentCancelEditBtn?.addEventListener('click', resetComponentForm);

/* =========================
   DYNAMIC SPECS FIELDS
========================= */
function renderSpecsFields(type, values = {}) {
  if (!componentSpecsDynamic) return;

  let html = '';

  if (type === 'cpu') {
    html = `
      <div class="admin-block">
        <h2>Параметры процессора</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-pcieVersion">Версия PCI Express</label>
            <input type="text" id="spec-pcieVersion" value="${values.pcieVersion || ''}" placeholder="5.0" />
          </div>
          <div class="form-group">
            <label for="spec-socket">Сокет</label>
            <input type="text" id="spec-socket" value="${values.socket || ''}" placeholder="AM5 / LGA1700" />
          </div>
          <div class="form-group">
            <label for="spec-maxTdp">Максимальный TDP</label>
            <input type="number" id="spec-maxTdp" value="${values.maxTdp || ''}" placeholder="120" />
          </div>
          <div class="form-group">
            <label for="spec-cores">Количество ядер</label>
            <input type="number" id="spec-cores" value="${values.cores || ''}" placeholder="8" />
          </div>
          <div class="form-group">
            <label for="spec-threads">Количество потоков</label>
            <input type="number" id="spec-threads" value="${values.threads || ''}" placeholder="16" />
          </div>
          <div class="form-group">
            <label for="spec-maxFrequency">Максимальная частота</label>
            <input type="text" id="spec-maxFrequency" value="${values.maxFrequency || ''}" placeholder="5.4 GHz" />
          </div>
          <div class="form-group">
            <label for="spec-ramType">Тип оперативной памяти</label>
            <input type="text" id="spec-ramType" value="${values.ramType || ''}" placeholder="DDR5" />
          </div>
          <div class="form-group">
            <label for="spec-releaseYear">Год релиза</label>
            <input type="number" id="spec-releaseYear" value="${values.releaseYear || ''}" placeholder="2024" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'motherboard') {
    html = `
      <div class="admin-block">
        <h2>Параметры материнской платы</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-pcieVersion">Версия PCI Express</label>
            <input type="text" id="spec-pcieVersion" value="${values.pcieVersion || ''}" placeholder="5.0" />
          </div>
          <div class="form-group">
            <label for="spec-socket">Сокет</label>
            <input type="text" id="spec-socket" value="${values.socket || ''}" placeholder="AM5 / LGA1700" />
          </div>
          <div class="form-group">
            <label for="spec-maxTdp">Максимальный TDP</label>
            <input type="number" id="spec-maxTdp" value="${values.maxTdp || ''}" placeholder="170" />
          </div>
          <div class="form-group">
            <label for="spec-ramType">Тип оперативной памяти</label>
            <input type="text" id="spec-ramType" value="${values.ramType || ''}" placeholder="DDR5" />
          </div>
          <div class="form-group">
            <label for="spec-releaseYear">Год релиза</label>
            <input type="number" id="spec-releaseYear" value="${values.releaseYear || ''}" placeholder="2024" />
          </div>
          <div class="form-group">
            <label for="spec-chipset">Чипсет</label>
            <input type="text" id="spec-chipset" value="${values.chipset || ''}" placeholder="B650 / Z790" />
          </div>
          <div class="form-group">
            <label for="spec-formFactor">Форм-фактор</label>
            <input type="text" id="spec-formFactor" value="${values.formFactor || ''}" placeholder="ATX / mATX / ITX" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'psu') {
    html = `
      <div class="admin-block">
        <h2>Параметры блока питания</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-maxPower">Максимальная мощность</label>
            <input type="number" id="spec-maxPower" value="${values.maxPower || ''}" placeholder="750" />
          </div>
          <div class="form-group">
            <label for="spec-atxVersion">Версия ATX</label>
            <input type="text" id="spec-atxVersion" value="${values.atxVersion || ''}" placeholder="ATX 3.0" />
          </div>
          <div class="form-group">
            <label for="spec-modularity">Модульность</label>
            <select id="spec-modularity">
              <option value="">Выберите</option>
              <option value="non-modular" ${values.modularity === 'non-modular' ? 'selected' : ''}>Не модульный</option>
              <option value="semi-modular" ${values.modularity === 'semi-modular' ? 'selected' : ''}>Полумодульный</option>
              <option value="modular" ${values.modularity === 'modular' ? 'selected' : ''}>Полностью модульный</option>
            </select>
          </div>
          <div class="form-group">
            <label for="spec-certificate">Сертификат</label>
            <input type="text" id="spec-certificate" value="${values.certificate || ''}" placeholder="80+ Gold" />
          </div>
          <div class="form-group">
            <label for="spec-psuFormFactor">Форм-фактор БП</label>
            <input type="text" id="spec-psuFormFactor" value="${values.psuFormFactor || ''}" placeholder="ATX / SFX" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'gpu') {
    html = `
      <div class="admin-block">
        <h2>Параметры видеокарты</h2>
        <div class="admin-form">
          <div class="form-group">
            <label>Максимальный TDP</label>
            <input type="number" id="spec-maxTdp" value="${values.maxTdp || ''}" />
          </div>

          <div class="form-group">
            <label>Частота GPU</label>
            <input type="text" id="spec-maxGpuFrequency" value="${values.maxGpuFrequency || ''}" />
          </div>

          <div class="form-group">
            <label>Видеопамять</label>
            <input type="text" id="spec-vram" value="${values.vram || ''}" />
          </div>

          <div class="form-group">
            <label>PCI Express</label>
            <input type="text" id="spec-pcieVersion" value="${values.pcieVersion || ''}" />
          </div>

          <div class="form-group">
            <label>Тип памяти</label>
            <input type="text" id="spec-memoryType" value="${values.memoryType || ''}" />
          </div>

          <div class="form-group">
            <label>Шина памяти</label>
            <input type="text" id="spec-memoryBus" value="${values.memoryBus || ''}" />
          </div>

          <div class="form-group">
            <label>Питание</label>
            <input type="text" id="spec-powerConnector" value="${values.powerConnector || ''}" />
          </div>

          <div class="form-group">
            <label>Год</label>
            <input type="number" id="spec-releaseYear" value="${values.releaseYear || ''}" />
          </div>

          <div class="form-group">
            <label>Длина (мм)</label>
            <input type="number" id="spec-gpuLength" value="${values.gpuLength || ''}" />
          </div>

          <div class="form-group">
            <label>Ширина (мм)</label>
            <input type="number" id="spec-gpuWidth" value="${values.gpuWidth || ''}" />
          </div>

          <div class="form-group">
            <label>Высота (мм)</label>
            <input type="number" id="spec-gpuHeight" value="${values.gpuHeight || ''}" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'ram') {
    html = `
      <div class="admin-block">
        <h2>Параметры оперативной памяти</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-ramType">Тип памяти</label>
            <input type="text" id="spec-ramType" value="${values.ramType || ''}" placeholder="DDR4 / DDR5" />
          </div>
          <div class="form-group">
            <label for="spec-memoryFrequency">Частота памяти</label>
            <input type="text" id="spec-memoryFrequency" value="${values.memoryFrequency || ''}" placeholder="6000 MHz" />
          </div>
          <div class="form-group">
            <label for="spec-latency">Задержки памяти CL</label>
            <input type="text" id="spec-latency" value="${values.latency || ''}" placeholder="CL30" />
          </div>
          <div class="form-group">
            <label for="spec-moduleSize">Объём одного модуля</label>
            <input type="text" id="spec-moduleSize" value="${values.moduleSize || ''}" placeholder="16 GB" />
          </div>
          <div class="form-group">
            <label for="spec-kitSize">Объём комплекта</label>
            <input type="text" id="spec-kitSize" value="${values.kitSize || ''}" placeholder="32 GB" />
          </div>
          <div class="form-group">
            <label for="spec-modulesCount">Количество модулей</label>
            <input type="number" id="spec-modulesCount" value="${values.modulesCount || ''}" placeholder="2" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'storage') {
    html = `
      <div class="admin-block">
        <h2>Параметры накопителя</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-readSpeed">Скорость чтения</label>
            <input type="text" id="spec-readSpeed" value="${values.readSpeed || ''}" placeholder="7000 MB/s" />
          </div>
          <div class="form-group">
            <label for="spec-writeSpeed">Скорость записи</label>
            <input type="text" id="spec-writeSpeed" value="${values.writeSpeed || ''}" placeholder="5000 MB/s" />
          </div>
          <div class="form-group">
            <label for="spec-capacity">Объём</label>
            <input type="text" id="spec-capacity" value="${values.capacity || ''}" placeholder="1 TB / 2 TB / 4 TB" />
          </div>
          <div class="form-group">
            <label for="spec-connectionType">Тип подключения</label>
            <input type="text" id="spec-connectionType" value="${values.connectionType || ''}" placeholder="SATA / NVMe" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'cooler') {
    html = `
      <div class="admin-block">
        <h2>Параметры охлаждения CPU</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-coolingType">Тип охлаждения</label>
            <select id="spec-coolingType">
              <option value="">Выберите</option>
              <option value="air" ${values.coolingType === 'air' ? 'selected' : ''}>Воздушное</option>
              <option value="liquid" ${values.coolingType === 'liquid' ? 'selected' : ''}>Жидкостное</option>
            </select>
          </div>

          <div class="form-group">
            <label for="spec-radiatorSize">Размер радиатора СЖО (мм)</label>
            <select id="spec-radiatorSize">
              <option value="">Выберите</option>
              <option value="120" ${String(values.radiatorSize) === '120' ? 'selected' : ''}>120 мм</option>
              <option value="140" ${String(values.radiatorSize) === '140' ? 'selected' : ''}>140 мм</option>
              <option value="240" ${String(values.radiatorSize) === '240' ? 'selected' : ''}>240 мм</option>
              <option value="280" ${String(values.radiatorSize) === '280' ? 'selected' : ''}>280 мм</option>
              <option value="360" ${String(values.radiatorSize) === '360' ? 'selected' : ''}>360 мм</option>
              <option value="420" ${String(values.radiatorSize) === '420' ? 'selected' : ''}>420 мм</option>
            </select>
          </div>

          <div class="form-group">
            <label for="spec-maxTdp">Максимальная рассеиваемая мощность</label>
            <input type="number" id="spec-maxTdp" value="${values.maxTdp || ''}" placeholder="250" />
          </div>

          <div class="form-group">
            <label for="spec-supportedSockets">Поддерживаемые сокеты</label>
            <input type="text" id="spec-supportedSockets" value="${values.supportedSockets || ''}" placeholder="AM4,AM5,LGA1700" />
          </div>

          <div class="form-group">
            <label for="spec-maxFanSpeed">Максимальная скорость вентиляторов</label>
            <input type="text" id="spec-maxFanSpeed" value="${values.maxFanSpeed || ''}" placeholder="2200 RPM" />
          </div>

          <div class="form-group">
            <label for="spec-rgb">Подсветка</label>
            <select id="spec-rgb">
              <option value="">Выберите</option>
              <option value="true" ${values.rgb === true || values.rgb === 'true' ? 'selected' : ''}>Есть</option>
              <option value="false" ${values.rgb === false || values.rgb === 'false' ? 'selected' : ''}>Нет</option>
            </select>
          </div>

          <div class="form-group">
            <label for="spec-motherboardConnector">Подключение к мат. плате</label>
            <input type="text" id="spec-motherboardConnector" value="${values.motherboardConnector || ''}" placeholder="3-pin / 4-pin" />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'case') {
    html = `
      <div class="admin-block">
        <h2>Параметры корпуса</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-supportedMotherboardFormFactors">Совместимые форм-факторы мат. плат</label>
            <input
              type="text"
              id="spec-supportedMotherboardFormFactors"
              value="${values.supportedMotherboardFormFactors || ''}"
              placeholder="ATX,mATX,ITX"
            />
          </div>

          <div class="form-group">
            <label for="spec-maxRadiatorSize">Максимальный размер радиатора СЖО (мм)</label>
            <select id="spec-maxRadiatorSize">
              <option value="">Выберите</option>
              <option value="0" ${String(values.maxRadiatorSize) === '0' ? 'selected' : ''}>Нет поддержки СЖО</option>
              <option value="120" ${String(values.maxRadiatorSize) === '120' ? 'selected' : ''}>120 мм</option>
              <option value="140" ${String(values.maxRadiatorSize) === '140' ? 'selected' : ''}>140 мм</option>
              <option value="240" ${String(values.maxRadiatorSize) === '240' ? 'selected' : ''}>240 мм</option>
              <option value="280" ${String(values.maxRadiatorSize) === '280' ? 'selected' : ''}>280 мм</option>
              <option value="360" ${String(values.maxRadiatorSize) === '360' ? 'selected' : ''}>360 мм</option>
              <option value="420" ${String(values.maxRadiatorSize) === '420' ? 'selected' : ''}>420 мм</option>
            </select>
          </div>

          <div class="form-group">
            <label for="spec-includedFans">Вентиляторы в комплекте</label>
            <input
              type="number"
              id="spec-includedFans"
              value="${values.includedFans || ''}"
              placeholder="4"
            />
          </div>

          <div class="form-group">
            <label for="spec-fansConnector">Тип подключения вентиляторов</label>
            <input
              type="text"
              id="spec-fansConnector"
              value="${values.fansConnector || ''}"
              placeholder="3-pin / 4-pin"
            />
          </div>

          <div class="form-group">
            <label for="spec-lightingType">Тип подсветки</label>
            <input
              type="text"
              id="spec-lightingType"
              value="${values.lightingType || ''}"
              placeholder="ARGB / RGB / Без подсветки"
            />
          </div>

          <div class="form-group">
            <label for="spec-supportedPsuFormFactors">Совместимость блока питания</label>
            <input
              type="text"
              id="spec-supportedPsuFormFactors"
              value="${values.supportedPsuFormFactors || ''}"
              placeholder="ATX,SFX"
            />
          </div>

          <div class="form-group">
            <label for="spec-width">Ширина корпуса (мм)</label>
            <input
              type="number"
              id="spec-width"
              value="${values.width || ''}"
              placeholder="230"
            />
          </div>

          <div class="form-group">
            <label for="spec-height">Высота корпуса (мм)</label>
            <input
              type="number"
              id="spec-height"
              value="${values.height || ''}"
              placeholder="480"
            />
          </div>

          <div class="form-group">
            <label for="spec-length">Длина корпуса (мм)</label>
            <input
              type="number"
              id="spec-length"
              value="${values.length || ''}"
              placeholder="450"
            />
          </div>

          <div class="form-group">
            <label for="spec-maxGpuLength">Максимальная длина видеокарты (мм)</label>
            <input
              type="number"
              id="spec-maxGpuLength"
              value="${values.maxGpuLength || ''}"
              placeholder="255"
            />
          </div>

          <div class="form-group">
            <label for="spec-maxGpuWidth">Максимальная ширина видеокарты (мм)</label>
            <input
              type="number"
              id="spec-maxGpuWidth"
              value="${values.maxGpuWidth || ''}"
              placeholder="140"
            />
          </div>

          <div class="form-group">
            <label for="spec-maxGpuHeight">Максимальная высота видеокарты (мм)</label>
            <input
              type="number"
              id="spec-maxGpuHeight"
              value="${values.maxGpuHeight || ''}"
              placeholder="50"
            />
          </div>
        </div>
      </div>
    `;
  } else if (type === 'fans') {
    html = `
      <div class="admin-block">
        <h2>Параметры вентиляторов</h2>
        <div class="admin-form">
          <div class="form-group">
            <label for="spec-maxFanSpeed">Максимальная скорость</label>
            <input type="text" id="spec-maxFanSpeed" value="${values.maxFanSpeed || ''}" placeholder="1800 RPM" />
          </div>
          <div class="form-group">
            <label for="spec-rgb">Подсветка</label>
            <select id="spec-rgb">
              <option value="">Выберите</option>
              <option value="true" ${values.rgb === true || values.rgb === 'true' ? 'selected' : ''}>Есть</option>
              <option value="false" ${values.rgb === false || values.rgb === 'false' ? 'selected' : ''}>Нет</option>
            </select>
          </div>
          <div class="form-group">
            <label for="spec-motherboardConnector">Подключение к мат. плате</label>
            <input type="text" id="spec-motherboardConnector" value="${values.motherboardConnector || ''}" placeholder="3-pin / 4-pin" />
          </div>
        </div>
      </div>
    `;
  }

  componentSpecsDynamic.innerHTML = html;
}

function getSpecsFromForm(type) {
  if (type === 'cpu') {
    return {
      pcieVersion: document.getElementById('spec-pcieVersion')?.value || '',
      socket: document.getElementById('spec-socket')?.value || '',
      maxTdp: Number(document.getElementById('spec-maxTdp')?.value) || null,
      cores: Number(document.getElementById('spec-cores')?.value) || null,
      threads: Number(document.getElementById('spec-threads')?.value) || null,
      maxFrequency: document.getElementById('spec-maxFrequency')?.value || '',
      ramType: document.getElementById('spec-ramType')?.value || '',
      releaseYear: Number(document.getElementById('spec-releaseYear')?.value) || null
    };
  }

  if (type === 'motherboard') {
    return {
      pcieVersion: document.getElementById('spec-pcieVersion')?.value || '',
      socket: document.getElementById('spec-socket')?.value || '',
      maxTdp: Number(document.getElementById('spec-maxTdp')?.value) || null,
      ramType: document.getElementById('spec-ramType')?.value || '',
      releaseYear: Number(document.getElementById('spec-releaseYear')?.value) || null,
      chipset: document.getElementById('spec-chipset')?.value || '',
      formFactor: document.getElementById('spec-formFactor')?.value || ''
    };
  }

  if (type === 'psu') {
    return {
      maxPower: Number(document.getElementById('spec-maxPower')?.value) || null,
      atxVersion: document.getElementById('spec-atxVersion')?.value || '',
      modularity: document.getElementById('spec-modularity')?.value || '',
      certificate: document.getElementById('spec-certificate')?.value || '',
      psuFormFactor: document.getElementById('spec-psuFormFactor')?.value || ''
    };
  }

  if (type === 'gpu') {
    return {
      maxTdp: Number(document.getElementById('spec-maxTdp')?.value) || null,
      maxGpuFrequency: document.getElementById('spec-maxGpuFrequency')?.value || '',
      vram: document.getElementById('spec-vram')?.value || '',
      pcieVersion: document.getElementById('spec-pcieVersion')?.value || '',
      memoryType: document.getElementById('spec-memoryType')?.value || '',
      memoryBus: document.getElementById('spec-memoryBus')?.value || '',
      powerConnector: document.getElementById('spec-powerConnector')?.value || '',
      releaseYear: Number(document.getElementById('spec-releaseYear')?.value) || null,
      gpuLength: Number(document.getElementById('spec-gpuLength')?.value) || null,
      gpuWidth: Number(document.getElementById('spec-gpuWidth')?.value) || null,
      gpuHeight: Number(document.getElementById('spec-gpuHeight')?.value) || null
    };
  }

  if (type === 'ram') {
    return {
      ramType: document.getElementById('spec-ramType')?.value || '',
      memoryFrequency: document.getElementById('spec-memoryFrequency')?.value || '',
      latency: document.getElementById('spec-latency')?.value || '',
      moduleSize: document.getElementById('spec-moduleSize')?.value || '',
      kitSize: document.getElementById('spec-kitSize')?.value || '',
      modulesCount: Number(document.getElementById('spec-modulesCount')?.value) || null
    };
  }

  if (type === 'storage') {
    return {
      readSpeed: document.getElementById('spec-readSpeed')?.value || '',
      writeSpeed: document.getElementById('spec-writeSpeed')?.value || '',
      capacity: document.getElementById('spec-capacity')?.value || '',
      connectionType: document.getElementById('spec-connectionType')?.value || ''
    };
  }

  if (type === 'cooler') {
    return {
      coolingType: document.getElementById('spec-coolingType')?.value || '',
      radiatorSize: Number(document.getElementById('spec-radiatorSize')?.value) || null,
      maxTdp: Number(document.getElementById('spec-maxTdp')?.value) || null,
      supportedSockets: document.getElementById('spec-supportedSockets')?.value || '',
      maxFanSpeed: document.getElementById('spec-maxFanSpeed')?.value || '',
      rgb: document.getElementById('spec-rgb')?.value || '',
      motherboardConnector: document.getElementById('spec-motherboardConnector')?.value || ''
    };
  }

  if (type === 'case') {
    const rawMaxRadiatorValue = document.getElementById('spec-maxRadiatorSize')?.value;

    return {
      supportedMotherboardFormFactors:
        document.getElementById('spec-supportedMotherboardFormFactors')?.value || '',
      maxRadiatorSize:
        rawMaxRadiatorValue === ''
          ? null
          : Number(rawMaxRadiatorValue),
      includedFans: Number(document.getElementById('spec-includedFans')?.value) || null,
      fansConnector: document.getElementById('spec-fansConnector')?.value || '',
      lightingType: document.getElementById('spec-lightingType')?.value || '',
      supportedPsuFormFactors:
        document.getElementById('spec-supportedPsuFormFactors')?.value || '',
      width: Number(document.getElementById('spec-width')?.value) || null,
      height: Number(document.getElementById('spec-height')?.value) || null,
      length: Number(document.getElementById('spec-length')?.value) || null,
      maxGpuLength: Number(document.getElementById('spec-maxGpuLength')?.value) || null,
      maxGpuWidth: Number(document.getElementById('spec-maxGpuWidth')?.value) || null,
      maxGpuHeight: Number(document.getElementById('spec-maxGpuHeight')?.value) || null
    };
  }

  if (type === 'fans') {
    return {
      maxFanSpeed: document.getElementById('spec-maxFanSpeed')?.value || '',
      rgb: document.getElementById('spec-rgb')?.value || '',
      motherboardConnector: document.getElementById('spec-motherboardConnector')?.value || ''
    };
  }

  return {};
}

componentTypeSelect?.addEventListener('change', (event) => {
  renderSpecsFields(event.target.value);
});

/* =========================
   FILL FORMS
========================= */
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

function fillComponentForm(product) {
  componentIdInput.value = product.id || '';
  componentFormTitle.textContent = 'Редактировать комплектующее';

  document.getElementById('component-name').value = product.name || '';
  document.getElementById('component-type').value = product.componentType || '';
  document.getElementById('component-category').value = product.category || '';
  document.getElementById('component-price').value = product.price || '';
  document.getElementById('component-old-price').value = product.oldPrice || '';
  document.getElementById('component-description').value = product.description || '';
  document.getElementById('component-in-stock').checked = !!product.inStock;
  document.getElementById('component-is-configurator-item').checked = !!product.isConfiguratorItem;

  const specs = parseSpecsJson(product.specsJson);
  renderSpecsFields(product.componentType || '', specs);

  componentImageItems = Array.isArray(product.images)
    ? product.images.map((image) => ({
        type: 'existing',
        url: image.url
      }))
    : [];

  renderComponentPreviews();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================
   ORDERS SPECS
========================= */
function renderOrderSpecs(specs = {}) {
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
    <div class="admin-order-specs">
      ${items
        .map(
          ([label, value]) => `
            <div class="admin-order-spec-row">
              <span class="admin-order-spec-label">${label}:</span>
              <span class="admin-order-spec-value">${value}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

/* =========================
   RENDER COMPONENT SPECS
========================= */
function renderComponentSpecsSummary(product) {
  const specs = parseSpecsJson(product.specsJson);

  const rows = Object.entries(specs)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const labels = {
        pcieVersion: 'PCIe',
        socket: 'Сокет',
        maxTdp: 'TDP',
        cores: 'Ядра',
        threads: 'Потоки',
        maxFrequency: 'Макс. частота',
        ramType: 'Тип памяти',
        releaseYear: 'Год релиза',
        chipset: 'Чипсет',
        formFactor: 'Форм-фактор',
        maxPower: 'Макс. мощность',
        atxVersion: 'Версия ATX',
        modularity: 'Модульность',
        certificate: 'Сертификат',
        psuFormFactor: 'Форм-фактор БП',
        maxGpuFrequency: 'Частота GPU',
        vram: 'Видеопамять',
        memoryType: 'Тип памяти',
        memoryBus: 'Шина памяти',
        powerConnector: 'Доп. питание',
        gpuLength: 'Длина GPU',
        gpuWidth: 'Ширина GPU',
        gpuHeight: 'Высота GPU',
        memoryFrequency: 'Частота памяти',
        latency: 'CL',
        moduleSize: 'Объём модуля',
        kitSize: 'Объём комплекта',
        modulesCount: 'Модулей',
        readSpeed: 'Скорость чтения',
        writeSpeed: 'Скорость записи',
        capacity: 'Объём',
        connectionType: 'Подключение',
        coolingType: 'Тип охлаждения',
        radiatorSize: 'Размер радиатора СЖО',
        supportedSockets: 'Поддерживаемые сокеты',
        maxFanSpeed: 'Макс. обороты',
        rgb: 'Подсветка',
        motherboardConnector: 'Подключение к плате',
        supportedMotherboardFormFactors: 'Форм-факторы мат. плат',
        maxRadiatorSize: 'Макс. размер радиатора СЖО',
        includedFans: 'Вентиляторов в комплекте',
        fansConnector: 'Подключение вентиляторов',
        lightingType: 'Тип подсветки',
        supportedPsuFormFactors: 'Форм-факторы БП',
        width: 'Ширина',
        height: 'Высота',
        length: 'Длина',
        maxGpuLength: 'Макс. длина GPU',
        maxGpuWidth: 'Макс. ширина GPU',
        maxGpuHeight: 'Макс. высота GPU'
      };

      let displayValue = value;

      if (key === 'radiatorSize' || key === 'maxRadiatorSize') {
        displayValue = getRadiatorSizeLabel(value);
      }

      return `<p><strong>${labels[key] || key}:</strong> ${displayValue}</p>`;
    });

  return rows.join('');
}

/* =========================
   LOAD PRODUCTS
========================= */
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

    const regularProducts = products.filter(
      (product) => !product.componentType && !product.isConfiguratorItem
    );

    if (!regularProducts.length) {
      productsList.innerHTML = '<p>Обычных товаров пока нет.</p>';
      return;
    }

    regularProducts.forEach((product) => {
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

/* =========================
   LOAD COMPONENTS
========================= */
async function loadComponents() {
  if (!componentsList) return;

  try {
    const response = await fetch(API_URL);
    const products = await response.json();

    const components = Array.isArray(products)
      ? products.filter((product) => product.componentType || product.isConfiguratorItem)
      : [];

    componentsList.innerHTML = '';

    if (!components.length) {
      componentsList.innerHTML = '<p>Комплектующих пока нет.</p>';
      return;
    }

    components.forEach((product) => {
      const item = document.createElement('div');
      item.className = 'admin-item';

      const firstImage =
        product.images?.[0]?.url ||
        '/images/logo-glorionpc.png';

      item.innerHTML = `
        <div class="admin-product-row">
          <div class="admin-product-thumb">
            <img src="${firstImage}" alt="${product.name}">
          </div>

          <div class="admin-item__content">
            <h3>${product.name}</h3>
            <p><strong>Тип:</strong> ${product.componentType || '-'}</p>
            <p><strong>Категория:</strong> ${product.category || '-'}</p>
            <p><strong>Цена:</strong> ${formatPrice(product.price)}</p>
            <p><strong>В конфигураторе:</strong> ${product.isConfiguratorItem ? 'Да' : 'Нет'}</p>
            <p><strong>В наличии:</strong> ${product.inStock ? 'Да' : 'Нет'}</p>
            ${renderComponentSpecsSummary(product)}
          </div>
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-gold btn-small edit-btn">Редактировать</button>
          <button type="button" class="btn btn-secondary btn-small delete-btn">Удалить</button>
        </div>
      `;

      item.querySelector('.edit-btn').addEventListener('click', () => {
        fillComponentForm(product);
      });

      item.querySelector('.delete-btn').addEventListener('click', async () => {
        const confirmed = confirm(`Удалить комплектующее "${product.name}"?`);
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(`${API_URL}/${product.id}`, {
            method: 'DELETE'
          });

          if (!deleteResponse.ok) {
            throw new Error('Не удалось удалить комплектующее');
          }

          await loadComponents();
          resetComponentForm();
        } catch (error) {
          console.error(error);
          alert('Не удалось удалить комплектующее');
        }
      });

      componentsList.appendChild(item);
    });
  } catch (error) {
    console.error('Ошибка загрузки комплектующих:', error);
    componentsList.innerHTML = '<p>Не удалось загрузить комплектующие.</p>';
  }
}

/* =========================
   LOAD ORDERS
========================= */
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
              const productName =
                orderItem.productName ||
                orderItem.product?.name ||
                'Товар';

              const specs = parseSpecsJson(orderItem.specs);
              const specsHtml = renderOrderSpecs(specs || {});

              return `
                <li class="admin-order-product-item">
                  <div><strong>${productName}</strong> — ${orderItem.quantity} шт. × ${formatPrice(orderItem.price)}</div>
                  ${specsHtml}
                </li>
              `;
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
        </div>

        <div class="admin-item__actions">
          <button type="button" class="btn btn-secondary btn-small delete-order-btn">
            Удалить заказ
          </button>
        </div>
      `;

      const deleteBtn = item.querySelector('.delete-order-btn');

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

/* =========================
   LOAD CUSTOM PC REQUESTS
========================= */
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

/* =========================
   ADMIN TABS
========================= */
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

/* =========================
   PRODUCT FORM SUBMIT
========================= */
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

/* =========================
   COMPONENT FORM SUBMIT
========================= */
componentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const type = document.getElementById('component-type').value;
  const specs = getSpecsFromForm(type);

  const formData = new FormData();

  formData.append('name', document.getElementById('component-name').value);
  formData.append('category', document.getElementById('component-category').value || 'Комплектующие');
  formData.append('price', document.getElementById('component-price').value);
  formData.append('oldPrice', document.getElementById('component-old-price').value);
  formData.append('description', document.getElementById('component-description').value || '');

  formData.append('cpu', '');
  formData.append('gpu', '');
  formData.append('ram', '');
  formData.append('ssd', '');

  formData.append(
    'inStock',
    document.getElementById('component-in-stock').checked ? 'true' : 'false'
  );

  formData.append('componentType', type);
  formData.append(
    'isConfiguratorItem',
    document.getElementById('component-is-configurator-item').checked ? 'true' : 'false'
  );

  formData.append('socket', specs.socket || '');
  formData.append('ramType', specs.ramType || '');
  formData.append('chipset', specs.chipset || '');
  formData.append('formFactor', specs.formFactor || '');
  formData.append('memoryCapacity', specs.moduleSize || specs.kitSize || '');
  formData.append('storageType', specs.connectionType || '');
  formData.append('storageCapacity', specs.capacity || '');
  formData.append('powerDraw', specs.maxTdp || specs.maxPower || '');
  formData.append('recommendedPsu', specs.maxPower || '');
  formData.append('psuWattage', specs.maxPower || '');
  formData.append('coolingLevel', specs.coolingType || '');
  formData.append(
    'supportedSockets',
    Array.isArray(specs.supportedSockets)
      ? specs.supportedSockets.join(',')
      : specs.supportedSockets || ''
  );

  formData.append('gpuLength', specs.gpuLength || '');
  formData.append('gpuWidth', specs.gpuWidth || '');
  formData.append('gpuHeight', specs.gpuHeight || '');

  formData.append('specsJson', JSON.stringify(specs));

  const existingImageUrls = componentImageItems
    .filter((item) => item.type === 'existing')
    .map((item) => item.url);

  formData.append('existingImages', JSON.stringify(existingImageUrls));

  componentImageItems
    .filter((item) => item.type === 'new')
    .forEach((item) => {
      formData.append('images', item.file);
    });

  const componentId = componentIdInput.value;
  const method = componentId ? 'PUT' : 'POST';
  const url = componentId ? `${API_URL}/${componentId}` : API_URL;

  try {
    const response = await fetch(url, {
      method,
      body: formData
    });

    if (!response.ok) {
      throw new Error('Не удалось сохранить комплектующее');
    }

    resetComponentForm();
    await loadComponents();
    alert(componentId ? 'Комплектующее обновлено' : 'Комплектующее добавлено');
  } catch (error) {
    console.error(error);
    alert('Не удалось сохранить комплектующее');
  }
});

/* =========================
   START
========================= */
document.addEventListener('DOMContentLoaded', async () => {
  setupAdminTabs();
  resetComponentForm();
  await loadProducts();
  await loadOrders();
  await loadCustomPcRequests();
  await loadComponents();
});

/* =========================
   ADMIN UX: SEARCH + TOGGLE FORMS
========================= */

(function () {
  const productSearchInput = document.getElementById('admin-products-search');
  const componentSearchInput = document.getElementById('admin-components-search');

  const productFormBlock = document.getElementById('admin-product-form-block');
  const componentFormBlock = document.getElementById('admin-component-form-block');

  const showProductFormBtn = document.getElementById('show-product-form-btn');
  const hideProductFormBtn = document.getElementById('hide-product-form-btn');

  const showComponentFormBtn = document.getElementById('show-component-form-btn');
  const hideComponentFormBtn = document.getElementById('hide-component-form-btn');

  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const componentCancelEditBtn = document.getElementById('component-cancel-edit-btn');

  const adminTabs = Array.from(document.querySelectorAll('.admin-tab'));
  const adminSections = Array.from(document.querySelectorAll('.admin-section'));

  function showBlock(block) {
    if (!block) return;
    block.classList.remove('is-hidden');
    requestAnimationFrame(() => {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function hideBlock(block) {
    if (!block) return;
    block.classList.add('is-hidden');
  }

  function setActiveTab(tabName) {
    adminTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    adminSections.forEach((section) => {
      section.classList.toggle('active', section.id === `tab-${tabName}`);
    });
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function collectItemSearchText(itemEl) {
    const textParts = [];

    const title = itemEl.querySelector('h3')?.textContent || '';
    textParts.push(title);

    itemEl.querySelectorAll('p, li, .admin-meta-chip, .admin-order-spec-label, .admin-order-spec-value').forEach((node) => {
      textParts.push(node.textContent || '');
    });

    return normalizeSearchText(textParts.join(' '));
  }

  function applyListSearch(listSelector, query) {
    const list = document.querySelector(listSelector);
    if (!list) return;

    const items = Array.from(list.children).filter((el) => el.classList.contains('admin-item') || el.classList.contains('admin-order'));
    if (!items.length) return;

    const normalizedQuery = normalizeSearchText(query);

    let visibleCount = 0;

    items.forEach((item) => {
      const haystack = collectItemSearchText(item);
      const isVisible = !normalizedQuery || haystack.includes(normalizedQuery);

      item.classList.toggle('is-hidden-by-search', !isVisible);

      if (isVisible) {
        visibleCount += 1;
      }
    });

    let emptyState = list.querySelector('.admin-empty');

    if (visibleCount === 0) {
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'admin-empty';
        emptyState.textContent = 'Ничего не найдено по этому запросу.';
        list.appendChild(emptyState);
      }
    } else if (emptyState) {
      emptyState.remove();
    }
  }

  function bindSearchInputs() {
    if (productSearchInput) {
      productSearchInput.addEventListener('input', () => {
        applyListSearch('#admin-products-list', productSearchInput.value);
      });
    }

    if (componentSearchInput) {
      componentSearchInput.addEventListener('input', () => {
        applyListSearch('#components-list', componentSearchInput.value);
      });
    }
  }

  function bindFormToggles() {
    if (showProductFormBtn) {
      showProductFormBtn.addEventListener('click', () => {
        setActiveTab('products');
        showBlock(productFormBlock);
      });
    }

    if (hideProductFormBtn) {
      hideProductFormBtn.addEventListener('click', () => {
        hideBlock(productFormBlock);
      });
    }

    if (showComponentFormBtn) {
      showComponentFormBtn.addEventListener('click', () => {
        setActiveTab('components');
        showBlock(componentFormBlock);
      });
    }

    if (hideComponentFormBtn) {
      hideComponentFormBtn.addEventListener('click', () => {
        hideBlock(componentFormBlock);
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        setTimeout(() => hideBlock(productFormBlock), 0);
      });
    }

    if (componentCancelEditBtn) {
      componentCancelEditBtn.addEventListener('click', () => {
        setTimeout(() => hideBlock(componentFormBlock), 0);
      });
    }
  }

  function bindTabs() {
    adminTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        setActiveTab(tabName);
      });
    });
  }

  function patchEditButtons() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll('#admin-products-list .btn, #admin-products-list button').forEach((btn) => {
        if (btn.dataset.formPatchBound === 'true') return;

        const text = normalizeSearchText(btn.textContent);
        if (text.includes('редакт')) {
          btn.dataset.formPatchBound = 'true';
          btn.addEventListener('click', () => {
            setActiveTab('products');
            showBlock(productFormBlock);
          });
        }
      });

      document.querySelectorAll('#components-list .btn, #components-list button').forEach((btn) => {
        if (btn.dataset.formPatchBound === 'true') return;

        const text = normalizeSearchText(btn.textContent);
        if (text.includes('редакт')) {
          btn.dataset.formPatchBound = 'true';
          btn.addEventListener('click', () => {
            setActiveTab('components');
            showBlock(componentFormBlock);
          });
        }
      });

      if (productSearchInput?.value) {
        applyListSearch('#admin-products-list', productSearchInput.value);
      }

      if (componentSearchInput?.value) {
        applyListSearch('#components-list', componentSearchInput.value);
      }
    });

    const productsList = document.getElementById('admin-products-list');
    const componentsList = document.getElementById('components-list');

    if (productsList) {
      observer.observe(productsList, { childList: true, subtree: true });
    }

    if (componentsList) {
      observer.observe(componentsList, { childList: true, subtree: true });
    }
  }

  function initAdminUxEnhancements() {
    bindTabs();
    bindSearchInputs();
    bindFormToggles();
    patchEditButtons();

    hideBlock(productFormBlock);
    hideBlock(componentFormBlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminUxEnhancements);
  } else {
    initAdminUxEnhancements();
  }
})();