const productContainer = document.getElementById('product-page');

/* =========================
   💵 ЦЕНА
========================= */

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

/* =========================
   🔎 ID ТОВАРА ИЗ URL
========================= */

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/* =========================
   🖼 КАРТИНКИ
========================= */

function getImages(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map(image => {
      if (typeof image === 'string') return image;
      return image?.url || '/images/logo-glorionpc.png';
    });
  }

  if (product.image) return [product.image];
  if (product.imageUrl) return [product.imageUrl];
  if (product.photo) return [product.photo];

  return ['/images/logo-glorionpc.png'];
}

/* =========================
   🔧 НОРМАЛИЗАЦИЯ
========================= */

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name || 'Без названия',
    description: product.description || '',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    category: product.category || 'Сборка',
    cpu: product.cpu || '-',
    gpu: product.gpu || '-',
    ram: product.ram || '-',
    ssd: product.ssd || '-',
    inStock: Boolean(product.inStock),
    images: getImages(product)
  };
}

/* =========================
   🎯 ЦЕЛЬ КОРЗИНЫ
========================= */

function getCartTarget() {
  return document.querySelector('#cart-target');
}

/* =========================
   ✨ ЧАСТИЦЫ
========================= */

function createCartParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('span');
    particle.className = 'cart-particle';

    const angle = (Math.PI * 2 * i) / 6;
    const distance = 20 + Math.random() * 20;
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

/* =========================
   🚀 АНИМАЦИЯ В КОРЗИНУ
========================= */

function animateFly(imageElement, pulseElement = null) {
  const cartTarget = getCartTarget();
  if (!imageElement || !cartTarget) return;

  const imgRect = imageElement.getBoundingClientRect();
  const cartRect = cartTarget.getBoundingClientRect();

  const clone = imageElement.cloneNode(true);
  clone.className = 'fly-cart-image';

  Object.assign(clone.style, {
    position: 'fixed',
    left: `${imgRect.left}px`,
    top: `${imgRect.top}px`,
    width: `${imgRect.width}px`,
    height: `${imgRect.height}px`,
    zIndex: '99999',
    pointerEvents: 'none',
    margin: '0'
  });

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

    const arcHeight = -200;
    const currentX = startX + diffX * eased;
    const currentY =
      startY +
      diffY * eased +
      arcHeight * 4 * eased * (1 - eased);

    const scale = 1 - 0.8 * eased;
    const rotate = 20 * eased;
    const opacity = 1 - 0.6 * eased;

    clone.style.left = `${currentX}px`;
    clone.style.top = `${currentY}px`;
    clone.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    clone.style.opacity = `${opacity}`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      clone.remove();

      const cartTargetEl = document.getElementById('cart-target');
      const cartCount = document.getElementById('cart-count');

      if (cartTargetEl) {
        cartTargetEl.classList.add('cart-bump-strong');
        setTimeout(() => {
          cartTargetEl.classList.remove('cart-bump-strong');
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
   🖼 ГАЛЕРЕЯ
========================= */

function initProductGallery(container, images) {
  const mainImage = container.querySelector('.product-gallery__main img');
  const thumbsContainer = container.querySelector('.product-gallery__thumbs');

  if (!mainImage || !thumbsContainer) return;

  thumbsContainer.innerHTML = '';

  images.forEach((src, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = `product-gallery__thumb ${index === 0 ? 'is-active' : ''}`;
    thumb.innerHTML = `<img src="${src}" alt="Миниатюра ${index + 1}">`;

    thumb.addEventListener('click', () => {
      mainImage.src = src;

      thumbsContainer.querySelectorAll('.product-gallery__thumb').forEach(btn => {
        btn.classList.remove('is-active');
      });

      thumb.classList.add('is-active');
    });

    thumbsContainer.appendChild(thumb);
  });
}

/* =========================
   🔍 МОДАЛКА / ZOOM
========================= */

function initImageZoom(images) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  const closeBtn = document.getElementById('imageModalClose');
  const prevBtn = document.getElementById('modalPrev');
  const nextBtn = document.getElementById('modalNext');
  const mainImage = document.querySelector('.product-gallery__main img');
  const thumbs = document.querySelectorAll('.product-gallery__thumb');

  if (!modal || !modalImg || !mainImage) return;

  let currentIndex = 0;

  function updateModalImage() {
    modalImg.src = images[currentIndex];
  }

  function openModal(index) {
    currentIndex = index;
    updateModalImage();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modalImg.src = '';
    document.body.style.overflow = '';
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % images.length;
    updateModalImage();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateModalImage();
  }

  mainImage.style.cursor = 'zoom-in';
  mainImage.addEventListener('click', () => {
    const currentMainSrc = mainImage.getAttribute('src');
    const foundIndex = images.findIndex(src => src === currentMainSrc);
    openModal(foundIndex >= 0 ? foundIndex : 0);
  });

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('dblclick', () => {
      openModal(index);
    });
  });

  closeBtn?.addEventListener('click', event => {
    event.stopPropagation();
    closeModal();
  });

  prevBtn?.addEventListener('click', event => {
    event.stopPropagation();
    showPrev();
  });

  nextBtn?.addEventListener('click', event => {
    event.stopPropagation();
    showNext();
  });

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('is-open')) return;

    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowRight') showNext();
    if (event.key === 'ArrowLeft') showPrev();
  });
}

