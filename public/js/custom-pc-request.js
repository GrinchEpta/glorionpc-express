const customPcForm = document.getElementById('custom-pc-form');
const customPcMessage = document.getElementById('custom-pc-message');
const customPcPhoneInput = document.getElementById('custom-pc-phone');

function getPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatPhoneValue(value) {
  let digits = getPhoneDigits(value);

  if (!digits.length) return '';

  if (digits[0] === '8') {
    digits = '7' + digits.slice(1);
  }

  if (digits[0] !== '7') {
    digits = '7' + digits;
  }

  digits = digits.slice(0, 11);

  let result = '+7';

  if (digits.length > 1) {
    result += ' (' + digits.slice(1, 4);
  }

  if (digits.length >= 5) {
    result += ') ' + digits.slice(4, 7);
  }

  if (digits.length >= 8) {
    result += '-' + digits.slice(7, 9);
  }

  if (digits.length >= 10) {
    result += '-' + digits.slice(9, 11);
  }

  return result;
}

function showCustomPcMessage(text, type = 'success') {
  if (!customPcMessage) return;

  if (!text) {
    customPcMessage.innerHTML = '';
    return;
  }

  customPcMessage.innerHTML = `
    <div class="checkout-message checkout-message--${type}">
      ${text}
    </div>
  `;
}

function setupCustomPcPhoneMask() {
  if (!customPcPhoneInput) return;

  customPcPhoneInput.addEventListener('focus', () => {
    if (!customPcPhoneInput.value.trim()) {
      customPcPhoneInput.value = '+7';
    }
  });

  customPcPhoneInput.addEventListener('input', () => {
    customPcPhoneInput.value = formatPhoneValue(customPcPhoneInput.value);
  });

  customPcPhoneInput.addEventListener('blur', () => {
    const digits = getPhoneDigits(customPcPhoneInput.value);

    if (digits.length <= 1) {
      customPcPhoneInput.value = '';
    }
  });
}

function saveCustomPcRequest(request) {
  if (!request || !request.id) return;

  const existing = JSON.parse(
    localStorage.getItem('glorionpc_custom_pc_requests') || '[]'
  );

  const filtered = existing.filter((item) => item.id !== request.id);
  filtered.unshift(request);

  localStorage.setItem(
    'glorionpc_custom_pc_requests',
    JSON.stringify(filtered)
  );
}

async function submitCustomPcRequest(event) {
  event.preventDefault();

  const customerName = document.getElementById('custom-pc-name')?.value.trim();
  const phone = document.getElementById('custom-pc-phone')?.value.trim();
  const email = document.getElementById('custom-pc-email')?.value.trim();
  const budget = document.getElementById('custom-pc-budget')?.value.trim();
  const designWishes = document.getElementById('custom-pc-design')?.value.trim();
  const caseSize = document.getElementById('custom-pc-size')?.value;
  const purpose = document.getElementById('custom-pc-purpose')?.value.trim();
  const comment = document.getElementById('custom-pc-comment')?.value.trim();

  if (!customerName || !phone || !email) {
    showCustomPcMessage('Заполните имя, телефон и email.', 'error');
    return;
  }

  const phoneDigits = getPhoneDigits(phone);

  if (phoneDigits.length !== 11 || phoneDigits[0] !== '7') {
    showCustomPcMessage('Введите телефон в формате +7 (999) 999-99-99.', 'error');
    return;
  }

  if (!email.includes('@')) {
    showCustomPcMessage('Введите корректный email.', 'error');
    return;
  }

  try {
    showCustomPcMessage('Отправляем заявку...', 'success');

    const response = await fetch('/api/custom-pc-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName,
        phone,
        email,
        budget: budget ? Number(budget) : null,
        designWishes,
        caseSize,
        purpose,
        comment
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось отправить заявку');
    }

    const request = data?.request || null;

    if (request) {
      request.createdAt = request.createdAt || new Date().toISOString();
      saveCustomPcRequest(request);
    }

    if (customPcForm) {
      customPcForm.reset();
    }

    if (customPcPhoneInput) {
      customPcPhoneInput.value = '';
    }

    showCustomPcMessage(
      `Заявка успешно отправлена. Номер заявки: #${request?.id || '-'}.`,
      'success'
    );
  } catch (error) {
    console.error('Ошибка отправки заявки:', error);
    showCustomPcMessage(
      error.message || 'Не удалось отправить заявку.',
      'error'
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupCustomPcPhoneMask();

  if (customPcForm) {
    customPcForm.addEventListener('submit', submitCustomPcRequest);
  }
});