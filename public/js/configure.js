const CART_STORAGE_KEY = 'glorionpc_cart';
const PRODUCTS_API_URL = '/api/products';

const COMPONENT_CONFIG = {
  cpu: {
    selectId: 'cpu',
    summaryId: 'summary-cpu',
    type: 'cpu',
    emptyText: 'Нет процессоров'
  },
  gpu: {
    selectId: 'gpu',
    summaryId: 'summary-gpu',
    type: 'gpu',
    emptyText: 'Нет видеокарт'
  },
  motherboard: {
    selectId: 'motherboard',
    summaryId: 'summary-motherboard',
    type: 'motherboard',
    emptyText: 'Нет материнских плат'
  },
  ram: {
    selectId: 'ram',
    summaryId: 'summary-ram',
    type: 'ram',
    emptyText: 'Нет оперативной памяти'
  },
  storage: {
    selectId: 'storage',
    summaryId: 'summary-storage',
    type: 'storage',
    emptyText: 'Нет накопителей'
  },
  extraStorage: {
    selectId: 'extra-storage',
    summaryId: 'summary-extra-storage',
    type: 'storage',
    emptyOption: {
      id: 'no-extra-storage',
      name: 'Без дополнительного накопителя',
      price: 0
    },
    emptyText: 'Нет накопителей'
  },
  cooler: {
    selectId: 'cooler',
    summaryId: 'summary-cooler',
    type: 'cooler',
    emptyOption: {
      id: 'no-cooler',
      name: 'Нет охлаждения',
      price: 0
    },
    emptyText: 'Нет охлаждения'
  },
  psu: {
    selectId: 'psu',
    summaryId: 'summary-psu',
    type: 'psu',
    emptyText: 'Нет блоков питания'
  },
  pcCase: {
    selectId: 'pc-case',
    summaryId: 'summary-case',
    type: 'case',
    emptyOption: {
      id: 'no-case',
      name: 'Нет корпуса',
      price: 0
    },
    emptyText: 'Нет корпусов'
  },
  fans: {
    selectId: 'fans',
    summaryId: 'summary-fans',
    type: 'fans',
    emptyOption: {
      id: 'no-fans',
      name: 'Без дополнительных вентиляторов',
      price: 0
    },
    emptyText: 'Нет вентиляторов'
  }
};

let configuratorProducts = [];
const CONFIG_PREVIEW_FALLBACK = '/images/logo-glorionpc.png';

/* =========================
   HELPERS
========================= */

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function parseSpecs(specsJson) {
  if (!specsJson) return {};
  if (typeof specsJson === 'object') return specsJson;

  try {
    return JSON.parse(specsJson);
  } catch (error) {
    return {};
  }
}

