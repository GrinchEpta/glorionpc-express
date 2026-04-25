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

function normalizeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function namesEqual(a, b) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

async function findOrCreateCustomer(prisma, { phone, name, email }) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidPhone(normalizedPhone)) {
    throw new Error('Некорректный номер телефона');
  }

  const normalizedName = name ? normalizeName(name) : null;
  const normalizedEmail = email ? String(email).trim() : null;

  return prisma.customer.upsert({
    where: { phone: normalizedPhone },
    update: {
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(normalizedEmail ? { email: normalizedEmail } : {})
    },
    create: {
      phone: normalizedPhone,
      name: normalizedName,
      email: normalizedEmail
    }
  });
}

module.exports = {
  normalizePhone,
  isValidPhone,
  normalizeName,
  namesEqual,
  findOrCreateCustomer
};
