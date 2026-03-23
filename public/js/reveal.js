function initReveal() {
  const elements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-zoom'
  );

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  elements.forEach(el => {
    observer.observe(el);
  });
}

function observeDynamicElements() {
  const mutationObserver = new MutationObserver(() => {
    initReveal();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  observeDynamicElements();
});