function parseList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return String(value)
    .split(/[,/;|]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function getNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getRawValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function updateCartIndicator() {
  const cart = getCart();
  const target = document.getElementById('cart-target');

  if (!target) return;
  target.classList.toggle('is-visible', cart.length > 0);
}

function getSelect(id) {
  return document.getElementById(id);
}

function getProductsByType(type) {
  return configuratorProducts.filter((product) => {
    return (
      product.componentType === type &&
      product.isConfiguratorItem === true &&
      product.inStock === true
    );
  });
}

function getProductById(id) {
  return configuratorProducts.find((item) => String(item.id) === String(id)) || null;
}

function createVirtualEmptyProduct(id, name) {
  return {
    id,
    name,
    price: 0,
    images: [],
    specsJson: '',
    componentType: ''
  };
}

function isVirtualEmptyValue(value) {
  return String(value || '').startsWith('no-');
}

function getSelectedProduct(selectId) {
  const select = getSelect(selectId);
  if (!select || !select.value) return null;

  if (isVirtualEmptyValue(select.value)) {
    return createVirtualEmptyProduct(
      select.value,
      select.options[select.selectedIndex]?.dataset.title || ''
    );
  }

  return getProductById(select.value);
}

function normalizeImageArray(rawImages) {
  if (!rawImages) return [];

  if (Array.isArray(rawImages)) {
    return rawImages
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
          return String(item.url || item.src || item.path || item.image || '').trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();

    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return normalizeImageArray(JSON.parse(trimmed));
      } catch (error) {
        return [trimmed];
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getProductImages(product) {
  const images = normalizeImageArray(product?.images);

  if (images.length) {
    return images;
  }

  const fallback = [
    product?.image,
    product?.imageUrl,
    product?.photo,
    CONFIG_PREVIEW_FALLBACK
  ].find(Boolean);

  return [fallback || CONFIG_PREVIEW_FALLBACK];
}

function getProductPrimaryImage(product) {
  return getProductImages(product)[0] || CONFIG_PREVIEW_FALLBACK;
}

function createOptionElement(product) {
  const option = document.createElement('option');
  option.value = String(product.id);
  option.textContent = `${product.name} — ${formatPrice(product.price)}`;
  option.dataset.title = product.name;
  option.dataset.price = String(Number(product.price) || 0);
  option.dataset.image = getProductPrimaryImage(product);
  option.dataset.images = JSON.stringify(getProductImages(product));
  option.dataset.specs = product.specsJson || '';
  return option;
}

function fillSelect(selectId, items, config = {}, previousValue = null) {
  const select = getSelect(selectId);
  if (!select) return;

  select.innerHTML = '';

  if (config.emptyOption) {
    const emptyOption = document.createElement('option');
    emptyOption.value = config.emptyOption.id;
    emptyOption.textContent = `${config.emptyOption.name} — ${formatPrice(config.emptyOption.price)}`;
    emptyOption.dataset.title = config.emptyOption.name;
    emptyOption.dataset.price = String(config.emptyOption.price);
    emptyOption.dataset.image = CONFIG_PREVIEW_FALLBACK;
    emptyOption.dataset.images = JSON.stringify([CONFIG_PREVIEW_FALLBACK]);
    emptyOption.dataset.specs = '';
    select.appendChild(emptyOption);
  }

  if (!items.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = config.emptyText || 'Нет доступных вариантов';
    option.dataset.title = config.emptyText || 'Нет доступных вариантов';
    option.dataset.price = '0';
    option.dataset.image = CONFIG_PREVIEW_FALLBACK;
    option.dataset.images = JSON.stringify([CONFIG_PREVIEW_FALLBACK]);
    option.dataset.specs = '';
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  items.forEach((item) => {
    select.appendChild(createOptionElement(item));
  });

  select.disabled = false;

  const optionValues = Array.from(select.options).map((option) => option.value);

  if (previousValue && optionValues.includes(String(previousValue))) {
    select.value = String(previousValue);
  } else if (config.emptyOption) {
    select.value = config.emptyOption.id;
  } else {
    select.selectedIndex = 0;
  }
}

function getSelectedItemData(selectId) {
  const select = getSelect(selectId);
  const option = select?.options?.[select.selectedIndex];

  if (!option) {
    return {
      id: null,
      title: '',
      price: 0,
      image: CONFIG_PREVIEW_FALLBACK,
      images: [CONFIG_PREVIEW_FALLBACK],
      specs: {}
    };
  }

  let images = [CONFIG_PREVIEW_FALLBACK];

  try {
    images = JSON.parse(option.dataset.images || '[]');
  } catch (error) {
    images = [];
  }

  if (!Array.isArray(images) || !images.length) {
    images = [option.dataset.image || CONFIG_PREVIEW_FALLBACK];
  }

  return {
    id: option.value || null,
    title: option.dataset.title || option.textContent || '',
    price: Number(option.dataset.price) || 0,
    image: option.dataset.image || CONFIG_PREVIEW_FALLBACK,
    images,
    specs: parseSpecs(option.dataset.specs || '')
  };
}

/* =========================
   IMAGE MODAL
========================= */

const configImageModal = document.getElementById('config-image-modal');
const configImageModalBackdrop = document.getElementById('config-image-modal-backdrop');
const configImageModalClose = document.getElementById('config-image-modal-close');
const configImageModalPrev = document.getElementById('config-image-modal-prev');
const configImageModalNext = document.getElementById('config-image-modal-next');
const configImageModalImg = document.getElementById('config-image-modal-img');
const configImageModalCaption = document.getElementById('config-image-modal-caption');
const configImageModalThumbs = document.getElementById('config-image-modal-thumbs');

let currentPreviewGallery = [];
let currentPreviewIndex = 0;
let currentPreviewTitle = '';

function ensurePreviewBadge(previewEl) {
  let badge = previewEl.querySelector('.config-preview__gallery-badge');

  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'config-preview__gallery-badge is-hidden';
    previewEl.appendChild(badge);
  }

  return badge;
}

function setPreviewGalleryData(previewId, data, titleText) {
  const previewEl = document.getElementById(previewId);
  if (!previewEl) return;

  const images = Array.isArray(data?.images) && data.images.length
    ? data.images
    : [CONFIG_PREVIEW_FALLBACK];

  previewEl.dataset.images = JSON.stringify(images);
  previewEl.dataset.title = titleText || data?.title || 'Комплектующее';

  const badge = ensurePreviewBadge(previewEl);

  if (images.length > 1) {
    badge.textContent = `${images.length} фото`;
    badge.classList.remove('is-hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('is-hidden');
  }
}

function renderConfigImageModal() {
  const src = currentPreviewGallery[currentPreviewIndex] || CONFIG_PREVIEW_FALLBACK;
  configImageModalImg.src = src;
  configImageModalImg.alt = currentPreviewTitle || 'Изображение комплектующего';

  const total = currentPreviewGallery.length;
  configImageModalCaption.textContent = total > 1
    ? `${currentPreviewTitle} — ${currentPreviewIndex + 1} / ${total}`
    : currentPreviewTitle;

  configImageModalThumbs.innerHTML = '';

  currentPreviewGallery.forEach((imageSrc, index) => {
    const thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = `config-image-modal__thumb${index === currentPreviewIndex ? ' is-active' : ''}`;
    thumbBtn.setAttribute('aria-label', `Изображение ${index + 1}`);

    const thumbImg = document.createElement('img');
    thumbImg.src = imageSrc;
    thumbImg.alt = `${currentPreviewTitle} ${index + 1}`;

    thumbBtn.appendChild(thumbImg);
    thumbBtn.addEventListener('click', () => {
      currentPreviewIndex = index;
      renderConfigImageModal();
    });

    configImageModalThumbs.appendChild(thumbBtn);
  });

  if (currentPreviewGallery.length <= 1) {
    configImageModalPrev.classList.add('is-hidden');
    configImageModalNext.classList.add('is-hidden');
  } else {
    configImageModalPrev.classList.remove('is-hidden');
    configImageModalNext.classList.remove('is-hidden');
  }
}

function openConfigImageModal(images, startIndex = 0, title = '') {
  currentPreviewGallery = Array.isArray(images) && images.length ? images : [CONFIG_PREVIEW_FALLBACK];
  currentPreviewIndex = Math.max(0, Math.min(startIndex, currentPreviewGallery.length - 1));
  currentPreviewTitle = title || '';

  renderConfigImageModal();
  configImageModal.classList.add('is-open');
  configImageModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeConfigImageModal() {
  configImageModal.classList.remove('is-open');
  configImageModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function showPrevConfigImage() {
  if (currentPreviewGallery.length <= 1) return;
  currentPreviewIndex =
    (currentPreviewIndex - 1 + currentPreviewGallery.length) % currentPreviewGallery.length;
  renderConfigImageModal();
}

function showNextConfigImage() {
  if (currentPreviewGallery.length <= 1) return;
  currentPreviewIndex =
    (currentPreviewIndex + 1) % currentPreviewGallery.length;
  renderConfigImageModal();
}

function bindConfigPreviewGallery() {
  document.querySelectorAll('.config-preview').forEach((previewEl) => {
    if (previewEl.dataset.galleryBound === 'true') return;

    previewEl.dataset.galleryBound = 'true';

    previewEl.addEventListener('click', () => {
      let images = [];

      try {
        images = JSON.parse(previewEl.dataset.images || '[]');
      } catch (error) {
        images = [];
      }

      const title = previewEl.dataset.title || previewEl.querySelector('strong')?.textContent || 'Комплектующее';
      openConfigImageModal(images, 0, title);
    });
  });
}

/* =========================
   PREVIEWS
========================= */

function updateComponentPreview(selectId) {
  const data = getSelectedItemData(selectId);

  const imageEl = document.getElementById(`preview-${selectId}-image`);
  const titleEl = document.getElementById(`preview-${selectId}-title`);
  const priceEl = document.getElementById(`preview-${selectId}-price`);
  const previewEl = document.getElementById(`preview-${selectId}`);

  if (!imageEl || !titleEl || !priceEl || !previewEl) return;

  imageEl.src = data.image || CONFIG_PREVIEW_FALLBACK;
  titleEl.textContent = data.title || 'Не выбрано';
  priceEl.textContent = formatPrice(data.price || 0);

  setPreviewGalleryData(`preview-${selectId}`, data, data.title || 'Комплектующее');
}

function updateAllComponentPreviews() {
  updateComponentPreview('cpu');
  updateComponentPreview('gpu');
  updateComponentPreview('motherboard');
  updateComponentPreview('ram');
  updateComponentPreview('storage');
  updateComponentPreview('extra-storage');
  updateComponentPreview('cooler');
  updateComponentPreview('psu');
  updateComponentPreview('pc-case');
  updateComponentPreview('fans');
  bindConfigPreviewGallery();
}

/* =========================
   ADD TO CART ANIMATION
========================= */

function getConfiguratorPreviewImage() {
  const priorityIds = [
    'pc-case',
    'cpu',
    'gpu',
    'motherboard',
    'cooler',
    'ram',
    'psu',
    'storage'
  ];

  for (const id of priorityIds) {
    const data = getSelectedItemData(id);

    if (
      data &&
      data.image &&
      data.image !== CONFIG_PREVIEW_FALLBACK &&
      data.title &&
      !data.title.toLowerCase().includes('нет ')
    ) {
      return data.image;
    }
  }

  return CONFIG_PREVIEW_FALLBACK;
}

function animateConfiguredPcToCart() {
  const cartTarget = document.getElementById('cart-target');
  const cartLink = document.querySelector('.cart-link');
  const addButton = document.getElementById('add-config-to-cart');

  if (!cartTarget || !cartLink || !addButton) return;

  const imageSrc = getConfiguratorPreviewImage();
  const buttonRect = addButton.getBoundingClientRect();
  const cartRect = cartTarget.getBoundingClientRect();

  const flyImage = document.createElement('img');
  flyImage.className = 'config-fly-image';
  flyImage.src = imageSrc;
  flyImage.alt = 'Добавлено в корзину';

  const startSize = 72;
  const endSize = 22;

  flyImage.style.left = `${buttonRect.left + buttonRect.width / 2 - startSize / 2}px`;
  flyImage.style.top = `${buttonRect.top + buttonRect.height / 2 - startSize / 2}px`;
  flyImage.style.width = `${startSize}px`;
  flyImage.style.height = `${startSize}px`;
  flyImage.style.opacity = '1';
  flyImage.style.transform = 'scale(1) rotate(0deg)';

  document.body.appendChild(flyImage);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flyImage.style.left = `${cartRect.left + cartRect.width / 2 - endSize / 2}px`;
      flyImage.style.top = `${cartRect.top + cartRect.height / 2 - endSize / 2}px`;
      flyImage.style.width = `${endSize}px`;
      flyImage.style.height = `${endSize}px`;
      flyImage.style.transform = 'scale(0.45) rotate(12deg)';
    });
  });

  setTimeout(() => {
    cartLink.classList.remove('bump');
    void cartLink.offsetWidth;
    cartLink.classList.add('bump');

    cartTarget.classList.add('is-visible');
    addButton.classList.remove('config-add-success');
    void addButton.offsetWidth;
    addButton.classList.add('config-add-success');
  }, 760);

  setTimeout(() => {
    flyImage.remove();
  }, 950);
}

/* =========================
   RAM HELPERS
========================= */

function detectRamTypesFromString(value) {
  const text = String(value || '').toUpperCase();
  const found = [];

  if (text.includes('DDR3')) found.push('ddr3');
  if (text.includes('DDR4')) found.push('ddr4');
  if (text.includes('DDR5')) found.push('ddr5');

  return [...new Set(found)];
}

function collectRamTypeCandidates(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRamTypeCandidates(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectRamTypeCandidates(item));
  }

  const parsed = parseList(value);
  const detected = detectRamTypesFromString(value);

  return [...parsed, ...detected];
}

function getSupportedRamTypes(product) {
  if (!product) return [];

  const specs = parseSpecs(product.specsJson);

  const rawSources = [
    specs.ramType,
    specs.ramTypes,
    specs.memoryType,
    specs.memoryTypes,
    specs.ddrType,
    specs.ddrTypes,
    specs.type,
    specs.memory,
    specs.ram,
    specs.supportedRamType,
    specs.supportedRamTypes,
    specs.memoryStandard,
    specs.memorySupport,
    specs.memoryTechnology,
    specs.memType,
    specs.dimmType,
    specs.description,
    specs.title,

    product.ramType,
    product.ramTypes,
    product.memoryType,
    product.memoryTypes,
    product.ddrType,
    product.ddrTypes,
    product.type,
    product.memory,
    product.ram,
    product.memType,
    product.description,
    product.name
  ];

  const result = [];

  for (const source of rawSources) {
    if (!source) continue;
    result.push(...collectRamTypeCandidates(source));
  }

  return [
    ...new Set(
      result
        .map((item) => normalizeText(item))
        .filter((item) => ['ddr3', 'ddr4', 'ddr5'].includes(item))
    )
  ];
}

/* =========================
   COMPATIBILITY
========================= */

function isCpuCompatibleWithMotherboard(cpu, motherboard) {
  if (!cpu || !motherboard) return true;
  if (isVirtualEmptyValue(cpu.id) || isVirtualEmptyValue(motherboard.id)) return true;

  const cpuSpecs = parseSpecs(cpu.specsJson);
  const motherboardSpecs = parseSpecs(motherboard.specsJson);

  const cpuSocket = normalizeText(cpuSpecs.socket || cpu.socket);
  const motherboardSocket = normalizeText(motherboardSpecs.socket || motherboard.socket);

  if (!cpuSocket || !motherboardSocket) return true;
  return cpuSocket === motherboardSocket;
}

function isRamCompatibleWithMotherboard(ram, motherboard) {
  if (!ram || !motherboard) return true;
  if (isVirtualEmptyValue(ram.id) || isVirtualEmptyValue(motherboard.id)) return true;

  const ramTypes = getSupportedRamTypes(ram);
  const motherboardRamTypes = getSupportedRamTypes(motherboard);

  if (!motherboardRamTypes.length) {
    return true;
  }

  if (!ramTypes.length) {
    return false;
  }

  return ramTypes.some((type) => motherboardRamTypes.includes(type));
}

function isRamCompatibleWithCpu(ram, cpu) {
  if (!ram || !cpu) return true;
  if (isVirtualEmptyValue(ram.id) || isVirtualEmptyValue(cpu.id)) return true;

  const ramTypes = getSupportedRamTypes(ram);
  const cpuRamTypes = getSupportedRamTypes(cpu);

  if (!cpuRamTypes.length) {
    return true;
  }

  if (!ramTypes.length) {
    return false;
  }

  return ramTypes.some((type) => cpuRamTypes.includes(type));
}

function isCoolerCompatibleWithCpu(cooler, cpu) {
  if (!cooler || !cpu) return true;
  if (isVirtualEmptyValue(cooler.id) || isVirtualEmptyValue(cpu.id)) return true;

  const coolerSpecs = parseSpecs(cooler.specsJson);
  const cpuSpecs = parseSpecs(cpu.specsJson);

  const cpuSocket = normalizeText(cpuSpecs.socket || cpu.socket);
  const supportedSockets = parseList(coolerSpecs.supportedSockets || cooler.supportedSockets);

  if (!cpuSocket || !supportedSockets.length) return true;
  return supportedSockets.includes(cpuSocket);
}

function isCaseCompatibleWithMotherboard(pcCase, motherboard) {
  if (!pcCase || !motherboard) return true;
  if (isVirtualEmptyValue(pcCase.id) || isVirtualEmptyValue(motherboard.id)) return true;

  const caseSpecs = parseSpecs(pcCase.specsJson);
  const motherboardSpecs = parseSpecs(motherboard.specsJson);

  const motherboardFormFactor = normalizeText(
    motherboardSpecs.formFactor || motherboard.formFactor
  );

  const supportedFormFactors = parseList(
    caseSpecs.supportedMotherboardFormFactors ||
      caseSpecs.formFactor ||
      pcCase.formFactor
  );

  if (!motherboardFormFactor || !supportedFormFactors.length) return true;
  return supportedFormFactors.includes(motherboardFormFactor);
}

function isPsuCompatible(psu, cpu, gpu) {
  if (!psu) return true;
  if (isVirtualEmptyValue(psu.id)) return true;

  const psuSpecs = parseSpecs(psu.specsJson);
  const cpuSpecs = cpu ? parseSpecs(cpu.specsJson) : {};
  const gpuSpecs = gpu ? parseSpecs(gpu.specsJson) : {};

  const psuPower = Number(
    psuSpecs.maxPower ||
    psuSpecs.psuWattage ||
    psu.psuWattage ||
    psu.recommendedPsu ||
    0
  );

  const cpuTdp = Number(cpuSpecs.maxTdp || cpuSpecs.powerDraw || cpu?.powerDraw || 0);
  const gpuTdp = Number(gpuSpecs.maxTdp || gpuSpecs.powerDraw || gpu?.powerDraw || 0);

  if (!psuPower) return true;

  const requiredPower = cpuTdp + gpuTdp + 150;
  return psuPower >= requiredPower;
}

function isGpuCompatibleWithCase(gpu, pcCase) {
  if (!gpu || !pcCase) return true;
  if (isVirtualEmptyValue(gpu.id) || isVirtualEmptyValue(pcCase.id)) return true;

  const gpuSpecs = parseSpecs(gpu.specsJson);
  const caseSpecs = parseSpecs(pcCase.specsJson);

  const gpuLength = getNumber(
    gpuSpecs.gpuLength ||
    gpuSpecs.length ||
    gpuSpecs.cardLength ||
    gpu.length ||
    gpu.cardLength ||
    0
  );

  const gpuWidth = getNumber(
    gpuSpecs.gpuWidth ||
    gpuSpecs.width ||
    gpu.width ||
    0
  );

  const gpuHeight = getNumber(
    gpuSpecs.gpuHeight ||
    gpuSpecs.height ||
    gpu.height ||
    0
  );

  const maxGpuLength = getNumber(
    caseSpecs.maxGpuLength ||
    caseSpecs.gpuMaxLength ||
    caseSpecs.maximumGpuLength ||
    caseSpecs.videoCardMaxLength ||
    pcCase.maxGpuLength ||
    0
  );

  const maxGpuWidth = getNumber(
    caseSpecs.maxGpuWidth ||
    caseSpecs.gpuMaxWidth ||
    caseSpecs.maximumGpuWidth ||
    pcCase.maxGpuWidth ||
    0
  );

  const maxGpuHeight = getNumber(
    caseSpecs.maxGpuHeight ||
    caseSpecs.gpuMaxHeight ||
    caseSpecs.maximumGpuHeight ||
    pcCase.maxGpuHeight ||
    0
  );

  if (maxGpuLength > 0 && gpuLength > maxGpuLength) return false;
  if (maxGpuWidth > 0 && gpuWidth > maxGpuWidth) return false;
  if (maxGpuHeight > 0 && gpuHeight > maxGpuHeight) return false;

  return true;
}

function isCaseCompatibleWithGpu(pcCase, gpu) {
  return isGpuCompatibleWithCase(gpu, pcCase);
}

function isCoolerCompatibleWithCase(cooler, pcCase) {
  if (!cooler || !pcCase) return true;
  if (isVirtualEmptyValue(cooler.id) || isVirtualEmptyValue(pcCase.id)) return true;

  const coolerSpecs = parseSpecs(cooler.specsJson);
  const caseSpecs = parseSpecs(pcCase.specsJson);

  const coolingType = normalizeText(
    coolerSpecs.coolingType ||
    cooler.coolingType
  );

  if (coolingType !== 'liquid') {
    return true;
  }

  const radiatorRaw = getRawValue(
    coolerSpecs.radiatorSize,
    coolerSpecs.radiator,
    coolerSpecs.radiatorMm,
    cooler.radiatorSize
  );

  const caseMaxRaw = getRawValue(
    caseSpecs.maxRadiatorSize,
    caseSpecs.radiatorMaxSize,
    caseSpecs.maximumRadiatorSize,
    pcCase.maxRadiatorSize
  );

  if (String(caseMaxRaw) === '0') {
    return false;
  }

  const radiatorSize = getNumber(radiatorRaw);
  const maxRadiatorSize = getNumber(caseMaxRaw);

  if (!radiatorSize) return true;
  if (!caseMaxRaw) return true;
  if (!maxRadiatorSize) return true;

  return radiatorSize <= maxRadiatorSize;
}

/* =========================
   CURRENT SELECTION STATE
========================= */

function getCurrentSelection() {
  return {
    cpu: getSelectedProduct('cpu'),
    gpu: getSelectedProduct('gpu'),
    motherboard: getSelectedProduct('motherboard'),
    ram: getSelectedProduct('ram'),
    storage: getSelectedProduct('storage'),
    extraStorage: getSelectedProduct('extra-storage'),
    cooler: getSelectedProduct('cooler'),
    psu: getSelectedProduct('psu'),
    pcCase: getSelectedProduct('pc-case'),
    fans: getSelectedProduct('fans')
  };
}

/* =========================
   FILTERS
========================= */

function applyCompatibilityFilters() {
  const previousValues = {
    cpu: getSelect('cpu')?.value || null,
    gpu: getSelect('gpu')?.value || null,
    motherboard: getSelect('motherboard')?.value || null,
    ram: getSelect('ram')?.value || null,
    storage: getSelect('storage')?.value || null,
    extraStorage: getSelect('extra-storage')?.value || null,
    cooler: getSelect('cooler')?.value || null,
    psu: getSelect('psu')?.value || null,
    pcCase: getSelect('pc-case')?.value || null,
    fans: getSelect('fans')?.value || null
  };

  let selected = getCurrentSelection();

  const cpuItems = getProductsByType('cpu');

  const motherboardItems = getProductsByType('motherboard').filter((item) =>
    isCpuCompatibleWithMotherboard(selected.cpu, item)
  );

  if (
    selected.motherboard &&
    !isVirtualEmptyValue(selected.motherboard.id) &&
    !motherboardItems.some((item) => String(item.id) === String(selected.motherboard.id))
  ) {
    selected.motherboard = null;
    previousValues.motherboard = null;
  }

  const motherboardForChecks = selected.motherboard;

  const ramItems = getProductsByType('ram').filter((item) => {
    return (
      isRamCompatibleWithMotherboard(item, motherboardForChecks) &&
      isRamCompatibleWithCpu(item, selected.cpu)
    );
  });

  if (
    selected.ram &&
    !isVirtualEmptyValue(selected.ram.id) &&
    !ramItems.some((item) => String(item.id) === String(selected.ram.id))
  ) {
    selected.ram = null;
    previousValues.ram = null;
  }

  const storageItems = getProductsByType('storage');

  const caseItems = getProductsByType('case')
    .filter((item) => isCaseCompatibleWithMotherboard(item, motherboardForChecks))
    .filter((item) => isCaseCompatibleWithGpu(item, selected.gpu));

  if (
    selected.pcCase &&
    !isVirtualEmptyValue(selected.pcCase.id) &&
    !caseItems.some((item) => String(item.id) === String(selected.pcCase.id))
  ) {
    selected.pcCase = null;
    previousValues.pcCase = COMPONENT_CONFIG.pcCase.emptyOption?.id || null;
  }

  const caseForChecks =
    selected.pcCase && !isVirtualEmptyValue(selected.pcCase.id) ? selected.pcCase : null;

  const coolerItems = getProductsByType('cooler').filter((item) =>
    isCoolerCompatibleWithCpu(item, selected.cpu) &&
    isCoolerCompatibleWithCase(item, caseForChecks)
  );

  if (
    selected.cooler &&
    !isVirtualEmptyValue(selected.cooler.id) &&
    !coolerItems.some((item) => String(item.id) === String(selected.cooler.id))
  ) {
    selected.cooler = null;
    previousValues.cooler = COMPONENT_CONFIG.cooler.emptyOption?.id || null;
  }

  const gpuItems = getProductsByType('gpu').filter((item) =>
    isGpuCompatibleWithCase(item, caseForChecks)
  );

  if (
    selected.gpu &&
    !isVirtualEmptyValue(selected.gpu.id) &&
    !gpuItems.some((item) => String(item.id) === String(selected.gpu.id))
  ) {
    selected.gpu = null;
    previousValues.gpu = null;
  }

  const gpuForChecks = selected.gpu;

  const psuItems = getProductsByType('psu').filter((item) =>
    isPsuCompatible(item, selected.cpu, gpuForChecks)
  );

  if (
    selected.psu &&
    !isVirtualEmptyValue(selected.psu.id) &&
    !psuItems.some((item) => String(item.id) === String(selected.psu.id))
  ) {
    selected.psu = null;
    previousValues.psu = null;
  }

  const fansItems = getProductsByType('fans');

  fillSelect(COMPONENT_CONFIG.cpu.selectId, cpuItems, COMPONENT_CONFIG.cpu, previousValues.cpu);
  fillSelect(
    COMPONENT_CONFIG.motherboard.selectId,
    motherboardItems,
    COMPONENT_CONFIG.motherboard,
    previousValues.motherboard
  );
  fillSelect(
    COMPONENT_CONFIG.ram.selectId,
    ramItems,
    COMPONENT_CONFIG.ram,
    previousValues.ram
  );
  fillSelect(
    COMPONENT_CONFIG.storage.selectId,
    storageItems,
    COMPONENT_CONFIG.storage,
    previousValues.storage
  );
  fillSelect(
    COMPONENT_CONFIG.extraStorage.selectId,
    storageItems,
    COMPONENT_CONFIG.extraStorage,
    previousValues.extraStorage
  );
  fillSelect(
    COMPONENT_CONFIG.cooler.selectId,
    coolerItems,
    COMPONENT_CONFIG.cooler,
    previousValues.cooler
  );
  fillSelect(
    COMPONENT_CONFIG.pcCase.selectId,
    caseItems,
    COMPONENT_CONFIG.pcCase,
    previousValues.pcCase
  );
  fillSelect(
    COMPONENT_CONFIG.gpu.selectId,
    gpuItems,
    COMPONENT_CONFIG.gpu,
    previousValues.gpu
  );
  fillSelect(
    COMPONENT_CONFIG.psu.selectId,
    psuItems,
    COMPONENT_CONFIG.psu,
    previousValues.psu
  );
  fillSelect(
    COMPONENT_CONFIG.fans.selectId,
    fansItems,
    COMPONENT_CONFIG.fans,
    previousValues.fans
  );
}

function updateSummary() {
  const cpu = getSelectedItemData('cpu');
  const gpu = getSelectedItemData('gpu');
  const motherboard = getSelectedItemData('motherboard');
  const ram = getSelectedItemData('ram');
  const storage = getSelectedItemData('storage');
  const extraStorage = getSelectedItemData('extra-storage');
  const cooler = getSelectedItemData('cooler');
  const psu = getSelectedItemData('psu');
  const pcCase = getSelectedItemData('pc-case');
  const fans = getSelectedItemData('fans');

  const summaryMap = {
    'summary-cpu': cpu.title,
    'summary-gpu': gpu.title,
    'summary-motherboard': motherboard.title,
    'summary-ram': ram.title,
    'summary-storage': storage.title,
    'summary-extra-storage': extraStorage.title,
    'summary-cooler': cooler.title,
    'summary-psu': psu.title,
    'summary-case': pcCase.title,
    'summary-fans': fans.title
  };

  Object.entries(summaryMap).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '—';
  });

  const total =
    cpu.price +
    gpu.price +
    motherboard.price +
    ram.price +
    storage.price +
    extraStorage.price +
    cooler.price +
    psu.price +
    pcCase.price +
    fans.price;

  const totalEl = document.getElementById('config-total');
  if (totalEl) {
    totalEl.textContent = formatPrice(total);
  }

  updateAllComponentPreviews();

  return {
    cpu,
    gpu,
    motherboard,
    ram,
    storage,
    extraStorage,
    cooler,
    psu,
    case: pcCase,
    fans,
    total
  };
}