/* =========================
   📦 ЗАГРУЗКА ТОВАРА
========================= */

async function loadProduct() {
  if (!productContainer) return;

  const productId = getProductIdFromUrl();

  if (!productId) {
    productContainer.innerHTML = '<p>Товар не указан.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);

    if (!response.ok) {
      throw new Error('Товар не найден');
    }

    const rawProduct = await response.json();
    const product = normalizeProduct(rawProduct);

    productContainer.innerHTML = `
      <div class="product-details">
        <div class="product-gallery">
          <div class="product-gallery__main product-details__image">
            <img
              src="${product.images[0] || '/images/logo-glorionpc.png'}"
              alt="${product.name}"
              class="product-details__image-tag"
            />
          </div>

          <div class="product-gallery__thumbs"></div>
        </div>

        <div class="product-details__info">
          <span class="product-card__category">${product.category}</span>
          <h1 class="product-details__title">${product.name}</h1>
          <p class="product-details__desc">${product.description}</p>

          <div class="product-details__prices">
            <span class="product-details__price">${formatPrice(product.price)}</span>
            ${
              product.oldPrice
                ? `<span class="product-details__old-price">${formatPrice(product.oldPrice)}</span>`
                : ''
            }
          </div>

          <div class="product-details__stock">
            <span class="${product.inStock ? 'in-stock' : 'out-of-stock'}">
              ${product.inStock ? 'В наличии' : 'Нет в наличии'}
            </span>
          </div>

          <div class="product-details__specs">
            <h3>Характеристики</h3>
            <ul>
              <li><strong>CPU:</strong> ${product.cpu}</li>
              <li><strong>GPU:</strong> ${product.gpu}</li>
              <li><strong>RAM:</strong> ${product.ram}</li>
              <li><strong>SSD:</strong> ${product.ssd}</li>
            </ul>
          </div>

          <button type="button" class="btn btn-gold" id="add-to-cart-btn">
            Купить
          </button>
        </div>
      </div>
    `;

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    addToCartBtn?.addEventListener('click', () => {
      const img = productContainer.querySelector('.product-details__image-tag');
      const pulseTarget = productContainer.querySelector('.product-details');

      animateFly(img, pulseTarget);

      setTimeout(() => {
        CartUtils.addToCart(product);
      }, 200);
    });

    initProductGallery(productContainer, product.images);
    initImageZoom(product.images);
  } catch (error) {
    console.error('Ошибка загрузки товара:', error);
    productContainer.innerHTML = '<p>Не удалось загрузить товар.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadProduct);