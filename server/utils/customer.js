function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits[0] === '8') {
    digits = `7${digits.slice(1)}`;
  }

  if (digits[0] !== '7') {
    digits = `7${digits}`;
  }

  return digits.slice(0, 11);
}

function isValidPhone(phone) {
  return /^7\d{10}$/.test(phone);
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function namesEqual(a, b) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

async function findOrCreateCustomer(prisma, { phone, name, email }) {
  const normalizedPhone = phone ? normalizePhone(phone) : '';
  const normalizedEmail = email ? normalizeEmail(email) : '';

  if (phone && !isValidPhone(normalizedPhone)) {
    throw new Error('Некорректный номер телефона');
  }

  if (email && !isValidEmail(normalizedEmail)) {
    throw new Error('Некорректный email');
  }

  if (!normalizedPhone && !normalizedEmail) {
    throw new Error('Укажите телефон или email покупателя');
  }

  const normalizedName = name ? normalizeName(name) : null;
  const [customerByPhone, customerByEmail] = await Promise.all([
    normalizedPhone
      ? prisma.customer.findUnique({ where: { phone: normalizedPhone } })
      : null,
    normalizedEmail
      ? prisma.customer.findUnique({ where: { email: normalizedEmail } })
      : null
  ]);

  if (customerByPhone) {
    return prisma.customer.update({
      where: { id: customerByPhone.id },
      data: {
        ...(normalizedEmail && (!customerByEmail || customerByEmail.id === customerByPhone.id) ? { email: normalizedEmail } : {}),
        ...(normalizedName ? { name: normalizedName } : {})
      }
    });
  }

  if (customerByEmail && (!normalizedPhone || !customerByEmail.phone || customerByEmail.phone === normalizedPhone)) {
    return prisma.customer.update({
      where: { id: customerByEmail.id },
      data: {
        ...(normalizedPhone && !customerByEmail.phone ? { phone: normalizedPhone } : {}),
        ...(normalizedName ? { name: normalizedName } : {})
      }
    });
  }

  return prisma.customer.create({
    data: {
      phone: normalizedPhone || null,
      name: normalizedName,
      email: normalizedEmail && !customerByEmail ? normalizedEmail : null
    }
  });
}

module.exports = {
  normalizePhone,
  isValidPhone,
  normalizeEmail,
  isValidEmail,
  normalizeName,
  namesEqual,
  findOrCreateCustomer
};
