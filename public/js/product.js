const PRODUCT_API_URL = '/api/products';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function getImages(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map((image) => {
      if (typeof image === 'string') return image;
      return image?.url || '/images/logo-glorionpc.png';
    });
  }

  if (product.image) return [product.image];
  if (product.imageUrl) return [product.imageUrl];
  if (product.photo) return [product.photo];

  return ['/images/logo-glorionpc.png'];
}

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name || 'Без названия',
    description: product.description || 'Описание отсутствует',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    category: product.category || 'Товар',
    cpu: product.cpu || '-',
    gpu: product.gpu || '-',
    ram: product.ram || '-',
    ssd: product.ssd || '-',
    inStock: Boolean(product.inStock),
    images: getImages(product)
  };
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderGallery(images) {
  const mainImage = document.getElementById('product-main-image');
  const thumbsContainer = document.getElementById('product-gallery-thumbs');

  if (!mainImage || !thumbsContainer) return;

  const safeImages = images.length ? images : ['/images/logo-glorionpc.png'];
  mainImage.src = safeImages[0];

  thumbsContainer.innerHTML = '';

  safeImages.forEach((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `product-gallery__thumb ${index === 0 ? 'active' : ''}`;
    button.innerHTML = `<img src="${src}" alt="Фото товара ${index + 1}">`;

    button.addEventListener('click', () => {
      mainImage.src = src;

      thumbsContainer
        .querySelectorAll('.product-gallery__thumb')
        .forEach((thumb) => thumb.classList.remove('active'));

      button.classList.add('active');
    });

    thumbsContainer.appendChild(button);
  });
}

function renderPrices(product) {
  setText('product-price', formatPrice(product.price));

  const oldPriceElement = document.getElementById('product-old-price');
  if (!oldPriceElement) return;

  if (product.oldPrice) {
    oldPriceElement.textContent = formatPrice(product.oldPrice);
    oldPriceElement.style.display = '';
  } else {
    oldPriceElement.textContent = '';
    oldPriceElement.style.display = 'none';
  }
}

function renderStock(product) {
  const stockElement = document.getElementById('product-stock');
  if (!stockElement) return;

  stockElement.textContent = product.inStock ? 'В наличии' : 'Нет в наличии';
}

function renderSpecs(product) {
  const specsList = document.getElementById('product-specs');
  if (!specsList) return;

  const specs = [
    ['CPU', product.cpu],
    ['GPU', product.gpu],
    ['RAM', product.ram],
    ['SSD', product.ssd]
  ].filter(([, value]) => value && value !== '-');

  if (!specs.length) {
    specsList.innerHTML = '<li>Характеристики отсутствуют</li>';
    return;
  }

  specsList.innerHTML = specs
    .map(
      ([label, value]) => `
        <li class="product-spec-item">
          <span class="product-spec-item__label">${label}</span>
          <span class="product-spec-item__value">${value}</span>
        </li>
      `
    )
    .join('');
}

/* =========================
   АНИМАЦИЯ В КОРЗИНУ
========================= */

function getCartTarget() {
  return document.querySelector('#cart-target');
}

function createCartParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('span');
    particle.className = 'cart-particle';

    const angle = (Math.PI * 2 * i) / 6;
    const distance = 24 + Math.random() * 18;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(particle);

    setTimeout(() => particle.remove(), 600);
  }
}

