function initMobileMenu() {
  const header = document.querySelector('.header');
  const headerInner = document.querySelector('.header__inner');
  const nav = document.querySelector('.header .nav');

  if (!header || !headerInner || !nav || headerInner.querySelector('.mobile-menu-toggle')) {
    return;
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-menu-toggle';
  toggle.setAttribute('aria-label', 'Открыть меню');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  headerInner.insertBefore(toggle, nav);

  function closeMenu() {
    header.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
  }

  function toggleMenu() {
    const isOpen = header.classList.toggle('is-menu-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  }

  toggle.addEventListener('click', toggleMenu);

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.classList.contains('is-menu-open')) return;
    if (header.contains(event.target)) return;

    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });
}

document.addEventListener('DOMContentLoaded', initMobileMenu);
