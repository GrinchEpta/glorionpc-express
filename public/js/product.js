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
    slug: product.slug || `product-${product.id}`,
    avitoUrl: product.avitoUrl ? String(product.avitoUrl).trim() : '',
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

function renderAvitoButton(product) {
  const avitoButton = document.getElementById('product-avito-button');
  if (!avitoButton) return;

  if (product.avitoUrl) {
    avitoButton.href = product.avitoUrl;
    avitoButton.style.display = 'inline-flex';
  } else {
    avitoButton.removeAttribute('href');
    avitoButton.style.display = 'none';
  }
}

/* =========================
   АНИМАЦИЯ В КОРЗИНУ
========================= */

function getCartTarget() {
  const mobileMenuButton = document.querySelector('.mobile-menu-toggle');

  if (mobileMenuButton && window.matchMedia('(max-width: 820px)').matches) {
    return mobileMenuButton;
  }

  return document.querySelector('#cart-target');
}

function updateCartIndicatorAfterAdd() {
  if (window.CartUtils && typeof window.CartUtils.updateCartCount === 'function') {
    window.CartUtils.updateCartCount();
  }

  const cartTarget = getCartTarget();
  if (cartTarget) {
    cartTarget.classList.add('is-visible');
  }
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

function animateFlyFromButton(buttonElement, imageSrc, pulseElement = null) {
  const cartTarget = getCartTarget();
  if (!buttonElement || !cartTarget) return;

  const buttonRect = buttonElement.getBoundingClientRect();
  const cartRect = cartTarget.getBoundingClientRect();

  const clone = document.createElement('img');
  clone.src = imageSrc || '/images/logo-glorionpc.png';
  clone.className = 'fly-cart-image';
  clone.style.position = 'fixed';
  clone.style.left = `${buttonRect.left + buttonRect.width / 2 - 36}px`;
  clone.style.top = `${buttonRect.top + buttonRect.height / 2 - 36}px`;
  clone.style.width = '72px';
  clone.style.height = '72px';
  clone.style.zIndex = '99999';
  clone.style.pointerEvents = 'none';
  clone.style.margin = '0';
  clone.style.borderRadius = '14px';
  clone.style.objectFit = 'cover';
  clone.style.border = '1px solid rgba(212, 166, 74, 0.35)';
  clone.style.boxShadow =
    '0 14px 30px rgba(0, 0, 0, 0.35), 0 0 18px rgba(212, 166, 74, 0.22)';
  clone.style.background = 'rgba(10, 12, 20, 0.96)';

  document.body.appendChild(clone);

  if (pulseElement) {
    pulseElement.classList.add('product-card--pulse');
    setTimeout(() => {
      pulseElement.classList.remove('product-card--pulse');
    }, 280);
  }

  const startX = buttonRect.left + buttonRect.width / 2 - 36;
  const startY = buttonRect.top + buttonRect.height / 2 - 36;
  const endX = cartRect.left + cartRect.width / 2 - 11;
  const endY = cartRect.top + cartRect.height / 2 - 11;

  const diffX = endX - startX;
  const diffY = endY - startY;

  const duration = 850;
  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animate(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = easeInOutCubic(progress);

    const arcHeight = -160;
    const currentX = startX + diffX * eased;
    const currentY =
      startY +
      diffY * eased +
      arcHeight * 4 * eased * (1 - eased);

    const scale = 1 - 0.75 * eased;
    const rotate = 16 * eased;
    const opacity = 1 - 0.6 * eased;
    const size = 72 - 50 * eased;

    clone.style.left = `${currentX}px`;
    clone.style.top = `${currentY}px`;
    clone.style.width = `${size}px`;
    clone.style.height = `${size}px`;
    clone.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    clone.style.opacity = `${opacity}`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      clone.remove();

      const cartIcon = document.querySelector('#cart-icon');
      const cartCount = document.getElementById('cart-count');
      const cartTargetElement = getCartTarget();

      if (cartIcon) {
        cartIcon.classList.add('cart-bump-strong');
        cartIcon.classList.add('cart-flash');

        setTimeout(() => {
          cartIcon.classList.remove('cart-bump-strong');
          cartIcon.classList.remove('cart-flash');
        }, 500);
      }

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
   IMAGE MODAL
========================= */

function initImageModal() {
  const mainImage = document.getElementById('product-main-image');
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('image-modal-img');
  const closeBtn = document.getElementById('image-modal-close');

  if (!mainImage || !modal || !modalImg || !closeBtn) return;

  mainImage.style.cursor = 'zoom-in';

  function openModal(src) {
    modalImg.src = src;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modalImg.src = '';
    document.body.style.overflow = '';
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

/* =========================
   LOAD PRODUCT
========================= */

async function loadProduct() {
  const productId = getProductIdFromUrl();

  if (!productId) {
    setText('product-page-title', 'Товар не найден');
    setText('product-title', 'Товар не найден');
    setText('product-description', 'Некорректный ID товара.');
    return;
  }

  try {
    const response = await fetch(`${PRODUCT_API_URL}/${productId}`);

    if (!response.ok) {
      throw new Error('Не удалось загрузить товар');
    }

    const rawProduct = await response.json();
    const product = normalizeProduct(rawProduct);

    document.title = `GlorionPC — ${product.name}`;
    setText('product-page-title', product.name);
    setText('product-category', product.category);
    setText('product-title', product.name);
    setText('product-description', product.description);

    renderPrices(product);
    renderStock(product);
    renderSpecs(product);
    renderGallery(product.images);
    renderAvitoButton(product);

    const buyButton = document.getElementById('product-buy-button');

    if (buyButton) {
      if (!product.inStock) {
        buyButton.textContent = 'Нет в наличии';
        buyButton.disabled = true;
        return;
      }

      buyButton.addEventListener('click', () => {
        if (!product.inStock) {
          return;
        }

        if (window.CartUtils && typeof window.CartUtils.addToCart === 'function') {
          window.CartUtils.addToCart(product);
          updateCartIndicatorAfterAdd();
        }

        animateFlyFromButton(buyButton, product.images[0]);

        const originalText = buyButton.textContent;
        buyButton.textContent = 'Добавлено';
        buyButton.disabled = true;

        setTimeout(() => {
          buyButton.textContent = originalText;
          buyButton.disabled = false;
        }, 1200);
      });
    }

    initImageModal();
  } catch (error) {
    console.error('Ошибка загрузки товара:', error);
    setText('product-page-title', 'Ошибка');
    setText('product-title', 'Не удалось загрузить товар');
    setText('product-description', 'Попробуйте открыть страницу позже.');
  }
}

document.addEventListener('DOMContentLoaded', loadProduct);
