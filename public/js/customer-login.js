const loginForm = document.getElementById('customer-login-form');
const phoneInput = document.getElementById('customer-login-phone');
const codeInput = document.getElementById('customer-login-code');
const requestCodeBtn = document.getElementById('request-code-btn');
const loginMessage = document.getElementById('customer-login-message');

function getPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatPhoneValue(value) {
  let digits = getPhoneDigits(value);

  if (!digits.length) return '';
  if (digits[0] === '8') digits = '7' + digits.slice(1);
  if (digits[0] !== '7') digits = '7' + digits;

  digits = digits.slice(0, 11);

  let result = '+7';
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length >= 5) result += ') ' + digits.slice(4, 7);
  if (digits.length >= 8) result += '-' + digits.slice(7, 9);
  if (digits.length >= 10) result += '-' + digits.slice(9, 11);

  return result;
}

function showMessage(text, type = 'success') {
  if (!loginMessage) return;

  loginMessage.innerHTML = text
    ? `<div class="checkout-message checkout-message--${type}">${text}</div>`
    : '';
}

function setupPhoneMask() {
  if (!phoneInput) return;

  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value.trim()) phoneInput.value = '+7';
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhoneValue(phoneInput.value);
  });

  phoneInput.addEventListener('blur', () => {
    if (getPhoneDigits(phoneInput.value).length <= 1) {
      phoneInput.value = '';
    }
  });
}

async function requestCode() {
  const phone = phoneInput?.value.trim();

  if (getPhoneDigits(phone).length !== 11) {
    showMessage('Введите телефон в формате +7 (999) 999-99-99.', 'error');
    return;
  }

  try {
    requestCodeBtn.disabled = true;
    requestCodeBtn.textContent = 'Отправляем код...';
    showMessage('');

    const response = await fetch('/api/customer/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось получить код');
    }

    showMessage('Код отправлен по SMS. Если SMS-сервис не настроен, код появится в консоли сервера.');
    codeInput?.focus();
  } catch (error) {
    showMessage(error.message || 'Не удалось получить код.', 'error');
  } finally {
    requestCodeBtn.disabled = false;
    requestCodeBtn.textContent = 'Получить код';
  }
}

async function verifyCode(event) {
  event.preventDefault();

  const phone = phoneInput?.value.trim();
  const code = codeInput?.value.trim();

  if (getPhoneDigits(phone).length !== 11 || !/^\d{6}$/.test(code)) {
    showMessage('Введите телефон и 6-значный код.', 'error');
    return;
  }

  try {
    showMessage('Проверяем код...');

    const response = await fetch('/api/customer/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
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
  setupPhoneMask();
  requestCodeBtn?.addEventListener('click', requestCode);
  loginForm?.addEventListener('submit', verifyCode);
});
