const loginForm = document.getElementById('customer-login-form');
const emailInput = document.getElementById('customer-login-email');
const codeInput = document.getElementById('customer-login-code');
const requestCodeBtn = document.getElementById('request-code-btn');
const loginMessage = document.getElementById('customer-login-message');

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function showMessage(text, type = 'success') {
  if (!loginMessage) return;

  loginMessage.innerHTML = text
    ? `<div class="checkout-message checkout-message--${type}">${text}</div>`
    : '';
}

async function requestCode() {
  const email = normalizeEmail(emailInput?.value);

  if (!isValidEmail(email)) {
    showMessage('Введите корректный email.', 'error');
    return;
  }

  let timeoutId;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 25000);

    requestCodeBtn.disabled = true;
    requestCodeBtn.textContent = 'Отправляем код...';
    showMessage('');

    const response = await fetch('/api/customer/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось получить код');
    }

    showMessage('Код отправлен на email. Проверьте входящие и папку спам.');
    codeInput?.focus();
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Сервер слишком долго отправляет письмо. Попробуйте еще раз или проверьте SMTP-порт.'
      : error.message || 'Не удалось получить код.';

    showMessage(message, 'error');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    requestCodeBtn.disabled = false;
    requestCodeBtn.textContent = 'Получить код';
  }
}

async function verifyCode(event) {
  event.preventDefault();

  const email = normalizeEmail(emailInput?.value);
  const code = codeInput?.value.trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    showMessage('Введите email и 6-значный код.', 'error');
    return;
  }

  try {
    showMessage('Проверяем код...');

    const response = await fetch('/api/customer/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось войти');
    }

    window.location.href = '/customer-account.html';
  } catch (error) {
    showMessage(error.message || 'Не удалось войти.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requestCodeBtn?.addEventListener('click', requestCode);
  loginForm?.addEventListener('submit', verifyCode);
});