function animateFly(imageElement, pulseElement = null) {
  const cartTarget = getCartTarget();
  if (!imageElement || !cartTarget) return;

  const imgRect = imageElement.getBoundingClientRect();
  const cartRect = cartTarget.getBoundingClientRect();

  const clone = imageElement.cloneNode(true);
  clone.className = 'fly-cart-image';
  clone.style.position = 'fixed';
  clone.style.left = `${imgRect.left}px`;
  clone.style.top = `${imgRect.top}px`;
  clone.style.width = `${imgRect.width}px`;
  clone.style.height = `${imgRect.height}px`;
  clone.style.zIndex = '99999';
  clone.style.pointerEvents = 'none';
  clone.style.margin = '0';

  document.body.appendChild(clone);

  if (pulseElement) {
    pulseElement.classList.add('product-card--pulse');
    setTimeout(() => {
      pulseElement.classList.remove('product-card--pulse');
    }, 280);
  }

  const startX = imgRect.left;
  const startY = imgRect.top;
  const endX = cartRect.left + cartRect.width / 2 - 20;
  const endY = cartRect.top + cartRect.height / 2 - 20;

  const diffX = endX - startX;
  const diffY = endY - startY;

  const duration = 900;
  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animate(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = easeInOutCubic(progress);

    const arcHeight = -180;
    const currentX = startX + diffX * eased;
    const currentY =
      startY +
      diffY * eased +
      arcHeight * 4 * eased * (1 - eased);

    const scale = 1 - 0.78 * eased;
    const rotate = 18 * eased;
    const opacity = 1 - 0.55 * eased;

    clone.style.left = `${currentX}px`;
    clone.style.top = `${currentY}px`;
    clone.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    clone.style.opacity = `${opacity}`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      clone.remove();

      const cartTargetElement = document.getElementById('cart-target');
      const cartCount = document.getElementById('cart-count');

      if (cartTargetElement) {
        cartTargetElement.classList.add('cart-bump-strong');

        setTimeout(() => {
          cartTargetElement.classList.remove('cart-bump-strong');
        }, 450);
      }

      if (cartCount) {
        cartCount.classList.add('cart-count-pop');
        setTimeout(() => {
          cartCount.classList.remove('cart-count-pop');
        }, 450);
      }

      createCartParticles(
        cartRect.left + cartRect.width / 2,
        cartRect.top + cartRect.height / 2
      );
    }
  }

  requestAnimationFrame(animate);
}

/* =========================
   УВЕЛИЧЕНИЕ КАРТИНКИ
========================= */

function initImageModal() {
  const mainImage = document.getElementById('product-main-image');
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('image-modal-img');
  const closeBtn = document.getElementById('image-modal-close');

  if (!mainImage || !modal || !modalImg || !closeBtn) return;

  function openModal(src) {
    modalImg.src = src;
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    modalImg.src = '';
  }

  mainImage.addEventListener('click', () => {
    if (mainImage.src) {
      openModal(mainImage.src);
    }
  });

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

function bindBuyButton(product) {
  const button = document.getElementById('product-buy-button');
  if (!button) return;

  button.addEventListener('click', () => {
    if (!window.CartUtils) return;

    const mainImage = document.getElementById('product-main-image');
    const productInfoCard = document.querySelector('.product-details__info');

    if (mainImage) {
      animateFly(mainImage, productInfoCard);
    }

    setTimeout(() => {
      window.CartUtils.addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug || `product-${product.id}`,
        category: product.category || 'Товар',
        price: Number(product.price) || 0,
        oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
        image: product.images[0] || '/images/logo-glorionpc.png',
        quantity: 1,
        specs: {
          cpu: product.cpu || '',
          gpu: product.gpu || '',
          ram: product.ram || '',
          storage: product.ssd || ''
        }
      });

      if (window.updateCartIndicator) {
        window.updateCartIndicator();
      }

      const originalText = button.textContent;
      button.textContent = 'Добавлено';
      button.disabled = true;

      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1200);
    }, 180);
  });
}

function renderProduct(product) {
  document.title = `${product.name} — GlorionPC`;

  setText('product-page-title', product.name);
  setText('product-category', product.category);
  setText('product-title', product.name);
  setText('product-description', product.description);

  renderGallery(product.images);
  renderPrices(product);
  renderStock(product);
  renderSpecs(product);
  bindBuyButton(product);
  initImageModal();
}

async function loadProduct() {
  const productId = getProductIdFromUrl();

  if (!productId) {
    setText('product-page-title', 'Товар не найден');
    setText('product-title', 'Товар не найден');
    setText('product-description', 'В ссылке отсутствует ID товара.');
    return;
  }

  try {
    const response = await fetch(`${PRODUCT_API_URL}/${productId}`);

    if (!response.ok) {
      throw new Error('Не удалось загрузить товар');
    }

    const rawProduct = await response.json();
    const product = normalizeProduct(rawProduct);

    renderProduct(product);
  } catch (error) {
    console.error('Ошибка загрузки товара:', error);
    setText('product-page-title', 'Ошибка загрузки');
    setText('product-title', 'Ошибка загрузки');
    setText('product-description', 'Не удалось загрузить карточку товара.');
  }
}

document.addEventListener('DOMContentLoaded', loadProduct);