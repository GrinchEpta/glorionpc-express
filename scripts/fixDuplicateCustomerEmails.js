const prisma = require('../server/prisma');

const shouldApply = process.argv.includes('--apply');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function pickKeeper(customers) {
  return [...customers].sort((a, b) => {
    const dateDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return dateDiff || a.id - b.id;
  })[0];
}

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          orders: true,
          customPcRequests: true
        }
      }
    }
  });

  const blankEmailCustomers = customers.filter(
    (customer) => customer.email !== null && normalizeEmail(customer.email) === ''
  );

  const groups = new Map();

  customers.forEach((customer) => {
    const email = normalizeEmail(customer.email);
    if (!email) return;

    if (!groups.has(email)) groups.set(email, []);
    groups.get(email).push(customer);
  });

  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);

  console.log(`Customers: ${customers.length}`);
  console.log(`Blank emails to convert to null: ${blankEmailCustomers.length}`);
  console.log(`Duplicate email groups: ${duplicateGroups.length}`);

  if (!duplicateGroups.length && !blankEmailCustomers.length) {
    console.log('No duplicate or blank customer emails found.');
    return;
  }

  duplicateGroups.forEach(([email, group]) => {
    const keeper = pickKeeper(group);
    console.log(`\n${email}`);
    console.log(`  keep customer #${keeper.id} (${keeper.name || '-'}, ${keeper.phone || '-'})`);

    group
      .filter((customer) => customer.id !== keeper.id)
      .forEach((customer) => {
        console.log(
          `  merge customer #${customer.id} (${customer.name || '-'}, ${customer.phone || '-'}) ` +
          `orders=${customer._count.orders}, requests=${customer._count.customPcRequests}`
        );
      });
  });

  if (!shouldApply) {
    console.log('\nDry run only. Run with --apply to update the database.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const customer of blankEmailCustomers) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { email: null }
      });
    }

    for (const [email, group] of duplicateGroups) {
      const keeper = pickKeeper(group);
      const duplicates = group.filter((customer) => customer.id !== keeper.id);

      for (const duplicate of duplicates) {
        await tx.order.updateMany({
          where: { customerId: duplicate.id },
          data: { customerId: keeper.id }
        });

        await tx.customPcRequest.updateMany({
          where: { customerId: duplicate.id },
          data: { customerId: keeper.id }
        });

        await tx.customer.delete({
          where: { id: duplicate.id }
        });
      }

      const name = keeper.name || group.find((customer) => customer.name)?.name || null;
      const phone = keeper.phone || group.find((customer) => customer.phone)?.phone || null;

      await tx.customer.update({
        where: { id: keeper.id },
        data: {
          email,
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {})
        }
      });
    }
  });

  console.log('\nDuplicate customer emails fixed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