/* =========================
   ADD TO CART
========================= */

function addConfiguredPcToCart() {
  const config = updateSummary();

  const item = {
    id: `config-${Date.now()}`,
    name: 'Индивидуальная сборка ПК',
    slug: `config-${Date.now()}`,
    category: 'Конфигуратор',
    price: config.total,
    oldPrice: null,
    image:
      config.case.image ||
      config.cpu.image ||
      config.gpu.image ||
      CONFIG_PREVIEW_FALLBACK,
    quantity: 1,
    specs: {
      cpu: config.cpu.title,
      gpu: config.gpu.title,
      motherboard: config.motherboard.title,
      ram: config.ram.title,
      storage: config.storage.title,
      extraStorage: config.extraStorage.title,
      cooler: config.cooler.title,
      psu: config.psu.title,
      case: config.case.title,
      fans: config.fans.title
    }
  };

  const cart = getCart();
  cart.push(item);
  saveCart(cart);
  updateCartIndicator();
  animateConfiguredPcToCart();

  const button = document.getElementById('add-config-to-cart');
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Добавлено в корзину';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1400);
  }
}

/* =========================
   INIT
========================= */

function attachSelectListeners() {
  Object.values(COMPONENT_CONFIG).forEach((config) => {
    const select = getSelect(config.selectId);
    if (!select) return;

    select.addEventListener('change', () => {
      applyCompatibilityFilters();
      updateSummary();
    });
  });
}

