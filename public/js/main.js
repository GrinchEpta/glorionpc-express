const MAIN_API_URL = '/api/products';
const featuredProductsContainer = document.getElementById('featured-products');

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

/* =========================
   ФИЛЬТР: ТОЛЬКО ГОТОВЫЕ ПК
========================= */
function isReadyPc(product) {
  const category = String(product?.category || '').toLowerCase().trim();

  return (
    !product?.componentType &&
    product?.isConfiguratorItem !== true &&
    category !== 'комплектующие'
  );
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
    description: product.description || '',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    category: product.category || 'Сборка',
    cpu: product.cpu || '-',
    gpu: product.gpu || '-',
    ram: product.ram || '-',
    ssd: product.ssd || '-',
    avitoUrl: product.avitoUrl ? String(product.avitoUrl).trim() : '',
    images: getImages(product)
  };
}

function goToProduct(id) {
  window.location.href = `/product.html?id=${id}`;
}

window.goToProduct = goToProduct;

function getCartTarget() {
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

/* =========================
   АНИМАЦИЯ: ФОТО ИЗ КНОПКИ В КОРЗИНУ
========================= */
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

      if (cartIcon) {
        cartIcon.classList.add('cart-bump-strong');
        cartIcon.classList.add('cart-flash');

        setTimeout(() => {
          cartIcon.classList.remove('cart-bump-strong');
          cartIcon.classList.remove('cart-flash');
        }, 500);
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

function initCardSlider(card, images) {
  const img = card.querySelector('.product-card__image-main');
  const prevBtn = card.querySelector('.product-card__arrow--left');
  const nextBtn = card.querySelector('.product-card__arrow--right');

  if (!img || !prevBtn || !nextBtn) return;

  let currentIndex = 0;

  function updateImage() {
    img.src = images[currentIndex];
    prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
  }

  prevBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateImage();
  });

  nextBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    updateImage();
  });

  updateImage();
}

function createProductCard(rawProduct, index = 0) {
  const product = normalizeProduct(rawProduct);
  const article = document.createElement('article');
  article.className = 'product-card reveal';

  if (index % 3 === 0) article.classList.add('reveal-delay-1');
  if (index % 3 === 1) article.classList.add('reveal-delay-2');
  if (index % 3 === 2) article.classList.add('reveal-delay-3');

  article.innerHTML = `
    <div class="product-card__image-slider" onclick="goToProduct(${product.id})">
      <button type="button" class="product-card__arrow product-card__arrow--left">‹</button>
      <img src="${product.images[0] || '/images/logo-glorionpc.png'}" alt="${product.name}" class="product-card__image-main">
      <button type="button" class="product-card__arrow product-card__arrow--right">›</button>
    </div>

    <div class="product-card__body">
      <span class="product-card__category">${product.category}</span>

      <h3 class="product-card__title" onclick="goToProduct(${product.id})">
        ${product.name}
      </h3>

      <p class="product-card__desc" onclick="goToProduct(${product.id})">
        ${product.description}
      </p>

      <ul class="product-card__specs" onclick="goToProduct(${product.id})">
        <li><strong>CPU:</strong> ${product.cpu}</li>
        <li><strong>GPU:</strong> ${product.gpu}</li>
        <li><strong>RAM:</strong> ${product.ram}</li>
        <li><strong>SSD:</strong> ${product.ssd}</li>
      </ul>

      <div class="product-card__footer">
        <div class="product-card__prices" onclick="goToProduct(${product.id})">
          <span class="product-card__price">${formatPrice(product.price)}</span>
          ${
            product.oldPrice
              ? `<span class="product-card__old-price">${formatPrice(product.oldPrice)}</span>`
              : ''
          }
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" class="product-card__button product-card__buy-button">Купить</button>
          ${
            product.avitoUrl
              ? `<a href="${product.avitoUrl}" target="_blank" rel="noopener noreferrer" class="product-card__button" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">Авито</a>`
              : ''
          }
        </div>
      </div>
    </div>
  `;

  const buyButton = article.querySelector('.product-card__buy-button');

  buyButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (window.CartUtils && typeof window.CartUtils.addToCart === 'function') {
      CartUtils.addToCart(product);
      updateCartIndicatorAfterAdd();
    }

    animateFlyFromButton(buyButton, product.images[0], article);

    const originalText = buyButton.textContent;
    buyButton.textContent = 'Добавлено';
    buyButton.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      buyButton.disabled = false;
    }, 1200);
  });

  initCardSlider(article, product.images);

  return article;
}

function initSlider(containerId, prevBtnId, nextBtnId) {
  const slider = document.getElementById(containerId);
  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);

  if (!slider || !prevBtn || !nextBtn) return;

  function getScrollAmount() {
    const firstCard = slider.querySelector('.product-card');
    if (!firstCard) return 424;

    const styles = window.getComputedStyle(slider);
    const gap = parseInt(styles.gap || styles.columnGap || '24', 10);
    return firstCard.offsetWidth + gap;
  }

  prevBtn.onclick = () => {
    slider.scrollBy({
      left: -getScrollAmount(),
      behavior: 'smooth'
    });
  };

  nextBtn.onclick = () => {
    slider.scrollBy({
      left: getScrollAmount(),
      behavior: 'smooth'
    });
  };
}

async function loadFeaturedProducts() {
  if (!featuredProductsContainer) return;

  try {
    const response = await fetch(MAIN_API_URL);

    if (!response.ok) {
      throw new Error('Не удалось загрузить товары');
    }

    const products = await response.json();

    const readyProducts = Array.isArray(products)
      ? products.filter(isReadyPc)
      : [];

    featuredProductsContainer.innerHTML = '';

    if (!readyProducts.length) {
      featuredProductsContainer.innerHTML = '<p>Готовых ПК пока нет.</p>';
      return;
    }

    readyProducts.slice(0, 10).forEach((product, index) => {
      featuredProductsContainer.appendChild(createProductCard(product, index));
    });

    initSlider('featured-products', 'featured-prev', 'featured-next');
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    featuredProductsContainer.innerHTML = '<p>Не удалось загрузить товары.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadFeaturedProducts);