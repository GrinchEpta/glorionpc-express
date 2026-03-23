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
    return product.images.map((image) =>
      typeof image === 'string' ? image : image.url
    );
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
    inStock: product.inStock !== false,
    images: getImages(product)
  };
}

/* IMAGE MODAL */

function openImageModal(src, alt = '') {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('image-modal-img');

  if (!modal || !modalImg || !src) return;

  modalImg.src = src;
  modalImg.alt = alt || 'Увеличенное изображение товара';
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('image-modal-img');

  if (!modal || !modalImg) return;

  modal.classList.remove('is-open');
  modalImg.src = '';
  document.body.style.overflow = '';
}

function initImageModal() {
  const modal = document.getElementById('image-modal');
  const closeBtn = document.getElementById('image-modal-close');

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', closeImageModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeImageModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeImageModal();
    }
  });
}

/* FLY TO CART */

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

/* GALLERY */

function renderGallery(images, productName) {
  const mainImage = document.getElementById('product-main-image');
  const thumbsContainer = document.getElementById('product-gallery-thumbs');

  if (!mainImage || !thumbsContainer) return;

  let currentIndex = 0;

  function updateMainImage(index) {
    currentIndex = index;
    mainImage.src = images[currentIndex];
    mainImage.alt = productName;

    const thumbs = Array.from(
      thumbsContainer.querySelectorAll('.product-gallery__thumb')
    );

    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === currentIndex);
    });
  }

  thumbsContainer.innerHTML = '';

  images.forEach((imageSrc, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-gallery__thumb';
    if (index === 0) button.classList.add('is-active');

    button.innerHTML = `
      <img src="${imageSrc}" alt="${productName} ${index + 1}">
    `;

    button.addEventListener('click', () => {
      updateMainImage(index);
    });

    thumbsContainer.appendChild(button);
  });

  mainImage.src = images[0];
  mainImage.alt = productName;

  mainImage.addEventListener('click', () => {
    openImageModal(images[currentIndex], productName);
  });
}

/* RENDER PRODUCT */

function renderProduct(product) {
  const pageTitle = document.getElementById('product-page-title');
  const category = document.getElementById('product-category');
  const title = document.getElementById('product-title');
  const description = document.getElementById('product-description');
  const price = document.getElementById('product-price');
  const oldPrice = document.getElementById('product-old-price');
  const stock = document.getElementById('product-stock');
  const specsList = document.getElementById('product-specs');
  const buyButton = document.getElementById('product-buy-button');
  const mainImage = document.getElementById('product-main-image');
  const infoCard = document.querySelector('.product-details__info');

  if (pageTitle) pageTitle.textContent = 'Карточка товара';
  if (category) category.textContent = product.category;
  if (title) title.textContent = product.name;
  if (description) description.textContent = product.description;
  if (price) price.textContent = formatPrice(product.price);

  if (oldPrice) {
    if (product.oldPrice) {
      oldPrice.textContent = formatPrice(product.oldPrice);
      oldPrice.style.display = 'inline';
    } else {
      oldPrice.textContent = '';
      oldPrice.style.display = 'none';
    }
  }

  if (stock) {
    stock.textContent = product.inStock ? 'В наличии' : 'Нет в наличии';
    stock.classList.remove('in-stock', 'out-of-stock');
    stock.classList.add(product.inStock ? 'in-stock' : 'out-of-stock');
  }

  if (specsList) {
    specsList.innerHTML = `
      <li><strong>CPU:</strong> ${product.cpu}</li>
      <li><strong>GPU:</strong> ${product.gpu}</li>
      <li><strong>RAM:</strong> ${product.ram}</li>
      <li><strong>SSD:</strong> ${product.ssd}</li>
    `;
  }

  if (buyButton) {
    buyButton.onclick = () => {
      const imageForAnimation = mainImage || document.querySelector('.product-gallery__main img');
      animateFly(imageForAnimation, infoCard);

      setTimeout(() => {
        if (window.CartUtils && typeof window.CartUtils.addToCart === 'function') {
          window.CartUtils.addToCart(product);
        }
      }, 180);
    };
  }

  renderGallery(product.images, product.name);
}

async function loadProduct() {
  const productId = getProductIdFromUrl();
  if (!productId) return;

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

    const title = document.getElementById('product-title');
    const description = document.getElementById('product-description');

    if (title) title.textContent = 'Товар не найден';
    if (description) {
      description.textContent =
        'Не удалось загрузить информацию о товаре. Попробуйте обновить страницу.';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initImageModal();
  loadProduct();
});