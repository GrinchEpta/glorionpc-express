const CATALOG_API_URL = '/api/products';
const catalogProductsContainer = document.getElementById('catalog-products');
const catalogSortButtons = Array.from(document.querySelectorAll('[data-sort]'));

let catalogProductsData = [];
let currentCatalogSort = 'cheap';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(Number(price) || 0) + ' ₽';
}

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

        <button type="button" class="product-card__button">Купить</button>
      </div>
    </div>
  `;

  const button = article.querySelector('.product-card__button');

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (window.CartUtils && typeof window.CartUtils.addToCart === 'function') {
      CartUtils.addToCart(product);
      updateCartIndicatorAfterAdd();
    }

    animateFlyFromButton(button, product.images[0], article);

    const originalText = button.textContent;
    button.textContent = 'Добавлено';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  });

  initCardSlider(article, product.images);

  return article;
}

function sortProducts(products, sortType) {
  const sorted = [...products];

  if (sortType === 'expensive') {
    sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    return sorted;
  }

  sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  return sorted;
}

function renderCatalogProducts(products) {
  if (!catalogProductsContainer) return;

  catalogProductsContainer.innerHTML = '';

  if (!products.length) {
    catalogProductsContainer.innerHTML = '<p>Готовых ПК пока нет.</p>';
    return;
  }

  products.forEach((product, index) => {
    catalogProductsContainer.appendChild(createProductCard(product, index));
  });
}

function applyCatalogSort(sortType) {
  currentCatalogSort = sortType;

  catalogSortButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.sort === sortType);
  });

  renderCatalogProducts(sortProducts(catalogProductsData, currentCatalogSort));
}

function initCatalogSort() {
  if (!catalogSortButtons.length) return;

  catalogSortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyCatalogSort(button.dataset.sort || 'cheap');
    });
  });
}

async function loadCatalogProducts() {
  if (!catalogProductsContainer) return;

  try {
    const response = await fetch(CATALOG_API_URL);

    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }

    const products = await response.json();

    const readyProducts = Array.isArray(products)
      ? products.filter(isReadyPc)
      : [];

    catalogProductsData = readyProducts;
    applyCatalogSort(currentCatalogSort);
  } catch (error) {
    console.error('Ошибка загрузки каталога:', error);
    catalogProductsContainer.innerHTML = '<p>Не удалось загрузить товары.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCatalogSort();
  loadCatalogProducts();
});