async function loadConfiguratorProducts() {
  try {
    const response = await fetch(PRODUCTS_API_URL);
    const products = await response.json();

    if (!response.ok) {
      throw new Error('Не удалось загрузить комплектующие');
    }

    configuratorProducts = Array.isArray(products) ? products : [];

    fillSelect(COMPONENT_CONFIG.cpu.selectId, getProductsByType('cpu'), COMPONENT_CONFIG.cpu);
    fillSelect(COMPONENT_CONFIG.gpu.selectId, getProductsByType('gpu'), COMPONENT_CONFIG.gpu);
    fillSelect(
      COMPONENT_CONFIG.motherboard.selectId,
      getProductsByType('motherboard'),
      COMPONENT_CONFIG.motherboard
    );
    fillSelect(COMPONENT_CONFIG.ram.selectId, getProductsByType('ram'), COMPONENT_CONFIG.ram);
    fillSelect(
      COMPONENT_CONFIG.storage.selectId,
      getProductsByType('storage'),
      COMPONENT_CONFIG.storage
    );
    fillSelect(
      COMPONENT_CONFIG.extraStorage.selectId,
      getProductsByType('storage'),
      COMPONENT_CONFIG.extraStorage
    );
    fillSelect(
      COMPONENT_CONFIG.cooler.selectId,
      getProductsByType('cooler'),
      COMPONENT_CONFIG.cooler
    );
    fillSelect(COMPONENT_CONFIG.psu.selectId, getProductsByType('psu'), COMPONENT_CONFIG.psu);
    fillSelect(
      COMPONENT_CONFIG.pcCase.selectId,
      getProductsByType('case'),
      COMPONENT_CONFIG.pcCase
    );
    fillSelect(COMPONENT_CONFIG.fans.selectId, getProductsByType('fans'), COMPONENT_CONFIG.fans);

    applyCompatibilityFilters();
    updateSummary();
  } catch (error) {
    console.error('Ошибка загрузки комплектующих для конфигуратора:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  attachSelectListeners();

  if (configImageModalBackdrop) {
    configImageModalBackdrop.addEventListener('click', closeConfigImageModal);
  }

  if (configImageModalClose) {
    configImageModalClose.addEventListener('click', closeConfigImageModal);
  }

  if (configImageModalPrev) {
    configImageModalPrev.addEventListener('click', showPrevConfigImage);
  }

  if (configImageModalNext) {
    configImageModalNext.addEventListener('click', showNextConfigImage);
  }

  document.addEventListener('keydown', (event) => {
    if (!configImageModal?.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      closeConfigImageModal();
    }

    if (event.key === 'ArrowLeft') {
      showPrevConfigImage();
    }

    if (event.key === 'ArrowRight') {
      showNextConfigImage();
    }
  });

  const addButton = document.getElementById('add-config-to-cart');
  if (addButton) {
    addButton.addEventListener('click', addConfiguredPcToCart);
  }

  await loadConfiguratorProducts();
  updateSummary();
  updateCartIndicator();
  bindConfigPreviewGallery();
});