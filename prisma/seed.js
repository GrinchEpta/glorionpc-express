const prisma = require('../server/prisma')

async function main() {
  const products = [
    {
      name: 'GlorionPC Gaming X1',
      slug: 'glorionpc-gaming-x1',
      price: 89990,
      oldPrice: 99990,
      category: 'Игровые',
      inStock: true,
      image: '/images/pc-placeholder.jpg',
      description: 'Игровой компьютер для Full HD и Quad HD на высоких настройках.',
      cpu: 'AMD Ryzen 5 5600',
      gpu: 'NVIDIA GeForce RTX 4060 8GB',
      ram: '16 GB DDR4',
      storage: '1 TB SSD NVMe',
    },
    {
      name: 'GlorionPC Ultra RTX',
      slug: 'glorionpc-ultra-rtx',
      price: 149990,
      oldPrice: 169990,
      category: 'Игровые',
      inStock: true,
      image: '/images/pc-placeholder.jpg',
      description: 'Мощная игровая сборка для современных AAA-игр и стриминга.',
      cpu: 'Intel Core i7-13700F',
      gpu: 'NVIDIA GeForce RTX 4070 Super',
      ram: '32 GB DDR5',
      storage: '1 TB SSD NVMe',
    },
    {
      name: 'GlorionPC Office Pro',
      slug: 'glorionpc-office-pro',
      price: 64990,
      oldPrice: null,
      category: 'Рабочие',
      inStock: true,
      image: '/images/pc-placeholder.jpg',
      description: 'Надёжный компьютер для офиса, учёбы, работы и повседневных задач.',
      cpu: 'Intel Core i5-12400',
      gpu: 'Intel UHD Graphics',
      ram: '16 GB DDR4',
      storage: '512 GB SSD',
    },
    {
      name: 'GlorionPC WorkStation Z',
      slug: 'glorionpc-workstation-z',
      price: 119990,
      oldPrice: 129990,
      category: 'Рабочие',
      inStock: true,
      image: '/images/pc-placeholder.jpg',
      description: 'Станция для монтажа, дизайна, 3D и профессиональной работы.',
      cpu: 'AMD Ryzen 9 7900',
      gpu: 'NVIDIA RTX 4060',
      ram: '32 GB DDR5',
      storage: '2 TB SSD NVMe',
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    })
  }

  console.log('Товары успешно добавлены в базу')
}

main()
  .catch((error) => {
    console.error('Ошибка seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })